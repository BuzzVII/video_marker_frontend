import { useAtom } from "jotai";
import { newestModelAtom } from "../state/modelAtoms";
import { CuboidMesh } from "./CuboidMesh";

export function CuboidScene() {
  const [model] = useAtom(newestModelAtom);
  const cuboidsById = model?.cuboidsById ?? {};
  const cuboids = Object.values(cuboidsById).filter(Boolean);

  if (cuboids.length === 0) {
    return (
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1, 1, 0.1]} />
        <meshStandardMaterial color="#7d8899" transparent opacity={0.25} />
      </mesh>
    );
  }

  return (
    <group>
      {cuboids.map(cuboid => (
        <CuboidMesh key={cuboid.id} cuboid={cuboid} />
      ))}
    </group>
  );
}
