"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, ContactShadows, Center, Text } from "@react-three/drei";
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
    <mesh position={[x, y, z]} rotation={[0, -rotation, 0]} onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial 
        color={selected ? "#fbbf24" : color} 
        roughness={0.7} 
        metalness={0.1}
        emissive={selected ? "#d97706" : "#000000"}
        emissiveIntensity={selected ? 0.3 : 0}
      />
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
    <mesh position={[bounds.centerX, -0.08, bounds.centerZ]} receiveShadow>
      <boxGeometry args={[bounds.width, 0.16, bounds.depth]} />
      <meshStandardMaterial color={new Color(model.slab.color).lerp(new Color("#ffffff"), 0.2)} roughness={0.8} />
    </mesh>
  );
}

function InteriorAsset({ asset }: { asset: Model3D["interiors"][number] }) {
  const sizeScale = asset.asset_url ? 1.0 : 0.95;
  return (
    <mesh position={[asset.position.x, asset.size.y * 0.5, asset.position.z]} castShadow receiveShadow>
      <boxGeometry args={[asset.size.x * sizeScale, asset.size.y, asset.size.z * sizeScale]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.6} />
    </mesh>
  );
}

function RoomLabel({ label }: { label: Model3D["labels"][number] }) {
  const color = label.source === "ocr" ? "#0f172a" : "#475569";
  return (
    <Text
      position={[label.position.x, label.position.y, label.position.z]}
      fontSize={0.36}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#ffffff"
    >
      {label.text}
    </Text>
  );
}

export function Model3DViewer({ model, selectedElementId, onSelectElement }: Props) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows camera={{ position: [12, 12, 16], fov: 45 }}>
        <color attach="background" args={["#f8fafc"]} />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          castShadow 
          intensity={1.2} 
          position={[10, 15, 10]} 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <Environment preset="city" environmentIntensity={0.5} />

        <Grid 
          args={[100, 100]} 
          position={[0, -0.16, 0]}
          cellColor="#e2e8f0" 
          sectionColor="#cbd5e1" 
          fadeDistance={50}
          fadeStrength={1}
        />

        <Center position={[0, 0, 0]}>
          <group>
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

            {model.labels.map((label) => (
              <RoomLabel key={label.id} label={label} />
            ))}
          </group>
        </Center>

        <ContactShadows 
          position={[0, -0.15, 0]} 
          opacity={0.6} 
          scale={40} 
          blur={2} 
          far={4} 
        />

        <OrbitControls 
          makeDefault 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minDistance={2} 
          maxDistance={50} 
        />
      </Canvas>
    </div>
  );
}
