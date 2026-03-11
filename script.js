// ===== STATE =====
let classrooms = [];   // { id, room, timeSlots[], inspectorId }
let workers    = [];   // { id, number, name, workTimes[] }
let selectedWorkerId = null;
let workerCounter = 1;
let idCnt = 0;
function uid() { return ++idCnt; }

// ===== TIME UTILITIES =====
function toMin(t) {
  t = t.trim();
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function parseRange(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { s: toMin(m[1]), e: toMin(m[2]) };
}

function overlaps(a, b) {
  return a.s < b.e && a.e > b.s;
}

function canInspect(worker, classroom) {
  if (!worker || !worker.workTimes || worker.workTimes.length === 0) return false;
  if (classroom.timeSlots.length === 0) return false;
  return worker.workTimes.some(wt => {
    const wr = parseRange(wt);
    if (!wr) return false;
    return classroom.timeSlots.some(slot => {
      const sr = parseRange(slot);
      return sr ? overlaps(wr, sr) : false;
    });
  });
}

// ===== PARSERS =====

function isRoomName(line) {
  return /호\s*$/.test(line);
}

function isTimeSlot(line) {
  return /^\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2}$/.test(line);
}

function parseVertical(lines) {
  const result = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isRoomName(line)) {
      if (current) result.push(current);
      current = { id: uid(), room: line, timeSlots: [], inspectorId: null };
    } else if (isTimeSlot(line)) {
      if (current && current.timeSlots.length < 3) current.timeSlots.push(line);
    }
  }
  if (current) result.push(current);
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

function parseData(text) {
  const lines = text.split('\n');
  const hasTab  = lines.some(l => l.includes('\t'));
  const hasPipe = lines.some(l => l.includes('|'));
  return (hasTab || hasPipe) ? parseHorizontal(lines) : parseVertical(lines);
}

// ===== IMPORT / CLEAR =====
function importData() {
  const text = document.getElementById('pasteArea').value.trim();
  if (!text) { showStatus('붙여넣기할 데이터가 없습니다.', 'warn'); return; }

  const parsed = parseData(text);
  if (parsed.length === 0) {
    showStatus('파싱할 수 없는 형식입니다. 데이터를 확인해 주세요.', 'err');
    return;
  }

  classrooms = parsed;
  switchToTableMode();
  renderClassrooms();
  renderWorkers();
  showStatus(`${classrooms.length}개 강의실 데이터를 가져왔습니다.`, 'ok');
}

function clearAll() {
  classrooms = [];
  document.getElementById('pasteArea').value = '';
  selectedWorkerId = null;
  switchToPaste();
  renderWorkers();
  hideSelectionBanner();
  showStatus('', '');
}

// ===== MODE SWITCH =====
function switchToTableMode() {
  document.getElementById('pasteMode').style.display  = 'none';
  document.getElementById('tableMode').style.display  = 'flex';
}

function switchToPaste() {
  document.getElementById('tableMode').style.display  = 'none';
  document.getElementById('pasteMode').style.display  = 'flex';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pasteArea').addEventListener('paste', () => {
    setTimeout(importData, 50);
  });
  document.getElementById('workerName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('workerTime1').focus();
  });
  document.getElementById('workerTime1').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('workerTime2').focus();
  });
  document.getElementById('workerTime2').addEventListener('keydown', e => {
    if (e.key === 'Enter') addWorker();
  });
});

// ===== RENDER CLASSROOMS =====
function renderClassrooms() {
  const tbody = document.getElementById('classroomBody');
  if (!tbody) return;

  if (classrooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">데이터를 붙여넣기 하세요</td></tr>';
    renderCounts();
    return;
  }

  const selWorker = workers.find(w => w.id === selectedWorkerId);

  tbody.innerHTML = classrooms.map(c => {
    const inspector  = workers.find(w => w.id === c.inspectorId);
    const assignable = selWorker ? canInspect(selWorker, c) : false;

    const inspectorHtml = inspector
      ? `<div class="inspector-name">${inspector.name}</div>`
      : `<span class="unassigned-label">미배정</span>`;

    const chipsHtml = c.timeSlots.length
      ? c.timeSlots.map(t => `<span class="time-chip">${t}</span>`).join('')
      : '<span class="no-time">없음</span>';

    const inspClass = [
      'inspector-cell',
      inspector  ? 'assigned'    : '',
      (selectedWorkerId && assignable) ? 'can-assign' : ''
    ].filter(Boolean).join(' ');

    let titleText;
    if (selectedWorkerId) {
      titleText = assignable ? '클릭하여 배정' : '근무시간 불일치';
    } else {
      titleText = inspector ? `${inspector.name} — 클릭 시 선택` : '근로자를 먼저 선택하세요';
    }

    return `<tr class="classroom-row" id="cr-${c.id}">
      <td><strong>${c.room}</strong></td>
      <td><div class="time-chips">${chipsHtml}</div></td>
      <td class="${inspClass}" onclick="handleInspectorClick(${c.id})" title="${titleText}">
        ${inspectorHtml}
      </td>
    </tr>`;
  }).join('');

  renderCounts();
}

// ===== RENDER WORKERS =====
function renderWorkers() {
  const tbody = document.getElementById('workerBody');

  if (workers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">출근자를 추가하세요</td></tr>';
    renderCounts();
    return;
  }

  tbody.innerHTML = workers.map(w => {
    const isSel    = w.id === selectedWorkerId;
    const canCount = classrooms.filter(c => canInspect(w, c)).length;
    const canNote  = classrooms.length > 0
      ? `<span class="can-note ${canCount > 0 ? 'has-rooms' : ''}">(${canCount}개 가능)</span>`
      : '';

    // 이 근무자가 배정된 강의실 목록
    const myRooms = classrooms.filter(c => c.inspectorId === w.id).map(c => c.room);
    const assignedNote = myRooms.length > 0
      ? `<div class="assigned-rooms">${myRooms.join(', ')}</div>`
      : '';

    return `<tr id="wr-${w.id}">
      <td style="text-align:center;color:#999;font-size:12px">${w.number}</td>
      <td>
        <span class="worker-name-cell ${isSel ? 'selected' : ''}"
          onclick="selectWorker(${w.id})"
          onmouseenter="highlightAvailable(${w.id})"
          onmouseleave="clearHighlight()">
          ${w.name}
        </span>${canNote}
        ${assignedNote}
      </td>
      <td>
        ${w.workTimes.map(t => `<span class="work-time-badge">${t}</span>`).join('<br>')}
      </td>
      <td style="text-align:center">
        <button class="btn btn-danger btn-sm" onclick="removeWorker(${w.id})">✕</button>
      </td>
    </tr>`;
  }).join('');

  renderCounts();
}

// ===== RENDER COUNTS =====
function renderCounts() {
  const wEl = document.getElementById('countWorkers');
  const rEl = document.getElementById('countRooms');
  if (!wEl || !rEl) return;
  wEl.textContent = workers.length;
  rEl.textContent = classrooms.filter(c => c.timeSlots.length > 0).length;
}

// ===== ADD / REMOVE WORKER =====
function addWorker() {
  const nameEl  = document.getElementById('workerName');
  const time1El = document.getElementById('workerTime1');
  const time2El = document.getElementById('workerTime2');
  const name  = nameEl.value.trim();
  const time1 = time1El.value.trim();
  const time2 = time2El.value.trim();

  if (!name)  { nameEl.focus();  showStatus('이름을 입력하세요.', 'warn'); return; }
  if (!time1) { time1El.focus(); showStatus('근무시간 ①을 입력하세요. 예: 08:30-11:30', 'warn'); return; }
  if (!parseRange(time1)) {
    time1El.focus();
    showStatus('근무시간 ① 형식 오류. 예: 08:30-11:30', 'err');
    return;
  }
  if (time2 && !parseRange(time2)) {
    time2El.focus();
    showStatus('근무시간 ② 형식 오류. 예: 13:30-18:00', 'err');
    return;
  }

  const workTimes = time2 ? [time1, time2] : [time1];
  workers.push({ id: uid(), number: workerCounter++, name, workTimes });
  nameEl.value  = '';
  time1El.value = '';
  time2El.value = '';
  nameEl.focus();

  renderWorkers();
  renderClassrooms();
  showStatus('', '');
}

function removeWorker(id) {
  classrooms.forEach(c => { if (c.inspectorId === id) c.inspectorId = null; });
  workers = workers.filter(w => w.id !== id);
  if (selectedWorkerId === id) {
    selectedWorkerId = null;
    hideSelectionBanner();
  }
  renderWorkers();
  renderClassrooms();
}

// ===== SELECT WORKER =====
function selectWorker(id) {
  if (selectedWorkerId === id) {
    selectedWorkerId = null;
    hideSelectionBanner();
  } else {
    selectedWorkerId = id;
    const w = workers.find(x => x.id === id);
    showSelectionBanner(w.name);
  }
  renderWorkers();
  renderClassrooms();
}

// ===== HOVER HIGHLIGHT =====
function highlightAvailable(workerId) {
  const worker = workers.find(w => w.id === workerId);
  if (!worker) return;
  classrooms.forEach(c => {
    const row = document.getElementById(`cr-${c.id}`);
    if (!row) return;
    if (canInspect(worker, c)) {
      row.classList.add('hover-available');
      row.classList.remove('hover-unavailable');
    } else {
      row.classList.add('hover-unavailable');
      row.classList.remove('hover-available');
    }
  });
}

function clearHighlight() {
  classrooms.forEach(c => {
    const row = document.getElementById(`cr-${c.id}`);
    if (row) row.classList.remove('hover-available', 'hover-unavailable');
  });
}

// ===== ASSIGN (복수 배정 지원) =====
function handleInspectorClick(classroomId) {
  const classroom = classrooms.find(c => c.id === classroomId);
  if (!classroom) return;

  // 선택된 근로자 없음 → 배정된 근로자 선택
  if (!selectedWorkerId) {
    if (classroom.inspectorId) selectWorker(classroom.inspectorId);
    return;
  }

  const selWorker = workers.find(w => w.id === selectedWorkerId);

  if (classroom.inspectorId === selectedWorkerId) {
    // 자기 칸 재클릭 → 이 강의실 배정 해제
    classroom.inspectorId = null;
    showStatus(`"${selWorker.name}" ${classroom.room} 배정 해제`, 'info');
    selectedWorkerId = null;
    hideSelectionBanner();

  } else if (classroom.inspectorId) {
    // 다른 근로자가 배정된 칸 → 교체 (기존 근로자 해제)
    const displaced = workers.find(w => w.id === classroom.inspectorId);
    classroom.inspectorId = selectedWorkerId;
    showStatus(`"${selWorker.name}" → ${classroom.room} 배정 (기존 "${displaced?.name}" 해제)`, 'info');
    // 선택 유지: 연속으로 다른 방에도 배정 가능

  } else {
    // 빈 칸 → 배정 (이전 배정 유지 — 복수 배정)
    classroom.inspectorId = selectedWorkerId;
    showStatus(`"${selWorker.name}" → ${classroom.room} 배정`, 'ok');
    // 선택 유지: 연속으로 다른 방에도 배정 가능
  }

  renderWorkers();
  renderClassrooms();
}

// ===== SELECTION BANNER =====
function showSelectionBanner(name) {
  document.getElementById('selectedName').textContent = name;
  document.getElementById('selectionBanner').style.display = 'block';
}

function hideSelectionBanner() {
  document.getElementById('selectionBanner').style.display = 'none';
}

// ===== STATUS BAR =====
let statusTimer = null;
function showStatus(msg, type) {
  const bar = document.getElementById('statusBar');
  if (!bar) return;
  if (!msg) { bar.style.display = 'none'; return; }

  const borders = { ok: '#2e7d32', err: '#b71c1c', warn: '#666', info: '#333' };
  const border = borders[type] || borders.info;
  bar.style.cssText = `
    display: block;
    background: #f4f4f4;
    border-left: 3px solid ${border};
    color: #222;
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 11px;
  `;
  bar.textContent = msg;

  if (statusTimer) clearTimeout(statusTimer);
  if (type === 'ok' || type === 'info') {
    statusTimer = setTimeout(() => { bar.style.display = 'none'; }, 4000);
  }
}
