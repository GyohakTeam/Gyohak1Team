import { useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";

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
    <Modal
      icon="clipboard-list"
      title="행사 목록"
      subtitle={lines.length > 0 ? `${lines.length}건 등록됨` : undefined}
      size="md"
      onClose={onClose}
      footer={
        <>
          {lines.length > 0 && (
            <span className="modal-footer-note">
              복사하면 강의실 : 시간 형식으로 붙여넣을 수 있습니다.
            </span>
          )}
          <div className="modal-footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
            {lines.length > 0 && (
              <button className="btn btn-primary" onClick={handleCopy}>
                <Icon name={copied ? "check" : "copy"} size={15} />
                {copied ? "복사됨" : "복사"}
              </button>
            )}
          </div>
        </>
      }
    >
      <div className="modal-section">
        {lines.length === 0 ? (
          <div className="event-list-empty">
            <Icon name="calendar-plus" size={26} strokeWidth={1.5} />
            등록된 행사가 없습니다.
          </div>
        ) : (
          <pre className="event-list-pre">{text}</pre>
        )}
      </div>
    </Modal>
  );
}
