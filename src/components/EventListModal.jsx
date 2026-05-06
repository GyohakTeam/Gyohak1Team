import { useState } from "react";

export default function EventListModal({ events, onClose }) {
  const [copied, setCopied] = useState(false);

  const roomNum = (room) => parseInt(room.replace(/[^0-9]/g, ""), 10) || 0;
  const sorted = [...events].sort((a, b) => roomNum(a.room) - roomNum(b.room));
  const lines = sorted.map((e) => `${e.room} : ${e.time.replace("-", "~")}`);
  const text = lines.join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>행사 목록</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="event-list-body">
          {lines.length === 0 ? (
            <div className="event-list-empty">등록된 행사가 없습니다.</div>
          ) : (
            <pre className="event-list-pre">{text}</pre>
          )}
        </div>

        {lines.length > 0 && (
          <div className="event-list-footer">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? "✔ 복사됨" : "📋 복사"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
