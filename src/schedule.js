/**
 * 요일 상수와 근무자 색 관리
 *
 * 근무자 명단·근무시간은 더 이상 이 파일에 하드코딩하지 않는다.
 * 시간표 페이지에서 엑셀을 불러오면 채워지고 localStorage에 저장된다.
 * 색도 고정 표가 아니라 명단 순서대로 팔레트에서 자동 배정된다.
 */

export const DAYS = ["월", "화", "수", "목", "금"];

/** 요일마다 빈 배열을 가진 새 시간표 */
export function emptySchedule() {
  return Object.fromEntries(DAYS.map((d) => [d, []]));
}

/** 시간표에 근무자가 한 명도 없는지 */
export function isScheduleEmpty(schedule) {
  return DAYS.every((d) => !(schedule?.[d]?.length));
}

/**
 * 근무자 색 팔레트.
 * 기존 점검표의 파스텔 톤을 유지하면서, 인접한 색끼리 최대한 구분되도록 배열했다.
 * 검은 글씨가 읽히는 밝기만 사용한다.
 */
export const PALETTE = [
  "#FF8C69", "#6FB7E8", "#FFD24D", "#7FD68A",
  "#C9A0D8", "#F48FB1", "#66E0DC", "#FFB067",
  "#A0A8E8", "#B7D96B", "#FF9EC4", "#7FD3F5",
  "#E8C77A", "#9EDBB8", "#D9A2A2", "#B0B7C4",
  "#FFE066", "#8FC9A0", "#E0A0E8", "#79C4D6",
  "#F0A878", "#A8C97F", "#C4A0C0", "#D0CECE",
];

const ROSTER_KEY = "gyohak-roster";

/** name -> color */
let roster = null;

function load() {
  if (roster) return roster;
  roster = new Map();
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) {
      for (const [name, color] of Object.entries(JSON.parse(raw))) {
        if (typeof color === "string") roster.set(name, color);
      }
    }
  } catch {}
  return roster;
}

function persist() {
  try {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify(Object.fromEntries(load())),
    );
  } catch {}
}

/** 팔레트를 다 쓴 뒤에는 황금각으로 hue를 돌려 계속 만들어낸다 */
function generatedColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 62% 74%)`;
}

function nextFreeColor(used) {
  for (const c of PALETTE) if (!used.has(c)) return c;
  for (let i = 0; ; i++) {
    const c = generatedColor(i);
    if (!used.has(c)) return c;
  }
}

/** 이름을 팔레트 색으로 안정적으로 흩뿌리는 해시 (미등록 이름용 폴백) */
function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** 등록된 이름은 배정된 색, 아니면 이름 기반의 안정적인 색 */
export function getPersonColor(name) {
  return load().get(name) ?? hashColor(String(name ?? ""));
}

/** 아직 색이 없는 이름에만 남은 팔레트 색을 순서대로 배정 */
export function registerNames(names) {
  const map = load();
  const used = new Set(map.values());
  for (const name of names) {
    if (!name || map.has(name)) continue;
    const color = nextFreeColor(used);
    map.set(name, color);
    used.add(color);
  }
  persist();
}

/**
 * 명단을 통째로 갈아끼운다 (엑셀 새로 불러오기).
 * 이미 쓰던 이름은 색을 그대로 유지해서 눈에 익은 색이 안 바뀌게 하고,
 * 없어진 이름의 색은 반납해서 팔레트가 촘촘하게 유지된다.
 */
export function resetRoster(names) {
  const old = load();
  const next = new Map();
  const used = new Set();
  for (const name of names) {
    if (!name || next.has(name)) continue;
    const prev = old.get(name);
    const color = prev && !used.has(prev) ? prev : nextFreeColor(used);
    next.set(name, color);
    used.add(color);
  }
  roster = next;
  persist();
}

export function setPersonColor(name, color) {
  load().set(name, color);
  persist();
}

/** 이름을 바꾸면서 색 배정을 그대로 넘긴다 */
export function renamePerson(from, to) {
  const map = load();
  if (!map.has(from) || from === to) return;
  const color = map.get(from);
  map.delete(from);
  if (!map.has(to)) map.set(to, color);
  persist();
}

export function forgetPerson(name) {
  load().delete(name);
  persist();
}

export function clearRoster() {
  roster = new Map();
  try {
    localStorage.removeItem(ROSTER_KEY);
  } catch {}
}
