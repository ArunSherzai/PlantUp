import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// --- IMPORTE FÜR UPLOAD ---
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video as Compressor } from 'react-native-compressor';
import Video from 'react-native-video';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';
import SensorDisplayCard from '~/components/SensorDisplayCard';

import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { playSound } from '~/utils/SoundManager';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';


const { height, width } = Dimensions.get('window');

// Limit: 50 MB (Damit auch Videos passen)
const MAX_SIZE = 50 * 1024 * 1024;

export default function CreatePostScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  const { user, profile } = useUserStore();

  // --- STATE ---
  const [caption, setCaption] = useState('');
  // Use profile username or fallback
  const username = profile?.username || 'Loading...';
  const userId = user?.id; // derived from store
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Modal State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Media State
  const [media, setMedia] = useState<{
    uri: string;
    type: 'image' | 'video' | 'document' | 'sensor';
    mimeType?: string;
    name?: string;
    sensorData?: any;
    thumbnailUri?: string; // New field for thumbnail
  } | null>(null);

  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Video Playback State
  const [isVideoPaused, setIsVideoPaused] = useState(true);

  // --- SENSOR SELECTION STATE ---
  const [showSensorSelection, setShowSensorSelection] = useState(false);
  const [selectionStep, setSelectionStep] = useState<'plants' | 'records'>('plants');
  const [plants, setPlants] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [sensorRecords, setSensorRecords] = useState<any[]>([]);
  const [fetchingSensorData, setFetchingSensorData] = useState(false);

  // Profile Image Logic with Fallback
  const profileImage = profile?.profile_image
    ? { uri: profile.profile_image }
    : require('../../../../assets/images/Profilbild.jpg');

  const closeMenu = () => setShowAttachmentMenu(false);

  // --- FUNKTION: FOTO & VIDEO AUSWÄHLEN ---
  const pickMedia = async (mediaType: ImagePicker.MediaTypeOptions = ImagePicker.MediaTypeOptions.All) => {
    closeMenu();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType,
      quality: 0.7,
      videoMaxDuration: 60,
      allowsEditing: true,
    });

    if (!res.canceled) {
      const asset = res.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        Alert.alert('Too big', 'File is over 50MB.');
        return;
      }

      let thumbnailUri = undefined;
      // If we picked a video, generate thumbnail (or if we picked 'All' and got a video)
      if (asset.type === 'video') {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri);
          thumbnailUri = uri;
        } catch (e) {
          console.warn('Could not generate thumbnail', e);
        }
      }

      setMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        name: asset.fileName || `upload.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        thumbnailUri,
      });
    }
  };

  // --- FUNKTION: DOKUMENT AUSWÄHLEN ---
  const pickDocument = async () => {
    closeMenu();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled) {
        const asset = res.assets[0];

        if (asset.size && asset.size > MAX_SIZE) {
          Alert.alert('Too big', 'Max 50MB.');
          return;
        }

        setMedia({
          uri: asset.uri,
          type: 'document',
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  // --- FUNKTION: SENSOR DATEN ---
  const attachSensorData = async () => {
    console.log('[CreatePost] attachSensorData started. UserID:', userId);
    closeMenu();
    if (!userId) {
      console.log('[CreatePost] No User ID found.');
      return;
    }
    setFetchingSensorData(true);
    try {
      console.log('[CreatePost] Fetching plants from db.social.Plants...');
      // User requested "user table" for plants
      const { data: userPlants, error } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('user_id', userId);

      if (error) {
        ErrorHandlerService.handle(error, { showUI: false });
        throw error;
      }

      console.log('[CreatePost] Fetched plants:', userPlants);

      if (!userPlants || userPlants.length === 0) {
        console.log('[CreatePost] No plants found.');
        Alert.alert('No Plants', 'You haven\'t added any plants yet.');
        return;
      }

      // Initialize plants with empty records and collapsed state
      const initializedPlants = userPlants.map(p => ({ ...p, records: [], expanded: false, loadingRecords: false }));
      setPlants(initializedPlants);
      setShowSensorSelection(true);
    } catch (e) {
      ErrorHandlerService.handle(e);
      Alert.alert('Error', 'Could not load your plants.');
    } finally {
      setFetchingSensorData(false);
    }
  };

  const togglePlantExpansion = async (plantIndex: number) => {
    console.log('[CreatePost] Toggling expansion for plant index:', plantIndex);
    const plant = plants[plantIndex];
    console.log('[CreatePost] Plant info:', plant);

    // Create a new copy of plants to avoid direct mutation
    const newPlants = plants.map((p, i) => i === plantIndex ? { ...p } : p);

    // If collapsing, just toggle off
    if (plant.expanded) {
      console.log('[CreatePost] Collapsing plant.');
      newPlants[plantIndex].expanded = false;
      setPlants(newPlants);
      return;
    }

    // Toggle ON immediately so UI feels responsive (will show loading spinner)
    newPlants[plantIndex].expanded = true;

    // If no records yet, we need to fetch
    if (!plant.records || plant.records.length === 0) {
      console.log('[CreatePost] Fetching records for plant ID:', plant.id);
      newPlants[plantIndex].loadingRecords = true;
      setPlants(newPlants); // Update UI to show loading spinner

      try {
        const { data: records, error } = await db.micro
          .from('Controllers')
          .select('*')
          .eq('plant_id', plant.id)
          .order('time', { ascending: false })
          .limit(10);

        if (error) {
          ErrorHandlerService.handle(error, { showUI: false });
          throw error;
        }

        console.log('[CreatePost] Fetched records:', records);

        // UPDATE STATE AGAIN with fetched records
        // IMPORTANT: We need to get the latest state or just reuse our local copy if we assume no other race conditions
        // For safety in this simple case, we update our local copy and set it.
        // We need to re-copy potentially if other plants changed, but usually only one action happens at a time here.
        // Better: use function update or just update the index of current state if possible, but map is safer.

        setPlants(currentPlants => {
          const updated = [...currentPlants];
          updated[plantIndex] = {
            ...updated[plantIndex],
            loadingRecords: false,
            records: records || []
          };
          return updated;
        });

      } catch (e) {
        ErrorHandlerService.handle(e);
        Alert.alert('Error', 'Could not load records.');

        setPlants(currentPlants => {
          const updated = [...currentPlants];
          updated[plantIndex] = { ...updated[plantIndex], loadingRecords: false };
          return updated;
        });
      }
    } else {
      // Records already exist, just set state from earlier toggle
      setPlants(newPlants);
    }
  };

  const selectSensorRecord = (plant: any, record: any) => {
    setMedia({
      uri: '',
      type: 'sensor',
      name: `${plant.nickname} Status`,
      sensorData: { ...record, nickname: plant.nickname },
    });
    setShowSensorSelection(false);
  };

  // --- HAUPTFUNKTION: POSTEN ---
  const handlePost = async () => {
    if (!caption && !media) {
      Alert.alert('Empty', 'Please write something.');
      return;
    }

    setLoading(true);
    setProgress(0);
    // Keep track of uploaded files to delete them if something fails
    const uploadedPaths: string[] = [];

    try {
      let finalUrl = null;
      let finalType = 'text';
      let finalCaption = caption;

      if (media && media.type !== 'sensor') {
        const {
          data: { session },
        } = await db.public.auth.getSession();
        if (!session) throw new Error('No active session');
        const token = session.access_token;

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

        const ext = media.name?.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `${userId}/${fileName}`;

        // 1. COMPRESSION & UPLOAD MAIN MEDIA
        let uploadUri = media.uri;

        if (media.type === 'video') {
          try {
            console.log('Compressing video...');
            const compressedUri = await Compressor.compress(
              media.uri,
              {
                compressionMethod: 'auto',
                minimumFileSizeForCompress: 2, // MB
                getCancellationId: (cancellationId: string) => console.log('compression id', cancellationId),
              },
              (progress: number) => {
                // Map 0-1 to 0-40%
                setProgress(Math.round(progress * 40));
              }
            );

            // Strip file:// prefix if compressor returns it on some versions/platforms (safety check)
            uploadUri = compressedUri.startsWith('file://') ? compressedUri : `file://${compressedUri}`;
            console.log('Compression success. New URI:', uploadUri);
          } catch (e) {
            console.warn('Compression failed, falling back to original file:', e);
          }
        }

        const uploadUrl = `${supabaseUrl}/storage/v1/object/post-media/${filePath}`;

        console.log('Uploading media to:', uploadUrl);

        // Upload Task for Progress (40% -> 100%)
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          uploadUri,
          {
            httpMethod: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': media.mimeType || 'application/octet-stream',
            },
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          },
          (data) => {
            const { totalBytesSent, totalBytesExpectedToSend } = data;
            const uploadPercentage = totalBytesSent / totalBytesExpectedToSend;
            // Map 0-1 to 40-100
            const totalProgress = 40 + Math.round(uploadPercentage * 60);
            setProgress(totalProgress);
          }
        );

        const uploadResult = await uploadTask.uploadAsync();

        if (!uploadResult || uploadResult.status !== 200) {
          console.log('Upload error (Main):', uploadResult?.body);
          throw new Error('Upload failed: ' + uploadResult?.body);
        }
        uploadedPaths.push(filePath);

        // const { data } = db.public.storage.from('post-media').getPublicUrl(filePath);
        // finalUrl = data.publicUrl;

        // Save ONLY the filename/path to DB, not full URL
        finalUrl = filePath;
        finalType = media.type;

        // 2. If Video -> Generate & Upload Thumbnail
        if (media.type === 'video') {
          try {
            console.log('Generating thumbnail...');
            // Use uploaded URI (compressed) for thumbnail to be consistent, or original (doesn't matter much for 1 frame)
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uploadUri, {
              time: 0, // 0ms = first frame
            });

            const thumbName = fileName.replace(`.${ext}`, '.png');
            const thumbPath = `${userId}/${thumbName}`;
            const thumbUploadUrl = `${supabaseUrl}/storage/v1/object/post-media/${thumbPath}`;

            console.log('Uploading thumbnail to:', thumbUploadUrl);
            const thumbResult = await FileSystem.uploadAsync(thumbUploadUrl, thumbUri, {
              httpMethod: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'image/png',
              },
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            });

            if (thumbResult.status === 200) {
              uploadedPaths.push(thumbPath);
            } else {
              console.warn('Thumbnail upload failed, but proceeding with video.', thumbResult.body);
            }
          } catch (err) {
            console.warn('Thumbnail generation failed:', err);
          }
        }
      } else if (media && media.type === 'sensor') {
        // Use 'sensorData' to match other screens (FeedCard, FeedPostDetail)
        finalType = 'sensorData';
        const d = media.sensorData;
        // Keep the visible caption nice
        finalCaption += `\n\n🌿 Status:\n🌡️ ${d.temperature}°C | 💧 ${d.soil_moisture}%`;

        // Append hidden data marker for parsing
        const SENSOR_MARKER = '|||SENSOR_DATA|||';
        finalCaption += SENSOR_MARKER + JSON.stringify(d);
      }

      // 3. Create DB Entry
      const { error } = await db.social.from('Posts').insert({
        user_id: userId,
        caption: finalCaption,
        media_url: finalUrl,
        type: finalType,
        likes: 0,
        shares: 0,
        comments_count: 0,
      });

      if (error) throw error;

      playSound('confirm');
      Alert.alert('Success', 'Post created!');

      // >>> RESET HERE <<<
      setCaption('');
      setMedia(null);
    } catch (e: any) {
      ErrorHandlerService.handle(e);
      Alert.alert('Error', e.message || 'Network request failed');

      // --- CLEANUP LOGIC ---
      if (uploadedPaths.length > 0) {
        console.log('Cleaning up orphaned files:', uploadedPaths);
        try {
          // Attempt to delete the files from storage
          const { error: removeError } = await db.public.storage
            .from('post-media')
            .remove(uploadedPaths);

          if (removeError) {
            ErrorHandlerService.handle(removeError, { showUI: false });
          } else {
            console.log('Cleanup successful.');
          }
        } catch (cleanupErr) {
          ErrorHandlerService.handle(cleanupErr, { showUI: false });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>


      {/* FIXED BACKGROUND */}
      <View style={styles.bgContainer}>
        <Image
          source={require('../../../../assets/images/createPostBackground.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </View>

      {/* HEADER */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome6 name="chevron-left" size={22} color="white" />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* CONTENT - FESTE HÖHE STATT SCROLLVIEW */}
      <View style={styles.contentContainer}>
        <Text style={styles.pageTitle}>Create a Post</Text>

        <View style={styles.whiteSheet}>
          {/* 1. USER INFO */}
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Image source={profileImage} style={styles.avatar} />
              <Text style={styles.usernameText}>{username}</Text>
            </View>

            <TouchableOpacity onPress={handlePost} disabled={loading}>
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                style={[styles.postButton, { opacity: loading ? 0.7 : 1 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{progress}%</Text>
                  </View>
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 2. TEXT INPUT */}
          <KeyboardAwareScrollView
            style={styles.inputContainer}
            contentContainerStyle={styles.inputContent}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Write something here..."
              placeholderTextColor="#999"
              multiline
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
            />
          </KeyboardAwareScrollView>

          {/* 3. PREVIEW AREA: MEDIA or THOUGHT */}
          <View style={styles.previewWrapper}>
            {media ? (
              media.type === 'document' || media.type === 'sensor' ? (
                // Document/Sensor Card Style (Keep Compact)
                <View style={styles.previewBar}>
                  {media.type === 'sensor' ? (
                    <View style={{ width: '100%', paddingVertical: 10 }}>
                      <View style={[styles.previewContent, { marginBottom: 10 }]}>
                        <FontAwesome6 name="leaf" size={16} color="#329D9C" />
                        <Text style={styles.previewText} numberOfLines={1}>
                          {media.name}
                        </Text>
                        <TouchableOpacity onPress={() => setMedia(null)} style={{ marginLeft: 'auto' }}>
                          <FontAwesome6 name="xmark" size={16} color="#999" />
                        </TouchableOpacity>
                      </View>
                      <SensorDisplayCard data={media.sensorData} />
                    </View>
                  ) : (
                    <View style={[styles.previewContent, { width: '100%' }]}>
                      <FontAwesome6 name="file-lines" size={16} color={theme.colors.primary} />
                      <Text style={styles.previewText} numberOfLines={1}>
                        {media.name || media.type}
                      </Text>
                      <TouchableOpacity onPress={() => setMedia(null)} style={{ marginLeft: 'auto' }}>
                        <FontAwesome6 name="xmark" size={16} color={theme.colors.greyedOut} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                // Media Preview (Video/Image) - 9:16 Aspect Ratio
                <View style={styles.feedPreviewContainer}>
                  {media.type === 'video' ? (
                    <View style={{ flex: 1, position: 'relative' }}>
                      <Video
                        source={{ uri: media.uri }}
                        style={styles.feedMediaImage}
                        resizeMode="contain"
                        controls={false}
                        paused={isVideoPaused}
                        repeat={true}
                      />
                      <Pressable
                        onPress={() => setIsVideoPaused(!isVideoPaused)}
                        style={StyleSheet.absoluteFill}
                      >
                        {/* Centered Play Icon */}
                        {isVideoPaused && (
                          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <View style={styles.playIconContainer}>
                              <FontAwesome6 name="play" size={40} color="rgba(255,255,255,0.8)" />
                            </View>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setFullScreenImage(media.uri)} style={{ flex: 1 }}>
                      <Image
                        source={{ uri: media.uri }}
                        style={styles.feedMediaImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}

                  {/* Remove Button (Top Right) */}
                  <TouchableOpacity
                    style={styles.closeButtonOverlay}
                    onPress={() => setMedia(null)}
                  >
                    <FontAwesome6 name="xmark" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              )
            ) : caption.length > 0 ? (
              // THOUGHT BUBBLE PREVIEW (If no media, but text exists)
              <LinearGradient
                colors={[
                  theme.colors.surface,
                  (theme.colors.surface.toUpperCase() === '#FFFFFF' || theme.colors.surface.toUpperCase() === '#FFF')
                    ? '#F0F0F0'
                    : '#2A2E32'
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.imageContainer,
                  { aspectRatio: 0.8 } // Default aspect ratio for preview
                ]}
              >
                {/* Decorative Background Elements */}
                <View style={styles.backgroundDecoration}>
                  <FontAwesome6 name="leaf" size={80} color={theme.colors.primary} style={{ opacity: 0.03, transform: [{ rotate: '-20deg' }] }} />
                </View>
                <View style={{ position: 'absolute', top: height * 0.02, right: width * 0.04, opacity: 0.1 }}>
                  <FontAwesome6 name="quote-right" size={30} color={theme.colors.primary} />
                </View>

                {/* Stylized Curved Accent */}
                <View style={[styles.curvedAccent, { backgroundColor: theme.colors.primary }]} />

                {/* Badge at top */}
                <View style={styles.badgeContainer}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>Thought</Text>
                  </View>
                </View>

                {/* Main Content */}
                <View style={{ paddingHorizontal: width * 0.04, flex: 1, justifyContent: 'center', zIndex: 1 }}>
                  {(() => {
                    const cleanCaption = caption ? caption.replace(/#\w+/g, '').trim() : "No content";
                    const isShort = cleanCaption.length < 60;

                    return (
                      <Text
                        style={[
                          styles.textBody,
                          {
                            color: theme.colors.text,
                            fontSize: isShort ? width * 0.045 : width * 0.035,
                            fontWeight: isShort ? '700' : '500',
                            lineHeight: isShort ? width * 0.06 : width * 0.05,
                          }
                        ]}
                        numberOfLines={6}
                      >
                        {cleanCaption}
                      </Text>
                    );
                  })()}
                </View>
              </LinearGradient>
            ) : null}
          </View>

          {/* 4. BUTTON UNTEN */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.addAttachmentButton}
              onPress={() => setShowAttachmentMenu(true)}>
              <FontAwesome6 name="paperclip" size={18} color="#329D9C" />
              <Text style={styles.addAttachmentText}>Add Attachment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 5. MODAL MENU */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAttachmentMenu}
        onRequestClose={closeMenu}>
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add to your post</Text>

            <View style={styles.gridContainer}>

              <AttachmentCard
                icon="image"
                color="#4A90E2"
                label="Photo"
                onPress={() => pickMedia(ImagePicker.MediaTypeOptions.Images)}
              />
              <AttachmentCard
                icon="video"
                color="#E056FD"
                label="Video"
                onPress={() => pickMedia(ImagePicker.MediaTypeOptions.Videos)}
              />
              {/* GIF Button Removed */}
              <AttachmentCard
                icon="file-lines"
                color="#F5A623"
                label="File"
                onPress={pickDocument}
              />
              <AttachmentCard
                icon="temperature-three-quarters"
                color="#00C853"
                label="Sensor"
                onPress={attachSensorData}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 6. SENSOR SELECTION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSensorSelection}
        onRequestClose={() => setShowSensorSelection(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSensorSelection(false)}>
          <View style={[styles.modalContent, { minHeight: 400 }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plant + Data</Text>
            </View>

            {fetchingSensorData ? (
              <ActivityIndicator size="large" color="#329D9C" style={{ marginTop: 40 }} />
            ) : (
              <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                {plants.map((plant, index) => (
                  <View key={plant.id} style={styles.plantContainer}>
                    {/* Plant Header */}
                    <TouchableOpacity
                      style={styles.plantHeader}
                      onPress={() => togglePlantExpansion(index)}
                    >
                      <View style={styles.plantHeaderLeft}>
                        <View style={styles.listItemIcon}>
                          <FontAwesome6 name="leaf" size={18} color="#00C853" />
                        </View>
                        <Text style={styles.listItemTitle}>{plant.nickname}</Text>
                      </View>
                      <FontAwesome6
                        name={plant.expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={theme.colors.greyedOut}
                      />
                    </TouchableOpacity>

                    {/* Expandable Records List */}
                    {plant.expanded && (
                      <View style={styles.recordsList}>
                        {plant.loadingRecords ? (
                          <ActivityIndicator size="small" color="#329D9C" style={{ marginVertical: 10 }} />
                        ) : plant.records.length === 0 ? (
                          <Text style={styles.noRecordsText}>No recent data found.</Text>
                        ) : (
                          plant.records.map((record: any, rIndex: number) => (
                            <TouchableOpacity
                              key={`${record.id}-${rIndex}`}
                              style={styles.recordItem}
                              onPress={() => selectSensorRecord(plant, record)}
                            >
                              <FontAwesome6 name="clock" size={14} color="#329D9C" style={{ width: 20 }} />
                              <Text style={styles.recordTime}>
                                {new Date(record.time).toLocaleString([], {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </Text>
                              <View style={styles.recordValues}>
                                <Text style={styles.recordValueText}>🌡️ {record.temperature}°</Text>
                                <Text style={styles.recordValueText}>💧 {record.soil_moisture}%</Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </KeyboardAwareScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 6. FULL SCREEN IMAGE MODAL */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden={true} />
          <Image
            source={{ uri: fullScreenImage || '' }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeFullScreenButton}
            onPress={() => setFullScreenImage(null)}
          >
            <FontAwesome6 name="xmark" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function AttachmentCard({ icon, color, label, onPress, isGifIcon }: any) {
  return (
    <TouchableOpacity style={styles.attachmentCard} onPress={onPress}>
      <View style={styles.cardIconContainer}>
        {isGifIcon ? (
          <View style={[styles.gifIcon, { borderColor: color }]}>
            <Text style={{ color: color, fontWeight: '900', fontSize: 9 }}>GIF</Text>
          </View>
        ) : (
          <FontAwesome6 name={icon} size={24} color={color} />
        )}
      </View>
      <Text style={styles.attachmentLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- STYLES ---
const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  safeArea: {
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.typography,
    fontSize: 18,
    marginLeft: 8,
    fontWeight: '600',
  },

  // Content Container
  contentContainer: {
    flex: 1,
    marginTop: height * 0.15,
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: theme.colors.typography,
    paddingHorizontal: 20,
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  whiteSheet: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: theme.colors.greyedOut,
  },
  usernameText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.typography,
    flexShrink: 1,
    maxWidth: 180,
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  inputContainer: {
    flex: 1,
    marginBottom: 10,
  },
  inputContent: {
    flexGrow: 1,
  },
  input: {
    fontSize: 18,
    color: theme.colors.typography,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // --- PREVIEW STYLES ---
  previewWrapper: {
    marginBottom: 20,
  },
  previewBar: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  previewText: {
    color: theme.colors.typography,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },

  // --- FEED STYLE PREVIEW ---
  feedPreviewContainer: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'black',
    position: 'relative',
    marginBottom: 10,
  },
  feedMediaImage: {
    width: '100%',
    height: '100%',
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  playIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- THOUGHT BUBBLE STYLES ---
  imageContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    padding: 20,
  },
  backgroundDecoration: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    zIndex: 0,
  },
  curvedAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomRightRadius: 40,
    opacity: 0.1,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    zIndex: 5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textBody: {
    textAlign: 'center',
  },

  // --- FULL SCREEN ---
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeFullScreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
    zIndex: 20,
  },

  // Toolbar
  toolbar: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: theme.colors.greyedOut,
    paddingTop: 15,
    paddingBottom: 20,
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.typography,
  },
  addAttachmentText: {
    color: theme.colors.typography,
    fontWeight: '600',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingBottom: 50,
    minHeight: 250,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.greyedOut,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.typography,
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  attachmentCard: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 15,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  attachmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  gifIcon: {
    borderWidth: 2,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.typography,
  },

  // Sensor Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  plantContainer: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 12,
    overflow: 'hidden',
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  plantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  recordsList: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.greyedOut,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.greyedOut,
  },
  recordTime: {
    fontSize: 14,
    color: theme.colors.typography,
    flex: 1,
  },
  recordValues: {
    flexDirection: 'row',
    gap: 10,
  },
  recordValueText: {
    fontSize: 13,
    color: theme.colors.typography,
    fontWeight: '500',
  },
  noRecordsText: {
    padding: 20,
    textAlign: 'center',
    color: theme.colors.greyedOut,
    fontStyle: 'italic',
  },
}));
