import { MouseEvent, useMemo, useState } from "react";
import { useAtom } from "jotai";
import {
  activeLinePointStartAtom,
  activePointIdAtom,
  annotationsAtom,
  makeObservationKey,
  makePointColor,
  toolModeAtom,
  upsertPointPosition,
} from "../state/annotationAtoms";
import type {
  ImageFrame,
  LineOccurrence,
  PaneSide,
  PointPosition,
} from "../types/annotations";

type Props = {
  side: PaneSide;
  imageSetId: string;
  frame: ImageFrame;
};

type CursorState = {
  visible: boolean;
  x: number;
  y: number;
  percentX: number;
  percentY: number;
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function FrameCanvas({ imageSetId, frame }: Props) {
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [toolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [lineStartPointId, setLineStartPointId] = useAtom(activeLinePointStartAtom);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<CursorState>({
    visible: false,
    x: 0,
    y: 0,
    percentX: 0,
    percentY: 0,
  });

  const observationKey = makeObservationKey(imageSetId, frame.id);

  const visiblePoints = useMemo(() => {
    return Object.values(annotations.pointPositionsByPointId)
      .map(byObservation => byObservation[observationKey])
      .filter(Boolean) as PointPosition[];
  }, [annotations.pointPositionsByPointId, observationKey]);

  const visibleLines = useMemo(() => {
    return Object.values(annotations.lineOccurrencesByLineId)
      .map(byObservation => byObservation[observationKey])
      .filter(Boolean) as LineOccurrence[];
  }, [annotations.lineOccurrencesByLineId, observationKey]);

  function imageCoords(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top,
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
        imageSetId,
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
        Object.entries(current.lineOccurrencesByLineId).map(([lineId, byObservation]) => {
          const nextByObservation = { ...byObservation };
          const occurrence = nextByObservation[observationKey];

          if (
            occurrence &&
            (occurrence.startPointId === pointId || occurrence.endPointId === pointId)
          ) {
            delete nextByObservation[observationKey];
          }

          return [lineId, nextByObservation];
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
        imageSetId,
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
            [observationKey]: {
              lineId,
              imageSetId,
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
    const pos = imageCoords(event);

    setCursor({
      visible: true,
      x: pos.screenX,
      y: pos.screenY,
      percentX: pos.x,
      percentY: pos.y,
    });

    if (!draggingPointId) return;
    movePoint(draggingPointId, pos);
  }

  function onCanvasMouseUp() {
    setDraggingPointId(null);
  }

  function onCanvasMouseLeave() {
    setDraggingPointId(null);
    setCursor(current => ({ ...current, visible: false }));
  }

  const zoomBackgroundPosition = `${cursor.percentX}% ${cursor.percentY}%`;
  const zoomLeft = clamp(cursor.x + 18, 12, 1000);
  const zoomTop = clamp(cursor.y + 18, 12, 1000);

  return (
    <div
      className="frame-canvas"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseLeave}
    >
      <img src={frame.url} alt={frame.label} draggable={false} />

      <svg className="annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {visibleLines.map(line => {
          const start = annotations.pointPositionsByPointId[line.startPointId]?.[observationKey];
          const end = annotations.pointPositionsByPointId[line.endPointId]?.[observationKey];

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

        {visiblePoints.map(point => {
          const definition = annotations.pointsById[point.pointId];

          return (
            <g key={point.pointId}>
              <circle
                cx={point.x}
                cy={point.y}
                r="1.4"
                fill={definition?.color ?? "white"}
                stroke={activePointId === point.pointId ? "white" : "black"}
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={point.x + 1.8}
                y={point.y - 1.8}
                className="point-label"
                vectorEffect="non-scaling-stroke"
              >
                {point.pointId}
              </text>
            </g>
          );
        })}
      </svg>

      {cursor.visible ? (
        <div
          className="zoom-box"
          style={{
            left: zoomLeft,
            top: zoomTop,
            backgroundImage: `url(${frame.url})`,
            backgroundPosition: zoomBackgroundPosition,
          }}
        >
          <span className="zoom-crosshair horizontal" />
          <span className="zoom-crosshair vertical" />
          <span className="zoom-coordinates">
            {cursor.percentX.toFixed(1)}, {cursor.percentY.toFixed(1)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
