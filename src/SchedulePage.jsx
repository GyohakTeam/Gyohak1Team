import { useMemo, useState } from "react";
import { DAYS, getPersonColor } from "./schedule";
import { toMin } from "./utils";

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
  const s = slotMin, e = slotMin + 30;
  const next = [...ranges, [s, e]].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of next) {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    } else {
      merged.push([...r]);
    }
  }
  return merged;
}

function removeSlot(ranges, slotMin) {
  const s = slotMin, e = slotMin + 30;
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

export default function SchedulePage({ schedule, onScheduleChange, onBack }) {
  const [saved, setSaved] = useState(false);

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
    [schedule]
  );

  function handleCellClick(day, workerIdx, slotMin, working) {
    const newSchedule = { ...schedule };
    const workers = newSchedule[day].map((w) => ({ ...w, workTimes: [...w.workTimes] }));
    const worker = workers[workerIdx];
    const ranges = workTimesToRanges(worker.workTimes);
    const newRanges = working ? removeSlot(ranges, slotMin) : addSlot(ranges, slotMin);
    worker.workTimes = rangesToWorkTimes(newRanges);
    newSchedule[day] = workers;
    onScheduleChange(newSchedule);
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem("gyohak-schedule", JSON.stringify(schedule));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
                  {day}
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
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slotMin) => (
              <tr key={slotMin} className="sch-row">
                <td className="sch-time-td">
                  {minToTime(slotMin)}~{minToTime(slotMin + 30)}
                </td>
                {dayData.map(({ day, workers }) =>
                  workers.map((w, i) => {
                    const ranges = workTimesToRanges(w.workTimes);
                    const working = ranges.some(
                      ([s, e]) => s < slotMin + 30 && e > slotMin
                    );
                    return (
                      <td
                        key={day + w.name + i}
                        className={`sch-cell ${working ? "sch-cell-on" : "sch-cell-off"}`}
                        style={{
                          backgroundColor: working ? w.color : "#f5f5f5",
                          borderLeft:
                            i === 0 ? "3px solid #888" : "1px solid #ddd",
                          cursor: "pointer",
                          color: working ? "#111" : "transparent",
                        }}
                        onClick={() => handleCellClick(day, i, slotMin, working)}
                        title={
                          working
                            ? `${w.name} ${minToTime(slotMin)}~${minToTime(slotMin + 30)} 제거`
                            : `${w.name} ${minToTime(slotMin)}~${minToTime(slotMin + 30)} 추가`
                        }
                      >
                        {w.name}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
