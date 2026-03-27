import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  parseData,
  uid,
  autoAssign,
  computeEffectiveSlots,
  canInspect,
} from "./utils";
import { SCHEDULE, DAYS, SCHEDULE_VERSION } from "./schedule";
import ClassroomPanel from "./ClassroomPanel";
import WorkerPanel from "./WorkerPanel";
import SchedulePage from "./SchedulePage";

function initSchedule() {
  try {
    const saved = localStorage.getItem("gyohak-schedule");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === SCHEDULE_VERSION) return parsed.data;
    }
  } catch {}
  // SCHEDULE 깊은 복사
  const clone = {};
  for (const day of DAYS) {
    clone[day] = (SCHEDULE[day] || []).map((w) => ({
      name: w.name,
      workTimes: [...w.workTimes],
    }));
  }
  return clone;
}

export default function App() {
  const [page, setPage] = useState("main"); // 'main' | 'schedule'
  const [schedule, setSchedule] = useState(initSchedule);

  const [classrooms, setClassrooms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [mode, setMode] = useState("paste"); // 'paste' | 'table'
  const [status, setStatus] = useState({ text: "", type: "" });
  const [isAssigning, setIsAssigning] = useState(false);
  const [showReassignBanner, setShowReassignBanner] = useState(false);

  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([]);

  const enrichedClassrooms = useMemo(
    () =>
      classrooms.map((c) => {
        const effectiveSlots = computeEffectiveSlots(c, events);
        return effectiveSlots === c.timeSlots ? c : { ...c, effectiveSlots };
      }),
    [classrooms, events],
  );

  const workerCounterRef = useRef(1);
  const statusTimer = useRef(null);

  // ===== SCHEDULE CHANGE =====
  const handleScheduleChange = useCallback((newSchedule) => {
    setSchedule(newSchedule);
  }, []);

  // ===== STATUS =====
  const showStatus = useCallback((text, type) => {
    setStatus({ text, type });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    if (type === "ok" || type === "info") {
      statusTimer.current = setTimeout(
        () => setStatus({ text: "", type: "" }),
        4000,
      );
    }
  }, []);

  // ===== IMPORT =====
  const importData = useCallback(
    (text) => {
      if (!text.trim()) {
        showStatus("붙여넣기할 데이터가 없습니다.", "warn");
        return;
      }
      const parsed = parseData(text);
      if (!parsed.length) {
        showStatus("파싱할 수 없는 형식입니다.", "err");
        return;
      }
      setClassrooms(parsed);
      setMode("table");
      showStatus(`${parsed.length}개 강의실 데이터를 가져왔습니다.`, "ok");
    },
    [showStatus],
  );

  const clearAll = useCallback(() => {
    setClassrooms([]);
    setSelectedWorkerId(null);
    setMode("paste");
    setStatus({ text: "", type: "" });
  }, []);

  // ===== LOAD DAY (schedule 상태 사용) =====
  const loadDay = useCallback(
    (day) => {
      const list = schedule[day];
      if (!list) return;
      setClassrooms((prev) => prev.map((c) => ({ ...c, inspectorId: null })));
      setSelectedWorkerId(null);
      workerCounterRef.current = 1;
      setWorkers(
        list.map((w, i) => ({
          id: uid(),
          number: i + 1,
          name: w.name,
          workTimes: w.workTimes,
        })),
      );
      workerCounterRef.current = list.length + 1;
      setSelectedDay(day);
      showStatus(`${day}요일 출근자 ${list.length}명 등록됨`, "ok");
    },
    [showStatus, schedule],
  );

  // ===== WORKERS =====
  const addWorker = useCallback((name, time1, time2) => {
    const workTimes = time2 ? [time1, time2] : [time1];
    setWorkers((prev) => [
      ...prev,
      { id: uid(), number: workerCounterRef.current++, name, workTimes },
    ]);
  }, []);

  const removeWorker = useCallback((id) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.inspectorId === id ? { ...c, inspectorId: null } : c)),
    );
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setSelectedWorkerId((prev) => (prev === id ? null : prev));
  }, []);

  const updateWorker = useCallback((id, workTimes) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, workTimes } : w)),
    );
  }, []);

  const selectWorker = useCallback((id) => {
    setSelectedWorkerId((prev) => (prev === id ? null : id));
  }, []);

  // ===== UPDATE CLASSROOM =====
  const updateClassroom = useCallback((id, timeSlots) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, timeSlots } : c)),
    );
  }, []);

  // ===== EVENTS =====
  const addEvent = useCallback((room, time) => {
    setEvents((prev) => [...prev, { id: uid(), room, time }]);
  }, []);

  const removeEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // 스케줄(시간표 페이지)이 바뀔 때 WorkerPanel의 workers 자동 동기화
  useEffect(() => {
    if (!selectedDay) return;
    const scheduleList = schedule[selectedDay] || [];
    setWorkers((prev) => {
      const updated = scheduleList.map((sw) => {
        const existing = prev.find((w) => w.name === sw.name);
        if (existing) {
          if (JSON.stringify(existing.workTimes) === JSON.stringify(sw.workTimes))
            return existing; // 변경 없음 → 동일 참조 유지
          return { ...existing, workTimes: sw.workTimes };
        }
        // 새로 추가된 근무자
        return { id: uid(), number: workerCounterRef.current++, name: sw.name, workTimes: sw.workTimes };
      });
      const unchanged = updated.length === prev.length && updated.every((w, i) => w === prev[i]);
      return unchanged ? prev : updated;
    });
  }, [schedule, selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // 행사가 바뀔 때마다 기존 배정 재검토 → 더 이상 점검 불가한 강의실은 배정 해제
  useEffect(() => {
    setClassrooms((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (!c.inspectorId) return c;
        const effective = computeEffectiveSlots(c, events);
        const tempC =
          effective === c.timeSlots ? c : { ...c, effectiveSlots: effective };
        const w = workers.find((w) => w.id === c.inspectorId);
        if (!w || !canInspect(w, tempC)) {
          changed = true;
          return { ...c, inspectorId: null };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== AUTO ASSIGN =====
  const runAssign = useCallback(
    (forceShuffle = false) => {
      setIsAssigning(true);
      setSelectedWorkerId(null);
      setTimeout(() => {
        setClassrooms((prev) => {
          const enriched = prev.map((c) => {
            const effectiveSlots = computeEffectiveSlots(c, events);
            return effectiveSlots === c.timeSlots
              ? c
              : { ...c, effectiveSlots };
          });
          const result = autoAssign(enriched, workers, { forceShuffle });
          const stripped = result.map(({ effectiveSlots: _, ...c }) => c);
          const assigned = stripped.filter((c) => c.inspectorId).length;
          const unassigned = stripped.filter(
            (c) => c.timeSlots.length > 0 && !c.inspectorId,
          ).length;
          if (unassigned > 0) {
            showStatus(
              `자동 배정 완료: ${assigned}개 배정, ${unassigned}개 미배정 (근무시간 불일치)`,
              "warn",
            );
          } else {
            showStatus(`자동 배정 완료: ${assigned}개 전체 배정`, "ok");
          }
          return stripped;
        });
        setIsAssigning(false);
        setShowReassignBanner(true);
      }, 30);
    },
    [workers, events, showStatus],
  );

  const handleAutoAssign = useCallback(() => runAssign(false), [runAssign]);
  const handleReAssign = useCallback(() => runAssign(true), [runAssign]);

  // ===== INSPECTOR CLICK =====
  const handleInspectorClick = useCallback(
    (classroomId) => {
      setClassrooms((prev) => {
        const classroom = prev.find((c) => c.id === classroomId);
        if (!classroom) return prev;

        if (!selectedWorkerId) {
          if (classroom.inspectorId) setSelectedWorkerId(classroom.inspectorId);
          return prev;
        }

        if (classroom.inspectorId === selectedWorkerId) {
          setSelectedWorkerId(null);
          showStatus(`${classroom.room} 배정 해제`, "info");
          return prev.map((c) =>
            c.id === classroomId ? { ...c, inspectorId: null } : c,
          );
        }

        if (classroom.inspectorId) {
          showStatus(`${classroom.room} 배정 변경`, "info");
          return prev.map((c) =>
            c.id === classroomId ? { ...c, inspectorId: selectedWorkerId } : c,
          );
        }

        showStatus(`${classroom.room} 배정 완료`, "ok");
        return prev.map((c) =>
          c.id === classroomId ? { ...c, inspectorId: selectedWorkerId } : c,
        );
      });
    },
    [selectedWorkerId, showStatus],
  );

  if (page === "schedule") {
    return (
      <SchedulePage
        schedule={schedule}
        onScheduleChange={handleScheduleChange}
        onBack={() => setPage("main")}
      />
    );
  }

  return (
    <>
      <header className="app-header">
        강의실 점검 배정 시스템
        <button className="sch-nav-btn" onClick={() => setPage("schedule")}>
          📅 시간표 보기
        </button>
      </header>
      <div className="app-main">
        <ClassroomPanel
          classrooms={enrichedClassrooms}
          workers={workers}
          selectedWorkerId={selectedWorkerId}
          mode={mode}
          status={status}
          events={events}
          onImport={importData}
          onClear={clearAll}
          onSwitchToPaste={() => setMode("paste")}
          manualMode={manualMode}
          onToggleManualMode={() => setManualMode((v) => !v)}
          onInspectorClick={handleInspectorClick}
          onAutoAssign={handleAutoAssign}
          onReAssign={handleReAssign}
          isAssigning={isAssigning}
          onUpdateClassroom={updateClassroom}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
        />
        <WorkerPanel
          workers={workers}
          classrooms={enrichedClassrooms}
          selectedWorkerId={selectedWorkerId}
          selectedDay={selectedDay}
          manualMode={manualMode}
          onAddWorker={addWorker}
          onRemoveWorker={removeWorker}
          onUpdateWorker={updateWorker}
          onSelectWorker={selectWorker}
          onLoadDay={loadDay}
          showStatus={showStatus}
          showReassignBanner={showReassignBanner}
          onReAssign={handleReAssign}
          onDismissReassignBanner={() => setShowReassignBanner(false)}
        />
      </div>
      <div className="app-version">v1.4.0</div>
    </>
  );
}
