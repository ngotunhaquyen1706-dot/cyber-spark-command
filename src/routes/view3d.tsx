import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";

export const Route = createFileRoute("/view3d")({
  head: () => ({ meta: [{ title: "3D View — CDP-GROUP1" }] }),
  component: View3DPage,
});

/* ---------------- helpers ---------------- */

function PinRow({
  count,
  start,
  z,
  y = 0.13,
}: {
  count: number;
  start: number;
  z: number;
  y?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[start + i * 0.22, y, z]} castShadow>
          <boxGeometry args={[0.09, 0.18, 0.09]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

function Led({
  position,
  color,
  speed = 3,
}: {
  position: [number, number, number];
  color: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      const m = ref.current.material as { emissiveIntensity?: number };
      const v = 0.4 + Math.abs(Math.sin(s.clock.elapsedTime * speed)) * 1.6;
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = v;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </mesh>
  );
}

function ChipLabel({ text }: { text: string }) {
  return (
    <Html center distanceFactor={8}>
      <div className="rounded border border-primary/60 bg-background/80 px-1.5 py-[1px] text-mono text-[8px] text-primary backdrop-blur whitespace-nowrap">
        {text}
      </div>
    </Html>
  );
}

/* ---------------- ESP32 DEVKIT ---------------- */

function Esp32({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* PCB - màu xanh đen ESP32 DEVKIT */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[5.2, 0.14, 2.2]} />
        <meshStandardMaterial color="#0a2a1e" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* viền vàng quanh PCB */}
      <mesh position={[0, 0.071, 0]}>
        <boxGeometry args={[5.18, 0.005, 2.18]} />
        <meshStandardMaterial color="#1a3a2a" />
      </mesh>

      {/* ESP-WROOM-32 shield - lá chắn kim loại */}
      <mesh position={[-0.4, 0.22, 0]} castShadow>
        <boxGeometry args={[1.8, 0.28, 1.7]} />
        <meshStandardMaterial color="#b8c0c8" metalness={0.95} roughness={0.18} />
      </mesh>
      {/* logo etched lên shield */}
      <mesh position={[-0.4, 0.365, 0]}>
        <boxGeometry args={[1.0, 0.005, 0.4]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.4} />
      </mesh>
      <Html position={[-0.4, 0.38, 0]} center distanceFactor={6}>
        <div className="text-mono text-[7px] text-neutral-300 font-bold tracking-wider">
          ESP-WROOM-32
        </div>
      </Html>

      {/* PCB antenna - đường gấp khúc bên trái */}
      <mesh position={[-1.85, 0.08, 0]}>
        <boxGeometry args={[0.6, 0.01, 1.0]} />
        <meshStandardMaterial color="#c9a14a" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Micro USB port - bên phải */}
      <mesh position={[2.45, 0.18, 0]} castShadow>
        <boxGeometry args={[0.55, 0.22, 0.75]} />
        <meshStandardMaterial color="#8a8a8a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* USB to Serial chip (CP2102) */}
      <mesh position={[1.6, 0.16, 0.4]} castShadow>
        <boxGeometry args={[0.45, 0.1, 0.45]} />
        <meshStandardMaterial color="#101010" metalness={0.4} roughness={0.6} />
      </mesh>
      <Html position={[1.6, 0.22, 0.4]} center distanceFactor={9}>
        <div className="text-mono text-[6px] text-neutral-400">CP2102</div>
      </Html>

      {/* AMS1117 voltage regulator */}
      <mesh position={[1.55, 0.16, -0.4]} castShadow>
        <boxGeometry args={[0.55, 0.12, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Buttons EN / BOOT */}
      <mesh position={[1.0, 0.18, 0.85]} castShadow>
        <boxGeometry args={[0.3, 0.16, 0.3]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1.0, 0.18, -0.85]} castShadow>
        <boxGeometry args={[0.3, 0.16, 0.3]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* LEDs power & TX */}
      <Led position={[0.4, 0.18, 0.85]} color="#ff4040" speed={2} />
      <Led position={[0.4, 0.18, -0.85]} color="#40ff80" speed={4} />

      {/* Header pins 2x15 hai bên */}
      <PinRow count={15} start={-1.8} z={1.0} />
      <PinRow count={15} start={-1.8} z={-1.0} />

      <Html position={[0, 0.7, -1.5]} center distanceFactor={6}>
        <div className="rounded border border-primary/60 bg-background/80 px-2 py-0.5 text-mono text-[10px] text-primary backdrop-blur">
          ESP32 DEVKIT V1
        </div>
      </Html>
    </group>
  );
}

/* ---------------- TB6612FNG motor driver ---------------- */

function TB6612({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* PCB đỏ */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.12, 1.6]} />
        <meshStandardMaterial color="#7a1020" metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Chip TB6612FNG - SOP24 đen */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[1.3, 0.14, 0.55]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* chân chip */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`l${i}`} position={[-0.6 + i * 0.11, 0.13, 0.32]}>
          <boxGeometry args={[0.05, 0.05, 0.12]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`r${i}`} position={[-0.6 + i * 0.11, 0.13, -0.32]}>
          <boxGeometry args={[0.05, 0.05, 0.12]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <Html position={[0, 0.26, 0]} center distanceFactor={7}>
        <div className="text-mono text-[7px] text-neutral-300 font-bold">
          TB6612FNG
        </div>
      </Html>

      {/* Tụ điện - 2 cái trụ tròn */}
      <mesh position={[-0.85, 0.25, 0.5]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.32, 20]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.85, 0.25, 0.5]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.32, 20]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Header pins ngõ ra motor (AO1 AO2 BO1 BO2) */}
      <PinRow count={6} start={-0.55} z={-0.7} y={0.13} />
      <PinRow count={8} start={-0.77} z={0.7} y={0.13} />

      <Html position={[0, 0.6, -1.1]} center distanceFactor={6}>
        <div className="rounded border border-accent/60 bg-background/80 px-2 py-0.5 text-mono text-[10px] text-accent backdrop-blur">
          TB6612FNG · DUAL H-BRIDGE
        </div>
      </Html>
    </group>
  );
}

/* ---------------- INMP441 mic module ---------------- */

function Inmp441({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* PCB xanh nhỏ */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.1, 0.6]} />
        <meshStandardMaterial color="#0c3a30" metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Chip INMP441 - MEMS mic vuông nhỏ */}
      <mesh position={[-0.3, 0.13, 0]} castShadow>
        <boxGeometry args={[0.34, 0.1, 0.34]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* lỗ âm thanh trên chip */}
      <mesh position={[-0.3, 0.185, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.01, 16]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <Html position={[-0.3, 0.26, 0]} center distanceFactor={5}>
        <div className="text-mono text-[6px] text-neutral-300">INMP441</div>
      </Html>

      {/* Header pins 6 chân (VDD GND SD WS SCK L/R) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0.05 + i * 0.18, 0.13, 0]} castShadow>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      <Html position={[0, 0.55, -0.5]} center distanceFactor={6}>
        <div className="rounded border border-success/60 bg-background/80 px-2 py-0.5 text-mono text-[10px] text-success backdrop-blur">
          INMP441 · I2S MEMS MIC
        </div>
      </Html>
    </group>
  );
}

/* ---------------- Scene ---------------- */

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 7, 6]} intensity={45} color="#22b8ff" />
      <pointLight position={[-6, 5, -6]} intensity={35} color="#a060ff" />
      <directionalLight position={[0, 10, 2]} intensity={1.0} castShadow />

      <Float floatIntensity={0.5} rotationIntensity={0.15} speed={1.0}>
        <Esp32 position={[0, 0.5, 0]} />
      </Float>

      <Float floatIntensity={0.4} rotationIntensity={0.2} speed={1.3}>
        <TB6612 position={[-3.4, 0.4, 2.6]} />
      </Float>

      <Float floatIntensity={0.6} rotationIntensity={0.25} speed={1.5}>
        <Inmp441 position={[3.6, 0.6, 2.4]} />
      </Float>

      {/* grid floor */}
      <gridHelper args={[24, 24, "#22b8ff", "#1a3550"]} position={[0, -0.8, 0]} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={18} />
    </>
  );
}

function View3DPage() {
  return (
    <div className="space-y-4">
      <div>
        <StatLabel>3D View</StatLabel>
        <h2 className="mt-1 text-2xl font-semibold">
          Hardware <span className="neon-text">module visualization</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Kéo để xoay · cuộn để zoom · 3 module: ESP32 DEVKIT, TB6612FNG, INMP441
        </p>
      </div>

      <HoloCard glow className="overflow-hidden p-0">
        <div className="h-[640px] w-full">
          <ClientOnly
            fallback={
              <div className="flex h-full items-center justify-center text-mono text-xs text-muted-foreground">
                Initializing 3D scene…
              </div>
            }
          >
            <Canvas camera={{ position: [7, 5, 9], fov: 45 }} shadows>
              <Suspense fallback={null}>
                <Scene />
              </Suspense>
            </Canvas>
          </ClientOnly>
        </div>
      </HoloCard>

      <div className="grid gap-3 sm:grid-cols-3 text-mono text-xs">
        {[
          {
            k: "ESP32 DEVKIT V1",
            v: "MCU dual-core 240MHz · WiFi + BT · 30 chân GPIO",
            c: "text-primary",
          },
          {
            k: "TB6612FNG",
            v: "Dual H-bridge driver · 1.2A/ch · điều khiển 2 motor DC",
            c: "text-accent",
          },
          {
            k: "INMP441",
            v: "MEMS mic I2S · 24-bit · thu âm cho Edge Impulse",
            c: "text-success",
          },
        ].map((it) => (
          <div
            key={it.k}
            className="rounded-lg border border-border/60 bg-background/30 px-3 py-2"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              MODULE
            </div>
            <div className={it.c}>{it.k}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{it.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
