import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, InteractionManager } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getLevelProgress, getXPForNextLevel, getTotalXPForLevel } from '../utils/leveling';
import PotModel from './PotModel';
import LSystemPlant3D, { DEFAULT_LSYSTEM_CONFIG, LSystemConfig } from './LSystemPlant3D';
import { patchExpoGL } from '../utils/patchExpoGL';

type RankCardProps = {
  level: number;
  xp: number;
  rankName?: string;
  seed?: number;
};

// Dynamic camera controller
function CameraController() {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(0.8, 0.5, 0.8);
    camera.lookAt(0, 0.1, 0);
  });

  return null;
}

// Rotating scene for the plant
function RotatingPlantScene({ seed, growth }: { seed: number; growth: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Calculate L-System config based on growth (0-100)
  const lsystemConfig = useMemo<Partial<LSystemConfig>>(() => {
    const t = Math.max(0, Math.min(100, growth)) / 100;
    return {
      iterations: 2 + Math.floor(t * 2),
      length: 0.01 + t * 0.12,
      thickness: 0.003 + t * 0.02,
      lengthScale: 0.6 + t * 0.35,
      leafSize: 0.01 + t * 0.05,
      bloomSize: 0.02 + t * 0.06,
      leafChance: t * 0.5,
      bloomChance: t > 0.25 ? (t - 0.25) * 1.07 : 0,
    };
  }, [growth]);

  return (
    <group ref={groupRef}>
      <PotModel potType="PotStandard" scale={1} position={[0, -0.25, 0]} rotation={[0, 0, 0]} />
      <group position={[0, -0.02, 0]}>
        <LSystemPlant3D seed={seed} growth={growth} config={lsystemConfig} />
      </group>
    </group>
  );
}

export default function RankCard({
  level,
  xp,
  rankName = 'Blooming Sprout',
  seed = 12345,
}: RankCardProps) {
  const RANK_GRADIENTS: Record<string, [string, string]> = {
    Evergreen: ['#29d071', '#23b060'],
    Roseheart: ['#f68580', '#e57373'],
    Sapling: ['#68cf67', '#5cb85c'],
    Seedling: ['#4fab4b', '#439a40'],
    Sprout: ['#42973b', '#388e3c'],
    Sunflower: ['#f1aa21', '#ffa000'],
  };

  const gradientColors = RANK_GRADIENTS[rankName] || ['#4CAF50', '#388E3C'];

  const progress = getLevelProgress(xp, level);
  const xpForNext = getXPForNextLevel(level);
  const currentLevelXP = getTotalXPForLevel(level);
  const xpInLevel = xp - currentLevelXP;
  const xpNeededInLevel = xpForNext - currentLevelXP;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${progress * 100}%`, { duration: 1000 }),
    };
  });

  // Defer heavy 3D rendering to avoid blocking initial screen paint
  const [isPlantReady, setIsPlantReady] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fallbackTimer = setTimeout(() => {
      setIsPlantReady(true);
    }, 3500);

    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setIsPlantReady(true), 1500);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      {/* 3D Plant Preview - Inline Canvas like test screen */}
      <ErrorBoundary
        fallback={
          <View style={[styles.plantContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: 'white' }}>3D View Unavailable</Text>
          </View>
        }>
        <View style={styles.plantContainer}>
          {isPlantReady ? (
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0.8, 0.5, 0.8], fov: 45, near: 0.01, far: 50 }}
              style={{ flex: 1 }}
              onCreated={(state) => patchExpoGL(state)}>
              <CameraController />

              {/* Lighting */}
              <ambientLight intensity={0.5} />
              <hemisphereLight args={['#87CEEB', '#556B2F', 0.6]} />
              <directionalLight position={[3, 5, 2]} intensity={1.2} color="#FFF8DC" />
              <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#B0C4DE" />

              <Suspense fallback={null}>
                <RotatingPlantScene seed={seed} growth={level} />
              </Suspense>
            </Canvas>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>
                Pflanze lädt...
              </Text>
            </View>
          )}
        </View>
      </ErrorBoundary>

      {/* Level Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.xpText}>
          {xpInLevel} / {xpNeededInLevel} XP
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, animatedStyle]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 20,
    width: '100%',
    minHeight: 340,
  },
  plantContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 15,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  levelText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  xpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});
