import { useRef, useState } from "react";
import { canInspect, parseRange } from "./utils";
import { getPersonColor } from "./schedule";

const STATUS_BORDER = {
  ok: "#2e7d32",
  err: "#b71c1c",
  warn: "#888",
  info: "#333",
};

export default function ClassroomPanel({
  classrooms,
  workers,
  selectedWorkerId,
  manualMode,
  onToggleManualMode,
  mode,
  status,
  events,
  onImport,
  onClear,
  onSwitchToPaste,
  onInspectorClick,
  onAutoAssign,
  onReAssign,
  onUpdateClassroom,
  onAddEvent,
  onRemoveEvent,
  isAssigning,
}) {
  const textareaRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editSlots, setEditSlots] = useState(["", "", ""]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtRoom, setEvtRoom] = useState("");
  const [evtTime, setEvtTime] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyTable = () => {
    const names = classrooms.map((c) => {
      const inspector = workers.find((w) => w.id === c.inspectorId);
      return inspector ? inspector.name : "";
    });
    // HWP는 HTML <table> 형식을 인식해 셀별로 붙여넣기
    const htmlRows = names.map((n) => `<tr><td>${n}</td></tr>`).join("");
    const html = `<html><body><table>${htmlRows}</table></body></html>`;
    const plain = names.join("\n");
    navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ])
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  const handlePaste = () => {
    setTimeout(() => {
      if (textareaRef.current) onImport(textareaRef.current.value);
    }, 50);
  };

  const handleClear = () => {
    if (textareaRef.current) textareaRef.current.value = "";
    onClear();
  };

  const startEdit = (c) => {
    const slots = [...c.timeSlots];
    while (slots.length < 3) slots.push("");
    setEditSlots(slots);
    setEditingId(c.id);
  };

  const saveEdit = (id) => {
    const cleaned = editSlots.map((s) => s.trim()).filter(Boolean);
    onUpdateClassroom(id, cleaned);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleAddEvent = () => {
    if (!evtRoom.trim()) return;
    if (!parseRange(evtTime)) return;
    onAddEvent(evtRoom.trim(), evtTime.trim());
    setEvtRoom("");
    setEvtTime("");
  };

  const selWorker = workers.find((w) => w.id === selectedWorkerId);
  const selColor = selWorker ? getPersonColor(selWorker.name) : null;

  const rowClass = (classroom) => {
    if (!selWorker) return "classroom-row";
    return classroom.inspectorId === selectedWorkerId
      ? "classroom-row sel-highlight"
      : "classroom-row sel-dimmed";
  };

  // CSS 변수로 전달 → .sel-highlight td에서 !important로 전체 행 칠함
  const rowStyle = (classroom) => {
    if (selWorker && classroom.inspectorId === selectedWorkerId) {
      return { "--sel-color": selColor + "88" };
    }
    return {};
  };

  return (
    <div className="left-panel">
      {/* ===== PASTE MODE ===== */}
      {mode === "paste" && (
        <div className="mode-wrap">
          <div className="panel-title">강의실 점검 시간표</div>
          <div className="paste-content">
            <div className="paste-hint">
              HWP·메모장 등에서 복사 후 아래에 <strong>붙여넣기(Ctrl+V)</strong>{" "}
              하면 자동으로 표가 채워집니다.
              <br />
              세로형: 강의실명 한 줄 → 시간대 한 줄씩 &nbsp;|&nbsp; 가로형: 탭
              또는 <code>|</code> 구분
            </div>
            <textarea
              ref={textareaRef}
              className="paste-area"
              onPaste={handlePaste}
              placeholder={
                "예시 (세로형):\n201호\n09:00-12:00\n14:00-18:00\n202호\n10:00-13:00\n\n예시 (가로형):\n201호\t09:00-12:00\t14:00-18:00"
              }
            />
            {status.text && (
              <div
                className="status-bar"
                style={{ borderLeftColor: STATUS_BORDER[status.type] }}
              >
                {status.text}
              </div>
            )}
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={() =>
                  textareaRef.current && onImport(textareaRef.current.value)
                }
              >
                가져오기
              </button>
              <button className="btn btn-secondary" onClick={handleClear}>
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TABLE MODE ===== */}
      {mode === "table" && (
        <div className="mode-wrap" style={{ position: "relative" }}>
          <div className="panel-title">
            강의실 점검 시간표
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className={`reload-btn${manualMode ? " manual-active" : ""}`}
                onClick={onToggleManualMode}
              >
                ✏ {manualMode ? "수동 모드 ON" : "수동 모드"}
              </button>
              {classrooms.length > 0 && (
                <button className="reload-btn" onClick={handleCopyTable}>
                  {copied ? "✔ 복사됨" : "📋 표 복사"}
                </button>
              )}
              {workers.length > 0 && (
                <button className="reload-btn" onClick={onAutoAssign} disabled={isAssigning}>
                  {isAssigning ? "⏳ 배정 중..." : "⚡ 자동 배정"}
                </button>
              )}
              {classrooms.some((c) => c.inspectorId) && (
                <button className="reload-btn" onClick={onReAssign} disabled={isAssigning}>
                  🔀 다시 배정
                </button>
              )}
              <button
                className="reload-btn"
                onClick={() => setShowEventForm((v) => !v)}
              >
                {showEventForm ? "✕ 닫기" : "+ 행사추가"}
              </button>
              <button className="reload-btn" onClick={onSwitchToPaste}>
                ↩ 다시 불러오기
              </button>
            </div>
          </div>

          {/* ===== EVENT FORM ===== */}
          {showEventForm && (
            <div className="event-panel">
              <div className="event-form-row">
                <input
                  className="form-input"
                  style={{ flex: "0 0 90px" }}
                  placeholder="강의실 (예: 201호)"
                  value={evtRoom}
                  onChange={(e) => setEvtRoom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="행사 시간 (예: 10:00-12:00)"
                  value={evtTime}
                  onChange={(e) => setEvtTime(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddEvent}
                >
                  추가
                </button>
              </div>
              {events.length > 0 && (
                <div className="event-tags">
                  {events.map((ev) => (
                    <span key={ev.id} className="event-tag">
                      {ev.room} {ev.time}
                      <button onClick={() => onRemoveEvent(ev.id)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isAssigning && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "rgba(255,255,255,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 600, color: "#555",
              borderRadius: 6,
            }}>
              ⏳ 배정 계산 중...
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 76 }}>강의실</th>
                  <th>점검 가능 시간</th>
                  <th style={{ width: 100 }}>점검자</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="empty-state">
                      데이터를 붙여넣기 하세요
                    </td>
                  </tr>
                ) : (
                  classrooms.map((c) => {
                    const inspector = workers.find(
                      (w) => w.id === c.inspectorId,
                    );
                    const assignable = selWorker
                      ? canInspect(selWorker, c)
                      : false;
                    const isEditing = editingId === c.id;
                    const roomEvents = events.filter(
                      (ev) => ev.room === c.room,
                    );

                    const inspClass = [
                      "inspector-cell",
                      inspector ? "assigned" : "",
                      manualMode && selectedWorkerId && assignable ? "can-assign" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const title = manualMode
                      ? selectedWorkerId
                        ? assignable
                          ? "클릭하여 배정"
                          : "근무시간 불일치"
                        : inspector
                          ? `${inspector.name} — 클릭 시 선택`
                          : "근로자를 먼저 선택하세요"
                      : inspector
                        ? inspector.name
                        : "";

                    return (
                      <tr
                        key={c.id}
                        className={rowClass(c)}
                        style={rowStyle(c)}
                      >
                        <td>
                          <strong>{c.room}</strong>
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="time-edit">
                              {editSlots.map((slot, i) => (
                                <input
                                  key={i}
                                  className="time-edit-input"
                                  value={slot}
                                  onChange={(e) => {
                                    const next = [...editSlots];
                                    next[i] = e.target.value;
                                    setEditSlots(next);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(c.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  placeholder={`시간 ${i + 1} (예: 09:00-12:00)`}
                                  autoFocus={i === 0}
                                />
                              ))}
                              <div className="time-edit-btns">
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => saveEdit(c.id)}
                                >
                                  저장
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelEdit}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="time-chips">
                              {c.timeSlots.length > 0 ? (
                                c.timeSlots.map((t, i) => (
                                  <span key={i} className="time-chip">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="no-time">없음</span>
                              )}
                              <button
                                className="edit-slot-btn"
                                onClick={() => startEdit(c)}
                                title="시간 수정"
                              >
                                ✏
                              </button>
                              {roomEvents.map((ev) => (
                                <span
                                  key={ev.id}
                                  className="event-chip"
                                  title="행사로 인한 점검 불가 시간"
                                >
                                  🚫 {ev.time}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td
                          className={inspClass}
                          onClick={() => manualMode && !isEditing && onInspectorClick(c.id)}
                          title={title}
                          style={
                            inspector
                              ? { backgroundColor: getPersonColor(inspector.name) }
                              : {}
                          }
                        >
                          {inspector ? (
                            <div
                              className="inspector-name"
                              style={
                                inspector.id === selectedWorkerId
                                  ? { color: "#111", fontWeight: "bold", fontSize: 14 }
                                  : { color: "#111" }
                              }
                            >
                              {inspector.name}
                            </div>
                          ) : (
                            <span className="unassigned-label">미배정</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
