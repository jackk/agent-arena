// @ts-nocheck
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SnakeState } from "@/lib/game/snake-engine";

// PS2 low-poly tree - 3 quads intersecting for leaves, box trunk - flat shaded
function PS2Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const h = (1.2 + Math.random() * 0.3) * scale;
  const greens = ["#2d6a2e", "#1e4a1e", "#3a7a3a"];
  const col = greens[Math.floor(Math.random() * greens.length)];

  return (
    <group position={position}>
      {/* Trunk - boxy PS2 */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.15 * scale, h, 0.15 * scale]} />
        <meshLambertMaterial color="#2a1f15" flatShading />
      </mesh>
      {/* Leaves - 2 intersecting planes like PS2 billboard */}
      <group position={[0, h + 0.3, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[1.1 * scale, 1.2 * scale]} />
          <meshLambertMaterial color={col} flatShading side={THREE.DoubleSide} transparent opacity={0.95} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.1 * scale, 1.2 * scale]} />
          <meshLambertMaterial color={col} flatShading side={THREE.DoubleSide} transparent opacity={0.95} />
        </mesh>
        {/* Top blob */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.6 * scale, 0.4 * scale, 0.6 * scale]} />
          <meshLambertMaterial color={col} flatShading />
        </mesh>
      </group>
    </group>
  );
}

// PS2 mushroom - chunky, 4 sides
function PS2Mushroom({ pos, type, offsetX, offsetZ }: { pos: any; type: string; offsetX: number; offsetZ: number }) {
  const capColor = type === 'gem' ? "#4a9eff" : type === 'power' ? "#d060ff" : "#ffcc33";
  return (
    <group position={[pos.x + offsetX, 0.18, pos.y + offsetZ]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.1, 0.18, 0.1]} />
        <meshLambertMaterial color="#e8d5b5" flatShading />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <meshLambertMaterial color={capColor} flatShading />
      </mesh>
    </group>
  );
}

function PS2SnakeSeg({ pos, color, isHead }: { pos: [number, number, number]; color: string; isHead: boolean }) {
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={isHead ? [0.7, 0.45, 0.7] : [0.55, 0.32, 0.55]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {isHead && (
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.18, 0.08, 0.18]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      )}
      {/* Black outline via slightly larger black box - PS2 toon */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={isHead ? [0.78, 0.48, 0.78] : [0.62, 0.35, 0.62]} />
        <meshBasicMaterial color="black" wireframe={false} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function PS2ForestScene({ state }: { state: SnakeState }) {
  const offsetX = -state.config.width / 2 + 0.5;
  const offsetZ = -state.config.height / 2 + 0.5;

  // PS2 ground texture - low-res checker with nearest filter
  const groundTex = useMemo(() => {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a4a1a';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1f5a1f';
    for (let i = 0; i < 16; i++) {
      ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }, []);

  const trees = useMemo(() => {
    const res: { pos: [number, number, number]; scale: number }[] = [];
    const W = state.config.width;
    const H = state.config.height;
    // PS2 style - very limited draw distance, pop-in, so fewer trees but chunky
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = Math.max(W, H) / 2 + 1 + Math.random() * 5;
      res.push({ pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r], scale: 0.6 + Math.random() * 0.6 });
    }
    // Some interior but sparse
    for (let i = 0; i < 6; i++) {
      res.push({
        pos: [(Math.random() - 0.5) * (W + 6), 0, (Math.random() - 0.5) * (H + 6)],
        scale: 0.4 + Math.random() * 0.4,
      });
    }
    return res;
  }, [state.config.width, state.config.height]);

  // PS2 camera - first person with wobble and snap (no smooth lerp)
  const camRef = useRef({ x: 0, y: 12, z: 12 });
  const lookRef = useRef({ x: 0, y: 0, z: 0 });

  // We need camera from useThree, but we can use useFrame with camera
  const CameraRig = () => {
    const { camera } = require("@react-three/fiber").useThree();
    useFrame(({ clock }) => {
      const t = clock.getElapsedTime();
      const human = state.snakes.find((s: any) => s.id === 'human' && s.alive) || state.snakes.find((s: any) => s.alive);
      if (!human) {
        camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, 0, 0.03);
        camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, 15, 0.03);
        camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, 10, 0.03);
        lookRef.current.x = 0;
        lookRef.current.z = 0;
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
        // PS2 wobble - vertex swim / floating point inaccuracy
        const wobbleX = Math.sin(t * 7.3) * 0.02;
        const wobbleY = Math.cos(t * 5.7) * 0.03;
        const bobY = Math.sin(t * 6) * 0.05;

        camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, hx - dx * 1.4 + wobbleX, 0.1);
        camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, 1.3 + bobY, 0.1);
        camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, hz - dz * 1.4 + wobbleY, 0.1);
        lookRef.current.x = THREE.MathUtils.lerp(lookRef.current.x, hx + dx * 4, 0.1);
        lookRef.current.z = THREE.MathUtils.lerp(lookRef.current.z, hz + dz * 4, 0.1);
      }
      camera.position.set(camRef.current.x, camRef.current.y, camRef.current.z);
      camera.lookAt(lookRef.current.x, 0.3, lookRef.current.z);
    });
    return null;
  };

  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#0a1a0a', 5, 16]} />
      <ambientLight intensity={0.5} color="#6a8a6a" />
      <directionalLight position={[4, 10, 2]} intensity={0.8} color="#ffeb99" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial map={groundTex} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <planeGeometry args={[state.config.width, state.config.height]} />
        <meshLambertMaterial color="#2a5a2a" flatShading transparent opacity={0.9} />
      </mesh>

      {trees.map((t, i) => (
        <PS2Tree key={i} position={t.pos} scale={t.scale} />
      ))}

      {state.snakes.map((snake: any) =>
        snake.alive
          ? snake.body.slice(0, snake.id === 'human' ? 1 : 10).map((p: any, idx: number) => (
              <PS2SnakeSeg
                key={`${snake.id}-${idx}`}
                pos={[p.x + offsetX, idx === 0 ? 0.35 : 0.12, p.y + offsetZ]}
                color={snake.color}
                isHead={idx === 0}
              />
            ))
          : null
      )}

      {state.foods.map((f: any) => (
        <PS2Mushroom key={f.id} pos={f.pos} type={f.type} offsetX={offsetX} offsetZ={offsetZ} />
      ))}
    </>
  );
}

export default function PS2Forest({ state }: { state: SnakeState }) {
  return (
    <div className="relative w-full h-full rounded-[4px] overflow-hidden bg-black border-[3px] border-[#1a1a1a] shadow-[inset_0_0_0_2px_#333,0_4px_0_#000]">
      <Canvas
        dpr={0.6}
        gl={{ antialias: false, powerPreference: 'low-power', stencil: false, depth: true }}
        camera={{ position: [0, 14, 10], fov: 58 }}
        style={{ background: '#0a1a0a', imageRendering: 'pixelated' } as any}
      >
        <PS2ForestScene state={state} />
      </Canvas>

      {/* PS2 screen curvature + bloom */}
      <div className="pointer-events-none absolute inset-0 rounded-[4px] shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

      {/* PS2 HUD - memory card style */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[22px] bg-gradient-to-b from-[#1a1a1a] to-black border-t-2 border-[#333] flex items-center px-2 gap-2 text-[8px] font-mono tracking-widest">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-[#00ff00] rounded-[1px] animate-pulse" />
          <span className="text-[#8f8]">MEMORY CARD (PS2) /8MB - SNAKE ARENA - FOREST - {state.snakes.filter((s:any)=>s.alive).length} ALIVE</span>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[#666]">
          <span>△ PLAY</span><span>× STEP</span><span>□ RESET</span><span>○ GRID</span>
        </div>
      </div>
    </div>
  );
}
