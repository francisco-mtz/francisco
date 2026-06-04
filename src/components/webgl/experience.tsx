"use client";

import { useEffect, useMemo } from "react";
import { TrailTexture } from "@/lib/shaders/trail-texture";
import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { Bird } from "@/components/webgl/bird";

export function Experience() {
  const invalidate = useThree((s) => s.invalidate);

  const trail = useMemo(() => {
    return new TrailTexture();
  }, []);

  useFrame(({ size, pointer }, delta) => {
    trail.setMouse(
      (pointer.x * 0.5 + 0.5) * size.width,
      (-pointer.y * 0.5 + 0.5) * size.height,
    );
    const alive = trail.update(delta, size);
    if (alive) {
      invalidate();
    }
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
    </>
  );
}
