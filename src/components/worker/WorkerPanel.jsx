import { getPersonColor } from "../../schedule";
import Icon from "../Icon";
import FairnessCard from "../FairnessCard";
import DaySelector from "./DaySelector";
import WorkerForm from "./WorkerForm";
import WorkerRow from "./WorkerRow";
import ReassignBanner from "./ReassignBanner";

export default function WorkerPanel({
  workers,
  classrooms,
  schedule,
  selectedWorkerId,
  selectedDay,
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

  return (
    <div className="right-col">
      <div className="right-col-scroll">
        {/* ===== 출근자 추가 ===== */}
        <section className="card">
          <header className="card-head">
            <h2 className="card-title">
              <Icon name="user-plus" size={15} />
              출근자 추가
            </h2>
            <DaySelector
              selectedDay={selectedDay}
              onLoadDay={onLoadDay}
              schedule={schedule}
            />
          </header>

          {scheduleEmpty && (
            <div className="worker-empty-cta">
              <div className="worker-empty-cta-text">
                등록된 시간표가 없습니다. 근로시간표 엑셀 파일을 불러오면 요일별
                출근자가 자동으로 채워집니다.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onGoSchedule}>
                <Icon name="calendar-days" size={14} />
                시간표에서 엑셀 불러오기
              </button>
            </div>
          )}

          <WorkerForm onAddWorker={onAddWorker} showStatus={showStatus} />
        </section>

        {/* ===== 출근자 명단 ===== */}
        <section className="card">
          <header className="card-head">
            <h2 className="card-title">
              <Icon name="users" size={15} />
              출근자 명단
              <span className="card-count">
                · {selectedDay ? `${selectedDay}요일 ` : ""}
                {workers.length}명
              </span>
            </h2>
          </header>

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
              <span className="selection-banner-hint">
                — 점검자 칸을 클릭하면 배정됩니다
              </span>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 34 }} aria-label="번호" />
                  <th>이름</th>
                  <th style={{ width: 108 }}>근무시간</th>
                  <th style={{ width: 56 }}>배정</th>
                  <th style={{ width: 40 }} aria-label="더보기" />
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
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

          {workers.length > 0 && (
            <div className="hint-text">
              이름을 클릭하면 담당 강의실이 색으로 표시되고, 그 상태에서 비어
              있는 점검자 칸을 클릭하면 배정됩니다. 이미 배정된 칸은 강의실 행의
              메뉴에서 '배정 해제'를 한 뒤에 다시 배정할 수 있습니다.
            </div>
          )}
        </section>

        {/* ===== 배정 공정성 ===== */}
        <FairnessCard classrooms={classrooms} workers={workers} />
      </div>

      {/* 스크롤 영역 밖 — 명단이 길어도 항상 보인다 */}
      {showReassignBanner && (
        <ReassignBanner
          onReAssign={onReAssign}
          onDismiss={onDismissReassignBanner}
        />
      )}
    </div>
  );
}
