// Vector glyphs for every board element. Each hazard has a distinct silhouette so that
// colour is never the only cue (spikes = triangles, lasers = lens + beam, drones = diamond eye).
import React from 'react';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
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

export function SpikesGlyph({ s, raised, warning }: P & { raised: boolean; warning?: boolean }) {
  const pad = s * 0.18;
  const w = (s - pad * 2) / 3;
  const base = s - pad;
  const h = raised ? s * 0.5 : s * 0.12;
  const fill = raised ? colors.danger : warning ? colors.amber : '#5B2630';
  return (
    <Svg width={s} height={s}>
      {warning && <Rect x={2} y={2} width={s - 4} height={s - 4} rx={s * 0.12} stroke={colors.amber} strokeWidth={2} strokeDasharray="4 3" fill="none" />}
      {[0, 1, 2].map((i) => (
        <Polygon
          key={i}
          points={`${pad + i * w},${base} ${pad + i * w + w / 2},${base - h} ${pad + (i + 1) * w},${base}`}
          fill={fill}
          stroke={raised ? '#FF9AA4' : 'none'}
          strokeWidth={raised ? 1 : 0}
        />
      ))}
      {warning && (
        <G>
          <Rect x={s / 2 - 1.5} y={s * 0.16} width={3} height={s * 0.2} fill={colors.amber} />
          <Circle cx={s / 2} cy={s * 0.44} r={1.8} fill={colors.amber} />
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
      <G rotation={ROT[dir]} origin={`${s / 2}, ${s / 2}`}>
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

export function PlayerGlyph({ s, color, shape }: P & { color: string; shape: string }) {
  const r = s * 0.3;
  return (
    <Svg width={s} height={s}>
      <Circle cx={s / 2} cy={s / 2} r={s * 0.44} fill={color} fillOpacity={0.16} />
      {shape === 'diamond' ? (
        <Polygon points={`${s / 2},${s / 2 - r * 1.15} ${s / 2 + r * 1.15},${s / 2} ${s / 2},${s / 2 + r * 1.15} ${s / 2 - r * 1.15},${s / 2}`} fill={color} />
      ) : shape === 'square' ? (
        <Rect x={s / 2 - r} y={s / 2 - r} width={r * 2} height={r * 2} rx={r * 0.35} fill={color} />
      ) : (
        <Circle cx={s / 2} cy={s / 2} r={r} fill={color} />
      )}
      <Circle cx={s / 2 - r * 0.32} cy={s / 2 - r * 0.15} r={r * 0.16} fill="#07090F" />
      <Circle cx={s / 2 + r * 0.32} cy={s / 2 - r * 0.15} r={r * 0.16} fill="#07090F" />
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
