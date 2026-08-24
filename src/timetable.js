/**
 * 시간표 파싱 코어
 *
 * 엑셀(.xlsx) 파일이든 엑셀에서 복사한 텍스트든, 먼저 2차원 문자열 배열(grid)로
 * 바꾼 뒤 parseTimetableGrid() 하나로 모인다.
 *
 * 엑셀 포맷 가정 (위치는 하드코딩하지 않고 탐지한다):
 *   - 어딘가에 요일 헤더 행이 있다 (월/화/수/목/금 중 2개 이상이 같은 행에)
 *   - 그 위쪽에 제목 셀이 있을 수 있다
 *   - 요일 헤더 행 아래로 "08:30~09:00" 같은 시간 셀이 있는 행들이 이어진다
 *   - 각 요일 블록의 열은 "특정 인물의 열"이 아니라 재사용되는 레인이다.
 *     (예: 월요일 세 번째 칸이 오전엔 A, 밤엔 B)
 *     따라서 행 단위로 이름을 모아서 사람별로 연속된 행을 시간 범위로 병합한다.
 */

import { DAYS } from "./schedule.js";
import { toMin } from "./utils.js";

// ───────────────────────────────────────────────
// 시간 <-> 분 헬퍼
// ───────────────────────────────────────────────
export function minToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function workTimesToRanges(workTimes) {
  return (workTimes || []).map((t) => {
    const [s, e] = t.split("-");
    return [toMin(s), toMin(e)];
  });
}

export function rangesToWorkTimes(ranges) {
  return ranges.map(([s, e]) => `${minToTime(s)}-${minToTime(e)}`);
}

/** 30분 슬롯 하나를 추가하고, 맞닿은 구간끼리 병합 */
export function addSlot(ranges, slotMin, span = 30) {
  const next = [...ranges, [slotMin, slotMin + span]].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of next) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      merged.push([...r]);
    }
  }
  return merged;
}

/** 30분 슬롯 하나를 빼고, 필요하면 구간을 둘로 쪼갠다 */
export function removeSlot(ranges, slotMin, span = 30) {
  const s = slotMin;
  const e = slotMin + span;
  const result = [];
  for (const [rs, re] of ranges) {
    if (re <= s || rs >= e) {
      result.push([rs, re]);
    } else {
      if (rs < s) result.push([rs, s]);
      if (re > e) result.push([e, re]);
    }
  }
  return result;
}

/** workTimes 배열의 총 근무 분 */
export function totalMinutes(workTimes) {
  return workTimesToRanges(workTimes).reduce((sum, [s, e]) => sum + (e - s), 0);
}

/** 분 -> "7.5h" 같은 짧은 표기 */
export function formatHours(min) {
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

// ───────────────────────────────────────────────
// grid 만들기
// ───────────────────────────────────────────────

/**
 * ArrayBuffer(.xlsx) -> 2차원 문자열 배열
 *
 * SheetJS는 번들의 대부분을 차지하므로, 실제로 엑셀을 불러올 때만 받아온다.
 */
export async function gridFromArrayBuffer(buf) {
  const { read, utils } = await import("xlsx");
  // cellStyles: 셀 배경색을 읽으려면 필요하다 (근무자 색을 엑셀에서 가져온다)
  const wb = read(buf, { type: "array", cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("엑셀에서 시트를 찾을 수 없습니다.");
  const rows = utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });
  const grid = rows.map((r) => (r || []).map((c) => (c == null ? "" : String(c))));
  return { grid, colors: colorGridFromSheet(ws, utils) };
}

/**
 * 시트의 셀 배경색을 grid 와 같은 좌표계의 2차원 배열로 뽑는다.
 *
 * sheet_to_json(header:1) 은 시트 범위(!ref)의 시작점을 [0][0] 으로 당겨서 내놓기 때문에,
 * 여기서도 같은 오프셋을 빼야 grid[r][c] 와 colors[r][c] 가 같은 셀을 가리킨다.
 */
function colorGridFromSheet(ws, utils) {
  const ref = ws["!ref"];
  if (!ref) return null;
  let range;
  try {
    range = utils.decode_range(ref);
  } catch {
    return null;
  }
  const colors = [];
  let any = false;
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const c = ws[utils.encode_cell({ r: R, c: C })];
      const color = fillColorOf(c);
      if (color) any = true;
      row.push(color);
    }
    colors.push(row);
  }
  return any ? colors : null;
}

/** 셀 -> "#rrggbb" (칠하지 않았거나 흰색이면 null) */
function fillColorOf(cell) {
  const s = cell && cell.s;
  if (!s) return null;
  if (s.patternType && s.patternType !== "solid") return null;
  const raw = s.fgColor && s.fgColor.rgb;
  if (typeof raw !== "string") return null; // theme/indexed 색은 rgb 로 안 나오면 포기
  let hex = raw.trim().replace(/^#/, "").toUpperCase();
  if (hex.length === 8) {
    if (hex.slice(0, 2) === "00") return null; // 완전 투명
    hex = hex.slice(2);
  }
  if (!/^[0-9A-F]{6}$/.test(hex)) return null;
  if (hex === "FFFFFF") return null; // 흰색 = 안 칠한 것으로 본다
  return `#${hex.toLowerCase()}`;
}

/** File(.xlsx) -> { grid, colors } */
export async function readXlsxFile(file) {
  const ab = await file.arrayBuffer();
  return await gridFromArrayBuffer(new Uint8Array(ab));
}

/** 엑셀에서 복사한 탭 구분 텍스트 -> grid */
export function gridFromTsv(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.split("\t"));
}

export function isXlsxFile(file) {
  return /\.xls[xmb]?$/i.test(file?.name || "");
}

// ───────────────────────────────────────────────
// 파싱 코어
// ───────────────────────────────────────────────

// "08:30~09:00" / "08:30-09:00" / "8:30 ~ 9:00" / "08:30"
const TIME_CELL = /^(\d{1,2}):(\d{2})(?:\s*[~\-–—]\s*(\d{1,2}):(\d{2}))?$/;

function cell(grid, r, c) {
  const row = grid[r];
  if (!row) return "";
  const v = row[c];
  return v == null ? "" : String(v).trim();
}

/**
 * 색 문자열을 "#rrggbb" 로 맞춘다.
 * 흰색은 "안 칠한 칸"으로 본다 (근무자 색이 흰색이면 시간표에서 안 보인다).
 */
function normalizeCellColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(hex) || hex === "ffffff") return null;
  return `#${hex}`;
}

/** 시간표 아래에 붙는 요약 라벨 (여기서 표가 끝난 것으로 본다) */
const SUMMARY_LABEL = /^(합계|총계|소계|총합|계|비고|참고|메모|기타)$/;

/** r행의 [from, to] 열 범위에 내용이 있는지 */
function rowHasContent(grid, r, from, to) {
  for (let c = from; c <= to; c++) if (cell(grid, r, c)) return true;
  return false;
}

/** fromRow(포함) 아래에 내용이 남아 있는지 */
function hasContentBelow(grid, fromRow, maxCol) {
  for (let r = Math.max(0, fromRow); r < grid.length; r++) {
    if (rowHasContent(grid, r, 0, maxCol)) return true;
  }
  return false;
}

/** 이름 같지 않은 값 (숫자·공백이 섞였거나 너무 긴 값) */
function looksUnlikeName(name) {
  return /\d/.test(name) || /\s/.test(name) || name.length > 5;
}

function normalizeName(raw) {
  return String(raw).trim().replace(/\s+/g, " ");
}

function parseTimeCell(text) {
  const m = TIME_CELL.exec(String(text).trim());
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = m[3] != null ? Number(m[3]) * 60 + Number(m[4]) : null;
  return { start, end };
}

/**
 * grid -> { title, schedule, names, colors, dayCounts, warnings }
 *
 * 첫 인자는 2차원 문자열 배열이거나, 색까지 같이 읽은 { grid, colors } 다.
 * (colors 는 grid 와 같은 좌표계의 "#rrggbb" | null 2차원 배열)
 *
 * schedule: { 월: [{ name, workTimes }], 화: [...], ... }  (없는 요일은 빈 배열)
 * names:    최초 등장 순서(요일 -> 시간 -> 열)로 정렬된 전체 명단 = 색 배정 순서
 * colors:   { 이름: "#rrggbb" } — 엑셀에서 셀 배경색을 읽어낸 사람만 들어간다
 */
export function parseTimetableGrid(input) {
  const grid = Array.isArray(input) ? input : input && input.grid;
  const colorGrid = (Array.isArray(input) ? null : input && input.colors) || null;
  const warnings = [];
  const empty = {
    title: "",
    schedule: Object.fromEntries(DAYS.map((d) => [d, []])),
    names: [],
    colors: {},
    dayCounts: Object.fromEntries(DAYS.map((d) => [d, 0])),
    warnings,
  };

  if (!Array.isArray(grid) || grid.length === 0) {
    warnings.push("내용이 비어 있습니다.");
    return empty;
  }

  const maxCol = Math.max(0, ...grid.map((r) => (r ? r.length : 0))) - 1;

  // ── 1. 요일 헤더 행 찾기
  // "요일이 2개 이상 있는 첫 행"만 보면, 위쪽에 요일이 들어간 다른 표(예: 요일별 강의실 수)가
  // 있을 때 그 표를 시간표로 착각한다. 후보를 모두 모은 뒤 바로 아래에 시간 행이 이어지는
  // 후보를 고른다. (점수가 같으면 위쪽 후보)
  const headerCandidates = [];
  for (let r = 0; r < grid.length; r++) {
    const found = [];
    for (let c = 0; c <= maxCol; c++) {
      const v = cell(grid, r, c).replace(/요일$/, "");
      if (DAYS.includes(v) && !found.some((f) => f.day === v)) {
        found.push({ day: v, col: c });
      }
    }
    if (found.length >= 2) {
      found.sort((a, b) => a.col - b.col);
      headerCandidates.push({ row: r, days: found });
    }
  }
  if (headerCandidates.length === 0) {
    warnings.push(
      "요일 헤더(월·화·수·목·금)를 찾지 못했습니다. 엑셀 표 전체(제목·요일·시간 행 포함)를 선택했는지 확인하세요.",
    );
    return empty;
  }

  let header = headerCandidates[0];
  let bestScore = -1;
  for (const cand of headerCandidates) {
    const left = Math.max(1, cand.days[0].col);
    let timeHits = 0;
    for (let r = cand.row + 1; r < Math.min(grid.length, cand.row + 4); r++) {
      for (let c = 0; c < left; c++) {
        if (parseTimeCell(cell(grid, r, c))) {
          timeHits++;
          break;
        }
      }
    }
    // 아래에 시간 행이 이어지는지가 요일 개수보다 훨씬 중요하다
    const score = (timeHits > 0 ? 100 : 0) + cand.days.length;
    if (score > bestScore) {
      bestScore = score;
      header = cand;
    }
  }
  const headerRow = header.row;
  const dayCols = header.days;

  // ── 2. 시간 열 찾기: 첫 요일 열보다 왼쪽에서 시간 셀이 가장 많은 열
  const firstDayCol = dayCols[0].col;
  let timeCol = 0;
  let bestHits = -1;
  for (let c = 0; c < Math.max(1, firstDayCol); c++) {
    let hits = 0;
    for (let r = headerRow + 1; r < grid.length; r++) {
      if (parseTimeCell(cell(grid, r, c))) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      timeCol = c;
    }
  }

  // ── 3. 시간 행 수집 (30분 단위나 특정 시작·종료 시각을 가정하지 않는다)
  // 시간표 아래에 다른 표나 메모가 붙어 있을 수 있으므로 표가 끝나는 지점에서 끊는다.
  //   - "합계 / 비고" 같은 요약 라벨
  //   - 시간이 다시 앞으로 돌아가는 행 (시간표의 시간은 아래로 갈수록 늘어난다)
  //   - 완전히 빈 줄이 3줄 이상 이어지는 지점
  const timeRows = [];
  let blankRun = 0;
  let cutAt = -1;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const raw = cell(grid, r, timeCol);
    if (!raw) {
      if (rowHasContent(grid, r, firstDayCol, maxCol)) {
        blankRun = 0;
      } else if (timeRows.length && ++blankRun >= 3) {
        cutAt = r - blankRun + 1;
        break;
      }
      continue;
    }
    blankRun = 0;
    if (timeRows.length && SUMMARY_LABEL.test(raw)) {
      cutAt = r;
      break;
    }
    const t = parseTimeCell(raw);
    if (!t) {
      // 이름이 들어있는 행인데 시간만 못 읽은 경우에만 경고
      const hasNames = rowHasContent(grid, r, firstDayCol, maxCol);
      if (hasNames) warnings.push(`${r + 1}행: 시간 "${raw}" 을 읽을 수 없습니다.`);
      continue;
    }
    const prev = timeRows[timeRows.length - 1];
    if (prev && t.start <= prev.start) {
      warnings.push(
        `${r + 1}행("${raw}")부터는 시간이 다시 앞으로 돌아갑니다. 시간표 아래의 다른 표로 보고 무시했습니다.`,
      );
      cutAt = r;
      break;
    }
    timeRows.push({ r, start: t.start, end: t.end });
  }
  if (cutAt >= 0 && hasContentBelow(grid, cutAt, maxCol)) {
    const lastRow = timeRows.length ? timeRows[timeRows.length - 1].r : cutAt - 1;
    warnings.push(`${lastRow + 2}행 아래는 시간표 밖으로 보고 무시했습니다.`);
  }
  if (timeRows.length === 0) {
    warnings.push('시간 행을 찾지 못했습니다. "08:30~09:00" 형식인지 확인하세요.');
    return empty;
  }

  // 종료 시각이 없는 행은 다음 행의 시작 시각으로 메운다 (마지막 행은 앞 간격만큼)
  for (let i = 0; i < timeRows.length; i++) {
    if (timeRows[i].end != null) continue;
    const next = timeRows[i + 1];
    if (next) {
      timeRows[i].end = next.start;
    } else {
      const prev = timeRows[i - 1];
      const span = prev ? prev.end - prev.start : 30;
      timeRows[i].end = timeRows[i].start + span;
    }
  }

  // ── 4. 요일별 열 범위
  // 마지막 요일 블록을 시트 오른쪽 끝까지로 잡으면 옆에 붙은 "비고 / 합계" 열이
  // 그 요일의 근무자로 빨려 들어간다. 두 가지로 오른쪽 끝을 좁힌다.
  const lastDayCol = dayCols[dayCols.length - 1].col;
  let rightEdge = maxCol;
  // (a) 요일 헤더 행에 요일이 아닌 라벨이 있으면 그 앞에서 끊는다
  for (let c = lastDayCol + 1; c <= maxCol; c++) {
    if (cell(grid, headerRow, c)) {
      rightEdge = c - 1;
      break;
    }
  }
  // (b) 다른 요일 블록 중 가장 넓은 폭까지만 인정한다
  if (dayCols.length >= 2) {
    const widths = dayCols.slice(1).map((d, i) => d.col - dayCols[i].col);
    rightEdge = Math.min(rightEdge, lastDayCol + Math.max(...widths) - 1);
  }

  const blocks = dayCols.map(({ day, col }, i) => ({
    day,
    from: col,
    to: i + 1 < dayCols.length ? dayCols[i + 1].col - 1 : rightEdge,
  }));

  // 시간 열과 첫 요일 열 사이에 이름이 있으면 알려준다
  for (let c = timeCol + 1; c < firstDayCol; c++) {
    for (const { r } of timeRows) {
      if (cell(grid, r, c)) {
        warnings.push(
          `${c + 1}번째 열은 어느 요일에도 속하지 않아 무시했습니다. (${r + 1}행: ${cell(grid, r, c)})`,
        );
        break;
      }
    }
  }

  // 마지막 요일 오른쪽에서 잘라낸 내용도 알려준다
  const droppedRight = [];
  for (let c = rightEdge + 1; c <= maxCol; c++) {
    for (const { r } of timeRows) {
      const v = cell(grid, r, c);
      if (v) {
        droppedRight.push(`${c + 1}번째 열 "${v}"`);
        break;
      }
    }
  }
  if (droppedRight.length) {
    warnings.push(
      `마지막 요일 오른쪽은 시간표 밖으로 보고 무시했습니다. (${droppedRight
        .slice(0, 3)
        .join(", ")}${droppedRight.length > 3 ? " 등" : ""})`,
    );
  }

  // ── 5. 요일 x 시간행마다 이름을 모으고, 사람별로 연속 행을 병합
  // 제목은 요일 헤더에서 위로 올라가며 가장 가까운 줄에서 찾는다.
  // 셀이 3개 이상 채워진 줄은 제목이 아니라 다른 표로 본다.
  const title = (() => {
    for (let r = headerRow - 1; r >= 0; r--) {
      const texts = [];
      for (let c = 0; c <= maxCol; c++) {
        const v = cell(grid, r, c);
        if (v) texts.push(v);
      }
      if (texts.length === 0) continue;
      if (texts.length > 2) return "";
      return texts.reduce((a, b) => (b.length > a.length ? b : a));
    }
    return "";
  })();

  const schedule = Object.fromEntries(DAYS.map((d) => [d, []]));
  const dayCounts = Object.fromEntries(DAYS.map((d) => [d, 0]));
  const nameOrder = [];
  const seenNames = new Set();
  // 이름 -> { "#rrggbb": 셀 개수 }  (한 사람 셀에 색이 섞여 있으면 최다 득표색을 쓴다)
  const colorVotes = new Map();

  for (const { day, from, to } of blocks) {
    // rowNames[i] = i번째 시간행에 근무하는 이름 Set
    const rowNames = timeRows.map(({ r, start }) => {
      const set = new Set();
      for (let c = from; c <= to; c++) {
        const name = normalizeName(cell(grid, r, c));
        if (!name) continue;
        if (set.has(name)) {
          warnings.push(
            `${day} ${minToTime(start)} — "${name}" 이 같은 시간에 2번 들어 있어 1번으로 처리했습니다.`,
          );
          continue;
        }
        set.add(name);
        if (!seenNames.has(name)) {
          seenNames.add(name);
          nameOrder.push(name);
        }
        const color = normalizeCellColor(colorGrid && colorGrid[r] && colorGrid[r][c]);
        if (color) {
          if (!colorVotes.has(name)) colorVotes.set(name, new Map());
          const votes = colorVotes.get(name);
          votes.set(color, (votes.get(color) || 0) + 1);
        }
      }
      return set;
    });

    // 사람 -> 근무한 시간행 인덱스 목록
    const byPerson = new Map();
    rowNames.forEach((set, i) => {
      for (const name of set) {
        if (!byPerson.has(name)) byPerson.set(name, []);
        byPerson.get(name).push(i);
      }
    });

    const list = [];
    for (const [name, idxs] of byPerson) {
      const ranges = [];
      let startIdx = idxs[0];
      let prevIdx = idxs[0];
      for (const i of idxs.slice(1)) {
        // 행 인덱스가 연속이고 시간도 맞닿아 있을 때만 이어붙인다
        const contiguous =
          i === prevIdx + 1 && timeRows[prevIdx].end === timeRows[i].start;
        if (!contiguous) {
          ranges.push([timeRows[startIdx].start, timeRows[prevIdx].end]);
          startIdx = i;
        }
        prevIdx = i;
      }
      ranges.push([timeRows[startIdx].start, timeRows[prevIdx].end]);

      const workTimes = rangesToWorkTimes(ranges);
      if (workTimes.length > 2) {
        warnings.push(
          `${day} ${name} — 근무 구간이 ${workTimes.length}개입니다. 명단 화면에서는 2개까지만 수정할 수 있습니다.`,
        );
      }
      list.push({ name, workTimes });
    }

    // 시작 시각 순으로 정렬 -> 시간표 열 순서가 엑셀과 비슷하게 보인다
    list.sort(
      (a, b) => workTimesToRanges(a.workTimes)[0][0] - workTimesToRanges(b.workTimes)[0][0],
    );
    schedule[day] = list;
    dayCounts[day] = list.length;
  }

  if (nameOrder.length === 0) {
    warnings.push("근무자 이름을 하나도 찾지 못했습니다.");
  }

  const oddNames = nameOrder.filter(looksUnlikeName);
  if (oddNames.length) {
    warnings.push(
      `이름 같지 않은 값이 명단에 들어왔습니다: ${oddNames.slice(0, 5).join(", ")}${
        oddNames.length > 5 ? " 등" : ""
      } — 시간표 안에 다른 표나 메모가 섞여 있는지 확인하세요.`,
    );
  }

  const colors = {};
  for (const name of nameOrder) {
    const votes = colorVotes.get(name);
    if (!votes) continue;
    let best = null;
    let bestCount = 0;
    for (const [color, count] of votes) {
      if (count > bestCount) {
        best = color;
        bestCount = count;
      }
    }
    if (best) colors[name] = best;
  }

  return { title, schedule, names: nameOrder, colors, dayCounts, warnings };
}
