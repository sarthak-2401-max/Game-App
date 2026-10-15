import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

export type IconName =
  | 'pause' | 'undo' | 'restart' | 'hint' | 'wait' | 'up' | 'down' | 'left' | 'right' | 'gear' | 'back'
  | 'lock' | 'check' | 'star' | 'gift' | 'calendar' | 'trophy' | 'play' | 'grid' | 'video' | 'close'
  | 'coin' | 'shield' | 'flame' | 'sound' | 'music' | 'vibrate' | 'motion' | 'info'
  | 'compass' | 'bolt' | 'snow' | 'book' | 'cart';

// Icons are decorative: the surrounding control carries the accessible label.
// react-native-svg passes props straight to the DOM on web, so use the web attribute there.
const HIDDEN = (Platform.OS === 'web'
  ? { 'aria-hidden': true }
  : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }) as object;

export function Icon({ name, size = 22, color = '#E8EEF9' }: { name: IconName; size?: number; color?: string }) {
  const s = size;
  const sw = Math.max(1.8, s / 11);
  const p = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const arrow = (rot: number) => (
    <G transform={`rotate(${rot} ${s / 2} ${s / 2})`}>
      <Polygon points={`${s / 2},${s * 0.2} ${s * 0.82},${s * 0.62} ${s * 0.18},${s * 0.62}`} fill={color} />
    </G>
  );
  const body = (() => {
    switch (name) {
      case 'pause':
        return (
          <G>
            <Rect x={s * 0.28} y={s * 0.22} width={s * 0.14} height={s * 0.56} rx={2} fill={color} />
            <Rect x={s * 0.58} y={s * 0.22} width={s * 0.14} height={s * 0.56} rx={2} fill={color} />
          </G>
        );
      case 'undo':
        return <Path d={`M ${s * 0.3} ${s * 0.4} H ${s * 0.62} A ${s * 0.2} ${s * 0.2} 0 0 1 ${s * 0.62} ${s * 0.8} H ${s * 0.4} M ${s * 0.4} ${s * 0.25} L ${s * 0.25} ${s * 0.4} L ${s * 0.4} ${s * 0.55}`} {...p} />;
      case 'restart':
        return <Path d={`M ${s * 0.75} ${s * 0.5} A ${s * 0.25} ${s * 0.25} 0 1 1 ${s * 0.62} ${s * 0.28} M ${s * 0.6} ${s * 0.14} L ${s * 0.64} ${s * 0.3} L ${s * 0.48} ${s * 0.34}`} {...p} />;
      case 'hint':
        return (
          <G>
            <Path d={`M ${s * 0.38} ${s * 0.68} C ${s * 0.38} ${s * 0.55} ${s * 0.26} ${s * 0.5} ${s * 0.26} ${s * 0.38} A ${s * 0.24} ${s * 0.24} 0 0 1 ${s * 0.74} ${s * 0.38} C ${s * 0.74} ${s * 0.5} ${s * 0.62} ${s * 0.55} ${s * 0.62} ${s * 0.68} Z`} {...p} />
            <Line x1={s * 0.4} y1={s * 0.82} x2={s * 0.6} y2={s * 0.82} {...p} />
          </G>
        );
      case 'wait':
        return (
          <G>
            <Circle cx={s / 2} cy={s / 2} r={s * 0.32} {...p} />
            <Path d={`M ${s / 2} ${s * 0.3} V ${s / 2} L ${s * 0.64} ${s * 0.6}`} {...p} />
          </G>
        );
      case 'up':
        return arrow(0);
      case 'right':
        return arrow(90);
      case 'down':
        return arrow(180);
      case 'left':
        return arrow(270);
      case 'gear':
        return (
          <G>
            <Circle cx={s / 2} cy={s / 2} r={s * 0.14} {...p} />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (Math.PI / 4) * i;
              return <Line key={i} x1={s / 2 + Math.cos(a) * s * 0.24} y1={s / 2 + Math.sin(a) * s * 0.24} x2={s / 2 + Math.cos(a) * s * 0.36} y2={s / 2 + Math.sin(a) * s * 0.36} {...p} />;
            })}
            <Circle cx={s / 2} cy={s / 2} r={s * 0.25} {...p} />
          </G>
        );
      case 'back':
        return <Path d={`M ${s * 0.62} ${s * 0.22} L ${s * 0.34} ${s / 2} L ${s * 0.62} ${s * 0.78}`} {...p} />;
      case 'close':
        return <Path d={`M ${s * 0.28} ${s * 0.28} L ${s * 0.72} ${s * 0.72} M ${s * 0.72} ${s * 0.28} L ${s * 0.28} ${s * 0.72}`} {...p} />;
      case 'lock':
        return (
          <G>
            <Path d={`M ${s * 0.34} ${s * 0.46} V ${s * 0.34} A ${s * 0.16} ${s * 0.16} 0 0 1 ${s * 0.66} ${s * 0.34} V ${s * 0.46}`} {...p} />
            <Rect x={s * 0.26} y={s * 0.46} width={s * 0.48} height={s * 0.34} rx={3} fill={color} />
          </G>
        );
      case 'check':
        return <Path d={`M ${s * 0.24} ${s * 0.52} L ${s * 0.42} ${s * 0.7} L ${s * 0.76} ${s * 0.3}`} {...p} />;
      case 'star':
        return <Polygon points={Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? s * 0.16 : s * 0.36; const a = (Math.PI / 5) * i - Math.PI / 2; return `${s / 2 + r * Math.cos(a)},${s / 2 + r * Math.sin(a)}`; }).join(' ')} fill={color} />;
      case 'gift':
        return (
          <G>
            <Rect x={s * 0.2} y={s * 0.4} width={s * 0.6} height={s * 0.4} rx={2} {...p} />
            <Rect x={s * 0.16} y={s * 0.3} width={s * 0.68} height={s * 0.12} rx={2} {...p} />
            <Line x1={s / 2} y1={s * 0.3} x2={s / 2} y2={s * 0.8} {...p} />
            <Path d={`M ${s / 2} ${s * 0.3} C ${s * 0.4} ${s * 0.12} ${s * 0.24} ${s * 0.2} ${s / 2} ${s * 0.3} C ${s * 0.76} ${s * 0.2} ${s * 0.6} ${s * 0.12} ${s / 2} ${s * 0.3}`} {...p} />
          </G>
        );
      case 'calendar':
        return (
          <G>
            <Rect x={s * 0.2} y={s * 0.26} width={s * 0.6} height={s * 0.54} rx={3} {...p} />
            <Line x1={s * 0.2} y1={s * 0.42} x2={s * 0.8} y2={s * 0.42} {...p} />
            <Line x1={s * 0.36} y1={s * 0.18} x2={s * 0.36} y2={s * 0.32} {...p} />
            <Line x1={s * 0.64} y1={s * 0.18} x2={s * 0.64} y2={s * 0.32} {...p} />
          </G>
        );
      case 'trophy':
        return (
          <G>
            <Path d={`M ${s * 0.32} ${s * 0.2} H ${s * 0.68} V ${s * 0.4} A ${s * 0.18} ${s * 0.18} 0 0 1 ${s * 0.32} ${s * 0.4} Z`} {...p} />
            <Path d={`M ${s * 0.32} ${s * 0.26} H ${s * 0.2} A ${s * 0.1} ${s * 0.1} 0 0 0 ${s * 0.32} ${s * 0.44} M ${s * 0.68} ${s * 0.26} H ${s * 0.8} A ${s * 0.1} ${s * 0.1} 0 0 1 ${s * 0.68} ${s * 0.44}`} {...p} />
            <Line x1={s / 2} y1={s * 0.58} x2={s / 2} y2={s * 0.74} {...p} />
            <Line x1={s * 0.36} y1={s * 0.78} x2={s * 0.64} y2={s * 0.78} {...p} />
          </G>
        );
      case 'play':
        return <Polygon points={`${s * 0.34},${s * 0.22} ${s * 0.78},${s / 2} ${s * 0.34},${s * 0.78}`} fill={color} />;
      case 'grid':
        return (
          <G>
            {[0, 1].flatMap((r) => [0, 1].map((c) => <Rect key={`${r}${c}`} x={s * (0.22 + c * 0.3)} y={s * (0.22 + r * 0.3)} width={s * 0.24} height={s * 0.24} rx={2} {...p} />))}
          </G>
        );
      case 'video':
        return (
          <G>
            <Rect x={s * 0.14} y={s * 0.3} width={s * 0.5} height={s * 0.4} rx={3} {...p} />
            <Polygon points={`${s * 0.66},${s * 0.44} ${s * 0.86},${s * 0.32} ${s * 0.86},${s * 0.68} ${s * 0.66},${s * 0.56}`} fill={color} />
          </G>
        );
      case 'coin':
        return (
          <G>
            <Circle cx={s / 2} cy={s / 2} r={s * 0.34} fill="#FFB547" stroke="#FFE2A8" strokeWidth={1.5} />
            <Circle cx={s / 2} cy={s / 2} r={s * 0.18} fill="none" stroke="#9A6412" strokeWidth={1.8} />
          </G>
        );
      case 'shield':
        return <Path d={`M ${s / 2} ${s * 0.16} L ${s * 0.78} ${s * 0.28} V ${s * 0.5} C ${s * 0.78} ${s * 0.68} ${s * 0.64} ${s * 0.78} ${s / 2} ${s * 0.86} C ${s * 0.36} ${s * 0.78} ${s * 0.22} ${s * 0.68} ${s * 0.22} ${s * 0.5} V ${s * 0.28} Z`} {...p} />;
      case 'compass':
        return (
          <G>
            <Circle cx={s / 2} cy={s / 2} r={s * 0.34} {...p} />
            <Polygon points={`${s * 0.62},${s * 0.38} ${s * 0.44},${s * 0.44} ${s * 0.38},${s * 0.62} ${s * 0.56},${s * 0.56}`} fill={color} />
          </G>
        );
      case 'bolt':
        return <Polygon points={`${s * 0.56},${s * 0.12} ${s * 0.26},${s * 0.56} ${s * 0.48},${s * 0.56} ${s * 0.42},${s * 0.88} ${s * 0.74},${s * 0.42} ${s * 0.52},${s * 0.42}`} fill={color} />;
      case 'snow':
        return (
          <G>
            {[0, 60, 120].map((r) => (
              <G key={r} transform={`rotate(${r} ${s / 2} ${s / 2})`}>
                <Line x1={s / 2} y1={s * 0.14} x2={s / 2} y2={s * 0.86} {...p} />
                <Line x1={s * 0.4} y1={s * 0.22} x2={s / 2} y2={s * 0.3} {...p} />
                <Line x1={s * 0.6} y1={s * 0.22} x2={s / 2} y2={s * 0.3} {...p} />
              </G>
            ))}
          </G>
        );
      case 'book':
        return <Path d={`M ${s / 2} ${s * 0.28} C ${s * 0.4} ${s * 0.2} ${s * 0.26} ${s * 0.2} ${s * 0.16} ${s * 0.24} V ${s * 0.78} C ${s * 0.26} ${s * 0.74} ${s * 0.4} ${s * 0.74} ${s / 2} ${s * 0.82} C ${s * 0.6} ${s * 0.74} ${s * 0.74} ${s * 0.74} ${s * 0.84} ${s * 0.78} V ${s * 0.24} C ${s * 0.74} ${s * 0.2} ${s * 0.6} ${s * 0.2} ${s / 2} ${s * 0.28} Z M ${s / 2} ${s * 0.28} V ${s * 0.82}`} {...p} />;
      case 'cart':
        return (
          <G>
            <Path d={`M ${s * 0.12} ${s * 0.2} H ${s * 0.24} L ${s * 0.34} ${s * 0.64} H ${s * 0.78} L ${s * 0.86} ${s * 0.32} H ${s * 0.28}`} {...p} />
            <Circle cx={s * 0.4} cy={s * 0.8} r={s * 0.06} fill={color} />
            <Circle cx={s * 0.72} cy={s * 0.8} r={s * 0.06} fill={color} />
          </G>
        );
      case 'flame':
        return <Path d={`M ${s / 2} ${s * 0.14} C ${s * 0.7} ${s * 0.36} ${s * 0.78} ${s * 0.5} ${s * 0.72} ${s * 0.66} A ${s * 0.24} ${s * 0.24} 0 0 1 ${s * 0.28} ${s * 0.66} C ${s * 0.24} ${s * 0.52} ${s * 0.34} ${s * 0.44} ${s * 0.4} ${s * 0.38} C ${s * 0.42} ${s * 0.5} ${s * 0.5} ${s * 0.52} ${s * 0.52} ${s * 0.46} C ${s * 0.56} ${s * 0.36} ${s * 0.5} ${s * 0.24} ${s / 2} ${s * 0.14} Z`} fill={color} />;
      case 'sound':
        return (
          <G>
            <Polygon points={`${s * 0.18},${s * 0.4} ${s * 0.34},${s * 0.4} ${s * 0.52},${s * 0.24} ${s * 0.52},${s * 0.76} ${s * 0.34},${s * 0.6} ${s * 0.18},${s * 0.6}`} fill={color} />
            <Path d={`M ${s * 0.64} ${s * 0.36} A ${s * 0.18} ${s * 0.18} 0 0 1 ${s * 0.64} ${s * 0.64}`} {...p} />
          </G>
        );
      case 'music':
        return (
          <G>
            <Path d={`M ${s * 0.4} ${s * 0.7} V ${s * 0.24} L ${s * 0.76} ${s * 0.18} V ${s * 0.62}`} {...p} />
            <Circle cx={s * 0.32} cy={s * 0.7} r={s * 0.09} fill={color} />
            <Circle cx={s * 0.68} cy={s * 0.62} r={s * 0.09} fill={color} />
          </G>
        );
      case 'vibrate':
        return (
          <G>
            <Rect x={s * 0.34} y={s * 0.2} width={s * 0.32} height={s * 0.6} rx={4} {...p} />
            <Line x1={s * 0.2} y1={s * 0.36} x2={s * 0.2} y2={s * 0.64} {...p} />
            <Line x1={s * 0.8} y1={s * 0.36} x2={s * 0.8} y2={s * 0.64} {...p} />
          </G>
        );
      case 'motion':
        return <Path d={`M ${s * 0.18} ${s * 0.5} C ${s * 0.32} ${s * 0.3} ${s * 0.44} ${s * 0.3} ${s / 2} ${s * 0.5} C ${s * 0.56} ${s * 0.7} ${s * 0.68} ${s * 0.7} ${s * 0.82} ${s * 0.5}`} {...p} />;
      case 'info':
        return (
          <G>
            <Circle cx={s / 2} cy={s / 2} r={s * 0.34} {...p} />
            <Line x1={s / 2} y1={s * 0.46} x2={s / 2} y2={s * 0.68} {...p} />
            <Circle cx={s / 2} cy={s * 0.34} r={sw * 0.7} fill={color} />
          </G>
        );
    }
  })();
  return (
    <Svg width={s} height={s} {...HIDDEN}>
      {body}
    </Svg>
  );
}
