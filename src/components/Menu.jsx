import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * 목업의 행 끝 "···" 메뉴.
 *
 * 표 안에서 쓰기 때문에 fixed 좌표로 띄운다 — .table-wrap 의 overflow 에 잘리거나
 * 행의 stacking context 안에 갇히지 않게 하려면 이 방법이 가장 안전하다.
 *
 * items: [{ label, icon, onClick, danger }] · null 은 무시(조건부 항목용)
 */
export default function Menu({ items, label = "더보기", align = "right", triggerClass = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const list = items.filter(Boolean);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 168;
    const height = list.length * 32 + 10;
    const left =
      align === "right"
        ? Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
        : Math.min(r.left, window.innerWidth - width - 8);
    const below = r.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? r.top - height - 4 : below;
    setPos({ top, left, width });
  }, [open, align, list.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    // fixed 좌표로 띄우기 때문에 스크롤·리사이즈가 생기면 위치가 어긋난다 → 닫는다
    const dismiss = (e) => {
      if (e && menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  if (list.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        className={`icon-btn menu-trigger${open ? " is-open" : ""} ${triggerClass}`.trim()}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="more" size={16} />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          className="menu-pop"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          role="menu"
        >
          {list.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              className={`menu-item${it.danger ? " menu-item-danger" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
            >
              {it.icon && <Icon name={it.icon} size={14} />}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
