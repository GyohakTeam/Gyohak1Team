import { useState } from "react";
import { canInspect, parseRange, countTrips, getWorkerFloors } from "./utils";
import { DAYS, getPersonColor } from "./schedule";

export default function WorkerPanel({
  workers,
  classrooms,
  selectedWorkerId,
  selectedDay,
  onAddWorker,
  onRemoveWorker,
  onSelectWorker,
  onHoverWorker,
  onLoadDay,
  onUpdateWorker,
  showStatus,
}) {
  const [name, setName] = useState("");
  const [time1, setTime1] = useState("");
  const [time2, setTime2] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editT1, setEditT1] = useState("");
  const [editT2, setEditT2] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      showStatus("이름을 입력하세요.", "warn");
      return;
    }
    if (!time1.trim()) {
      showStatus("근무시간 ①을 입력하세요.", "warn");
      return;
    }
    if (!parseRange(time1)) {
      showStatus("근무시간 ① 형식 오류. 예: 08:30-11:30", "err");
      return;
    }
    if (time2 && !parseRange(time2)) {
      showStatus("근무시간 ② 형식 오류. 예: 13:30-18:00", "err");
      return;
    }
    onAddWorker(name.trim(), time1.trim(), time2.trim() || null);
    setName("");
    setTime1("");
    setTime2("");
    showStatus("", "");
  };

  const handleKey = (e, nextId) => {
    if (e.key !== "Enter") return;
    if (nextId) document.getElementById(nextId)?.focus();
    else handleAdd();
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setEditT1(w.workTimes[0] || "");
    setEditT2(w.workTimes[1] || "");
  };

  const saveEdit = (id) => {
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
    onUpdateWorker(id, workTimes);
    setEditingId(null);
    showStatus("근무시간이 수정되었습니다.", "ok");
  };

  const cancelEdit = () => setEditingId(null);

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const assignableRooms = classrooms.filter(
    (c) => c.timeSlots.length > 0,
  ).length;

  return (
    <div className="right-col">
      <div className="worker-panel">
        <div className="panel-title">출근자 명단</div>

        {/* ===== DAY SELECTOR ===== */}
        <div className="day-selector">
          {DAYS.map((day) => (
            <button
              key={day}
              className={`day-btn${selectedDay === day ? " active" : ""}`}
              onClick={() => onLoadDay(day)}
            >
              {day}
            </button>
          ))}
        </div>

        {/* ===== FORM ===== */}
        <div className="worker-form">
          <div className="form-row">
            <span className="form-label">이름</span>
            <input
              id="wName"
              className="form-input"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => handleKey(e, "wTime1")}
            />
          </div>
          <div className="form-row">
            <span className="form-label">근무시간 ①</span>
            <input
              id="wTime1"
              className="form-input"
              type="text"
              placeholder="08:30-11:30"
              value={time1}
              onChange={(e) => setTime1(e.target.value)}
              onKeyDown={(e) => handleKey(e, "wTime2")}
            />
          </div>
          <div className="form-row">
            <span className="form-label">근무시간 ②</span>
            <input
              id="wTime2"
              className="form-input"
              type="text"
              placeholder="13:30-18:00 (선택)"
              value={time2}
              onChange={(e) => setTime2(e.target.value)}
              onKeyDown={(e) => handleKey(e, null)}
            />
          </div>
          <button className="btn btn-primary btn-add" onClick={handleAdd}>
            추가
          </button>
        </div>

        {/* ===== SELECTION BANNER ===== */}
        {selectedWorker && (
          <div
            className="selection-banner"
            style={{ borderLeftColor: getPersonColor(selectedWorker.name) }}
          >
            <span
              className="color-dot"
              style={{ background: getPersonColor(selectedWorker.name) }}
            />
            {selectedWorker.name} 선택됨 — 점검자 칸 클릭으로 배정 (여러 칸
            가능)
          </div>
        )}

        {/* ===== WORKER TABLE ===== */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 34 }}>번호</th>
                <th>이름</th>
                <th>근무시간</th>
                <th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    출근자를 추가하세요
                  </td>
                </tr>
              ) : (
                workers.map((w) => {
                  const isSel = w.id === selectedWorkerId;
                  const isEditing = editingId === w.id;
                  const canCount = classrooms.filter((c) =>
                    canInspect(w, c),
                  ).length;
                  const myRooms = classrooms
                    .filter((c) => c.inspectorId === w.id)
                    .map((c) => c.room);
                  const trips = countTrips(classrooms, w.id);
                  const floors = [...getWorkerFloors(classrooms, w.id)].sort();

                  const color = getPersonColor(w.name);
                  const isAssigned = myRooms.length > 0;

                  const tripLevel =
                    trips === 1 ? "ok" : trips === 2 ? "warn" : "err";
                  const tripLabel =
                    trips === 1 ? "1회 이동" : `${trips}회 이동`;

                  const floorLevel =
                    floors.length <= 1
                      ? "ok"
                      : floors.length <= 3
                        ? "warn"
                        : "err";
                  const floorLabel =
                    floors.length > 0
                      ? floors.map((f) => `${f}층`).join("·")
                      : null;

                  return (
                    <tr key={w.id}>
                      <td className="num-cell">{w.number}</td>
                      <td>
                        <span
                          className={`worker-name-cell${isSel ? " selected" : ""}`}
                          style={
                            isSel
                              ? {}
                              : isAssigned
                                ? {
                                    backgroundColor: "#d0d0d0",
                                    borderLeft: "3px solid #999",
                                  }
                                : {
                                    backgroundColor: color + "55",
                                    borderLeft: `3px solid ${color}`,
                                  }
                          }
                          onClick={() => !isEditing && onSelectWorker(w.id)}
                          onMouseEnter={() => !isEditing && onHoverWorker(w.id)}
                          onMouseLeave={() => onHoverWorker(null)}
                        >
                          {w.name}
                        </span>
                        {trips > 0 && (
                          <span className={`trip-badge trip-${tripLevel}`}>
                            {tripLabel}
                          </span>
                        )}
                        {floorLabel && (
                          <span className={`trip-badge trip-${floorLevel}`}>
                            {floorLabel}
                          </span>
                        )}
                        {classrooms.length > 0 && (
                          <span
                            className={`can-note${canCount > 0 ? " has-rooms" : ""}`}
                          >
                            ({canCount}개 가능)
                          </span>
                        )}
                        {myRooms.length > 0 && (
                          <div className="assigned-rooms">
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
                              onKeyDown={(e) => {
                                if (e.key === "Escape") cancelEdit();
                              }}
                              placeholder="08:30-11:30"
                              autoFocus
                            />
                            <input
                              className="time-edit-input"
                              value={editT2}
                              onChange={(e) => setEditT2(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(w.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              placeholder="13:30-18:00 (선택)"
                            />
                            <div className="time-edit-btns">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => saveEdit(w.id)}
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div>
                              {w.workTimes.map((t, i) => (
                                <span key={i} className="work-time-badge">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <button
                              className="edit-slot-btn"
                              onClick={() => startEdit(w)}
                              title="근무시간 수정"
                            >
                              ✏
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="del-cell">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onRemoveWorker(w.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===== COUNT BAR ===== */}
        <div className="count-bar">
          근무자 <strong>{workers.length}</strong>명 &nbsp;/&nbsp; 점검 가능
          강의실 <strong>{assignableRooms}</strong>개 &nbsp;/&nbsp;
          <strong>{assignableRooms}</strong> ÷ <strong>{workers.length}</strong>{" "}
          =
          <strong>
            {assignableRooms
              ? (assignableRooms / workers.length).toFixed(2)
              : "0.00"}
          </strong>
        </div>

        <div className="hint-text">
          이름 위 마우스 → 담당 가능 강의실 초록 표시
          <br />
          이름 클릭 → 점검자 칸 클릭으로 복수 배정 | 자기 칸 재클릭 → 해제
        </div>
      </div>
    </div>
  );
}
