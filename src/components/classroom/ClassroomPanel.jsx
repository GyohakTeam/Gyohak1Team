import { useMemo, useState } from "react";
import Icon from "../Icon";
import Menu from "../Menu";
import EventModal from "../EventModal";
import EventListModal from "../EventListModal";
import PasteMode from "./PasteMode";
import ClassroomRow from "./ClassroomRow";

export default function ClassroomPanel({
  classrooms,
  workers,
  selectedWorkerId,
  mode,
  status,
  events,
  onImport,
  onClear,
  onSwitchToPaste,
  onInspectorClick,
  onAutoAssign,
  onReAssign,
  onUpdateClassroom,
  onUnassign,
  onAddEvent,
  onRemoveEvent,
  isAssigning,
}) {
  const [eventModalRoom, setEventModalRoom] = useState(null);
  const [showEventList, setShowEventList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");

  const handleCopyTable = () => {
    const names = classrooms.map((c) => {
      const inspector = workers.find((w) => w.id === c.inspectorId);
      return inspector ? inspector.name : "";
    });
    const htmlRows = names.map((n) => `<tr><td>${n}</td></tr>`).join("");
    const html = `<html><body><table>${htmlRows}</table></body></html>`;
    const plain = names.join("\n");
    navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ])
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  const selWorker = workers.find((w) => w.id === selectedWorkerId) ?? null;

  // 강의실 검색 — 표에 보이는 행만 걸러낸다 (원본 목록은 그대로)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classrooms;
    return classrooms.filter((c) => c.room.toLowerCase().includes(q));
  }, [classrooms, query]);

  const unassigned = classrooms.filter(
    (c) => (c.effectiveSlots ?? c.timeSlots).length > 0 && !c.inspectorId,
  ).length;
  const assigned = classrooms.filter((c) => c.inspectorId).length;

  return (
    <div className="left-panel">
      {mode === "paste" && (
        <PasteMode status={status} onImport={onImport} onClear={onClear} />
      )}

      {mode === "table" && (
        <div className="mode-wrap" style={{ position: "relative" }}>
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="clipboard-check" size={15} />
              강의실 점검 시간표
            </h2>
            <div className="card-actions">
              {events.length > 0 && (
                <button
                  className="chip-btn"
                  title="등록된 행사를 모아 봅니다"
                  onClick={() => setShowEventList(true)}
                >
                  <Icon name="clipboard-list" size={13} />
                  행사 목록
                </button>
              )}
              {classrooms.length > 0 && (
                <button
                  className="chip-btn"
                  title="점검자 열을 엑셀에 붙여넣을 수 있게 복사합니다"
                  onClick={handleCopyTable}
                >
                  <Icon name={copied ? "check" : "copy"} size={13} />
                  {copied ? "복사됨" : "표 복사"}
                </button>
              )}
              <Menu
                items={[
                  assigned > 0 && {
                    label: "다시 배정",
                    icon: "shuffle",
                    onClick: onReAssign,
                  },
                  {
                    label: "강의실 다시 불러오기",
                    icon: "rotate-ccw",
                    onClick: onSwitchToPaste,
                  },
                ]}
              />
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <input
                className="search-input"
                type="text"
                placeholder="강의실 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              />
              {query ? (
                <button
                  className="icon-btn search-clear"
                  title="검색 지우기"
                  onClick={() => setQuery("")}
                >
                  <Icon name="x" size={13} />
                </button>
              ) : (
                <Icon name="search" size={15} className="search-icon" />
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={onAutoAssign}
              disabled={isAssigning || workers.length === 0}
              title={
                workers.length === 0
                  ? "요일을 선택해 출근자를 먼저 불러오세요"
                  : "근무시간에 맞춰 점검자를 자동 배정"
              }
            >
              <Icon name="shuffle" size={15} />
              {isAssigning ? "배정 중..." : "자동 배정"}
            </button>
          </div>

          {isAssigning && (
            <div className="busy-overlay">
              <Icon name="shuffle" size={16} />
              배정 계산 중...
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>강의실</th>
                  <th>점검 가능 시간</th>
                  <th style={{ width: 116 }}>점검자</th>
                  <th style={{ width: 40 }} aria-label="더보기" />
                </tr>
              </thead>
              <tbody>
                {classrooms.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      데이터를 붙여넣기 하세요
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      "{query}" 와 일치하는 강의실이 없습니다
                    </td>
                  </tr>
                ) : (
                  visible.map((c) => (
                    <ClassroomRow
                      key={c.id}
                      classroom={c}
                      workers={workers}
                      selectedWorkerId={selectedWorkerId}
                      selWorker={selWorker}
                      events={events}
                      onInspectorClick={onInspectorClick}
                      onUpdateClassroom={onUpdateClassroom}
                      onUnassign={onUnassign}
                      onOpenEventModal={setEventModalRoom}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card-foot">
            <Icon name="building" size={15} />
            총 <strong>{classrooms.length}</strong>개 강의실
            <span className="card-foot-spacer">
              {query.trim()
                ? `검색 결과 ${visible.length}개`
                : unassigned > 0
                  ? `미배정 ${unassigned}개`
                  : assigned > 0
                    ? "전체 배정 완료"
                    : ""}
            </span>
          </div>
        </div>
      )}

      {eventModalRoom !== null && (
        <EventModal
          room={eventModalRoom}
          events={events}
          onAdd={onAddEvent}
          onRemove={onRemoveEvent}
          onClose={() => setEventModalRoom(null)}
        />
      )}

      {showEventList && (
        <EventListModal
          events={events}
          onClose={() => setShowEventList(false)}
        />
      )}
    </div>
  );
}
