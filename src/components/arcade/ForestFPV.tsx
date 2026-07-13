// @ts-nocheck
"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SnakeState } from "@/lib/game/snake-engine";

// FAST low-poly tree - no shadows, 5 sides
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkH = (1.3 + Math.random() * 0.4) * scale;
  const leaf = (0.7 + Math.random() * 0.5) * scale;
  const green = Math.random() > 0.3 ? "#1a5c2a" : "#2d6a4f";
  return (
    <group position={position}>
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[0.1 * scale, 0.15 * scale, trunkH, 5]} />
        <meshLambertMaterial color="#3d2817" />
      </mesh>
      <mesh position={[0, trunkH + 0.25, 0]}>
        <coneGeometry args={[leaf * 0.9, leaf * 1.4, 5]} />
        <meshLambertMaterial color={green} />
      </mesh>
    </group>
  );
}

function Mushroom({ pos, type, offsetX, offsetZ }: { pos: { x: number; y: number }; type: string; offsetX: number; offsetZ: number }) {
  const isGem = type === 'gem';
  const capColor = isGem ? "#60a5fa" : type === 'power' ? "#e879f9" : "#facc15";
  return (
    <group position={[pos.x + offsetX, 0.25, pos.y + offsetZ]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 0.22, 5]} />
        <meshLambertMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.28, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color={capColor} emissive={capColor} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function SnakeSeg({ pos, color, isHead }: { pos: [number, number, number]; color: string; isHead: boolean }) {
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[isHead ? 0.42 : 0.28, 6, 6]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={isHead ? 0.9 : 0.4} />
      </mesh>
    </group>
  );
}

function ForestScene({ state }: { state: SnakeState }) {
  const { camera } = useThree();
  const camRef = useRef({ x: 0, y: 12, z: 12 });
  const lookRef = useRef({ x: 0, y: 0, z: 0 });
  const offsetX = -state.config.width / 2 + 0.5;
  const offsetZ = -state.config.height / 2 + 0.5;

  // FAST: only 36 border trees + 12 scattered = 48 total, memo once
  const trees = useMemo(() => {
    const res: { pos: [number, number, number]; scale: number }[] = [];
    const W = state.config.width;
    const H = state.config.height;
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const r = Math.max(W, H) / 2 + 2.5 + Math.random() * 4;
      res.push({ pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r], scale: 0.7 + Math.random() * 0.6 });
    }
    for (let i = 0; i < 12; i++) {
      res.push({
        pos: [(Math.random() - 0.5) * (W + 10), 0, (Math.random() - 0.5) * (H + 10)],
        scale: 0.5 + Math.random() * 0.5,
      });
    }
    return res;
  }, [state.config.width, state.config.height]);

  useFrame(() => {
    // Follow first alive snake (human preferred)
    const human = state.snakes.find(s => s.id === 'human' && s.alive) || state.snakes.find(s => s.alive);
    if (!human) {
      // Top-down when dead
      camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, 0, 0.04);
      camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, 16, 0.04);
      camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, 10, 0.04);
      lookRef.current.x = THREE.MathUtils.lerp(lookRef.current.x, 0, 0.04);
      lookRef.current.z = THREE.MathUtils.lerp(lookRef.current.z, 0, 0.04);
    } else {
      const head = human.body[0];
      const hx = head.x + offsetX;
      const hz = head.y + offsetZ;
      let dx = 0, dz = 0;
      switch (human.dir) {
        case 'up': dz = -1; break;
        case 'down': dz = 1; break;
        case 'left': dx = -1; break;
        case 'right': dx = 1; break;
      }
      const tCamX = hx - dx * 1.5;
      const tCamY = 1.6;
      const tCamZ = hz - dz * 1.5;
      const tLookX = hx + dx * 5;
      const tLookZ = hz + dz * 5;

      camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, tCamX, 0.12);
      camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, tCamY, 0.12);
      camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, tCamZ, 0.12);
      lookRef.current.x = THREE.MathUtils.lerp(lookRef.current.x, tLookX, 0.12);
      lookRef.current.z = THREE.MathUtils.lerp(lookRef.current.z, tLookZ, 0.12);
    }
    camera.position.set(camRef.current.x, camRef.current.y, camRef.current.z);
    camera.lookAt(lookRef.current.x, 0.3, lookRef.current.z);
  });

  return (
    <>
      <fog attach="fog" args={['#0a1f0f', 10, 32]} />
      <ambientLight intensity={0.7} color="#a7f3d0" />
      <directionalLight position={[6, 12, 4]} intensity={1} color="#fef08a" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color="#0f3d1f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <planeGeometry args={[state.config.width + 0.5, state.config.height + 0.5]} />
        <meshLambertMaterial color="#1a4a2a" emissive="#0a2a0a" emissiveIntensity={0.2} />
      </mesh>

      {/* Trees - fast, no shadows */}
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}

      {/* Snakes - only render up to 10 segments per snake for perf in FPV? No, render all but simple */}
      {state.snakes.map(snake =>
        snake.alive
          ? snake.body.slice(0, snake.id === 'human' ? 1 : 12).map((p, idx) => (
              <SnakeSeg
                key={`${snake.id}-${idx}`}
                pos={[p.x + offsetX, idx === 0 ? 0.4 : 0.15, p.y + offsetZ]}
                color={snake.color}
                isHead={idx === 0}
              />
            ))
          : null
      )}

      {/* Foods */}
      {state.foods.map(f => (
        <Mushroom key={f.id} pos={f.pos} type={f.type} offsetX={offsetX} offsetZ={offsetZ} />
      ))}
    </>
  );
}

export default function ForestFPV({ state }: { state: SnakeState }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border-2 border-emerald-800">
      <Canvas
        dpr={1}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 14, 10], fov: 60 }}
        style={{ background: '#0a1f0f' }}
      >
        <ForestScene state={state} />
      </Canvas>

      <div className="pointer-events-none absolute top-2 left-2 right-2 flex justify-between text-[10px] font-mono">
        <div className="px-2 py-1 rounded-full bg-black/70 border border-emerald-500/30 text-emerald-300">🌲 FOREST FPV • WASD • EAT 🍄</div>
        <div className="hidden sm:flex px-2 py-1 rounded-full bg-black/70 border border-emerald-500/30 text-emerald-300">FAST MODE • 60 FPS</div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
