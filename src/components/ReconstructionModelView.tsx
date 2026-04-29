import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { CuboidScene } from "./CuboidScene";
import { EdgeLengthModal } from "./EdgeLengthModal";
import { ModelControlPill } from "./ModelControlPill";

export function ReconstructionModelView() {
  return (
    <section className="model-panel panel-card">
      <div className="panel-header model-header">
        <div>
          <h1>Newest 3D model</h1>
          <p>Rectangular cuboids with vertex and edge constraints.</p>
        </div>
      </div>
      <div className="model-canvas-wrap">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[4, 4, 3]} fov={48} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[5, 8, 6]} intensity={1.2} castShadow />
          <Grid args={[20, 20]} infiniteGrid fadeDistance={30} fadeStrength={3} />
          <CuboidScene />
          <OrbitControls makeDefault enablePan enableZoom enableRotate />
        </Canvas>
        <ModelControlPill />
        <EdgeLengthModal />
      </div>
    </section>
  );
}
