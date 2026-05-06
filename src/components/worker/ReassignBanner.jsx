export default function ReassignBanner({ onReAssign, onDismiss }) {
  return (
    <div className="reassign-banner">
      <div className="reassign-fade" />
      <div className="reassign-content">
        <p className="reassign-msg">
          점검이 너무 불합리하거나 배정이 이상하다면 다시 돌릴까요?
        </p>
        <div className="reassign-btns">
          <button
            className="reassign-btn-dark"
            onClick={() => { onReAssign(); onDismiss(); }}
          >
            다시 돌리기
          </button>
          <button className="reassign-btn-light" onClick={onDismiss}>
            괜찮습니다
          </button>
        </div>
      </div>
    </div>
  );
}
