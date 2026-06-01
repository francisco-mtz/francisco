import {
  MeshBasicMaterial,
  Texture,
  WebGLProgramParametersWithUniforms,
} from "three";

export function createRevealMaterial(map: Texture, trailTexture: Texture) {
  const material = new MeshBasicMaterial({ map });

  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTrail = { value: trailTexture };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
        #include <common>
        uniform sampler2D uTrail;
        varying vec2 vScreenUV;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        vec4 ndc = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vScreenUV = ndc.xy / ndc.w;
        vScreenUV = vScreenUV * 0.5 + 0.5;
        
        float extrude = texture2D(uTrail, vScreenUV).r;
        float strength = smoothstep(0.2, 0.9, extrude);

        vec3 pos = position;
        pos.z *= mix(0.35, 1.0, strength);

        transformed = pos;
      `,
    );
  };

  material.needsUpdate = true;

  return material;
}
