import { useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";

export default function DotGridBackground() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const baseColor = theme === "dark" ? "#53647d" : "#b9c9dd";
  const activeColor = theme === "dark" ? "#b9d1ff" : "#3976e6";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0, inside: false };
    const dots = [];
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frameId = 0;
    let lastFrame = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const spacing = 23;
      const columns = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      const startX = (width - (columns - 1) * spacing) / 2;
      const startY = (height - (rows - 1) * spacing) / 2;
      dots.length = 0;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          dots.push({
            x: startX + column * spacing,
            y: startY + row * spacing,
            offsetX: 0,
            offsetY: 0,
            vx: 0,
            vy: 0
          });
        }
      }
      draw();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const x = dot.x + dot.offsetX;
        const y = dot.y + dot.offsetY;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        const influence = pointer.inside ? Math.max(0, 1 - distance / 140) : 0;
        const radius = 1.35 + influence * 1.2;
        context.globalAlpha = 0.42 + influence * 0.48;
        context.fillStyle = influence > 0.05 ? activeColor : baseColor;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const hasMotion = () => dots.some((dot) => (
      Math.abs(dot.offsetX) > 0.08 ||
      Math.abs(dot.offsetY) > 0.08 ||
      Math.abs(dot.vx) > 0.5 ||
      Math.abs(dot.vy) > 0.5
    ));

    const animate = (now) => {
      frameId = 0;
      const dt = Math.min(0.04, (now - lastFrame) / 1000 || 0);
      lastFrame = now;

      if (!reducedMotion) {
        const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
        for (const dot of dots) {
          const dx = dot.x + dot.offsetX - pointer.x;
          const dy = dot.y + dot.offsetY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (pointer.inside && pointerSpeed > 1 && distance > 0 && distance < 140) {
            const falloff = 1 - distance / 140;
            const drive = 3600 * Math.tanh(pointerSpeed / 650) * falloff;
            dot.vx += (pointer.vx / pointerSpeed * drive + dx / distance * drive * 0.6) * dt;
            dot.vy += (pointer.vy / pointerSpeed * drive + dy / distance * drive * 0.6) * dt;
          }
          dot.vx += -dot.offsetX * 40 * dt;
          dot.vy += -dot.offsetY * 40 * dt;
          dot.vx *= Math.exp(-6 * dt);
          dot.vy *= Math.exp(-6 * dt);
          dot.offsetX += dot.vx * dt;
          dot.offsetY += dot.vy * dt;
        }
        pointer.vx *= Math.exp(-12 * dt);
        pointer.vy *= Math.exp(-12 * dt);
      }

      draw();
      if (hasMotion() || Math.abs(pointer.vx) + Math.abs(pointer.vy) > 8) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const wake = () => {
      if (frameId) return;
      lastFrame = performance.now();
      frameId = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event) => {
      const bounds = canvas.getBoundingClientRect();
      const now = event.timeStamp || performance.now();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const elapsed = pointer.time ? Math.max(4, now - pointer.time) / 1000 : 0;
      if (!reducedMotion && elapsed && pointer.inside) {
        pointer.vx = (x - pointer.x) / elapsed;
        pointer.vy = (y - pointer.y) / elapsed;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.time = now;
      pointer.inside = x >= 0 && y >= 0 && x <= width && y <= height;
      wake();
    };

    const onPointerDown = (event) => {
      if (reducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      for (const dot of dots) {
        const dx = dot.x + dot.offsetX - x;
        const dy = dot.y + dot.offsetY - y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 170) {
          const impulse = (1 - distance / 170) * 115;
          dot.vx += (dx / distance) * impulse;
          dot.vy += (dy / distance) * impulse;
        }
      }
      wake();
    };

    const onPointerOut = (event) => {
      if (!event.relatedTarget) {
        pointer.inside = false;
        pointer.time = 0;
        wake();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("blur", onPointerOut);
    resize();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", onPointerOut);
    };
  }, [activeColor, baseColor]);

  return (
    <div className="dot-grid-background" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
