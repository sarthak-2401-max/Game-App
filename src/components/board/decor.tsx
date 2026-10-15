// Set dressing: each room's landmark, the props on its walls and the marks on its floor, painted
// in the environment's colours. Drawn once per room (memoised with the terrain) and never over a
// gameplay tile, so it adds a sense of place without hurting readability.
import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { Decal, Environment, Landmark, Prop } from '../../game/environments';
import { colOf, rowOf } from '../../game/grid';
import type { Room } from '../../game/types';
import type { DecorPlan } from './decorPlan';

interface C {
  a: string; // accent
  g: string; // glow
  w: string; // wall
  e: string; // wall edge
  s: string; // wall side
  d: string; // dark
  l: string; // light
}

const colorsOf = (env: Environment): C => ({ a: env.palette.accent, g: env.palette.glow, w: env.palette.wall, e: env.palette.wallEdge, s: env.palette.wallSide, d: '#0A0E18', l: '#EAF2FF' });

// ---- Landmarks: 100 x 110 art standing on the bottom edge --------------------------------------

const LANDMARKS: Record<Landmark, (c: C) => React.ReactNode> = {
  cradle: (c) => (
    <G>
      <Rect x={22} y={14} width={56} height={92} rx={28} fill={c.s} stroke={c.e} strokeWidth={3} />
      <Rect x={32} y={26} width={36} height={66} rx={18} fill={c.g} opacity={0.35} />
      <Rect x={38} y={34} width={24} height={50} rx={12} fill={c.g} opacity={0.5} />
      <Rect x={30} y={98} width={40} height={8} rx={3} fill={c.d} />
      <Circle cx={50} cy={20} r={3} fill={c.a} />
    </G>
  ),
  monitors: (c) => (
    <G>
      {[0, 1].map((r) => [0, 1].map((k) => <Rect key={`${r}${k}`} x={10 + k * 42} y={18 + r * 40} width={38} height={34} rx={3} fill={c.d} stroke={c.e} strokeWidth={2} />))}
      <Rect x={14} y={22} width={30} height={26} fill={c.g} opacity={0.3} />
      <Rect x={56} y={62} width={30} height={26} fill={c.a} opacity={0.3} />
      <Ellipse cx={71} cy={37} rx={11} ry={7} fill="none" stroke={c.g} strokeWidth={2.5} />
      <Circle cx={71} cy={37} r={3.5} fill={c.g} />
      <Rect x={44} y={96} width={12} height={12} fill={c.d} />
    </G>
  ),
  shower: (c) => (
    <G>
      <Path d="M18 108 V40 A32 32 0 0 1 82 40 V108" fill="none" stroke={c.e} strokeWidth={8} />
      <Rect x={36} y={20} width={28} height={6} rx={3} fill={c.a} />
      {[30, 42, 54, 66].map((x, i) => (
        <Line key={x} x1={x} y1={34 + (i % 2) * 6} x2={x - 3} y2={50 + (i % 2) * 6} stroke={c.g} strokeWidth={2} opacity={0.7} />
      ))}
      <Ellipse cx={50} cy={84} rx={26} ry={16} fill="#FFFFFF" opacity={0.18} />
    </G>
  ),
  locker: (c) => (
    <G>
      <Rect x={26} y={8} width={48} height={100} rx={3} fill={c.w} stroke={c.e} strokeWidth={2} />
      <Path d="M50 10 L70 16 L70 104 L50 106 Z" fill={c.s} />
      <Rect x={32} y={18} width={12} height={3} fill={c.d} />
      <Rect x={32} y={24} width={12} height={3} fill={c.d} />
      <Rect x={30} y={44} width={16} height={10} rx={2} fill={c.a} />
      <Circle cx={45} cy={64} r={2.5} fill={c.l} />
    </G>
  ),
  fusebox: (c) => (
    <G>
      <Rect x={16} y={12} width={68} height={86} rx={4} fill={c.w} stroke={c.e} strokeWidth={3} />
      {[0, 1, 2].map((r) => [0, 1, 2].map((k) => <Rect key={`${r}${k}`} x={26 + k * 18} y={24 + r * 18} width={12} height={12} rx={2} fill={(r + k) % 2 ? c.d : c.g} opacity={(r + k) % 2 ? 1 : 0.8} />))}
      <Path d="M52 80 L44 92 L52 92 L46 104 L60 88 L52 88 L58 80 Z" fill={c.a} />
      <Line x1={84} y1={30} x2={98} y2={10} stroke={c.e} strokeWidth={3} />
    </G>
  ),
  bed: (c) => (
    <G>
      <Rect x={60} y={12} width={30} height={22} rx={2} fill={c.d} stroke={c.e} strokeWidth={2} />
      <Path d="M63 24 h6 l3 -7 l4 13 l3 -6 h8" fill="none" stroke={c.g} strokeWidth={2} />
      <Rect x={8} y={62} width={84} height={22} rx={6} fill={c.l} />
      <Rect x={10} y={56} width={24} height={14} rx={5} fill="#FFFFFF" />
      <Rect x={36} y={60} width={56} height={14} rx={4} fill={c.a} opacity={0.6} />
      <Rect x={12} y={84} width={6} height={22} fill={c.e} />
      <Rect x={82} y={84} width={6} height={22} fill={c.e} />
    </G>
  ),
  castle: (c) => (
    <G>
      <Rect x={18} y={46} width={64} height={60} fill="#FF8E72" />
      <Rect x={10} y={30} width={20} height={76} fill="#FFD84D" />
      <Rect x={70} y={30} width={20} height={76} fill="#5CE1E6" />
      {[10, 18, 70, 78].map((x) => <Rect key={x} x={x} y={24} width={6} height={8} fill={x < 50 ? '#FFD84D' : '#5CE1E6'} />)}
      <Path d="M40 106 V82 A10 10 0 0 1 60 82 V106 Z" fill={c.d} />
      <Line x1={20} y1={30} x2={20} y2={10} stroke={c.l} strokeWidth={2} />
      <Polygon points="20,10 34,15 20,20" fill="#C77DFF" />
      <Circle cx={50} cy={64} r={6} fill="#FFFFFF" opacity={0.8} />
    </G>
  ),
  coffee: (c) => (
    <G>
      <Rect x={22} y={12} width={56} height={94} rx={6} fill={c.w} stroke={c.e} strokeWidth={3} />
      <Rect x={30} y={20} width={40} height={16} rx={2} fill={c.d} />
      <Circle cx={38} cy={28} r={3} fill={c.a} />
      <Rect x={46} y={25} width={18} height={5} rx={1} fill={c.g} opacity={0.9} />
      <Rect x={34} y={50} width={32} height={30} rx={3} fill={c.d} />
      <Path d="M43 66 h14 v10 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 Z" fill={c.l} />
      <Path d="M47 62 q2 -4 0 -8 M53 62 q2 -4 0 -8" stroke={c.l} strokeWidth={1.5} fill="none" opacity={0.7} />
      <Path d="M30 92 l6 -4 m2 4 l6 -4 m4 0 v4 m4 -4 l4 4" stroke={c.d} strokeWidth={1.5} />
    </G>
  ),
  cabinet: (c) => (
    <G>
      <Rect x={24} y={10} width={52} height={96} rx={2} fill={c.w} stroke={c.e} strokeWidth={2} />
      {[0, 1, 2].map((r) => (
        <G key={r}>
          <Rect x={30} y={16 + r * 30} width={40} height={24} rx={2} fill={c.s} />
          <Rect x={44} y={24 + r * 30} width={12} height={4} rx={2} fill={c.e} />
        </G>
      ))}
      <Rect x={20} y={46} width={60} height={26} rx={2} fill={c.s} stroke={c.e} strokeWidth={1.5} />
      <Rect x={26} y={40} width={10} height={14} fill={c.l} transform="rotate(-8 31 47)" />
      <Rect x={38} y={38} width={10} height={14} fill={c.l} />
      <Rect x={50} y={40} width={10} height={14} fill="#FFD36E" transform="rotate(6 55 47)" />
    </G>
  ),
  scanner: (c) => (
    <G>
      <Rect x={14} y={10} width={12} height={98} rx={3} fill={c.w} stroke={c.e} strokeWidth={2} />
      <Rect x={74} y={10} width={12} height={98} rx={3} fill={c.w} stroke={c.e} strokeWidth={2} />
      <Rect x={14} y={6} width={72} height={12} rx={4} fill={c.w} stroke={c.e} strokeWidth={2} />
      {[30, 50, 70, 90].map((y) => <Line key={y} x1={28} y1={y} x2={72} y2={y} stroke={c.g} strokeWidth={2} opacity={0.5} />)}
      <Circle cx={50} cy={12} r={3} fill="#4CF2A0" />
    </G>
  ),
  cell: (c) => (
    <G>
      <Rect x={14} y={10} width={72} height={98} rx={3} fill={c.d} stroke={c.e} strokeWidth={4} />
      {[26, 38, 50, 62, 74].map((x) => <Line key={x} x1={x} y1={12} x2={x} y2={106} stroke={c.e} strokeWidth={3} />)}
      <Rect x={14} y={54} width={72} height={4} fill={c.e} />
      <Rect x={36} y={22} width={28} height={10} rx={2} fill={c.a} />
    </G>
  ),
  rack: (c) => (
    <G>
      <Rect x={22} y={6} width={56} height={102} rx={3} fill={c.d} stroke={c.e} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <G key={r}>
          <Rect x={28} y={12 + r * 15} width={44} height={11} rx={1} fill={c.s} />
          <Circle cx={34} cy={17.5 + r * 15} r={2} fill={r % 2 ? c.g : c.a} />
          <Circle cx={41} cy={17.5 + r * 15} r={2} fill={r % 3 ? c.g : c.l} opacity={0.7} />
        </G>
      ))}
      <Rect x={60} y={96} width={14} height={8} fill="#FFD84D" transform="rotate(-10 67 100)" />
    </G>
  ),
  vaultdoor: (c) => (
    <G>
      <Circle cx={50} cy={58} r={48} fill={c.s} stroke={c.e} strokeWidth={5} />
      <Circle cx={50} cy={58} r={34} fill={c.w} stroke={c.e} strokeWidth={3} />
      {[0, 60, 120].map((a) => <Rect key={a} x={46} y={30} width={8} height={56} rx={4} fill={c.e} transform={`rotate(${a} 50 58)`} />)}
      <Circle cx={50} cy={58} r={9} fill={c.g} />
    </G>
  ),
  microscope: (c) => (
    <G>
      <Rect x={6} y={78} width={88} height={8} rx={2} fill={c.e} />
      <Rect x={12} y={86} width={6} height={22} fill={c.s} />
      <Rect x={82} y={86} width={6} height={22} fill={c.s} />
      <Path d="M40 76 h26 v-6 h-8 l-6 -34 l6 -4 l-6 -10 l-10 6 l6 10 l2 32 h-10 Z" fill={c.w} stroke={c.d} strokeWidth={2} />
      <Circle cx={74} cy={64} r={5} fill={c.g} opacity={0.9} />
      <Rect x={70} y={70} width={10} height={6} rx={1} fill={c.a} />
    </G>
  ),
  tank: (c) => (
    <G>
      <Rect x={26} y={6} width={48} height={12} rx={4} fill={c.e} />
      <Rect x={28} y={16} width={44} height={80} rx={6} fill={c.g} opacity={0.3} stroke={c.e} strokeWidth={2} />
      <Path d="M50 90 q-8 -16 0 -30 q8 -12 2 -26" stroke={c.a} strokeWidth={3} fill="none" />
      <Ellipse cx={44} cy={50} rx={6} ry={3} fill={c.a} />
      <Ellipse cx={56} cy={38} rx={6} ry={3} fill={c.a} />
      {[[38, 70], [60, 58], [46, 30]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r={2.5} fill={c.l} opacity={0.7} />)}
      <Rect x={24} y={94} width={52} height={14} rx={3} fill={c.e} />
    </G>
  ),
  tree: (c) => (
    <G>
      <Path d="M46 108 V70 q-14 -6 -18 -20 M54 108 V66 q12 -8 16 -18" stroke="#7A5426" strokeWidth={8} fill="none" />
      <Circle cx={30} cy={40} r={22} fill="#2E9A55" />
      <Circle cx={66} cy={34} r={24} fill="#3DB86A" />
      <Circle cx={48} cy={20} r={20} fill="#56D07E" />
      <Circle cx={40} cy={30} r={4} fill="#FFE07A" />
      <Circle cx={70} cy={22} r={3} fill="#FFE07A" />
      <Path d="M30 108 q10 -8 20 0 q10 -8 20 0" stroke="#7A5426" strokeWidth={4} fill="none" />
    </G>
  ),
  window: (c) => (
    <G>
      <Rect x={10} y={14} width={80} height={70} rx={6} fill="#0A1030" stroke={c.e} strokeWidth={5} />
      <Line x1={50} y1={14} x2={50} y2={84} stroke={c.e} strokeWidth={3} />
      {[[24, 30], [36, 56], [66, 26], [78, 60], [58, 44]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={1.8} fill={c.l} />)}
      <Circle cx={72} cy={40} r={8} fill={c.a} opacity={0.85} />
      <Rect x={6} y={84} width={88} height={6} rx={2} fill={c.e} />
    </G>
  ),
  shelf: (c) => (
    <G>
      <Rect x={8} y={8} width={84} height={100} fill="none" stroke={c.a} strokeWidth={5} />
      {[40, 72].map((y) => <Rect key={y} x={8} y={y} width={84} height={5} fill={c.a} />)}
      {[[14, 18, 22, 22], [40, 22, 18, 18], [62, 14, 26, 26], [16, 50, 30, 22], [52, 54, 20, 18], [20, 82, 24, 22], [56, 84, 28, 20]].map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} fill={i % 2 ? '#B7853F' : '#9A6B30'} stroke="#7A5426" strokeWidth={1.5} />
      ))}
    </G>
  ),
  forklift: (c) => (
    <G>
      <Rect x={34} y={48} width={44} height={40} rx={4} fill={c.a} />
      <Rect x={42} y={24} width={30} height={28} fill="none" stroke={c.d} strokeWidth={4} />
      <Rect x={14} y={12} width={6} height={86} fill={c.d} />
      <Rect x={4} y={92} width={30} height={5} fill={c.d} />
      <Circle cx={44} cy={96} r={10} fill={c.d} />
      <Circle cx={72} cy={96} r={10} fill={c.d} />
      <Circle cx={80} cy={58} r={4} fill="#FFF3B0" />
    </G>
  ),
  freezer: (c) => (
    <G>
      <Rect x={14} y={8} width={72} height={100} rx={4} fill={c.w} stroke={c.e} strokeWidth={3} />
      <Rect x={70} y={40} width={6} height={30} rx={3} fill={c.e} />
      <Path d="M14 24 q20 6 36 0 q20 -6 36 0" stroke="#FFFFFF" strokeWidth={5} fill="none" opacity={0.8} />
      {[22, 38, 56].map((x) => <Path key={x} d={`M${x} 26 l3 12 l3 -12`} fill="#FFFFFF" opacity={0.85} />)}
      <Path d="M36 64 a8 8 0 1 1 10 8 l-4 8 l-6 -4 Z" fill="#FFFFFF" opacity={0.35} />
      <Circle cx={30} cy={96} r={4} fill={c.a} />
    </G>
  ),
  generator: (c) => (
    <G>
      <Rect x={8} y={40} width={84} height={66} rx={6} fill={c.w} stroke={c.e} strokeWidth={3} />
      {[20, 32, 44, 56].map((y) => <Rect key={y} x={14} y={y + 10} width={40} height={6} rx={2} fill={c.s} />)}
      <Circle cx={72} cy={66} r={14} fill={c.d} stroke={c.e} strokeWidth={2} />
      <Line x1={72} y1={66} x2={62} y2={74} stroke={c.g} strokeWidth={3} />
      <Rect x={26} y={20} width={10} height={22} fill={c.s} />
      <Path d="M31 18 q-6 -8 0 -16" stroke={c.e} strokeWidth={2} fill="none" opacity={0.6} />
    </G>
  ),
  coil: (c) => (
    <G>
      <Rect x={30} y={84} width={40} height={24} rx={4} fill={c.e} />
      {[0, 1, 2, 3, 4].map((k) => <Ellipse key={k} cx={50} cy={76 - k * 11} rx={16 - k} ry={5} fill="none" stroke={c.e} strokeWidth={3} />)}
      <Circle cx={50} cy={18} r={14} fill={c.g} opacity={0.85} />
      <Path d="M36 16 l-10 -6 l4 8 l-12 -2 M64 16 l10 -8 l-2 8 l12 0" stroke={c.g} strokeWidth={2} fill="none" />
    </G>
  ),
  pump: (c) => (
    <G>
      <Rect x={0} y={60} width={100} height={14} fill={c.e} />
      <Rect x={28} y={36} width={44} height={62} rx={8} fill={c.w} stroke={c.e} strokeWidth={3} />
      <Circle cx={50} cy={26} r={16} fill="none" stroke={c.a} strokeWidth={4} />
      <Line x1={34} y1={26} x2={66} y2={26} stroke={c.a} strokeWidth={3} />
      <Line x1={50} y1={10} x2={50} y2={42} stroke={c.a} strokeWidth={3} />
      <Ellipse cx={50} cy={104} rx={40} ry={5} fill={c.g} opacity={0.4} />
    </G>
  ),
  countdown: (c) => (
    <G>
      <Rect x={4} y={18} width={92} height={56} rx={5} fill={c.d} stroke={c.e} strokeWidth={4} />
      <Path d="M18 34 h12 v24 h-12 Z M38 34 h12 v24 h-12 Z M62 34 h12 v24 h-12 Z M80 34 h8 v24 h-8 Z" fill="none" stroke={c.g} strokeWidth={3} />
      <Circle cx={56} cy={40} r={2} fill={c.g} />
      <Circle cx={56} cy={52} r={2} fill={c.g} />
      <Rect x={44} y={74} width={12} height={34} fill={c.s} />
      <Circle cx={14} cy={12} r={5} fill={c.a} />
      <Circle cx={86} cy={12} r={5} fill={c.a} />
    </G>
  ),
  traindoor: (c) => (
    <G>
      <Rect x={12} y={8} width={76} height={100} rx={8} fill={c.w} stroke={c.e} strokeWidth={3} />
      <Line x1={50} y1={10} x2={50} y2={106} stroke={c.d} strokeWidth={3} />
      <Rect x={20} y={20} width={24} height={34} rx={6} fill="#0A1030" />
      <Rect x={56} y={20} width={24} height={34} rx={6} fill="#0A1030" />
      <Circle cx={34} cy={30} r={2} fill={c.l} />
      <Rect x={26} y={4} width={48} height={8} rx={2} fill={c.d} />
      <Rect x={30} y={6} width={24} height={4} fill={c.a} />
    </G>
  ),
  stationclock: (c) => (
    <G>
      <Rect x={47} y={60} width={6} height={48} fill={c.e} />
      <Circle cx={50} cy={36} r={30} fill={c.l} stroke={c.e} strokeWidth={5} />
      {Array.from({ length: 12 }, (_, i) => <Rect key={i} x={49} y={10} width={2} height={6} fill={c.d} transform={`rotate(${i * 30} 50 36)`} />)}
      <Line x1={50} y1={36} x2={50} y2={16} stroke={c.d} strokeWidth={3} />
      <Line x1={50} y1={36} x2={66} y2={42} stroke={c.d} strokeWidth={3} />
      <Line x1={50} y1={36} x2={38} y2={22} stroke={c.a} strokeWidth={1.5} />
    </G>
  ),
  dock: (c) => (
    <G>
      <Path d="M10 108 V40 A40 40 0 0 1 90 40 V108" fill={c.s} stroke={c.e} strokeWidth={3} />
      <Ellipse cx={50} cy={58} rx={24} ry={12} fill={c.d} stroke={c.e} strokeWidth={2} />
      <Circle cx={50} cy={56} r={6} fill={c.g} />
      <Line x1={30} y1={58} x2={16} y2={52} stroke={c.e} strokeWidth={3} />
      <Line x1={70} y1={58} x2={84} y2={52} stroke={c.e} strokeWidth={3} />
      <Path d="M40 86 q10 8 20 0" stroke={c.g} strokeWidth={3} fill="none" />
      <Rect x={28} y={98} width={44} height={6} rx={2} fill={c.g} opacity={0.6} />
    </G>
  ),
  cube: (c) => (
    <G>
      <Polygon points="50,8 88,28 88,72 50,92 12,72 12,28" fill={c.g} opacity={0.12} stroke={c.e} strokeWidth={3} />
      <Path d="M12 28 L50 48 L88 28 M50 48 V92" stroke={c.e} strokeWidth={3} fill="none" />
      <Path d="M50 8 V48" stroke={c.a} strokeWidth={1.5} strokeDasharray="4 4" />
      <Ellipse cx={50} cy={104} rx={30} ry={4} fill={c.g} opacity={0.4} />
    </G>
  ),
  bookstack: (c) => (
    <G>
      {[['#FF8E72', 10, 92, 80], ['#4CF2C3', 16, 78, 70], ['#FFD36E', 8, 64, 76], ['#8FB8F0', 18, 50, 64], ['#C77DFF', 22, 36, 56]].map(([col, x, y, w], i) => (
        <Rect key={i} x={x as number} y={y as number} width={w as number} height={14} rx={2} fill={col as string} stroke={c.d} strokeWidth={1.5} />
      ))}
      <Rect x={44} y={18} width={8} height={18} fill={c.l} />
      <Path d="M48 18 q-4 -8 0 -14 q4 6 0 14" fill={c.a} />
    </G>
  ),
  gear: (c) => (
    <G>
      {Array.from({ length: 10 }, (_, i) => <Rect key={i} x={45} y={4} width={10} height={16} rx={2} fill={c.e} transform={`rotate(${i * 36} 50 54)`} />)}
      <Circle cx={50} cy={54} r={38} fill={c.w} stroke={c.e} strokeWidth={4} />
      <Circle cx={50} cy={54} r={14} fill={c.d} stroke={c.e} strokeWidth={3} />
      {[0, 90, 180, 270].map((a) => <Rect key={a} x={47} y={20} width={6} height={20} fill={c.e} transform={`rotate(${a} 50 54)`} />)}
      <Circle cx={50} cy={54} r={4} fill={c.a} />
    </G>
  ),
  telescope: (c) => (
    <G>
      <Line x1={50} y1={66} x2={26} y2={108} stroke={c.e} strokeWidth={4} />
      <Line x1={50} y1={66} x2={74} y2={108} stroke={c.e} strokeWidth={4} />
      <Line x1={50} y1={66} x2={50} y2={108} stroke={c.e} strokeWidth={4} />
      <Rect x={14} y={30} width={74} height={18} rx={9} fill={c.w} stroke={c.e} strokeWidth={3} transform="rotate(-28 50 40)" />
      <Circle cx={84} cy={18} r={8} fill={c.g} opacity={0.6} />
      {[[12, 12], [30, 6], [92, 50]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r={2} fill={c.a} />)}
    </G>
  ),
  mirror: (c) => (
    <G>
      <Ellipse cx={50} cy={54} rx={32} ry={48} fill={c.e} />
      <Ellipse cx={50} cy={54} rx={26} ry={42} fill="#16202E" />
      <Path d="M36 26 L46 18 M34 40 L54 22" stroke="#FFFFFF" strokeWidth={3} opacity={0.5} />
      <Circle cx={50} cy={66} r={9} fill={c.a} opacity={0.5} />
      <Rect x={42} y={98} width={16} height={10} fill={c.e} />
    </G>
  ),
  ladder: (c) => (
    <G>
      <Rect x={6} y={6} width={88} height={102} fill={c.s} />
      {[30, 56, 82].map((y) => <Rect key={y} x={6} y={y} width={88} height={4} fill={c.e} />)}
      {[[12, 10, 8], [22, 14, 6], [30, 8, 10], [60, 36, 8], [70, 40, 10], [14, 62, 10], [74, 64, 8]].map(([x, y, w], i) => (
        <Rect key={i} x={x} y={y} width={w} height={18} fill={['#FF8E72', '#FFD36E', '#4CF2C3', '#8FB8F0'][i % 4]} />
      ))}
      <Line x1={40} y1={4} x2={52} y2={108} stroke={c.a} strokeWidth={4} />
      <Line x1={56} y1={4} x2={68} y2={108} stroke={c.a} strokeWidth={4} />
      {[20, 40, 60, 80, 98].map((y) => <Line key={y} x1={42 + y * 0.11} y1={y} x2={58 + y * 0.11} y2={y} stroke={c.a} strokeWidth={3} />)}
    </G>
  ),
  obelisk: (c) => (
    <G>
      <Polygon points="40,10 60,10 68,104 32,104" fill={c.w} stroke={c.e} strokeWidth={2} />
      <Polygon points="40,10 50,0 60,10" fill={c.e} />
      <Circle cx={50} cy={44} r={9} fill="none" stroke={c.g} strokeWidth={3} />
      <Circle cx={50} cy={44} r={3} fill={c.g} />
      <Path d="M44 64 h12 M46 72 h8 M42 80 h16" stroke={c.g} strokeWidth={2} opacity={0.8} />
      <Path d="M20 108 q8 -14 16 -6 M80 108 q-8 -12 -14 -4" stroke="#56D07E" strokeWidth={3} fill="none" />
    </G>
  ),
  gate: (c) => (
    <G>
      <Rect x={6} y={8} width={88} height={100} rx={4} fill={c.w} stroke={c.e} strokeWidth={4} />
      <Line x1={50} y1={8} x2={50} y2={108} stroke={c.d} strokeWidth={3} />
      {[30, 56, 82].map((y) => <Rect key={y} x={10} y={y} width={80} height={5} fill={c.s} />)}
      <Path d="M30 20 l6 14 l-4 10 l8 12" stroke={c.a} strokeWidth={2.5} fill="none" />
      <Path d="M70 60 l-6 10 l6 10 l-4 14" stroke={c.a} strokeWidth={2.5} fill="none" />
      <Circle cx={50} cy={58} r={6} fill={c.g} />
    </G>
  ),
  prism: (c) => (
    <G>
      {['#FF6B6B', '#FFD84D', '#7CFF6B', '#4CC9F0', '#C77DFF'].map((col, i) => (
        <Line key={col} x1={58} y1={56} x2={100} y2={30 + i * 10} stroke={col} strokeWidth={3} opacity={0.85} />
      ))}
      <Line x1={0} y1={64} x2={42} y2={58} stroke="#FFFFFF" strokeWidth={4} />
      <Polygon points="50,18 74,96 26,96" fill="#FFFFFF" opacity={0.35} stroke="#FFFFFF" strokeWidth={3} />
      <Rect x={30} y={96} width={40} height={12} rx={3} fill={c.e} />
    </G>
  ),
  core: (c) => (
    <G>
      <Ellipse cx={50} cy={52} rx={46} ry={18} fill="none" stroke={c.e} strokeWidth={4} />
      <Circle cx={50} cy={52} r={30} fill={c.g} opacity={0.35} />
      <Circle cx={50} cy={52} r={20} fill={c.g} opacity={0.8} />
      <Circle cx={44} cy={46} r={6} fill="#FFFFFF" opacity={0.7} />
      <Path d="M4 52 a46 18 0 0 0 92 0" fill="none" stroke={c.a} strokeWidth={3} />
      <Rect x={40} y={84} width={20} height={24} fill={c.e} />
    </G>
  ),
};

// ---- Wall props: 100 x 60 art over a wall's front edge -----------------------------------------

const PROPS: Record<Prop, (c: C) => React.ReactNode> = {
  screen: (c) => (
    <G>
      <Rect x={26} y={8} width={48} height={34} rx={3} fill={c.d} stroke={c.e} strokeWidth={3} />
      <Rect x={31} y={13} width={38} height={24} fill={c.g} opacity={0.45} />
      <Path d="M34 30 l8 -8 l6 6 l10 -10" stroke={c.l} strokeWidth={2} fill="none" />
    </G>
  ),
  vent: (c) => (
    <G>
      <Rect x={28} y={14} width={44} height={28} rx={3} fill={c.s} stroke={c.e} strokeWidth={2} />
      {[20, 27, 34].map((y) => <Rect key={y} x={32} y={y} width={36} height={3} fill={c.d} />)}
    </G>
  ),
  lamp: (c) => (
    <G>
      <Circle cx={50} cy={26} r={20} fill={c.g} opacity={0.2} />
      <Rect x={40} y={18} width={20} height={14} rx={7} fill={c.g} />
      <Rect x={44} y={12} width={12} height={6} fill={c.e} />
    </G>
  ),
  sign: (c) => (
    <G>
      <Rect x={22} y={12} width={56} height={28} rx={3} fill={c.a} />
      <Rect x={28} y={18} width={30} height={4} fill={c.d} />
      <Rect x={28} y={26} width={40} height={4} fill={c.d} opacity={0.7} />
    </G>
  ),
  pipe: (c) => (
    <G>
      <Rect x={0} y={20} width={100} height={12} rx={6} fill={c.e} />
      <Rect x={44} y={14} width={12} height={24} rx={3} fill={c.a} />
      <Circle cx={50} cy={26} r={3} fill={c.d} />
    </G>
  ),
  vine: () => (
    <G>
      <Path d="M20 0 q10 20 0 40 q-6 12 4 20 M56 0 q-8 16 4 30" stroke="#3DB86A" strokeWidth={4} fill="none" />
      {[[22, 14], [16, 34], [26, 52], [54, 12], [60, 26]].map(([x, y]) => <Ellipse key={`${x}${y}`} cx={x} cy={y} rx={6} ry={4} fill="#56D07E" />)}
    </G>
  ),
  drawing: (c) => (
    <G>
      <Rect x={30} y={6} width={40} height={40} fill="#FFF8E8" transform="rotate(-6 50 26)" />
      <Circle cx={50} cy={24} r={9} fill="none" stroke={c.a} strokeWidth={3} />
      <Line x1={50} y1={15} x2={50} y2={9} stroke={c.a} strokeWidth={2} />
      <Circle cx={47} cy={23} r={1.8} fill={c.d} />
      <Circle cx={53} cy={23} r={1.8} fill={c.d} />
    </G>
  ),
  gauge: (c) => (
    <G>
      <Circle cx={50} cy={26} r={16} fill={c.l} stroke={c.e} strokeWidth={3} />
      <Line x1={50} y1={26} x2={60} y2={18} stroke={c.d} strokeWidth={2.5} />
      <Path d="M38 30 a12 12 0 0 1 4 -12" stroke={c.a} strokeWidth={3} fill="none" />
    </G>
  ),
  window: (c) => (
    <G>
      <Rect x={22} y={8} width={56} height={34} rx={4} fill="#0A1030" stroke={c.e} strokeWidth={3} />
      <Circle cx={36} cy={20} r={1.5} fill={c.l} />
      <Circle cx={60} cy={28} r={1.5} fill={c.l} />
      <Circle cx={66} cy={16} r={4} fill={c.a} opacity={0.7} />
    </G>
  ),
  camera: (c) => (
    <G>
      <Rect x={30} y={14} width={34} height={16} rx={4} fill={c.l} transform="rotate(14 47 22)" />
      <Circle cx={64} cy={28} r={5} fill={c.d} />
      <Circle cx={36} cy={18} r={2.5} fill="#FF5C7A" />
      <Rect x={26} y={8} width={6} height={12} fill={c.e} />
    </G>
  ),
  clock: (c) => (
    <G>
      <Circle cx={50} cy={26} r={17} fill={c.l} stroke={c.e} strokeWidth={3} />
      <Line x1={50} y1={26} x2={50} y2={14} stroke={c.d} strokeWidth={2.5} />
      <Line x1={50} y1={26} x2={59} y2={30} stroke={c.d} strokeWidth={2.5} />
    </G>
  ),
  rune: (c) => (
    <G>
      <Circle cx={50} cy={26} r={18} fill={c.g} opacity={0.15} />
      <Path d="M50 10 L62 26 L50 42 L38 26 Z M50 18 V34 M42 26 H58" stroke={c.g} strokeWidth={2.5} fill="none" />
    </G>
  ),
  cable: (c) => (
    <G>
      <Path d="M0 12 q25 40 50 10 q25 -30 50 8" stroke={c.d} strokeWidth={5} fill="none" />
      <Path d="M0 18 q30 30 60 6" stroke={c.a} strokeWidth={3} fill="none" />
    </G>
  ),
};

// ---- Floor decals: 100 x 100, drawn faintly ---------------------------------------------------

const DECALS: Record<Decal, (c: C) => React.ReactNode> = {
  puddle: (c) => <Ellipse cx={50} cy={50} rx={34} ry={18} fill={c.g} opacity={0.18} />,
  leaves: () => (
    <G>
      <Ellipse cx={40} cy={44} rx={12} ry={6} fill="#56D07E" opacity={0.35} transform="rotate(30 40 44)" />
      <Ellipse cx={62} cy={58} rx={10} ry={5} fill="#FFD36E" opacity={0.3} transform="rotate(-20 62 58)" />
    </G>
  ),
  crack: () => <Path d="M20 30 L40 46 L36 60 L58 70 L80 66" stroke="#000000" strokeWidth={3} fill="none" opacity={0.35} />,
  stripe: (c) => <Path d="M10 40 h80 v14 h-80 Z" fill={c.a} opacity={0.14} />,
  papers: () => (
    <G>
      <Rect x={30} y={34} width={26} height={32} fill="#FFFFFF" opacity={0.18} transform="rotate(-14 43 50)" />
      <Rect x={50} y={40} width={22} height={28} fill="#FFFFFF" opacity={0.14} transform="rotate(10 61 54)" />
    </G>
  ),
  frost: () => <Path d="M50 20 V80 M24 35 L76 65 M24 65 L76 35" stroke="#FFFFFF" strokeWidth={3} opacity={0.22} />,
  rug: (c) => <Ellipse cx={50} cy={50} rx={40} ry={30} fill={c.a} opacity={0.16} />,
  scorch: () => <Ellipse cx={50} cy={50} rx={28} ry={22} fill="#000000" opacity={0.3} />,
  roots: () => <Path d="M10 40 q20 10 30 0 q14 -12 30 6 q10 10 20 4" stroke="#7A5426" strokeWidth={4} fill="none" opacity={0.4} />,
  glyph: (c) => <Path d="M50 22 L72 50 L50 78 L28 50 Z M50 36 V64" stroke={c.g} strokeWidth={3} fill="none" opacity={0.25} />,
  cable: () => <Path d="M0 60 q30 -30 60 0 q20 20 40 -10" stroke="#000000" strokeWidth={5} fill="none" opacity={0.3} />,
};

/** The set piece stands on its wall cell and rises above it, shrinking to fit when the wall is the board's top edge. */
function LandmarkView({ cell, w, size, kind, c }: { cell: number; w: number; size: number; kind: Landmark; c: ReturnType<typeof colorsOf> }) {
  const bottom = rowOf(w, cell) * size + size;
  const h = Math.min(size * 1.54, bottom - size * 0.04);
  const wd = (h * 100) / 110;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: colOf(w, cell) * size + size / 2 - wd / 2, top: bottom - h, width: wd, height: h }}>
      <Svg width={wd} height={h} viewBox="0 0 100 110">
        {LANDMARKS[kind](c)}
      </Svg>
    </View>
  );
}

/** Everything in a room's decor plan, positioned on the board. */
export const Decor = memo(function Decor({ room, env, plan, size, depth, landmark, layer }: { room: Room; env: Environment; plan: DecorPlan; size: number; depth: number; landmark: Landmark; layer: 'floor' | 'walls' }) {
  const c = colorsOf(env);
  const w = room.width;
  if (layer === 'floor')
    return (
      <>
        {plan.decals.map((d) => (
          <View key={`dc${d.cell}`} pointerEvents="none" style={{ position: 'absolute', opacity: 0.6, left: colOf(w, d.cell) * size + (d.x - 0.5) * size * 0.3, top: rowOf(w, d.cell) * size + (d.y - 0.5) * size * 0.3, width: size, height: size, transform: [{ rotate: `${Math.round(d.rot)}deg` }] }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
              {DECALS[d.kind](c)}
            </Svg>
          </View>
        ))}
      </>
    );
  return (
    <>
      {plan.props.map((p) => (
        <View key={`pr${p.cell}`} pointerEvents="none" style={{ position: 'absolute', left: colOf(w, p.cell) * size, top: rowOf(w, p.cell) * size + size - depth - size * 0.42, width: size, height: size * 0.6 }}>
          <Svg width={size} height={size * 0.6} viewBox="0 0 100 60">
            {PROPS[p.kind](c)}
          </Svg>
        </View>
      ))}
      {plan.landmark !== undefined && <LandmarkView cell={plan.landmark} w={w} size={size} kind={landmark} c={c} />}
    </>
  );
});
