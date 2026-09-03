import { useEffect } from "react";
import Icon from "./Icon";

/**
 * 모달 4개(행사 추가·행사 목록·패치 내역·엑셀 불러오기)가 공유하는 껍데기.
 *
 * 전에는 각자 오버레이와 헤더를 따로 갖고 있어서 크기·글자·닫기 동작이 조금씩
 * 달랐고, 행사 모달들은 Esc 로 닫히지도 않았다.
 *
 * children 은 여백 없는 스크롤 영역에 그대로 들어간다 — 안쪽은 `.modal-section`
 * 으로 감싸면 표준 여백이 붙고, 섹션끼리는 구분선이 생긴다.
 */
export default function Modal({
  icon,
  title,
  subtitle,
  size = "md", // sm | md | lg | xl
  onClose,
  footer,
  children,
  boxProps = {},
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        {...boxProps}
      >
        <header className="modal-header">
          <div className="modal-heading">
            {icon && <Icon name={icon} size={18} />}
            <div className="modal-heading-text">
              <span className="modal-title">{title}</span>
              {subtitle && <span className="modal-subtitle">{subtitle}</span>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="modal-content">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
