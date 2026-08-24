import { useEffect } from "react";
import { PATCH_NOTES } from "../patchNotes";

import Icon from "./Icon";

export default function PatchNotesModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="patch-overlay" onClick={onClose}>
      <div className="patch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="patch-header">
          <span className="patch-title">패치 내역</span>
          <button className="patch-close" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="patch-body">
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
      </div>
    </div>
  );
}
