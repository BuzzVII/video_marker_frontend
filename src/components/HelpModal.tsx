import { FaTimes } from "react-icons/fa";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HelpModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="about-modal-title">About Video Marker</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close help">
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Video Marker is a correspondence annotation tool for house video and image sets.
            It lets you mark the same physical point or line across multiple frames and image sets.
          </p>

          <p>
            The saved annotation document belongs to the selected project. A project can contain
            many image sets, and each point or line observation records the image set and frame
            where it appears.
          </p>

          <p>
            The long term goal is to use these hand marked correspondences as geometric constraints
            for camera pose estimation, wall layout inference, floor plan generation, and simple
            3D reconstruction.
          </p>

          <ul>
            <li>Use New point to create or place the active point in the current frame.</li>
            <li>Use Move point to drag an existing point.</li>
            <li>Use Delete point to remove the point observation from the current frame.</li>
            <li>Use Join points to create a line observation between two points.</li>
            <li>Hover over the image to show the zoom box for precise placement.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
