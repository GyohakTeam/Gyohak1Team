import { useEffect, useMemo, useState } from "react";
import { DAYS, getPersonColor, SCHEDULE_VERSION } from "../schedule";
import { toMin } from "../utils";

// 08:30 ~ 22:00, 30분 단위
const TIME_SLOTS = (() => {
  const slots = [];
  for (let m = 8 * 60 + 30; m < 22 * 60; m += 30) slots.push(m);
  return slots;
})();

function minToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function workTimesToRanges(workTimes) {
  return workTimes.map((t) => {
    const [s, e] = t.split("-");
    return [toMin(s), toMin(e)];
  });
}

function rangesToWorkTimes(ranges) {
  return ranges.map(([s, e]) => `${minToTime(s)}-${minToTime(e)}`);
}

function addSlot(ranges, slotMin) {
  const s = slotMin,
    e = slotMin + 30;
  const next = [...ranges, [s, e]].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of next) {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        r[1],
      );
    } else {
      merged.push([...r]);
    }
  }
  return merged;
}

function removeSlot(ranges, slotMin) {
  const s = slotMin,
    e = slotMin + 30;
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

// 요일 헤더 색 (진하게)
const DAY_HEADER = {
  월: { bg: "#1d6fd4", text: "#fff" },
  화: { bg: "#1a9e52", text: "#fff" },
  수: { bg: "#b8860b", text: "#fff" },
  목: { bg: "#d45d0a", text: "#fff" },
  금: { bg: "#c0356e", text: "#fff" },
};

export default function SchedulePage({ schedule, onScheduleChange, onBack, onClearCache }) {
  const [saved, setSaved] = useState(false);
  const [addingDay, setAddingDay] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  // 전체 요일에 등록된 근무자 이름 풀
  const allWorkerNames = useMemo(() => {
    const names = new Set();
    for (const day of DAYS)
      for (const w of (schedule[day] || [])) names.add(w.name);
    return [...names];
  }, [schedule]);

  function getAvailable(day) {
    const existing = new Set((schedule[day] || []).map((w) => w.name));
    return allWorkerNames.filter((n) => !existing.has(n));
  }

  function handleAddBtnClick(day, e) {
    e.stopPropagation();
    if (addingDay === day) { setAddingDay(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setAddingDay(day);
  }

  function handleAddWorker(day, name) {
    // 다른 요일의 근무시간을 기본값으로 사용
    let workTimes = ["09:00-18:00"];
    for (const d of DAYS) {
      if (d === day) continue;
      const found = (schedule[d] || []).find((w) => w.name === name);
      if (found?.workTimes?.length) { workTimes = [...found.workTimes]; break; }
    }
    onScheduleChange({ ...schedule, [day]: [...(schedule[day] || []), { name, workTimes }] });
    setAddingDay(null);
    setSaved(false);
  }

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!addingDay) return;
    function onDown(e) {
      if (!e.target.closest(".sch-add-dropdown") && !e.target.closest(".sch-add-btn"))
        setAddingDay(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addingDay]);

  const dayData = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        workers: (schedule[day] || []).map((w) => ({
          name: w.name,
          workTimes: w.workTimes,
          color: getPersonColor(w.name),
        })),
      })),
    [schedule],
  );

  function handleCellClick(day, workerIdx, slotMin, working) {
    const newSchedule = { ...schedule };
    const workers = newSchedule[day].map((w) => ({
      ...w,
      workTimes: [...w.workTimes],
    }));
    const worker = workers[workerIdx];
    const ranges = workTimesToRanges(worker.workTimes);
    const newRanges = working
      ? removeSlot(ranges, slotMin)
      : addSlot(ranges, slotMin);
    worker.workTimes = rangesToWorkTimes(newRanges);
    // workTimes가 비면 해당 근무자를 당일 스케줄에서 제거
    newSchedule[day] =
      worker.workTimes.length === 0
        ? workers.filter((_, i) => i !== workerIdx)
        : workers;
    onScheduleChange(newSchedule);
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem("gyohak-schedule", JSON.stringify({ version: SCHEDULE_VERSION, data: schedule }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClearCache() {
    if (window.confirm("저장된 시간표를 초기화하고 기본값으로 되돌릴까요?\n(현재 수정 내용이 모두 사라집니다)")) {
      onClearCache();
    }
  }

  return (
    <div className="sch-page">
      <div className="sch-top-bar">
        <button className="sch-back-btn" onClick={onBack}>
          ← 배정 화면
        </button>
        <h1 className="sch-title">2026-1학기 3월 4주차 근로시간표</h1>
        <button
          className={`sch-save-btn ${saved ? "sch-save-ok" : ""}`}
          onClick={handleSave}
        >
          {saved ? "✓ 저장됨" : "💾 저장"}
        </button>
      </div>

      <div className="sch-table-wrap">
        <table className="sch-table">
          <thead>
            <tr>
              <th className="sch-th sch-time-th" rowSpan={2}>
                시간
              </th>
              {dayData.map(({ day, workers }) => (
                <th
                  key={day}
                  colSpan={workers.length}
                  className="sch-th sch-day-th"
                  style={{
                    backgroundColor: DAY_HEADER[day].bg,
                    color: DAY_HEADER[day].text,
                    borderLeft: "3px solid #555",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    {day}
                    <button
                      className="sch-add-btn"
                      onClick={(e) => handleAddBtnClick(day, e)}
                      title={`${day}요일 근무자 추가`}
                    >
                      +
                    </button>
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              {dayData.map(({ day, workers }) =>
                workers.map((w, i) => (
                  <th
                    key={day + w.name + i}
                    className="sch-th sch-name-th"
                    style={{
                      backgroundColor: w.color,
                      borderLeft: i === 0 ? "3px solid #555" : "1px solid #bbb",
                    }}
                  >
                    {w.name}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slotMin) => (
              <tr
                key={slotMin}
                className="sch-row"
                style={
                  slotMin === 720 || slotMin === 1050
                    ? { borderTop: "3px solid #333" }
                    : undefined
                }
              >
                <td
                  className="sch-time-td"
                  style={
                    slotMin === 720 || slotMin === 1050
                      ? { borderTop: "3px solid #333" }
                      : undefined
                  }
                >
                  {minToTime(slotMin)}~{minToTime(slotMin + 30)}
                </td>
                {dayData.map(({ day, workers }) =>
                  workers.map((w, i) => {
                    const ranges = workTimesToRanges(w.workTimes);
                    const working = ranges.some(
                      ([s, e]) => s < slotMin + 30 && e > slotMin,
                    );
                    const thickTop = slotMin === 720 || slotMin === 1050;
                    return (
                      <td
                        key={day + w.name + i}
                        className={`sch-cell ${working ? "sch-cell-on" : "sch-cell-off"}`}
                        style={{
                          backgroundColor: working ? w.color : "#f5f5f5",
                          borderLeft:
                            i === 0 ? "3px solid #888" : "1px solid #ddd",
                          borderTop: thickTop ? "3px solid #333" : undefined,
                          cursor: "pointer",
                          color: working ? "#111" : "transparent",
                        }}
                        onClick={() =>
                          handleCellClick(day, i, slotMin, working)
                        }
                        title={
                          working
                            ? `${w.name} ${minToTime(slotMin)}~${minToTime(slotMin + 30)} 제거`
                            : `${w.name} ${minToTime(slotMin)}~${minToTime(slotMin + 30)} 추가`
                        }
                      >
                        {w.name}
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 캐시 초기화 버튼 (우하단 고정) ===== */}
      <button className="sch-reset-btn" onClick={handleClearCache}>
        🗑 시간표 캐시데이터 초기화
      </button>

      {/* ===== 근무자 추가 드롭다운 ===== */}
      {addingDay && dropdownPos && (
        <div className="sch-add-dropdown" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          {getAvailable(addingDay).length === 0 ? (
            <div className="sch-add-empty">추가 가능한 근무자 없음</div>
          ) : (
            getAvailable(addingDay).map((name) => (
              <button
                key={name}
                className="sch-add-option"
                onClick={() => handleAddWorker(addingDay, name)}
              >
                <span
                  className="color-dot"
                  style={{ background: getPersonColor(name), width: 8, height: 8, marginRight: 6 }}
                />
                {name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
