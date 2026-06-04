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
  lastMouse = new Vector2(-10, -10);
  velocity = new Vector2();
  mouseUniform = uniform(new Vector2());

  velocityUniform = uniform(0);
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
      const dist = uv().distance(mouse);
      const brush = smoothstep(0.18, 0.0, dist).mul(
        mix(0.5, 1.5, velocity.min(1.0)),
      );
      const color = previous.rgb.mul(fade);
      const finalColor = vec3(
        color.r.add(brush),
        color.g,
        color.b.add(brush.mul(0.2)),
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
  setUniforms(x: number, y: number, speed: number) {
    this.mouseUniform.value.set(x, y);
    this.velocityUniform.value = speed;
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
