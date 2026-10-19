import React, { useState, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '@/app/services/apiClient';

interface ImageUploadModalProps {
  visible: boolean;
  onClose: () => void;
  imageType: 'logo' | 'hero' | 'gallery' | 'video';
  onUploadSuccess: () => void;
  isDarkMode: boolean;
  currentCount?: number;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  onClose,
  imageType,
  onUploadSuccess,
  isDarkMode,
  currentCount = 0,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const isVideoUpload = imageType === 'video';
  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 5;
  const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const maxAllowed = isVideoUpload ? MAX_VIDEOS : MAX_IMAGES;
  const remainingSlots = maxAllowed - currentCount;

  const pickFiles = async () => {
    try {
      if (isVideoUpload) {
        // Pick video files
        const result = await DocumentPicker.getDocumentAsync({
          type: 'video/*',
          multiple: remainingSlots > 1,
        });

        if (!result.canceled && result.assets.length > 0) {
          const videoUris = result.assets.map(asset => asset.uri);
          
          // Validate file sizes
          const validVideos: string[] = [];
          for (const uri of videoUris) {
            try {
              const response = await fetch(uri);
              const blob = await response.blob();
              
              if (blob.size > MAX_VIDEO_SIZE) {
                const msg = `Video exceeds 100MB limit. Size: ${(blob.size / (1024 * 1024)).toFixed(2)}MB`;
                if (Platform.OS === 'web') {
                  window.alert(msg);
                } else {
                  Alert.alert('File Too Large', msg);
                }
                continue;
              }
              validVideos.push(uri);
            } catch (error) {
              console.error('Error checking video size:', error);
            }
          }

          if (validVideos.length > 0) {
            setSelectedFiles(validVideos);
          }
        }
      } else {
        // Pick image files
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: imageType !== 'gallery',
          allowsMultipleSelection: imageType === 'gallery' && remainingSlots > 1,
          aspect: imageType === 'logo' ? [1, 1] : imageType === 'hero' ? [16, 9] : [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
          const imageUris = result.assets.map(asset => asset.uri);
          
          // Validate number of images
          if (imageUris.length > remainingSlots) {
            if (Platform.OS === 'web') {
              window.alert(`You can only upload ${remainingSlots} more image(s). Maximum ${MAX_IMAGES} images allowed.`);
            } else {
              Alert.alert(
                'Too Many Images',
                `You can only upload ${remainingSlots} more image(s). Maximum ${MAX_IMAGES} images allowed.`
              );
            }
            return;
          }

          setSelectedFiles(imageUris);
        }
      }
    } catch (error) {
      console.error('Error picking files:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to pick files');
      } else {
        Alert.alert('Error', 'Failed to pick files');
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please select at least one file');
      } else {
        Alert.alert('Error', 'Please select at least one file');
      }
      return;
    }

    try {
      setUploading(true);

      if (isVideoUpload) {
        await uploadVideo();
      } else if (imageType === 'gallery' && selectedFiles.length > 1) {
        await uploadMultipleImages();
      } else {
        await uploadSingleImage();
      }

      setSelectedFiles([]);
      setCaption('');
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload files';
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadSingleImage = async () => {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(selectedFiles[0]);
      const blob = await response.blob();
      formData.append('image', blob, 'image.jpg');
    } else {
      const uriParts = selectedFiles[0].split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: selectedFiles[0],
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
        window.alert(`${imageType.charAt(0).toUpperCase() + imageType.slice(1)} uploaded successfully!`);
      } else {
        Alert.alert('Success', `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} uploaded successfully!`);
      }
    }
  };

  const uploadMultipleImages = async () => {
    const formData = new FormData();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const imageUri = selectedFiles[i];
      
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
        window.alert(message);
      } else {
        Alert.alert('Upload Complete', message);
      }
    }
  };

  const uploadVideo = async () => {
    const formData = new FormData();
    const videoUri = selectedFiles[0];
    
    if (Platform.OS === 'web') {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      formData.append('video', blob, 'video.mp4');
    } else {
      const uriParts = videoUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('video', {
        uri: videoUri,
        name: `video.${fileType}`,
        type: `video/${fileType}`,
      } as any);
    }

    formData.append('caption', caption);

    const response = await apiClient.post('/school/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      if (Platform.OS === 'web') {
        window.alert('Video uploaded successfully!');
      } else {
        Alert.alert('Success', 'Video uploaded successfully!');
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
      case 'video':
        return 'Add Gallery Video';
      default:
        return 'Upload Files';
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
            maxHeight: '85%',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
              marginBottom: 16,
            }}
          >
            {getTitle()}
          </Text>

          {/* Validation Info Box */}
          <View
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#3B82F6',
            }}
          >
            {isVideoUpload ? (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Medium',
                    color: isDarkMode ? '#D1D5DB' : '#374151',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontWeight: 'bold' }}>Videos ({currentCount}/{MAX_VIDEOS})</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4,
                  }}
                >
                  Max file size: 100MB per video
                </Text>
                {remainingSlots <= 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: '#EF4444',
                    }}
                  >
                    Video limit reached. Maximum {MAX_VIDEOS} videos allowed.
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    Remaining slots: {remainingSlots}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Medium',
                    color: isDarkMode ? '#D1D5DB' : '#374151',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontWeight: 'bold' }}>Images ({currentCount}/{MAX_IMAGES})</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4,
                  }}
                >
                  Max file size: 20MB per image
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: '#10B981',
                    marginBottom: 4,
                  }}
                >
                  ✓ Auto-converted to WebP format
                </Text>
                {remainingSlots <= 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: '#EF4444',
                    }}
                  >
                    Image limit reached. Maximum {MAX_IMAGES} images allowed.
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    Remaining slots: {remainingSlots}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* File Previews */}
          {selectedFiles.length > 0 && (
            <ScrollView
              style={{
                marginBottom: 16,
                maxHeight: 250,
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
                {selectedFiles.map((fileUri, index) => (
                  <View
                    key={index}
                    style={{
                      width: imageType === 'gallery' || isVideoUpload ? '48%' : '100%',
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                    }}
                  >
                    {isVideoUpload ? (
                      <View
                        style={{
                          width: '100%',
                          height: 150,
                          backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            fontSize: 12,
                            fontFamily: 'Inter-Medium',
                          }}
                        >
                          Video Selected
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: fileUri }}
                        style={{
                          width: '100%',
                          height: imageType === 'logo' ? 200 : 150,
                        }}
                        contentFit="cover"
                      />
                    )}
                    {(imageType === 'gallery' || isVideoUpload) && (
                      <TouchableOpacity
                        onPress={() => removeFile(index)}
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
                        <Image
                          source={require('@/assets/icons/delete.png')}
                          style={{ width: 14, height: 14 }}
                          tintColor="#FFFFFF"
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Caption Input */}
          {(imageType === 'gallery' || isVideoUpload) && selectedFiles.length === 1 && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                  fontSize: 13,
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
                  fontSize: 14,
                }}
                value={caption}
                onChangeText={setCaption}
                placeholder="Enter caption"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                multiline
              />
            </View>
          )}

          {/* File count info */}
          {selectedFiles.length > 1 && (
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
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={pickFiles}
              disabled={uploading || remainingSlots <= 0}
              style={{
                flex: 1,
                backgroundColor: remainingSlots <= 0 ? '#D1D5DB' : isDarkMode ? '#374151' : '#E5E7EB',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: remainingSlots <= 0 ? '#9CA3AF' : isDarkMode ? '#F9FAFB' : '#111827',
                  fontSize: 16,
                  fontFamily: 'Inter-Bold',
                }}
              >
                {selectedFiles.length > 0 ? 'Change' : 'Select'} {isVideoUpload ? 'Video' : imageType === 'gallery' ? 'Images' : 'Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              style={{
                flex: 1,
                backgroundColor: selectedFiles.length === 0 || uploading ? '#9CA3AF' : '#10B981',
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
                  Upload {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
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