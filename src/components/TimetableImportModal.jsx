import { useEffect, useRef, useState } from "react";
import { DAYS, PALETTE } from "../schedule";
import {
  gridFromTsv,
  isXlsxFile,
  parseTimetableGrid,
  readXlsxFile,
} from "../timetable";

/**
 * 엑셀 시간표 불러오기.
 * 파일을 떨어뜨리거나 고르거나 복붙하면 파싱해서 미리보기를 보여주고,
 * "적용"을 누를 때만 실제 시간표를 바꾼다. (파싱이 어긋났을 때 기존 데이터를 지키기 위해)
 */
import Icon from "./Icon";

export default function TimetableImportModal({ initialFile, onApply, onClose }) {
  const [parsed, setParsed] = useState(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

  async function handleFile(file) {
    if (!file) return;
    if (!isXlsxFile(file)) {
      setError(`"${file.name}" 은 엑셀 파일이 아닙니다. .xlsx 파일을 올려주세요.`);
      setParsed(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setParsed(parseTimetableGrid(await readXlsxFile(file)));
      setSource(file.name);
    } catch (e) {
      setError(`엑셀을 읽지 못했습니다: ${e.message}`);
      setParsed(null);
    } finally {
      setBusy(false);
    }
  }

  function handleText(value) {
    setText(value);
    if (!value.trim()) {
      setParsed(null);
      setError("");
      return;
    }
    setError("");
    setParsed(parseTimetableGrid(gridFromTsv(value)));
    setSource("붙여넣은 내용");
  }

  // 모달이 열릴 때 이미 떨어뜨린 파일이 있으면 바로 파싱
  useEffect(() => {
    if (initialFile) handleFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onDragEnter(e) {
    e.preventDefault();
    dragDepth.current++;
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFile(e.dataTransfer?.files?.[0]);
  }

  const total = parsed ? parsed.names.length : 0;
  const fromExcelCount = parsed
    ? parsed.names.filter((n) => parsed.colors?.[n]).length
    : 0;
  const canApply = total > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box tt-import-box"
        onClick={(e) => e.stopPropagation()}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="modal-header">
          <span>엑셀 시간표 불러오기</span>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="tt-import-body">
          <div className={`tt-dropzone${dragging ? " tt-dropzone-active" : ""}`}>
            <div className="tt-dropzone-icon">
              <Icon name={dragging ? "download" : "table"} size={28} strokeWidth={1.5} />
            </div>
            <div className="tt-dropzone-main">
              {dragging
                ? "여기에 놓으세요"
                : "엑셀 파일(.xlsx)을 이 창에 끌어다 놓으세요"}
            </div>
            <div className="tt-dropzone-sub">또는</div>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {busy ? "읽는 중…" : "📁 파일 선택"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <details className="tt-paste-details">
            <summary>파일이 안 되면 엑셀에서 직접 복사해 붙여넣기</summary>
            <p className="tt-paste-help">
              엑셀에서 <strong>제목·요일·시간 행을 모두 포함해</strong> 표 전체를
              선택하고 Ctrl+C 한 뒤, 아래에 Ctrl+V 하세요.
            </p>
            <textarea
              className="tt-paste-area"
              value={text}
              onChange={(e) => handleText(e.target.value)}
              placeholder={
                "2026학년도 2학기 근로시간표\n시간\t월\t\t\t\t\t화 …\n08:30~09:00\t예인\t동균\t소은 …"
              }
              spellCheck={false}
            />
          </details>

          {error && <div className="tt-import-error">⚠ {error}</div>}

          {parsed && (
            <div className="tt-preview">
              <div className="tt-preview-head">
                미리보기 <span className="tt-preview-src">{source}</span>
              </div>

              {parsed.title && (
                <div className="tt-preview-title">{parsed.title}</div>
              )}

              <div className="tt-preview-days">
                {DAYS.map((day) => (
                  <div key={day} className="tt-preview-day">
                    <div className="tt-preview-day-name">{day}</div>
                    <div
                      className={`tt-preview-day-count${
                        parsed.dayCounts[day] === 0 ? " tt-zero" : ""
                      }`}
                    >
                      {parsed.dayCounts[day]}명
                    </div>
                  </div>
                ))}
              </div>

              <div className="tt-preview-label">
                근무자 {total}명{" "}
                <span>
                  {fromExcelCount > 0
                    ? fromExcelCount === total
                      ? "— 색은 엑셀에 칠해진 색을 그대로 씁니다"
                      : `— ${fromExcelCount}명은 엑셀 색, 나머지는 자동 배정`
                    : "— 색은 순서대로 자동 배정됩니다"}
                </span>
              </div>
              <div className="tt-preview-names">
                {parsed.names.map((name, i) => (
                  <span
                    key={name}
                    className="tt-preview-chip"
                    style={{
                      background:
                        parsed.colors?.[name] ?? PALETTE[i % PALETTE.length],
                    }}
                  >
                    {name}
                  </span>
                ))}
                {total === 0 && (
                  <span className="tt-preview-none">
                    근무자를 찾지 못했습니다
                  </span>
                )}
              </div>

              {parsed.warnings.length > 0 && (
                <div className="tt-warnings">
                  <div className="tt-warnings-head">
                    확인이 필요한 항목 {parsed.warnings.length}건
                  </div>
                  <ul>
                    {parsed.warnings.slice(0, 12).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {parsed.warnings.length > 12 && (
                      <li>… 외 {parsed.warnings.length - 12}건</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tt-import-footer">
          <span className="tt-import-note">
            적용하면 지금 시간표와 배정 내용이 새 시간표로 교체됩니다.
          </span>
          <div className="tt-import-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
            <button
              className="btn btn-primary"
              disabled={!canApply}
              onClick={() => onApply(parsed)}
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
