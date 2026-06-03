"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { WebGPURenderer } from "three/webgpu";

const Experience = dynamic(
  () => import("@/components/webgl/experience").then((mod) => mod.Experience),
  { ssr: false },
);

export function Scene() {
  return (
    <div className="fixed top-0 left-0 w-full h-screen">
      <Canvas
        camera={{
          position: [0, 0, 4],
          fov: 90,
        }}
        dpr={[0.5, 2]}
        gl={async (glProps) => {
          const renderer = new WebGPURenderer({
            canvas: glProps.canvas as HTMLCanvasElement,
            antialias: true,
            alpha: true,
          });
          await renderer.init();
          return renderer;
        }}
      >
        <OrbitControls />
        <Experience />
      </Canvas>
    </div>
  );
}
