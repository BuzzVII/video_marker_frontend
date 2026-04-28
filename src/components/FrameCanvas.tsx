import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
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

type RenderedImageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PointerImageCoords = {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  insideImage: boolean;
};

type CursorState = {
  visible: boolean;
  canvasX: number;
  canvasY: number;
  percentX: number;
  percentY: number;
};

const emptyImageRect: RenderedImageRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function FrameCanvas({ imageSetId, frame }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [toolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [lineStartPointId, setLineStartPointId] = useAtom(activeLinePointStartAtom);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [imageRect, setImageRect] = useState<RenderedImageRect>(emptyImageRect);
  const [cursor, setCursor] = useState<CursorState>({
    visible: false,
    canvasX: 0,
    canvasY: 0,
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

  const updateImageRect = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imgRef.current;

    if (!canvas) return;

    const canvasBounds = canvas.getBoundingClientRect();
    const naturalWidth = image?.naturalWidth || frame.width || canvasBounds.width;
    const naturalHeight = image?.naturalHeight || frame.height || canvasBounds.height;

    if (
      canvasBounds.width <= 0 ||
      canvasBounds.height <= 0 ||
      naturalWidth <= 0 ||
      naturalHeight <= 0
    ) {
      setImageRect(emptyImageRect);
      return;
    }

    const canvasAspect = canvasBounds.width / canvasBounds.height;
    const imageAspect = naturalWidth / naturalHeight;

    let width = canvasBounds.width;
    let height = canvasBounds.height;
    let left = 0;
    let top = 0;

    if (canvasAspect > imageAspect) {
      height = canvasBounds.height;
      width = height * imageAspect;
      left = (canvasBounds.width - width) / 2;
    } else {
      width = canvasBounds.width;
      height = width / imageAspect;
      top = (canvasBounds.height - height) / 2;
    }

    setImageRect({ left, top, width, height });
  }, [frame.height, frame.width]);

  useEffect(() => {
    updateImageRect();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(updateImageRect);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [updateImageRect]);

  function imageCoords(event: MouseEvent<HTMLDivElement>): PointerImageCoords {
    const canvas = canvasRef.current;
    const fallbackBounds = event.currentTarget.getBoundingClientRect();
    const canvasBounds = canvas?.getBoundingClientRect() ?? fallbackBounds;

    const canvasX = event.clientX - canvasBounds.left;
    const canvasY = event.clientY - canvasBounds.top;

    const imageX = canvasX - imageRect.left;
    const imageY = canvasY - imageRect.top;
    const hasImageRect = imageRect.width > 0 && imageRect.height > 0;

    const insideImage =
      hasImageRect &&
      imageX >= 0 &&
      imageX <= imageRect.width &&
      imageY >= 0 &&
      imageY <= imageRect.height;

    return {
      x: hasImageRect ? clamp((imageX / imageRect.width) * 100, 0, 100) : 0,
      y: hasImageRect ? clamp((imageY / imageRect.height) * 100, 0, 100) : 0,
      canvasX,
      canvasY,
      insideImage,
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

    if (!pos.insideImage) return;

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
      visible: pos.insideImage,
      canvasX: pos.canvasX,
      canvasY: pos.canvasY,
      percentX: pos.x,
      percentY: pos.y,
    });

    if (!draggingPointId || !pos.insideImage) return;
    movePoint(draggingPointId, pos);
  }

  function onCanvasMouseUp() {
    setDraggingPointId(null);
  }

  function onCanvasMouseLeave() {
    setDraggingPointId(null);
    setCursor(current => ({ ...current, visible: false }));
  }

  const zoomBoxSize = 148;
  const zoomScale = 3.6;
  const zoomBackgroundWidth = imageRect.width * zoomScale;
  const zoomBackgroundHeight = imageRect.height * zoomScale;
  const zoomBackgroundX = -((cursor.percentX / 100) * zoomBackgroundWidth - zoomBoxSize / 2);
  const zoomBackgroundY = -((cursor.percentY / 100) * zoomBackgroundHeight - zoomBoxSize / 2);
  const zoomLeft = clamp(
    cursor.canvasX + 18,
    12,
    Math.max(12, imageRect.left + imageRect.width - zoomBoxSize - 12),
  );
  const zoomTop = clamp(
    cursor.canvasY + 18,
    12,
    Math.max(12, imageRect.top + imageRect.height - zoomBoxSize - 12),
  );

  const zoomPointMarkers = cursor.visible
    ? visiblePoints
        .map(point => {
          const left = zoomBoxSize / 2 + ((point.x - cursor.percentX) / 100) * zoomBackgroundWidth;
          const top = zoomBoxSize / 2 + ((point.y - cursor.percentY) / 100) * zoomBackgroundHeight;
          return {
            point,
            left,
            top,
            color: annotations.pointsById[point.pointId]?.color ?? "white",
          };
        })
        .filter(marker =>
          marker.left >= -12 &&
          marker.left <= zoomBoxSize + 12 &&
          marker.top >= -12 &&
          marker.top <= zoomBoxSize + 12,
        )
    : [];

  function pointToRenderedImagePixels(point: { x: number; y: number }) {
    return {
      x: (point.x / 100) * imageRect.width,
      y: (point.y / 100) * imageRect.height,
    };
  }

  return (
    <div
      ref={canvasRef}
      className="frame-canvas"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseLeave}
    >
      <img
        ref={imgRef}
        src={frame.url}
        alt={frame.label}
        draggable={false}
        onLoad={updateImageRect}
      />

      <svg
        className="annotation-layer"
        viewBox={`0 0 ${Math.max(1, imageRect.width)} ${Math.max(1, imageRect.height)}`}
        preserveAspectRatio="none"
        style={{
          left: imageRect.left,
          top: imageRect.top,
          width: imageRect.width,
          height: imageRect.height,
        }}
      >
        {visibleLines.map(line => {
          const start = annotations.pointPositionsByPointId[line.startPointId]?.[observationKey];
          const end = annotations.pointPositionsByPointId[line.endPointId]?.[observationKey];

          if (!start || !end) return null;

          const startPx = pointToRenderedImagePixels(start);
          const endPx = pointToRenderedImagePixels(end);

          return (
            <line
              key={line.lineId}
              x1={startPx.x}
              y1={startPx.y}
              x2={endPx.x}
              y2={endPx.y}
              className="annotation-line"
            />
          );
        })}

        {visiblePoints.map(point => {
          const definition = annotations.pointsById[point.pointId];
          const pointPx = pointToRenderedImagePixels(point);

          return (
            <g key={point.pointId}>
              <circle
                cx={pointPx.x}
                cy={pointPx.y}
                r="3"
                fill={definition?.color ?? "white"}
                stroke={activePointId === point.pointId ? "white" : "black"}
                strokeWidth="1.0"
              />
              <text
                x={pointPx.x + 9}
                y={pointPx.y - 9}
                className="point-label"
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
            backgroundSize: `${zoomBackgroundWidth}px ${zoomBackgroundHeight}px`,
            backgroundPosition: `${zoomBackgroundX}px ${zoomBackgroundY}px`,
          }}
        >
          {zoomPointMarkers.map(marker => (
            <span
              key={marker.point.pointId}
              className={
                marker.point.pointId === activePointId
                  ? "zoom-point-marker active"
                  : "zoom-point-marker"
              }
              style={{
                left: marker.left,
                top: marker.top,
                background: marker.color,
              }}
              title={marker.point.pointId}
            />
          ))}
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
