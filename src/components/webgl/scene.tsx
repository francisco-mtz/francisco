"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";
import { useCallback } from "react";
import { DefaultGLProps } from "@react-three/fiber/dist/declarations/src/core/renderer";

const Experience = dynamic(
  () => import("@/components/webgl/experience").then((mod) => mod.Experience),
  { ssr: false },
);

export function Scene() {
  const createRenderer = useCallback(async (glProps: DefaultGLProps) => {
    const renderer = new WebGPURenderer({
      canvas: glProps.canvas as HTMLCanvasElement,
    });
    await renderer.init();
    return renderer;
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-screen">
      <Canvas frameloop="demand" gl={createRenderer}>
        <Experience />
      </Canvas>
    </div>
  );
}
