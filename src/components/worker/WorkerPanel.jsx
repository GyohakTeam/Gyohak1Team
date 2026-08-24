import { getPersonColor } from "../../schedule";
import DaySelector from "./DaySelector";
import WorkerForm from "./WorkerForm";
import WorkerRow from "./WorkerRow";
import ReassignBanner from "./ReassignBanner";

export default function WorkerPanel({
  workers,
  classrooms,
  selectedWorkerId,
  selectedDay,
  manualMode,
  onAddWorker,
  onRemoveWorker,
  onUpdateWorker,
  onSelectWorker,
  onLoadDay,
  scheduleEmpty,
  onGoSchedule,
  showStatus,
  showReassignBanner,
  onReAssign,
  onDismissReassignBanner,
}) {
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const assignableRooms = classrooms.filter((c) => c.timeSlots.length > 0).length;

  return (
    <div className="right-col">
      <div className="worker-panel">
        <div className="panel-title">출근자 명단</div>

        <DaySelector selectedDay={selectedDay} onLoadDay={onLoadDay} />

        {scheduleEmpty && (
          <div className="worker-empty-cta">
            <div className="worker-empty-cta-text">
              등록된 시간표가 없습니다. 근로시간표 엑셀 파일을 불러오면 요일별
              출근자가 자동으로 채워집니다.
            </div>
            <button className="btn btn-primary btn-sm" onClick={onGoSchedule}>
              📅 시간표에서 엑셀 불러오기
            </button>
          </div>
        )}

        <WorkerForm onAddWorker={onAddWorker} showStatus={showStatus} />

        {selectedWorker && (
          <div
            className="selection-banner"
            style={{ borderLeftColor: getPersonColor(selectedWorker.name) }}
          >
            <span
              className="color-dot"
              style={{ background: getPersonColor(selectedWorker.name) }}
            />
            {selectedWorker.name} 선택됨
            {manualMode && " — 점검자 칸 클릭으로 배정 (여러 칸 가능)"}
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 34 }}>번호</th>
                <th>이름</th>
                <th>근무시간</th>
                <th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    {scheduleEmpty
                      ? "시간표를 불러온 뒤 요일을 선택하세요"
                      : "요일을 선택하거나 출근자를 추가하세요"}
                  </td>
                </tr>
              ) : (
                workers.map((w) => (
                  <WorkerRow
                    key={w.id}
                    worker={w}
                    classrooms={classrooms}
                    selectedWorkerId={selectedWorkerId}
                    onSelectWorker={onSelectWorker}
                    onRemoveWorker={onRemoveWorker}
                    onUpdateWorker={onUpdateWorker}
                    showStatus={showStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {showReassignBanner && (
          <ReassignBanner
            onReAssign={onReAssign}
            onDismiss={onDismissReassignBanner}
          />
        )}

        <div className="count-bar">
          근무자 <strong>{workers.length}</strong>명 &nbsp;/&nbsp; 점검 가능
          강의실 <strong>{assignableRooms}</strong>개 &nbsp;/&nbsp;
          <strong>{assignableRooms}</strong> ÷ <strong>{workers.length}</strong>{" "}
          =
          <strong>
            {assignableRooms ? (assignableRooms / workers.length).toFixed(2) : "0.00"}
          </strong>
        </div>

        <div className="hint-text">
          이름 클릭 → 담당 강의실 색상 표시
          {manualMode && (
            <>
              <br />
              수동 모드: 점검자 칸 클릭으로 배정 | 자기 칸 재클릭 → 해제
            </>
          )}
        </div>
      </div>
    </div>
  );
}
