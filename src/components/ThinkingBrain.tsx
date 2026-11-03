import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useTheme } from '../lib/theme-context';
import { space } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Nœuds du réseau de neurones (positions dans un repère 100x100).
const NODES: { x: number; y: number; delay: number }[] = [
  { x: 50, y: 16, delay: 0 },
  { x: 26, y: 32, delay: 160 },
  { x: 74, y: 32, delay: 320 },
  { x: 38, y: 54, delay: 480 },
  { x: 62, y: 54, delay: 640 },
  { x: 50, y: 78, delay: 800 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 4], [2, 3], [0, 3], [0, 4],
];

function Neuron({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    r: 2.6 + pulse.value * 2.2,
    opacity: 0.35 + pulse.value * 0.65,
  }));

  return (
    <AnimatedCircle
      cx={x * 2.4}
      cy={y * 2.4}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

export function ThinkingBrain({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <Svg width={96} height={96} viewBox="0 0 240 240">
        {/* Contour stylisé d'un cerveau */}
        <Path
          d="M120 34c-18 0-30 8-36 20-14 2-24 14-24 28 0 8 3 15 8 20-2 5-3 10-3 15 0 16 13 29 29 29h52c16 0 29-13 29-29 0-5-1-10-3-15 5-5 8-12 8-20 0-14-10-26-24-28-6-12-18-20-36-20z"
          stroke={theme.border}
          strokeWidth={3}
          fill="none"
        />
        {/* Axe central */}
        <Path d="M120 40v164" stroke={theme.border} strokeWidth={2} fill="none" />
        {/* Réseau de neurones */}
        <G>
          {EDGES.map(([a, b], i) => (
            <Path
              key={i}
              d={`M${NODES[a].x * 2.4} ${NODES[a].y * 2.4}L${NODES[b].x * 2.4} ${NODES[b].y * 2.4}`}
              stroke={theme.accent}
              strokeWidth={1}
              opacity={0.18}
              fill="none"
            />
          ))}
          {NODES.map((n, i) => (
            <Neuron key={i} x={n.x} y={n.y} delay={n.delay} color={theme.accent} />
          ))}
        </G>
      </Svg>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  label: { fontSize: 14 },
});
