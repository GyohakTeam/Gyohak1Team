import { useState } from "react";
import { canInspect, parseRange, countTrips, getWorkerFloors } from "../../utils";
import { getPersonColor } from "../../schedule";
import Menu from "../Menu";

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
    const t1 = editT1.trim();
    const t2 = editT2.trim();
    if (!t1 && !t2) {
      onRemoveWorker(worker.id);
      showStatus(`${worker.name} 근무시간 없음 — 삭제되었습니다.`, "info");
      return;
    }
    if (!parseRange(t1)) {
      showStatus("첫 번째 근무시간 형식 오류. 예: 08:30-11:30", "err");
      return;
    }
    if (t2 && !parseRange(t2)) {
      showStatus("두 번째 근무시간 형식 오류. 예: 13:30-18:00", "err");
      return;
    }
    const workTimes = t2 ? [t1, t2] : [t1];
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
      ? { backgroundColor: "#e6e7ea", borderLeft: "3px solid #a9adb4" }
      : { backgroundColor: color + "55", borderLeft: `3px solid ${color}` };

  return (
    <tr>
      <td className="num-cell">{worker.number}</td>
      <td>
        <span
          className="worker-name-cell"
          style={nameStyle}
          onClick={() => !isEditing && onSelectWorker(worker.id)}
          title={isSel ? "다시 클릭하면 선택 해제" : "클릭하면 담당 강의실이 색으로 표시됩니다"}
        >
          {worker.name}
        </span>
        {(isAssigned || classrooms.length > 0) && (
          <div className="worker-sub">
            {trips > 0 && (
              <span className={`trip-badge trip-${tripLevel}`}>{tripLabel}</span>
            )}
            {floorLabel && (
              <span className={`trip-badge trip-${floorLevel}`}>{floorLabel}</span>
            )}
            {!isAssigned && classrooms.length > 0 && (
              <span className={`can-note${canCount > 0 ? " has-rooms" : ""}`}>
                {canCount}개 가능
              </span>
            )}
            {isAssigned && (
              <span className="assigned-rooms">{myRooms.join(", ")}</span>
            )}
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
          worker.workTimes.map((t, i) => (
            <span key={i} className="work-time-badge">{t}</span>
          ))
        )}
      </td>
      <td className="assign-cell">
        {isAssigned ? (
          <span className="assign-count">{myRooms.length}개</span>
        ) : (
          <span className="assign-none">—</span>
        )}
      </td>
      <td className="row-menu-cell">
        <Menu
          items={[
            { label: "근무시간 수정", icon: "pencil", onClick: startEdit },
            {
              label: isSel ? "선택 해제" : "담당 강의실 보기",
              icon: isSel ? "x" : "search",
              onClick: () => onSelectWorker(worker.id),
            },
            {
              label: "명단에서 삭제",
              icon: "trash",
              danger: true,
              onClick: () => onRemoveWorker(worker.id),
            },
          ]}
        />
      </td>
    </tr>
  );
}
