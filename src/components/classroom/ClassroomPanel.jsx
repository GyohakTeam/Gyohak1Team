import { useState } from "react";
import { getPersonColor } from "../../schedule";
import EventModal from "../EventModal";
import PasteMode from "./PasteMode";
import ClassroomRow from "./ClassroomRow";

export default function ClassroomPanel({
  classrooms,
  workers,
  selectedWorkerId,
  manualMode,
  onToggleManualMode,
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
  onAddEvent,
  onRemoveEvent,
  isAssigning,
}) {
  const [eventModalRoom, setEventModalRoom] = useState(null);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="left-panel">
      {mode === "paste" && (
        <PasteMode status={status} onImport={onImport} onClear={onClear} />
      )}

      {mode === "table" && (
        <div className="mode-wrap" style={{ position: "relative" }}>
          <div className="panel-title">
            강의실 점검 시간표
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className={`reload-btn${manualMode ? " manual-active" : ""}`}
                onClick={onToggleManualMode}
              >
                ✏ {manualMode ? "수동 모드 ON" : "수동 모드"}
              </button>
              {classrooms.length > 0 && (
                <button className="reload-btn" onClick={handleCopyTable}>
                  {copied ? "✔ 복사됨" : "📋 표 복사"}
                </button>
              )}
              {workers.length > 0 && (
                <button className="reload-btn" onClick={onAutoAssign} disabled={isAssigning}>
                  {isAssigning ? "⏳ 배정 중..." : "⚡ 자동 배정"}
                </button>
              )}
              {classrooms.some((c) => c.inspectorId) && (
                <button className="reload-btn" onClick={onReAssign} disabled={isAssigning}>
                  🔀 다시 배정
                </button>
              )}
              <button className="reload-btn" onClick={onSwitchToPaste}>
                ↩ 다시 불러오기
              </button>
            </div>
          </div>

          {isAssigning && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "rgba(255,255,255,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 600, color: "#555",
              borderRadius: 6,
            }}>
              ⏳ 배정 계산 중...
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 76 }}>강의실</th>
                  <th>점검 가능 시간</th>
                  <th style={{ width: 100 }}>점검자</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="empty-state">
                      데이터를 붙여넣기 하세요
                    </td>
                  </tr>
                ) : (
                  classrooms.map((c) => (
                    <ClassroomRow
                      key={c.id}
                      classroom={c}
                      workers={workers}
                      selectedWorkerId={selectedWorkerId}
                      selWorker={selWorker}
                      manualMode={manualMode}
                      events={events}
                      onInspectorClick={onInspectorClick}
                      onUpdateClassroom={onUpdateClassroom}
                      onOpenEventModal={setEventModalRoom}
                    />
                  ))
                )}
              </tbody>
            </table>
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
    </div>
  );
}
