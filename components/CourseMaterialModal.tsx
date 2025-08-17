// components/CourseMaterialModal.tsx

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
  VirtualizedList,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { FlashList } from '@shopify/flash-list';
import * as DocumentPicker from 'expo-document-picker';
import DeleteIcon from '@/assets/icons/delete.svg';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import ContextMenu from './ContextMenu';

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
}

interface CourseMaterial {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedBy: User;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
}

interface CourseMaterialModalProps {
  subjectId: string;
  teacher: User;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
}

const CourseMaterialModal: React.FC<CourseMaterialModalProps> = ({
  subjectId,
  teacher,
  isDarkMode,
  isAdminOrTeacher,
}) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { height } = useWindowDimensions();

  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCourseMaterial, setSelectedCourseMaterial] = useState<CourseMaterial | null>(null);

  // For viewing course materials
  const [viewMaterialModalVisible, setViewMaterialModalVisible] = useState(false);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<CourseMaterial | null>(null);

  // context menu
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });

  const contextMenuItems = [
    {
      label: 'View',
      icon: (
        <Image
          style={{ width: 24, height: 24, marginRight: 4 }}
          source={require('@/assets/icons/show_password.png')}
          tintColor={isDarkMode ? '#E0E0E0' : 'black'}
        />
      ),
      onPress: () => {
        if (selectedCourseMaterial) {
          handleViewMaterial(selectedCourseMaterial);
        }
      },
    },
    ...(isAdminOrTeacher
      ? [
          {
            label: 'Delete',
            icon: (
              <DeleteIcon
                width={24}
                height={24}
                style={{ marginRight: 4 }}
                fill="red"
              />
            ),
            onPress: () => {
              if (selectedCourseMaterial) {
                handleDeleteMaterial(selectedCourseMaterial._id);
              }
            },
          },
        ]
      : []),
  ];
  
  const openContextMenu = (e: any, mat: CourseMaterial) => {
    const { pageX, pageY } = e.nativeEvent;
    setContextMenuCoords({ x: pageX - 115, y: pageY - 275 });
    setSelectedCourseMaterial(mat);
    setContextMenuVisible(true);
  };

  const handleViewMaterial = (mat: CourseMaterial) => {
    setSelectedMaterialForView(mat);
    setViewMaterialModalVisible(true);
    setContextMenuVisible(false);
  };

  const getFilePreviewUrl = (mat: CourseMaterial) => {
    if (!mat.fileUrl) return null;
    return `http://192.168.100.5:5000/${mat.fileUrl}`;
    // Change this to your actual server IP address
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/subjects/${subjectId}/courseMaterials`);
      setMaterials(res.data.data || []);
    } catch {
      console.warn('Failed loading course materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [subjectId]);

  const pickDocuments = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.json,.html,.css,.js,.md,.xml';
        input.multiple = true;
        
        return new Promise((resolve) => {
          input.onchange = (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files) {
              const fileArray = Array.from(files);
              const validFiles = fileArray.filter(file => {
                const validTypes = [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'image/jpeg',
                  'image/png',
                  'image/gif',
                  'image/jpg',
                  'text/plain',
                  'text/csv',
                  'application/json',
                  'text/html',
                  'text/css',
                  'text/javascript',
                  'application/javascript',
                ];
                return validTypes.includes(file.type);
              });
              
              if (validFiles.length !== fileArray.length) {
                window.alert('Some files were filtered out. Only PDF, Word, PowerPoint, Excel, image, and text files are allowed.');
              }
              
              setSelectedFiles(validFiles);
            }
            resolve(files);
          };
          
          input.click();
        });
      } else {
        // React Native file picking
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain',
          'text/csv',
          'application/json',
          'text/html',
          'text/css',
          'text/javascript',
        ];

        const result = await DocumentPicker.getDocumentAsync({
          type: allowedMimeTypes,
          multiple: true,
        });

        if (result.canceled === false) {
          setSelectedFiles(result.assets);
        }
      }
    } catch (err) {
      console.log('Document picking cancelled or failed.', err);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to pick documents.');
      } else {
        Alert.alert('Error', 'Failed to pick documents.');
      }
    }
  };

  const handleUploadMaterials = async () => {
    if (selectedFiles.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please select at least one file.');
      } else {
        Alert.alert('Missing', 'Please select at least one file.');
      }
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      selectedFiles.forEach((file, index) => {
        if (Platform.OS === 'web') {
          formData.append('materialFiles', file);
        } else {
          formData.append('materialFiles', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType,
          } as any);
        }
      });
      
      const response = await apiClient.post(`/subjects/${subjectId}/courseMaterials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.success) {
        const { created, replaced, errors } = response.data.data;
        let message = response.data.message;
        
        if (errors && errors.length > 0) {
          message += `\n\nFailed files:\n${errors.map((e: { fileName: any; error: any; }) => `- ${e.fileName}: ${e.error}`).join('\n')}`;
        }
        
        if (Platform.OS === 'web') {
          window.alert(`Success: ${message}`);
        } else {
          Alert.alert('Success', message);
        }
        
        setSelectedFiles([]);
        fetchMaterials();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!user) {
      const message = 'You must be logged in to delete course materials.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this course material? This action cannot be undone.');

      if (confirmDelete) {
        try {
          await apiClient.delete(`/courseMaterials/${materialId}`);
          window.alert('Success: Course material deleted successfully.');
          setContextMenuVisible(false);
          setSelectedCourseMaterial(null);
          fetchMaterials();
        } catch (error: any) {
          console.error('Delete error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to delete course material.';
          window.alert(`Error: ${errorMessage}`);
          setContextMenuVisible(false);
        }
      } else {
        setContextMenuVisible(false);
      }
    } else {
      Alert.alert(
        'Delete Course Material',
        'Are you sure you want to delete this course material? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setContextMenuVisible(false),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await apiClient.delete(`/courseMaterials/${materialId}`);
                Alert.alert('Success', 'Course material deleted successfully.');
                setContextMenuVisible(false);
                setSelectedCourseMaterial(null);
                fetchMaterials();
              } catch (error: any) {
                console.error('Delete error:', error);
                const errorMessage = error.response?.data?.message || 'Failed to delete course material.';
                Alert.alert('Error', errorMessage);
                setContextMenuVisible(false);
              }
            },
          },
        ]
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return require('@/assets/icons/pdf.png');
      case 'doc':
        return require('@/assets/icons/word_file.png');
      case 'docx':
        return require('@/assets/icons/word_file.png');
      case 'ppt':
        return require('@/assets/icons/powerpoint.png');
      case 'pptx':
        return require('@/assets/icons/powerpoint.png');
      case 'xls':
        return require('@/assets/icons/excel_file.png');
      case 'xlsx':
        return require('@/assets/icons/excel_file.png');
      case 'jpg':
        return require('@/assets/icons/image-document.png');
      case 'jpeg':
        return require('@/assets/icons/image-document.png');
      case 'png':
        return require('@/assets/icons/image-document.png');
      case 'gif':
        return require('@/assets/icons/image-document.png');
      case 'txt':
        return require('@/assets/icons/text_file.png');
      case 'csv':
        return require('@/assets/icons/csv_file.png');
      case 'json':
        return require('@/assets/icons/json_file.png');
      case 'html':
        return require('@/assets/icons/html_file.png');
      case 'css':
        return require('@/assets/icons/css_file.png');
      case 'js':
        return require('@/assets/icons/javascript.png');
      case 'md':
        return require('@/assets/icons/md_file.png');
      case 'xml':
        return require('@/assets/icons/xml_file.png');
      default:
        return require('@/assets/icons/file.png');
    }
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  // VirtualizedList helpers for web
  const getItemCount = (data: CourseMaterial[]) => data.length;
  const getItem = (data: CourseMaterial[], index: number) => data[index];

  // Render item component for both lists
  const renderMaterialItem = ({ item }: { item: CourseMaterial }) => (
    <TouchableOpacity
      onPress={() => handleViewMaterial(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F7F9',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#E0E0E0',
        marginHorizontal: 4,
        marginVertical: 2,
        borderRadius: 8,
      }}
    >
      <Image
        style={{ width: 32, height: 32, marginRight: 12 }}
        source={getFileIcon(item.fileType)}
        tintColor={isDarkMode ? '#E0E0E0' : '#666'}
      />
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          className={`font-inter_medium text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
          ellipsizeMode='tail'
          numberOfLines={1}
        >
          {item.fileName}
        </Text>
        <Text
          className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          ellipsizeMode='tail'
          numberOfLines={1}
        >
          {item.fileType?.toUpperCase()} • {item.fileSize && item.fileSize > 0 ? formatFileSize(item.fileSize) : 'Unknown size'}
        </Text>
        <Text
          className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
          ellipsizeMode='tail'
          numberOfLines={1}
        >
          Added by {item.uploadedBy.firstName} {item.uploadedBy.lastName} • {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable 
        onPress={(e) => openContextMenu(e, item)}
        style={{ padding: 8 }}
      >
        <Image
          source={require('@/assets/icons/more_vert.png')}
          style={{
            width: 20,
            height: 20,
            tintColor: isDarkMode ? '#E0E0E0' : '#666',
          }}
        />
      </Pressable>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 8 }}>
      {/* Header */}
      <View className='flex-row justify-between items-center mb-4'>
        <Text className={`font-pbold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Course Materials
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {isAdminOrTeacher && (
            <TouchableOpacity
              style={{ backgroundColor: '#A78BFA', padding: 8, borderRadius: 8, marginRight: 4 }}
              onPress={pickDocuments}
            >
              <Image
                source={require('@/assets/icons/add_file.png')}
                style={{ width: 24, height: 24 }}
                tintColor="white"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', padding: 8, borderRadius: 8 }}
            onPress={fetchMaterials}
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <View style={{ 
          backgroundColor: isDarkMode ? '#1E1E1E' : '#F0F8FF', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333' : '#E0E0E0'
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Selected Files ({selectedFiles.length})
            </Text>
            <TouchableOpacity onPress={clearSelectedFiles}>
              <Text className='text-red-500 font-inter_semibold'>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 120 }}>
            {selectedFiles.map((file, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Image
                  source={getFileIcon(file.name?.split('.').pop())}
                  style={{ width: 16, height: 16, marginRight: 8 }}
                  tintColor={isDarkMode ? '#E0E0E0' : 'black'}
                />
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {file.name}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={handleUploadMaterials}
            disabled={uploading}
            style={{
              backgroundColor: uploading ? '#9CA3AF' : '#10B981',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 8
            }}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-pbold text-white">
                Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Materials List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size='large' color={isDarkMode ? '#E0E0E0' : 'black'} />
          <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Loading materials...
          </Text>
          </View>
      ) : materials.length > 0 ? (
        Platform.OS === 'web' ? (
          // Use VirtualizedList for web
          <VirtualizedList
            data={materials}
            initialNumToRender={10}
            renderItem={renderMaterialItem}
            keyExtractor={(item) => item._id}
            getItemCount={getItemCount}
            getItem={getItem}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          // Use FlashList for mobile
          <FlashList
            data={materials}
            renderItem={renderMaterialItem}
            keyExtractor={(item) => item._id}
            estimatedItemSize={80}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={require('@/assets/icons/file.png')}
            style={{ width: 64, height: 64, marginBottom: 16 }}
            tintColor={isDarkMode ? '#666' : '#999'}
          />
          <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            No course materials added yet.
          </Text>
          <Text className={`font-inter_regular text-center text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Supported formats: PDF, Word, PowerPoint, Excel, Images, and Text files
          </Text>
          {isAdminOrTeacher && (
            <TouchableOpacity
              onPress={pickDocuments}
              style={{
                backgroundColor: '#A78BFA',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                marginTop: 16
              }}
            >
              <Text className="font-pbold text-white">Add Files</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuCoords.x}
        y={contextMenuCoords.y}
        onClose={() => setContextMenuVisible(false)}
        items={contextMenuItems}
        menuStyle={{ backgroundColor: isDarkMode ? '#333' : 'white', borderRadius: 8 }}
        itemStyle={{ paddingVertical: 10, paddingHorizontal: 15 }}
        labelStyle={{ color: isDarkMode ? '#E0E0E0' : 'black', fontSize: 14, fontFamily: 'Inter-18pt-Regular' }}
      />

      {/* VIEW COURSE MATERIAL MODAL */}
      <Modal
        visible={viewMaterialModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewMaterialModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          {selectedMaterialForView && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: isDarkMode ? '#121212' : '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    className={`font-pbold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    numberOfLines={1}
                  >
                    {selectedMaterialForView.fileName}
                  </Text>
                  <Text
                    className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {selectedMaterialForView.fileType?.toUpperCase()} • {selectedMaterialForView.fileSize ? formatFileSize(selectedMaterialForView.fileSize) : 'Unknown size'}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => {
                      const downloadUrl = getFilePreviewUrl(selectedMaterialForView);
                      if (downloadUrl) {
                        if (Platform.OS === 'web') {
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = selectedMaterialForView.fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          // For mobile, open with external app or download
                          Linking.openURL(downloadUrl).catch(err => {
                            Alert.alert('Error', 'Cannot download file');
                          });
                        }
                      }
                    }}
                    style={{
                      backgroundColor: '#3B82F6',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 6,
                      marginRight: 12,
                    }}
                  >
                    <Text className="font-pbold text-white text-sm">Download</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setViewMaterialModalVisible(false)}
                    style={{ 
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text className='font-pbold text-white text-sm'>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                {(() => {
                  const fileUrl = getFilePreviewUrl(selectedMaterialForView);
                  const fileType = selectedMaterialForView.fileType?.toLowerCase();

                  if (!fileUrl) {
                    return (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                        <Image
                          style={{ width: 64, height: 64, marginBottom: 16 }}
                          source={require('@/assets/icons/file.png')}
                          tintColor={isDarkMode ? '#666' : '#999'}
                        />
                        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          File not available for preview
                        </Text>
                      </View>
                    );
                  }

                  if (Platform.OS === 'web') {
                    // Web implementation
                    if (fileType === 'pdf') {
                      return (
                        <iframe
                          src={fileUrl}
                          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }}
                          title={selectedMaterialForView.fileName}
                        />
                      );
                    }

                    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '')) {
                      return (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                          <img
                            src={fileUrl}
                            alt={selectedMaterialForView.fileName}
                            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }}
                          />
                        </View>
                      );
                    }

                    if (['txt', 'csv', 'json', 'html', 'css', 'js', 'md', 'xml'].includes(fileType || '')) {
                      return (
                        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                          <iframe
                            src={fileUrl}
                            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }}
                            title={selectedMaterialForView.fileName}
                          />
                        </View>
                      );
                    }

                    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileType || '')) {
                      return (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', padding: 24 }}>
                          <Image
                            style={{ width: 96, height: 96, marginBottom: 24 }}
                            source={getFileIcon(fileType || '')}
                            tintColor={isDarkMode ? '#666' : '#999'}
                          />
                          <Text className={`font-inter_semibold text-lg text-center mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            {selectedMaterialForView.fileName}
                          </Text>
                          <Text className={`font-inter_regular text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            This file type cannot be previewed directly in the browser.{'\n'}
                            Click "Open in New Tab" to view with your browser's default viewer.
                          </Text>
                          <TouchableOpacity
                            onPress={() => window.open(fileUrl, '_blank')}
                            style={{ backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}
                          >
                            <Text className="font-pbold text-white">Open in New Tab</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                        <Image
                          style={{ width: 64, height: 64, marginBottom: 16 }}
                          source={require('@/assets/icons/file.png')}
                          tintColor={isDarkMode ? '#666' : '#999'}
                        />
                        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Preview not available for this file type.{'\n'}Use the download button to view the file.
                        </Text>
                      </View>
                    );
                  } else {
                    // Mobile implementation using WebView and Linking
                    if (['pdf', 'txt', 'csv', 'json', 'html', 'css', 'js', 'md', 'xml'].includes(fileType || '')) {
                      return (
                        <WebView
                          source={{ uri: fileUrl }}
                          style={{ flex: 1, backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }}
                          startInLoadingState={true}
                          renderLoading={() => (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                              <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#666'} />
                              <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Loading file...
                              </Text>
                            </View>
                          )}
                          onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView error: ', nativeEvent);
                            Alert.alert(
                              'Preview Error',
                              'Unable to preview this file. Would you like to open it with an external app?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Open External', 
                                  onPress: () => Linking.openURL(fileUrl).catch(err => 
                                    Alert.alert('Error', 'Cannot open file with external app')
                                  )
                                }
                              ]
                            );
                          }}
                        />
                      );
                    }

                    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '')) {
                      return (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}>
                          <Image
                            source={{ uri: fileUrl }}
                            style={{ 
                              width: width * 0.9, 
                              height: height * 0.6, 
                              resizeMode: 'contain',
                              borderRadius: 8
                            }}
                            onError={() => {
                              Alert.alert(
                                'Image Error',
                                'Unable to load this image. Would you like to open it with an external app?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Open External', 
                                    onPress: () => Linking.openURL(fileUrl).catch(err => 
                                      Alert.alert('Error', 'Cannot open file with external app')
                                    )
                                  }
                                ]
                              );
                            }}
                          />
                        </View>
                      );
                    }

                    // For Office files and other non-previewable types
                    return (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', padding: 24 }}>
                        <Image
                          style={{ width: 96, height: 96, marginBottom: 24 }}
                          source={getFileIcon(fileType || '')}
                          tintColor={isDarkMode ? '#666' : '#999'}
                        />
                        <Text className={`font-inter_semibold text-lg text-center mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          {selectedMaterialForView.fileName}
                        </Text>
                        <Text className={`font-inter_regular text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          This file type cannot be previewed directly.{'\n'}
                          Tap "Open External" to view with an external app.
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            Linking.openURL(fileUrl).catch(err => {
                              console.error('Cannot open file:', err);
                              Alert.alert('Error', 'Cannot open file with external app. Please try downloading instead.');
                            });
                          }}
                          style={{ backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}
                        >
                          <Text className="font-pbold text-white">Open External</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            // For mobile, we can trigger a download by opening the URL
                            Linking.openURL(fileUrl).catch(err => {
                              Alert.alert('Error', 'Cannot download file');
                            });
                          }}
                          style={{ backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                        >
                          <Text className="font-pbold text-white">Download</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                })()}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default CourseMaterialModal;
