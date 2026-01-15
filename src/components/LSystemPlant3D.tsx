import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { Asset } from "expo-asset";
import { mulberry32 } from "../utils/rng";

// --- Types ---
export type LSystemConfig = {
    axiom: string;
    rules: Record<string, string>;
    iterations: number;
    angle: number;
    length: number;
    lengthScale: number;
    thickness: number;
    thicknessScale: number;
    hue: number;
    saturation: number;
    lightness: number;
    leafSize: number;
    leafHue: number;
    bloomSize: number;
    bloomHue: number;
    chaos: number;
    leafChance: number;
    bloomChance: number;
};

// --- Config & Presets ---
export const PRESETS: Record<string, Partial<LSystemConfig>> = {
    classic: {
        axiom: "F",
        rules: { F: "F[+F]F[-F]F" },
        angle: 25,
        hue: 0.08,
        leafChance: 0.35,
        bloomChance: 0.08,
    }
};

export const DEFAULT_LSYSTEM_CONFIG: LSystemConfig = {
    axiom: PRESETS.classic.axiom!,
    rules: PRESETS.classic.rules!,
    iterations: 4,
    angle: 25,
    length: 0.08,
    lengthScale: 0.75,
    thickness: 0.015,
    thicknessScale: 0.75,
    hue: 0.08,
    saturation: 0.5,
    lightness: 0.35,
    leafSize: 0.04,
    leafHue: 0.33,
    bloomSize: 0.06,
    bloomHue: 0.9,
    chaos: 0.15,
    leafChance: 0.35,
    bloomChance: 0.08,
};

type Props = {
    seed: number;
    growth?: number; // 0-100 scale
    config?: Partial<LSystemConfig>;
};

// --- Asset Data Helper ---
import { PlantAssets } from "../assets";

// --- Asset Data Helper ---
function usePlantGLBParts() {
    const assets = [
        PlantAssets.Leaf,
        PlantAssets.Flower,
        PlantAssets.FlowerA,
        PlantAssets.FlowerB,
        PlantAssets.FlowerPetal,
        PlantAssets.FlowerPetalB,
    ];

    // Get URIs, filtering out any that might be invalid
    const uris = assets
        .map(a => {
            try {
                const asset = Asset.fromModule(a);
                return asset?.uri || null;
            } catch (e) {
                console.warn('[usePlantGLBParts] Failed to load asset:', e);
                return null;
            }
        })
        .filter((uri): uri is string => uri !== null && uri !== undefined);

    // Only call useGLTF if we have valid URIs
    const gltfs = uris.length > 0 ? useGLTF(uris) : [];

    // Helper to extract geometry
    const getGeo = (gltf: any) => {
        if (!gltf || !gltf.nodes) return null;
        const key = Object.keys(gltf.nodes).find((k) => gltf.nodes[k]?.geometry);
        return key ? gltf.nodes[key].geometry : null;
    };

    // Map back to expected structure (first is leaf, rest are flowers)
    const leafGeo = gltfs.length > 0 ? getGeo(gltfs[0]) : null;
    const flowerGeos = gltfs.slice(1).map(g => getGeo(g)).filter(Boolean) as THREE.BufferGeometry[];

    return {
        leafGeo,
        flowerGeos,
    };
}

// --- Geometry Normalization ---
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

// --- L-System Logic ---
function expandLSystem(axiom: string, rules: Record<string, string>, iterations: number): string {
    let result = axiom;
    for (let i = 0; i < iterations; i++) {
        let next = "";
        for (const char of result) {
            next += rules[char] ?? char;
        }
        result = next;
    }
    return result;
}

interface TurtleState {
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    up: THREE.Vector3;
    length: number;
    thickness: number;
}

// --- Generic Component for robust updates ---
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

    React.useLayoutEffect(() => {
        if (meshRef.current && data.length > 0) {
            data.forEach((d, i) => {
                meshRef.current!.setMatrixAt(i, d.matrix);
                meshRef.current!.setColorAt(i, d.color);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [geo, data, mat]); // Re-run if geo, data, or mat changes.

    if (data.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[geo, mat, data.length]} />
    );
}

export default function LSystemPlant3D({ seed, growth = 50, config }: Props) {
    const { leafGeo, flowerGeos } = usePlantGLBParts();

    const rng = useMemo(() => mulberry32(seed), [seed]);

    // --- Growth System ---
    // Map growth (0-100) to plant parameters
    const growthConfig = useMemo(() => {
        const g = Math.max(0, Math.min(100, growth)); // Clamp 0-100
        const t = g / 100; // Normalized 0-1

        return {
            iterations: 1 + Math.floor(t * 4),
            // Smaller plant overall
            length: 0.008 + t * 0.08,
            thickness: 0.002 + t * 0.015,
            leafSize: 0.004 + t * 0.035,
            leafChance: t > 0.2 ? (t - 0.2) * 0.6 : 0,
            bloomChance: t > 0.6 ? (t - 0.6) * 0.4 : 0,
            bloomSize: 0.005 + t * 0.045,
        };
    }, [growth]);

    const cfg = useMemo(() => ({
        ...DEFAULT_LSYSTEM_CONFIG,
        ...growthConfig,
        ...config // Allow manual overrides
    }), [growthConfig, config]);

    // Normalize Geometries on mount/change
    const leafGeoN = useMemo(() => {
        // Poly Bush: Icosahedron with detail 0 (low poly)
        // Radius 0.5 => Size ~1.0
        return new THREE.IcosahedronGeometry(2, 0);
    }, []);

    // Normalize ALL flower geos
    const flowerGeosN = useMemo(() => {
        return flowerGeos.map(g => normalizeGeometry(g, 1, true));
    }, [flowerGeos]);

    // Procedural Branch Geometry (Cylinder)
    // Shifted so pivot is at the bottom (0, 0, 0) and it grows up +Y
    const branchGeoN = useMemo(() => {
        const geo = new THREE.CylinderGeometry(1, 1, 1, 5);
        geo.translate(0, 0.5, 0); // Move base to origin
        return geo;
    }, []);

    const { stemData, leafData, bloomData } = useMemo(() => {
        const stems: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
        const leaves: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
        // Blooms now need to track which geometry they use
        const blooms: { matrix: THREE.Matrix4; color: THREE.Color; geoIndex: number }[] = [];

        const str = expandLSystem(cfg.axiom, cfg.rules, cfg.iterations);
        const angleRad = (cfg.angle * Math.PI) / 180;
        const chaosAng = (cfg.chaos * cfg.angle * Math.PI) / 180;

        const stack: TurtleState[] = [];
        let state: TurtleState = {
            pos: new THREE.Vector3(0, 0, 0),
            dir: new THREE.Vector3(0, 1, 0),
            up: new THREE.Vector3(0, 0, 1),
            length: cfg.length,
            thickness: cfg.thickness,
        };

        const tmpM = new THREE.Matrix4();
        const tmpQ = new THREE.Quaternion();
        const tmpPos = new THREE.Vector3();
        const tmpScale = new THREE.Vector3();
        const yAxis = new THREE.Vector3(0, 1, 0);

        const stemBaseColor = new THREE.Color().setHSL(cfg.hue, cfg.saturation, cfg.lightness);
        const leafBaseColor = new THREE.Color().setHSL(cfg.leafHue, 0.7, 0.45);
        // Vary bloom color slightly
        const bloomBaseColor = new THREE.Color().setHSL(cfg.bloomHue, 0.8, 0.6);



        // Helper to check if we are at the tip of a branch
        // Re-triggering build check (Syntax seems correct)
        // We look ahead ignoring turns (+, -)
        // If we hit ']', or end of string, it's a tip.
        // If we hit 'F' or '[', it's not.
        const isTip = (str: string, startIdx: number) => {
            for (let j = startIdx + 1; j < str.length; j++) {
                const c = str[j];
                if (c === ']' || c === undefined) return true;
                if (c === 'F' || c === '[' || c === 'L' || c === 'B') return false;
                // Otherwise (turns), keep looking
            }
            return true;
        };

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const turnJitter = (rng() - 0.5) * chaosAng;

            switch (char) {
                case "F": {
                    const start = state.pos.clone();

                    if (cfg.chaos > 0) {
                        const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
                        state.dir.applyAxisAngle(axis, (rng() - 0.5) * chaosAng * 0.2);
                    }

                    const end = state.pos.clone().add(state.dir.clone().multiplyScalar(state.length));

                    // --- BRANCH ---
                    // For cylinder: Position at start, orient to dir, scale length
                    tmpPos.copy(start);
                    tmpQ.setFromUnitVectors(yAxis, state.dir);
                    // Thickness is X/Z scale, Length is Y scale
                    tmpScale.set(state.thickness, state.length, state.thickness);

                    tmpM.compose(tmpPos, tmpQ, tmpScale);
                    stems.push({ matrix: tmpM.clone(), color: stemBaseColor });

                    state.pos = end;

                    // --- LEAF/BUSH AT TIP ONLY ---
                    // "Make it so bushes only spawn at the end of Branches"
                    if (isTip(str, i)) {
                        tmpPos.copy(end);

                        // Orient bush somewhat randomly or aligned with branch
                        tmpQ.setFromUnitVectors(yAxis, state.dir);
                        const roll = rng() * Math.PI * 2;
                        tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, roll));

                        // Scale bush
                        const s = cfg.leafSize * 0.8; // Bump size slightly for tips
                        tmpScale.set(s, s, s);

                        tmpM.compose(tmpPos, tmpQ, tmpScale);
                        leaves.push({ matrix: tmpM.clone(), color: leafBaseColor });

                        // --- BLOOM ON BUSH ---
                        // "Blooms spawn on the bushes... take the bloom chance"
                        if (rng() < cfg.bloomChance) {
                            // Calculate bush radius (Geometry radius 2 * scale used for bush)
                            const bushScale = cfg.leafSize * 0.8;
                            const bushRadius = 2 * bushScale;

                            // Random direction for the bloom to poke out
                            const bloomDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();

                            // Position on the surface (slightly embedded maybe? multiply by 0.9 or 1.0)
                            const offset = bloomDir.clone().multiplyScalar(bushRadius);
                            tmpPos.copy(end).add(offset);

                            // Orient flower to face out from center
                            tmpQ.setFromUnitVectors(yAxis, bloomDir);
                            // Add a little random rotation around its own axis
                            tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rng() * Math.PI * 2));

                            const bs = cfg.bloomSize;
                            tmpScale.set(bs, bs, bs);

                            // Randomly pick a flower geo index for EACH bloom
                            const geoIdx = Math.floor(rng() * (flowerGeos.length || 1));

                            // Give each bloom a random color (varying hue)
                            const randomHue = rng(); // 0.0 to 1.0
                            const bloomColor = new THREE.Color().setHSL(randomHue, 0.75, 0.55);

                            tmpM.compose(tmpPos, tmpQ, tmpScale);
                            blooms.push({
                                matrix: tmpM.clone(),
                                color: bloomColor,
                                geoIndex: geoIdx
                            });
                        }
                    }

                    break;
                }
                case "+": {
                    const axis = state.up.clone();
                    state.dir.applyAxisAngle(axis, angleRad + turnJitter);
                    break;
                }
                case "-": {
                    const axis = state.up.clone();
                    state.dir.applyAxisAngle(axis, -angleRad + turnJitter);
                    break;
                }
                case "[": {
                    stack.push({
                        pos: state.pos.clone(),
                        dir: state.dir.clone(),
                        up: state.up.clone(),
                        length: state.length,
                        thickness: state.thickness,
                    });
                    state.length *= cfg.lengthScale;
                    state.thickness *= cfg.thicknessScale;
                    break;
                }
                case "]": {
                    const prev = stack.pop();
                    if (prev) state = prev;
                    break;
                }
                case "L": {
                    tmpPos.copy(state.pos);
                    tmpQ.setFromUnitVectors(yAxis, state.dir);
                    tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.3));
                    const s = cfg.leafSize;
                    tmpScale.set(s, s, s);
                    tmpM.compose(tmpPos, tmpQ, tmpScale);
                    leaves.push({ matrix: tmpM.clone(), color: leafBaseColor });
                    break;
                }
                case "B":
                case "*": {
                    tmpPos.copy(state.pos);
                    tmpQ.setFromUnitVectors(yAxis, state.dir);
                    const s = cfg.bloomSize;
                    tmpScale.set(s, s, s);

                    const geoIdx = Math.floor(rng() * (flowerGeos.length || 1));

                    tmpM.compose(tmpPos, tmpQ, tmpScale);
                    blooms.push({
                        matrix: tmpM.clone(),
                        color: bloomBaseColor,
                        geoIndex: geoIdx
                    });
                    break;
                }
                default: break;
            }
        }

        return { stemData: stems, leafData: leaves, bloomData: blooms };
    }, [seed, cfg, rng, flowerGeos.length]); // Re-run if geo count changes


    // --- Materials ---
    const stemMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(cfg.hue, cfg.saturation, cfg.lightness),
        roughness: 0.9,
        metalness: 0,
        flatShading: true
    }), [cfg]);

    const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(cfg.leafHue, 0.7, 0.45),
        roughness: 0.8,
        metalness: 0,
        flatShading: true,
        side: THREE.DoubleSide,
    }), [cfg]);

    const bloomMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(cfg.bloomHue, 0.8, 0.6),
        roughness: 0.5,
        flatShading: true,
        side: THREE.DoubleSide,
    }), [cfg]);



    if (stemData.length === 0) return null;

    // Group blooms by geometry index for rendering
    // This is slightly inefficient as we calc it every render, but okay for this scale
    const groupedBlooms = useMemo(() => {
        const groups: Record<number, typeof bloomData> = {};
        flowerGeosN.forEach((_, i) => groups[i] = []);
        bloomData.forEach(b => {
            // Fallback to 0 if index out of bounds (e.g. assets loading)
            const idx = (b.geoIndex < flowerGeosN.length) ? b.geoIndex : 0;
            if (!groups[idx]) groups[idx] = [];
            groups[idx].push(b);
        });
        return groups;
    }, [bloomData, flowerGeosN]);

    return (
        <group>
            <GenericInstancedMesh geo={branchGeoN} mat={stemMaterial} data={stemData} />
            <GenericInstancedMesh geo={leafGeoN} mat={leafMaterial} data={leafData} />

            {flowerGeosN.map((geo, index) => {
                const blooms = groupedBlooms[index] || [];
                if (blooms.length === 0) return null;
                return (
                    <GenericInstancedMesh
                        key={`bloom-${index}`}
                        geo={geo}
                        mat={bloomMaterial}
                        data={blooms}
                    />
                );
            })}
        </group>
    );
}
