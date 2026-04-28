export type PaneSide = "left" | "right";

export type ToolMode =
  | "new-point"
  | "move-point"
  | "delete-point"
  | "join-points";

export type ProjectSummary = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  image_set_count: number;
};

export type ImageSetSummary = {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  frame_count: number;
  source_type: string;
};

export type ImageFrame = {
  id: string;
  label: string;
  url: string;
  width?: number;
  height?: number;
  frame_index?: number;
  timestamp_seconds?: number;
};

export type ImageSet = {
  id: string;
  project_id?: string;
  name: string;
  frames: ImageFrame[];
};

export type PointDefinition = {
  id: string;
  color: string;
};

export type PointPosition = {
  pointId: string;
  imageSetId: string;
  imageId: string;
  x: number;
  y: number;
};

export type LineDefinition = {
  id: string;
};

export type LineOccurrence = {
  lineId: string;
  imageSetId: string;
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
