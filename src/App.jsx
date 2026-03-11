import { useState, useRef, useCallback, useMemo } from "react";
import { parseData, uid, autoAssign, computeEffectiveSlots } from "./utils";
import { SCHEDULE } from "./schedule";
import ClassroomPanel from "./ClassroomPanel";
import WorkerPanel from "./WorkerPanel";

export default function App() {
  const [classrooms, setClassrooms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [mode, setMode] = useState("paste"); // 'paste' | 'table'
  const [status, setStatus] = useState({ text: "", type: "" });

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

  // ===== LOAD DAY =====
  const loadDay = useCallback(
    (day) => {
      const list = SCHEDULE[day];
      if (!list) return;
      // 배정 초기화 후 해당 요일 근무자 일괄 등록
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
    [showStatus],
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

  // ===== AUTO ASSIGN =====
  const handleAutoAssign = useCallback(() => {
    setClassrooms((prev) => {
      const enriched = prev.map((c) => {
        const effectiveSlots = computeEffectiveSlots(c, events);
        return effectiveSlots === c.timeSlots ? c : { ...c, effectiveSlots };
      });
      const result = autoAssign(enriched, workers);
      // strip effectiveSlots from result, keep only the base classroom data + inspectorId
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
    setSelectedWorkerId(null);
  }, [workers, events, showStatus]);

  // ===== INSPECTOR CLICK =====
  const handleInspectorClick = useCallback(
    (classroomId) => {
      setClassrooms((prev) => {
        const classroom = prev.find((c) => c.id === classroomId);
        if (!classroom) return prev;

        // 선택된 근로자 없음 → 배정된 근로자 선택
        if (!selectedWorkerId) {
          if (classroom.inspectorId) setSelectedWorkerId(classroom.inspectorId);
          return prev;
        }

        // 자기 칸 재클릭 → 해제
        if (classroom.inspectorId === selectedWorkerId) {
          setSelectedWorkerId(null);
          showStatus(`${classroom.room} 배정 해제`, "info");
          return prev.map((c) =>
            c.id === classroomId ? { ...c, inspectorId: null } : c,
          );
        }

        // 다른 사람 배정 칸 → 교체 (선택 유지)
        if (classroom.inspectorId) {
          showStatus(`${classroom.room} 배정 변경`, "info");
          return prev.map((c) =>
            c.id === classroomId ? { ...c, inspectorId: selectedWorkerId } : c,
          );
        }

        // 빈 칸 → 추가 배정 (선택 유지)
        showStatus(`${classroom.room} 배정 완료`, "ok");
        return prev.map((c) =>
          c.id === classroomId ? { ...c, inspectorId: selectedWorkerId } : c,
        );
      });
    },
    [selectedWorkerId, showStatus],
  );

  return (
    <>
      <header className="app-header">강의실 점검 배정 시스템</header>
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
        />
      </div>
    </>
  );
}
