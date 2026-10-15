// Room lighting: one static SVG per room that gives the flat grid depth. A soft key light from
// above, coloured light pools under glowing things (exit, cores, portals, armed hazards) and a
// vignette that pulls the eye to the middle. Nothing here animates, so it costs one draw per room.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface LightPool {
  cell: number;
  color: string;
  /** Radius in cells. */
  r: number;
  strength: number;
}

interface Props {
  id: string;
  w: number;
  h: number;
  size: number;
  pools: LightPool[];
  /** Light pools sit under the actors; the vignette goes on top of them. */
  layer: 'pools' | 'vignette';
}

export const Lighting = memo(function Lighting({ id, w, h, size, pools, layer }: Props) {
  const W = w * size;
  const H = h * size;
  if (layer === 'vignette') {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 14 }]}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id={`key${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.07} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
            </LinearGradient>
            <RadialGradient id={`vig${id}`} cx={W / 2} cy={H * 0.46} r={Math.max(W, H) * 0.72} gradientUnits="userSpaceOnUse">
              <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.5} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#key${id})`} />
          <Rect x={0} y={0} width={W} height={H} fill={`url(#vig${id})`} />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
      <Svg width={W} height={H}>
        <Defs>
          {pools.map((p, i) => (
            <RadialGradient key={i} id={`pool${id}${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={p.color} stopOpacity={p.strength} />
              <Stop offset="0.5" stopColor={p.color} stopOpacity={p.strength * 0.35} />
              <Stop offset="1" stopColor={p.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {pools.map((p, i) => (
          <Circle key={i} cx={((p.cell % w) + 0.5) * size} cy={(Math.floor(p.cell / w) + 0.55) * size} r={p.r * size} fill={`url(#pool${id}${i})`} />
        ))}
      </Svg>
    </View>
  );
});

/** A soft light that travels with an actor (drawn inside its Mover). */
export const ActorLight = memo(function ActorLight({ id, size, color, strength = 0.28, r = 1.6 }: { id: string; size: number; color: string; strength?: number; r?: number }) {
  const d = size * r * 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: size / 2 - d / 2, top: size * 0.55 - d / 2, width: d, height: d }}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={`al${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.45" stopColor={color} stopOpacity={strength * 0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#al${id})`} />
      </Svg>
    </View>
  );
});
