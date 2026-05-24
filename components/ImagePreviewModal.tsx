import React from 'react';
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

interface ImagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  isDarkMode: boolean;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  onClose,
  imageUrl,
  isDarkMode,
}) => {
  const { width, height } = useWindowDimensions();

  // Calculate image dimensions to fit screen while maintaining aspect ratio
  const maxWidth = width * 0.9;
  const maxHeight = height * 0.8;

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
          />
        </TouchableOpacity>

        {/* Image Container */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          maximumZoomScale={3}
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
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: maxWidth,
                height: maxHeight,
              }}
              contentFit="contain"
              transition={300}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default ImagePreviewModal;