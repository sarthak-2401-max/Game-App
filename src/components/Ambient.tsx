// Soft radial light behind a screen. One SVG gradient, no animation, so it costs nothing per frame.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export function Ambient({ color, cy = 0.45, strength = 0.22 }: { color: string; cy?: number; strength?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="amb" cx="50%" cy={`${cy * 100}%`} rx="75%" ry="45%" fx="50%" fy={`${cy * 100}%`}>
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#amb)" />
      </Svg>
    </View>
  );
}
