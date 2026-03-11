// ===== ID 생성 =====
let _id = 0;
export const uid = () => String(++_id);

// ===== 시간 파싱 =====
export function toMin(t) {
  const [h, m] = t.trim().split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function parseRange(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { s: toMin(m[1]), e: toMin(m[2]) };
}

export function overlaps(a, b) {
  return a.s < b.e && a.e > b.s;
}

function formatRange(r) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(Math.floor(r.s / 60))}:${pad(r.s % 60)}-${pad(Math.floor(r.e / 60))}:${pad(r.e % 60)}`;
}

// 시간 슬롯에서 행사 시간을 제거한 나머지 슬롯 반환
function subtractEventFromSlot(slotStr, evtStr) {
  const r = parseRange(slotStr);
  const evt = parseRange(evtStr);
  if (!r || !evt) return [slotStr];
  if (evt.e <= r.s || evt.s >= r.e) return [slotStr]; // 겹침 없음
  const result = [];
  if (r.s < evt.s) result.push(formatRange({ s: r.s, e: evt.s }));
  if (evt.e < r.e) result.push(formatRange({ s: evt.e, e: r.e }));
  return result; // 행사가 슬롯 전체를 덮으면 []
}

// 행사를 반영한 유효 시간 슬롯 계산
export function computeEffectiveSlots(classroom, events) {
  const roomEvents = events.filter(e => e.room === classroom.room);
  if (!roomEvents.length) return classroom.timeSlots;
  let slots = [...classroom.timeSlots];
  for (const evt of roomEvents) {
    slots = slots.flatMap(slot => subtractEventFromSlot(slot, evt.time));
  }
  return slots;
}

// effectiveSlots 우선, 없으면 timeSlots 사용
function getSlots(classroom) {
  return classroom.effectiveSlots ?? classroom.timeSlots;
}

export function canInspect(worker, classroom) {
  const slots = getSlots(classroom);
  if (!worker?.workTimes?.length || !slots.length) return false;
  return worker.workTimes.some(wt => {
    const wr = parseRange(wt);
    if (!wr) return false;
    return slots.some(slot => {
      const sr = parseRange(slot);
      return sr ? overlaps(wr, sr) : false;
    });
  });
}

// ===== 이동 횟수 계산 =====
function intersectRangeLists(A, B) {
  const result = [];
  for (const a of A) {
    for (const b of B) {
      const s = Math.max(a.s, b.s);
      const e = Math.min(a.e, b.e);
      if (s < e) result.push({ s, e });
    }
  }
  return result;
}

export function countTrips(classrooms, workerId) {
  const assigned = classrooms.filter(c => c.inspectorId === workerId);
  if (assigned.length === 0) return 0;

  const available = assigned.map(c =>
    getSlots(c).map(t => parseRange(t)).filter(Boolean)
  ).filter(list => list.length > 0);

  if (available.length === 0) return 0;

  const sorted = [...available].sort((a, b) => a.length - b.length);
  const trips = [];

  for (const slots of sorted) {
    let placed = false;
    for (let t = 0; t < trips.length; t++) {
      const newWindow = intersectRangeLists(trips[t], slots);
      if (newWindow.length > 0) {
        trips[t] = newWindow;
        placed = true;
        break;
      }
    }
    if (!placed) trips.push([...slots]);
  }

  return trips.length;
}

// ===== 층수 추출 =====
export function getFloor(room) {
  const m = room.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0]);
  return Math.floor(n / 100) % 10 || null;
}

export function getWorkerFloors(classrooms, workerId) {
  return new Set(
    classrooms
      .filter(c => c.inspectorId === workerId)
      .map(c => getFloor(c.room))
      .filter(f => f !== null)
  );
}

// ===== 자동 배정 =====

// 한 run의 그리디 배정.
// commonWindow 기반: 근무자별 "현재까지 배정된 강의실들의 공통 시간 교집합 ∩ 근무시간"을 추적.
// 새 강의실을 배정할 때 교집합이 유지되면(1회 이동) 우선, 비면 10000점 패널티.
function greedyRun(order, workers, randomizePool) {
  // 초기 공통 창 = 근무시간 전체
  const commonWindows = new Map(
    workers.map(w => [w.id, w.workTimes.map(t => parseRange(t)).filter(Boolean)])
  );

  let state = new Map(order.map(c => [c.id, { ...c, inspectorId: null }]));

  for (const classroom of order) {
    const eligible = workers.filter(w => canInspect(w, classroom));
    if (!eligible.length) continue;

    const counts = new Map(workers.map(w => [w.id, 0]));
    for (const c of state.values()) {
      if (c.inspectorId) counts.set(c.inspectorId, (counts.get(c.inspectorId) || 0) + 1);
    }
    const globalMin = Math.min(...counts.values());
    const candidates = eligible.filter(w => counts.get(w.id) <= globalMin + 1);
    let pool = candidates.length > 0 ? candidates : eligible;

    // 다양성을 위해 풀 셔플 (multi-restart 시)
    if (randomizePool) {
      pool = [...pool].sort(() => Math.random() - 0.5);
    }

    const classroomSlots = getSlots(classroom).map(t => parseRange(t)).filter(Boolean);
    const newFloor = getFloor(classroom.room);

    let bestWorker = null;
    let bestScore = Infinity;

    for (const worker of pool) {
      const prevWindow = commonWindows.get(worker.id);
      const newWindow = intersectRangeLists(prevWindow, classroomSlots);
      // 교집합이 유지되면 1회 이동 보장
      const keepsOneTrip = newWindow.length > 0;

      const currentCount = counts.get(worker.id);
      const floors = getWorkerFloors([...state.values()], worker.id);
      if (newFloor !== null) floors.add(newFloor);
      const floorCount = floors.size;
      const floorPenalty = floorCount > 3 ? 500 : (floorCount - 1) * 12;

      // 1회 이동 유지가 최우선 (10000점 격차)
      const tripPenalty = keepsOneTrip ? 0 : 10000;
      const score = tripPenalty + floorPenalty + currentCount;

      if (score < bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    if (bestWorker) {
      state.set(classroom.id, { ...state.get(classroom.id), inspectorId: bestWorker.id });

      const prevWindow = commonWindows.get(bestWorker.id);
      const newWindow = intersectRangeLists(prevWindow, classroomSlots);
      if (newWindow.length > 0) {
        // 1회 이동 유지: 공통 창 좁힘
        commonWindows.set(bestWorker.id, newWindow);
      } else {
        // 불가피한 2회 이동: 이 강의실 슬롯 ∩ 근무시간으로 새 창 시작
        const workerWork = bestWorker.workTimes.map(t => parseRange(t)).filter(Boolean);
        const reset = intersectRangeLists(workerWork, classroomSlots);
        commonWindows.set(bestWorker.id, reset.length > 0 ? reset : workerWork);
      }
    }
  }

  return [...state.values()];
}


export function autoAssign(classrooms, workers) {
  if (!workers.length || !classrooms.length) return classrooms;

  const assignable = classrooms.filter(c => getSlots(c).length > 0);
  if (!assignable.length) return classrooms;

  // 기본 정렬: 배정 가능 근무자 수 적은 강의실 우선 (제약 전파)
  const eligibleCount = c => workers.filter(w => canInspect(w, c)).length;
  const baseSorted = [...assignable].sort((a, b) => eligibleCount(a) - eligibleCount(b));

  // 같은 우선순위 그룹 내 셔플용 그룹핑
  function shuffledOrder() {
    const groups = new Map();
    for (const c of baseSorted) {
      const k = eligibleCount(c);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    return [...groups.keys()].sort((a, b) => a - b)
      .flatMap(k => [...groups.get(k)].sort(() => Math.random() - 0.5));
  }

  function totalTrips(state) {
    return workers.reduce((sum, w) => sum + countTrips(state, w.id), 0);
  }

  const RESTARTS = 12;
  let bestState = null;
  let bestTrips = Infinity;

  for (let run = 0; run < RESTARTS; run++) {
    const order = run === 0 ? baseSorted : shuffledOrder();
    const result = greedyRun(order, workers, run > 0);
    const trips = totalTrips(result);
    if (trips < bestTrips) {
      bestTrips = trips;
      bestState = result;
    }
    // 모든 근무자가 1회 이동이면 완벽 → 조기 종료
    if (bestTrips <= workers.filter(w => result.some(c => c.inspectorId === w.id)).length) break;
  }

  const stateMap = new Map(bestState.map(c => [c.id, c]));
  return classrooms.map(c => stateMap.get(c.id) || c);
}

// ===== 데이터 파서 =====
function isRoomName(line) { return /호\s*$/.test(line); }
function isTimeSlot(line) { return /^\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2}$/.test(line); }

function parseVertical(lines) {
  const result = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isRoomName(line)) {
      if (cur) result.push(cur);
      cur = { id: uid(), room: line, timeSlots: [], inspectorId: null };
    } else if (isTimeSlot(line) && cur && cur.timeSlots.length < 3) {
      cur.timeSlots.push(line);
    }
  }
  if (cur) result.push(cur);
  return result;
}

function parseHorizontal(lines) {
  const result = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let cells;
    if (line.includes('\t'))     cells = line.split('\t');
    else if (line.includes('|')) cells = line.split('|');
    else continue;
    cells = cells.map(c => c.trim()).filter(Boolean);
    if (!cells[0]) continue;
    if (/강의실|호수|시간/.test(cells[0]) && result.length === 0) continue;
    const timeSlots = cells.slice(1).filter(t => /\d/.test(t)).slice(0, 3);
    result.push({ id: uid(), room: cells[0], timeSlots, inspectorId: null });
  }
  return result;
}

export function parseData(text) {
  const lines = text.split('\n');
  const hasTab  = lines.some(l => l.includes('\t'));
  const hasPipe = lines.some(l => l.includes('|'));
  return (hasTab || hasPipe) ? parseHorizontal(lines) : parseVertical(lines);
}
