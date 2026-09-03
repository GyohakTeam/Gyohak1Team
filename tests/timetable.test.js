/**
 * 시간표 엑셀 파싱 테스트
 * 실행: node tests/timetable.test.js
 *
 * assets/time_table.xlsx 를 실제로 읽어서, 기대하는 근무자·근무시간과
 * 정확히 일치하는지 확인한다. (.xlsx 경로와 복붙(TSV) 경로 둘 다)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  gridFromArrayBuffer,
  gridFromTsv,
  parseTimetableGrid,
  addSlot,
  removeSlot,
  rangesToWorkTimes,
  workTimesToRanges,
  totalMinutes,
} from "../src/timetable.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = join(__dirname, "..", "assets", "time_table.xlsx");

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
// 기대값 — assets/time_table.xlsx (2026학년도 2학기)
// ───────────────────────────────────────────────
const EXPECTED = {
  월: {
    예인: ["08:30-16:30"],
    소은: ["08:30-11:30", "15:00-18:30"],
    동균: ["08:30-15:30"],
    하준: ["09:30-11:30", "15:00-17:30"],
    지상: ["12:00-14:00", "20:00-22:00"],
    예원: ["14:30-21:00"],
    민경: ["17:30-21:30"],
    주하: ["18:00-21:00"],
    준호: ["20:00-22:00"],
  },
  화: {
    선우: ["08:30-14:30"],
    민경: ["08:30-16:30"],
    준호: ["08:30-16:30"],
    소은: ["09:00-17:00"],
    하준: ["09:00-14:30"],
    예빈: ["14:30-15:30", "17:30-22:00"],
    서영: ["15:00-22:00"],
    주하: ["16:30-20:30"],
    동균: ["17:30-22:00"],
  },
  수: {
    선우: ["08:30-11:30"],
    유민: ["08:30-13:00", "17:30-21:00"],
    예빈: ["08:30-16:00"],
    주하: ["09:00-14:00"],
    서영: ["10:00-15:00"],
    민경: ["12:00-14:30"],
    준호: ["12:00-17:00"],
    지상: ["14:00-22:00"],
    예원: ["14:30-21:00"],
    동균: ["15:00-17:00"],
  },
  목: {
    예원: ["08:30-14:30", "15:30-17:30"],
    민경: ["08:30-14:00"],
    하준: ["08:30-12:00"],
    소은: ["09:00-14:30"],
    예인: ["12:00-14:30", "15:30-18:00"],
    지상: ["12:00-14:30", "15:30-21:00"],
    준호: ["12:00-17:00"],
    유민: ["12:00-21:00"],
    서영: ["14:00-22:00"],
    선우: ["14:30-17:30"],
    동균: ["15:30-22:00"],
  },
  금: {
    선우: ["08:30-16:30"],
    하준: ["08:30-11:30", "14:30-18:30"],
    주하: ["08:30-16:30"],
    유민: ["09:00-14:00"],
    예빈: ["15:00-22:00"],
    예인: ["15:00-22:00"],
  },
};

const EXPECTED_NAMES = [
  "동균", "민경", "서영", "선우", "소은", "예빈", "예원",
  "예인", "유민", "주하", "준호", "지상", "하준",
];

const DAYS = ["월", "화", "수", "목", "금"];

function checkParsed(suite, parsed) {
  test(suite, "경고 없이 파싱된다", () => {
    assertEqual(parsed.warnings, [], `warnings: ${parsed.warnings.join(" | ")}`);
  });

  test(suite, "제목을 엑셀에서 가져온다", () => {
    assertEqual(parsed.title, "2026학년도 2학기 근로시간표");
  });

  test(suite, `근무자 ${EXPECTED_NAMES.length}명을 찾는다`, () => {
    assertEqual([...parsed.names].sort(), EXPECTED_NAMES);
  });

  test(suite, "요일별 인원수 9/9/10/11/6", () => {
    assertEqual(
      DAYS.map((d) => parsed.dayCounts[d]),
      [9, 9, 10, 11, 6],
    );
  });

  for (const day of DAYS) {
    const expected = EXPECTED[day];
    const actual = parsed.schedule[day];

    test(suite, `${day}요일 명단이 일치한다`, () => {
      assertEqual(
        actual.map((w) => w.name).sort(),
        Object.keys(expected).sort(),
      );
    });

    test(suite, `${day}요일 근무시간이 일치한다`, () => {
      for (const [name, workTimes] of Object.entries(expected)) {
        const found = actual.find((w) => w.name === name);
        assert(found, `${day} ${name} 없음`);
        assertEqual(
          found.workTimes,
          workTimes,
          `${day} ${name}: expected ${JSON.stringify(workTimes)} got ${JSON.stringify(found.workTimes)}`,
        );
      }
    });

    test(suite, `${day}요일에 같은 이름이 두 번 나오지 않는다`, () => {
      const names = actual.map((w) => w.name);
      assertEqual(names.length, new Set(names).size);
    });

    test(suite, `${day}요일 근무구간이 최대 2개다`, () => {
      for (const w of actual) {
        assert(
          w.workTimes.length <= 2,
          `${day} ${w.name} 구간 ${w.workTimes.length}개`,
        );
      }
    });

    test(suite, `${day}요일 열이 시작시간 순으로 정렬된다`, () => {
      const starts = actual.map((w) => workTimesToRanges(w.workTimes)[0][0]);
      assertEqual(starts, [...starts].sort((a, b) => a - b));
    });
  }
}

// ───────────────────────────────────────────────
// 1) .xlsx 파일 경로
// ───────────────────────────────────────────────
const buf = readFileSync(XLSX_PATH);
const loaded = await gridFromArrayBuffer(new Uint8Array(buf));
const grid = loaded.grid;
const fromXlsx = parseTimetableGrid(loaded);
checkParsed(".xlsx 파일", fromXlsx);

// ───────────────────────────────────────────────
// 1-1) 셀 배경색 -> 근무자 색
// ───────────────────────────────────────────────
const EXPECTED_COLORS = {
  예인: "#00e65c",
  동균: "#f2f2f2",
  소은: "#f4b183",
  선우: "#b7dee8",
  준호: "#6fa8ff",
  민경: "#00e5e5",
  예빈: "#ff8bd1",
  유민: "#d9a0f3",
  예원: "#fff200",
  하준: "#b7f34a",
  주하: "#ffd966",
  서영: "#ff8a7a",
  지상: "#b4a7d6",
};

test("엑셀 색", "13명 전원의 색을 읽는다", () => {
  assertEqual(Object.keys(fromXlsx.colors).length, 13);
});

test("엑셀 색", "이름별 색이 엑셀 셀 배경색과 일치한다", () => {
  for (const [name, color] of Object.entries(EXPECTED_COLORS)) {
    assertEqual(fromXlsx.colors[name], color, name);
  }
});

test("엑셀 색", "색 배열은 grid 와 같은 좌표계다", () => {
  // 이름이 있는 칸에는 색이, 시간 헤더 아래 빈 칸에는 색이 없어야 한다
  let painted = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const name = String(grid[r][c] ?? "").trim();
      const color = loaded.colors?.[r]?.[c] ?? null;
      if (Object.hasOwn(EXPECTED_COLORS, name)) {
        assertEqual(color, EXPECTED_COLORS[name], `${r + 1}행 ${c + 1}열 ${name}`);
        painted++;
      }
    }
  }
  if (painted < 500) throw new Error(`색칠된 이름 칸이 ${painted}개뿐입니다`);
});

test("엑셀 색", "복붙(TSV)에는 색 정보가 없다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(["아무\t내용", "월\t화", "09:00~10:00\t가\t나"].join("\n")),
  );
  assertEqual(p.colors, {});
});

test("엑셀 색", "흰색 채우기는 색으로 치지 않는다", () => {
  const g = [
    ["", "월", "화"],
    ["09:00~10:00", "가", "나"],
  ];
  const colors = [
    [null, null, null],
    [null, "#ffffff", "#ffd966"],
  ];
  const p = parseTimetableGrid({ grid: g, colors });
  assertEqual(p.colors, { 나: "#ffd966" });
});

test("엑셀 색", "한 사람 칸에 색이 섞이면 최다 득표색을 쓴다", () => {
  const g = [
    ["", "월", "화"],
    ["09:00~10:00", "가", "가"],
    ["10:00~11:00", "가", ""],
  ];
  const colors = [
    [null, null, null],
    [null, "#111111", "#222222"],
    [null, "#222222", null],
  ];
  const p = parseTimetableGrid({ grid: g, colors });
  assertEqual(p.colors, { 가: "#222222" });
});

// ───────────────────────────────────────────────
// 1-2) 시간표 옆·위·아래에 다른 내용이 섞여 있을 때
// ───────────────────────────────────────────────
const S = "다른 내용 섞임";
const names3 = (p) => assertEqual(p.names, ["가", "나", "다"]);
const clean3 = (p) => {
  names3(p);
  assertEqual(p.schedule["월"], [{ name: "가", workTimes: ["09:00-10:00"] }]);
  assertEqual(p.schedule["화"], [{ name: "나", workTimes: ["09:00-10:00"] }]);
  assertEqual(p.schedule["수"], [{ name: "다", workTimes: ["09:00-10:00"] }]);
};

test(S, "위쪽 메모는 제목으로 삼지 않고, 헤더에 가장 가까운 제목을 쓴다", () => {
  const p = parseTimetableGrid([
    ["담당자: 홍길동", "", "", ""],
    ["※ 변경 시 연락주세요", "", "", ""],
    ["2026 근로시간표", "", "", ""],
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
  ]);
  assertEqual(p.title, "2026 근로시간표");
  clean3(p);
});

test(S, "표 위에 셀이 빽빽한 다른 표가 있으면 제목을 비운다", () => {
  const p = parseTimetableGrid([
    ["구분", "강의실", "인원", "비고"],
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
  ]);
  assertEqual(p.title, "");
  clean3(p);
});

test(S, "아래에 붙은 다른 표(시간이 되돌아감)를 무시한다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
    [""],
    ["비고", "", ""],
    ["09:00~18:00", "사무실 근무", "", ""],
    ["13:00~14:00", "점심", "", ""],
  ]);
  clean3(p);
});

test(S, "빈 줄 3개 뒤에 오는 표는 시간이 더 늦어도 무시한다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
    [""],
    [""],
    [""],
    ["20:00~21:00", "야간경비", "", ""],
  ]);
  clean3(p);
});

test(S, "합계 행에서 표가 끝난다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
    ["합계", "1명", "1명", "1명"],
  ]);
  clean3(p);
});

test(S, "마지막 요일 오른쪽의 비고·합계 열을 무시한다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "화", "수", "비고", "합계"],
    ["09:00~10:00", "가", "나", "다", "정문 확인", "3명"],
  ]);
  clean3(p);
});

test(S, "헤더가 없는 오른쪽 메모 열도 요일 블록 폭으로 잘라낸다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "화", "수", "", ""],
    ["09:00~10:00", "가", "나", "다", "정문 확인", ""],
  ]);
  clean3(p);
});

test(S, "요일마다 열이 여러 개여도 오른쪽 메모만 잘라낸다", () => {
  const p = parseTimetableGrid([
    ["2026 시간표", "", "", "", "", "", "", ""],
    ["시간", "월", "", "", "화", "", "", "비고"],
    ["09:00~10:00", "가", "나", "", "다", "라", "", "정문"],
    ["10:00~11:00", "가", "", "", "다", "", "", ""],
  ]);
  assertEqual(p.title, "2026 시간표");
  assertEqual(p.names, ["가", "나", "다", "라"]);
  assertEqual(p.schedule["월"], [
    { name: "가", workTimes: ["09:00-11:00"] },
    { name: "나", workTimes: ["09:00-10:00"] },
  ]);
  assertEqual(p.schedule["화"], [
    { name: "다", workTimes: ["09:00-11:00"] },
    { name: "라", workTimes: ["09:00-10:00"] },
  ]);
});

test(S, "위쪽에 요일이 들어간 다른 표가 있으면 시간 행이 이어지는 표를 고른다", () => {
  const p = parseTimetableGrid([
    ["구분", "월", "화", "수"],
    ["강의실 수", "5", "4", "3"],
    [""],
    ["시간", "월", "화", "수"],
    ["09:00~10:00", "가", "나", "다"],
  ]);
  clean3(p);
});

test(S, "요일 블록 안에 메모가 들어오면 경고한다", () => {
  const p = parseTimetableGrid([
    ["시간", "월", "", "화", ""],
    ["09:00~10:00", "가", "정문 확인", "나", ""],
  ]);
  assertEqual(p.names.includes("정문 확인"), true);
  assertEqual(
    p.warnings.some((w) => w.includes("이름 같지 않은 값")),
    true,
  );
});

// ───────────────────────────────────────────────
// 2) 복붙(TSV) 경로 — 같은 grid를 엑셀 복사 형태로 되돌려서 확인
// ───────────────────────────────────────────────
const width = Math.max(...grid.map((r) => r.length));
const tsv = grid
  .map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "").join("\t"))
  .join("\n");
checkParsed("복붙(TSV)", parseTimetableGrid(gridFromTsv(tsv)));

test("복붙(TSV)", "파일 경로와 결과가 완전히 같다", () => {
  const a = parseTimetableGrid(gridFromTsv(tsv));
  assertEqual(a.schedule, fromXlsx.schedule);
  assertEqual(a.names, fromXlsx.names);
});

// ───────────────────────────────────────────────
// 3) 포맷 유연성
// ───────────────────────────────────────────────
test("포맷 유연성", "'-' 구분자와 '요일' 접미사도 읽는다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(
      [
        "테스트 시간표",
        "시간\t월요일\t\t화요일",
        "09:00-10:00\t가\t나\t다",
        "10:00-11:00\t가\t\t다",
      ].join("\n"),
    ),
  );
  assertEqual(p.warnings, []);
  assertEqual(p.title, "테스트 시간표");
  assertEqual(p.schedule["월"], [
    { name: "가", workTimes: ["09:00-11:00"] },
    { name: "나", workTimes: ["09:00-10:00"] },
  ]);
  assertEqual(p.schedule["화"], [{ name: "다", workTimes: ["09:00-11:00"] }]);
});

test("포맷 유연성", "종료시각 없는 시간 열도 다음 행에서 메운다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(
      ["시간\t월\t화", "09:00\t가\t나", "10:00\t가\t", "11:00\t\t나"].join("\n"),
    ),
  );
  assertEqual(p.warnings, []);
  assertEqual(p.schedule["월"], [{ name: "가", workTimes: ["09:00-11:00"] }]);
  // 화요일 "나" 는 10:00~11:00 이 비어 있으므로 두 구간으로 끊긴다
  assertEqual(p.schedule["화"], [
    { name: "나", workTimes: ["09:00-10:00", "11:00-12:00"] },
  ]);
});

test("포맷 유연성", "1시간 단위 시간표도 30분 가정 없이 동작한다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(
      ["시간\t월\t화", "13:00~14:00\t가\t나", "14:00~15:00\t가\t나"].join("\n"),
    ),
  );
  assertEqual(p.schedule["월"], [{ name: "가", workTimes: ["13:00-15:00"] }]);
});

test("포맷 유연성", "이름 앞뒤 공백을 정리한다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(["시간\t월\t화", "09:00~10:00\t  가  \t 나"].join("\n")),
  );
  assertEqual(p.schedule["월"], [{ name: "가", workTimes: ["09:00-10:00"] }]);
});

// ───────────────────────────────────────────────
// 4) 경고
// ───────────────────────────────────────────────
test("경고", "요일 헤더가 없으면 빈 결과 + 경고", () => {
  const p = parseTimetableGrid(gridFromTsv("아무\t내용\n09:00~10:00\t가"));
  assertEqual(p.names, []);
  assert(p.warnings.length > 0);
  assert(p.warnings[0].includes("요일 헤더"));
});

test("경고", "같은 요일 같은 시간에 이름이 중복되면 경고하고 1번만 센다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(["시간\t월\t\t화", "09:00~10:00\t가\t가\t나"].join("\n")),
  );
  assertEqual(p.schedule["월"], [{ name: "가", workTimes: ["09:00-10:00"] }]);
  assert(p.warnings.some((w) => w.includes("2번")));
});

test("경고", "근무구간이 3개 이상이면 경고한다", () => {
  const p = parseTimetableGrid(
    gridFromTsv(
      [
        "시간\t월\t화",
        "09:00~10:00\t가\t나",
        "10:00~11:00\t\t나",
        "11:00~12:00\t가\t나",
        "12:00~13:00\t\t나",
        "13:00~14:00\t가\t나",
      ].join("\n"),
    ),
  );
  assertEqual(p.schedule["월"][0].workTimes, [
    "09:00-10:00",
    "11:00-12:00",
    "13:00-14:00",
  ]);
  assert(p.warnings.some((w) => w.includes("3개")));
});

test("경고", "빈 입력은 경고만 남기고 빈 시간표를 준다", () => {
  const p = parseTimetableGrid([]);
  assertEqual(p.names, []);
  assertEqual(p.schedule, { 월: [], 화: [], 수: [], 목: [], 금: [] });
  assert(p.warnings.length > 0);
});

// ───────────────────────────────────────────────
// 5) 슬롯 편집 헬퍼 (드래그 편집이 쓰는 로직)
// ───────────────────────────────────────────────
test("슬롯 편집", "맞닿은 슬롯을 추가하면 하나로 합쳐진다", () => {
  let ranges = workTimesToRanges(["09:00-10:00"]);
  ranges = addSlot(ranges, 10 * 60);
  assertEqual(rangesToWorkTimes(ranges), ["09:00-10:30"]);
});

test("슬롯 편집", "떨어진 슬롯을 추가하면 구간이 두 개가 된다", () => {
  let ranges = workTimesToRanges(["09:00-10:00"]);
  ranges = addSlot(ranges, 12 * 60);
  assertEqual(rangesToWorkTimes(ranges), ["09:00-10:00", "12:00-12:30"]);
});

test("슬롯 편집", "구간 가운데 슬롯을 빼면 둘로 쪼개진다", () => {
  let ranges = workTimesToRanges(["09:00-11:00"]);
  ranges = removeSlot(ranges, 10 * 60);
  assertEqual(rangesToWorkTimes(ranges), ["09:00-10:00", "10:30-11:00"]);
});

test("슬롯 편집", "구간 전체를 빼면 남는 게 없다", () => {
  let ranges = workTimesToRanges(["09:00-09:30"]);
  ranges = removeSlot(ranges, 9 * 60);
  assertEqual(rangesToWorkTimes(ranges), []);
});

test("슬롯 편집", "총 근무시간을 분으로 더한다", () => {
  assertEqual(totalMinutes(["09:00-11:00", "13:00-13:30"]), 150);
});

test("슬롯 편집", "월요일 전체 근무시간 합이 맞다", () => {
  const sum = fromXlsx.schedule["월"].reduce(
    (acc, w) => acc + totalMinutes(w.workTimes),
    0,
  );
  // 표에서 직접 센 값: 8+6.5+7+4.5+4+6.5+4+3+2 = 45.5시간
  assertEqual(sum, 45.5 * 60);
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
