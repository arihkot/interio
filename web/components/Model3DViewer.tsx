"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, ContactShadows, Center } from "@react-three/drei";
import { Color } from "three";

import { Model3D, FloorPlan2D } from "@/lib/types";

type Props = {
  model: Model3D;
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
  wallHeight?: number;
  showLoadBearingWalls?: boolean;
  showPartitionWalls?: boolean;
  plan2d?: FloorPlan2D;
  hiddenWallIds?: string[];
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
        color={selected ? "#2563eb" : color} 
        roughness={0.7} 
        metalness={0.1}
        emissive={selected ? "#1d4ed8" : "#000000"}
        emissiveIntensity={selected ? 0.2 : 0}
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
    <mesh position={[bounds.centerX, -0.08, bounds.centerZ]}>
      <boxGeometry args={[bounds.width, 0.16, bounds.depth]} />
      <meshStandardMaterial color={new Color(model.slab.color).lerp(new Color("#ffffff"), 0.2)} roughness={0.8} />
    </mesh>
  );
}

function InteriorAsset({ asset }: { asset: Model3D["interiors"][number] }) {
  const sizeScale = asset.asset_url ? 1.0 : 0.95;
  
  // Basic heuristic to assign nice colors based on the asset type
  let color = "#cbd5e1"; // default slate
  let roughness = 0.6;
  const type = (asset.asset_type || "").toLowerCase();

  if (type.includes("bed")) {
    color = "#e0f2fe"; // light blue-ish white
    roughness = 0.9;
  } else if (type.includes("sofa") || type.includes("couch") || type.includes("seating")) {
    color = "#bae6fd"; // sky blue
    roughness = 0.8;
  } else if (type.includes("chair")) {
    color = "#7dd3fc"; 
    roughness = 0.7;
  } else if (type.includes("table") || type.includes("desk") || type.includes("dining")) {
    color = "#94a3b8"; // solid slate
    roughness = 0.5;
  } else if (type.includes("wardrobe") || type.includes("cabinet") || type.includes("shelf") || type.includes("storage")) {
    color = "#64748b"; // darker slate
    roughness = 0.5;
  } else if (type.includes("bath") || type.includes("toilet") || type.includes("sink") || type.includes("tub")) {
    color = "#ffffff"; // pure white
    roughness = 0.2;
  } else if (type.includes("plant") || type.includes("tree")) {
    color = "#86efac"; // green
    roughness = 0.8;
  } else if (type.includes("tv") || type.includes("screen") || type.includes("appliance")) {
    color = "#1e293b"; // dark slate
    roughness = 0.3;
  }

  return (
    <mesh 
      position={[asset.position.x, asset.size.y * 0.5, asset.position.z]} 
      rotation={[0, -(asset.rotation_deg || 0) * (Math.PI / 180), 0]}
      castShadow 
      receiveShadow
    >
      <boxGeometry args={[asset.size.x * sizeScale, asset.size.y, asset.size.z * sizeScale]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

export function Model3DViewer({ 
  model, 
  selectedElementId, 
  onSelectElement,
  wallHeight,
  showLoadBearingWalls = true,
  showPartitionWalls = true,
  plan2d,
  hiddenWallIds = []
}: Props) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas shadows camera={{ position: [16, 12, 18], fov: 45 }} style={{ width: "100%", height: "100%" }}>
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
          shadow-bias={-0.0005}
        />
        <Environment preset="city" environmentIntensity={0.5} />

        <Grid 
          args={[100, 100]} 
          position={[0, -0.17, 0]}
          cellColor="#e2e8f0" 
          sectionColor="#cbd5e1" 
          fadeDistance={50}
          fadeStrength={1}
        />

        <Center position={[0, 0, 0]} disableY>
          <group>
            <SlabMesh model={model} />

            {model.walls.map((wall) => {
              if (hiddenWallIds.includes(wall.source_wall_id)) return null;

              // Check if wall is load bearing
              const sourceWall = plan2d?.walls.find(w => w.id === wall.source_wall_id);
              const isLoadBearing = sourceWall?.is_load_bearing ?? true; // Default to load bearing if not found
              
              if (isLoadBearing && !showLoadBearingWalls) return null;
              if (!isLoadBearing && !showPartitionWalls) return null;

              const dx = wall.end.x - wall.start.x;
              const dz = wall.end.z - wall.start.z;
              const length = Math.sqrt(dx * dx + dz * dz);
              const cx = (wall.start.x + wall.end.x) * 0.5;
              const cz = (wall.start.z + wall.end.z) * 0.5;
              const rotation = Math.atan2(dz, dx);
              const selected = selectedElementId === wall.source_wall_id;
              const adjustedHeight = wallHeight !== undefined ? wallHeight : wall.height_m;

              return (
                <WallMesh
                  key={wall.id}
                  x={cx}
                  y={adjustedHeight * 0.5}
                  z={cz}
                  length={length}
                  height={adjustedHeight}
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
          </group>
        </Center>

        <OrbitControls 
          makeDefault 
          target={[6, 3, 0]}
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minDistance={2} 
          maxDistance={50} 
        />
      </Canvas>
    </div>
  );
}
