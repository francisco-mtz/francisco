"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRevealMaterial } from "@/lib/shaders/reveal-material";
import { TrailTexture } from "@/lib/shaders/trail-texture";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Mesh, MeshBasicMaterial, Vector2 } from "three";
import { useGLTF } from "@react-three/drei";

export function Experience() {
  const materialCache = useRef(new Map<string, MeshBasicMaterial>());
  const model = useGLTF("models/bg.glb", "/draco/");
  const mouse2D = useRef(new Vector2());

  const meshes = useMemo(() => {
    const items: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];

    model.scene.traverse((child) => {
      if (child instanceof Mesh) {
        items.push(child);
      }
    });

    return items;
  }, [model]);

  const trail = useMemo(() => {
    return new TrailTexture();
  }, []);

  // MOUSE
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse2D.current.x = e.clientX;
      mouse2D.current.y = e.clientY;
    };
    window.addEventListener("pointermove", handleMouseMove, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
    };
  }, []);

  const updateTrail = () => {
    const { x, y } = mouse2D.current;

    trail.setMouse(x, y);
    trail.update();
  };

  // UPDATE TRAIL
  useFrame(updateTrail);

  useEffect(() => {
    meshes.forEach((child) => {
      if (!(child instanceof Mesh)) return;
      const originalMaterial = child.material;
      const map = originalMaterial.map;

      if (!map) return;
      let material = materialCache.current.get(map.uuid);

      if (!material) {
        material = createRevealMaterial(map, trail.texture);
        materialCache.current.set(map.uuid, material);
      }
      child.material = material;

      originalMaterial.dispose();
    });
  }, [meshes, trail.texture]);

  return (
    <>
      <ambientLight intensity={1.5} />
      <primitive object={model.scene} />

      {/* <mesh position={[0, 0, 1]}>
        <planeGeometry args={[0.8, 0.8]} />

        <meshBasicMaterial map={trail.texture} toneMapped={false} />
      </mesh> */}
    </>
  );
}
useGLTF.preload("models/bg.glb");
