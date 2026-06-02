import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  Vector2,
} from "three";

type TrailTextureConfig = {
  size?: number;
  radius?: number;
  fade?: number;
};

export class TrailTexture {
  brushCanvas: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fade: number;
  fadeFill: string;
  texture: CanvasTexture;
  radius: number;
  size: number;

  lastMouse = new Vector2(-1, -1);
  mouse = new Vector2();
  velocity = new Vector2();
  screenHeight = window.innerHeight;
  screenWidth = window.innerWidth;

  constructor({
    size = 512,
    radius = 0.4,
    fade = 0.01,
  }: TrailTextureConfig = {}) {
    this.size = size;
    this.radius = this.size * radius;
    this.fade = fade;
    this.fadeFill = `rgba(0,0,0,${this.fade})`;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    const ctx = this.canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create canvas");
    }

    this.ctx = ctx;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.size, this.size);
    ctx.filter = "blur(6px)";
    this.texture = new CanvasTexture(this.canvas);
    Object.assign(this.texture, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    });
    this.brushCanvas = document.createElement("canvas");
    this.brushCanvas.width = this.radius * 2;
    this.brushCanvas.height = this.radius * 2;
    const brushCtx = this.brushCanvas.getContext("2d");

    if (!brushCtx) {
      throw new Error("Could not create brush canvas");
    }

    const gradient = brushCtx.createRadialGradient(
      this.radius,
      this.radius,
      0,
      this.radius,
      this.radius,
      this.radius,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.003, "rgba(255,255,255,1)");
    gradient.addColorStop(0.015, "rgba(255,255,255,0.12)");
    gradient.addColorStop(0.12, "rgba(255,255,255,0.035)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    brushCtx.fillStyle = gradient;
    brushCtx.beginPath();
    brushCtx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    brushCtx.fill();
  }

  update() {
    const ctx = this.ctx;
    ctx.fillStyle = this.fadeFill;
    ctx.fillRect(0, 0, this.size, this.size);
    // const imageData = ctx.getImageData(0, 0, this.size, this.size);
    const speed = this.velocity.length();

    // if (speed < 0.01) {
    //   const imageData = ctx.getImageData(0, 0, this.size, this.size);
    //   const data = imageData.data;

    //   for (let i = 0; i < data.length; i += 4) {
    //     if (data[i] < 0.5) {
    //       data[i] = 0;
    //       data[i + 1] = 0;
    //       data[i + 2] = 0;
    //       data[i + 3] = 255;
    //     }
    //   }

    //   ctx.putImageData(imageData, 0, 0);
    // }

    const x = (this.mouse.x / this.screenWidth) * this.size;
    const y = (this.mouse.y / this.screenHeight) * this.size;

    this.velocity.set(x - this.lastMouse.x, y - this.lastMouse.y);

    this.lastMouse.set(x, y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(this.velocity.y, this.velocity.x));
    ctx.scale(1.0 + speed * 0.08, 1.0);
    ctx.globalAlpha = Math.min(1, 0.25 + speed * 0.05);

    ctx.globalCompositeOperation = "lighter";

    ctx.drawImage(this.brushCanvas, -this.radius, -this.radius);

    ctx.globalCompositeOperation = "source-over";

    ctx.filter = "none";
    ctx.restore();
    if (this.mouse.lengthSq() > 0) {
      this.texture.needsUpdate = true;
    }
  }

  setMouse(x: number, y: number) {
    this.mouse.set(x, y);
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
