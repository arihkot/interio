"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Color } from "three";

import { Model3D } from "@/lib/types";

type Props = {
  model: Model3D;
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
};

function WallMesh({
  x,
  y,
  z,
  length,
  height,
  thickness,
  rotation,
  color,
  selected,
  onClick
}: {
  x: number;
  y: number;
  z: number;
  length: number;
  height: number;
  thickness: number;
  rotation: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[0, -rotation, 0]} onClick={onClick}>
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial color={selected ? "#0E2530" : color} />
    </mesh>
  );
}

function SlabMesh({ model }: { model: Model3D }) {
  const bounds = useMemo(() => {
    const points = model.slab.boundary;
    if (points.length < 3) return null;
    const xs = points.map((point) => point.x);
    const zs = points.map((point) => point.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    return {
      width: Math.max(0.1, maxX - minX),
      depth: Math.max(0.1, maxZ - minZ),
      centerX: (minX + maxX) * 0.5,
      centerZ: (minZ + maxZ) * 0.5
    };
  }, [model]);

  if (!bounds) return null;

  return (
    <mesh position={[bounds.centerX, -0.08, bounds.centerZ]}>
      <boxGeometry args={[bounds.width, 0.16, bounds.depth]} />
      <meshStandardMaterial color={new Color(model.slab.color)} />
    </mesh>
  );
}

function InteriorAsset({ asset }: { asset: Model3D["interiors"][number] }) {
  const sizeScale = asset.asset_url ? 1.0 : 0.95;
  return (
    <mesh position={[asset.position.x, asset.size.y * 0.5, asset.position.z]}>
      <boxGeometry args={[asset.size.x * sizeScale, asset.size.y, asset.size.z * sizeScale]} />
      <meshStandardMaterial color="#B3BEC5" />
    </mesh>
  );
}

export function Model3DViewer({ model, selectedElementId, onSelectElement }: Props) {
  return (
    <section className="panel viewer-panel viewer-3d">
      <div className="panel-header">
        <h3>3D Structural Model</h3>
        <p>{model.recommendation_variant} recommendation · {model.detail_level} detail</p>
      </div>

      <div className="canvas-wrap">
        <Canvas camera={{ position: [8, 8, 10], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight intensity={0.8} position={[7, 10, 5]} />
          <Grid args={[40, 40]} cellColor="#D2DEE4" sectionColor="#B3C4CD" />
          <SlabMesh model={model} />

          {model.walls.map((wall) => {
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.z - wall.start.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const cx = (wall.start.x + wall.end.x) * 0.5;
            const cz = (wall.start.z + wall.end.z) * 0.5;
            const rotation = Math.atan2(dz, dx);
            const selected = selectedElementId === wall.source_wall_id;

            return (
              <WallMesh
                key={wall.id}
                x={cx}
                y={wall.height_m * 0.5}
                z={cz}
                length={length}
                height={wall.height_m}
                thickness={wall.thickness_m}
                rotation={rotation}
                color={wall.color}
                selected={selected}
                onClick={() => onSelectElement(wall.source_wall_id)}
              />
            );
          })}

          {model.interiors.map((asset) => (
            <InteriorAsset key={asset.id} asset={asset} />
          ))}

          <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </div>
    </section>
  );
}
