/**
 * 점검 알고리즘 테스트
 * 실행: node tests/algorithm.test.js
 */

import {
  canInspect,
  computeEffectiveSlots,
  countTrips,
  autoAssign,
  parseRange,
  toMin,
  overlaps,
} from "../src/utils.js";

// ───────────────────────────────────────────────
// 미니 테스트 러너
// ───────────────────────────────────────────────
let passed = 0, failed = 0;
const results = [];

function test(suiteName, name, fn) {
  try {
    fn();
    passed++;
    results.push({ ok: true, suite: suiteName, name });
  } catch (e) {
    failed++;
    results.push({ ok: false, suite: suiteName, name, msg: e.message });
  }
}

function assert(val, msg) {
  if (!val) throw new Error(msg ?? "assertion failed");
}

function assertEqual(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(msg ?? `expected ${sb}\n     got ${sa}`);
}

// ───────────────────────────────────────────────
// 헬퍼: 강의실/근무자 생성
// ───────────────────────────────────────────────
let _id = 0;
const uid = () => String(++_id);

function room(name, ...slots) {
  return { id: uid(), room: name, timeSlots: slots, inspectorId: null };
}

function worker(name, ...workTimes) {
  return { id: uid(), name, workTimes };
}

// effectiveSlots를 미리 계산해서 붙여주는 헬퍼
function enriched(classroom, events) {
  const slots = computeEffectiveSlots(classroom, events);
  return slots === classroom.timeSlots ? classroom : { ...classroom, effectiveSlots: slots };
}

// ───────────────────────────────────────────────
// Suite 1: parseRange / toMin / overlaps
// ───────────────────────────────────────────────
const S1 = "parseRange·toMin·overlaps";

test(S1, "toMin 기본", () => {
  assertEqual(toMin("09:00"), 540);
  assertEqual(toMin("12:30"), 750);
  assertEqual(toMin("23:00"), 1380);
});

test(S1, "parseRange 유효", () => {
  const r = parseRange("09:00-12:00");
  assertEqual(r, { s: 540, e: 720 });
});

test(S1, "parseRange 틸다 구분자", () => {
  const r = parseRange("09:00~12:00");
  assert(r !== null, "틸다 구분자 파싱 실패");
});

test(S1, "parseRange 무효 문자열", () => {
  assertEqual(parseRange(""), null);
  assertEqual(parseRange("abc"), null);
  assertEqual(parseRange("09:00"), null);
});

test(S1, "overlaps 겹침", () => {
  assert(overlaps({ s: 540, e: 720 }, { s: 600, e: 780 }), "겹쳐야 함");
});

test(S1, "overlaps 안 겹침 (연속)", () => {
  assert(!overlaps({ s: 540, e: 720 }, { s: 720, e: 840 }), "연속은 겹침 아님");
});

test(S1, "overlaps 안 겹침 (이격)", () => {
  assert(!overlaps({ s: 540, e: 600 }, { s: 660, e: 780 }), "이격은 겹침 아님");
});

// ───────────────────────────────────────────────
// Suite 2: canInspect
// (EARLY_FINISH_MIN = 40 → 퇴근 40분 전까지만 점검 시작 가능)
// ───────────────────────────────────────────────
const S2 = "canInspect";

test(S2, "근무시간 안에 슬롯 → 배정 가능", () => {
  const w = worker("A", "09:00-18:00");
  const c = room("101호", "10:00-12:00");
  assert(canInspect(w, c), "배정 가능해야 함");
});

test(S2, "슬롯이 퇴근 40분 전 이후에만 있어서 불가", () => {
  // 근무 09:00-12:00 → 유효 범위 09:00-11:20
  // 슬롯 11:30-12:00 → 겹침 없음
  const w = worker("A", "09:00-12:00");
  const c = room("101호", "11:30-12:00");
  assert(!canInspect(w, c), "불가해야 함");
});

test(S2, "슬롯이 퇴근 40분 전 이내 → 가능", () => {
  // 유효 범위 09:00-11:20, 슬롯 10:00-11:20 → 겹침 있음
  const w = worker("A", "09:00-12:00");
  const c = room("101호", "10:00-11:20");
  assert(canInspect(w, c), "가능해야 함");
});

test(S2, "근무시간 완전 불일치", () => {
  const w = worker("A", "09:00-13:00");
  const c = room("101호", "14:00-18:00");
  assert(!canInspect(w, c), "불가해야 함");
});

test(S2, "timeSlots 없는 강의실 → 불가", () => {
  const w = worker("A", "09:00-18:00");
  const c = room("101호");   // slots 없음
  assert(!canInspect(w, c), "슬롯 없으면 불가");
});

test(S2, "workTimes 없는 근무자 → 불가", () => {
  const w = { id: uid(), name: "X", workTimes: [] };
  const c = room("101호", "10:00-12:00");
  assert(!canInspect(w, c), "근무시간 없으면 불가");
});

test(S2, "effectiveSlots 우선 사용 (행사 후 남은 슬롯으로 판단)", () => {
  const w = worker("A", "09:00-18:00");
  // 원래 슬롯 10:00-12:00이지만 행사로 전체 차단
  const c = { ...room("101호", "10:00-12:00"), effectiveSlots: [] };
  assert(!canInspect(w, c), "effectiveSlots 비어있으면 불가");
});

test(S2, "분할 근무시간 중 하나라도 겹치면 가능", () => {
  const w = worker("A", "09:00-13:00", "15:00-19:00");
  const c = room("101호", "16:00-18:00");
  assert(canInspect(w, c), "오후 근무 겹침 → 가능");
});

// ───────────────────────────────────────────────
// Suite 3: computeEffectiveSlots
// ───────────────────────────────────────────────
const S3 = "computeEffectiveSlots";

test(S3, "행사 없으면 원본 반환", () => {
  const c = room("101호", "09:00-12:00");
  const result = computeEffectiveSlots(c, []);
  assert(result === c.timeSlots, "동일 참조여야 함");
});

test(S3, "행사가 슬롯 전체 차단 → 빈 배열", () => {
  const c = room("101호", "09:00-12:00");
  const evts = [{ id: "e1", room: "101호", time: "09:00-12:00" }];
  assertEqual(computeEffectiveSlots(c, evts), []);
});

test(S3, "행사가 슬롯 앞부분 차단 → 뒷부분만 남음", () => {
  const c = room("101호", "09:00-12:00");
  const evts = [{ id: "e1", room: "101호", time: "09:00-10:00" }];
  assertEqual(computeEffectiveSlots(c, evts), ["10:00-12:00"]);
});

test(S3, "행사가 슬롯 뒷부분 차단 → 앞부분만 남음", () => {
  const c = room("101호", "09:00-12:00");
  const evts = [{ id: "e1", room: "101호", time: "11:00-12:00" }];
  assertEqual(computeEffectiveSlots(c, evts), ["09:00-11:00"]);
});

test(S3, "행사가 슬롯 중간 차단 → 두 조각", () => {
  const c = room("101호", "09:00-18:00");
  const evts = [{ id: "e1", room: "101호", time: "12:00-14:00" }];
  assertEqual(computeEffectiveSlots(c, evts), ["09:00-12:00", "14:00-18:00"]);
});

test(S3, "행사가 슬롯과 겹치지 않으면 그대로", () => {
  const c = room("101호", "09:00-11:00");
  const evts = [{ id: "e1", room: "101호", time: "13:00-15:00" }];
  assertEqual(computeEffectiveSlots(c, evts), ["09:00-11:00"]);
});

test(S3, "다른 강의실 행사는 무시", () => {
  const c = room("101호", "09:00-12:00");
  const evts = [{ id: "e1", room: "202호", time: "09:00-12:00" }];
  const result = computeEffectiveSlots(c, evts);
  assert(result === c.timeSlots, "다른 강의실 행사 → 원본 그대로");
});

test(S3, "여러 행사 중첩 적용", () => {
  const c = room("101호", "09:00-18:00");
  const evts = [
    { id: "e1", room: "101호", time: "09:00-10:00" },
    { id: "e2", room: "101호", time: "12:00-14:00" },
  ];
  assertEqual(computeEffectiveSlots(c, evts), ["10:00-12:00", "14:00-18:00"]);
});

// ───────────────────────────────────────────────
// Suite 4: 스크린샷 실제 케이스
// (슬롯: 09:00-11:40, 14:40-22:00
//  행사: 15:00-21:00, 09:00-12:00
//  근무자 가영: 08:30-16:30)
// ───────────────────────────────────────────────
const S4 = "실제 케이스 (스크린샷)";

test(S4, "effective slots 계산 확인", () => {
  const c = room("201호", "09:00-11:40", "14:40-22:00");
  const evts = [
    { id: "e1", room: "201호", time: "15:00-21:00" },
    { id: "e2", room: "201호", time: "09:00-12:00" },
  ];
  const slots = computeEffectiveSlots(c, evts);
  // 09:00-12:00이 09:00-11:40 전체 차단 → 없어짐
  // 15:00-21:00이 14:40-22:00을 → 14:40-15:00 + 21:00-22:00
  assertEqual(slots, ["14:40-15:00", "21:00-22:00"]);
});

test(S4, "가영(08:30-16:30)이 14:40-15:00 슬롯 점검 가능", () => {
  const c = room("201호", "09:00-11:40", "14:40-22:00");
  const evts = [
    { id: "e1", room: "201호", time: "15:00-21:00" },
    { id: "e2", room: "201호", time: "09:00-12:00" },
  ];
  const gaYoung = worker("가영", "08:30-16:30");
  const enrichedC = enriched(c, evts);
  // 14:40-15:00이 가영 유효범위(08:30-15:50) 안에 있음
  assert(canInspect(gaYoung, enrichedC), "가영 → 14:40-15:00 점검 가능");
});

test(S4, "21:00-22:00 슬롯은 가영 근무시간 밖 → 해당 슬롯 단독이면 불가", () => {
  const c = { ...room("201호"), effectiveSlots: ["21:00-22:00"] };
  const gaYoung = worker("가영", "08:30-16:30");
  assert(!canInspect(gaYoung, c), "21시 슬롯은 가영 범위 밖");
});

// ───────────────────────────────────────────────
// Suite 5: countTrips (이동 횟수)
// ───────────────────────────────────────────────
const S5 = "countTrips";

test(S5, "배정 없으면 0", () => {
  const w = worker("A", "09:00-18:00");
  w.id = "w1";
  const classrooms = [room("101호", "10:00-12:00")];
  assertEqual(countTrips(classrooms, "w1", [w]), 0);
});

test(S5, "같은 시간대 강의실 2개 → 1회", () => {
  const w = worker("A", "09:00-18:00");
  w.id = "w1";
  const c1 = { ...room("101호", "10:00-12:00"), inspectorId: "w1" };
  const c2 = { ...room("102호", "10:00-12:00"), inspectorId: "w1" };
  assertEqual(countTrips([c1, c2], "w1", [w]), 1);
});

test(S5, "겹치지 않는 시간대 강의실 2개 → 2회", () => {
  const w = worker("A", "09:00-18:00");
  w.id = "w1";
  const c1 = { ...room("101호", "09:00-11:00"), inspectorId: "w1" };
  const c2 = { ...room("102호", "14:00-16:00"), inspectorId: "w1" };
  assertEqual(countTrips([c1, c2], "w1", [w]), 2);
});

// ───────────────────────────────────────────────
// Suite 6: autoAssign
// ───────────────────────────────────────────────
const S6 = "autoAssign";

test(S6, "강의실/근무자 없으면 원본 반환", () => {
  const result = autoAssign([], []);
  assertEqual(result, []);
});

test(S6, "근무자 1명, 강의실 1개 → 배정됨", () => {
  const w = worker("A", "09:00-18:00");
  const c = room("101호", "10:00-12:00");
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === w.id, "배정되어야 함");
});

test(S6, "근무자가 근무시간 밖 강의실 → 미배정", () => {
  const w = worker("A", "09:00-13:00");
  const c = room("101호", "14:00-18:00");
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === null, "미배정이어야 함");
});

test(S6, "근무자 2명, 강의실 2개, 시간 동일 → 균등 배분", () => {
  const wA = worker("A", "09:00-18:00");
  const wB = worker("B", "09:00-18:00");
  const c1 = room("101호", "10:00-12:00");
  const c2 = room("102호", "10:00-12:00");
  const result = autoAssign([c1, c2], [wA, wB]);
  const aCount = result.filter(c => c.inspectorId === wA.id).length;
  const bCount = result.filter(c => c.inspectorId === wB.id).length;
  assert(aCount === 1 && bCount === 1, `균등 배분 실패: A=${aCount} B=${bCount}`);
});

test(S6, "행사로 effectiveSlots가 비면 해당 근무자 미배정", () => {
  const w = worker("A", "09:00-13:00");
  // 행사로 슬롯 전체 차단
  const c = { ...room("101호", "10:00-12:00"), effectiveSlots: [] };
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === null, "슬롯 없으면 미배정");
});

test(S6, "슬롯 없는 강의실 → 미배정 (timeSlots 없음)", () => {
  const w = worker("A", "09:00-18:00");
  const c = room("빈강의실");   // slots 없음
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === null, "슬롯 없는 강의실 미배정");
});

test(S6, "EARLY_FINISH_MIN 경계 - 마감 직전 슬롯 배정 가능", () => {
  // 근무 09:00-12:00 → 유효 11:20까지
  // 슬롯 10:00-11:20 → 가능
  const w = worker("A", "09:00-12:00");
  const c = room("101호", "10:00-11:20");
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === w.id, "유효범위 내 슬롯 → 배정");
});

test(S6, "EARLY_FINISH_MIN 경계 - 마감 후 슬롯 미배정", () => {
  // 근무 09:00-12:00 → 유효 11:20까지
  // 슬롯 11:30-12:00 → 불가
  const w = worker("A", "09:00-12:00");
  const c = room("101호", "11:30-12:00");
  const [result] = autoAssign([c], [w]);
  assert(result.inspectorId === null, "유효범위 밖 슬롯 → 미배정");
});

// ───────────────────────────────────────────────
// 결과 출력
// ───────────────────────────────────────────────
const WIDTH = 56;
const line = "─".repeat(WIDTH);

let currentSuite = null;
for (const r of results) {
  if (r.suite !== currentSuite) {
    currentSuite = r.suite;
    console.log(`\n  📂 ${r.suite}`);
  }
  if (r.ok) {
    console.log(`    ✅  ${r.name}`);
  } else {
    console.log(`    ❌  ${r.name}`);
    console.log(`         ${r.msg}`);
  }
}

console.log(`\n${line}`);
console.log(`  결과: ${passed + failed}개 중  ✅ ${passed}개 통과  /  ❌ ${failed}개 실패`);
console.log(line);
if (failed > 0) process.exit(1);
