// @ts-nocheck
"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SnakeState } from "@/lib/game/snake-engine";
import { OrbitControls, Sky, PerspectiveCamera } from "@react-three/drei";

// --- Tree component - low poly, beautiful ---
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkHeight = (1.5 + Math.random() * 0.5) * scale;
  const leafSize = (0.8 + Math.random() * 0.6) * scale;

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12 * scale, 0.18 * scale, trunkHeight, 6]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Leaves - stacked cones for pine-like or blob for oak */}
      <group position={[0, trunkHeight + 0.2, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <coneGeometry args={[leafSize * 0.9, leafSize * 1.5, 7]} />
          <meshStandardMaterial color={Math.random() > 0.3 ? "#1a5c2a" : "#2d6a4f"} roughness={0.8} emissive="#0a2a0a" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <coneGeometry args={[leafSize * 1.1, leafSize * 1.3, 7]} />
          <meshStandardMaterial color="#194a2a" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function MushroomFood({ pos, type, offsetX, offsetZ }: { pos: { x: number; y: number }; type: string; offsetX: number; offsetZ: number }) {
  const ref = useRef<THREE.Group>(null);
  const worldX = pos.x + offsetX;
  const worldZ = pos.y + offsetZ;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.getElapsedTime() * 2 + pos.x) * 0.1;
      ref.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  const isGem = type === 'gem';
  const capColor = isGem ? "#60a5fa" : type === 'power' ? "#e879f9" : "#facc15";
  const stemColor = isGem ? "#1e3a8a" : "#fef3c7";

  return (
    <group ref={ref} position={[worldX, 0.2, worldZ]}>
      {/* Stem */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.3, 6]} />
        <meshStandardMaterial color={stemColor} roughness={0.6} />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={capColor}
          emissive={capColor}
          emissiveIntensity={isGem ? 1.2 : 0.8}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {/* Glow */}
      <pointLight color={capColor} intensity={1.5} distance={4} />
      {/* Little spots on mushroom */}
      {!isGem && (
        <>
          <mesh position={[0.15, 0.45, 0.1]}>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[-0.12, 0.48, -0.08]}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </>
      )}
    </group>
  );
}

function SnakeBody3D({ snake, offsetX, offsetZ, isFirstPerson }: { snake: any; offsetX: number; offsetZ: number; isFirstPerson: boolean }) {
  // Don't render head for first-person human snake (it would block camera)
  const segments = isFirstPerson && snake.id === 'human' ? snake.body.slice(1) : snake.body;

  return (
    <>
      {segments.map((p: any, idx: number) => {
        const isHead = idx === 0 && !(isFirstPerson && snake.id === 'human');
        const worldX = p.x + offsetX;
        const worldZ = p.y + offsetZ;
        const y = isHead ? 0.4 : 0.15;
        const scale = isHead ? 0.5 : 0.35 - idx * 0.005;

        return (
          <group key={`${snake.id}-${idx}-${p.x}-${p.y}`} position={[worldX, y, worldZ]}>
            <mesh castShadow>
              <sphereGeometry args={[scale, 8, 8]} />
              <meshStandardMaterial
                color={snake.color}
                emissive={snake.color}
                emissiveIntensity={isHead ? 1 : 0.5}
                roughness={0.4}
              />
            </mesh>
            {isHead && (
              <>
                <mesh position={[0, 0.2, 0]}>
                  <sphereGeometry args={[0.12, 6, 6]} />
                  <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

function ForestScene({ state, humanId = 'human' }: { state: SnakeState; humanId?: string }) {
  const { camera } = useThree();
  const cameraLerpRef = useRef({ x: 0, y: 5, z: 10 });
  const lookAtLerpRef = useRef({ x: 0, y: 0, z: 0 });

  const offsetX = -state.config.width / 2 + 0.5;
  const offsetZ = -state.config.height / 2 + 0.5;

  // Generate forest trees
  const trees = useMemo(() => {
    const result: { pos: [number, number, number]; scale: number }[] = [];
    const boardW = state.config.width;
    const boardH = state.config.height;

    // Border forest - dense ring around board
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2;
      const radius = Math.max(boardW, boardH) / 2 + 3 + Math.random() * 8;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
      result.push({ pos: [x, 0, z], scale: 0.8 + Math.random() * 0.8 });
    }

    // Scattered interior decorative trees (don't block gameplay, just visual outside grid but near)
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * (boardW + 12);
      const z = (Math.random() - 0.5) * (boardH + 12);
      // Skip if too close to center (where snakes spawn) for clarity
      if (Math.abs(x) < boardW / 2 - 1 && Math.abs(z) < boardH / 2 - 1) {
        if (Math.random() > 0.3) continue; // only 30% chance inside
      }
      result.push({ pos: [x, 0, z], scale: 0.5 + Math.random() * 0.6 });
    }

    return result;
  }, [state.config.width, state.config.height]);

  // Fireflies
  const fireflies = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 20, 1 + Math.random() * 3, (Math.random() - 0.5) * 20] as [number, number, number],
      color: Math.random() > 0.5 ? "#fef08a" : "#a7f3d0",
      speed: 0.5 + Math.random() * 1.5,
    }));
  }, []);

  useFrame(({ clock }) => {
    const humanSnake = state.snakes.find(s => s.id === humanId && s.alive) || state.snakes.find(s => s.alive);
    if (!humanSnake) {
      // No human alive, top-down view
      cameraLerpRef.current.x = THREE.MathUtils.lerp(cameraLerpRef.current.x, 0, 0.05);
      cameraLerpRef.current.y = THREE.MathUtils.lerp(cameraLerpRef.current.y, 18, 0.05);
      cameraLerpRef.current.z = THREE.MathUtils.lerp(cameraLerpRef.current.z, 12, 0.05);
      lookAtLerpRef.current.x = THREE.MathUtils.lerp(lookAtLerpRef.current.x, 0, 0.05);
      lookAtLerpRef.current.y = THREE.MathUtils.lerp(lookAtLerpRef.current.y, 0, 0.05);
      lookAtLerpRef.current.z = THREE.MathUtils.lerp(lookAtLerpRef.current.z, 0, 0.05);
    } else {
      const head = humanSnake.body[0];
      const headWorldX = head.x + offsetX;
      const headWorldZ = head.y + offsetZ;

      // Direction vector
      let dirX = 0, dirZ = 0;
      switch (humanSnake.dir) {
        case 'up': dirZ = -1; break;
        case 'down': dirZ = 1; break;
        case 'left': dirX = -1; break;
        case 'right': dirX = 1; break;
      }

      // First-person: camera slightly behind and above head, looking forward
      const targetCamX = headWorldX - dirX * 1.2;
      const targetCamY = 1.2;
      const targetCamZ = headWorldZ - dirZ * 1.2;

      const targetLookX = headWorldX + dirX * 4;
      const targetLookY = 0.5;
      const targetLookZ = headWorldZ + dirZ * 4;

      cameraLerpRef.current.x = THREE.MathUtils.lerp(cameraLerpRef.current.x, targetCamX, 0.15);
      cameraLerpRef.current.y = THREE.MathUtils.lerp(cameraLerpRef.current.y, targetCamY, 0.15);
      cameraLerpRef.current.z = THREE.MathUtils.lerp(cameraLerpRef.current.z, targetCamZ, 0.15);

      lookAtLerpRef.current.x = THREE.MathUtils.lerp(lookAtLerpRef.current.x, targetLookX, 0.15);
      lookAtLerpRef.current.y = THREE.MathUtils.lerp(lookAtLerpRef.current.y, targetLookY, 0.15);
      lookAtLerpRef.current.z = THREE.MathUtils.lerp(lookAtLerpRef.current.z, targetLookZ, 0.15);
    }

    camera.position.set(cameraLerpRef.current.x, cameraLerpRef.current.y, cameraLerpRef.current.z);
    camera.lookAt(lookAtLerpRef.current.x, lookAtLerpRef.current.y, lookAtLerpRef.current.z);
  });

  return (
    <>
      {/* Fog for forest depth */}
      <fog attach="fog" args={['#0a1f0f', 8, 28]} />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#a7f3d0" />
      <directionalLight
        position={[8, 15, 6]}
        intensity={1.2}
        color="#fef08a"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#22c55e" distance={15} />

      {/* Sky - sunset forest */}
      <Sky
        distance={450000}
        sunPosition={[10, 15, -10]}
        inclination={0.3}
        azimuth={0.25}
        turbidity={6}
        rayleigh={1.5}
        mieCoefficient={0.003}
        mieDirectionalG={0.8}
      />

      {/* Ground - forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0f3d1f" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid clearing - lighter where snake moves */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]} receiveShadow>
        <planeGeometry args={[state.config.width + 0.5, state.config.height + 0.5]} />
        <meshStandardMaterial color="#1a4a2a" roughness={0.8} emissive="#0a2a0a" emissiveIntensity={0.3} />
      </mesh>

      {/* Grid lines subtle */}
      <gridHelper args={[state.config.width, state.config.width, "#14532d", "#14532d"]} position={[0, -0.47, 0]} />

      {/* Trees */}
      {trees.map((t, i) => (
        <Tree key={`tree-${i}`} position={t.pos} scale={t.scale} />
      ))}

      {/* Snakes */}
      {state.snakes.map(snake =>
        snake.alive ? <SnakeBody3D key={snake.id} snake={snake} offsetX={offsetX} offsetZ={offsetZ} isFirstPerson={true} /> : null
      )}

      {/* Foods as mushrooms */}
      {state.foods.map(food => (
        <MushroomFood key={food.id} pos={food.pos} type={food.type} offsetX={offsetX} offsetZ={offsetZ} />
      ))}

      {/* Fireflies */}
      {fireflies.map(f => (
        <group key={f.id} position={[f.pos[0], f.pos[1], f.pos[2]]}>
          <mesh>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshStandardMaterial color={f.color} emissive={f.color} emissiveIntensity={2} transparent opacity={0.8} />
          </mesh>
          <pointLight color={f.color} intensity={0.5} distance={2} />
        </group>
      ))}
    </>
  );
}

export default function ForestFPV({ state }: { state: SnakeState }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border-2 border-emerald-800 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(to bottom, #1e3a2a 0%, #0a1f0f 100%)' }}
      >
        <ForestScene state={state} />
      </Canvas>

      {/* Forest HUD */}
      <div className="pointer-events-none absolute top-2 left-2 right-2 flex justify-between text-[10px] font-mono">
        <div className="px-2.5 py-1 rounded-full bg-black/70 border border-emerald-500/30 text-emerald-300 backdrop-blur">🌲 FOREST FPV • WASD TO SLITHER • EAT MUSHROOMS 🍄</div>
        <div className="hidden sm:flex px-2.5 py-1 rounded-full bg-black/70 border border-yellow-500/30 text-yellow-300 backdrop-blur">FIRST PERSON • FOLLOW CAM • BEAUTIFUL FOREST</div>
      </div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.7)_100%)]" />
      {/* Subtle scanlines for arcade feel but forest */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,white_3px,transparent_4px)]" />
    </div>
  );
}
