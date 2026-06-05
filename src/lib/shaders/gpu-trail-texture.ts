import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  Vector2,
  WebGLRenderTarget,
  PlaneGeometry,
  Mesh,
  WebGLRenderer,
} from "three";
import {
  float,
  mix,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

type GpuTrailTextureConfig = {
  size?: number;
};

export class GpuTrailTexture {
  camera: OrthographicCamera;
  scene: Scene;

  materialA: MeshBasicNodeMaterial;
  materialB: MeshBasicNodeMaterial;
  quadA: Mesh;
  quadB: Mesh;

  readBuffer: WebGLRenderTarget;
  writeBuffer: WebGLRenderTarget;

  mouse = new Vector2(-10, -10);
  currentMouse = new Vector2(-10, -10);
  lastMouse = new Vector2(-10, -10);
  velocity = new Vector2();
  mouseUniform = uniform(new Vector2());

  velocityUniform = uniform(0);
  currentVelocity = 0;
  targetVelocity = 0;

  currentFade = 0.985;
  targetFade = 0.985;

  fadeUniform = uniform(0.985);

  previousTexture!: WebGLRenderTarget["texture"];

  constructor({ size = 512 }: GpuTrailTextureConfig = {}) {
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.readBuffer = this.createTarget(size);
    this.writeBuffer = this.createTarget(size);

    const createMaterial = (buffer: WebGLRenderTarget) => {
      const material = new MeshBasicNodeMaterial();
      const previous = texture(buffer.texture, uv());
      const mouse = vec2(this.mouseUniform);
      const velocity = float(this.velocityUniform);
      const fade = float(this.fadeUniform);
      const localDist = uv().distance(mouse);

      const warpedDist = localDist.add(
        smoothstep(0.0, 1.0, localDist).mul(0.018),
      );

      const dist = warpedDist;

      const innerRadius = 0.18;
      const innerSoftness = 0.08;

      const outerRadius = 0.46;
      const outerSoftness = 0.34;

      const minOpacity = 0.5;
      const maxOpacity = 1.0;

      const velocityStrength = velocity.mul(14.0).min(1.0);
      const speedStrength = mix(minOpacity, maxOpacity, velocityStrength);

      const coreBrush = smoothstep(0.035, 0.0, dist).mul(
        speedStrength.mul(1.45),
      );

      const innerBrush = smoothstep(
        innerRadius,
        innerRadius - innerSoftness,
        dist,
      ).mul(speedStrength.mul(0.7));

      const softBrushA = smoothstep(0.18, 0.01, dist).mul(
        speedStrength.mul(0.12),
      );

      const softBrushB = smoothstep(0.28, 0.06, dist).mul(
        speedStrength.mul(0.08),
      );

      const softBrushC = smoothstep(0.42, 0.16, dist).mul(
        speedStrength.mul(0.045),
      );

      const softBrush = softBrushA.add(softBrushB).add(softBrushC);

      const outerBrush = smoothstep(
        outerRadius,
        outerRadius - outerSoftness,
        dist,
      ).mul(speedStrength.mul(0.12));

      const color = previous.rgb.mul(fade);

      const finalColor = vec3(
        color.r.add(coreBrush).add(innerBrush).add(softBrush),
        color.g.add(softBrush.mul(0.08)),
        color.b.add(outerBrush),
      );

      material.colorNode = finalColor;
      return material;
    };

    this.materialA = createMaterial(this.readBuffer);
    this.materialB = createMaterial(this.writeBuffer);
    this.quadA = new Mesh(new PlaneGeometry(2, 2), this.materialA);
    this.quadB = new Mesh(new PlaneGeometry(2, 2), this.materialB);
    this.scene.add(this.quadA);
  }

  createTarget(size: number) {
    return new WebGLRenderTarget(size, size, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  get texture() {
    return this.readBuffer.texture;
  }
  setMouse(x: number, y: number) {
    this.mouse.set(x, y);
  }

  setUniforms(x: number, y: number, speed: number, delta: number) {
    const mouseLerp = 1.0 - Math.exp(-delta * 4.0);
    this.currentMouse.lerp(new Vector2(x, y), mouseLerp);
    this.mouseUniform.value.copy(this.currentMouse);

    this.targetVelocity = speed;

    const velocityLerp = 1.0 - Math.exp(-delta * 6.0);
    this.currentVelocity +=
      (this.targetVelocity - this.currentVelocity) * velocityLerp;
    this.velocityUniform.value = this.currentVelocity;

    const clampedSpeed = Math.min(speed * 12.0, 1.0);
    this.targetFade = 0.92 + (0.985 - 0.92) * clampedSpeed;

    const fadeLerp = 1.0 - Math.exp(-delta * 8.0);
    this.currentFade += (this.targetFade - this.currentFade) * fadeLerp;
    this.fadeUniform.value = this.currentFade;
  }

  updateVelocity(width: number, height: number) {
    const x = this.mouse.x / width;
    const y = this.mouse.y / height;

    this.velocity.set(x - this.lastMouse.x, y - this.lastMouse.y);
    this.lastMouse.set(x, y);

    return {
      x,
      y,
      speed: this.velocity.length(),
    };
  }

  render(renderer: WebGLRenderer) {
    this.scene.clear();
    const usingA = this.readBuffer === this.writeBuffer;
    const quad = usingA ? this.quadA : this.quadB;
    this.scene.add(quad);
    renderer.setRenderTarget(this.writeBuffer);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
    this.swap();
  }

  swap() {
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }

  dispose() {
    this.readBuffer.dispose();
    this.writeBuffer.dispose();
    this.materialA.dispose();
    this.materialB.dispose();
    this.quadA.geometry.dispose();
    this.quadB.geometry.dispose();
  }
}
