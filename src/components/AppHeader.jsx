import Icon from "./Icon";

/**
 * 배정 화면과 시간표 화면이 공유하는 상단 헤더.
 * 왼쪽에 로고/제목 + 부제, 오른쪽에 동작 버튼.
 */

/** 로고 마크 — 어두운 사각형 안의 "건물 + 점검" 아이콘 */
export function HeaderMark() {
  return (
    <span className="hdr-mark">
      <Icon name="building-check" size={21} strokeWidth={1.7} />
    </span>
  );
}

export default function AppHeader({ left, title, subtitle, actions }) {
  return (
    <header className="app-header">
      <div className="hdr-left">
        {left}
        <div className="hdr-titles">
          {title}
          {subtitle && <div className="hdr-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="hdr-actions">{actions}</div>
    </header>
  );
}
