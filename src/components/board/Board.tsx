import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { getCosmetic } from '../../config/cosmetics';
import { colOf, dirBetween, rowOf } from '../../game/grid';
import type { Action, Dir, GameState, Room, StepEvent } from '../../game/types';
import { colors } from '../../theme/theme';
import { Burst, type BurstSpec } from './Particles';
import { deriveModel, type TileView } from './derive';
import {
  BlockGlyph as BlockGlyphRaw,
  CheckpointGlyph,
  CoinGlyph as CoinGlyphRaw,
  CoreGlyph as CoreGlyphRaw,
  CrackGlyph,
  DoorGlyph,
  DroneGlyph as DroneGlyphRaw,
  DroneNextGlyph as DroneNextGlyphRaw,
  EmitterGlyph,
  ExitGlyph,
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
const BlockGlyph = memo(BlockGlyphRaw);
const CoinGlyph = memo(CoinGlyphRaw);
const CoreGlyph = memo(CoreGlyphRaw);
const DroneGlyph = memo(DroneGlyphRaw);
const DroneNextGlyph = memo(DroneNextGlyphRaw);
const KeyGlyph = memo(KeyGlyphRaw);
const PlayerGlyph = memo(PlayerGlyphRaw);

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
}

const MOVE_MS = 110;

function themeLook(id: string) {
  const l = getCosmetic(id)?.look ?? {};
  return {
    floor: String(l.floor ?? '#121826'),
    floorAlt: String(l.floorAlt ?? '#151C2C'),
    wall: String(l.wall ?? '#262F45'),
    wallEdge: String(l.wallEdge ?? '#3A4766'),
  };
}

// ---- Static terrain ----------------------------------------------------------------------

const TerrainTile = memo(function TerrainTile({
  v,
  size,
  x,
  y,
  t,
  pattern,
  alt,
}: {
  v: TileView;
  size: number;
  x: number;
  y: number;
  t: ReturnType<typeof themeLook>;
  pattern: string;
  alt: boolean;
}) {
  const k = v.tile.k;
  const base = { position: 'absolute' as const, left: x, top: y, width: size, height: size };
  if (k === 'wall') {
    return <View style={[base, { backgroundColor: t.wall, borderTopWidth: 3, borderTopColor: t.wallEdge, borderRadius: 2 }]} />;
  }
  if (k === 'pit') {
    return (
      <View style={[base, { backgroundColor: '#020306' }]}>
        <View style={{ position: 'absolute', left: 3, right: 3, top: 3, bottom: 3, borderRadius: 4, borderWidth: 1, borderColor: '#10141F' }} />
      </View>
    );
  }
  return (
    <View style={[base, { backgroundColor: alt ? t.floorAlt : t.floor, borderWidth: StyleSheet.hairlineWidth, borderColor: '#0A0E17' }]}>
      {pattern === 'grid' && <View style={{ position: 'absolute', left: size * 0.2, right: size * 0.2, top: size * 0.2, bottom: size * 0.2, borderWidth: 1, borderColor: '#ffffff0d', borderRadius: 3 }} />}
      {pattern === 'dots' &&
        [0.2, 0.8].flatMap((a) =>
          [0.2, 0.8].map((b) => (
            <View key={`${a}${b}`} style={{ position: 'absolute', left: size * a - 1.5, top: size * b - 1.5, width: 3, height: 3, borderRadius: 2, backgroundColor: '#ffffff14' }} />
          )),
        )}
      {k === 'crumble' && <CrackGlyph s={size} />}
    </View>
  );
});

// ---- Dynamic features ----------------------------------------------------------------------

interface FeatureProps {
  v: TileView;
  size: number;
  exitOpen: boolean;
  exitStyle: string;
  coresLeft: number;
  reached: boolean;
}

const Feature = memo(function Feature({
  v,
  size,
  exitOpen,
  exitStyle,
  coresLeft,
  reached,
}: FeatureProps) {
  const t = v.tile;
  switch (t.k) {
    case 'exit':
      return <ExitGlyph s={size} open={exitOpen} style={exitStyle} coresLeft={coresLeft} />;
    case 'spikes':
      return <SpikesGlyph s={size} raised={!!v.raised} warning={v.warning} />;
    case 'door':
      return <DoorGlyph s={size} closed={!!v.active} invert={t.invert} ch={t.ch} />;
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

export function Board({ room, state, events, seq, cell: size, look, reducedMotion, hintCells, checkpointCell, onAction, inputEnabled }: Props) {
  const w = room.width;
  const model = useMemo(() => deriveModel(room, state), [room, state]);
  const theme = useMemo(() => themeLook(look.theme), [look.theme]);
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
          v={v}
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
    }
    return out;
  }, [events, seq, reducedMotion, room, state.player, look.victory]);

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
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const dead = state.status === 'dead';
  const won = state.status === 'won';

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
        {model.tiles.map((v) =>
          v.tile.k === 'floor' || v.tile.k === 'wall' || v.tile.k === 'pit' || v.tile.k === 'crumble' ? null : (
            <View key={`f${v.cell}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, v.cell) * size, top: rowOf(w, v.cell) * size, width: size, height: size, zIndex: 1 }]}>
              <Feature v={v} size={size} exitOpen={model.exitOpen} exitStyle={exitStyle} coresLeft={model.coresLeft} reached={checkpointCell === v.cell} />
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
          <View key={`i${index}`} pointerEvents="none" style={[styles.abs, { left: colOf(w, item.cell) * size, top: rowOf(w, item.cell) * size, zIndex: 2 }]}>
            {item.kind === 'core' ? <CoreGlyph s={size} /> : item.kind === 'coin' ? <CoinGlyph s={size} /> : <KeyGlyph s={size} color={item.color ?? 'gold'} />}
          </View>
        ))}
        {model.beams.map((b) => (
          <Beam key={`b${b.emitter}`} dir={b.dir} cells={b.cells} w={w} size={size} />
        ))}
        {blocks.map((b) => (
          <Mover key={`blk${b.id}`} cell={b.cell} w={w} size={size} reduced={reducedMotion} z={5}>
            <BlockGlyph s={size} />
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
        <Mover cell={state.player} w={w} size={size} reduced={reducedMotion} z={8}>
          <View style={{ opacity: dead ? 0.35 : 1 }}>
            <PlayerGlyph s={size} color={String(skin.color)} shape={String(skin.shape)} />
          </View>
        </Mover>
        {model.drones.map((d) => (
          <Mover key={`d${d.index}`} cell={d.cell} w={w} size={size} reduced={reducedMotion} z={9}>
            <DroneGlyph s={size} />
          </Mover>
        ))}
        {bursts.map((b) => (
          <Burst key={b.id} spec={b} w={w} size={size} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
