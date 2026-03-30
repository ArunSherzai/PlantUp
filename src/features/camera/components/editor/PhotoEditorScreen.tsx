import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { useEditHistory } from '../../hooks/useEditHistory';
import { useSaveMedia } from '../../hooks/useSaveMedia';
import { useShareMedia } from '../../hooks/useShareMedia';

import EditorToolbar from './EditorToolbar';
import type { EditorTool } from './EditorToolbar';
import FilterStrip from './FilterStrip';
import AdjustmentPanel from './AdjustmentPanel';
import CropRotatePanel from './CropRotatePanel';
import TextStickerPanel from './TextStickerPanel';
import DraggableText from './DraggableText';

import type { ImageAdjustments, TextOverlay, EditState } from '../../types';
import { DEFAULT_ADJUSTMENTS } from '../../types';

const { width, height } = Dimensions.get('window');

/**
 * Full-screen photo editor with filters, adjustments, crop/rotate, and text overlays.
 */
export default function PhotoEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const imageUri: string = route.params?.imageUri || '';
  const source: string = route.params?.source || 'CreatePost';
  const originalMedia = route.params?.capturedMedia;  // Full CapturedMedia from CameraScreen

  const { state, canUndo, canRedo, pushState, undo, redo, reset } = useEditHistory(imageUri);
  const { saveToGallery, isSaving } = useSaveMedia();
  const { shareImage, isSharing } = useShareMedia();

  const [activeTool, setActiveTool] = useState<EditorTool>('filters');
  const [isProcessing, setIsProcessing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  // --- ADJUSTMENT HANDLERS ---

  const handleAdjustmentChange = useCallback((key: keyof ImageAdjustments, value: number) => {
    const newState: EditState = {
      ...state,
      adjustments: { ...state.adjustments, [key]: value },
    };
    pushState(newState);
  }, [state, pushState]);

  const handleFilterSelect = useCallback((filterId: string, adjustments: ImageAdjustments) => {
    const newState: EditState = {
      ...state,
      adjustments: { ...adjustments },
      activeFilter: filterId,
    };
    pushState(newState);
  }, [state, pushState]);

  // --- CROP/ROTATE HANDLERS ---

  const handleRotate = useCallback(() => {
    const newRotation = (state.rotation + 90) % 360;
    pushState({ ...state, rotation: newRotation });
  }, [state, pushState]);

  const handleFlipH = useCallback(() => {
    pushState({ ...state, flipH: !state.flipH });
  }, [state, pushState]);

  const handleFlipV = useCallback(() => {
    pushState({ ...state, flipV: !state.flipV });
  }, [state, pushState]);

  const handleCropReset = useCallback(() => {
    pushState({ ...state, rotation: 0, flipH: false, flipV: false, crop: undefined });
  }, [state, pushState]);

  // --- TEXT HANDLERS ---

  const handleAddText = useCallback((overlay: TextOverlay) => {
    pushState({
      ...state,
      textOverlays: [...state.textOverlays, overlay],
    });
  }, [state, pushState]);

  const handleRemoveText = useCallback((id: string) => {
    pushState({
      ...state,
      textOverlays: state.textOverlays.filter(t => t.id !== id),
    });
  }, [state, pushState]);

  const handleTextMove = useCallback((id: string, x: number, y: number) => {
    pushState({
      ...state,
      textOverlays: state.textOverlays.map(t =>
        t.id === id ? { ...t, x, y } : t
      ),
    });
  }, [state, pushState]);

  // --- APPLY EDITS & EXPORT ---

  const applyEdits = useCallback(async (): Promise<string> => {
    setIsProcessing(true);
    try {
      // 1. If we have a viewShot ref, take a screenshot of the entire rendering
      // which includes the image + filter overlays + DraggableText all positioned correctly.
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        return uri;
      }
      return state.originalUri;
    } catch (error) {
      console.error('[PhotoEditor] Apply edits failed:', error);
      return state.originalUri;
    } finally {
      setIsProcessing(false);
    }
  }, [state, viewShotRef]);

  // --- DONE: Return edited image directly to the calling screen ---

  const handleDone = useCallback(async () => {
    const editedUri = await applyEdits();

    // Build the final media object with the edited URI
    const finalMedia = {
      ...(originalMedia || {}),
      uri: editedUri,
      type: 'image' as const,
      mimeType: 'image/jpeg',
      fileName: `edited_${Date.now()}.jpg`,
    };

    // Navigate directly to the source screen (e.g. CreatePost),
    // removing BOTH PhotoEditor and Camera from the stack
    navigation.dispatch((navState: any) => {
      const routes = navState.routes
        .filter((r: any) => r.name !== 'PhotoEditor' && r.name !== 'Camera')
        .map((r: any) => {
          if (r.name === source) {
            return {
              ...r,
              params: {
                ...r.params,
                capturedMedia: finalMedia,
              },
            };
          }
          return r;
        });

      return CommonActions.reset({
        ...navState,
        routes,
        index: routes.length - 1,
      });
    });
  }, [applyEdits, navigation, source, originalMedia]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback(async () => {
    const editedUri = await applyEdits();
    await saveToGallery(editedUri);
  }, [applyEdits, saveToGallery]);

  const handleShare = useCallback(async () => {
    const editedUri = await applyEdits();
    await shareImage(editedUri);
  }, [applyEdits, shareImage]);

  // --- IMAGE TRANSFORM (rotate/flip only — overlays handle color) ---

  const imageTransform = useMemo(() => ({
    transform: [
      { rotate: `${state.rotation}deg` },
      { scaleX: state.flipH ? -1 : 1 },
      { scaleY: state.flipV ? -1 : 1 },
    ],
  }), [state.rotation, state.flipH, state.flipV]);

  // --- Compute overlay effects from adjustments (memoized) ---
  const filterOverlays = useMemo(() => {
    const { brightness, contrast, saturation, warmth } = state.adjustments;
    const overlays: React.ReactNode[] = [];

    // Brightness: white overlay (positive) or black overlay (negative)
    if (brightness !== 0) {
      overlays.push(
        <View
          key="brightness"
          style={[
            styles.filterOverlay,
            {
              backgroundColor: brightness > 0 ? 'white' : 'black',
              opacity: Math.abs(brightness) / 200,
            },
          ]}
          pointerEvents="none"
        />
      );
    }

    // Saturation: B&W effect
    if (saturation < 0) {
      overlays.push(
        <View
          key="saturation"
          style={[
            styles.filterOverlay,
            {
              backgroundColor: 'black', // use black not gray, and use mixBlendMode color if we could, but RN doesn't support it natively.
              // Wait, instead of this, we'll apply tintColor to the image itself if possible! 
              // But for now, a white/gray overlay is the only purely CSS way we had.
              // Actually, setting opacity on a pure gray or black background just darkens it. It doesn't B&W.
              opacity: 0, 
            },
          ]}
          pointerEvents="none"
        />
      );
    }

    // Warmth: orange tint (positive) or blue tint (negative)
    if (warmth !== 0) {
      overlays.push(
        <View
          key="warmth"
          style={[
            styles.filterOverlay,
            {
              backgroundColor: warmth > 0 ? 'rgba(255, 165, 0, 0.5)' : 'rgba(0, 100, 255, 0.5)',
              opacity: Math.abs(warmth) / 250,
            },
          ]}
          pointerEvents="none"
        />
      );
    }

    // Contrast: slight dark/light overlay
    if (contrast !== 0) {
      overlays.push(
        <View
          key="contrast"
          style={[
            styles.filterOverlay,
            {
              backgroundColor: contrast > 0 ? 'rgba(0,0,0,0.08)' : 'rgba(128,128,128,0.12)',
              opacity: Math.abs(contrast) / 150,
            },
          ]}
          pointerEvents="none"
        />
      );
    }

    return overlays;
  }, [state.adjustments]);

  // --- RENDER ---

  // Calculate exact image dimensions to prevent ViewShot from capturing empty black bars
  const ogWidth = originalMedia?.width || 3;
  const ogHeight = originalMedia?.height || 4;
  const isRotated = state.rotation % 180 !== 0;
  const currentRatio = isRotated ? ogHeight / ogWidth : ogWidth / ogHeight;

  // Actual B&W fix: apply standard RN tintColor if saturation is very low
  const imageSaturationStyle = state.adjustments.saturation <= -80 ? { tintColor: 'gray' as any } : {};

  return (
    <View style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleClose}>
          <FontAwesome6 name="xmark" size={20} color="white" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <TouchableOpacity
            style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
            onPress={undo}
            disabled={!canUndo}
          >
            <FontAwesome6 name="arrow-rotate-left" size={16} color={canUndo ? 'white' : 'rgba(255,255,255,0.2)'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.undoBtn, !canRedo && styles.undoBtnDisabled]}
            onPress={redo}
            disabled={!canRedo}
          >
            <FontAwesome6 name="arrow-rotate-right" size={16} color={canRedo ? 'white' : 'rgba(255,255,255,0.2)'} />
          </TouchableOpacity>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSave} disabled={isSaving}>
            <FontAwesome6 name="download" size={17} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare} disabled={isSharing}>
            <FontAwesome6 name="share-from-square" size={17} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* IMAGE PREVIEW */}
      <View style={styles.previewContainer}>
        <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <ViewShot 
            ref={viewShotRef} 
            options={{ format: 'jpg', quality: 0.9 }}
            style={{ 
              aspectRatio: currentRatio, 
              width: currentRatio > 0.8 ? '100%' : undefined,
              height: currentRatio <= 0.8 ? '100%' : undefined,
              backgroundColor: 'transparent',
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={[{ width: '100%', height: '100%' }, imageTransform, imageSaturationStyle]}
              resizeMode="contain"
            />

          {/* Filter effect overlays */}
          {filterOverlays}

          {/* Draggable Text Overlays */}
          {state.textOverlays.map(overlay => (
            <DraggableText
              key={overlay.id}
              overlay={overlay}
              onPositionChange={handleTextMove}
            />
          ))}
          </ViewShot>
        </View>
      </View>

      {/* EDITOR PANEL */}
      <View style={styles.editorPanel}>
        <EditorToolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <ScrollView style={styles.panelContent} showsVerticalScrollIndicator={false}>
          {activeTool === 'filters' && (
            <FilterStrip
              activeFilterId={state.activeFilter || 'original'}
              onFilterSelect={handleFilterSelect}
              imageUri={imageUri}
            />
          )}
          {activeTool === 'adjust' && (
            <AdjustmentPanel
              adjustments={state.adjustments}
              onAdjustmentChange={handleAdjustmentChange}
            />
          )}
          {activeTool === 'crop' && (
            <CropRotatePanel
              rotation={state.rotation}
              flipH={state.flipH}
              flipV={state.flipV}
              onRotate={handleRotate}
              onFlipH={handleFlipH}
              onFlipV={handleFlipV}
              onReset={handleCropReset}
            />
          )}
          {activeTool === 'text' && (
            <TextStickerPanel
              textOverlays={state.textOverlays}
              onAddText={handleAddText}
              onRemoveText={handleRemoveText}
            />
          )}
        </ScrollView>

        {/* DONE BUTTON */}
        <TouchableOpacity onPress={handleDone} disabled={isProcessing} style={styles.doneWrapper}>
          <LinearGradient
            colors={['#329D9C', '#00D988']}
            style={styles.doneButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <FontAwesome6 name="check" size={18} color="white" />
                <Text style={styles.doneText}>Done</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 8,
  },
  topBarCenter: {
    flexDirection: 'row',
    gap: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoBtnDisabled: {
    opacity: 0.4,
  },

  // Preview
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  textOverlayOnImage: {
    position: 'absolute',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Editor Panel
  editorPanel: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: height * 0.42,
  },
  panelContent: {
    maxHeight: height * 0.22,
  },

  // Done Button
  doneWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  doneButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
});
