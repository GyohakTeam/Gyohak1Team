import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  parseData,
  uid,
  autoAssign,
  computeEffectiveSlots,
  canInspect,
} from "./utils";
import {
  DAYS,
  clearRoster,
  emptySchedule,
  isScheduleEmpty,
  registerNames,
  resetRoster,
} from "./schedule";
import ClassroomPanel from "./components/classroom/ClassroomPanel";
import WorkerPanel from "./components/worker/WorkerPanel";
import SchedulePage from "./components/SchedulePage";
import PatchNotesModal from "./components/PatchNotesModal";
import TimetableImportModal from "./components/TimetableImportModal";
import AppHeader, { HeaderMark } from "./components/AppHeader";
import Icon from "./components/Icon";
import Toast from "./components/Toast";
import { ExcelDropOverlay, useExcelDrop } from "./components/ExcelDrop";

const STORAGE_KEY = "gyohak-timetable";

/**
 * 저장된 시간표를 읽는다.
 * 버전이 다르다고 저장 내용을 버리지는 않는다 — 예전에는 상수 하나만 올려도
 * 사용자가 손으로 고친 시간표가 조용히 전부 사라졌다.
 */
function readTimetable() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.v === 2 && parsed.schedule) {
        const clean = emptySchedule();
        for (const day of DAYS) {
          clean[day] = (parsed.schedule[day] || [])
            .filter(
              (w) => w?.name && Array.isArray(w.workTimes) && w.workTimes.length,
            )
            .map((w) => ({ name: w.name, workTimes: [...w.workTimes] }));
        }
        return { title: parsed.title || "", schedule: clean };
      }
    }
  } catch { }
  // 기본값은 빈 시간표 — 명단은 시간표 페이지에서 엑셀로 불러온다
  return { title: "", schedule: emptySchedule() };
}

let _initial = null;
function initial() {
  if (!_initial) _initial = readTimetable();
  return _initial;
}

export default function App() {
  const [page, setPage] = useState("main"); // 'main' | 'schedule'
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [importFile, setImportFile] = useState(null); // 드래그로 떨어뜨린 파일
  const [showImport, setShowImport] = useState(false);
  const [schedule, setSchedule] = useState(() => initial().schedule);
  const [title, setTitle] = useState(() => initial().title);

  const [classrooms, setClassrooms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [mode, setMode] = useState("paste"); // 'paste' | 'table'
  const [status, setStatus] = useState({ text: "", type: "" });
  const [isAssigning, setIsAssigning] = useState(false);
  const [showReassignBanner, setShowReassignBanner] = useState(false);

  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([]);

  // 시간표에 등록된 전체 근무자 수 (헤더 부제용)
  const rosterCount = useMemo(() => {
    const names = new Set();
    for (const day of DAYS)
      for (const w of schedule[day] || []) names.add(w.name);
    return names.size;
  }, [schedule]);

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
  const pendingRemovedIdsRef = useRef([]);
  const workersRef = useRef(workers);
  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

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

  // ===== SCHEDULE CHANGE =====
  const handleScheduleChange = useCallback((newSchedule) => {
    setSchedule(newSchedule);
  }, []);

  // ===== 배정 상태 초기화 (시간표가 통째로 바뀔 때) =====
  const resetAssignments = useCallback(() => {
    setWorkers([]);
    setSelectedWorkerId(null);
    setSelectedDay(null);
    setShowReassignBanner(false);
    workerCounterRef.current = 1;
    pendingRemovedIdsRef.current = [];
    setClassrooms((prev) => prev.map((c) => ({ ...c, inspectorId: null })));
  }, []);

  // ===== 엑셀 시간표 불러오기 =====
  const importTimetable = useCallback(
    ({ title: newTitle, schedule: newSchedule, names, colors }) => {
      // 엑셀 셀 색이 있으면 그 색으로, 없으면 명단 순서대로 팔레트에서 배정
      resetRoster(names, colors);
      setSchedule(newSchedule);
      setTitle(newTitle || "");
      resetAssignments(); // 이전 명단·배정은 새 시간표와 맞지 않는다
    },
    [resetAssignments],
  );

  // ===== 불러오기 모달 =====
  const openImport = useCallback((file = null) => {
    setImportFile(file);
    setShowImport(true);
  }, []);

  const closeImport = useCallback(() => {
    setShowImport(false);
    setImportFile(null);
  }, []);

  const applyImport = useCallback(
    (parsed) => {
      importTimetable(parsed);
      closeImport();
      showStatus(
        `${parsed.names.length}명의 시간표를 불러왔습니다. 요일을 선택하세요.`,
        "ok",
      );
    },
    [importTimetable, closeImport, showStatus],
  );

  // ===== 화면 아무 곳에나 엑셀을 떨어뜨리면 불러오기 =====
  const { dragging, dropProps } = useExcelDrop(
    (file) => openImport(file),
    (file) =>
      showStatus(
        `"${file.name}" 은 엑셀 파일이 아닙니다. .xlsx 파일을 올려주세요.`,
        "err",
      ),
  );

  // ===== 시간표 전체 비우기 =====
  const clearTimetable = useCallback(() => {
    clearRoster();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { }
    setSchedule(emptySchedule());
    setTitle("");
    resetAssignments();
  }, [resetAssignments]);

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
      if (list.length === 0) {
        showStatus(
          isScheduleEmpty(schedule)
            ? "시간표가 비어 있습니다 — 상단 '엑셀 불러오기'로 근로시간표를 읽어오세요."
            : `${day}요일에 등록된 근무자가 없습니다.`,
          "warn",
        );
        return;
      }
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
    registerNames([name]); // 시간표에 없는 이름도 색을 받는다
    setWorkers((prev) => [
      ...prev,
      { id: uid(), number: workerCounterRef.current++, name, workTimes },
    ]);
  }, []);

  const removeWorker = useCallback(
    (id) => {
      const worker = workersRef.current.find((w) => w.id === id);
      setClassrooms((prev) =>
        prev.map((c) =>
          c.inspectorId === id ? { ...c, inspectorId: null } : c,
        ),
      );
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      setSelectedWorkerId((prev) => (prev === id ? null : prev));
      if (worker && selectedDay) {
        setSchedule((prev) => ({
          ...prev,
          [selectedDay]: (prev[selectedDay] || []).filter(
            (sw) => sw.name !== worker.name,
          ),
        }));
      }
    },
    [selectedDay],
  );

  const updateWorker = useCallback(
    (id, workTimes) => {
      const worker = workersRef.current.find((w) => w.id === id);
      setWorkers((prev) =>
        prev.map((w) => (w.id === id ? { ...w, workTimes } : w)),
      );
      if (worker && selectedDay) {
        setSchedule((prev) => ({
          ...prev,
          [selectedDay]: (prev[selectedDay] || []).map((sw) =>
            sw.name === worker.name ? { ...sw, workTimes } : sw,
          ),
        }));
      }
    },
    [selectedDay],
  );

  const selectWorker = useCallback((id) => {
    setSelectedWorkerId((prev) => (prev === id ? null : id));
  }, []);

  // ===== UPDATE CLASSROOM =====
  const updateClassroom = useCallback((id, timeSlots) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, timeSlots } : c)),
    );
  }, []);

  const unassignRoom = useCallback((id) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, inspectorId: null } : c)),
    );
  }, []);

  // ===== EVENTS =====
  const addEvent = useCallback((room, time) => {
    setEvents((prev) => [...prev, { id: uid(), room, time }]);
  }, []);

  const removeEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // 시간표 변경 시 localStorage 자동 저장 (색은 schedule.js 가 따로 저장)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, title, schedule }));
    } catch { }
  }, [schedule, title]);

  // 스케줄(시간표 페이지)이 바뀔 때 WorkerPanel의 workers 자동 동기화
  useEffect(() => {
    if (!selectedDay) return;
    const scheduleList = schedule[selectedDay] || [];
    setWorkers((prev) => {
      const scheduleNames = new Set(scheduleList.map((sw) => sw.name));
      const manualWorkers = prev.filter((w) => !scheduleNames.has(w.name));
      const updated = [
        ...scheduleList.map((sw) => {
          const existing = prev.find((w) => w.name === sw.name);
          if (existing) {
            if (
              JSON.stringify(existing.workTimes) ===
              JSON.stringify(sw.workTimes)
            )
              return existing;
            return { ...existing, workTimes: sw.workTimes };
          }
          return {
            id: uid(),
            number: workerCounterRef.current++,
            name: sw.name,
            workTimes: sw.workTimes,
          };
        }),
        ...manualWorkers,
      ];
      const unchanged =
        updated.length === prev.length &&
        updated.every((w, i) => w === prev[i]);
      if (!unchanged) {
        const updatedIdSet = new Set(updated.map((w) => w.id));
        pendingRemovedIdsRef.current = prev
          .filter((w) => !updatedIdSet.has(w.id))
          .map((w) => w.id);
      }
      return unchanged ? prev : updated;
    });
  }, [schedule, selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스케줄에서 제거된 근무자의 강의실 배정 해제
  useEffect(() => {
    if (pendingRemovedIdsRef.current.length === 0) return;
    const removedIds = pendingRemovedIdsRef.current;
    pendingRemovedIdsRef.current = [];
    setClassrooms((prev) =>
      prev.map((c) =>
        removedIds.includes(c.inspectorId) ? { ...c, inspectorId: null } : c,
      ),
    );
  }, [workers]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const importModal = showImport ? (
    <TimetableImportModal
      initialFile={importFile}
      onApply={applyImport}
      onClose={closeImport}
    />
  ) : null;

  if (page === "schedule") {
    return (
      <>
        <SchedulePage
          schedule={schedule}
          title={title}
          rosterCount={rosterCount}
          onScheduleChange={handleScheduleChange}
          onTitleChange={setTitle}
          onOpenImport={openImport}
          onBack={() => setPage("main")}
          onClearAll={clearTimetable}
        />
        {importModal}
      </>
    );
  }

  const scheduleEmpty = isScheduleEmpty(schedule);

  return (
    <div className="app-shell" {...dropProps}>
      <AppHeader
        left={<HeaderMark />}
        title={
          <div className="hdr-title">
            강의실 점검 배정 시스템
            <span className="hdr-ver">v1.9.0</span>
          </div>
        }
        subtitle={
          scheduleEmpty ? (
            <span className="hdr-sub-warn">
              <Icon name="alert" size={13} />
              시간표 없음 — 엑셀 파일을 불러오세요
            </span>
          ) : (
            <>
              {title || "근로시간표"}
              <span className="hdr-dot">·</span>
              {selectedDay
                ? `${selectedDay}요일 ${workers.length}명`
                : `근무자 ${rosterCount}명`}
            </>
          )
        }
        actions={
          <>
            <button className="hdr-btn hdr-btn-primary" onClick={() => openImport()}>
              <Icon name="download" size={15} />
              시간표 불러오기
            </button>
            <button
              className="hdr-btn hdr-btn-primary"
              onClick={() => setPage("schedule")}
            >
              <Icon name="calendar-days" size={15} />
              시간표
            </button>
            <button
              className="hdr-btn hdr-btn-icon"
              title="패치 내역"
              onClick={() => setShowPatchNotes(true)}
            >
              <Icon name="clipboard-list" size={16} />
            </button>
          </>
        }
      />
      {showPatchNotes && (
        <PatchNotesModal onClose={() => setShowPatchNotes(false)} />
      )}
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
          onInspectorClick={handleInspectorClick}
          onAutoAssign={handleAutoAssign}
          onReAssign={handleReAssign}
          isAssigning={isAssigning}
          onUpdateClassroom={updateClassroom}
          onUnassign={unassignRoom}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
        />
        <WorkerPanel
          workers={workers}
          classrooms={enrichedClassrooms}
          schedule={schedule}
          selectedWorkerId={selectedWorkerId}
          selectedDay={selectedDay}
          onAddWorker={addWorker}
          onRemoveWorker={removeWorker}
          onUpdateWorker={updateWorker}
          onSelectWorker={selectWorker}
          onLoadDay={loadDay}
          scheduleEmpty={isScheduleEmpty(schedule)}
          onGoSchedule={() => setPage("schedule")}
          showStatus={showStatus}
          showReassignBanner={showReassignBanner}
          onReAssign={handleReAssign}
          onDismissReassignBanner={() => setShowReassignBanner(false)}
        />
      </div>
      {mode === "table" && (
        <Toast status={status} onDismiss={() => setStatus({ text: "", type: "" })} />
      )}
      <ExcelDropOverlay show={dragging} />
      {importModal}
    </div>
  );
}
