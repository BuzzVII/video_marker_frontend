type Props = {
  onClose: () => void;
};

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <h2>Video Marker Frontend</h2>
        <p>
          Use the left panel to select one frame and mark image points. Use the right panel to inspect and edit the newest 3D cuboid model.
        </p>
        <p>
          The model view supports pan, zoom, and rotate. The lower control pill switches between vertex selection, point deletion, cuboid creation, cuboid deletion, and edge length constraints.
        </p>
        <button type="button" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
