import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS,
  getPersonColor,
  isScheduleEmpty,
  renamePerson,
  setPersonColor,
} from "../schedule";
import {
  addSlot,
  formatHours,
  minToTime,
  rangesToWorkTimes,
  removeSlot,
  totalMinutes,
  workTimesToRanges,
} from "../timetable";
import AppHeader, { HeaderMark } from "./AppHeader";
import ContactModal from "./ContactModal";
import Icon from "./Icon";
import { ExcelDropOverlay, useExcelDrop } from "./ExcelDrop";

const SLOT = 30;
const DEFAULT_START = 8 * 60 + 30;
const DEFAULT_END = 22 * 60;

/** 시간표에 들어있는 시간대를 감싸는 30분 슬롯 목록 (기본 08:30~22:00, 데이터가 넘치면 확장) */
function buildTimeSlots(schedule) {
  let min = DEFAULT_START;
  let max = DEFAULT_END;
  for (const day of DAYS) {
    for (const w of schedule[day] || []) {
      for (const [s, e] of workTimesToRanges(w.workTimes)) {
        if (s < min) min = Math.floor(s / SLOT) * SLOT;
        if (e > max) max = Math.ceil(e / SLOT) * SLOT;
      }
    }
  }
  const slots = [];
  for (let m = min; m < max; m += SLOT) slots.push(m);
  return slots;
}

const DAY_HEADER = {
  월: "#1d6fd4",
  화: "#1a9e52",
  수: "#b8860b",
  목: "#d45d0a",
  금: "#c0356e",
};

export default function SchedulePage({
  schedule,
  title,
  rosterCount,
  onScheduleChange,
  onTitleChange,
  onOpenImport,
  onBack,
  onClearAll,
}) {
  const [saved, setSaved] = useState(false);
  const [addingDay, setAddingDay] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [editingName, setEditingName] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [activeSlot, setActiveSlot] = useState(null); // 마지막으로 누른 시간 줄
  const [showContact, setShowContact] = useState(false);
  const dragRef = useRef(null); // { mode: 'add' | 'remove' }

  const empty = isScheduleEmpty(schedule);
  const timeSlots = useMemo(() => buildTimeSlots(schedule), [schedule]);

  // ── 요일별 근무자 + 색 + 미리 계산한 구간
  const dayData = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        workers: (schedule[day] || []).map((w) => ({
          name: w.name,
          workTimes: w.workTimes,
          color: getPersonColor(w.name),
          ranges: workTimesToRanges(w.workTimes),
          minutes: totalMinutes(w.workTimes),
        })),
      })),
    [schedule],
  );

  // ── 전체 명단 (등장 순서 유지) + 주간 합계
  const roster = useMemo(() => {
    const map = new Map();
    for (const day of DAYS) {
      for (const w of schedule[day] || []) {
        const entry = map.get(w.name) ?? { name: w.name, minutes: 0, days: 0 };
        entry.minutes += totalMinutes(w.workTimes);
        entry.days += 1;
        map.set(w.name, entry);
      }
    }
    return [...map.values()];
  }, [schedule]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  // ── 화면 아무 곳에나 엑셀을 떨어뜨리면 불러오기
  const { dragging, dropProps } = useExcelDrop(
    (file) => onOpenImport(file),
    (file) =>
      flash(`"${file.name}" 은 엑셀 파일이 아닙니다. .xlsx 파일을 올려주세요.`),
  );

  // ───────────────────────────────────────────────
  // 셀 드래그 편집
  // ───────────────────────────────────────────────
  useEffect(() => {
    function onMouseUp() {
      dragRef.current = null;
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  function applySlot(day, workerIdx, slotMin, mode) {
    const dayWorkers = schedule[day] || [];
    if (workerIdx >= dayWorkers.length) return;
    const workers = dayWorkers.map((w) => ({ ...w, workTimes: [...w.workTimes] }));
    const worker = workers[workerIdx];
    const ranges = workTimesToRanges(worker.workTimes);
    const nextRanges =
      mode === "remove"
        ? removeSlot(ranges, slotMin, SLOT)
        : addSlot(ranges, slotMin, SLOT);
    worker.workTimes = rangesToWorkTimes(nextRanges);
    onScheduleChange({
      ...schedule,
      [day]:
        worker.workTimes.length === 0
          ? workers.filter((_, i) => i !== workerIdx) // 시간 0개 -> 근무자 삭제
          : workers,
    });
    setSaved(false);
  }

  function handleCellMouseDown(day, workerIdx, slotMin, e) {
    e.preventDefault();
    // 왼쪽 버튼 = 배정, 오른쪽 버튼 = 취소
    const mode = e.button === 2 ? "remove" : "add";
    dragRef.current = { mode };
    setActiveSlot(slotMin);
    applySlot(day, workerIdx, slotMin, mode);
  }

  function handleCellMouseEnter(day, workerIdx, slotMin) {
    if (!dragRef.current) return;
    setActiveSlot(slotMin);
    applySlot(day, workerIdx, slotMin, dragRef.current.mode);
  }

  // ───────────────────────────────────────────────
  // 근무자 추가 드롭다운
  // ───────────────────────────────────────────────
  function getAvailable(day) {
    const existing = new Set((schedule[day] || []).map((w) => w.name));
    return roster.map((r) => r.name).filter((n) => !existing.has(n));
  }

  function handleAddBtnClick(day, e) {
    e.stopPropagation();
    if (addingDay === day) {
      setAddingDay(null);
      return;
    }
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
      if (found?.workTimes?.length) {
        workTimes = [...found.workTimes];
        break;
      }
    }
    onScheduleChange({
      ...schedule,
      [day]: [...(schedule[day] || []), { name, workTimes }],
    });
    setAddingDay(null);
    setSaved(false);
  }

  useEffect(() => {
    if (!addingDay) return;
    function onDown(e) {
      if (
        !e.target.closest(".sch-add-dropdown") &&
        !e.target.closest(".sch-add-btn")
      )
        setAddingDay(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addingDay]);

  // ───────────────────────────────────────────────
  // 명단 편집 (이름 변경 / 색 변경 / 삭제)
  // ───────────────────────────────────────────────
  function commitRename(from) {
    const to = nameDraft.trim().replace(/\s+/g, " ");
    setEditingName(null);
    if (!to || to === from) return;
    if (roster.some((r) => r.name === to)) {
      flash(`"${to}" 은 이미 명단에 있습니다.`);
      return;
    }
    renamePerson(from, to);
    const next = {};
    for (const day of DAYS) {
      next[day] = (schedule[day] || []).map((w) =>
        w.name === from ? { ...w, name: to } : w,
      );
    }
    onScheduleChange(next);
    setSaved(false);
  }

  function removeFromAllDays(name) {
    if (!window.confirm(`"${name}" 을 모든 요일에서 삭제할까요?`)) return;
    const next = {};
    for (const day of DAYS) {
      next[day] = (schedule[day] || []).filter((w) => w.name !== name);
    }
    onScheduleChange(next);
    setSaved(false);
  }

  function handleColorChange(name, color) {
    setPersonColor(name, color);
    // 색은 schedule 밖(로스터)에 있으므로, 같은 객체를 다시 넣어 다시 그리게 한다
    onScheduleChange({ ...schedule });
  }

  // ───────────────────────────────────────────────
  // 저장 / 초기화
  // ───────────────────────────────────────────────
  function handleSave() {
    // 변경은 이미 자동 저장되지만, 저장됐다는 확인을 보여준다
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearAll() {
    if (
      window.confirm(
        "시간표를 완전히 비울까요?\n근무자 명단과 근무시간, 색이 모두 사라집니다.",
      )
    ) {
      onClearAll();
    }
  }

  const totalMin = roster.reduce((sum, r) => sum + r.minutes, 0);

  return (
    <div className="sch-page" {...dropProps}>
      {/* ===== 상단 헤더 ===== */}
      <AppHeader
        left={
          <>
            <button className="hdr-btn hdr-btn-back" onClick={onBack}>
              <Icon name="chevron-left" size={15} />
              배정 화면
            </button>
            <HeaderMark />
          </>
        }
        title={
          editingTitle ? (
            <input
              className="hdr-title-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                onTitleChange(titleDraft.trim());
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitleDraft(title);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button
              className="hdr-title hdr-title-edit"
              title="클릭해서 제목 수정"
              onClick={() => {
                setTitleDraft(title);
                setEditingTitle(true);
              }}
            >
              {title || "근로시간표"}
              <span className="hdr-pencil">
                <Icon name="pencil" size={13} />
              </span>
            </button>
          )
        }
        subtitle={
          empty ? (
            <span className="hdr-sub-warn">
              <Icon name="alert" size={13} />
              시간표 없음 — 엑셀 파일을 끌어다 놓으세요
            </span>
          ) : (
            <>
              {`근무자 ${rosterCount ?? roster.length}명`}
              <span className="hdr-dot">·</span>
              {`${minToTime(timeSlots[0])}~${minToTime(
                timeSlots[timeSlots.length - 1] + SLOT,
              )}`}
              <span className="hdr-dot">·</span>
              {`주 ${formatHours(totalMin)}`}
            </>
          )
        }
        actions={
          <>
            <button
              className="hdr-btn hdr-btn-primary"
              onClick={() => onOpenImport()}
            >
              <Icon name="download" size={15} />
              엑셀 불러오기
            </button>
            {!empty && (
              <>
                <button
                  className={`hdr-btn hdr-btn-save${saved ? " hdr-btn-saved" : ""}`}
                  onClick={handleSave}
                >
                  <Icon name={saved ? "check" : "save"} size={15} />
                  {saved ? "저장됨" : "저장"}
                </button>
                <button
                  className="hdr-btn hdr-btn-icon hdr-btn-danger"
                  onClick={handleClearAll}
                  title="시간표 전체 삭제"
                >
                  <Icon name="trash" size={16} />
                </button>
              </>
            )}
            <button
              className="hdr-btn hdr-btn-primary"
              onClick={() => setShowContact(true)}
            >
              <Icon name="phone" size={15} />
              문의
            </button>
          </>
        }
      />

      {notice && <div className="sch-notice">{notice}</div>}

      {/* ===== 본문 ===== */}
      {empty ? (
        <div className="sch-empty-wrap">
          <div className="sch-empty-card">
            <div className="sch-empty-icon">
              <Icon name="table" size={30} strokeWidth={1.5} />
            </div>
            <h2 className="sch-empty-title">시간표가 비어 있습니다</h2>
            <p className="sch-empty-desc">
              근로시간표 엑셀 파일(.xlsx)을 <strong>이 화면에 끌어다 놓으면</strong>{" "}
              근무자 명단과 근무시간, 색이 한 번에 채워집니다.
            </p>
            <button className="btn btn-primary" onClick={() => onOpenImport()}>
              <Icon name="download" size={15} />
              엑셀 불러오기
            </button>
            <div className="sch-empty-format">
              <div className="sch-empty-format-label">이런 형태를 읽습니다</div>
              <table className="sch-sample">
                <tbody>
                  <tr>
                    <td className="sch-sample-title" colSpan={5}>
                      2026학년도 2학기 근로시간표
                    </td>
                  </tr>
                  <tr className="sch-sample-head">
                    <td>시간</td>
                    <td colSpan={2}>월</td>
                    <td colSpan={2}>화</td>
                  </tr>
                  <tr>
                    <td className="sch-sample-time">08:30~09:00</td>
                    <td>예인</td>
                    <td>동균</td>
                    <td>선우</td>
                    <td>준호</td>
                  </tr>
                  <tr>
                    <td className="sch-sample-time">09:00~09:30</td>
                    <td>예인</td>
                    <td>동균</td>
                    <td>선우</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="sch-empty-format-note">
                요일 칸에 이름만 적혀 있으면 됩니다. 같은 칸을 여러 사람이
                번갈아 써도, 시간이 30분·1시간 단위여도 알아서 읽습니다.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ===== 근무자 명단 스트립 ===== */}
          <div className="sch-roster">
            <div className="sch-roster-label">명단</div>
            <div className="sch-roster-chips">
              {roster.map((r) => (
                <div key={r.name} className="sch-chip">
                  <label
                    className="sch-chip-color"
                    style={{ background: getPersonColor(r.name) }}
                    title="색 변경"
                  >
                    <input
                      type="color"
                      value={toHex(getPersonColor(r.name))}
                      onChange={(e) => handleColorChange(r.name, e.target.value)}
                    />
                  </label>
                  {editingName === r.name ? (
                    <input
                      className="sch-chip-input"
                      value={nameDraft}
                      autoFocus
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => commitRename(r.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingName(null);
                      }}
                    />
                  ) : (
                    <button
                      className="sch-chip-name"
                      title="클릭해서 이름 수정"
                      onClick={() => {
                        setNameDraft(r.name);
                        setEditingName(r.name);
                      }}
                    >
                      {r.name}
                    </button>
                  )}
                  <span className="sch-chip-meta">
                    {r.days}일 · {formatHours(r.minutes)}
                  </span>
                  <button
                    className="sch-chip-del"
                    title="모든 요일에서 삭제"
                    onClick={() => removeFromAllDays(r.name)}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="sch-hint">
            <span className="sch-hint-key">
              <span className="sch-hint-btn sch-hint-btn-left" />
              왼클릭 = <strong>배정</strong>
            </span>
            <span className="sch-hint-key">
              <span className="sch-hint-btn sch-hint-btn-right" />
              우클릭 = <strong>취소</strong>
            </span>
            <span className="sch-hint-sep">·</span>
            누른 채로 드래그하면 여러 칸이 한 번에 바뀌고, 시간이 모두 없어지면 그
            요일에서 빠집니다.
          </div>

          {/* ===== 시간표 ===== */}
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
                      colSpan={Math.max(1, workers.length)}
                      className="sch-th sch-day-th"
                      style={{ backgroundColor: DAY_HEADER[day] }}
                    >
                      <div className="sch-day-th-inner">
                        <span className="sch-day-name">{day}</span>
                        <span className="sch-day-count">{workers.length}명</span>
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
                    workers.length === 0 ? (
                      <th
                        key={day + "-none"}
                        className="sch-th sch-name-th sch-name-th-empty sch-day-edge"
                      >
                        —
                      </th>
                    ) : (
                      workers.map((w, i) => (
                        <th
                          key={day + w.name}
                          className={`sch-th sch-name-th${i === 0 ? " sch-day-edge" : ""}`}
                          style={{ backgroundColor: w.color }}
                          title={`${w.name} · ${w.workTimes.join(", ")}`}
                        >
                          {w.name}
                        </th>
                      ))
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {timeSlots.map((slotMin) => {
                  const onHour = slotMin % 60 === 0;
                  return (
                    <tr
                      key={slotMin}
                      className={`sch-row${onHour ? " sch-row-hour" : ""}`}
                    >
                      <td
                        className={`sch-time-td${slotMin === activeSlot ? " sch-time-td-active" : ""}`}
                        onMouseDown={() => setActiveSlot(slotMin)}
                      >
                        {minToTime(slotMin)}
                        <span className="sch-time-end">
                          ~{minToTime(slotMin + SLOT)}
                        </span>
                      </td>
                      {dayData.map(({ day, workers }) =>
                        workers.length === 0 ? (
                          <td
                            key={day + "-none"}
                            className="sch-cell sch-cell-void sch-day-edge"
                          />
                        ) : (
                          workers.map((w, i) => {
                            const r = w.ranges.find(
                              ([s, e]) => s < slotMin + SLOT && e > slotMin,
                            );
                            const working = !!r;
                            const isStart = working && r[0] >= slotMin;
                            const isEnd = working && r[1] <= slotMin + SLOT;
                            return (
                              <td
                                key={day + w.name}
                                className={[
                                  "sch-cell",
                                  working ? "sch-cell-on" : "sch-cell-off",
                                  isStart ? "sch-cell-start" : "",
                                  isEnd ? "sch-cell-end" : "",
                                  i === 0 ? "sch-day-edge" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={
                                  working ? { backgroundColor: w.color } : undefined
                                }
                                onMouseDown={(e) =>
                                  handleCellMouseDown(day, i, slotMin, e)
                                }
                                onMouseEnter={() =>
                                  handleCellMouseEnter(day, i, slotMin)
                                }
                                onContextMenu={(e) => e.preventDefault()}
                                /* 이름이 보이는 구간 첫 칸에만 툴팁 — 1000칸 전부에
                                   달면 문자열 생성과 네이티브 툴팁이 드래그를 방해한다 */
                                title={
                                  isStart
                                    ? `${w.name} ${minToTime(r[0])}~${minToTime(r[1])}`
                                    : undefined
                                }
                              >
                                {isStart ? w.name : ""}
                              </td>
                            );
                          })
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td className="sch-time-td sch-foot-label">합계</td>
                  {dayData.map(({ day, workers }) =>
                    workers.length === 0 ? (
                      <td key={day + "-none"} className="sch-foot-td sch-day-edge" />
                    ) : (
                      workers.map((w, i) => (
                        <td
                          key={day + w.name}
                          className={`sch-foot-td${i === 0 ? " sch-day-edge" : ""}`}
                          title={`${w.name} ${day}요일 ${formatHours(w.minutes)}`}
                        >
                          {formatHours(w.minutes)}
                        </td>
                      ))
                    ),
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      <ExcelDropOverlay show={dragging} />

      {/* ===== 근무자 추가 드롭다운 ===== */}
      {addingDay && dropdownPos && (
        <div
          className="sch-add-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
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
                  style={{
                    background: getPersonColor(name),
                    width: 8,
                    height: 8,
                    marginRight: 6,
                  }}
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

/** <input type="color"> 는 #rrggbb 만 받으므로 hsl() 색은 근사 hex로 바꿔준다 */
function toHex(color) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const m = /^hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)$/.exec(color);
  if (!m) return "#bbbbbb";
  const h = Number(m[1]) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
