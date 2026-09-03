import Icon from "../Icon";

export default function ReassignBanner({ onReAssign, onDismiss }) {
  return (
    <section className="card reassign-card">
      <p className="reassign-msg">
        <Icon name="info" size={15} />
        점검이 너무 불합리하거나 배정이 이상하다면 다시 돌릴까요?
      </p>
      <div className="reassign-btns">
        <button
          className="btn btn-primary"
          onClick={() => {
            onReAssign();
            onDismiss();
          }}
        >
          <Icon name="shuffle" size={14} />
          다시 돌리기
        </button>
        <button className="btn btn-secondary" onClick={onDismiss}>
          괜찮습니다
        </button>
      </div>
    </section>
  );
}
