import { useState } from "react";
import { parseRange } from "../../utils";

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

  return (
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
  );
}
