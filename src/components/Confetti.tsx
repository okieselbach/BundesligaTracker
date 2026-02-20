"use client";

import { useEffect, useRef } from "react";

const COLORS = [
  "#E30613", // rot
  "#FDE100", // gelb
  "#FFFFFF", // weiß
  "#004B9D", // blau
  "#009639", // grün
  "#FF8C00", // orange
  "#C0A020", // gold
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  shape: "rect" | "circle";
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 130;
    const DURATION = 360; // frames (~6s at 60fps)

    const particles: Particle[] = Array.from({ length: COUNT }, () => {
      const size = 6 + Math.random() * 9;
      return {
        x: Math.random() * canvas.width,
        y: -30 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 1.5 + Math.random() * 3.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: size,
        h: size * (0.3 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        alpha: 1,
        shape: Math.random() > 0.35 ? "rect" : "circle",
      };
    });

    let frame = 0;
    let animId: number;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const fadeStart = DURATION * 0.65;
      const fadeDuration = DURATION - fadeStart;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;                        // gravity
        p.vx += (Math.random() - 0.5) * 0.08; // lateral drift
        p.rotation += p.rotSpeed;

        if (frame > fadeStart) {
          p.alpha = Math.max(0, 1 - (frame - fadeStart) / fadeDuration);
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      }

      if (frame < DURATION) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
