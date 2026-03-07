import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Asset } from "expo-asset";
import * as THREE from "three";

export type PotType = 'PotStandard' | 'PotB' | 'PotEgg';

type Props = {
    source?: any;
    potType?: PotType;
    scale?: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
};

import { PlantAssets } from "../assets";

export default function PotModel({
    source,
    potType = 'PotStandard',
    scale = 1,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}: Props) {
    // Determine source: provided source > potType from assets > default
    const activeSource = source || PlantAssets[potType] || PlantAssets.PotStandard;

    const uri = useMemo(() => {
        return Asset.fromModule(activeSource).uri;
    }, [activeSource]);

    if (!uri) return null;

    return <PotGLB uri={uri} position={position} rotation={rotation} scale={scale} />;
}

function PotGLB({ uri, position, rotation, scale }: { uri: string, position: any, rotation: any, scale: any }) {
    const gltf = useGLTF(uri);

    useMemo(() => {
        gltf.scene.traverse((obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
        });
    }, [gltf]);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <primitive object={gltf.scene} />
        </group>
    );
}

// --- Preload pot GLBs at module level ---
try {
    [PlantAssets.PotStandard, PlantAssets.PotB, PlantAssets.PotEgg].forEach(asset => {
        try {
            const uri = Asset.fromModule(asset)?.uri;
            if (uri) useGLTF.preload(uri);
        } catch (e) { /* ignore */ }
    });
} catch (e) { /* ignore preload errors */ }
