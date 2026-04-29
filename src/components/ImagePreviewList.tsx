import type { ImageFrame } from "../types/annotations";

type Props = {
  frames: ImageFrame[];
  selectedFrameId: string | null;
  framesWithPoints: Set<string>;
  onSelectFrame: (frameId: string) => void;
};

export function ImagePreviewList({ frames, selectedFrameId, framesWithPoints, onSelectFrame }: Props) {
  return (
    <aside className="preview-list">
      {frames.map(frame => {
        const hasPoint = framesWithPoints.has(frame.id);
        return (
          <button
            key={frame.id}
            className={`preview-card ${frame.id === selectedFrameId ? "selected" : ""} ${hasPoint ? "has-point" : ""}`}
            type="button"
            onClick={() => onSelectFrame(frame.id)}
          >
            <img src={frame.url} alt={frame.label} />
            <span>{frame.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
