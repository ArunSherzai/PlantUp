import React, { Suspense, useRef } from "react";
import { View } from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import PotModel, { PotType } from "./PotModel";
import ProceduralPlant, { PlantStyle, PlantConfig } from "./ProceduralPlant";
import LSystemPlant3D, { LSystemConfig } from "./LSystemPlant3D";

export type PlantMode = "procedural" | "lsystem";

type Props = {
    seed: number;
    growth?: number; // 0-100 scale
    potSource?: any;
    potType?: PotType;
    plantStyle?: PlantStyle;
    plantConfig?: Partial<PlantConfig>;
    mode?: PlantMode;
    lsystemConfig?: Partial<LSystemConfig>;
    cameraY?: number;
    cameraDistance?: number;
};

// Dynamic camera controller
function CameraController({ cameraY, cameraDistance }: { cameraY: number; cameraDistance: number }) {
    const { camera } = useThree();

    useFrame(() => {
        const xz = cameraDistance * 0.7;
        camera.position.set(xz, cameraY, xz);
        camera.lookAt(0, 0.2, 0);
    });

    return null;
}

function RotatingScene({
    seed,
    growth,
    potSource,
    potType,
    plantStyle,
    plantConfig,
    mode,
    lsystemConfig,
}: {
    seed: number;
    growth?: number;
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
                    <LSystemPlant3D seed={seed} growth={growth} config={lsystemConfig} />
                ) : (
                    <ProceduralPlant seed={seed} style={plantStyle} config={plantConfig} />
                )}
            </group>
        </group>
    );
}

export default function PlantPotPreview({
    seed,
    growth,
    potSource,
    potType,
    plantStyle = "rosette",
    plantConfig,
    mode = "procedural",
    lsystemConfig,
    cameraY = 0.65,
    cameraDistance = 1.5,
}: Props) {
    return (
        <View style={{ flex: 1 }}>
            <Canvas
                dpr={[1, 2]}
                camera={{ position: [1, 0.65, 1], fov: 45, near: 0.01, far: 50 }}
            >
                {/* Dynamic camera controller */}
                <CameraController cameraY={cameraY} cameraDistance={cameraDistance} />

                {/* Ambient light for overall illumination */}
                <ambientLight intensity={0.5} />

                {/* Hemisphere light for sky/ground effect */}
                <hemisphereLight
                    args={['#87CEEB', '#556B2F', 0.6]}
                />

                {/* Main directional light (sun) */}
                <directionalLight position={[3, 5, 2]} intensity={1.2} color="#FFF8DC" />

                {/* Fill light from opposite side */}
                <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#B0C4DE" />

                <Suspense fallback={null}>
                    <RotatingScene
                        seed={seed}
                        growth={growth}
                        potSource={potSource}
                        potType={potType}
                        plantStyle={plantStyle}
                        plantConfig={plantConfig}
                        mode={mode}
                        lsystemConfig={lsystemConfig}
                    />
                </Suspense>
            </Canvas>
        </View>
    );
}
