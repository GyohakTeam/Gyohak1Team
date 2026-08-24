import Icon from "./Icon";
import { getPersonColor } from "../schedule";
import { computeFairness, gradeClass } from "../fairness";

const TIP =
  "개인별 배정 수의 최대 편차 1개당 8점, 미배정 강의실 비율에 최대 30점을 감점합니다. 편차 0 · 미배정 0 이면 100점입니다.";

/** 축 눈금이 0 / 중간 / 최대 세 개로 떨어지도록 6의 배수로 올린다 */
function scaleFor(max) {
  return Math.max(6, Math.ceil(max / 6) * 6);
}

export default function FairnessCard({ classrooms, workers }) {
  const f = computeFairness(classrooms, workers);
  const maxCount = f.perWorker.reduce((m, p) => Math.max(m, p.count), 0);
  const scale = scaleFor(maxCount);
  const ticks = [scale, scale / 2, 0];

  return (
    <section className="card fairness-card">
      <header className="card-head">
        <h2 className="card-title">
          <Icon name="clipboard-check" size={15} />
          배정 공정성
          <button className="info-btn" title={TIP} aria-label="점수 계산 방식">
            <Icon name="info" size={13} />
          </button>
        </h2>
      </header>

      {workers.length === 0 ? (
        <div className="empty-state">요일을 선택하면 공정성이 계산됩니다</div>
      ) : (
        <>
          <div className="fair-body">
            <div className="fair-score-col">
              <div className={`fair-score fair-${gradeClass(f.score)}`}>
                <strong>{f.score}</strong>
                <span className="fair-score-max">/ 100</span>
              </div>
              <div className="fair-grade">
                {f.hasAssignment ? f.grade : "배정 전"}
              </div>
              {f.unassigned > 0 && f.hasAssignment && (
                <div className="fair-note">미배정 {f.unassigned}개</div>
              )}
            </div>

            <div className="fair-chart-col">
              <div className="fair-chart-label">개인별 배정 수</div>
              <div className="fair-chart">
                <div className="fair-axis">
                  {ticks.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="fair-bars">
                  {f.perWorker.map((p) => (
                    <div
                      className="fair-bar-col"
                      key={p.id}
                      title={`${p.name} · ${p.count}개`}
                    >
                      <span className="fair-bar-value">{p.count || ""}</span>
                      <div className="fair-bar-track">
                        <div
                          className="fair-bar"
                          style={{
                            height: `${(p.count / scale) * 100}%`,
                            background: getPersonColor(p.name),
                          }}
                        />
                      </div>
                      <span className="fair-bar-name">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="fair-stats">
            <div
              className="fair-stat"
              title={`전체 ${f.totalRooms}개 · 점검 가능 ${f.assignable}개 · 배정됨 ${f.assigned}개`}
            >
              <span className="fair-stat-label">총 강의실</span>
              <strong className="fair-stat-value">{f.totalRooms}</strong>
            </div>
            <div
              className="fair-stat"
              title={`점검 가능 ${f.assignable}개 ÷ ${workers.length}명`}
            >
              <span className="fair-stat-label">1인 평균</span>
              <strong className="fair-stat-value">{f.average.toFixed(2)}</strong>
            </div>
            <div
              className="fair-stat"
              title="가장 많이 맡은 사람과 가장 적게 맡은 사람의 차이"
            >
              <span className="fair-stat-label">최대 편차</span>
              <strong className="fair-stat-value">{f.deviation}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
