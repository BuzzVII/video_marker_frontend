import type { ImageFrame } from "../types/annotations";

type Props = {
  frames: ImageFrame[];
  selectedFrameId: string | null;
  framesWithMarkup: Set<string>;
  onSelectFrame: (frameId: string) => void;
};

export function ImagePreviewList({ frames, selectedFrameId, framesWithMarkup, onSelectFrame }: Props) {
  return (
    <aside className="preview-list">
      {frames.map(frame => {
        const hasMarkup = framesWithMarkup.has(frame.id);

        return (
          <button
            key={frame.id}
            className={`preview-card ${frame.id === selectedFrameId ? "selected" : ""} ${hasMarkup ? "has-point" : ""}`}
            type="button"
            onClick={() => onSelectFrame(frame.id)}
          >
            <img src={frame.url} alt={frame.label} />
            <span>{frame.label}</span>
          </button>
        );
      })}

      {frames.length === 0 && <div className="empty-state">No marked frames</div>}
    </aside>
  );
}
