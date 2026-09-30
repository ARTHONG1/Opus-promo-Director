// director-kit: small Remotion building blocks for fast, beat-synced promos.
// Copy this file into a Remotion project's src/ folder and import what you need.
// Needs "remotion", React and "@remotion/layout-utils" (npx remotion add @remotion/layout-utils).
// Values are starting points that held up in real films; tune them per project.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fast in, soft stop. Good default for entrances. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const BACK = Easing.out(Easing.back(1.7));

/** Frames per beat. Pick a BPM where this is a whole number (scripts/beat_grid.py lists them). */
export const framesPerBeat = (bpm: number, fps: number) => (fps * 60) / bpm;

/** 1 on each beat, decaying to 0 before the next one. Multiply glow, scale or shadow by it. */
export const useBeatPulse = (bpm: number, decay = 3.5) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fpb = framesPerBeat(bpm, fps);
  return Math.exp(-(((f % fpb) + fpb) % fpb) / decay);
};

/**
 * Safe text rectangle for 9:16 video on a 1080x1920 canvas. Checked 2026-09-30; preview in the app too.
 * common = Reels + Shorts + TikTok at once. scripts/safe_zone.py uses the same numbers.
 */
export const SAFE_ZONES = {
  common: { x0: 90, y0: 288, x1: 888, y1: 1248 },
  reels: { x0: 65, y0: 269, x1: 1015, y1: 1248 },
  shorts: { x0: 48, y0: 288, x1: 888, y1: 1248 },
  tiktok: { x0: 90, y0: 150, x1: 900, y1: 1420 },
} as const;

/** Largest font size that keeps one line inside maxWidth, capped at maxSize. Call after the font has loaded. */
export const fitSize = (text: string, maxWidth: number, maxSize: number, fontFamily: string, fontWeight: number | string = 900) => {
  const { fontSize } = fitText({ text, withinWidth: maxWidth, fontFamily, fontWeight: String(fontWeight) });
  return Math.min(fontSize, maxSize);
};

/** Wrap a scene. Scale punches in at the start and blurs briefly, like a hard cut on a hit. */
export const PunchIn: React.FC<{ children: React.ReactNode; amount?: number; frames?: number; blur?: number }> = ({
  children, amount = 0.08, frames = 8, blur = 5,
}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, frames], [1 + amount, 1], { ...clamp, easing: EASE_OUT });
  const b = interpolate(f, [0, 3], [blur, 0], clamp);
  return (
    <AbsoluteFill style={{ transform: "scale(" + s + ")", filter: b > 0.2 ? "blur(" + b + "px)" : undefined }}>{children}</AbsoluteFill>
  );
};

/**
 * Flash that hides a seam. Keep it faint: 0.1-0.2 on ordinary cuts. Stacked with blur on every cut, 0.45 washed
 * whole frames out to grey. Save 0.3+ for one big reveal.
 */
export const Flash: React.FC<{ at?: number; frames?: number; peak?: number; color?: string }> = ({
  at = 0, frames = 3, peak = 0.15, color = "#fff",
}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + frames) return null;
  const o = interpolate(f, [at, at + frames], [peak, 0], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};

/**
 * Headline that lands letter by letter: big and blurry, then sharp. Pass maxWidth and fontFamily to shrink long
 * lines instead of letting them clip at the frame edge.
 */
export const Slam: React.FC<{
  text: string; at?: number; size: number; color?: string; stagger?: number; weight?: number;
  fontFamily?: string; shadow?: string; maxWidth?: number;
}> = ({ text, at = 0, size, color = "#fff", stagger = 1, weight = 900, fontFamily, shadow, maxWidth }) => {
  const f = useCurrentFrame();
  const fontSize = maxWidth && fontFamily ? fitSize(text, maxWidth, size, fontFamily, weight) : size;
  return (
    <span style={{ whiteSpace: "nowrap", fontFamily, fontWeight: weight, fontSize, color, textShadow: shadow, display: "inline-block" }}>
      {Array.from(text).map((ch, i) => {
        const t0 = at + i * stagger;
        const p = interpolate(f, [t0, t0 + 6], [0, 1], { ...clamp, easing: EASE_OUT });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(f, [t0, t0 + 2], [0, 1], clamp),
              transform: "translateY(" + (1 - p) * 0.35 * fontSize + "px) scale(" + (1 + (1 - p) * 0.6) + ")",
              filter: p < 0.98 ? "blur(" + (1 - p) * 10 + "px)" : undefined,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </span>
  );
};

/**
 * A glossy object image (transparent PNG) that slams in from the camera and floats: the hero of the
 * "glossy object on a dark stage" look. It is opaque from its first frame on purpose. Fading it in left 1-2
 * empty frames after every cut. To replace one object with the next, swap on the beat instead of cross-fading.
 */
export const HeroObject: React.FC<{
  src: string; x: number; y: number; size: number; at?: number; glow?: string; tilt?: number; float?: number;
}> = ({ src, x, y, size, at = 0, glow = "#ffffff", tilt = -14, float = 0.018 }) => {
  const f = useCurrentFrame() - at;
  if (f < 0) return null;
  const s = interpolate(f, [0, 10], [1.45, 1], { ...clamp, easing: BACK });
  const b = interpolate(f, [0, 3], [6, 0], clamp);
  const r = interpolate(f, [0, 14], [tilt, 0], { ...clamp, easing: EASE_OUT }) + Math.sin(f / 22) * 2.5;
  const fy = Math.sin(f / 17) * size * float;
  return (
    <Img
      src={src.startsWith("http") ? src : staticFile(src)}
      style={{
        position: "absolute", left: x - size / 2, top: y - size / 2 + fy, width: size, height: size, objectFit: "contain",
        transform: "scale(" + s + ") rotate(" + r + "deg)",
        filter: (b > 0.3 ? "blur(" + b + "px) " : "") + "drop-shadow(0 0 " + size * 0.05 + "px " + glow + ") drop-shadow(0 " + size * 0.05 + "px " + size * 0.05 + "px rgba(0,0,0,0.55))",
      }}
    />
  );
};

/** Dark stage behind a hero object: gradient, a colored glow at the object, slow rays and a vignette. */
export const Stage: React.FC<{ color: string; bg1?: string; bg2?: string; cx?: number; cy?: number; rays?: boolean }> = ({
  color, bg1 = "#1A1240", bg2 = "#04030C", cx = 50, cy = 40, rays = true,
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const r = Math.max(width, height) * 0.45;
  const mask = "radial-gradient(circle, #000 0%, rgba(0,0,0,0.5) 35%, transparent 70%)";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 95% 75% at " + cx + "% " + cy + "%, " + bg1 + " 0%, " + bg2 + " 78%)", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at " + cx + "% " + cy + "%, " + color + "55 0%, transparent 36%)" }} />
      {rays ? (
        <div style={{ position: "absolute", left: (cx / 100) * width - r, top: (cy / 100) * height - r, width: 2 * r, height: 2 * r, borderRadius: "50%",
          background: "repeating-conic-gradient(from " + f * 0.7 + "deg, " + color + "55 0deg 7deg, transparent 7deg 20deg)", WebkitMaskImage: mask, maskImage: mask }} />
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Number that counts up with a soft stop. */
export const CountUp: React.FC<{ to: number; from?: number; at?: number; frames?: number; format?: (n: number) => string; style?: React.CSSProperties }> = ({
  to, from = 0, at = 0, frames = 24, format = (n) => Math.round(n).toLocaleString(), style,
}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + frames], [from, to], { ...clamp, easing: EASE_OUT });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(v)}</span>;
};

/** Light streak that crosses the frame once. */
export const LightSweep: React.FC<{ frames?: number; angle?: number; strength?: number }> = ({ frames = 90, angle = 105, strength = 0.22 }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, frames], [-60, 160], clamp);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: "linear-gradient(" + angle + "deg, rgba(255,255,255,0) " + (x - 12) + "%, rgba(255,255,255," + strength + ") " + x + "%, rgba(255,255,255,0) " + (x + 12) + "%)",
      }}
    />
  );
};

type Item = { x: number; y: number; z: number; rot: number; spin: number; size: number; color: string; shape: "block" | "ring" | "dot" };

const makeItems = (seed: string, count: number, palette: string[], clear: { rx: number; ry: number }): Item[] =>
  Array.from({ length: count }, (_, i) => {
    const r = (k: string) => random(seed + "-" + i + "-" + k);
    // keep an elliptical center zone clear for the headline: place items outside it
    const a = r("a") * Math.PI * 2;
    const k = 1 + r("k") * 0.9;
    const shapes: Item["shape"][] = ["block", "ring", "dot"];
    return {
      x: Math.cos(a) * clear.rx * k, y: Math.sin(a) * clear.ry * k, z: r("z"), rot: r("rot") * 360, spin: (r("spin") - 0.5) * 3,
      size: 40 + r("size") * 90, color: palette[Math.floor(r("c") * palette.length)], shape: shapes[Math.floor(r("s") * shapes.length)],
    };
  });

/**
 * Depth backdrop without WebGL: gradient, a blurred far layer and a sharp near layer drifting toward the camera,
 * plus a light sweep and vignette. Pass renderItem to draw product-related objects instead of plain shapes.
 */
export const DepthBackdrop: React.FC<{
  background: string; palette: string[]; seed?: string; far?: number; near?: number; speed?: number;
  clear?: { rx: number; ry: number };
  renderItem?: (item: Item, index: number) => React.ReactNode;
}> = ({ background, palette, seed = "bg", far = 22, near = 10, speed = 1, clear = { rx: 0.46, ry: 0.2 }, renderItem }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const farItems = React.useMemo(() => makeItems(seed + "-far", far, palette, clear), [seed, far, palette, clear.rx, clear.ry]);
  const nearItems = React.useMemo(() => makeItems(seed + "-near", near, palette, clear), [seed, near, palette, clear.rx, clear.ry]);
  const layer = (items: Item[], depth: number) =>
    items.map((it, i) => {
      const t = (it.z + (f * 0.004 * speed) / depth) % 1;
      const scale = 0.4 + t * 1.6 * depth;
      const spread = 1 + t * 0.6;
      const opacity = interpolate(t, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
      const body = renderItem ? renderItem(it, i) : (
        <div style={{
          width: it.size, height: it.size,
          borderRadius: it.shape === "block" ? it.size * 0.22 : "50%",
          background: it.shape === "ring" ? "transparent" : "linear-gradient(145deg, " + it.color + ", rgba(0,0,0,0.25))",
          border: it.shape === "ring" ? it.size * 0.16 + "px solid " + it.color : undefined,
          boxShadow: "0 18px 40px rgba(0,0,0,0.25), inset 0 2px 6px rgba(255,255,255,0.45)",
        }} />
      );
      return (
        <div key={i} style={{ position: "absolute", left: width / 2 + it.x * width * spread, top: height / 2 + it.y * height * spread, opacity,
          transform: "translate(-50%,-50%) scale(" + scale + ") rotate(" + (it.rot + f * it.spin) + "deg)" }}>
          {body}
        </div>
      );
    });
  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(5px)", opacity: 0.85 }}>{layer(farItems, 0.6)}</AbsoluteFill>
      <AbsoluteFill>{layer(nearItems, 1)}</AbsoluteFill>
      <LightSweep />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 100%)" }} />
    </AbsoluteFill>
  );
};

/**
 * Keeps children inside the vertical safe text area (SAFE_ZONES). In horizontal video it only pads a little.
 * Content is centered inside the zone; put large hero objects above it, not behind the text.
 */
export const SafeArea: React.FC<{ children: React.ReactNode; vertical: boolean; zone?: keyof typeof SAFE_ZONES }> = ({ children, vertical, zone = "common" }) => {
  const { width, height } = useVideoConfig();
  const z = SAFE_ZONES[zone];
  const sx = width / 1080, sy = height / 1920;
  return (
    <AbsoluteFill
      style={vertical ? {
        left: z.x0 * sx, top: z.y0 * sy, width: (z.x1 - z.x0) * sx, height: (z.y1 - z.y0) * sy,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      } : {
        padding: "6% 7% 8%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

