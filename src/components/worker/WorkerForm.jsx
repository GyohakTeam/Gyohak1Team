import { useState } from "react";
import { parseRange } from "../../utils";
import Icon from "../Icon";

/** 자주 쓰는 근무 구간 — 입력창에서 바로 골라 쓸 수 있게 목록으로 붙인다 */
const TIME_PRESETS = [
  "08:30-11:30",
  "09:00-12:00",
  "09:30-11:30",
  "12:00-14:00",
  "13:00-16:00",
  "13:30-18:00",
  "15:00-18:30",
  "17:30-21:30",
  "18:00-21:00",
  "20:00-22:00",
];

export default function WorkerForm({ onAddWorker, showStatus }) {
  const [name, setName] = useState("");
  const [time1, setTime1] = useState("");
  const [time2, setTime2] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      showStatus("이름을 입력하세요.", "warn");
      return;
    }
    if (!time1.trim()) {
      showStatus("첫 번째 근무시간을 입력하세요.", "warn");
      return;
    }
    if (!parseRange(time1)) {
      showStatus("첫 번째 근무시간 형식 오류. 예: 08:30-11:30", "err");
      return;
    }
    if (time2 && !parseRange(time2)) {
      showStatus("두 번째 근무시간 형식 오류. 예: 13:30-18:00", "err");
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

  return (
    <div className="worker-form">
      <datalist id="timePresets">
        {TIME_PRESETS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="form-row">
        <span className="form-label">
          <Icon name="user" size={14} />
          이름
        </span>
        <div className="input-wrap">
          <input
            id="wName"
            className="form-input"
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => handleKey(e, "wTime1")}
          />
        </div>
      </div>

      <div className="form-row">
        <span className="form-label">
          <Icon name="clock" size={14} />
          근무시간
          <span className="form-label-num">1</span>
        </span>
        <div className="input-wrap">
          <input
            id="wTime1"
            className="form-input form-input-time"
            type="text"
            list="timePresets"
            placeholder="08:30-11:30"
            value={time1}
            onChange={(e) => setTime1(e.target.value)}
            onKeyDown={(e) => handleKey(e, "wTime2")}
          />
          <Icon name="chevron-down" size={13} className="input-chevron" />
        </div>
      </div>

      <div className="form-row">
        <span className="form-label">
          <Icon name="clock" size={14} />
          근무시간
          <span className="form-label-num">2</span>
          <span className="form-label-opt">(선택)</span>
        </span>
        <div className="input-wrap">
          <input
            id="wTime2"
            className="form-input form-input-time"
            type="text"
            list="timePresets"
            placeholder="13:30-18:00"
            value={time2}
            onChange={(e) => setTime2(e.target.value)}
            onKeyDown={(e) => handleKey(e, null)}
          />
          <Icon name="chevron-down" size={13} className="input-chevron" />
        </div>
      </div>

      <div className="worker-form-actions">
        <button className="btn btn-primary" onClick={handleAdd}>
          <Icon name="plus" size={15} />
          추가
        </button>
      </div>
    </div>
  );
}
