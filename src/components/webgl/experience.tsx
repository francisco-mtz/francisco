"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRevealMaterial } from "@/lib/shaders/reveal-material";
import { TrailTexture } from "@/lib/shaders/trail-texture";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Mesh, SRGBColorSpace, Vector2 } from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { MeshStandardNodeMaterial } from "three/webgpu";

export function Experience() {
  const materialCache = useRef(new Map<string, MeshStandardNodeMaterial>());
  const plaster = useTexture("/textures/plaster.jpg", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });
  const model = useGLTF("models/bg.glb", "/draco/");
  const mouse2D = useRef(new Vector2());

  const meshes = useMemo(() => {
    const items: Mesh<BufferGeometry, MeshStandardNodeMaterial>[] = [];

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
      const { map, emissiveMap } = originalMaterial;

      if (!map) return;
      let material = materialCache.current.get(map.uuid);

      if (!material) {
        material = createRevealMaterial(
          map,
          emissiveMap,
          trail.texture,
          plaster,
        );
        materialCache.current.set(map.uuid, material);
      }
      child.material = material;

      originalMaterial.dispose();
    });
  }, [meshes, trail.texture, plaster]);

  return (
    <>
      <ambientLight intensity={1.0} />
      <primitive object={model.scene} position={[0, 0, 0.9]} />
    </>
  );
}
useGLTF.preload("models/bg.glb");
