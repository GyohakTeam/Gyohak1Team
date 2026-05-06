import { useState } from "react";
import { canInspect } from "../../utils";
import { getPersonColor } from "../../schedule";

export default function ClassroomRow({
  classroom,
  workers,
  selectedWorkerId,
  selWorker,
  manualMode,
  events,
  onInspectorClick,
  onUpdateClassroom,
  onOpenEventModal,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSlots, setEditSlots] = useState(["", "", ""]);

  const startEdit = () => {
    const slots = [...classroom.timeSlots];
    while (slots.length < 3) slots.push("");
    setEditSlots(slots);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const cleaned = editSlots.map((s) => s.trim()).filter(Boolean);
    onUpdateClassroom(classroom.id, cleaned);
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  const inspector = workers.find((w) => w.id === classroom.inspectorId);
  const assignable = selWorker ? canInspect(selWorker, classroom) : false;
  const roomEvents = events.filter((ev) => ev.room === classroom.room);

  const rowClass = () => {
    if (!selWorker) return "classroom-row";
    return classroom.inspectorId === selectedWorkerId
      ? "classroom-row sel-highlight"
      : "classroom-row sel-dimmed";
  };

  const rowStyle = () => {
    if (selWorker && classroom.inspectorId === selectedWorkerId) {
      return { "--sel-color": getPersonColor(selWorker.name) + "88" };
    }
    return {};
  };

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
    <tr className={rowClass()} style={rowStyle()}>
      <td>
        <strong>{classroom.room}</strong>
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
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                placeholder={`시간 ${i + 1} (예: 09:00-12:00)`}
                autoFocus={i === 0}
              />
            ))}
            <div className="time-edit-btns">
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                저장
              </button>
              <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="time-chips">
            {classroom.timeSlots.length > 0 ? (
              classroom.timeSlots.map((t, i) => (
                <span key={i} className="time-chip">{t}</span>
              ))
            ) : (
              <span className="no-time">없음</span>
            )}
            <button className="edit-slot-btn" onClick={startEdit} title="시간 수정">
              ✏
            </button>
            <button
              className="edit-slot-btn event-add-btn"
              onClick={() => onOpenEventModal(classroom.room)}
              title="행사 추가"
            >
              행사추가
            </button>
            {roomEvents.map((ev) => (
              <span key={ev.id} className="event-chip" title="행사로 인한 점검 불가 시간">
                🚫 {ev.time}
              </span>
            ))}
          </div>
        )}
      </td>
      <td
        className={inspClass}
        onClick={() => manualMode && !isEditing && onInspectorClick(classroom.id)}
        title={title}
        style={inspector ? { backgroundColor: getPersonColor(inspector.name) } : {}}
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
}
