"use client";

import { useEffect, useMemo } from "react";
import { GpuTrailTexture } from "@/lib/shaders/gpu-trail-texture";
import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { Bird } from "@/components/webgl/bird";
import { WebGLRenderer } from "three";

export function Experience() {
  const { gl, invalidate } = useThree();

  const trail = useMemo(() => {
    return new GpuTrailTexture();
  }, []);

  useFrame(({ size, pointer }, delta) => {
    trail.setMouse(
      (pointer.x * 0.5 + 0.5) * size.width,
      (-pointer.y * 0.5 + 0.5) * size.height,
    );
    const { x, y, speed } = trail.updateVelocity(size.width, size.height);

    trail.setUniforms(x, y, speed, delta);
    trail.render(gl as WebGLRenderer);
    invalidate();
  });

  useEffect(() => {
    const wake = () => invalidate();
    window.addEventListener("pointermove", wake, { passive: true });
    return () => {
      window.removeEventListener("pointermove", wake);
    };
  }, [invalidate]);

  useEffect(() => {
    return () => {
      trail.dispose();
    };
  }, [trail]);

  return (
    <>
      <ambientLight intensity={1.0} />
      <Bird trail={trail} />
      <mesh position={[-3.8, 2.55, 1]}>
        <planeGeometry args={[0.8, 0.8]} />

        <meshBasicMaterial map={trail.texture} toneMapped={false} />
      </mesh>
    </>
  );
}
