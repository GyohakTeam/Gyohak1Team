import { useState } from "react";
import { canInspect } from "../../utils";
import { getPersonColor } from "../../schedule";
import Icon from "../Icon";
import Menu from "../Menu";

export default function ClassroomRow({
  classroom,
  workers,
  selectedWorkerId,
  selWorker,
  events,
  onInspectorClick,
  onUpdateClassroom,
  onUnassign,
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
    selectedWorkerId && assignable ? "can-assign" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // 수동 모드 토글 없이 언제나 클릭으로 배정할 수 있다
  const title = selectedWorkerId
    ? assignable
      ? "클릭하여 배정"
      : "근무시간 불일치"
    : inspector
      ? `${inspector.name} — 클릭 시 선택`
      : "명단에서 근무자를 먼저 선택하세요";

  return (
    <tr className={rowClass()} style={rowStyle()}>
      <td className="room-cell">{classroom.room}</td>
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
              <span className="no-time">점검 가능 시간 없음</span>
            )}
            {roomEvents.map((ev) => (
              <span key={ev.id} className="event-chip" title="행사로 인한 점검 불가 시간">
                <Icon name="ban" size={12} />
                {ev.time}
              </span>
            ))}
            <button
              className="chip-btn"
              onClick={() => onOpenEventModal(classroom.room)}
              title="행사 시간 추가 — 그 시간은 점검에서 제외됩니다"
            >
              <Icon name="calendar-plus" size={13} />
              행사 추가
            </button>
          </div>
        )}
      </td>
      <td
        className={inspClass}
        onClick={() => !isEditing && onInspectorClick(classroom.id)}
        title={title}
        style={inspector ? { backgroundColor: getPersonColor(inspector.name) } : {}}
      >
        {inspector ? (
          <div
            className={`inspector-name${inspector.id === selectedWorkerId ? " is-selected" : ""}`}
          >
            <Icon name="user" size={13} />
            {inspector.name}
          </div>
        ) : (
          <span className="unassigned-label">
            <Icon name="user" size={13} />
            미배정
          </span>
        )}
      </td>
      <td className="row-menu-cell">
        <Menu
          items={[
            { label: "점검 시간 수정", icon: "pencil", onClick: startEdit },
            {
              label: "행사 추가",
              icon: "calendar-plus",
              onClick: () => onOpenEventModal(classroom.room),
            },
            inspector && {
              label: "배정 해제",
              icon: "x",
              danger: true,
              onClick: () => onUnassign(classroom.id),
            },
          ]}
        />
      </td>
    </tr>
  );
}
