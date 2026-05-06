import { DAYS } from "../../schedule";

export default function DaySelector({ selectedDay, onLoadDay }) {
  return (
    <div className="day-selector">
      {DAYS.map((day) => (
        <button
          key={day}
          className={`day-btn${selectedDay === day ? " active" : ""}`}
          onClick={() => onLoadDay(day)}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
