import { useAtom } from "jotai";
import { newestModelAtom } from "../state/modelAtoms";
import { CuboidMesh } from "./CuboidMesh";

export function CuboidScene() {
  const [model] = useAtom(newestModelAtom);

  if (!model || Object.keys(model.cuboidsById).length === 0) {
    return (
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1, 1, 0.1]} />
        <meshStandardMaterial color="#7d8899" transparent opacity={0.25} />
      </mesh>
    );
  }

  return (
    <group>
      {Object.values(model.cuboidsById).map(cuboid => (
        <CuboidMesh key={cuboid.id} cuboid={cuboid} />
      ))}
    </group>
  );
}
