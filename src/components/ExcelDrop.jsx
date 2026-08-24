import Icon from "./Icon";
import { useRef, useState } from "react";
import { isXlsxFile } from "../timetable";

/**
 * 화면 아무 곳에나 엑셀 파일을 떨어뜨릴 수 있게 해주는 훅.
 * 배정 화면과 시간표 화면이 같이 쓴다.
 *
 * const { dragging, dropProps } = useExcelDrop(onFile, onReject);
 * <div {...dropProps}> … <ExcelDropOverlay show={dragging} /> </div>
 */
export function useExcelDrop(onFile, onReject) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  function hasFiles(e) {
    return !!e.dataTransfer?.types?.includes("Files");
  }

  return {
    dragging,
    dropProps: {
      onDragEnter(e) {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current++;
        setDragging(true);
      },
      onDragOver(e) {
        if (hasFiles(e)) e.preventDefault();
      },
      onDragLeave() {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      },
      onDrop(e) {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (!isXlsxFile(file)) {
          onReject?.(file);
          return;
        }
        onFile(file);
      },
    },
  };
}

export function ExcelDropOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="sch-drop-overlay">
      <div className="sch-drop-overlay-box">
        <div className="sch-drop-overlay-icon">
          <Icon name="download" size={26} strokeWidth={1.6} />
        </div>
        엑셀 파일을 여기에 놓으세요
      </div>
    </div>
  );
}
