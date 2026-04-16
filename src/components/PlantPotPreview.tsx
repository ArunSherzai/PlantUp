import React, { Suspense, useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, useProgress } from '@react-three/drei/native';
import PotModel, { PotType } from './PotModel';
import ProceduralPlant, { PlantStyle, PlantConfig } from './ProceduralPlant';
import LSystemPlant3D, { LSystemConfig } from './LSystemPlant3D';
import { patchExpoGL } from '../utils/patchExpoGL';

export type PlantMode = 'procedural' | 'lsystem';

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
  cameraTargetY?: number;
};

// Component to set initial camera position
function InitialCamera({
  cameraY,
  cameraDistance,
  cameraTargetY,
}: {
  cameraY: number;
  cameraDistance: number;
  cameraTargetY: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const xz = cameraDistance * 0.7;
    camera.position.set(xz, cameraY, xz);
    camera.lookAt(0, cameraTargetY, 0);
    camera.updateProjectionMatrix();
  }, [cameraY, cameraDistance, cameraTargetY, camera]);

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
        {mode === 'lsystem' ? (
          <LSystemPlant3D seed={seed} growth={growth} config={lsystemConfig} />
        ) : (
          <ProceduralPlant seed={seed} style={plantStyle} config={plantConfig} />
        )}
      </group>
    </group>
  );
}

// Loading Bar Component
function Loader() {
  const { active, progress } = useProgress();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setTimedOut(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [active]);

  if (!active || timedOut || progress >= 99) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 10,
      }}>
      <View style={{ width: '60%', alignItems: 'center' }}>
        <View
          style={{
            width: '100%',
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
          <View
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function PlantPotPreview({
  seed,
  growth,
  potSource,
  potType,
  plantStyle = 'rosette',
  plantConfig,
  mode = 'procedural',
  lsystemConfig,
  cameraY = 0.85,
  cameraDistance = 1.5,
  cameraTargetY = 0.4,
}: Props) {
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsSceneLoaded(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>
              3D View Unavailable {'\n'} (Disable Debug Remote JS)
            </Text>
          </View>
        }>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [1, 0.85, 1], fov: 45, near: 0.01, far: 50 }}
          onCreated={(state) => {
            patchExpoGL(state);
            setIsSceneLoaded(true);
          }}>
          {/* Initial Camera Position Setup */}
          <InitialCamera
            cameraY={cameraY}
            cameraDistance={cameraDistance}
            cameraTargetY={cameraTargetY}
          />

          {/* Orbit Controls for Zoom/Pan */}
          <OrbitControls
            makeDefault
            target={[0, cameraTargetY, 0]}
            enableZoom={true}
            enablePan={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.5}
            minDistance={0.1}
            maxDistance={4}
          />

          {/* Ambient light for overall illumination */}
          <ambientLight intensity={0.5} />

          {/* Hemisphere light for sky/ground effect */}
          <hemisphereLight args={['#87CEEB', '#556B2F', 0.6]} />

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
      </ErrorBoundary>
      {/* Loading overlay - shows while scene + assets load */}
      {!isSceneLoaded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: 12,
          }}>
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 6 }}>
              3D lädt...
            </Text>
          </View>
        </View>
      )}
      <Loader />
    </View>
  );
}
