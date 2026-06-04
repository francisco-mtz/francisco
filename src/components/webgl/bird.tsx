import { Mesh, SRGBColorSpace } from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { GLTF } from "three/examples/jsm/Addons.js";
import { useMemo } from "react";
import { createRevealMaterial } from "@/lib/shaders/reveal-material";
import { GpuTrailTexture } from "@/lib/shaders/gpu-trail-texture";
import { MeshStandardNodeMaterial } from "three/webgpu";

type GLTFResult = GLTF & {
  nodes: {
    bird_01: Mesh;
  };
  materials: {
    ["mat-bird"]: MeshStandardNodeMaterial;
  };
};

export function Bird({ trail }: { trail: GpuTrailTexture  }) {
  const plaster = useTexture("/textures/plaster.jpg", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  const { nodes, materials } = useGLTF(
    "models/bird.glb",
  ) as unknown as GLTFResult;

  const revealMaterial = useMemo(() => {
    if (!materials["mat-bird"].map) return null;

    return createRevealMaterial(
      materials["mat-bird"].map,
      materials["mat-bird"].emissiveMap,
      trail.texture,
      plaster,
    );
  }, [materials, trail.texture, plaster]);

  if (!revealMaterial) return null;

  return (
    <group dispose={null}>
      <mesh geometry={nodes.bird_01.geometry} material={revealMaterial} position={[0, 0, 0.9]} />
    </group>
  );
}

useGLTF.preload("models/bird.glb");
