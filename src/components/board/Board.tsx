import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { DEFAULT_COSMETICS, getCosmetic } from '../../config/cosmetics';
import { chapterPalette, type Palette } from '../../theme/chapters';
import { colOf, dirBetween, rowOf } from '../../game/grid';
import type { Action, Dir, GameState, Room, StepEvent } from '../../game/types';
import { colors } from '../../theme/theme';
import { Breathe, Flash, FloatText, Motes, PlayerFx, Ring, useBumpNudge } from './Fx';
import { ActorLight, Lighting, type LightPool } from './Lighting';
import { Burst, type BurstSpec } from './Particles';
import { TELE_COLORS } from './glyphs';
import { deriveModel, type TileView } from './derive';
import {
  CheckpointGlyph,
  CoinGlyph as CoinGlyphRaw,
  CoreGlyph as CoreGlyphRaw,
  CrackGlyph,
  DoorGlyph,
  DroneGlyph as DroneGlyphRaw,
  DroneNextGlyph as DroneNextGlyphRaw,
  EmitterGlyph,
  ExitGlyph,
  EyeGlyph,
  RecordingGlyph,
  WallWritingGlyph,
  KeyGlyph as KeyGlyphRaw,
  LockGlyph,
  PlateGlyph,
  PlayerGlyph as PlayerGlyphRaw,
  SpikesGlyph,
  SwitchGlyph,
  TeleGlyph,
} from './glyphs';

// Glyphs are SVG and take only primitive props, so memoising them stops every sprite from
// re-drawing on each move (the main per-move cost on device).
const CoinGlyph = memo(CoinGlyphRaw);
const CoreGlyph = memo(CoreGlyphRaw);
const DroneGlyph = memo(DroneGlyphRaw);
const DroneNextGlyph = memo(DroneNextGlyphRaw);
const KeyGlyph = memo(KeyGlyphRaw);
const PlayerGlyph = memo(PlayerGlyphRaw);

/** A clue drawn on the board (see game/observer/clues.ts). */
export interface BoardClue {
  id: string;
  cell: number;
  kind: 'wall' | 'recording' | 'object' | 'sigil';
  found: boolean;
  /** UV writing: only drawn while the room is dark. */
  uv?: boolean;
}

export interface BoardLook {
  skin: string;
  trail: string;
  theme: string;
  exit: string;
  tile: string;
  victory: string;
}

interface Props {
  room: Room;
  state: GameState;
  events: StepEvent[];
  seq: number;
  cell: number;
  look: BoardLook;
  reducedMotion: boolean;
  hintCells?: number[];
  checkpointCell?: number;
  onAction?: (a: Action) => void;
  /** Disable input (paused, modal open, ended). */
  inputEnabled: boolean;
  /** Chapter environment for the default theme (0 or undefined = cosmetic palette). */
  chapter?: number;
  /** Freeze power-up active: tint the room. */
  frozen?: boolean;
  /** Shield power-up armed: show a bubble around the player. */
  shielded?: boolean;
  clues?: BoardClue[];
  /** Lights out: only the area around the player stays lit. */
  dark?: boolean;
  /** Wall cells that slide open once when the room loads (a room-memory variant). */
  openingCells?: number[];
  /** Overrides the environment palette (the Observation Wing). */
  palette?: Palette;
}

const MOVE_MS = 110;

export type BoardTheme = Palette;

/** Darkens a #RRGGBB colour by a factor (0..1). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

/** The default room theme follows the chapter's environment; other themes are cosmetic picks. */
export function themeLook(id: string, chapter?: number): BoardTheme {
  if ((id === DEFAULT_COSMETICS.theme || !getCosmetic(id)) && chapter) return chapterPalette(chapter);
  const l = getCosmetic(id)?.look ?? {};
  const wall = String(l.wall ?? '#262F45');
  return {
    bg: String(l.bg ?? '#07090F'),
    floor: String(l.floor ?? '#121826'),
    floorAlt: String(l.floorAlt ?? '#151C2C'),
    wall,
    wallEdge: String(l.wallEdge ?? '#3A4766'),
    wallSide: shade(wall, 0.55),
    glow: colors.cyan,
  };
}

/** Height of a wall's front face, as a fraction of a cell: the "3D" depth of the room. */
export const WALL_DEPTH = 0.26;

// ---- Static terrain ----------------------------------------------------------------------

const TerrainTile = memo(function TerrainTile({
  k,
  size,
  x,
  y,
  t,
  pattern,
  alt,
  wallAbove,
  wallLeft,
  wallBelow,
  wallRight,
}: {
  k: TileView['tile']['k'];
  size: number;
  x: number;
  y: number;
  t: BoardTheme;
  pattern: string;
  alt: boolean;
  wallAbove: boolean;
  wallLeft: boolean;
  wallBelow: boolean;
  wallRight: boolean;
}) {
  const base = { position: 'absolute' as const, left: x, top: y, width: size, height: size };
  const depth = Math.round(size * WALL_DEPTH);
  if (k === 'wall') {
    // A raised block seen from above and in front. Neighbouring walls merge into one solid mass:
    // edges are lit only where the block is exposed, and the front face (with a strip of
    // chapter-coloured trim light) shows only where floor lies in front of it.
    const face = !wallBelow;
    const top = face ? size - depth : size;
    const r = 4;
    return (
      <View style={base}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: top,
            backgroundColor: t.wall,
            borderTopWidth: wallAbove ? 0 : 2,
            borderTopColor: t.wallEdge,
            borderLeftWidth: wallLeft ? 0 : 1,
            borderLeftColor: `${t.wallEdge}AA`,
            borderRightWidth: wallRight ? 0 : 1,
            borderRightColor: '#00000040',
            borderTopLeftRadius: !wallAbove && !wallLeft ? r : 0,
            borderTopRightRadius: !wallAbove && !wallRight ? r : 0,
          }}
        >
          {!wallAbove && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top * 0.38, backgroundColor: '#FFFFFF0D' }} />}
        </View>
        {face && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: depth, backgroundColor: t.wallSide, borderTopWidth: 1, borderTopColor: '#00000059' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: depth * 0.32, height: Math.max(1.5, depth * 0.1), backgroundColor: t.glow, opacity: 0.32 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: depth * 0.45, backgroundColor: '#00000038' }} />
          </View>
        )}
      </View>
    );
  }
  if (k === 'pit') {
    // A shaft: the far wall is visible inside the top of the hole.
    return (
      <View style={[base, { backgroundColor: '#010205' }]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size * 0.34, backgroundColor: shade(t.wallSide, 0.7) }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: size * 0.34, height: size * 0.12, backgroundColor: '#00000080' }} />
      </View>
    );
  }
  return (
    <View
      style={[
        base,
        {
          backgroundColor: alt ? t.floorAlt : t.floor,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderTopColor: '#FFFFFF0F',
          borderLeftColor: '#FFFFFF0A',
          borderBottomWidth: 1,
          borderRightWidth: 1,
          borderBottomColor: '#00000059',
          borderRightColor: '#00000040',
        },
      ]}
    >
      {pattern === 'plain' && <View style={{ position: 'absolute', left: size * 0.07, right: size * 0.07, top: size * 0.07, bottom: size * 0.07, borderRadius: 3, borderWidth: 1, borderColor: '#FFFFFF07', backgroundColor: alt ? '#FFFFFF04' : 'transparent' }} />}
      {pattern === 'grid' && <View style={{ position: 'absolute', left: size * 0.2, right: size * 0.2, top: size * 0.2, bottom: size * 0.2, borderWidth: 1, borderColor: '#ffffff0d', borderRadius: 3 }} />}
      {pattern === 'dots' &&
        [0.2, 0.8].flatMap((a) =>
          [0.2, 0.8].map((b) => (
            <View key={`${a}${b}`} style={{ position: 'absolute', left: size * a - 1.5, top: size * b - 1.5, width: 3, height: 3, borderRadius: 2, backgroundColor: '#ffffff14' }} />
          )),
        )}
      {/* Shadows cast by the raised wall behind / beside this tile. */}
      {wallAbove && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size * 0.2, backgroundColor: '#00000052' }} />}
      {wallLeft && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: size * 0.1, backgroundColor: '#00000033' }} />}
      {k === 'crumble' && <CrackGlyph s={size} />}
    </View>
  );
});

/** Soft contact shadow under anything standing on the floor. */
const Shadow = memo(function Shadow({ size, scale = 1 }: { size: number; scale?: number }) {
  const w = size * 0.62 * scale;
  return <View pointerEvents="none" style={{ position: 'absolute', left: (size - w) / 2, top: size * 0.74, width: w, height: size * 0.16, borderRadius: size, backgroundColor: '#00000066' }} />;
});

/** Pushable crate drawn as a raised block, like a small wall. */
const Crate = memo(function Crate({ size }: { size: number }) {
  const inset = size * 0.08;
  const depth = Math.round(size * WALL_DEPTH * 0.9);
  const w = size - inset * 2;
  return (
    <View style={{ position: 'absolute', left: inset, top: inset, width: w, height: size - inset * 1.4 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: -inset * 0.4, height: depth, backgroundColor: '#00000055', borderRadius: 4 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: depth, backgroundColor: '#B7853F', borderRadius: 4, borderWidth: 2, borderColor: '#E3B26A' }}>
        <View style={{ position: 'absolute', left: '18%', right: '18%', top: '46%', height: 2, backgroundColor: '#7A5426' }} />
        <View style={{ position: 'absolute', top: '18%', bottom: '18%', left: '48%', width: 2, backgroundColor: '#7A5426' }} />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: depth, backgroundColor: '#7A5426', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
    </View>
  );
});

/**
 * A section of wall that slides into the floor when it opens (doors drawn as walls, and cells a
 * room-memory variant opens). `from` lets it start closed and open after a delay on mount.
 */
function ShiftWall({ size, closed, t, reduced, from }: { size: number; closed: boolean; t: BoardTheme; reduced: boolean; from?: { closed: boolean; delay: number } }) {
  const depth = Math.round(size * WALL_DEPTH);
  const h = useSharedValue(from ? (from.closed ? 1 : 0) : closed ? 1 : 0);
  useEffect(() => {
    const target = closed ? 1 : 0;
    if (reduced) h.value = target;
    else {
      const anim = withTiming(target, { duration: 320, easing: Easing.inOut(Easing.cubic) });
      h.value = from ? withDelay(from.delay, anim) : anim;
    }
    // `from` only applies to the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed, reduced, h]);
  const st = useAnimatedStyle(() => ({ height: size * h.value, opacity: 0.2 + 0.8 * h.value }));
  return (
    <View style={{ width: size, height: size }}>
      {/* The slot the wall sinks into. */}
      <View style={{ position: 'absolute', left: size * 0.06, right: size * 0.06, bottom: size * 0.08, height: 3, borderRadius: 2, backgroundColor: '#00000080' }} />
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, st]}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size - depth, backgroundColor: t.wall, borderTopWidth: 2, borderTopColor: t.wallEdge, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: depth, backgroundColor: t.wallSide, borderTopWidth: 1, borderTopColor: '#00000040' }} />
        </View>
      </Animated.View>
    </View>
  );
}

/** Lights out: everything beyond a few cells of the player falls into shadow. */
function Darkness({ visible, cx, cy, w, h, size, reduced }: { visible: boolean; cx: number; cy: number; w: number; h: number; size: number; reduced: boolean }) {
  const o = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    o.value = reduced ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: visible ? 180 : 600 });
  }, [visible, reduced, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: 0, top: 0, width: w, height: h, zIndex: 15 }, st]}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="lightsOut" cx={cx} cy={cy} r={size * 3.2} fx={cx} fy={cy} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#000" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#000" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.8} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="url(#lightsOut)" />
      </Svg>
    </Animated.View>
  );
}

/** Gentle hover for actors and pickups so the room feels alive. */
function Bob({ enabled, amount, period, children }: { enabled: boolean; amount: number; period: number; children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      v.value = 0;
      return;
    }
    v.value = withRepeat(withSequence(withTiming(-amount, { duration: period / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: period / 2, easing: Easing.inOut(Easing.sin) })), -1);
  }, [enabled, amount, period, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

// ---- Dynamic features ----------------------------------------------------------------------

interface FeatureProps {
  v: TileView;
  size: number;
  theme: BoardTheme;
  reduced: boolean;
  exitOpen: boolean;
  exitStyle: string;
  coresLeft: number;
  reached: boolean;
}

const Feature = memo(function Feature({
  v,
  size,
  theme,
  reduced,
  exitOpen,
  exitStyle,
  coresLeft,
  reached,
}: FeatureProps) {
  const t = v.tile;
  switch (t.k) {
    case 'exit':
      return (
        <>
          <Breathe size={size} color={theme.glow} enabled={exitOpen && !reduced} />
          <ExitGlyph s={size} open={exitOpen} style={exitStyle} coresLeft={coresLeft} />
        </>
      );
    case 'spikes':
      return <SpikesGlyph s={size} raised={!!v.raised} warning={v.warning} />;
    case 'door':
      return t.look === 'wall' ? <ShiftWall size={size} closed={!!v.active} t={theme} reduced={reduced} /> : <DoorGlyph s={size} closed={!!v.active} invert={t.invert} ch={t.ch} />;
    case 'switch':
      return <SwitchGlyph s={size} on={!!v.active} ch={t.ch} />;
    case 'plate':
      return <PlateGlyph s={size} pressed={!!v.active} ch={t.ch} />;
    case 'lock':
      return <LockGlyph s={size} color={t.color} />;
    case 'tele':
      return <TeleGlyph s={size} pair={t.pair} />;
    case 'emitter':
      return <EmitterGlyph s={size} dir={t.dir} active={!!v.active} warning={v.warning} ch={t.ch} />;
    case 'checkpoint':
      return <CheckpointGlyph s={size} reached={reached} />;
    default:
      return null;
  }
}, featurePropsEqual);

function shallowEqual(a: object, b: object): boolean {
  if (a === b) return true;
  const ka = Object.keys(a) as (keyof typeof a)[];
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

/** deriveModel builds fresh TileView objects every move; compare their contents instead. */
function featurePropsEqual(p: FeatureProps, n: FeatureProps): boolean {
  return (
    p.size === n.size &&
    p.theme === n.theme &&
    p.reduced === n.reduced &&
    p.exitOpen === n.exitOpen &&
    p.exitStyle === n.exitStyle &&
    p.coresLeft === n.coresLeft &&
    p.reached === n.reached &&
    p.v.raised === n.v.raised &&
    p.v.warning === n.v.warning &&
    p.v.active === n.v.active &&
    shallowEqual(p.v.tile, n.v.tile)
  );
}

/** Slides to a new cell; jumps (with a flash) when the move is longer than one cell. */
function Mover({ cell, w, size, reduced, children, z = 1 }: { cell: number; w: number; size: number; reduced: boolean; children: React.ReactNode; z?: number }) {
  const x = useSharedValue(colOf(w, cell) * size);
  const y = useSharedValue(rowOf(w, cell) * size);
  const o = useSharedValue(1);
  const prev = useRef(cell);
  useEffect(() => {
    const nx = colOf(w, cell) * size;
    const ny = rowOf(w, cell) * size;
    const far = Math.abs(colOf(w, prev.current) - colOf(w, cell)) + Math.abs(rowOf(w, prev.current) - rowOf(w, cell)) > 1;
    prev.current = cell;
    if (reduced || far) {
      x.value = nx;
      y.value = ny;
      if (far && !reduced) o.value = withSequence(withTiming(0.2, { duration: 0 }), withTiming(1, { duration: 220 }));
    } else {
      const cfg = { duration: MOVE_MS, easing: Easing.out(Easing.quad) };
      x.value = withTiming(nx, cfg);
      y.value = withTiming(ny, cfg);
    }
  }, [cell, w, size, reduced, x, y, o]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }], opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: z }, style]}>{children}</Animated.View>;
}

type BlockId = { id: number; cell: number };

function assignBlockIds(prev: BlockId[], blocks: number[], w: number, firstId: number): { ids: BlockId[]; next: number } {
  let nextId = firstId;
  const remaining = [...blocks];
  const out: BlockId[] = [];
  const unmatched: BlockId[] = [];
  for (const p of prev) {
    const i = remaining.indexOf(p.cell);
    if (i !== -1) {
      out.push(p);
      remaining.splice(i, 1);
    } else unmatched.push(p);
  }
  for (const c of remaining) {
    let best = -1;
    let bestD = Infinity;
    unmatched.forEach((u, i) => {
      const d = Math.abs(colOf(w, u.cell) - colOf(w, c)) + Math.abs(rowOf(w, u.cell) - rowOf(w, c));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== -1) out.push({ id: unmatched.splice(best, 1)[0].id, cell: c });
    else out.push({ id: nextId++, cell: c });
  }
  return { ids: out, next: nextId };
}

/** Keeps stable ids for blocks across moves so pushes animate as slides. */
function useBlockIds(blocks: number[], w: number) {
  const [memo, setMemo] = useState(() => ({ blocks, w, ...assignBlockIds([], blocks, w, 0) }));
  if (memo.blocks !== blocks || memo.w !== w) {
    // Derive from the previous render's ids (React's "store info from previous renders" pattern).
    const next = { blocks, w, ...assignBlockIds(memo.w === w ? memo.ids : [], blocks, w, memo.next) };
    setMemo(next);
    return next.ids;
  }
  return memo.ids;
}

function Beam({ dir, cells, w, size }: { dir: Dir; cells: number[]; w: number; size: number }) {
  if (!cells.length) return null;
  const horizontal = dir === 'left' || dir === 'right';
  const rs = cells.map((c) => rowOf(w, c));
  const cs = cells.map((c) => colOf(w, c));
  const r0 = Math.min(...rs);
  const c0 = Math.min(...cs);
  const len = cells.length * size;
  const thick = Math.max(3, size * 0.1);
  const box = horizontal
    ? { left: c0 * size, top: r0 * size + size / 2 - thick * 1.5, width: len, height: thick * 3 }
    : { left: c0 * size + size / 2 - thick * 1.5, top: r0 * size, width: thick * 3, height: len };
  return (
    <View pointerEvents="none" style={[styles.abs, box, { justifyContent: 'center', alignItems: 'center', zIndex: 3 }]}>
      <View style={[styles.abs, { left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.danger, opacity: 0.18, borderRadius: thick }]} />
      <View style={{ width: horizontal ? len : thick * 0.6, height: horizontal ? thick * 0.6 : len, backgroundColor: '#FFB3BA', borderRadius: thick }} />
    </View>
  );
}

function TrailGhost({ cell, w, size, color, seq }: { cell: number; w: number; size: number; color: string; seq: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withSequence(withTiming(0.55, { duration: 0 }), withTiming(0, { duration: 380 }));
  }, [seq, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, { left: colOf(w, cell) * size + size * 0.3, top: rowOf(w, cell) * size + size * 0.3, width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: color, zIndex: 4 }, st]}
    />
  );
}

export function Board({ room, state, events, seq, cell: size, look, reducedMotion, hintCells, checkpointCell, onAction, inputEnabled, chapter, frozen, shielded, clues, dark, openingCells, palette }: Props) {
  const w = room.width;
  const model = useMemo(() => deriveModel(room, state), [room, state]);
  const theme = useMemo(() => palette ?? themeLook(look.theme, chapter ?? room.chapter), [palette, look.theme, chapter, room.chapter]);
  const pattern = String(getCosmetic(look.tile)?.look.pattern ?? 'plain');
  const exitStyle = String(getCosmetic(look.exit)?.look.style ?? 'portal');
  const skin = getCosmetic(look.skin)?.look ?? { color: colors.cyan, shape: 'circle' };
  const trailColor = String(getCosmetic(look.trail)?.look.color ?? 'transparent');
  const blocks = useBlockIds(state.blocks, w);
  const modsKey = JSON.stringify(state.mods);

  const terrain = useMemo(
    () =>
      model.tiles.map((v) => (
        <TerrainTile
          key={v.cell}
          k={v.tile.k}
          wallAbove={v.cell >= w && model.tiles[v.cell - w]?.tile.k === 'wall'}
          wallLeft={v.cell % w > 0 && model.tiles[v.cell - 1]?.tile.k === 'wall'}
          wallBelow={v.cell + w < model.tiles.length && model.tiles[v.cell + w]?.tile.k === 'wall'}
          wallRight={v.cell % w < w - 1 && model.tiles[v.cell + 1]?.tile.k === 'wall'}
          size={size}
          x={colOf(w, v.cell) * size}
          y={rowOf(w, v.cell) * size}
          t={theme}
          pattern={pattern}
          alt={(rowOf(w, v.cell) + colOf(w, v.cell)) % 2 === 1}
        />
      )),
    // Terrain only changes when tiles are modified (crumble, fill, unlock) or the theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, modsKey, size, theme, pattern],
  );

  // Particle bursts from this action's events.
  const bursts = useMemo<BurstSpec[]>(() => {
    if (reducedMotion) return [];
    const out: BurstSpec[] = [];
    for (const e of events) {
      if (e.type === 'pickup') out.push({ id: `${seq}p${e.item}`, cell: room.items[e.item].cell, color: e.kind === 'core' ? colors.cyan : colors.amber, count: 10 });
      if (e.type === 'unlock') out.push({ id: `${seq}u${e.at}`, cell: e.at, color: colors.gold, count: 8 });
      if (e.type === 'death') out.push({ id: `${seq}d`, cell: state.player, color: colors.danger, count: 18 });
      if (e.type === 'win') out.push({ id: `${seq}w`, cell: state.player, color: look.victory === 'victory_confetti' ? colors.amber : colors.cyan, count: look.victory === 'victory_nova' ? 28 : 18, rainbow: look.victory === 'victory_confetti' });
      if (e.type === 'crumble') out.push({ id: `${seq}c${e.at}`, cell: e.at, color: '#8A7656', count: 6 });
      if (e.type === 'teleport') out.push({ id: `${seq}t`, cell: e.to, color: '#C77DFF', count: 10 });
      if (e.type === 'fill') out.push({ id: `${seq}f${e.at}`, cell: e.at, color: '#8A6A44', count: 8 });
      if (e.type === 'move') out.push({ id: `${seq}m`, cell: e.from, color: '#C9D3E655', count: 5, spread: 0.45, dot: 0.06, ms: 380 });
      if (e.type === 'push') out.push({ id: `${seq}pu`, cell: e.to, color: '#E3B26A88', count: 6, spread: 0.6, dot: 0.06, ms: 420 });
    }
    return out;
  }, [events, seq, reducedMotion, room, state.player, look.victory]);

  const floats = useMemo(() => {
    if (reducedMotion) return [];
    const out: { id: string; cell: number; text: string; color: string }[] = [];
    for (const e of events) {
      if (e.type === 'pickup') {
        const it = room.items[e.item];
        const text = e.kind === 'core' ? (model.coresLeft ? `Core · ${model.coresLeft} left` : 'Exit open!') : e.kind === 'coin' ? (it.hidden ? '+ Hidden coin!' : '+ Coin') : `+ ${it.color === 'blue' ? 'Blue' : 'Gold'} key`;
        out.push({ id: `${seq}ft${e.item}`, cell: it.cell, text, color: e.kind === 'core' ? colors.cyan : colors.amber });
      }
      if (e.type === 'unlock') out.push({ id: `${seq}fu`, cell: e.at, text: 'Unlocked', color: colors.gold });
      if (e.type === 'checkpoint') out.push({ id: `${seq}fc`, cell: e.at, text: 'Checkpoint', color: colors.success });
      if (e.type === 'shielded') out.push({ id: `${seq}fs`, cell: e.at, text: 'Shield!', color: '#5CC8FF' });
    }
    return out;
  }, [events, seq, reducedMotion, room, model.coresLeft]);

  const exitCell = useMemo(() => room.tiles.findIndex((t) => t.k === 'exit'), [room]);
  const rings = useMemo(() => {
    if (reducedMotion) return [];
    const out: { id: string; cell: number; color: string }[] = [];
    for (const e of events) {
      if (e.type === 'switch') out.push({ id: `${seq}rs`, cell: e.at, color: colors.cyan });
      if (e.type === 'teleport') out.push({ id: `${seq}rt`, cell: e.to, color: '#C77DFF' });
      if (e.type === 'pickup' && e.kind === 'core' && model.exitOpen && exitCell >= 0) out.push({ id: `${seq}rx`, cell: exitCell, color: theme.glow });
      if (e.type === 'win') out.push({ id: `${seq}rw`, cell: state.player, color: theme.glow });
    }
    return out;
  }, [events, seq, reducedMotion, model.exitOpen, exitCell, theme.glow, state.player]);
  const flash = reducedMotion ? undefined : events.some((e) => e.type === 'win') ? theme.glow : events.some((e) => e.type === 'death') ? colors.danger : undefined;

  // Light pools under glowing things. Rebuilt only when what glows changes.
  const glowKey = `${model.exitOpen}|${model.items.map((i) => i.index).join(',')}|${model.beams.map((b) => b.cells.join(',')).join('/')}`;
  const pools = useMemo<LightPool[]>(() => {
    const out: LightPool[] = [];
    room.tiles.forEach((t, cell) => {
      if (t.k === 'exit') out.push({ cell, color: model.exitOpen ? theme.glow : '#8A94AA', r: model.exitOpen ? 2.1 : 1.3, strength: model.exitOpen ? 0.38 : 0.12 });
      if (t.k === 'tele') out.push({ cell, color: TELE_COLORS[t.pair % TELE_COLORS.length], r: 1.3, strength: 0.22 });
      if (t.k === 'checkpoint') out.push({ cell, color: colors.success, r: 1, strength: 0.14 });
    });
    for (const { item } of model.items) out.push({ cell: item.cell, color: item.kind === 'core' ? colors.cyan : colors.amber, r: item.kind === 'core' ? 1.3 : 0.9, strength: item.kind === 'core' ? 0.26 : 0.16 });
    for (const b of model.beams) for (const c of b.cells) out.push({ cell: c, color: colors.danger, r: 0.8, strength: 0.12 });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, glowKey, theme.glow]);

  // Each room (and each fresh attempt) settles into place.
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [room.id, room.variant, reducedMotion, enter]);

  const nudge = useBumpNudge(seq, events, state.player, w, size, reducedMotion);

  const moveFrom = events.find((e): e is Extract<StepEvent, { type: 'move' }> => e.type === 'move');

  // Shake the board on death or bump.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    if (events.some((e) => e.type === 'death')) {
      shake.value = withSequence(withTiming(-6, { duration: 40 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 60 }));
    } else if (events.some((e) => e.type === 'bump')) {
      shake.value = withSequence(withTiming(-2, { duration: 30 }), withTiming(2, { duration: 40 }), withTiming(0, { duration: 30 }));
    }
  }, [seq, events, reducedMotion, shake]);
  const shakeStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + 0.8 * enter.value,
    transform: [{ translateX: shake.value }, { translateY: (1 - enter.value) * 14 }, { scale: 0.97 + 0.03 * enter.value }],
  }));

  const dead = state.status === 'dead';
  const won = state.status === 'won';

  // The echo fades out over its last few turns.
  const echoCell = state.echo !== undefined && state.echo >= 0 ? state.echo : undefined;
  const echoLeft = room.echo && room.echoTrack ? room.echoTrack.length + room.echo.linger - state.moves : 0;
  const echoOpacity = 0.55 * Math.min(1, Math.max(0.15, echoLeft / 6));

  const act = (a: Action) => {
    if (inputEnabled && onAction) onAction(a);
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(14)
    .onEnd((e) => {
      const { translationX: dx, translationY: dy } = e;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((e) => {
      const c = Math.floor(e.x / size);
      const r = Math.floor(e.y / size);
      if (c < 0 || r < 0 || c >= w || r >= room.height) return;
      const d = dirBetween(w, state.player, r * w + c);
      if (d) act(d);
    });
  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ width: w * size, height: room.height * size }, shakeStyle]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Room grid, ${room.width} by ${room.height}. Swipe or use the arrow buttons to move.`}
      >
        {terrain}
        <Lighting id={`${room.id}${room.variant ?? ''}`} w={w} h={room.height} size={size} pools={pools} layer="pools" />
        {model.tiles.map((v) =>
          v.tile.k === 'floor' || v.tile.k === 'wall' || v.tile.k === 'pit' || v.tile.k === 'crumble' ? null : (
            <View key={`f${v.cell}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, v.cell) * size, top: rowOf(w, v.cell) * size, width: size, height: size, zIndex: 1 }]}>
              <Feature v={v} size={size} theme={theme} reduced={reducedMotion} exitOpen={model.exitOpen} exitStyle={exitStyle} coresLeft={model.coresLeft} reached={checkpointCell === v.cell} />
            </View>
          ),
        )}
        {openingCells?.map((c) => (
          <View key={`open${room.id}${c}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, c) * size, top: rowOf(w, c) * size, zIndex: 1 }]}>
            <ShiftWall size={size} closed={false} t={theme} reduced={reducedMotion} from={{ closed: true, delay: 700 }} />
          </View>
        ))}
        {clues?.map((c) =>
          c.uv ? null : (
            <View key={`clue${c.id}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, c.cell) * size, top: rowOf(w, c.cell) * size, width: size, height: size, zIndex: 2 }]}>
              {c.kind === 'wall' ? (
                <WallWritingGlyph s={size} found={c.found} />
              ) : c.kind === 'sigil' ? (
                <EyeGlyph s={size} found={c.found} />
              ) : c.kind === 'object' ? (
                <View style={{ opacity: c.found ? 0.35 : 1 }}>
                  <KeyGlyph s={size} color="gold" />
                </View>
              ) : (
                <RecordingGlyph s={size} found={c.found} />
              )}
            </View>
          ),
        )}
        {model.platforms.map((p) => (
          <Mover key={`pl${p.index}`} cell={p.cell} w={w} size={size} reduced={reducedMotion} z={1}>
            <View style={{ margin: size * 0.08, flex: 1, borderRadius: 6, backgroundColor: '#3A3020', borderWidth: 2, borderColor: colors.amber }}>
              <View style={{ position: 'absolute', left: 4, right: 4, top: '45%', height: 2, backgroundColor: '#8A6A2A' }} />
            </View>
          </Mover>
        ))}
        {model.items.map(({ index, item }) => (
          <View key={`i${index}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, item.cell) * size, top: rowOf(w, item.cell) * size, width: size, height: size, zIndex: 2 }]}>
            <Shadow size={size} scale={0.6} />
            <Bob enabled={!reducedMotion} amount={size * 0.06} period={1600 + index * 170}>
              {item.kind === 'core' ? <CoreGlyph s={size} /> : item.kind === 'coin' ? <CoinGlyph s={size} /> : <KeyGlyph s={size} color={item.color ?? 'gold'} />}
            </Bob>
          </View>
        ))}
        {model.beams.map((b) => (
          <Beam key={`b${b.emitter}`} dir={b.dir} cells={b.cells} w={w} size={size} />
        ))}
        {blocks.map((b) => (
          <Mover key={`blk${b.id}`} cell={b.cell} w={w} size={size} reduced={reducedMotion} z={5}>
            <Crate size={size} />
          </Mover>
        ))}
        {hintCells?.map((c, i) => (
          <View key={`h${i}`} pointerEvents="none" style={[styles.abs, styles.center, { left: colOf(w, c) * size, top: rowOf(w, c) * size, width: size, height: size, zIndex: 6 }]}>
            <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size, borderWidth: 2, borderColor: colors.success, backgroundColor: '#4CF2A033', alignItems: 'center', justifyContent: 'center' }}>
              <Animated.Text style={{ color: colors.success, fontWeight: '800', fontSize: size * 0.22 }}>{i + 1}</Animated.Text>
            </View>
          </View>
        ))}
        {!dead &&
          !won &&
          model.drones.map((d) =>
            d.next !== d.cell ? (
              <View key={`dn${d.index}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, d.next) * size, top: rowOf(w, d.next) * size, zIndex: 6 }]}>
                <DroneNextGlyph s={size} />
              </View>
            ) : null,
          )}
        {moveFrom && trailColor !== 'transparent' && !reducedMotion && <TrailGhost cell={moveFrom.from} w={w} size={size} color={trailColor} seq={seq} />}
        {echoCell !== undefined && (
          <Mover cell={echoCell} w={w} size={size} reduced={reducedMotion} z={7}>
            <View style={{ opacity: echoOpacity }} accessible accessibilityLabel="Your echo">
              <View style={{ position: 'absolute', left: size * 0.1, top: size * 0.08, width: size * 0.8, height: size * 0.8, borderRadius: size, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.witness }} />
              <PlayerGlyph s={size} color={colors.witness} shape={String(skin.shape)} />
            </View>
          </Mover>
        )}
        <Mover cell={state.player} w={w} size={size} reduced={reducedMotion} z={8}>
          {!dead && !won && <ActorLight id="player" size={size} color={String(skin.color)} strength={dark ? 0.12 : 0.22} r={1.5} />}
          <Shadow size={size} scale={0.8} />
          <Animated.View style={[{ opacity: dead ? 0.35 : 1 }, nudge]}>
            <PlayerFx seq={seq} events={events} w={w} size={size} reduced={reducedMotion}>
              <Bob enabled={!reducedMotion && !dead} amount={size * 0.05} period={1400}>
                <PlayerGlyph s={size} color={String(skin.color)} shape={String(skin.shape)} />
              </Bob>
            </PlayerFx>
          </Animated.View>
          {shielded && <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.04, top: size * 0.02, width: size * 0.92, height: size * 0.92, borderRadius: size, borderWidth: 2, borderColor: '#5CC8FF', backgroundColor: '#5CC8FF22' }} />}
        </Mover>
        {model.drones.map((d) => (
          <Mover key={`d${d.index}`} cell={d.cell} w={w} size={size} reduced={reducedMotion} z={9}>
            <Shadow size={size} scale={0.55} />
            <Bob enabled={!reducedMotion && !frozen} amount={size * 0.08} period={900}>
              <DroneGlyph s={size} />
            </Bob>
          </Mover>
        ))}
        {bursts.map((b) => (
          <Burst key={b.id} spec={b} w={w} size={size} />
        ))}
        {rings.map((r) => (
          <Ring key={r.id} cell={r.cell} w={w} size={size} color={r.color} />
        ))}
        {floats.map((f) => (
          <FloatText key={f.id} cell={f.cell} w={w} size={size} text={f.text} color={f.color} />
        ))}
        <Lighting id={`${room.id}${room.variant ?? ''}`} w={w} h={room.height} size={size} pools={[]} layer="vignette" />
        {!reducedMotion && <Motes W={w * size} H={room.height * size} color={theme.glow} count={Math.round((w * room.height) / 6)} seed={room.index} />}
        {flash && <Flash key={`fl${seq}`} color={flash} seq={seq} />}
        <Darkness visible={!!dark} cx={(colOf(w, state.player) + 0.5) * size} cy={(rowOf(w, state.player) + 0.5) * size} w={w * size} h={room.height * size} size={size} reduced={reducedMotion} />
        {dark &&
          clues?.map((c) =>
            c.uv ? (
              <View key={`uv${c.id}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, c.cell) * size, top: rowOf(w, c.cell) * size, width: size, height: size, zIndex: 16 }]}>
                <WallWritingGlyph s={size} uv found={c.found} />
              </View>
            ) : null,
          )}
        {frozen && <View pointerEvents="none" style={[styles.abs, { left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#B8A6FF1F', borderWidth: 2, borderColor: '#B8A6FF88', zIndex: 20 }]} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
