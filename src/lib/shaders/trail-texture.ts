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
  currentFade: number;
  targetFade: number;
  fadeFill: string;
  outerBrushCanvas: HTMLCanvasElement;
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
    radius = 0.35,
    fade = 0.01,
  }: TrailTextureConfig = {}) {
    this.size = size;
    this.radius = this.size * radius;
    this.fade = fade;
    this.currentFade = fade;
    this.targetFade = fade;
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

    this.outerBrushCanvas = document.createElement("canvas");

    this.outerBrushCanvas.width = this.radius * 4;
    this.outerBrushCanvas.height = this.radius * 4;

    const outerCtx = this.outerBrushCanvas.getContext("2d");

    if (!outerCtx) {
      throw new Error("Could not create outer brush");
    }

    const outerRadius = this.radius;

    const outerGradient = outerCtx.createRadialGradient(
      outerRadius,
      outerRadius,
      outerRadius * 0.45,
      outerRadius,
      outerRadius,
      outerRadius,
    );

    outerGradient.addColorStop(0, "rgba(0,0,255,0)");
    outerGradient.addColorStop(0.3, "rgba(0,0,255,0)");
    outerGradient.addColorStop(0.58, "rgba(0,0,255,0.05)");
    outerGradient.addColorStop(0.72, "rgba(0,0,255,0.12)");
    outerGradient.addColorStop(0.8, "rgba(0,0,255,0.02)");
    outerGradient.addColorStop(0.9, "rgba(0,0,255,0)");

    outerCtx.fillStyle = outerGradient;
    outerCtx.beginPath();
    outerCtx.arc(outerRadius, outerRadius, outerRadius, 0, Math.PI * 2);
    outerCtx.fill();

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
    gradient.addColorStop(0, "rgba(255,0,0,1)");
    gradient.addColorStop(0.003, "rgba(255,0,0,1)");
    gradient.addColorStop(0.015, "rgba(255,0,0,0.12)");
    gradient.addColorStop(0.12, "rgba(255,0,0,0.035)");
    gradient.addColorStop(1, "rgba(255,0,0,0)");

    brushCtx.fillStyle = gradient;
    brushCtx.beginPath();
    brushCtx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    brushCtx.fill();
  }

  update() {
    const ctx = this.ctx;
    const speed = this.velocity.length();

    this.targetFade = speed < 0.01 ? 0.08 : 0.01;
    this.currentFade += (this.targetFade - this.currentFade) * 0.08;
    ctx.fillStyle = `rgba(0, 0, 0, ${this.currentFade})`;
    ctx.fillRect(0, 0, this.size, this.size);

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
    ctx.drawImage(this.outerBrushCanvas, -this.radius, -this.radius);

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
