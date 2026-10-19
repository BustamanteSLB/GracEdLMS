import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  ToastAndroid,
} from 'react-native';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string; // Optional middle name
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string; // Optional profile picture
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  author: User;
  date: string;
  body: string;
}

interface AnnouncementModalProps {
  subjectId: string;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
  isAuthenticated?: boolean;
}

const cardStyle = (isDarkMode?: boolean): any => ({
  backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
  borderRadius: 10,
  padding: 16,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
});

/* const sectionHeaderStyle = (isDarkMode?: boolean): any => ({
  fontSize: 18,
  marginBottom: 8,
  color: isDarkMode ? '#E0E0E0' : 'black',
}); */

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  subjectId,
  isDarkMode,
  isAdminOrTeacher,
  isAuthenticated,
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // ─── STATE FOR ANNOUNCEMENTS ───────────────────────────────────────────────
  const [addAnnModalVisible, setAddAnnModalVisible] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnBody, setNewAnnBody] = useState('');

  const [editAnnModalVisible, setEditAnnModalVisible] = useState(false);
  const [editAnnIndex, setEditAnnIndex] = useState<number | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnBody, setEditAnnBody] = useState('');

  // Add loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── FETCH ANNOUNCEMENTS ON MOUNT & AFTER CRUD ─────────────────────────────
  const fetchAnnouncements = async (showLoading = false) => {
    if (showLoading) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await apiClient.get(`/subjects/${subjectId}/announcements`);
      const mapped: Announcement[] = (res.data.data || []).map((a: any) => ({
        _id: a._id,
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
        author: a.author,
        date: a.createdAt,
        body: a.content,
      }));
      setAnnouncements(mapped);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to load announcements.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        ToastAndroid.show('Failed to load announcements.', ToastAndroid.SHORT);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [subjectId]);

  const handleRefresh = () => {
    fetchAnnouncements(true);
  };

  // Helper function to check if current user can edit/delete an announcement
  const canModifyAnnouncement = (announcement: Announcement): boolean => {
    if (!user || !isAuthenticated) return false;
    // Admins can modify any announcement
    if (user.role === 'Admin') return true;
    // Teachers can only modify their own announcements
    if (user.role === 'Teacher') {
      return announcement.author._id === user._id || 
             announcement.author.email === user.email ||
             announcement.author.username === user.username;
    }
    return false;
  };

  // ─── ANNOUNCEMENT CRUD HANDLERS ───────────────────────────────────────────

  const handleAddAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnBody.trim()) return;
    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('You must be logged in to add an announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        Alert.alert('Error', 'You must be logged in to add an announcement.');
      }
      return;
    }
    try {
      await apiClient.post(`/subjects/${subjectId}/announcements`, {
        title: newAnnTitle,
        content: newAnnBody,
      });
      setAddAnnModalVisible(false);
      setNewAnnTitle('');
      setNewAnnBody('');
      fetchAnnouncements(true);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to add announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        ToastAndroid.show('Failed to add announcement.', ToastAndroid.SHORT); 
      }
    }
  };

  const openEditAnnouncementModal = (idx: number) => {
    const announcement = announcements[idx];
    
    // Check if user can modify this announcement
    if (!canModifyAnnouncement(announcement)) {
      const message = 'You can only edit announcements you created.';
      if (Platform.OS === 'web') {
        window.alert(`Access Denied: ${message}`);
      } else {
        Alert.alert('Access Denied', message);
      }
      return;
    }

    setEditAnnIndex(idx);
    setEditAnnTitle(announcement.title || '');
    setEditAnnBody(announcement.body || '');
    setEditAnnModalVisible(true);
  };

  const handleEditAnnouncement = async () => {
    if (editAnnIndex === null || !user) return;
    const toEdit = announcements[editAnnIndex];
    
    // Double check permission before editing
    if (!canModifyAnnouncement(toEdit)) {
      const message = 'You can only edit announcements you created.';
      if (Platform.OS === 'web') {
        window.alert(`Access Denied: ${message}`);
      } else {
        Alert.alert('Access Denied', message);
      }
      setEditAnnModalVisible(false);
      return;
    }

    try {
      await apiClient.put(`/announcements/${toEdit._id}`, {
        title: editAnnTitle,
        content: editAnnBody,
      });
      setEditAnnModalVisible(false);
      setEditAnnIndex(null);
      setEditAnnTitle('');
      setEditAnnBody('');
      fetchAnnouncements(true);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to update announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        Alert.alert('Error', 'Failed to update announcement.');
      }
    }
  };

  const handleDeleteAnnouncement = async (idx: number) => {
    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('You must be logged in to delete an announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        Alert.alert('Error', 'You must be logged in to delete an announcement.');
      }
      return;
    }

    const toDelete = announcements[idx];

    // Check if user can modify this announcement
    if (!canModifyAnnouncement(toDelete)) {
      const message = 'You can only delete announcements you created.';
      if (Platform.OS === 'web') {
        window.alert(`Access Denied: ${message}`);
      } else {
        Alert.alert('Access Denied', message);
      }
      return;
    }

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this announcement?')
      : await new Promise(resolve => {
          Alert.alert(
            'Delete Announcement',
            'Are you sure you want to delete this announcement?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/announcements/${toDelete._id}`);
      fetchAnnouncements(true);
      
      const message = 'Announcement deleted successfully!';
      if (Platform.OS === 'web') {
        window.alert(`Success: ${message}`);
      } else {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      }
    } catch {
      const message = 'Failed to delete announcement.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        ToastAndroid.show(message, ToastAndroid.SHORT);
      }
    }
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  const getProfileBackgroundColor = (name: string): string => {
    // Generate a consistent color based on the user's name
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6366F1', // Indigo
    ];
    
    const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  return (
    <View style={{ padding: 8, flex: 1 }}>
      {/* Header & Add/Refresh Buttons */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text 
          className={`font-pbold mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`} style={{ fontSize: 18 }}
          ellipsizeMode='tail'
          numberOfLines={1}
        >
          Announcements:
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Add Button */}
          {isAdminOrTeacher && isAuthenticated && (
            <TouchableOpacity
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                padding: 8,
              }}
              onPress={() => setAddAnnModalVisible(true)}
            >
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/plus.png')}
                cachePolicy="memory-disk"
                tintColor="white"
              />
            </TouchableOpacity>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefreshing}
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              borderRadius: 8,
              padding: 8,
              opacity: isRefreshing ? 0.6 : 1,
            }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/refresh.png')}
                cachePolicy="memory-disk"
                tintColor='white'
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading announcements...
          </Text>
        </View>
      ) : announcements.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {announcements.map((a, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: idx === announcements.length - 1 ? 0 : 12,
              }}
            >
              <View style={cardStyle(isDarkMode)}>
                {/* Profile circle + name/date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 8,
                      overflow: 'hidden',
                      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                    }}
                  >
                    {a.author.profilePicture ? (
                      <Image
                        style={{ 
                          width: 40, 
                          height: 40,
                          borderRadius: 20,
                        }}
                        source={{ 
                          uri: a.author.profilePicture.startsWith('http') 
                            ? a.author.profilePicture 
                            : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}${a.author.profilePicture}`
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        onError={(error) => {
                          console.log('Failed to load profile picture for user:', a.author.firstName, error);
                        }}
                        onLoad={() => {
                          console.log('Successfully loaded profile picture for:', a.author.firstName);
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: getProfileBackgroundColor(a.author.firstName),
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 'bold',
                            fontFamily: 'Inter-SemiBold',
                          }}
                        >
                          {getInitials(a.author.firstName, a.author.lastName)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    >
                      {a.author.middleName 
                        ? `${a.author.firstName} ${a.author.middleName} ${a.author.lastName}`
                        : `${a.author.firstName} ${a.author.lastName}`
                    }
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(a.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Text
                    className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    style={{
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    {a.title}
                  </Text>
                  {/* Only show edit/delete buttons if user can modify */}
                  {canModifyAnnouncement(a) && (
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => openEditAnnouncementModal(idx)}>
                        <Text 
                          className='font-inter_bold'
                          style={{ color: '#3B82F6' }}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteAnnouncement(idx)}
                        style={{ marginLeft: 12 }}
                      >
                        <Text 
                          className='font-inter_bold'
                          style={{ color: '#EF4444' }}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text 
                  className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  style={{ marginTop: 8 }}
                >
                  {a.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <Image
            source={require('@/assets/images/no_events.png')}
            style={{ width: 64, height: 64, marginBottom: 16 }}
          />
          <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No announcements yet.
          </Text>
        </View>
      )}

      {/* ─── ADD ANNOUNCEMENT MODAL ────────────────────────────────────────── */}
      <Modal
        visible={addAnnModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddAnnModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#23272F' : '#fff',
              borderRadius: 12,
              padding: 24,
              width: 350,
            }}
          >
            <Text
              className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Add Announcement
            </Text>

            <Text
              className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                marginBottom: 4,
              }}
            >
              Title <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="Enter title..."
              value={newAnnTitle}
              onChangeText={setNewAnnTitle}
              className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 4,
                padding: 8,
                marginBottom: 16,
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            />

            <Text
              className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                marginBottom: 4,
              }}
            >
              Body <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="Enter announcement body..."
              value={newAnnBody}
              onChangeText={setNewAnnBody}
              className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
                onPress={() => setAddAnnModalVisible(false)}
                style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8  }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddAnnouncement}
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT ANNOUNCEMENT MODAL ───────────────────────────────────────── */}
      <Modal
        visible={editAnnModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditAnnModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#23272F' : '#fff',
              borderRadius: 12,
              padding: 24,
              width: 350,
            }}
          >
            <Text
              className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Edit Announcement
            </Text>

            <Text
              className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                marginBottom: 4,
              }}
            >
              Title:
            </Text>
            <TextInput
              placeholder="Update title..."
              value={editAnnTitle}
              onChangeText={setEditAnnTitle}
              className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 16,
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            />

            <Text
              className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{
                marginBottom: 4,
              }}
            >
              Body:
            </Text>
            <TextInput
              placeholder="Update body..."
              value={editAnnBody}
              onChangeText={setEditAnnBody}
              className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
                onPress={() => setEditAnnModalVisible(false)}
                style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditAnnouncement}
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AnnouncementModal;
