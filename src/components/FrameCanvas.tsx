import { MouseEvent, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";

import {
  activeLineIdAtom,
  activeLinePointStartAtom,
  activePointIdAtom,
  annotationsAtom,
  makeLineColor,
  makeObservationKey,
  makePointColor,
  selectedImageSetIdAtom,
  toolModeAtom,
  upsertLineOccurrence,
  upsertPointPosition,
} from "../state/annotationAtoms";
import type { ImageFrame, ImagePoint, LineOccurrence, PointPosition } from "../types/annotations";

type Props = {
  frame: ImageFrame;
};

type PointLike = {
  x: number;
  y: number;
};

type DragState =
  | { kind: "point"; pointId: string }
  | { kind: "line"; lineId: string; last: ImagePoint }
  | null;

function distance(a: PointLike, b: PointLike) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: PointLike, start: PointLike, end: PointLike) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return distance(point, start);

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  return distance(point, projection);
}

function lineEndpoints(line: LineOccurrence, positions: Record<string, Record<string, PointPosition>>, observationKey: string) {
  if (line.start && line.end) return { start: line.start, end: line.end };

  if (line.startPointId && line.endPointId) {
    const start = positions[line.startPointId]?.[observationKey];
    const end = positions[line.endPointId]?.[observationKey];
    if (start && end) return { start, end };
  }

  return null;
}

export function FrameCanvas({ frame }: Props) {
  const selectedImageSetId = useAtomValue(selectedImageSetIdAtom);
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [toolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [activeLineId, setActiveLineId] = useAtom(activeLineIdAtom);
  const [lineStartPointId, setLineStartPointId] = useAtom(activeLinePointStartAtom);

  const [dragging, setDragging] = useState<DragState>(null);
  const [cursorPos, setCursorPos] = useState<ImagePoint | null>(null);
  const [pendingLineStart, setPendingLineStart] = useState<ImagePoint | null>(null);

  const observationKey = selectedImageSetId ? makeObservationKey(selectedImageSetId, frame.id) : frame.id;

  const visiblePoints = useMemo(() => {
    return Object.values(annotations.pointPositionsByPointId)
      .map(byImage => byImage[observationKey])
      .filter(Boolean) as PointPosition[];
  }, [annotations.pointPositionsByPointId, observationKey]);

  const visibleLines = useMemo(() => {
    return Object.values(annotations.lineOccurrencesByLineId)
      .map(byImage => byImage[observationKey])
      .filter(Boolean) as LineOccurrence[];
  }, [annotations.lineOccurrencesByLineId, observationKey]);

  function imageCoords(event: MouseEvent<HTMLElement>): ImagePoint {
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

  function nearestLine(pos: PointLike) {
    let best: LineOccurrence | null = null;
    let bestDistance = Infinity;

    for (const line of visibleLines) {
      const endpoints = lineEndpoints(line, annotations.pointPositionsByPointId, observationKey);
      if (!endpoints) continue;

      const d = distanceToSegment(pos, endpoints.start, endpoints.end);
      if (d < bestDistance) {
        best = line;
        bestDistance = d;
      }
    }

    return bestDistance < 1.4 ? best : null;
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
    setActiveLineId(null);
  }

  function createLooseLine(start: ImagePoint, end: ImagePoint) {
    if (!selectedImageSetId) return;

    const lineId = `line-${crypto.randomUUID()}`;

    setAnnotations(current => {
      const updated = {
        ...current,
        linesById: {
          ...current.linesById,
          [lineId]: {
            id: lineId,
            color: makeLineColor(Object.keys(current.linesById).length),
          },
        },
      };

      return upsertLineOccurrence(updated, {
        lineId,
        imageSetId: selectedImageSetId,
        imageId: frame.id,
        start,
        end,
      });
    });

    setActiveLineId(lineId);
    setActivePointId(null);
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

  function deleteLine(lineId: string) {
    setAnnotations(current => {
      const occurrences = { ...(current.lineOccurrencesByLineId[lineId] ?? {}) };
      delete occurrences[observationKey];

      return {
        ...current,
        lineOccurrencesByLineId: {
          ...current.lineOccurrencesByLineId,
          [lineId]: occurrences,
        },
      };
    });

    if (activeLineId === lineId) setActiveLineId(null);
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

  function moveLine(lineId: string, from: ImagePoint, to: ImagePoint) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    setAnnotations(current => {
      const occurrence = current.lineOccurrencesByLineId[lineId]?.[observationKey];
      if (!occurrence?.start || !occurrence?.end) return current;

      return upsertLineOccurrence(current, {
        ...occurrence,
        start: { x: occurrence.start.x + dx, y: occurrence.start.y + dy },
        end: { x: occurrence.end.x + dx, y: occurrence.end.y + dy },
      });
    });
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

    const start = annotations.pointPositionsByPointId[lineStartPointId]?.[observationKey];
    const end = annotations.pointPositionsByPointId[pointId]?.[observationKey];
    if (!start || !end) return;

    const lineId = `line-${crypto.randomUUID()}`;

    setAnnotations(current => {
      const updated = {
        ...current,
        linesById: {
          ...current.linesById,
          [lineId]: {
            id: lineId,
            color: makeLineColor(Object.keys(current.linesById).length),
          },
        },
      };

      return upsertLineOccurrence(updated, {
        lineId,
        imageSetId: selectedImageSetId,
        imageId: frame.id,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        startPointId: lineStartPointId,
        endPointId: pointId,
      });
    });

    setActiveLineId(lineId);
    setLineStartPointId(null);
  }

  function onCanvasMouseDown(event: MouseEvent<HTMLElement>) {
    const pos = imageCoords(event);
    const hitPoint = nearestPoint(pos);
    const hitLine = nearestLine(pos);

    if (toolMode === "delete-line" && hitLine) {
      deleteLine(hitLine.lineId);
      return;
    }

    if (toolMode === "move-line" && hitLine) {
      setActiveLineId(hitLine.lineId);
      setActivePointId(null);
      setDragging({ kind: "line", lineId: hitLine.lineId, last: pos });
      return;
    }

    if (toolMode === "new-line") {
      if (!pendingLineStart) {
        setPendingLineStart(pos);
        setActiveLineId(null);
        return;
      }

      createLooseLine(pendingLineStart, pos);
      setPendingLineStart(null);
      return;
    }

    if (hitPoint) {
      setActivePointId(hitPoint.pointId);
      setActiveLineId(null);

      if (toolMode === "delete-point") {
        deletePoint(hitPoint.pointId);
        return;
      }

      if (toolMode === "move-point") {
        setDragging({ kind: "point", pointId: hitPoint.pointId });
        return;
      }

      if (toolMode === "join-points") {
        joinPoint(hitPoint.pointId);
        return;
      }
    }

    if (hitLine) {
      setActiveLineId(hitLine.lineId);
      setActivePointId(null);
      return;
    }

    if (toolMode === "new-point") createOrPlacePoint(pos);
  }

  function onCanvasMouseMove(event: MouseEvent<HTMLElement>) {
    const pos = imageCoords(event);
    setCursorPos(pos);

    if (!dragging) return;

    if (dragging.kind === "point") {
      movePoint(dragging.pointId, pos);
      return;
    }

    if (dragging.kind === "line") {
      moveLine(dragging.lineId, dragging.last, pos);
      setDragging({ ...dragging, last: pos });
    }
  }

  function finishDragging() {
    setDragging(null);
  }

  return (
    <div
      className="frame-canvas"
      style={{ position: "relative", width: "100%", userSelect: "none" }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={() => {
        setCursorPos(null);
        finishDragging();
      }}
      onMouseUp={finishDragging}
    >
      <img src={frame.url} alt={frame.label} draggable={false} style={{ display: "block", width: "100%" }} />

      <svg className="frame-canvas-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        {visibleLines.map(line => {
          const endpoints = lineEndpoints(line, annotations.pointPositionsByPointId, observationKey);
          if (!endpoints) return null;

          const definition = annotations.linesById[line.lineId];
          const active = activeLineId === line.lineId;

          return (
            <line
              key={line.lineId}
              x1={endpoints.start.x}
              y1={endpoints.start.y}
              x2={endpoints.end.x}
              y2={endpoints.end.y}
              stroke={active ? "#ffcf5a" : definition?.color ?? "#23d18b"}
              strokeWidth={active ? 0.65 : 0.45}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {pendingLineStart && cursorPos && (
          <line
            x1={pendingLineStart.x}
            y1={pendingLineStart.y}
            x2={cursorPos.x}
            y2={cursorPos.y}
            stroke="#ffcf5a"
            strokeDasharray="1.2 0.8"
            strokeWidth={0.45}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {visiblePoints.map(point => {
        const definition = annotations.pointsById[point.pointId];
        const active = activePointId === point.pointId;

        return (
          <div
            key={point.pointId}
            className="frame-point"
            style={{
              position: "absolute",
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: active ? 14 : 11,
              height: active ? 14 : 11,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background: definition?.color ?? "white",
              border: active ? "2px solid #ffcf5a" : "2px solid white",
              boxShadow: "0 0 4px rgba(0, 0, 0, 0.8)",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {cursorPos && (
        <div
          className="frame-cursor-readout"
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            fontSize: 11,
            pointerEvents: "none",
          }}
        >
          {cursorPos.x.toFixed(1)}, {cursorPos.y.toFixed(1)}
        </div>
      )}
    </div>
  );
}
