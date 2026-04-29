import { MouseEvent, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { activeLinePointStartAtom, activePointIdAtom, annotationsAtom, makeObservationKey, makePointColor, selectedImageSetIdAtom, toolModeAtom, upsertPointPosition } from "../state/annotationAtoms";
import type { ImageFrame, PointPosition } from "../types/annotations";

type Props = {
  frame: ImageFrame;
};

type PointLike = { x: number; y: number };

function distance(a: PointLike, b: PointLike) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function FrameCanvas({ frame }: Props) {
  const selectedImageSetId = useAtomValue(selectedImageSetIdAtom);
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [toolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [lineStartPointId, setLineStartPointId] = useAtom(activeLinePointStartAtom);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<PointLike | null>(null);

  const observationKey = selectedImageSetId ? makeObservationKey(selectedImageSetId, frame.id) : frame.id;

  const visiblePoints = useMemo(() => {
    return Object.values(annotations.pointPositionsByPointId)
      .map(byImage => byImage[observationKey])
      .filter(Boolean) as PointPosition[];
  }, [annotations.pointPositionsByPointId, observationKey]);

  const visibleLines = useMemo(() => {
    return Object.values(annotations.lineOccurrencesByLineId)
      .map(byImage => byImage[observationKey])
      .filter(Boolean);
  }, [annotations.lineOccurrencesByLineId, observationKey]);

  function imageCoords(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function nearestPoint(pos: PointLike) {
    let best: PointPosition | null = null;
    let bestDistance = Infinity;
    for (const point of visiblePoints) {
      const d = distance(pos, point);
      if (d < bestDistance) {
        best = point;
        bestDistance = d;
      }
    }
    return bestDistance < 1.8 ? best : null;
  }

  function createOrPlacePoint(pos: PointLike) {
    if (!selectedImageSetId) return;
    const nextPointId = activePointId ?? `point-${Object.keys(annotations.pointsById).length + 1}`;
    setAnnotations(current => {
      const existingPoint = current.pointsById[nextPointId];
      const nextPoint = existingPoint ?? {
        id: nextPointId,
        color: makePointColor(Object.keys(current.pointsById).length),
      };
      const updated = {
        ...current,
        pointsById: {
          ...current.pointsById,
          [nextPointId]: nextPoint,
        },
      };
      return upsertPointPosition(updated, {
        pointId: nextPointId,
        imageSetId: selectedImageSetId,
        imageId: frame.id,
        x: pos.x,
        y: pos.y,
      });
    });
    setActivePointId(nextPointId);
  }

  function deletePoint(pointId: string) {
    setAnnotations(current => {
      const positions = { ...(current.pointPositionsByPointId[pointId] ?? {}) };
      delete positions[observationKey];
      const lineOccurrencesByLineId = Object.fromEntries(
        Object.entries(current.lineOccurrencesByLineId).map(([lineId, byImage]) => {
          const nextByImage = { ...byImage };
          const occurrence = nextByImage[observationKey];
          if (occurrence && (occurrence.startPointId === pointId || occurrence.endPointId === pointId)) {
            delete nextByImage[observationKey];
          }
          return [lineId, nextByImage];
        }),
      );
      return {
        ...current,
        pointPositionsByPointId: {
          ...current.pointPositionsByPointId,
          [pointId]: positions,
        },
        lineOccurrencesByLineId,
      };
    });
  }

  function movePoint(pointId: string, pos: PointLike) {
    if (!selectedImageSetId) return;
    setAnnotations(current =>
      upsertPointPosition(current, {
        pointId,
        imageSetId: selectedImageSetId,
        imageId: frame.id,
        x: pos.x,
        y: pos.y,
      }),
    );
  }

  function joinPoint(pointId: string) {
    if (!selectedImageSetId) return;
    if (!lineStartPointId) {
      setLineStartPointId(pointId);
      return;
    }
    if (lineStartPointId === pointId) {
      setLineStartPointId(null);
      return;
    }
    setAnnotations(current => {
      const lineId = `line-${Object.keys(current.linesById).length + 1}`;
      return {
        ...current,
        linesById: {
          ...current.linesById,
          [lineId]: { id: lineId },
        },
        lineOccurrencesByLineId: {
          ...current.lineOccurrencesByLineId,
          [lineId]: {
            [observationKey]: {
              lineId,
              imageSetId: selectedImageSetId,
              imageId: frame.id,
              startPointId: lineStartPointId,
              endPointId: pointId,
            },
          },
        },
      };
    });
    setLineStartPointId(null);
  }

  function onCanvasMouseDown(event: MouseEvent<HTMLDivElement>) {
    const pos = imageCoords(event);
    const hitPoint = nearestPoint(pos);
    if (hitPoint) {
      setActivePointId(hitPoint.pointId);
      if (toolMode === "delete-point") {
        deletePoint(hitPoint.pointId);
        return;
      }
      if (toolMode === "move-point") {
        setDraggingPointId(hitPoint.pointId);
        return;
      }
      if (toolMode === "join-points") {
        joinPoint(hitPoint.pointId);
        return;
      }
    }
    if (toolMode === "new-point") createOrPlacePoint(pos);
  }

  function onCanvasMouseMove(event: MouseEvent<HTMLDivElement>) {
    const pos = imageCoords(event);
    setCursorPos(pos);
    if (draggingPointId) movePoint(draggingPointId, pos);
  }

  return (
    <div
      className="frame-canvas"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={() => setCursorPos(null)}
      onMouseUp={() => setDraggingPointId(null)}
    >
      <img src={frame.url} alt={frame.label} draggable={false} />
      <svg className="annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {visibleLines.map(line => {
          const start = annotations.pointPositionsByPointId[line.startPointId]?.[observationKey];
          const end = annotations.pointPositionsByPointId[line.endPointId]?.[observationKey];
          if (!start || !end) return null;
          return <line key={line.lineId} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="annotation-line" />;
        })}
      </svg>
      {visiblePoints.map(point => {
        const definition = annotations.pointsById[point.pointId];
        return (
          <button
            key={point.pointId}
            className={`point-marker ${point.pointId === activePointId ? "active" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, background: definition?.color ?? "#ff4971" }}
            type="button"
            title={point.pointId}
          />
        );
      })}
      {cursorPos && (
        <div className="zoom-box" style={{ left: `${Math.min(cursorPos.x + 2, 72)}%`, top: `${Math.min(cursorPos.y + 2, 72)}%` }}>
          <div className="zoom-image" style={{ backgroundImage: `url(${frame.url})`, backgroundPosition: `${cursorPos.x}% ${cursorPos.y}%` }} />
          <span className="zoom-crosshair" />
        </div>
      )}
    </div>
  );
}
