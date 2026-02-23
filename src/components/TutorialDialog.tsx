import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useTutorialStore } from '../stores/TutorialStore';
import { TUTORIALS } from '../config/TutorialsConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const vw = width / 100;
const vh = height / 100;

export default function TutorialDialog() {
  const { activeTutorialId, currentStepIndex, isOpen, nextStep, skipTutorial } = useTutorialStore();
  const insets = useSafeAreaInsets();

  if (!isOpen || !activeTutorialId) return null;

  const currentTutorialContent = TUTORIALS[activeTutorialId];
  const currentStep = currentTutorialContent[currentStepIndex];
  const isLastStep = currentStepIndex === currentTutorialContent.length - 1;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)} 
      style={[styles.overlay, { paddingBottom: insets.bottom + (vh * 2) }]}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />

      {/* Skip Button */}
      <TouchableOpacity 
        style={[styles.skipButton, { top: insets.top + 20 }]} 
        onPress={skipTutorial}
      >
        <Text style={styles.skipText}>Skip Tutorial</Text>
        <FontAwesome6 name="xmark" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      <View style={styles.dialogContainer}>
        {/* Speech Bubble */}
        <Animated.View 
          entering={FadeIn.delay(200).duration(400)} 
          key={currentStepIndex} // Re-animate on text change
          style={styles.speechBubble}
        >
          <Text style={styles.dialogText}>{currentStep.text}</Text>
          
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>{isLastStep ? "Finish" : "Next"}</Text>
            <FontAwesome6 name={isLastStep ? "check" : "chevron-right"} size={14} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Speech Bubble Tail */}
          <View style={styles.tail} />
        </Animated.View>

        {/* Sprig Mascot */}
        <Animated.View 
          entering={SlideInRight.springify().damping(15).stiffness(100)} 
          exiting={SlideOutRight.duration(300)}
          style={styles.spriteContainer}
        >
          <ExpoImage
            source={require('../../assets/animations/talkingSprig.gif')} // Always using talking state for now
            style={styles.sprite}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* Tap anywhere to advanced (invisible overlay behind the dialog but in front of Blur) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={nextStep} 
          />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  skipButton: {
    position: 'absolute',
    right: vw * 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: vw * 4,
    paddingVertical: vh * 1,
    borderRadius: vw * 5,
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: vw * 3.5,
  },
  dialogContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: vw * 3,
    marginBottom: vh * 2,
    zIndex: 10,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: vw * 5,
    padding: vw * 5,
    paddingBottom: vh * 6,
    marginRight: vw * 2,
    marginBottom: vh * 8, // Lift it up slightly relative to Sprig
    minHeight: vh * 15,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  dialogText: {
    fontSize: vw * 4,
    color: '#333',
    lineHeight: vw * 5.5,
    fontWeight: '500',
    marginBottom: vh * 2,
  },
  nextButton: {
    position: 'absolute',
    bottom: vh * 1.5,
    right: vw * 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: vw * 4,
    paddingVertical: vh * 1,
    borderRadius: vw * 4,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: vw * 3.5,
  },
  tail: {
    position: 'absolute',
    bottom: -vh * 1.5,
    right: vw * 5, // Pointing towards Sprig on the right
    width: 0,
    height: 0,
    borderLeftWidth: vw * 2.5,
    borderRightWidth: vw * 2.5,
    borderTopWidth: vh * 2,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  spriteContainer: {
    width: vw * 35,
    height: vw * 35,
    marginBottom: -vh * 1.5, // Bring slightly down
    marginRight: -vw * 2.5, // Push slightly right off-screen
    zIndex: 15,
  },
  sprite: {
    width: '100%',
    height: '100%',
  },
});
