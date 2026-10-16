// Vector glyphs for every board element. Each hazard has a distinct silhouette so that
// colour is never the only cue (spikes = triangles, lasers = lens + beam, drones = diamond eye).
import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { colors } from '../../theme/theme';
import type { Dir, KeyColor } from '../../game/types';

export const CHANNEL_COLORS = [colors.cyan, colors.violet, colors.success, colors.gold];
export const channelColor = (ch: number) => CHANNEL_COLORS[ch % CHANNEL_COLORS.length];
export const keyColor = (c: KeyColor) => (c === 'gold' ? colors.gold : colors.blue);
export const TELE_COLORS = ['#C77DFF', '#38F2C8', '#FF8FD1', '#F2E85C'];

type P = { s: number };

/** Small pips that encode a channel / pair number without relying on colour. */
export function Pips({ s, n, color }: P & { n: number; color: string }) {
  const r = s * 0.045;
  return (
    <G>
      {Array.from({ length: n + 1 }).map((_, i) => (
        <Circle key={i} cx={s * 0.18 + i * r * 3} cy={s * 0.18} r={r} fill={color} />
      ))}
    </G>
  );
}

/**
 * A floor trap in three-quarter view: a recessed steel plate with two rows of holes and a
 * pyramid blade in each. Every blade has a lit face and a shaded face (light from the upper
 * left), so it reads as solid. Raised blades stand tall and cast shadows; lowered ones barely
 * peek out; a warning plate glows amber with blades half-way up.
 */
export function SpikesGlyph({ s, raised, warning }: P & { raised: boolean; warning?: boolean }) {
  const rise = raised ? 1 : warning ? 0.38 : 0.16;
  const [lit, shade, tip] = raised ? ['#FF7A86', '#A3202C', '#FFE2E5'] : warning ? ['#FFC970', '#A8701A', '#FFF1D2'] : ['#7A4A52', '#3E2028', '#9A6A72'];
  const rows = [
    { y: 0.52, h: 0.3, bw: 0.075 },
    { y: 0.72, h: 0.36, bw: 0.088 },
  ];
  const xs = [0.27, 0.5, 0.73];
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.1} y={s * 0.4} width={s * 0.8} height={s * 0.46} rx={s * 0.07} fill="#191317" />
      <Rect x={s * 0.1} y={s * 0.38} width={s * 0.8} height={s * 0.42} rx={s * 0.07} fill={warning ? '#3A2A1A' : '#2B2228'} stroke={warning ? colors.amber : '#4A3A42'} strokeWidth={warning ? 1.5 : 1} />
      <Line x1={s * 0.16} y1={s * 0.4} x2={s * 0.84} y2={s * 0.4} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1} />
      {rows.map((r, ri) =>
        xs.map((x) => {
          const cx = x * s;
          const cy = r.y * s;
          const bw = r.bw * s;
          const h = r.h * s * rise;
          return (
            <G key={`${ri}-${x}`}>
              <Ellipse cx={cx} cy={cy} rx={bw * 1.05} ry={bw * 0.42} fill="#0B0709" />
              {raised && <Ellipse cx={cx + bw * 0.9} cy={cy + bw * 0.1} rx={bw * 1.1} ry={bw * 0.35} fill="#000000" opacity={0.35} />}
              <Polygon points={`${cx - bw},${cy} ${cx},${cy - h} ${cx},${cy + bw * 0.3}`} fill={lit} />
              <Polygon points={`${cx},${cy + bw * 0.3} ${cx},${cy - h} ${cx + bw},${cy}`} fill={shade} />
              <Line x1={cx} y1={cy - h} x2={cx - bw * 0.25} y2={cy - h * 0.55} stroke={tip} strokeWidth={1} strokeLinecap="round" />
            </G>
          );
        }),
      )}
      {warning && (
        <G>
          <Rect x={s / 2 - 1.5} y={s * 0.1} width={3} height={s * 0.16} rx={1} fill={colors.amber} />
          <Circle cx={s / 2} cy={s * 0.31} r={1.8} fill={colors.amber} />
        </G>
      )}
    </Svg>
  );
}

const ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

export function EmitterGlyph({ s, dir, active, warning, ch }: P & { dir: Dir; active: boolean; warning?: boolean; ch?: number }) {
  const lens = active ? colors.danger : warning ? colors.amber : '#4A2A30';
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.1} y={s * 0.1} width={s * 0.8} height={s * 0.8} rx={s * 0.12} fill="#2A1E26" stroke="#5A3A44" strokeWidth={1.5} />
      <G transform={`rotate(${ROT[dir]} ${s / 2} ${s / 2})`}>
        <Rect x={s * 0.5} y={s * 0.38} width={s * 0.42} height={s * 0.24} rx={2} fill="#3A2830" />
        <Circle cx={s * 0.8} cy={s / 2} r={s * 0.11} fill={lens} />
      </G>
      {ch !== undefined && <Pips s={s} n={ch} color={channelColor(ch)} />}
    </Svg>
  );
}

export function DoorGlyph({ s, closed, invert, ch }: P & { closed: boolean; invert?: boolean; ch: number }) {
  const c = channelColor(ch);
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.08} y={s * 0.08} width={s * 0.84} height={s * 0.84} rx={4} fill={closed ? '#141C2E' : 'none'} stroke={c} strokeOpacity={closed ? 1 : 0.35} strokeWidth={2} />
      {closed &&
        (invert
          ? [0, 1, 2, 3].map((i) => (
              <Line key={i} x1={s * (0.1 + i * 0.22)} y1={s * 0.9} x2={s * (0.3 + i * 0.22)} y2={s * 0.1} stroke={c} strokeWidth={3} strokeLinecap="round" />
            ))
          : [0, 1, 2].map((i) => (
              <Line key={i} x1={s * (0.3 + i * 0.2)} y1={s * 0.15} x2={s * (0.3 + i * 0.2)} y2={s * 0.85} stroke={c} strokeWidth={3} strokeLinecap="round" />
            )))}
      {!closed && invert && <Line x1={s * 0.15} y1={s * 0.85} x2={s * 0.3} y2={s * 0.7} stroke={c} strokeOpacity={0.5} strokeWidth={2} />}
      <Pips s={s} n={ch} color={c} />
    </Svg>
  );
}

export function SwitchGlyph({ s, on, ch }: P & { on: boolean; ch: number }) {
  const c = channelColor(ch);
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.22} y={s * 0.62} width={s * 0.56} height={s * 0.18} rx={3} fill="#2A3346" stroke={c} strokeWidth={1.5} />
      <Line x1={s / 2} y1={s * 0.66} x2={on ? s * 0.72 : s * 0.28} y2={s * 0.24} stroke={on ? c : colors.amber} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={on ? s * 0.72 : s * 0.28} cy={s * 0.24} r={s * 0.09} fill={on ? c : colors.amber} />
      <Pips s={s} n={ch} color={c} />
    </Svg>
  );
}

export function PlateGlyph({ s, pressed, ch }: P & { pressed: boolean; ch: number }) {
  const c = channelColor(ch);
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} rx={5} fill={pressed ? c : 'none'} fillOpacity={0.35} stroke={colors.amber} strokeWidth={2} />
      <Rect x={s * 0.3} y={s * 0.3} width={s * 0.4} height={s * 0.4} rx={3} fill="none" stroke={c} strokeWidth={1.5} strokeOpacity={0.8} />
      <Pips s={s} n={ch} color={c} />
    </Svg>
  );
}

export function KeyGlyph({ s, color }: P & { color: KeyColor }) {
  const c = keyColor(color);
  return (
    <Svg width={s} height={s}>
      {color === 'gold' ? (
        <Circle cx={s * 0.34} cy={s * 0.42} r={s * 0.14} stroke={c} strokeWidth={3} fill="none" />
      ) : (
        <Rect x={s * 0.2} y={s * 0.28} width={s * 0.28} height={s * 0.28} stroke={c} strokeWidth={3} fill="none" />
      )}
      <Line x1={s * 0.46} y1={s * 0.5} x2={s * 0.8} y2={s * 0.72} stroke={c} strokeWidth={3} strokeLinecap="round" />
      <Line x1={s * 0.66} y1={s * 0.63} x2={s * 0.6} y2={s * 0.74} stroke={c} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function LockGlyph({ s, color }: P & { color: KeyColor }) {
  const c = keyColor(color);
  return (
    <Svg width={s} height={s}>
      <Rect x={s * 0.06} y={s * 0.06} width={s * 0.88} height={s * 0.88} rx={5} fill="#1B1A14" stroke={c} strokeWidth={2} strokeOpacity={0.6} />
      <Path d={`M ${s * 0.36} ${s * 0.46} V ${s * 0.34} A ${s * 0.14} ${s * 0.14} 0 0 1 ${s * 0.64} ${s * 0.34} V ${s * 0.46}`} stroke={c} strokeWidth={3} fill="none" />
      <Rect x={s * 0.28} y={s * 0.44} width={s * 0.44} height={s * 0.34} rx={3} fill={c} />
      {color === 'gold' ? <Circle cx={s / 2} cy={s * 0.6} r={s * 0.05} fill="#1B1A14" /> : <Rect x={s * 0.46} y={s * 0.55} width={s * 0.08} height={s * 0.1} fill="#1B1A14" />}
    </Svg>
  );
}

export function CoreGlyph({ s }: P) {
  const r = s * 0.26;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${s / 2 + r * Math.cos(a)},${s / 2 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.36} fill={colors.cyan} fillOpacity={0.15} />
      <Polygon points={pts} fill={colors.cyan} fillOpacity={0.85} stroke="#C9FAFF" strokeWidth={1.5} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.08} fill="#E9FDFF" />
    </Svg>
  );
}

export function CoinGlyph({ s }: P) {
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.22} fill={colors.amber} stroke="#FFE2A8" strokeWidth={1.5} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.12} fill="none" stroke="#9A6412" strokeWidth={1.5} />
    </Svg>
  );
}

export function TeleGlyph({ s, pair }: P & { pair: number }) {
  const c = TELE_COLORS[pair % TELE_COLORS.length];
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.38} stroke={c} strokeWidth={2} fill={c} fillOpacity={0.1} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.24} stroke={c} strokeWidth={2} fill="none" strokeDasharray="3 3" />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.08} fill={c} />
      <Pips s={s} n={pair} color={c} />
    </Svg>
  );
}

export function CheckpointGlyph({ s, reached }: P & { reached?: boolean }) {
  const c = colors.success;
  return (
    <Svg width={s} height={s}>
      <Polygon points={`${s / 2},${s * 0.18} ${s * 0.82},${s / 2} ${s / 2},${s * 0.82} ${s * 0.18},${s / 2}`} fill={reached ? c : 'none'} fillOpacity={0.3} stroke={c} strokeWidth={2} />
      <Line x1={s * 0.42} y1={s * 0.36} x2={s * 0.42} y2={s * 0.66} stroke={c} strokeWidth={2} />
      <Polygon points={`${s * 0.42},${s * 0.36} ${s * 0.62},${s * 0.43} ${s * 0.42},${s * 0.5}`} fill={c} />
    </Svg>
  );
}

export function ExitGlyph({ s, open, style, coresLeft }: P & { open: boolean; style: string; coresLeft: number }) {
  const c = open ? colors.cyan : '#3C5466';
  return (
    <Svg width={s} height={s}>
      {open && <Circle cx={s / 2} cy={s / 2} r={s * 0.46} fill={colors.cyan} fillOpacity={0.12} />}
      {style === 'hatch' ? (
        <G>
          <Circle cx={s / 2} cy={s / 2} r={s * 0.34} fill="#0B1620" stroke={c} strokeWidth={3} />
          <Line x1={s * 0.26} y1={s / 2} x2={s * 0.74} y2={s / 2} stroke={c} strokeWidth={2} />
          <Line x1={s / 2} y1={s * 0.26} x2={s / 2} y2={s * 0.74} stroke={c} strokeWidth={2} />
        </G>
      ) : style === 'rift' ? (
        <Path d={`M ${s * 0.5} ${s * 0.1} L ${s * 0.62} ${s * 0.4} L ${s * 0.54} ${s * 0.55} L ${s * 0.66} ${s * 0.9} L ${s * 0.38} ${s * 0.6} L ${s * 0.46} ${s * 0.45} Z`} fill={c} fillOpacity={0.7} stroke={c} strokeWidth={1.5} />
      ) : (
        <Path
          d={`M ${s * 0.22} ${s * 0.88} V ${s * 0.4} A ${s * 0.28} ${s * 0.28} 0 0 1 ${s * 0.78} ${s * 0.4} V ${s * 0.88} Z`}
          fill={open ? colors.cyan : '#0E1824'}
          fillOpacity={open ? 0.35 : 1}
          stroke={c}
          strokeWidth={3}
        />
      )}
      {!open && (
        <G>
          <Rect x={s * 0.36} y={s * 0.48} width={s * 0.28} height={s * 0.22} rx={2} fill="#3C5466" />
          {Array.from({ length: Math.min(coresLeft, 4) }).map((_, i) => (
            <Circle key={i} cx={s * (0.38 + i * 0.08)} cy={s * 0.8} r={s * 0.03} fill={colors.cyan} />
          ))}
        </G>
      )}
    </Svg>
  );
}

export function DroneGlyph({ s }: P) {
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.42} fill={colors.danger} fillOpacity={0.12} />
      <Polygon points={`${s / 2},${s * 0.14} ${s * 0.86},${s / 2} ${s / 2},${s * 0.86} ${s * 0.14},${s / 2}`} fill="#3A1218" stroke={colors.danger} strokeWidth={2.5} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.12} fill={colors.danger} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.05} fill="#FFE1E4" />
    </Svg>
  );
}

export function DroneNextGlyph({ s }: P) {
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.2} fill="none" stroke={colors.danger} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 3" />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.05} fill={colors.danger} fillOpacity={0.7} />
    </Svg>
  );
}

export function BlockGlyph({ s }: P) {
  const p = s * 0.1;
  return (
    <Svg width={s} height={s}>
      <Rect x={p} y={p} width={s - 2 * p} height={s - 2 * p} rx={4} fill="#5A4430" stroke={colors.amber} strokeWidth={2} />
      <Line x1={p + 3} y1={p + 3} x2={s - p - 3} y2={s - p - 3} stroke="#8A6A44" strokeWidth={2} />
      <Line x1={s - p - 3} y1={p + 3} x2={p + 3} y2={s - p - 3} stroke="#8A6A44" strokeWidth={2} />
      <Rect x={p + 4} y={p + 4} width={s - 2 * p - 8} height={s - 2 * p - 8} rx={2} fill="none" stroke="#3E2E20" strokeWidth={1} />
    </Svg>
  );
}

/** Pip, the maintenance robot. `shape` (from the character cosmetic) changes the head. */
/** Pip's face: how it feels right now (see Board's Pip). */
export type PipMood = 'idle' | 'blink' | 'happy' | 'alert' | 'hurt';

export function PlayerGlyph({ s, color, shape, mood = 'idle', lookX = 0, lookY = 0 }: P & { color: string; shape: string; mood?: PipMood; lookX?: number; lookY?: number }) {
  const cx = s / 2;
  const headW = s * 0.56;
  const headH = s * 0.4;
  const headY = s * 0.2;
  const bodyY = headY + headH - s * 0.02;
  // Eyes glance the way Pip last moved; alarm turns them amber and wide.
  const eyeColor = mood === 'alert' ? '#FFC24D' : mood === 'hurt' ? '#FF6B7A' : '#9CF5FF';
  const ex = lookX * s * 0.035;
  const ey = headY + headH * 0.49 + lookY * s * 0.02;
  const r = s * (mood === 'alert' ? 0.055 : 0.045);
  const sw = Math.max(1.5, s * 0.03);
  const eye = (x: number) => {
    switch (mood) {
      case 'blink':
        return <Line key={x} x1={x - r} y1={ey} x2={x + r} y2={ey} stroke={eyeColor} strokeWidth={sw} strokeLinecap="round" />;
      case 'happy':
        return <Path key={x} d={`M ${x - r * 1.1} ${ey + r * 0.4} Q ${x} ${ey - r * 1.2} ${x + r * 1.1} ${ey + r * 0.4}`} stroke={eyeColor} strokeWidth={sw} strokeLinecap="round" fill="none" />;
      case 'hurt':
        return (
          <G key={x}>
            <Line x1={x - r} y1={ey - r} x2={x + r} y2={ey + r} stroke={eyeColor} strokeWidth={sw} strokeLinecap="round" />
            <Line x1={x - r} y1={ey + r} x2={x + r} y2={ey - r} stroke={eyeColor} strokeWidth={sw} strokeLinecap="round" />
          </G>
        );
      default:
        return (
          <G key={x}>
            <Circle cx={x} cy={ey} r={r} fill={eyeColor} />
            <Circle cx={x - r * 0.35} cy={ey - r * 0.35} r={r * 0.3} fill="#FFFFFF" opacity={0.8} />
          </G>
        );
    }
  };
  const tip = mood === 'alert' || mood === 'hurt' ? '#FFC24D' : mood === 'happy' ? '#FFFFFF' : color;
  return (
    <Svg width={s} height={s}>
      <Circle cx={cx} cy={s * 0.5} r={s * 0.46} fill={color} fillOpacity={0.12} />
      {/* antenna: its light shows Pip's mood */}
      <Line x1={cx} y1={headY} x2={cx} y2={s * 0.08} stroke={color} strokeWidth={Math.max(1.5, s * 0.035)} strokeLinecap="round" />
      <Circle cx={cx} cy={s * 0.07} r={s * 0.08} fill={tip} opacity={0.25} />
      <Circle cx={cx} cy={s * 0.07} r={s * 0.045} fill={mood === 'idle' || mood === 'blink' ? '#FFFFFF' : tip} />
      {/* body, with a lit panel and treads */}
      <Rect x={cx - s * 0.2} y={bodyY} width={s * 0.4} height={s * 0.26} rx={s * 0.08} fill={color} opacity={0.85} />
      <Rect x={cx - s * 0.08} y={bodyY + s * 0.07} width={s * 0.16} height={s * 0.05} rx={s * 0.02} fill="#07090F" opacity={0.6} />
      <Rect x={cx - s * 0.22} y={bodyY + s * 0.21} width={s * 0.44} height={s * 0.06} rx={s * 0.03} fill="#07090F" opacity={0.55} />
      {/* head */}
      {shape === 'diamond' ? (
        <Polygon points={`${cx},${headY - s * 0.04} ${cx + headW / 2},${headY + headH / 2} ${cx},${headY + headH + s * 0.04} ${cx - headW / 2},${headY + headH / 2}`} fill={color} />
      ) : (
        <Rect x={cx - headW / 2} y={headY} width={headW} height={headH} rx={shape === 'square' ? s * 0.05 : headH / 2} fill={color} />
      )}
      {/* a soft highlight on top of the head, so Pip reads as a solid little object */}
      <Rect x={cx - headW * 0.3} y={headY + headH * 0.06} width={headW * 0.6} height={headH * 0.12} rx={headH * 0.06} fill="#FFFFFF" opacity={0.28} />
      {/* visor */}
      <Rect x={cx - headW * 0.36} y={headY + headH * 0.26} width={headW * 0.72} height={headH * 0.46} rx={headH * 0.23} fill="#07131A" />
      {eye(cx - headW * 0.15 + ex)}
      {eye(cx + headW * 0.15 + ex)}
    </Svg>
  );
}

export function CrackGlyph({ s }: P) {
  return (
    <Svg width={s} height={s}>
      <Path d={`M ${s * 0.2} ${s * 0.3} L ${s * 0.42} ${s * 0.48} L ${s * 0.36} ${s * 0.7} M ${s * 0.42} ${s * 0.48} L ${s * 0.7} ${s * 0.42} L ${s * 0.82} ${s * 0.6}`} stroke="#3A4258" strokeWidth={2} fill="none" />
      <Rect x={2} y={2} width={s - 4} height={s - 4} rx={3} fill="none" stroke="#C9973F" strokeOpacity={0.35} strokeDasharray="3 4" strokeWidth={1.5} />
    </Svg>
  );
}

// ---- WITNESS layer: clues and marks ----------------------------------------------------------

/** WITNESS's mark: an eye. Found marks are drawn faintly. */
export function EyeGlyph({ s, color = colors.witness, found }: P & { color?: string; found?: boolean }) {
  const o = found ? 0.35 : 1;
  return (
    <Svg width={s} height={s} opacity={o}>
      <Path d={`M ${s * 0.18} ${s * 0.5} Q ${s * 0.5} ${s * 0.2} ${s * 0.82} ${s * 0.5} Q ${s * 0.5} ${s * 0.8} ${s * 0.18} ${s * 0.5} Z`} fill="none" stroke={color} strokeWidth={Math.max(1.5, s * 0.05)} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.11} fill={color} />
      <Circle cx={s / 2} cy={s / 2} r={s * 0.04} fill={colors.rec} />
    </Svg>
  );
}

/** A recording: a small data disc with a red light. */
export function RecordingGlyph({ s, found }: P & { found?: boolean }) {
  return (
    <Svg width={s} height={s} opacity={found ? 0.35 : 1}>
      <Rect x={s * 0.26} y={s * 0.32} width={s * 0.48} height={s * 0.36} rx={s * 0.06} fill="#1C2130" stroke={colors.witness} strokeWidth={1.5} />
      <Circle cx={s * 0.4} cy={s * 0.5} r={s * 0.07} fill="none" stroke={colors.witness} strokeWidth={1.2} />
      <Circle cx={s * 0.6} cy={s * 0.5} r={s * 0.07} fill="none" stroke={colors.witness} strokeWidth={1.2} />
      {!found && <Circle cx={s * 0.68} cy={s * 0.37} r={s * 0.035} fill={colors.rec} />}
    </Svg>
  );
}

/** Writing on a wall face. UV writing (revealed in the dark) glows violet. */
export function WallWritingGlyph({ s, uv, found }: P & { uv?: boolean; found?: boolean }) {
  const c = uv ? '#C9A6FF' : '#D9D2C2';
  return (
    <Svg width={s} height={s} opacity={found ? 0.45 : 0.95}>
      <Path d={`M ${s * 0.2} ${s * 0.28} l ${s * 0.18} ${s * 0.04} l ${s * 0.12} -${s * 0.05} l ${s * 0.3} ${s * 0.03}`} stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d={`M ${s * 0.18} ${s * 0.42} l ${s * 0.26} -${s * 0.02} l ${s * 0.1} ${s * 0.04} l ${s * 0.26} -${s * 0.03}`} stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d={`M ${s * 0.22} ${s * 0.56} l ${s * 0.32} ${s * 0.02}`} stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
