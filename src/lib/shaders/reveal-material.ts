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
  eMap: Texture<unknown, TextureEventMap> | null,
  trailTexture: Texture,
  plasterTexture: Texture,
) {
  const material = new MeshStandardNodeMaterial({
    map,
    emissiveMap: eMap,
    emissiveIntensity: 1,
    toneMapped: false,
  });

  const screenUV = varying(vec2(0.0, 0.0));
  const extrude = texture(trailTexture, screenUV).r;
  const outerExtrude = texture(trailTexture, screenUV).b;

  const fluidCore = smoothstep(0.92, 1.0, extrude);
  const outerFluid = smoothstep(0.02, 0.12, outerExtrude);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palette = Fn(([final]: [any]): any => {
    const a = vec3(0.5);
    const b = vec3(0.5);
    const c = vec3(1.0);
    const d = vec3(0.02, 0.12, 0.22);

    return a.add(b.mul(cos(float(6.283185).mul(c.mul(final).add(d)))));
  });

  material.positionNode = Fn(() => {
    const pos = positionLocal;

    const clipPos = cameraProjectionMatrix
      .mul(modelViewMatrix)
      .mul(vec4(pos, 1.0));

    const projectedUV = clipPos.xy.div(clipPos.w);
    screenUV.assign(projectedUV.mul(0.5).add(0.5).clamp(vec2(0.0), vec2(1.0)));

    pos.z.mulAssign(mix(0.0, 1.0, extrude));
    return pos;
  })();

  material.colorNode = Fn(() => {
    if (!eMap) {
      return vec4(1.0);
    }
    const uvCoord = uv();

    type texVec4 = TextureNode<"vec4">;
    const plaster = texture(plasterTexture, uvCoord) as texVec4;
    const flat = sRGBTransferOETF(texture(eMap, vec2(0.02, 0.02))) as texVec4;

    const mapTex = texture(map, uvCoord);
    const emissiveTex = texture(eMap, uvCoord);

    const t1 = sRGBTransferOETF(mapTex) as texVec4;
    const t2 = sRGBTransferOETF(emissiveTex) as texVec4;

    const level0 = flat.b;
    const level1 = t2.b;
    const level2 = t2.g;
    const level3 = t2.r;
    const level4 = t1.b;
    const level5 = t1.g;
    const level6 = t1.r;
    let final = level0;

    final = mix(final, level1, smoothstep(0.0, 0.19, extrude));
    final = mix(final, level2, smoothstep(0.19, 0.2, extrude));
    final = mix(final, level3, smoothstep(0.2, 0.4, extrude));
    final = mix(final, level4, smoothstep(0.4, 0.6, extrude));
    final = mix(final, level5, smoothstep(0.6, 0.8, extrude));
    final = mix(final, level6, smoothstep(0.8, 1.0, extrude));

    const paletteFinal = palette(final);
    const shading = mix(vec3(0.82), vec3(1.08), paletteFinal);
    const cavityMask = float(1.0).sub(final);
    const liquidFlow = fluidCore.mul(cavityMask);
    const cavityDarkness = mix(
      float(1.0),
      float(0.72),
      liquidFlow.mul(cavityMask),
    );

    const wave = final.mul(20.0);
    const waveX = cos(wave);
    const waveY = cos(wave.add(1.2));
    const microWarp = vec2(waveX, waveY).mul(liquidFlow.mul(0.0015));

    const fluidPlaster = texture(plasterTexture, uvCoord.add(microWarp));
    const plasterDetail = fluidPlaster.rgb.sub(0.5);
    const plasterBase = plaster.rgb.mul(0.92);

    const relief = vec3(final)
      .mul(shading.add(plasterDetail.mul(0.8)))
      .mul(cavityDarkness);

    const merged = plasterBase.mul(relief);

    const highlightOnly = vec3(
      shading.r.sub(1.0).max(0.0).oneMinus(),
      shading.g.sub(1.0).max(0.0),
      shading.g.sub(1.0).max(0.0),
    );

    const outerGlow = vec3(0.0, 10.0, 5.0)
      .mul(highlightOnly)
      .mul(outerFluid)
      .mul(5);

    return vec4(merged.add(outerGlow), 1.0);
  })();

  material.needsUpdate = true;

  return material;
}
