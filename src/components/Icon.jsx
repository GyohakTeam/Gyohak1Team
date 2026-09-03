/**
 * 화면 전체에서 쓰는 선(line) 아이콘 모음.
 *
 * 목업이 이모지가 아니라 얇은 선 아이콘을 쓰기 때문에 이모지를 전부 걷어냈다.
 * 24x24 좌표계 · stroke=currentColor 로 통일해서, 부모의 color 만 바꾸면
 * 아이콘 색이 따라오고 버튼 안에서 글자와 같은 톤으로 보인다.
 */

const PATHS = {
  // 로고 (건물 + 점검 체크)
  "building-check": (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5" />
      <path d="M8 7h3M8 11h3M8 15h3M4 21h7" />
      <circle cx="17" cy="16" r="5" />
      <path d="m15 16 1.5 1.6L19.2 14.4" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />,
  "calendar-days": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M7.5 14h1M11.5 14h1M15.5 14h1M7.5 17.5h1M11.5 17.5h1M15.5 17.5h1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ),
  "calendar-plus": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M12 13v5M9.5 15.5h5" />
    </>
  ),
  "clipboard-list": (
    <>
      <path d="M9 3h6v3H9z" />
      <path d="M15 4.5h2a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2" />
      <path d="M8.5 11h7M8.5 15h7" />
    </>
  ),
  "clipboard-check": (
    <>
      <path d="M9 3h6v3H9z" />
      <path d="M15 4.5h2a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2" />
      <path d="m9 13.5 2 2 4-4" />
    </>
  ),
  "chevron-left": <path d="m14 6-6 6 6 6" />,
  "chevron-right": <path d="m10 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.6-4.6" />
    </>
  ),
  shuffle: (
    <>
      <path d="M16 3h5v5M21 3 13.5 10.5M4 4l5 5" />
      <path d="M16 21h5v-5M21 21l-7.5-7.5M4 20l5-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  "user-plus": (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M2.5 21a7.5 7.5 0 0 1 15 0" />
      <path d="M18 7.5h5M20.5 5v5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4.6a4 4 0 0 1 0 6.8M18.5 21a7 7 0 0 0-2.2-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.6 2.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.2V16.5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4.2L20 8.2 15.8 4 4 15.8V20z" />
      <path d="m14.4 5.4 4.2 4.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 7V4h4v3" />
      <path d="M6.5 7l.9 13h9.2l.9-13" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 5.5A1.5 1.5 0 0 0 14.5 4H6a2 2 0 0 0-2 2v8.5A1.5 1.5 0 0 0 5.5 16" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3 4.5V10h5.5" />
      <path d="M12 8.2v4.2l3.2 1.9" />
    </>
  ),
  folder: (
    <path d="M3 6.6A1.6 1.6 0 0 1 4.6 5h4l1.9 2.5h8.9A1.6 1.6 0 0 1 21 9.1V18a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18V6.6z" />
  ),
  "rotate-ccw": (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3 4.5V10h5.5" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h10.5L19 7.5V20H5z" />
      <path d="M9 4v5h6V4.5M8.5 14h7" />
    </>
  ),
  check: <path d="m5 13 4.5 4.5L19 7" />,
  x: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  building: (
    <>
      <path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3h7A1.5 1.5 0 0 1 14 4.5V21" />
      <path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21M3 21h18" />
      <path d="M7 7h4M7 11h4M7 15h4M16.5 14h1M16.5 17.5h1" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.8 20h18.4L12 3.5z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M9 9.5V20M3 15h18" />
    </>
  ),
};

export default function Icon({ name, size = 16, className, style, strokeWidth = 1.8 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={["icon", className].filter(Boolean).join(" ")}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d}
    </svg>
  );
}
