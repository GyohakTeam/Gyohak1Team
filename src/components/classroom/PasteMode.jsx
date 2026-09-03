import { useRef } from "react";
import Icon from "../Icon";

const STATUS_ICON = { ok: "check", err: "alert", warn: "alert", info: "info" };
const STATUS_BORDER = {
  ok: "#16803c",
  err: "#b42318",
  warn: "#b45309",
  info: "#52565d",
};

export default function PasteMode({ status, onImport, onClear }) {
  const textareaRef = useRef(null);

  const handlePaste = () => {
    setTimeout(() => {
      if (textareaRef.current) onImport(textareaRef.current.value);
    }, 50);
  };

  const handleClear = () => {
    if (textareaRef.current) textareaRef.current.value = "";
    onClear();
  };

  return (
    <div className="mode-wrap">
      <div className="card-head">
        <h2 className="card-title">
          <Icon name="clipboard-check" size={15} />
          강의실 점검 시간표
        </h2>
      </div>
      <div className="paste-content">
        <div className="paste-hint">
          HWP·메모장 등에서 복사 후 아래에 <strong>붙여넣기(Ctrl+V)</strong>{" "}
          하면 자동으로 표가 채워집니다.
          <br />
          세로형: 강의실명 한 줄 → 시간대 한 줄씩 &nbsp;|&nbsp; 가로형: 탭
          또는 <code>|</code> 구분
        </div>
        <textarea
          ref={textareaRef}
          className="paste-area"
          onPaste={handlePaste}
          placeholder={
            "예시 (세로형):\n201호\n09:00-12:00\n14:00-18:00\n202호\n10:00-13:00\n\n예시 (가로형):\n201호\t09:00-12:00\t14:00-18:00"
          }
        />
        {status.text && (
          <div
            className="status-bar"
            style={{ borderLeftColor: STATUS_BORDER[status.type] }}
          >
            <Icon name={STATUS_ICON[status.type] || "info"} size={13} />
            {status.text}
          </div>
        )}
        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={() => textareaRef.current && onImport(textareaRef.current.value)}
          >
            <Icon name="table" size={15} />
            가져오기
          </button>
          <button className="btn btn-secondary" onClick={handleClear}>
            <Icon name="rotate-ccw" size={15} />
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
