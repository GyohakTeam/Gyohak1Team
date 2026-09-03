/**
 * 배정 공정성 점수.
 *
 * "누구는 6개, 누구는 1개" 같은 편중이 한눈에 보이도록 개인별 배정 수의
 * 편차를 점수화한다. 편차 1개당 8점, 미배정 강의실 비율에 최대 30점을 깎는다
 * (편차 0 · 미배정 0 이면 100점).
 */

const clamp = (n) => Math.max(0, Math.min(100, n));

export function computeFairness(classrooms, workers) {
  const slotsOf = (c) => c.effectiveSlots ?? c.timeSlots;
  const totalRooms = classrooms.length;
  const assignable = classrooms.filter((c) => slotsOf(c).length > 0).length;
  const assigned = classrooms.filter((c) => c.inspectorId).length;
  const unassigned = Math.max(0, assignable - assigned);

  const perWorker = workers.map((w) => ({
    id: w.id,
    name: w.name,
    count: classrooms.filter((c) => c.inspectorId === w.id).length,
  }));

  const counts = perWorker.map((p) => p.count);
  const deviation = counts.length ? Math.max(...counts) - Math.min(...counts) : 0;
  const average = workers.length ? assignable / workers.length : 0;
  const unassignedRate = assignable ? unassigned / assignable : 0;

  const score = workers.length
    ? Math.round(clamp(100 - deviation * 8 - unassignedRate * 30))
    : 0;

  return {
    score,
    grade: gradeOf(score),
    totalRooms,
    assignable,
    assigned,
    unassigned,
    average,
    deviation,
    perWorker,
    hasAssignment: assigned > 0,
  };
}

function gradeOf(score) {
  if (score >= 90) return "매우 공정";
  if (score >= 75) return "공정";
  if (score >= 55) return "보통";
  return "개선 필요";
}

export function gradeClass(score) {
  if (score >= 90) return "good";
  if (score >= 75) return "ok";
  if (score >= 55) return "warn";
  return "bad";
}
