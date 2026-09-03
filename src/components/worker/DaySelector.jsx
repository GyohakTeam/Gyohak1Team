import { DAYS } from "../../schedule";

/**
 * 월~금 토글. 요일 선택의 주체는 이 버튼들이고,
 * 좌측 상단 날짜 내비게이터가 같은 요일을 날짜로 비춘다.
 * 시간표에 사람이 있는 요일은 진하게, 빈 요일은 흐리게 보인다.
 */
export default function DaySelector({ selectedDay, onLoadDay, schedule }) {
  return (
    <div className="day-selector" role="group" aria-label="요일 선택">
      {DAYS.map((day) => {
        const count = schedule?.[day]?.length ?? 0;
        const cls = [
          "day-btn",
          selectedDay === day ? "active" : "",
          count > 0 ? "has-workers" : "is-empty",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={day}
            className={cls}
            onClick={() => onLoadDay(day)}
            title={count > 0 ? `${day}요일 · ${count}명` : `${day}요일 · 등록된 근무자 없음`}
            aria-pressed={selectedDay === day}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}
