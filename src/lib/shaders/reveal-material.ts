import { Texture, TextureEventMap } from "three";
import { MeshStandardNodeMaterial, TextureNode } from "three/webgpu";

import {
  Fn,
  cameraProjectionMatrix,
  modelViewMatrix,
  mix,
  positionLocal,
  smoothstep,
  texture,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
  cos,
  float,
  sRGBTransferOETF,
} from "three/tsl";

export function createRevealMaterial(
  map: Texture,
  emissiveMap: Texture<unknown, TextureEventMap> | null,
  trailTexture: Texture,
  plasterTexture: Texture,
) {
  const material = new MeshStandardNodeMaterial({
    map,
    emissiveMap,
    emissiveIntensity: 1,
    toneMapped: false,
  });

  const screenUV = varying(vec2(0.0, 0.0));
  const extrude = texture(trailTexture, screenUV).r;
  const fluidCore = smoothstep(0.92, 1.0, extrude);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palette = Fn(([final]: [any]): any => {
    const a = vec3(0.5);
    const b = vec3(0.5);
    const c = vec3(1.0);
    const d = vec3(0.02, 0.08, 0.18);

    return a.add(b.mul(cos(float(6.283185).mul(c.mul(final).add(d)))));
  });

  material.positionNode = Fn(() => {
    const pos = positionLocal;
    const ndc = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(pos, 1.0));
    screenUV.assign(ndc.xy.div(ndc.w).add(1.0).div(2.0));
    pos.z.mulAssign(mix(0.0, 1.0, extrude));
    return pos;
  })();

  material.colorNode = Fn(() => {
    if (!emissiveMap) {
      return vec4(1.0);
    }

    type texVec4 = TextureNode<"vec4">;
    const plaster = sRGBTransferOETF(texture(plasterTexture, uv())) as texVec4;
    const tt1 = sRGBTransferOETF(texture(map, uv())) as texVec4;
    const tt2 = sRGBTransferOETF(texture(emissiveMap, uv())) as texVec4;

    const level0 = tt2.b;
    const level1 = tt2.g;
    const level2 = tt2.r;
    const level3 = tt1.b;
    const level4 = tt1.g;
    const level5 = tt1.r;
    let final = level0;

    final = mix(final, level1, smoothstep(0.0, 0.2, extrude));
    final = mix(final, level2, smoothstep(0.2, 0.4, extrude));
    final = mix(final, level3, smoothstep(0.4, 0.6, extrude));
    final = mix(final, level4, smoothstep(0.6, 0.8, extrude));
    final = mix(final, level5, smoothstep(0.8, 1.0, extrude));

    const paletteFinal = palette(final);

    const shading = mix(vec3(0.82), vec3(1.08), paletteFinal);

    const cavityMask = float(1.0).sub(final);

    const liquidFlow = fluidCore.mul(cavityMask);

    const cavityDarkness = mix(
      float(1.0),
      float(0.72),
      liquidFlow.mul(cavityMask),
    );

    const microWarp = vec2(
      cos(final.mul(20.0)),
      cos(final.mul(20.0).add(1.2)),
    ).mul(liquidFlow.mul(0.003));

    const fluidPlaster = texture(plasterTexture, uv().add(microWarp));

    const merged = fluidPlaster.rgb.mul(shading).mul(cavityDarkness);

    return vec4(merged, 1.0);
  })();

  material.needsUpdate = true;

  return material;
}
