import { CanvasTexture, ClampToEdgeWrapping, LinearFilter } from "three";
export class TrailTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: CanvasTexture;
  width = 256;
  height = 256;
  mouseX = 0;
  mouseY = 0;
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create canvas");
    }
    this.ctx = ctx;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.texture = new CanvasTexture(this.canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.wrapS = ClampToEdgeWrapping;
    this.texture.wrapT = ClampToEdgeWrapping;
  }
  update() {
    const ctx = this.ctx;
    // fade previous frame
    ctx.fillStyle = "rgba(0,0,0,0.02)";
    ctx.fillRect(0, 0, this.width, this.height);
    const x = this.mouseX * this.width;
    const y = this.mouseY * this.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const radius = 20;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    this.texture.needsUpdate = true;
  }
  setMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }
}
