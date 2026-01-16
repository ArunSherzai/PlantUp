import React, { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { Asset } from "expo-asset";
import { mulberry32 } from "../utils/rng";
import { PlantAssets } from "../assets";

export type PlantStyle = "rosette" | "tuft";

export type PlantConfig = {
    leafCount: number;
    leafLength: number;
    leafWidth: number;
    bend: number;
    twist: number;
    tilt: number;
    radius: number;
    hue: number;
    saturation: number;
    lightness: number;
    hueVar: number;
    gloss: number;
};

export const DEFAULT_ROSETTE_CONFIG: PlantConfig = {
    leafCount: 30,
    leafLength: 0.22,
    leafWidth: 0.075,
    bend: 0.85,
    twist: 0.45,
    tilt: 0.45,
    radius: 0.12,
    hue: 0.31,
    saturation: 0.65,
    lightness: 0.45,
    hueVar: 0.06,
    gloss: 0.6,
};

export const DEFAULT_TUFT_CONFIG: PlantConfig = {
    leafCount: 70,
    leafLength: 0.22,
    leafWidth: 0.035,
    bend: 1.2,
    twist: 0.9,
    tilt: 0.9,
    radius: 0.1,
    hue: 0.32,
    saturation: 0.65,
    lightness: 0.45,
    hueVar: 0.08,
    gloss: 0.55,
};

type Props = {
    seed: number;
    style?: PlantStyle;
    config?: Partial<PlantConfig>;
};

// --- Helpers ---

function normalizeGeometry(geo: THREE.BufferGeometry, targetSize: number = 1, centerOffset: boolean = true) {
    if (!geo) return new THREE.BoxGeometry(1, 1, 1);
    const g = geo.clone();
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Center at origin if requested
    if (centerOffset) {
        g.translate(-center.x, -center.y, -center.z);
    }

    // Scale to target size
    const maxAxis = Math.max(size.x, size.y, size.z);
    const s = targetSize / maxAxis;
    g.scale(s, s, s);

    g.computeVertexNormals();
    return g;
}

function GenericInstancedMesh({
    geo,
    mat,
    data
}: {
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    data: { matrix: THREE.Matrix4, color: THREE.Color }[]
}) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (meshRef.current && data.length > 0) {
            data.forEach((d, i) => {
                meshRef.current!.setMatrixAt(i, d.matrix);
                meshRef.current!.setColorAt(i, d.color);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [geo, data, mat]);

    if (data.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[geo, mat, data.length]} />
    );
}

export default function ProceduralPlant({ seed, style = "rosette", config }: Props) {
    // Load Asset
    const leafUri = Asset.fromModule(PlantAssets.Leaf).uri;
    const gltf = useGLTF(leafUri);

    // Extract geometry safely
    const rawGeo = useMemo(() => {
        const key = Object.keys(gltf.nodes).find((k) => (gltf.nodes[k] as THREE.Mesh).geometry);
        return key ? (gltf.nodes[key] as THREE.Mesh).geometry : null;
    }, [gltf]);

    const rng = useMemo(() => mulberry32(seed), [seed]);

    // Merge default preset with custom config
    const preset = useMemo(() => {
        const base = style === "tuft" ? DEFAULT_TUFT_CONFIG : DEFAULT_ROSETTE_CONFIG;
        return { ...base, ...config };
    }, [style, config]);

    // Normalize geometry
    const leafGeo = useMemo(() => {
        if (!rawGeo) return new THREE.PlaneGeometry(1, 1);

        // Normalize to unit size. We'll handle shaping via instance scale.
        // We orient it so Y is up (length), doing a rotation might be needed if the model is Z-up or something.
        // Usually normalizeGeometry handles centering.
        // Let's assume the model is roughly Y-up or we adjust in matrix.
        // If the model is flat, we might want to rotate it to align with our procedural logic which expects 
        // Y as length (growth direction) and X/Z as width/thickness.
        // Let's assume standard behavior first.
        return normalizeGeometry(rawGeo, 1, true);
    }, [rawGeo]);

    const material = useMemo(() => {
        const base = new THREE.Color().setHSL(preset.hue, preset.saturation, preset.lightness);
        return new THREE.MeshStandardMaterial({
            color: base,
            roughness: 1 - preset.gloss,
            metalness: 0,
            side: THREE.DoubleSide,
        });
    }, [preset.hue, preset.saturation, preset.lightness, preset.gloss]);

    const instancedData = useMemo(() => {
        const data: { matrix: THREE.Matrix4, color: THREE.Color }[] = [];
        const goldenAngle = 2.399963229728653;
        const tmpM = new THREE.Matrix4();
        const tmpP = new THREE.Vector3();
        const tmpQ = new THREE.Quaternion();
        const tmpS = new THREE.Vector3();

        for (let i = 0; i < preset.leafCount; i++) {
            const a =
                (style === "rosette" ? i * goldenAngle : rng() * Math.PI * 2) +
                (rng() - 0.5) * 0.12;

            const r =
                preset.radius *
                (style === "rosette"
                    ? Math.sqrt((i + 1) / preset.leafCount)
                    : Math.pow(rng(), 0.6)) *
                (0.7 + rng() * 0.6);

            tmpP.set(Math.cos(a) * r, rng() * 0.01, Math.sin(a) * r);

            const yaw = a + Math.PI;
            const pitch = (0.25 + rng() * 0.55) * preset.tilt;
            const roll = (rng() - 0.5) * preset.twist;

            tmpQ.setFromEuler(new THREE.Euler(pitch, yaw, roll, "XYZ"));

            // Adjust rotation because our unit geo might be Y-up centered.
            // If the procedural logic expects the leaf to grow OUT from the center, 
            // and our geo is centered, we might need to offset it or rotate it.
            // Previous logic: g.translate(0, 0.5, 0); -> Pivot was at bottom.
            // maximizeGeometry centers it. So pivot is at center.
            // We need to move it up by 0.5 * length so pivot is at bottom.
            // BUT we can't easily change the pivot of the shared geometry without modifying it.
            // Instead, we translate in the matrix!
            // First scale, then translate relative to rotation?
            // Actually: Scale -> Translate(0, 0.5, 0) -> Rotate -> Position

            // Scale
            const lenVar = (0.75 + rng() * 0.65) * preset.leafLength;
            const widVar = (0.75 + rng() * 0.65) * preset.leafWidth;
            // Scale the unit geometry to the target dimensions
            tmpS.set(widVar, lenVar, widVar); // Uniform width/thickness? Leaf is flat?
            // If leaf is flatish, maybe Z scale should be small?
            // But let's keep it somewhat uniform for 3Dness if it has volume.

            // Compose transform

            // 1. We want pivot at bottom.
            // If normalized geometry is centered at (0,0,0) with height 1 (-0.5 to 0.5),
            // we need to push it up by 0.5 units (scaled) to make (0, -0.5, 0) the pivot?
            // Wait, if it's centered, the bottom is at -0.5. We want -0.5 to be at 0.
            // So we translate y by +0.5 before other transforms.

            // Construct matrix manually order:
            // T_pivot * S * R * T_pos

            // Easier way with threejs:
            // Make object, apply transforms, grab matrix.
            // But for perf in loop, we do math.

            // Step 1: Scale
            // Step 2: Translate Y + 0.5 (adjustment for pivot) -> In local space!
            // Actually, if we stick to the compose(pos, q, scale) method, we can't easily insert a pre-translation.
            // UNLESS the geometry itself is offset. 
            // Let's trust normalizeGeometry(..., false) ??
            // If centerOffset = false in normalizeGeometry, it preserves origin?
            // The BoxGeometry fallback is 1,1,1 centered.
            // Let's use normalizeGeometry(..., true) to center it, then try to handle pivot.
            // Or simpler: Just modify the geometry ONCE to be pivoted correctly.

            // Let's do a post-normalization translation on the geometry prop?
            // We can't in the generic component easily.
            // Let's do it in the useMemo for leafGeo!

            // ... see leafGeo memo below ...

            tmpM.compose(tmpP, tmpQ, tmpS);
            data.push({ matrix: tmpM.clone(), color: new THREE.Color() }); // Color set below

            // Color
            const h = THREE.MathUtils.euclideanModulo(
                preset.hue + (rng() - 0.5) * preset.hueVar,
                1
            );
            data[data.length - 1].color.setHSL(h, preset.saturation, preset.lightness);
        }
        return data;
    }, [preset, rng, style]);

    // Apply offset to geometry to fix pivot
    const pivotedGeo = useMemo(() => {
        if (!leafGeo) return null;
        const g = leafGeo.clone();
        // Assuming leafGeo is normalized to 1x1x1 and centered.
        // We want the bottom (-0.5y) to be at 0.
        // So we translate up by 0.5.
        g.translate(0, 0.5, 0);
        return g;
    }, [leafGeo]);

    return <GenericInstancedMesh geo={pivotedGeo || leafGeo} mat={material} data={instancedData} />;
}
