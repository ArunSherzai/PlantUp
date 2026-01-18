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

import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { playSound } from '~/utils/SoundManager';

const { height } = Dimensions.get('window');

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
    closeMenu();
    if (!userId) return;
    setLoading(true);
    try {
      const { data: plants } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('user_id', userId)
        .limit(1);
      if (!plants?.length) {
        Alert.alert('No Plants', 'Add a plant first.');
        return;
      }

      const { data: reading } = await db.micro
        .from('Controllers')
        .select('*')
        .eq('plant_id', plants[0].id)
        .order('time', { ascending: false })
        .limit(1)
        .single();

      if (reading) {
        setMedia({
          uri: '',
          type: 'sensor',
          name: `${plants[0].nickname} Status`,
          sensorData: reading,
        });
      } else {
        Alert.alert('No Data', 'No sensor data found.');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
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
        finalType = 'sensor';
        const d = media.sensorData;
        finalCaption += `\n\n🌿 Status:\n🌡️ ${d.temperature}°C | 💧 ${d.soil_moisture}%`;
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
      console.error('Post Error:', e);
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
            console.error('Cleanup failed:', removeError);
          } else {
            console.log('Cleanup successful.');
          }
        } catch (cleanupErr) {
          console.error('Cleanup exception:', cleanupErr);
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
                  <View style={styles.previewContent}>
                    <FontAwesome6
                      name={media.type === 'sensor' ? 'leaf' : 'file-lines'}
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.previewText} numberOfLines={1}>
                      {media.name || media.type}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setMedia(null)}>
                    <FontAwesome6 name="xmark" size={16} color={theme.colors.greyedOut} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Media Preview (Video/Image) - 9:16 Aspect Ratio
                <View style={styles.feedPreviewContainer}>
                  {media.type === 'video' ? (
                    <View style={{ flex: 1, position: 'relative' }}>
                      <Video
                        source={{ uri: media.uri }}
                        style={styles.feedMediaImage}
                        resizeMode="cover"
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
                        resizeMode="cover"
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
              <View style={styles.thoughtPreviewContainer}>
                <View style={styles.textCardLarge}>
                  <View style={styles.textBadge}>
                    <Text style={styles.textBadgeText}>Thought</Text>
                  </View>
                  <Text style={styles.previewSubtitle}>Preview</Text>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.textPostContent} numberOfLines={8}>
                      {caption}
                    </Text>
                  </View>
                  <FontAwesome6 name="leaf" size={120} color="#4CA771" style={styles.leafIcon} />
                </View>
              </View>
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
const styles = StyleSheet.create((theme) => ({
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
    backgroundColor: 'rgba(0,0,0,0.1)', // Transparenz bleibt statisch, da es über einem Bild liegt
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
    color: theme.colors.typography, // Weiß im Lightmode, Hellgrau im Darkmode
    fontSize: 18,
    marginLeft: 8,
    fontWeight: '600',
  },

  // Content Container - Feste Position
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
    backgroundColor: theme.colors.surface, // Passt sich an (Weiß vs Dunkelgrau)
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    // Kein Padding Bottom mehr - wird durch flex: 1 geregelt
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
    color: theme.colors.text,
    flexShrink: 1,
    maxWidth: 180,
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    // Falls der Button einen Hintergrund braucht, wäre hier theme.colors.primary sinnvoll
  },
  postButtonText: {
    color: theme.colors.typography,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Input Container - Nur für den TextInput scrollable
  inputContainer: {
    flex: 1, // Nimmt den verfügbaren Platz ein
    marginBottom: 10,
  },
  inputContent: {
    flexGrow: 1,
  },
  input: {
    fontSize: 18,
    color: theme.colors.text,
    textAlignVertical: 'top',
    minHeight: 120,
  },

  // Preview Leiste
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  previewText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },

  // Toolbar - Fest am Boden
  toolbar: {
    marginTop: 'auto', // Wird nach unten geschoben
    borderTopWidth: 1,
    borderTopColor: theme.colors.greyedOut,
    paddingTop: 15,
    paddingBottom: 20, // Sicherheits-Padding
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface, // Fallback, da kein "lightSecondary" definiert ist
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.accent, // Hinzugefügt für bessere Sichtbarkeit im Darkmode
  },
  addAttachmentText: {
    color: theme.colors.accent,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.background, // Kontrast zum Modal Surface
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
    color: theme.colors.text,
  },
  gifIcon: {
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.icon, // Annahme: Icon Border passt zur Icon Farbe
  },
  previewWrapper: {
    marginBottom: 20,
  },
  mediaPreviewContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.background,
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // --- FEED STYLE PREVIEW ---
  feedPreviewContainer: {
    width: '100%',
    height: height * 0.5, // 50% of screen height
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'black',
    marginBottom: 20,
    position: 'relative',
  },
  feedMediaImage: {
    width: '100%',
    height: '100%',
  },
  rightActionsOverlay: {
    position: 'absolute',
    right: 15,
    bottom: 50, // Above bottom
    gap: 20,
    alignItems: 'center',
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  shadowIcon: {
    shadowColor: 'black',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
  },

  // --- THOUGHT BUBBLE PREVIEW ---
  thoughtPreviewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    // Remove background context here to let the card stand out or match video container behavior
    // backgroundColor: '#F0F5F1', 
    padding: 0, // Remove padding to match video container width
    borderRadius: 20,
  },
  textCardLarge: {
    width: '100%',
    height: height * 0.5, // 50% of screen height
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  textBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#F0F5F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  textBadgeText: {
    color: '#4CA771',
    fontWeight: 'bold',
    fontSize: 12,
  },
  previewSubtitle: {
    position: 'absolute',
    top: 25, // Align with badge loosely or right below
    right: 20,
    color: theme.colors.greyedOut,
    fontSize: 12,
    fontWeight: '600',
    zIndex: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  textPostContent: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    color: theme.colors.text,
    zIndex: 5,
  },
  leafIcon: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    opacity: 0.1,
  },

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
  },
  playIconContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  }
}));
