import { useState } from "react";
import { parseRange } from "../utils";
import Icon from "./Icon";
import Modal from "./Modal";

const TIMES = [];
for (let h = 9; h <= 23; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 23 && m > 0) break;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIMES.push(`${hh}:${mm}`);
  }
}

export default function EventModal({ room, events, onAdd, onRemove, onClose }) {
  const [tab, setTab] = useState("select");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [directInput, setDirectInput] = useState("");
  const [error, setError] = useState("");

  const roomEvents = events.filter((e) => e.room === room);

  const startIdx = TIMES.indexOf(startTime);
  const endTimes = TIMES.filter((_, i) => i > startIdx);

  const handleStartChange = (val) => {
    setStartTime(val);
    const newStartIdx = TIMES.indexOf(val);
    const curEndIdx = TIMES.indexOf(endTime);
    if (curEndIdx <= newStartIdx) {
      setEndTime(TIMES[newStartIdx + 1] ?? TIMES[TIMES.length - 1]);
    }
  };

  const handleAddSelect = () => {
    const timeStr = `${startTime}-${endTime}`;
    if (!parseRange(timeStr)) {
      setError("유효하지 않은 시간 범위입니다.");
      return;
    }
    onAdd(room, timeStr);
    setError("");
  };

  const handleAddDirect = () => {
    const trimmed = directInput.trim();
    if (!parseRange(trimmed)) {
      setError("올바른 형식으로 입력하세요 (예: 10:00-12:00)");
      return;
    }
    onAdd(room, trimmed);
    setDirectInput("");
    setError("");
  };

  return (
    <Modal
      icon="calendar-plus"
      title={`${room} 행사 설정`}
      subtitle="등록한 시간은 점검 가능 시간에서 제외됩니다"
      size="sm"
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      }
    >
      <div className="modal-tabs">
        <button
          className={`modal-tab${tab === "select" ? " active" : ""}`}
          onClick={() => {
            setTab("select");
            setError("");
          }}
        >
          <Icon name="clock" size={15} />
          시간 선택
        </button>
        <button
          className={`modal-tab${tab === "direct" ? " active" : ""}`}
          onClick={() => {
            setTab("direct");
            setError("");
          }}
        >
          <Icon name="pencil" size={15} />
          직접 입력
        </button>
      </div>

      <div className="modal-section">
        {tab === "select" ? (
          <>
            <div className="modal-time-select-row">
              <select
                className="modal-time-select"
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
              >
                {TIMES.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="modal-time-sep">~</span>
              <select
                className="modal-time-select"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {endTimes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddSelect}>
                <Icon name="plus" size={15} />
                추가
              </button>
            </div>
            <div className="modal-hint">30분 단위로 고를 수 있습니다.</div>
          </>
        ) : (
          <>
            <div className="modal-direct-row">
              <input
                className="form-input"
                placeholder="예: 10:00-12:00"
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDirect()}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleAddDirect}>
                <Icon name="plus" size={15} />
                추가
              </button>
            </div>
            <div className="modal-hint">
              30분 단위가 아닌 시간은 이곳에 직접 적어주세요.
            </div>
          </>
        )}
        {error && (
          <div className="modal-error">
            <Icon name="alert" size={14} />
            {error}
          </div>
        )}
      </div>

      {roomEvents.length > 0 && (
        <div className="modal-section">
          <div className="modal-section-head">
            <Icon name="ban" size={14} />
            등록된 행사 {roomEvents.length}건
          </div>
          {roomEvents.map((ev) => (
            <div key={ev.id} className="modal-event-item">
              <span>
                <Icon name="ban" size={14} />
                {ev.time}
              </span>
              <button
                className="modal-event-del"
                onClick={() => onRemove(ev.id)}
                title="삭제"
                aria-label="행사 삭제"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
