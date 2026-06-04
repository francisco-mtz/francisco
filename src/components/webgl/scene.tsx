"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";

const Experience = dynamic(
  () => import("@/components/webgl/experience").then((mod) => mod.Experience),
  { ssr: false },
);

export function Scene() {
  return (
    <div className="fixed top-0 left-0 w-full h-screen">
      <Canvas
        frameloop="demand"
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
        <Experience />
      </Canvas>
    </div>
  );
}
