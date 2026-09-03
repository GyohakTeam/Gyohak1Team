import Icon from "./Icon";

const ICON = { ok: "check", err: "alert", warn: "alert", info: "info" };

/**
 * 화면 하단 알림.
 *
 * 안내 문구(showStatus)는 지금까지 붙여넣기 화면에서만 보였고 표 화면에서는
 * 어디에도 나타나지 않았다 — 자동 배정 결과나 입력 형식 오류가 조용히 사라졌다.
 * 목업에는 상태 표시 영역이 없으므로 토스트로 띄운다.
 */
export default function Toast({ status, onDismiss }) {
  if (!status.text) return null;
  return (
    <div className={`toast toast-${status.type || "info"}`} role="status">
      <Icon name={ICON[status.type] || "info"} size={15} />
      <span className="toast-text">{status.text}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="닫기">
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}
