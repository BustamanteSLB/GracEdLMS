import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '@/app/services/apiClient';

interface ImageUploadModalProps {
  visible: boolean;
  onClose: () => void;
  imageType: 'logo' | 'hero' | 'gallery';
  onUploadSuccess: () => void;
  isDarkMode: boolean;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  onClose,
  imageType,
  onUploadSuccess,
  isDarkMode,
}) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: imageType !== 'gallery', // Only allow editing for single images (logo/hero)
        allowsMultipleSelection: imageType === 'gallery', // Allow multiple selection for gallery
        aspect: imageType === 'logo' ? [1, 1] : imageType === 'hero' ? [16, 9] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (imageType === 'gallery') {
          // Multiple images for gallery
          const imageUris = result.assets.map(asset => asset.uri);
          setSelectedImages(imageUris);
        } else {
          // Single image for logo/hero
          setSelectedImages([result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      if (Platform.OS === 'web') {
        alert('Failed to pick images');
      } else {
        Alert.alert('Error', 'Failed to pick images');
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one image');
      } else {
        Alert.alert('Error', 'Please select at least one image');
      }
      return;
    }

    try {
      setUploading(true);

      if (imageType === 'gallery' && selectedImages.length > 1) {
        // Upload multiple images
        await uploadMultipleImages();
      } else {
        // Upload single image
        await uploadSingleImage();
      }

      setSelectedImages([]);
      setCaption('');
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading images:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload images';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadSingleImage = async () => {
    const formData = new FormData();
    
    // For web
    if (Platform.OS === 'web') {
      const response = await fetch(selectedImages[0]);
      const blob = await response.blob();
      formData.append('image', blob, 'image.jpg');
    } else {
      // For mobile
      const uriParts = selectedImages[0].split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: selectedImages[0],
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    formData.append('imageType', imageType);
    
    if (imageType === 'gallery') {
      formData.append('caption', caption);
    }

    const response = await apiClient.post('/school/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      if (Platform.OS === 'web') {
        alert(`${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image uploaded successfully!`);
      } else {
        Alert.alert('Success', `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image uploaded successfully!`);
      }
    }
  };

  const uploadMultipleImages = async () => {
    const formData = new FormData();
    
    // Add all images to formData
    for (let i = 0; i < selectedImages.length; i++) {
      const imageUri = selectedImages[i];
      
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('images', blob, `image_${i}.jpg`);
      } else {
        const uriParts = imageUri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('images', {
          uri: imageUri,
          name: `photo_${i}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }
    }

    const response = await apiClient.post('/school/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      const { uploadedCount, failedCount } = response.data.data;
      const message = failedCount > 0
        ? `Uploaded ${uploadedCount} image(s). ${failedCount} failed.`
        : `Successfully uploaded ${uploadedCount} image(s)!`;
      
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Upload Complete', message);
      }
    }
  };

  const getTitle = () => {
    switch (imageType) {
      case 'logo':
        return 'Upload School Logo';
      case 'hero':
        return 'Upload Hero Image';
      case 'gallery':
        return 'Add Gallery Images';
      default:
        return 'Upload Images';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            width: '90%',
            maxWidth: 600,
            maxHeight: '80%',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
              marginBottom: 20,
            }}
          >
            {getTitle()}
          </Text>

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <ScrollView
              style={{
                marginBottom: 16,
                maxHeight: 300,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {selectedImages.map((imageUri, index) => (
                  <View
                    key={index}
                    style={{
                      width: imageType === 'gallery' ? '48%' : '100%',
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                    }}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: '100%',
                        height: imageType === 'logo' ? 200 : 150,
                      }}
                      contentFit="cover"
                    />
                    {imageType === 'gallery' && (
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          borderRadius: 4,
                          width: 24,
                          height: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Caption Input (for single gallery image only) */}
          {imageType === 'gallery' && selectedImages.length === 1 && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                }}
              >
                Caption (Optional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  fontFamily: 'Inter-Regular',
                }}
                value={caption}
                onChangeText={setCaption}
                placeholder="Enter image caption"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                multiline
              />
            </View>
          )}

          {/* Image count info */}
          {selectedImages.length > 1 && (
            <View
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#E3F2FD',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? '#60A5FA' : '#1976D2',
                  fontSize: 14,
                  fontFamily: 'Inter-Medium',
                  textAlign: 'center',
                }}
              >
                {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={pickImages}
              disabled={uploading}
              style={{
                flex: 1,
                backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  fontSize: 16,
                  fontFamily: 'Inter-Bold',
                }}
              >
                {selectedImages.length > 0 ? 'Change' : 'Select'} {imageType === 'gallery' ? 'Images' : 'Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={selectedImages.length === 0 || uploading}
              style={{
                flex: 1,
                backgroundColor: selectedImages.length === 0 || uploading ? '#9CA3AF' : '#10B981',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontFamily: 'Inter-Bold',
                  }}
                >
                  Upload {selectedImages.length > 1 ? `(${selectedImages.length})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            disabled={uploading}
            style={{
              backgroundColor: '#EF4444',
              padding: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Inter-Bold',
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ImageUploadModal;