// @ts-nocheck
"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SnakeState } from "@/lib/game/snake-engine";

// --- PS2-style low-poly tree - flat shaded, 4 sides, no shadows ---
function PS2Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const h = (1.2 + Math.random() * 0.4) * scale;
  const s = (0.6 + Math.random() * 0.4) * scale;
  // PS2 colors slightly oversaturated, low-poly
  const greens = ["#2d6a2e", "#1e4a1e", "#3a7a3a", "#245a25"];
  const col = greens[Math.floor(Math.random() * greens.length)];
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.08 * scale, 0.14 * scale, h, 4]} />
        <meshLambertMaterial color="#2a1f15" flatShading />
      </mesh>
      <mesh position={[0, h + 0.2, 0]}>
        <coneGeometry args={[s * 0.85, s * 1.3, 4]} />
        <meshLambertMaterial color={col} flatShading />
      </mesh>
      <mesh position={[0, h - 0.1, 0]}>
        <coneGeometry args={[s, s * 1.1, 4]} />
        <meshLambertMaterial color={col} flatShading transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// PS2 mushroom - chunky, flat shaded
function PS2Mushroom({ pos, type, offsetX, offsetZ }: { pos: { x: number; y: number }; type: string; offsetX: number; offsetZ: number }) {
  const capColor = type === 'gem' ? "#4a9eff" : type === 'power' ? "#d060ff" : "#ffcc33";
  return (
    <group position={[pos.x + offsetX, 0.2, pos.y + offsetZ]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.2, 4]} />
        <meshLambertMaterial color="#e8d5b5" flatShading />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 0.15, 6]} />
        <meshLambertMaterial color={capColor} flatShading emissive={capColor} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// PS2 snake segment - boxy, flat shaded like PS2 era
function PS2SnakeSeg({ pos, color, isHead }: { pos: [number, number, number]; color: string; isHead: boolean }) {
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={isHead ? [0.75, 0.5, 0.75] : [0.6, 0.35, 0.6]} />
        <meshLambertMaterial color={color} flatShading emissive={color} emissiveIntensity={isHead ? 0.4 : 0.15} />
      </mesh>
      {isHead && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.2]} />
          <meshLambertMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
      )}
    </group>
  );
}

// PS2 ground texture - low-res 16x16 noise, nearest filter for chunky pixels
function usePS2GroundTexture() {
  return useMemo(() => {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Base green
    ctx.fillStyle = '#1a4a1a';
    ctx.fillRect(0, 0, size, size);
    // Add noise squares like PS2 low-res texture
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      const c = Math.random() > 0.5 ? '#1f5a1f' : '#143d14';
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);
}

function PS2ForestScene({ state }: { state: SnakeState }) {
  const { camera } = useThree();
  const camRef = useRef({ x: 0, y: 14, z: 12 });
  const lookRef = useRef({ x: 0, y: 0, z: 0 });
  const offsetX = -state.config.width / 2 + 0.5;
  const offsetZ = -state.config.height / 2 + 0.5;

  const groundTex = usePS2GroundTexture();

  // PS2 draw distance fog + low tree count for PS2 vibe (pop-in)
  const trees = useMemo(() => {
    const res: { pos: [number, number, number]; scale: number }[] = [];
    const W = state.config.width;
    const H = state.config.height;
    // PS2 had limited draw distance, so fewer trees, clustered
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.3;
      const r = Math.max(W, H) / 2 + 1.5 + Math.random() * 6;
      res.push({ pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r], scale: 0.6 + Math.random() * 0.7 });
    }
    // Some interior for depth
    for (let i = 0; i < 8; i++) {
      res.push({
        pos: [(Math.random() - 0.5) * (W + 8), 0, (Math.random() - 0.5) * (H + 8)],
        scale: 0.4 + Math.random() * 0.4,
      });
    }
    return res;
  }, [state.config.width, state.config.height]);

  // First-person follow with PS2 bobbing
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const human = state.snakes.find(s => s.id === 'human' && s.alive) || state.snakes.find(s => s.alive);
    if (!human) {
      camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, 0, 0.03);
      camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, 16, 0.03);
      camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, 12, 0.03);
      lookRef.current.x = THREE.MathUtils.lerp(lookRef.current.x, 0, 0.03);
      lookRef.current.z = THREE.MathUtils.lerp(lookRef.current.z, 0, 0.03);
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
      // PS2 camera bob
      const bobY = Math.sin(t * 8) * 0.06;
      const bobX = Math.sin(t * 4) * 0.03;

      const tCamX = hx - dx * 1.8 + bobX;
      const tCamY = 1.4 + bobY;
      const tCamZ = hz - dz * 1.8;

      const tLookX = hx + dx * 6;
      const tLookZ = hz + dz * 6;

      camRef.current.x = THREE.MathUtils.lerp(camRef.current.x, tCamX, 0.08);
      camRef.current.y = THREE.MathUtils.lerp(camRef.current.y, tCamY, 0.08);
      camRef.current.z = THREE.MathUtils.lerp(camRef.current.z, tCamZ, 0.08);
      lookRef.current.x = THREE.MathUtils.lerp(lookRef.current.x, tLookX, 0.08);
      lookRef.current.z = THREE.MathUtils.lerp(lookRef.current.z, tLookZ, 0.08);
    }
    camera.position.set(camRef.current.x, camRef.current.y, camRef.current.z);
    camera.lookAt(lookRef.current.x, 0.3, lookRef.current.z);
  });

  return (
    <>
      {/* Heavy PS2 fog to hide pop-in */}
      <fog attach="fog" args={['#0a1f0f', 6, 18]} />

      {/* PS2 lighting - simple, no shadows, vertex lit */}
      <ambientLight intensity={0.6} color="#a8d8a8" />
      <directionalLight position={[5, 10, 3]} intensity={0.9} color="#ffeb99" />

      {/* Ground - low-res textured */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial map={groundTex} flatShading />
      </mesh>

      {/* Clearing where snake moves - slightly lighter, flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <planeGeometry args={[state.config.width + 1, state.config.height + 1]} />
        <meshLambertMaterial color="#2a5a2a" flatShading />
      </mesh>

      {/* Grid lines very subtle like PS2 wireframe */}
      <gridHelper args={[state.config.width, state.config.width, 0x1e4a1e, 0x1e4a1e]} position={[0, -0.48, 0]} />

      {/* Trees - PS2 low-poly */}
      {trees.map((t, i) => (
        <PS2Tree key={i} position={t.pos} scale={t.scale} />
      ))}

      {/* Snakes - boxy PS2 style, only render up to 15 segs for perf */}
      {state.snakes.map(snake =>
        snake.alive
          ? snake.body.slice(0, snake.id === 'human' ? 1 : 14).map((p, idx) => (
              <PS2SnakeSeg
                key={`${snake.id}-${idx}`}
                pos={[p.x + offsetX, idx === 0 ? 0.35 : 0.12, p.y + offsetZ]}
                color={snake.color}
                isHead={idx === 0}
              />
            ))
          : null
      )}

      {/* Foods as PS2 mushrooms */}
      {state.foods.map(f => (
        <PS2Mushroom key={f.id} pos={f.pos} type={f.type} offsetX={offsetX} offsetZ={offsetZ} />
      ))}
    </>
  );
}

export default function ForestFPV({ state }: { state: SnakeState }) {
  return (
    <div className="relative w-full h-full rounded-[8px] overflow-hidden bg-black border-2 border-[#2a5a2a] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
      {/* PS2 low-res Canvas - dpr 0.75, antialias false for crunchy pixels */}
      <Canvas
        dpr={0.85}
        gl={{ antialias: false, powerPreference: 'low-power' }}
        camera={{ position: [0, 14, 10], fov: 68 }}
        style={{
          background: '#0a1f0f',
          imageRendering: 'pixelated' as any,
        }}
      >
        <PS2ForestScene state={state} />
      </Canvas>

      {/* PS2 CRT + chromatic aberration + dithering overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Scanlines - strong PS2 interlaced */}
        <div className="absolute inset-0 opacity-[0.15] bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,black_2px,transparent_3px)]" />
        {/* Chromatic aberration */}
        <div className="absolute inset-0 opacity-[0.06] mix-blend-screen" style={{ background: 'linear-gradient(90deg, red 0%, transparent 33%, transparent 66%, cyan 100%)', filter: 'blur(0.5px)' }} />
        {/* Dithering pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='0' y='0' fill='white'/%3E%3Crect width='1' height='1' x='2' y='1' fill='white'/%3E%3Crect width='1' height='1' x='1' y='2' fill='white'/%3E%3Crect width='1' height='1' x='3' y='3' fill='white'/%3E%3C/svg%3E")`, backgroundSize: '4px 4px' }} />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.85)_100%)]" />
        {/* Letterbox black bars for 4:3 PS2 feel on widescreen */}
        <div className="absolute top-0 left-0 right-0 h-[3%] bg-black/80" />
        <div className="absolute bottom-0 left-0 right-0 h-[3%] bg-black/80" />
      </div>

      {/* PS2 HUD */}
      <div className="pointer-events-none absolute top-2 left-2 flex gap-1.5">
        <div className="px-2 py-1 rounded-[3px] bg-black/80 border border-[#3a6a3a] text-[#8f8] text-[9px] font-mono tracking-widest shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          ● SNAKE • PS2 • {state.snakes.filter(s=>s.alive).length} ALIVE
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-between items-end">
        <div className="px-2.5 py-1.5 rounded-[4px] bg-black/80 border-2 border-[#2a5a2a] text-[#8f8] text-[10px] font-mono leading-tight shadow-[2px_2px_0_#000]">
          <div className="text-[8px] tracking-[0.2em] opacity-70">FOREST - FIRST PERSON</div>
          <div>WASD TO SLITHER • EAT 🍄</div>
        </div>
        <div className="hidden sm:block px-2 py-1 rounded-[3px] bg-[#1a3a5a]/80 border border-[#3a5a8a] text-[#8af] text-[9px] font-mono">
          △ ○ × □ PS2 • 480i • 60FPS
        </div>
      </div>
    </div>
  );
}
