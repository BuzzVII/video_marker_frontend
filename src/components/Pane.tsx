import { useAtomValue } from "jotai";
import { imageSetAtom, selectedFrameByPaneAtom } from "../state/annotationAtoms";
import type { PaneSide } from "../types/annotations";
import { FrameCanvas } from "./FrameCanvas";
import { ImagePreviewList } from "./ImagePreviewList";
import { Toolbar } from "./Toolbar";

type Props = {
  side: PaneSide;
};

export function Pane({ side }: Props) {
  const imageSet = useAtomValue(imageSetAtom);
  const selectedFrameByPane = useAtomValue(selectedFrameByPaneAtom);

  const selectedFrameId = selectedFrameByPane[side];
  const selectedFrame = imageSet?.frames.find(frame => frame.id === selectedFrameId) ?? null;

  const preview = <ImagePreviewList side={side} />;
  const editor = (
    <section className="editor-column">
      <Toolbar />
      {selectedFrame ? (
        <FrameCanvas side={side} frame={selectedFrame} />
      ) : (
        <div className="empty-frame">No frame selected</div>
      )}
    </section>
  );

  return (
    <section className="pane">
      <div className={side === "left" ? "pane-layout" : "pane-layout mirrored"}>
        {preview}
        {editor}
      </div>
    </section>
  );
}
