// Surface materials for the room's floor and walls, so a greenhouse floor reads as moss and a
// library's walls as shelves. Plain Views only (cheap to draw, memoised with the terrain). Detail
// stays low-contrast on floors so gameplay pieces always read first.
import React from 'react';
import { View } from 'react-native';
import type { FloorMaterial, WallMaterial } from '../../game/environments';
import type { Palette } from '../../theme/chapters';
import { hashString } from '../../utils/dates';

type Look = Palette & { accent?: string };

/** Deterministic 0..1 noise per cell and channel, so a room always looks the same. */
export const noise = (seed: number, k: number) => (hashString(`${seed}:${k}`) % 1000) / 1000;

const abs = { position: 'absolute' as const };

export function FloorDetail({ m, s, t, seed, alt }: { m: FloorMaterial; s: number; t: Look; seed: number; alt: boolean }) {
  const line = Math.max(1, Math.round(s * 0.025));
  switch (m) {
    case 'grate':
      return (
        <>
          {[0.25, 0.5, 0.75].map((f) => (
            <View key={f} style={[abs, { left: s * 0.08, right: s * 0.08, top: s * f - line / 2, height: line, backgroundColor: '#00000059' }]} />
          ))}
          <View style={[abs, { left: s * 0.08, right: s * 0.08, top: s * 0.08, bottom: s * 0.08, borderWidth: line, borderColor: '#FFFFFF10' }]} />
        </>
      );
    case 'tile':
      return (
        <>
          <View style={[abs, { left: s / 2 - line / 2, top: 0, bottom: 0, width: line, backgroundColor: '#FFFFFF14' }]} />
          <View style={[abs, { top: s / 2 - line / 2, left: 0, right: 0, height: line, backgroundColor: '#FFFFFF14' }]} />
        </>
      );
    case 'checker':
      return <View style={[abs, { left: s * 0.06, right: s * 0.06, top: s * 0.06, bottom: s * 0.06, borderRadius: 2, borderWidth: line, borderColor: '#FFFFFF0F' }]} />;
    case 'carpet':
      return (
        <>
          {[0, 1, 2, 3, 4].map((k) => (
            <View key={k} style={[abs, { left: noise(seed, k) * s * 0.85, top: noise(seed, k + 9) * s * 0.85, width: s * 0.07, height: s * 0.07, borderRadius: s, backgroundColor: k % 2 ? '#FFFFFF12' : '#0000002A' }]} />
          ))}
        </>
      );
    case 'wood': {
      const off = noise(seed, 1) * 0.6 + 0.2;
      return (
        <>
          {[1 / 3, 2 / 3].map((f) => (
            <View key={f} style={[abs, { left: 0, right: 0, top: s * f - line / 2, height: line, backgroundColor: '#0000004D' }]} />
          ))}
          <View style={[abs, { left: s * off, top: 0, height: s / 3, width: line, backgroundColor: '#0000004D' }]} />
          <View style={[abs, { left: s * (1 - off), top: s / 3, height: s / 3, width: line, backgroundColor: '#0000004D' }]} />
          <View style={[abs, { left: s * ((off + 0.4) % 1), top: (s * 2) / 3, height: s / 3, width: line, backgroundColor: '#0000004D' }]} />
        </>
      );
    }
    case 'moss':
      return (
        <>
          {[0, 1, 2, 3].map((k) => {
            const r = s * (0.14 + noise(seed, k + 20) * 0.16);
            return <View key={k} style={[abs, { left: noise(seed, k) * (s - r), top: noise(seed, k + 7) * (s - r), width: r, height: r * 0.8, borderRadius: r, backgroundColor: k % 2 ? '#B8FF8A1A' : '#0000002E' }]} />;
          })}
        </>
      );
    case 'water':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: 0, bottom: 0, backgroundColor: `${t.glow}12` }]} />
          {[0, 1].map((k) => (
            <View key={k} style={[abs, { left: s * (0.12 + noise(seed, k) * 0.4), top: s * (0.28 + k * 0.38), width: s * 0.38, height: line, borderRadius: line, backgroundColor: '#FFFFFF2E' }]} />
          ))}
        </>
      );
    case 'ice':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF0A' }]} />
          <View style={[abs, { left: s * 0.1, top: s * 0.5, width: s * 0.55, height: line, backgroundColor: '#FFFFFF33', transform: [{ rotate: `${-35 + noise(seed, 3) * 30}deg` }] }]} />
          {alt && <View style={[abs, { left: s * 0.55, top: s * 0.22, width: s * 0.3, height: line, backgroundColor: '#FFFFFF26', transform: [{ rotate: '50deg' }] }]} />}
        </>
      );
    case 'neon':
      return <View style={[abs, { left: 0, right: 0, top: 0, bottom: 0, borderWidth: line, borderColor: `${t.glow}55` }]} />;
    case 'stone': {
      const cut = s * (0.35 + noise(seed, 5) * 0.3);
      return (
        <>
          <View style={[abs, { left: s * 0.04, top: s * 0.04, width: cut - s * 0.06, bottom: s * 0.04, borderRadius: 3, backgroundColor: '#FFFFFF08' }]} />
          <View style={[abs, { left: cut, top: s * 0.04, right: s * 0.04, height: s * 0.5, borderRadius: 3, backgroundColor: '#0000001F' }]} />
          <View style={[abs, { left: cut, top: s * 0.58, right: s * 0.04, bottom: s * 0.04, borderRadius: 3, backgroundColor: '#FFFFFF06' }]} />
        </>
      );
    }
    case 'hex':
      return <View style={[abs, { left: s * 0.24, top: s * 0.24, width: s * 0.52, height: s * 0.52, borderWidth: line, borderColor: '#FFFFFF14', borderRadius: s * 0.12, transform: [{ rotate: '45deg' }] }]} />;
    case 'glass':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF06' }]} />
          <View style={[abs, { left: -s * 0.1, top: s * 0.45, width: s * 1.2, height: s * 0.08, backgroundColor: '#FFFFFF0F', transform: [{ rotate: '-35deg' }] }]} />
        </>
      );
    default:
      return <View style={[abs, { left: s * 0.07, right: s * 0.07, top: s * 0.07, bottom: s * 0.07, borderRadius: 3, borderWidth: 1, borderColor: '#FFFFFF07', backgroundColor: alt ? '#FFFFFF04' : 'transparent' }]} />;
  }
}

const BOOKS = ['#FF8E72', '#FFD36E', '#4CF2C3', '#8FB8F0', '#C77DFF', '#E6F2FF'];
const BLOCKS = ['#FF6B6B', '#FFD84D', '#4CC9F0', '#7CFF6B', '#C77DFF'];

/** Texture on a wall's top face (height `top`) and its front face (height `depth`, if shown). */
export function WallDetail({ m, s, top, depth, face, t, seed }: { m: WallMaterial; s: number; top: number; depth: number; face: boolean; t: Look; seed: number }) {
  const line = Math.max(1, Math.round(s * 0.03));
  const accent = t.accent ?? t.glow;
  const faceTop = s - depth;
  const onFace = (node: React.ReactNode) => (face ? <View style={[abs, { left: 0, right: 0, top: faceTop, height: depth, overflow: 'hidden' }]}>{node}</View> : null);
  switch (m) {
    case 'lockers':
      return (
        <>
          <View style={[abs, { left: s / 2 - line / 2, top: s * 0.1, height: top - s * 0.2, width: line, backgroundColor: '#00000040' }]} />
          {[0.22, 0.72].map((x) => [0.2, 0.28, 0.36].map((y) => <View key={`${x}${y}`} style={[abs, { left: s * x, top: s * y, width: s * 0.12, height: line, backgroundColor: '#00000059' }]} />))}
          {onFace(<View style={[abs, { left: s * 0.42, width: s * 0.16, top: depth * 0.25, height: depth * 0.3, borderRadius: 2, backgroundColor: accent }]} />)}
        </>
      );
    case 'tiles':
      return (
        <>
          {[0.33, 0.66].map((f) => (
            <View key={`h${f}`} style={[abs, { left: 0, right: 0, top: top * f, height: line, backgroundColor: '#00000018' }]} />
          ))}
          {[0.33, 0.66].map((f) => (
            <View key={`v${f}`} style={[abs, { top: 0, height: top, left: s * f, width: line, backgroundColor: '#00000018' }]} />
          ))}
        </>
      );
    case 'glass':
      return (
        <>
          <View style={[abs, { left: s * 0.12, top: s * 0.1, width: s * 0.1, height: top * 0.7, backgroundColor: '#FFFFFF33', transform: [{ skewX: '-12deg' }] }]} />
          <View style={[abs, { left: s * 0.3, top: s * 0.1, width: s * 0.04, height: top * 0.55, backgroundColor: '#FFFFFF22', transform: [{ skewX: '-12deg' }] }]} />
        </>
      );
    case 'shelves':
      return (
        <>
          {[0, 1].map((row) => (
            <View key={row} style={[abs, { left: s * 0.08, right: s * 0.08, top: top * (0.14 + row * 0.42), height: top * 0.3, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }]}>
              {[0, 1, 2, 3, 4].map((k) => (
                <View key={k} style={{ flex: 1, height: `${60 + noise(seed, row * 9 + k) * 40}%`, backgroundColor: BOOKS[Math.floor(noise(seed, row * 5 + k + 40) * BOOKS.length)], opacity: 0.75 }} />
              ))}
            </View>
          ))}
        </>
      );
    case 'hedge':
      return (
        <>
          {[0, 1, 2, 3, 4].map((k) => {
            const r = s * (0.24 + noise(seed, k) * 0.16);
            return <View key={k} style={[abs, { left: noise(seed, k + 3) * (s - r), top: noise(seed, k + 11) * Math.max(1, top - r), width: r, height: r, borderRadius: r, backgroundColor: k % 2 ? '#FFFFFF1A' : '#0000002A' }]} />;
          })}
          {face && noise(seed, 30) > 0.5 && <View style={[abs, { left: s * (0.2 + noise(seed, 31) * 0.5), top: faceTop - s * 0.02, width: s * 0.08, height: depth + s * 0.12, borderRadius: s, backgroundColor: '#8BF0A0AA' }]} />}
        </>
      );
    case 'pipes':
      return (
        <>
          {[0.3, 0.62].map((f) => (
            <View key={f} style={[abs, { left: 0, right: 0, top: top * f, height: s * 0.13, borderRadius: s, backgroundColor: '#00000033', borderTopWidth: line, borderTopColor: `${t.wallEdge}88` }]} />
          ))}
          {noise(seed, 2) > 0.6 && <View style={[abs, { left: s * 0.4, top: top * 0.24, width: s * 0.2, height: s * 0.26, borderRadius: 3, backgroundColor: t.wallEdge, opacity: 0.6 }]} />}
        </>
      );
    case 'servers':
      return (
        <>
          {[0.2, 0.42, 0.64].map((f, row) => (
            <View key={f} style={[abs, { left: s * 0.12, right: s * 0.12, top: top * f, height: s * 0.12, borderRadius: 2, backgroundColor: '#00000040', flexDirection: 'row', alignItems: 'center', gap: s * 0.05, paddingHorizontal: s * 0.05 }]}>
              {[0, 1, 2].map((k) => (
                <View key={k} style={{ width: s * 0.05, height: s * 0.05, borderRadius: s, backgroundColor: noise(seed, row * 3 + k) > 0.45 ? t.glow : accent, opacity: 0.5 + noise(seed, row + k + 50) * 0.5 }} />
              ))}
            </View>
          ))}
        </>
      );
    case 'crates':
      return (
        <>
          <View style={[abs, { left: s * 0.08, right: s * 0.08, top: s * 0.08, height: top - s * 0.16, borderWidth: line, borderColor: '#00000059', borderRadius: 2 }]} />
          <View style={[abs, { left: s * 0.08, right: s * 0.08, top: top / 2 - line / 2, height: line, backgroundColor: '#00000059' }]} />
          {onFace(<View style={[abs, { left: s * 0.1, top: depth * 0.3, width: s * 0.3, height: depth * 0.35, backgroundColor: accent, opacity: 0.8 }]} />)}
        </>
      );
    case 'ice':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: 0, height: top * 0.35, backgroundColor: '#FFFFFF40', borderRadius: 4 }]} />
          {face &&
            [0.15, 0.45, 0.75].map((x, k) => (
              <View key={x} style={[abs, { left: s * x, top: s, width: 0, height: 0, borderLeftWidth: s * 0.05, borderRightWidth: s * 0.05, borderTopWidth: s * (0.1 + noise(seed, k) * 0.12), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DDF4FFCC' }]} />
            ))}
        </>
      );
    case 'neon':
      return (
        <>
          <View style={[abs, { left: s * 0.1, right: s * 0.1, top: s * 0.1, height: top - s * 0.2, borderWidth: line, borderColor: t.wallEdge, borderRadius: 3, opacity: 0.8 }]} />
          {onFace(<View style={[abs, { left: 0, right: 0, top: depth * 0.4, height: line, backgroundColor: accent }]} />)}
        </>
      );
    case 'brass':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: top * 0.45, height: s * 0.08, backgroundColor: t.wallEdge, opacity: 0.55 }]} />
          {[0.15, 0.85].map((x) => [0.2, 0.75].map((y) => <View key={`${x}${y}`} style={[abs, { left: s * x - s * 0.03, top: top * y, width: s * 0.06, height: s * 0.06, borderRadius: s, backgroundColor: t.wallEdge, opacity: 0.8 }]} />))}
        </>
      );
    case 'stone':
      return (
        <>
          <View style={[abs, { left: 0, right: 0, top: top / 2, height: line, backgroundColor: '#00000033' }]} />
          <View style={[abs, { left: s * (0.3 + noise(seed, 1) * 0.4), top: 0, height: top / 2, width: line, backgroundColor: '#00000033' }]} />
          <View style={[abs, { left: s * (0.2 + noise(seed, 2) * 0.5), top: top / 2, height: top / 2, width: line, backgroundColor: '#00000033' }]} />
          {noise(seed, 3) > 0.7 && <View style={[abs, { left: s * 0.35, top: top * 0.2, width: s * 0.3, height: s * 0.3, borderRadius: s, borderWidth: line, borderColor: t.wallEdge, opacity: 0.7 }]} />}
        </>
      );
    case 'drawings':
      // Daycare walls are stacked toy blocks in bright primaries.
      return (
        <>
          {[0, 1, 2, 3].map((k) => (
            <View key={k} style={[abs, { left: (k % 2) * (s / 2) + s * 0.04, top: Math.floor(k / 2) * (top / 2) + s * 0.04, width: s / 2 - s * 0.08, height: top / 2 - s * 0.08, borderRadius: 3, backgroundColor: BLOCKS[Math.floor(noise(seed, k) * BLOCKS.length)], opacity: 0.85 }]}>
              <View style={{ position: 'absolute', left: '30%', top: '25%', width: '40%', height: '50%', borderRadius: 2, borderWidth: 1, borderColor: '#FFFFFF66' }} />
            </View>
          ))}
        </>
      );
    default:
      // Panels: a seam and a pair of rivets.
      return (
        <>
          <View style={[abs, { left: s * 0.1, right: s * 0.1, top: top * 0.55, height: line, backgroundColor: '#00000026' }]} />
          {[0.18, 0.82].map((x) => (
            <View key={x} style={[abs, { left: s * x - s * 0.025, top: top * 0.2, width: s * 0.05, height: s * 0.05, borderRadius: s, backgroundColor: '#FFFFFF33' }]} />
          ))}
        </>
      );
  }
}
