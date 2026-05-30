"use client";

import { TrailTexture } from "@/lib/shaders/trail-texture";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Mesh, Vector2, Vector3 } from "three";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import { uniform } from "three/tsl";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: "js" });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const mouse = new Vector3();
export const uMouse = uniform(mouse, "vec3");

const level = {
  value: 0,
};

export function Experience() {
  const model = useLoader(gltfLoader, "./models/bg.glb");

  const mouse2D = useRef(new Vector2());

  const trail = useMemo(() => {
    return new TrailTexture();
  }, []);

  // LEVELS
  useEffect(() => {
    let direction = 1;

    const interval = setInterval(() => {
      level.value += direction;

      if (level.value >= 5) {
        direction = -1;
      }

      if (level.value <= 0) {
        direction = 1;
      }

      console.log("LEVEL", level.value);
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // MOUSE
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse2D.current.x = e.clientX / window.innerWidth;
      mouse2D.current.y = e.clientY / window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // UPDATE TRAIL
  useFrame(() => {
    trail.setMouse(mouse2D.current.x, mouse2D.current.y);
    trail.update();
  });

  useEffect(() => {
    model.scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      const material = child.material;

      material.onBeforeCompile = (shader: any) => {
        shader.uniforms.uTrail = {
          value: trail.texture,
        };

        shader.uniforms.uLevel = level;

        // VERTEX

        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>

          uniform sampler2D uTrail;

          uniform float uLevel;

          varying vec2 vScreenUV;
        `,
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>

          vec3 pos = transformed;

          vec4 ndc =
            projectionMatrix *
            modelViewMatrix *
            vec4(pos, 1.0);

          vScreenUV =
            ndc.xy / ndc.w;

          vScreenUV =
            vScreenUV * 0.5 + 0.5;

          float extrude =
            texture2D(
              uTrail,
              vScreenUV
            ).r;

          float levelStrength =
            uLevel / 5.0;

          pos.z *= mix(
            0.05,
            1.0,
            extrude * levelStrength
          );

          transformed = pos;
        `,
        );

        // FRAGMENT

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform sampler2D uTrail;
          varying vec2 vScreenUV;
        `,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `
          #include <map_fragment>

          diffuseColor.rgb +=
            texture2D(
              uTrail,
              vScreenUV
            ).rgb * 0.15;
        `,
        );
      };

      material.needsUpdate = true;
    });
  }, [model, trail]);

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
