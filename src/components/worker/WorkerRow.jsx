import { useState } from "react";
import { canInspect, parseRange, countTrips, getWorkerFloors } from "../../utils";
import { getPersonColor } from "../../schedule";

export default function WorkerRow({
  worker,
  classrooms,
  selectedWorkerId,
  onSelectWorker,
  onRemoveWorker,
  onUpdateWorker,
  showStatus,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editT1, setEditT1] = useState("");
  const [editT2, setEditT2] = useState("");

  const startEdit = () => {
    setEditT1(worker.workTimes[0] || "");
    setEditT2(worker.workTimes[1] || "");
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!parseRange(editT1)) {
      showStatus("근무시간 ① 형식 오류. 예: 08:30-11:30", "err");
      return;
    }
    if (editT2.trim() && !parseRange(editT2)) {
      showStatus("근무시간 ② 형식 오류. 예: 13:30-18:00", "err");
      return;
    }
    const workTimes = editT2.trim()
      ? [editT1.trim(), editT2.trim()]
      : [editT1.trim()];
    onUpdateWorker(worker.id, workTimes);
    setIsEditing(false);
    showStatus("근무시간이 수정되었습니다.", "ok");
  };

  const cancelEdit = () => setIsEditing(false);

  const isSel = worker.id === selectedWorkerId;
  const color = getPersonColor(worker.name);
  const canCount = classrooms.filter((c) => canInspect(worker, c)).length;
  const myRooms = classrooms.filter((c) => c.inspectorId === worker.id).map((c) => c.room);
  const isAssigned = myRooms.length > 0;
  const trips = countTrips(classrooms, worker.id, [worker]);
  const floors = [...getWorkerFloors(classrooms, worker.id)].sort();

  const tripLevel = trips === 1 ? "ok" : trips === 2 ? "warn" : "err";
  const tripLabel = trips === 1 ? "1회 이동" : `${trips}회 이동`;

  const floorLevel = floors.length <= 1 ? "ok" : floors.length <= 3 ? "warn" : "err";
  const floorLabel = floors.length > 0 ? floors.map((f) => `${f}층`).join("·") : null;

  const nameStyle = isSel
    ? { backgroundColor: color + "44", borderLeft: `3px solid ${color}` }
    : isAssigned
      ? { backgroundColor: "#d0d0d0", borderLeft: "3px solid #999" }
      : { backgroundColor: color + "55", borderLeft: `3px solid ${color}` };

  return (
    <tr>
      <td className="num-cell">{worker.number}</td>
      <td>
        <span
          className="worker-name-cell"
          style={nameStyle}
          onClick={() => !isEditing && onSelectWorker(worker.id)}
        >
          {worker.name}
        </span>
        {trips > 0 && (
          <span className={`trip-badge trip-${tripLevel}`}>{tripLabel}</span>
        )}
        {floorLabel && (
          <span className={`trip-badge trip-${floorLevel}`}>{floorLabel}</span>
        )}
        {classrooms.length > 0 && (
          <span className={`can-note${canCount > 0 ? " has-rooms" : ""}`}>
            ({canCount}개 가능)
          </span>
        )}
        {myRooms.length > 0 && (
          <div className="assigned-rooms">
            <span className="room-count-badge">{myRooms.length}개 담당</span>
            {myRooms.join(", ")}
          </div>
        )}
      </td>
      <td>
        {isEditing ? (
          <div className="time-edit">
            <input
              className="time-edit-input"
              value={editT1}
              onChange={(e) => setEditT1(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
              placeholder="08:30-11:30"
              autoFocus
            />
            <input
              className="time-edit-input"
              value={editT2}
              onChange={(e) => setEditT2(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="13:30-18:00 (선택)"
            />
            <div className="time-edit-btns">
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>저장</button>
              <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>취소</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              {worker.workTimes.map((t, i) => (
                <span key={i} className="work-time-badge">{t}</span>
              ))}
            </div>
            <button className="edit-slot-btn" onClick={startEdit} title="근무시간 수정">
              ✏
            </button>
          </div>
        )}
      </td>
      <td className="del-cell">
        <button className="btn btn-danger btn-sm" onClick={() => onRemoveWorker(worker.id)}>
          ✕
        </button>
      </td>
    </tr>
  );
}
