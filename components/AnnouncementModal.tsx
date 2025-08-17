import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
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

  // ─── FETCH ANNOUNCEMENTS ON MOUNT & AFTER CRUD ─────────────────────────────
  const fetchAnnouncements = async () => {
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
        Alert.alert('Error', 'Failed to load announcements.');
      }
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [subjectId]);

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
      fetchAnnouncements();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to add announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        Alert.alert('Error', 'Failed to add announcement.');
      }
    }
  };

  const openEditAnnouncementModal = (idx: number) => {
    setEditAnnIndex(idx);
    setEditAnnTitle(announcements[idx]?.title || '');
    setEditAnnBody(announcements[idx]?.body || '');
    setEditAnnModalVisible(true);
  };

  const handleEditAnnouncement = async () => {
    if (editAnnIndex === null || !user) return;
    const toEdit = announcements[editAnnIndex];
    try {
      await apiClient.put(`/announcements/${toEdit._id}`, {
        title: editAnnTitle,
        content: editAnnBody,
      });
      setEditAnnModalVisible(false);
      setEditAnnIndex(null);
      setEditAnnTitle('');
      setEditAnnBody('');
      fetchAnnouncements();
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
    try {
      await apiClient.delete(`/announcements/${toDelete._id}`);
      fetchAnnouncements();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to delete announcement.');
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios'){
        Alert.alert('Error', 'Failed to delete announcement.');
      }
    }
  };

  return (
    <View style={{ padding: 8, flex: 1 }}>
      {/* Header & Add Button */}
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
              tintColor={isDarkMode ? '#E0E0E0' : 'white'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {announcements.length > 0 ? (
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
                  <Image
                    style={{ width: 40, height: 40, marginRight: 8 }}
                    source={a.author.profilePicture ? { uri: a.author.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                  />
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
                  {isAdminOrTeacher && isAuthenticated && (
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
        <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No announcements.
        </Text>
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
              Title:
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
              Body:
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
