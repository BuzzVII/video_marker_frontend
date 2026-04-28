import { MouseEvent, useMemo, useState } from "react";
import { useAtom } from "jotai";
import {
  activeLinePointStartAtom,
  activePointIdAtom,
  annotationsAtom,
  makePointColor,
  toolModeAtom,
  upsertPointPosition,
} from "../state/annotationAtoms";
import type { ImageFrame, PaneSide, PointPosition } from "../types/annotations";

type Props = {
  side: PaneSide;
  frame: ImageFrame;
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function FrameCanvas({ frame }: Props) {
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [toolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [lineStartPointId, setLineStartPointId] = useAtom(
    activeLinePointStartAtom,
  );
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const visiblePoints = useMemo(() => {
    return Object.values(annotations.pointPositionsByPointId)
      .map(byImage => byImage[frame.id])
      .filter(Boolean) as PointPosition[];
  }, [annotations.pointPositionsByPointId, frame.id]);

  const visibleLines = useMemo(() => {
    return Object.values(annotations.lineOccurrencesByLineId)
      .map(byImage => byImage[frame.id])
      .filter(Boolean);
  }, [annotations.lineOccurrencesByLineId, frame.id]);

  function imageCoords(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function nearestPoint(pos: { x: number; y: number }) {
    let best: PointPosition | null = null;
    let bestDistance = Infinity;

    for (const point of visiblePoints) {
      const d = distance(pos, point);
      if (d < bestDistance) {
        best = point;
        bestDistance = d;
      }
    }

    return bestDistance < 1.5 ? best : null;
  }

  function createOrPlacePoint(pos: { x: number; y: number }) {
    const nextPointId =
      activePointId ?? `point-${Object.keys(annotations.pointsById).length + 1}`;

    setAnnotations(current => {
      const existingPoint = current.pointsById[nextPointId];

      const nextPoint =
        existingPoint ??
        ({
          id: nextPointId,
          color: makePointColor(Object.keys(current.pointsById).length),
        });

      const updated = {
        ...current,
        pointsById: {
          ...current.pointsById,
          [nextPointId]: nextPoint,
        },
      };

      return upsertPointPosition(updated, {
        pointId: nextPointId,
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
      delete positions[frame.id];

      const lineOccurrencesByLineId = Object.fromEntries(
        Object.entries(current.lineOccurrencesByLineId).map(([lineId, byImage]) => {
          const nextByImage = { ...byImage };
          const occurrence = nextByImage[frame.id];

          if (
            occurrence &&
            (occurrence.startPointId === pointId ||
              occurrence.endPointId === pointId)
          ) {
            delete nextByImage[frame.id];
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

  function movePoint(pointId: string, pos: { x: number; y: number }) {
    setAnnotations(current =>
      upsertPointPosition(current, {
        pointId,
        imageId: frame.id,
        x: pos.x,
        y: pos.y,
      }),
    );
  }

  function joinPoint(pointId: string) {
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
            [frame.id]: {
              lineId,
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

    if (toolMode === "new-point") {
      createOrPlacePoint(pos);
    }
  }

  function onCanvasMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!draggingPointId) return;

    const pos = imageCoords(event);
    movePoint(draggingPointId, pos);
  }

  function onCanvasMouseUp() {
    setDraggingPointId(null);
  }

  return (
    <div
      className="frame-canvas"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
    >
      <img src={frame.url} alt={frame.label} draggable={false} />

      <svg className="annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {visibleLines.map(line => {
          const start = annotations.pointPositionsByPointId[line.startPointId]?.[frame.id];
          const end = annotations.pointPositionsByPointId[line.endPointId]?.[frame.id];

          if (!start || !end) return null;

          return (
            <line
              key={line.lineId}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className="annotation-line"
            />
          );
        })}
      </svg>

      {visiblePoints.map(point => {
        const definition = annotations.pointsById[point.pointId];

        return (
          <button
            key={point.pointId}
            className={
              activePointId === point.pointId
                ? "point-marker active"
                : "point-marker"
            }
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              background: definition?.color ?? "white",
            }}
            aria-label={point.pointId}
            type="button"
          />
        );
      })}
    </div>
  );
}
