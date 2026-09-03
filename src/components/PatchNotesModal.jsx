import { PATCH_NOTES } from "../patchNotes";
import Modal from "./Modal";

export default function PatchNotesModal({ onClose }) {
  return (
    <Modal
      icon="history"
      title="패치 내역"
      subtitle={`최신 v${PATCH_NOTES[0]?.version ?? ""}`}
      size="lg"
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      }
    >
      <div className="modal-section patch-body">
        {PATCH_NOTES.map(({ version, date, items }) => (
          <div key={version} className="patch-version-block">
            <div className="patch-version-label">
              <span>v{version}</span>
              {date && <span className="patch-version-date">{date}</span>}
            </div>
            <ul className="patch-list">
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
