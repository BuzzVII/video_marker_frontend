export type PaneSide = "left" | "right";

export type ToolMode =
  | "new-point"
  | "move-point"
  | "delete-point"
  | "join-points";

export type ImageFrame = {
  id: string;
  label: string;
  url: string;
};

export type ImageSet = {
  id: string;
  name: string;
  frames: ImageFrame[];
};

export type PointDefinition = {
  id: string;
  color: string;
};

export type PointPosition = {
  pointId: string;
  imageId: string;
  x: number;
  y: number;
};

export type LineDefinition = {
  id: string;
};

export type LineOccurrence = {
  lineId: string;
  imageId: string;
  startPointId: string;
  endPointId: string;
};

export type AnnotationState = {
  pointsById: Record<string, PointDefinition>;
  pointPositionsByPointId: Record<string, Record<string, PointPosition>>;
  linesById: Record<string, LineDefinition>;
  lineOccurrencesByLineId: Record<string, Record<string, LineOccurrence>>;
};
