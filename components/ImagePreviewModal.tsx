import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

interface ImagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  isDarkMode: boolean;
  caption?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  onClose,
  imageUrl,
  isDarkMode,
  caption,
}) => {
  const { width, height } = useWindowDimensions();
  const [isVideo, setIsVideo] = useState(false);

  const maxWidth = width * 0.9;
  const maxHeight = height * 0.8;

  // Detect if URL is video or image
  useEffect(() => {
    const videoExtensions = ['.mp4', '.mpeg', '.quicktime', '.avi', '.webm', '.mov'];
    const isVideoFile = videoExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
    setIsVideo(isVideoFile);
  }, [imageUrl]);

  // Setup video player
  const videoPlayer = useVideoPlayer(
    isVideo ? imageUrl : null,
    player => {
      player.loop = false;
      player.muted = false;
    }
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        edges={['top', 'bottom']}
      >
        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: Platform.OS === 'web' ? 20 : 50,
            right: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <Image
            source={require('@/assets/icons/close.png')}
            style={{ width: 16, height: 16 }}
            tintColor='white'
            alt="Close"
          />
        </TouchableOpacity>

        {/* Media Container */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          maximumZoomScale={isVideo ? 1 : 3}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View
            style={{
              maxWidth: maxWidth,
              maxHeight: maxHeight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isVideo ? (
              <View
                style={{
                  width: maxWidth,
                  height: maxHeight * 0.7,
                  backgroundColor: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <VideoView
                  player={videoPlayer}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  nativeControls
                />
              </View>
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: maxWidth,
                  height: maxHeight,
                }}
                contentFit="contain"
                transition={300}
                alt="Preview"
              />
            )}

            {/* Caption Display */}
            {caption && (
              <View
                style={{
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  maxWidth: maxWidth,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'Inter-Regular',
                    textAlign: 'center',
                  }}
                >
                  {caption}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Media Type Indicator */}
        <View
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'web' ? 20 : 50,
            left: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontFamily: 'Inter-Medium',
            }}
          >
            {isVideo ? '🎥 Video' : '🖼️ Image'}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default ImagePreviewModal;