import React, { Suspense, useRef } from "react";
import { View } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import PotModel, { PotType } from "./PotModel";
import ProceduralPlant, { PlantStyle, PlantConfig } from "./ProceduralPlant";
import LSystemPlant3D, { LSystemConfig } from "./LSystemPlant3D";

export type PlantMode = "procedural" | "lsystem";

type Props = {
    seed: number;
    potSource?: any;
    potType?: PotType;
    plantStyle?: PlantStyle;
    plantConfig?: Partial<PlantConfig>;
    mode?: PlantMode;
    lsystemConfig?: Partial<LSystemConfig>;
};

function RotatingScene({
    seed,
    potSource,
    potType,
    plantStyle,
    plantConfig,
    mode,
    lsystemConfig,
}: {
    seed: number;
    potSource?: any;
    potType?: PotType;
    plantStyle: PlantStyle;
    plantConfig?: Partial<PlantConfig>;
    mode: PlantMode;
    lsystemConfig?: Partial<LSystemConfig>;
}) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <group ref={groupRef}>
            <PotModel
                source={potSource}
                potType={potType}
                scale={1}
                position={[0, -0.25, 0]}
                rotation={[0, 0, 0]}
            />
            <group position={[0, -0.02, 0]}>
                {mode === "lsystem" ? (
                    <LSystemPlant3D seed={seed} config={lsystemConfig} />
                ) : (
                    <ProceduralPlant seed={seed} style={plantStyle} config={plantConfig} />
                )}
            </group>
        </group>
    );
}

export default function PlantPotPreview({
    seed,
    potSource,
    potType,
    plantStyle = "rosette",
    plantConfig,
    mode = "procedural",
    lsystemConfig,
}: Props) {
    return (
        <View style={{ flex: 1 }}>
            <Canvas
                dpr={[1, 2]}
                camera={{ position: [0.65, 0.65, 1.05], fov: 45, near: 0.01, far: 50 }}
            >
                <ambientLight intensity={0.65} />
                <directionalLight position={[3, 5, 2]} intensity={1.15} />

                <Suspense fallback={null}>
                    <RotatingScene
                        seed={seed}
                        potSource={potSource}
                        potType={potType}
                        plantStyle={plantStyle}
                        plantConfig={plantConfig}
                        mode={mode}
                        lsystemConfig={lsystemConfig}
                    />
                    <Environment preset="studio" />
                </Suspense>
            </Canvas>
        </View>
    );
}
