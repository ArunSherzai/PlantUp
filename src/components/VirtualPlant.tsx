import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Path, Group, Paint, Skia, SkPath, Circle, vec } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing, useDerivedValue, interpolate } from 'react-native-reanimated';

/** ----------------------------
 *  Types & Constants
 *  ---------------------------- */
type VirtualPlantProps = {
    level: number;
    seed: number;
    width?: number;
    height?: number;
};

type PlantGeometry = {
    stemPath: SkPath;
    leaves: { x: number; y: number; dir: number; size: number }[];
    blooms: { x: number; y: number; size: number }[];
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 300;

/** ----------------------------
 *  Deterministic PRNG
 *  ---------------------------- */
function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

function degToRad(d: number) {
    return (d * Math.PI) / 180;
}

/** ----------------------------
 *  L-System Logic
 *  ---------------------------- */
function parseRules(text: string) {
    const rules = new Map<string, string>();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
        const i = line.indexOf('=');
        if (i === -1) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k.length) rules.set(k, v);
    }
    return rules;
}

function expandLSystem(axiom: string, rules: Map<string, string>, iterations: number) {
    let s = axiom;
    for (let it = 0; it < iterations; it++) {
        let out = '';
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            out += rules.get(ch) ?? ch;
            // Safety cap to prevent freezes
            if (out.length > 50000) return out;
        }
        s = out;
    }
    return s;
}

/** ----------------------------
 *  Geometry Generator
 *  ---------------------------- */
function generatePlantGeometry(
    level: number,
    seed: number,
): PlantGeometry {
    const rand = mulberry32(seed);

    // Map level to plant parameters
    // Level 1: Tiny sprout
    // Level 5: Bush
    // Level 10+: Full tree/flower
    // We'll scale iterations and complexities based on level.

    // Base parameters based on level
    // Capping iterations to avoid performance hits on mobile Skia
    const iterations = clamp(Math.floor(level / 2) + 2, 2, 5);

    // Choose preset based on seed (or just stick to one nice one for consistency)
    // For now, let's use a variation of the "Classic Bush" but tweaked
    // "F=F[+F]F[-F]F" is the classic
    // Let's add some variety based on level

    const rulesText = "F=F[+F]F[-F]F";
    const axiom = "F";
    const rules = parseRules(rulesText);

    // Expand string
    const str = expandLSystem(axiom, rules, iterations);

    // Render Parameters
    // Dynamic scale/angle based on seed & level
    const angleDeg = 20 + (rand() * 10);
    const stepLength = 10 + (rand() * 5); // Base step
    const widthVal = clamp(level * 0.5, 1, 4); // Thicker as level grows
    const shrink = 0.75;
    const chaos = 0.1;
    // const bloomChance = level >= 5 ? 0.1 : 0; // Blooms only after level 5
    const bloomChance = clamp((level - 3) * 0.05, 0, 0.2); // Blooms start slow
    const leafChance = 0.3;

    // Paths
    const stemPath = Skia.Path.Make();
    const leaves: { x: number; y: number; dir: number; size: number }[] = [];
    const blooms: { x: number; y: number; size: number }[] = [];

    // Turtle State
    let x = 0;
    let y = 0; // We'll center later
    let ang = -Math.PI / 2; // Pointing up
    let curStep = stepLength;
    let curWidth = widthVal;

    const stack: { x: number; y: number; ang: number; curStep: number; curWidth: number }[] = [];
    const baseAngle = degToRad(angleDeg);

    // Bounds tracking
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    const updateBounds = (px: number, py: number) => {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
    };

    stemPath.moveTo(x, y);

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];

        if (ch === 'F' || ch === 'f') {
            const jitter = (rand() - 0.5) * chaos * baseAngle;
            const a = ang + jitter;

            const nx = x + Math.cos(a) * curStep;
            const ny = y + Math.sin(a) * curStep;

            if (ch === 'F') {
                stemPath.lineTo(nx, ny);
                updateBounds(nx, ny);

                // Leaf chance
                if (rand() < leafChance) {
                    // Determine side
                    const side = rand() > 0.5 ? 1 : -1;
                    leaves.push({
                        x: nx,
                        y: ny,
                        dir: a + (side * Math.PI / 4),
                        size: curWidth * 4
                    });
                }

                // Bloom chance at ends (heuristic: high chance if we are at deep recursion or just lucky)
                // Simplified: random chance at any segment end, but higher if segment length is small (near top)
                if (curStep < stepLength * 0.5 && rand() < bloomChance) {
                    blooms.push({ x: nx, y: ny, size: curWidth * 5 });
                }
            } else {
                stemPath.moveTo(nx, ny);
            }

            x = nx;
            y = ny;
        } else if (ch === '+') {
            ang += baseAngle + (rand() - 0.5) * chaos * baseAngle;
        } else if (ch === '-') {
            ang -= baseAngle + (rand() - 0.5) * chaos * baseAngle;
        } else if (ch === '[') {
            stack.push({ x, y, ang, curStep, curWidth });
            curStep *= shrink;
            curWidth *= shrink;
        } else if (ch === ']') {
            const st = stack.pop();
            if (st) {
                ({ x, y, ang, curStep, curWidth } = st);
                stemPath.moveTo(x, y);
            }
        }
    }

    return { stemPath, leaves, blooms, bounds: { minX, maxX, minY, maxY } };
}

/** ----------------------------
 *  Component
 *  ---------------------------- */
export default function VirtualPlant({ level, seed, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }: VirtualPlantProps) {

    // Memoize geometry calculation
    const { stemPath, leaves, blooms, bounds } = useMemo(() => {
        return generatePlantGeometry(level, seed);
    }, [level, seed]);

    // Entrance Animation
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = 0;
        progress.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) });
    }, [level, seed]);

    // Center the plant
    // Ensure the plant fits within the given width/height with padding
    const plantWidth = bounds.maxX - bounds.minX;
    const plantHeight = bounds.maxY - bounds.minY;

    // Scale to fit (with padding)
    const padding = 20;
    const availW = width - padding * 2;
    const availH = height - padding * 2;

    // Avoid division by zero
    const scaleX = plantWidth > 0 ? availW / plantWidth : 1;
    const scaleY = plantHeight > 0 ? availH / plantHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1.5); // Cap max scale

    // Calculate transform to center
    const centerX = bounds.minX + plantWidth / 2;
    const bottomY = bounds.maxY; // We want the bottom of the plant at the bottom of the view usually? 
    // Actually L-systems start at 0,0 and grow Up (negative Y) usually.
    // In our generator, we start at 0,0 and go up (negative Y).
    // So maxY is likely 0 (root), minY is negative.

    const translateX = (width / 2) - centerX * scale;
    const translateY = (height - padding) - bottomY * scale; // Align bottom to bottom-padding

    // Derived animation paths
    const animatedStemPath = useDerivedValue(() => {
        // Basic trimming for "growth" look
        return stemPath;
    });

    // Colors
    const stemColor = "#7fa868"; // Soft green
    const leafColor = "#98c77d"; // Lighter green
    const bloomColor = "#f0a6ca"; // Pinkish

    return (
        <View style={{ width, height, overflow: 'hidden' }}>
            <Canvas style={{ flex: 1 }}>
                <Group transform={[{ translateX }, { translateY }, { scale }]}>

                    {/* Stem */}
                    <Path
                        path={stemPath}
                        color={stemColor}
                        style="stroke"
                        strokeWidth={2} // Base stroke, scaling handles visual thickness
                        strokeCap="round"
                        strokeJoin="round"
                        start={0}
                        end={progress}
                    />

                    {/* Leaves */}
                    {leaves.map((l, i) => {
                        // Delay leaf appearance based on index/progress?
                        // Simple approach: Scale them up with progress
                        return (
                            <Leaf
                                key={`leaf-${i}`}
                                x={l.x}
                                y={l.y}
                                dir={l.dir}
                                size={l.size}
                                color={leafColor}
                                progress={progress}
                                delay={i / leaves.length}
                            />
                        );
                    })}

                    {/* Blooms */}
                    {blooms.map((b, i) => (
                        <Bloom
                            key={`bloom-${i}`}
                            x={b.x}
                            y={b.y}
                            size={b.size}
                            color={bloomColor}
                            progress={progress}
                            delay={0.5 + (i / blooms.length) * 0.5}
                        />
                    ))}

                </Group>
            </Canvas>
        </View>
    );
}

/** ----------------------------
 *  Sub-Components (Shapes)
 *  ---------------------------- */
function Leaf({ x, y, dir, size, color, progress, delay }: { x: number, y: number, dir: number, size: number, color: string, progress: any, delay: number }) {

    // Animate scale based on progress
    // Only show if progress > delay (approx mapping)
    const leafScale = useDerivedValue(() => {
        if (progress.value < delay) return 0;
        return interpolate(progress.value, [delay, 1], [0, size]);
    });

    // Drawing a simple quadratic bezier leaf
    // Origin at (x,y), rotated by dir
    const path = Skia.Path.Make();
    path.moveTo(0, 0);
    path.quadTo(-0.7, 0.2, 0, 1);
    path.quadTo(0.7, 0.2, 0, 0);
    // Note: The helper drew standard size around 1.0, we scale it.

    return (
        <Group origin={{ x, y }} transform={[{ translateX: x }, { translateY: y }, { rotate: dir }, { scale: leafScale }]}>
            <Path path={path} color={color} style="fill" />
        </Group>
    );
}

function Bloom({ x, y, size, color, progress, delay }: { x: number, y: number, size: number, color: string, progress: any, delay: number }) {

    const bloomScale = useDerivedValue(() => {
        if (progress.value < delay) return 0;
        return interpolate(progress.value, [delay, 1], [0, size]);
    });

    return (
        <Group origin={{ x, y }} transform={[{ translateX: x }, { translateY: y }, { scale: bloomScale }]}>
            <Circle cx={0} cy={0} r={0.5} color={color} />
            {/* Could add petals here if needed, keeping simple circle for now */}
        </Group>
    );
}
