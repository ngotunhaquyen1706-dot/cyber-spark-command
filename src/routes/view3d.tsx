import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh, Group } from "three";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";

export const Route = createFileRoute("/view3d")({
  head: () => ({ meta: [{ title: "3D View — NEURON.OS" }] }),
  component: View3DPage,
});

function Esp32() {
  return (
    <group>
      {/* PCB */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.12, 2]} />
        <meshStandardMaterial color="#0c2a3a" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Shield */}
      <mesh position={[-0.6, 0.18, 0]} castShadow>
        <boxGeometry args={[1.4, 0.22, 1.1]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* USB */}
      <mesh position={[1.6, 0.16, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.7]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Header pins */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={`a-${i}`} position={[-1.5 + i * 0.21, 0.12, 0.95]}>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={`b-${i}`} position={[-1.5 + i * 0.21, 0.12, -0.95]}>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      {/* LEDs */}
      <Led position={[0.8, 0.2, 0.5]} color="#22ffaa" />
      <Led position={[0.8, 0.2, 0.2]} color="#22b8ff" />
      <Html position={[0, 0.5, -1.2]} center distanceFactor={6}>
        <div className="rounded border border-primary/50 bg-background/70 px-2 py-0.5 text-mono text-[10px] text-primary backdrop-blur">
          ESP32-WROOM-32
        </div>
      </Html>
    </group>
  );
}

function Led({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      const m = ref.current.material as { emissiveIntensity?: number };
      const v = 0.6 + Math.abs(Math.sin(s.clock.elapsedTime * 3)) * 1.4;
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = v;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} />
    </mesh>
  );
}

function Microphone() {
  return (
    <group position={[-2.8, 0.4, 1.4]}>
      <mesh>
        <boxGeometry args={[0.8, 0.1, 0.6]} />
        <meshStandardMaterial color="#0d3a30" />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 24]} />
        <meshStandardMaterial color="#cccccc" metalness={0.6} roughness={0.3} />
      </mesh>
      <Html position={[0, 0.55, 0]} center distanceFactor={6}>
        <div className="rounded border border-accent/50 bg-background/70 px-2 py-0.5 text-mono text-[10px] text-accent backdrop-blur">
          INMP441
        </div>
      </Html>
    </group>
  );
}

function Motor({ position }: { position: [number, number, number] }) {
  const wheel = useRef<Group>(null);
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.x += dt * 4;
  });
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.7, 24]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.4} />
      </mesh>
      <group ref={wheel} position={[0, 0, 0.55]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.55, 0.18, 32]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.22, 24]} />
          <meshStandardMaterial color="#22b8ff" emissive="#22b8ff" emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 6, 5]} intensity={40} color="#22b8ff" />
      <pointLight position={[-5, 4, -5]} intensity={30} color="#a060ff" />
      <directionalLight position={[0, 8, 0]} intensity={0.8} />

      <Float floatIntensity={0.6} rotationIntensity={0.2} speed={1.2}>
        <Esp32 />
      </Float>
      <Microphone />
      <Motor position={[2.6, 0.2, 1.4]} />
      <Motor position={[2.6, 0.2, -1.4]} />

      {/* grid floor */}
      <gridHelper args={[20, 20, "#22b8ff", "#1a3550"]} position={[0, -0.8, 0]} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </>
  );
}

function View3DPage() {
  return (
    <div className="space-y-4">
      <div>
        <StatLabel>3D View</StatLabel>
        <h2 className="mt-1 text-2xl font-semibold">Embedded <span className="neon-text">system visualization</span></h2>
        <p className="text-sm text-muted-foreground">Drag to rotate · scroll to zoom</p>
      </div>

      <HoloCard glow className="overflow-hidden p-0">
        <div className="h-[640px] w-full">
          <Canvas camera={{ position: [5, 4, 7], fov: 45 }} shadows>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </div>
      </HoloCard>

      <div className="grid gap-3 sm:grid-cols-4 text-mono text-xs">
        {[
          ["MCU", "ESP32-WROOM"],
          ["MIC", "INMP441 I2S"],
          ["DRIVER", "TB6612FNG"],
          ["MOTORS", "2× DC 6V"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="text-primary">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
