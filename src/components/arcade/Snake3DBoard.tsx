"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, PerspectiveCamera } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SnakeState, Snake } from "@/lib/game/snake-engine";

function SnakeSegment({ pos, color, isHead, isHuman }: { pos: [number, number, number]; color: string; isHead: boolean; isHuman?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current && isHead) {
      ref.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={pos}>
      {/* Solid core */}
      <mesh ref={ref}>
        <boxGeometry args={isHead ? [0.9, 0.6, 0.9] : [0.85, 0.4, 0.85]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHead ? 1.2 : 0.6}
          roughness={0.2}
          metalness={0.8}
        />
        {/* Vector edges */}
        <Edges color={isHuman ? "#ffff00" : "#ffffff"} threshold={15} />
      </mesh>
      {/* Glow wireframe overlay */}
      <mesh>
        <boxGeometry args={isHead ? [0.92, 0.62, 0.92] : [0.87, 0.42, 0.87]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.3} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      {isHead && (
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
}

function FoodMesh({ pos, type }: { pos: [number, number, number]; type: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 2;
      ref.current.position.y = pos[1] + Math.sin(clock.getElapsedTime() * 3) * 0.15;
    }
  });

  const color = type === 'coin' ? '#facc15' : type === 'gem' ? '#60a5fa' : '#e879f9';

  return (
    <group position={pos}>
      <mesh ref={ref}>
        {type === 'coin' ? <cylinderGeometry args={[0.4, 0.4, 0.2, 6]} /> : type === 'gem' ? <octahedronGeometry args={[0.5, 0]} /> : <icosahedronGeometry args={[0.5, 0]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} roughness={0.1} metalness={0.9} wireframe={false} />
        <Edges color="white" />
      </mesh>
      <pointLight color={color} intensity={2} distance={3} />
    </group>
  );
}

function WireframeFloor({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <Grid
        position={[0, -0.5, 0]}
        args={[width, height]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#00ffff"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#ff00ff"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
      />
      {/* Outer walls as vector */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[width + 0.2, 2, height + 0.2]} />
        <meshStandardMaterial color="#111" transparent opacity={0.2} wireframe />
        <Edges color="#00ffff" />
      </mesh>
    </group>
  );
}

function Scene({ state }: { state: SnakeState }) {
  const { snakes, foods, config } = state;

  // Center offset
  const offsetX = -config.width / 2 + 0.5;
  const offsetZ = -config.height / 2 + 0.5;

  const snakeElements = useMemo(() => {
    return snakes.flatMap(snake =>
      snake.body.map((p, idx) => {
        const isHead = idx === 0;
        const pos: [number, number, number] = [p.x + offsetX, isHead ? 0.3 : 0.15, p.y + offsetZ];
        return (
          <SnakeSegment
            key={`${snake.id}-${idx}-${p.x}-${p.y}`}
            pos={pos}
            color={snake.color}
            isHead={isHead}
            isHuman={snake.id === 'human'}
          />
        );
      })
    );
  }, [snakes, offsetX, offsetZ]);

  const foodElements = useMemo(() => {
    return foods.map(food => {
      const pos: [number, number, number] = [food.pos.x + offsetX, 0.3, food.pos.y + offsetZ];
      return <FoodMesh key={food.id} pos={pos} type={food.type} />;
    });
  }, [foods, offsetX, offsetZ]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 14, 10]} fov={50} />
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.1}
        maxDistance={25}
        minDistance={5}
        target={[0, 0, 0]}
        autoRotate={false}
        enableDamping
      />

      <ambientLight intensity={0.3} />
      <pointLight position={[5, 10, 5]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, 8, -5]} intensity={0.8} color="#ff00ff" />
      <directionalLight position={[0, 20, 0]} intensity={0.5} />

      <WireframeFloor width={config.width} height={config.height} />

      {snakeElements}
      {foodElements}

      {/* Vector grid lines as extra flair */}
      <gridHelper args={[config.width, config.width, "#00ffff", "#222"]} position={[0, -0.49, 0]} />
    </>
  );
}

export default function Snake3DBoard({ state, isPlaying }: { state: SnakeState; isPlaying?: boolean }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border-2 border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #000 70%)' }}
      >
        <Scene state={state} />
      </Canvas>

      {/* Vector HUD overlay */}
      <div className="pointer-events-none absolute top-2 left-2 right-2 flex justify-between text-[10px] font-mono">
        <div className="px-2 py-1 rounded-full bg-black/80 border border-cyan-400/30 text-cyan-400 backdrop-blur">
          VECTOR MODE • TURN {state.turn} • {state.snakes.filter(s=>s.alive).length} ALIVE
        </div>
        <div className="px-2 py-1 rounded-full bg-black/80 border border-fuchsia-400/30 text-fuchsia-400 backdrop-blur">
          3D WIREFRAME • DRAG TO ROTATE • SCROLL TO ZOOM
        </div>
      </div>

      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,255,0.03)_3px,transparent_4px)] opacity-50" />
    </div>
  );
}
