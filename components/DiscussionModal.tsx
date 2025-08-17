import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

interface Comment {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
}

interface Discussion {
  _id: string;
  title: string;
  content: string;
  comments: Comment[];
  createdAt: string;
  author: User;
  date: string;
  body: string;
}

interface DiscussionModalProps {
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

const DiscussionModal: React.FC<DiscussionModalProps> = ({
  subjectId,
  isDarkMode,
  isAdminOrTeacher,
  isAuthenticated,
}) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // ─── STATE FOR DISCUSSIONS & COMMENTS ─────────────────────────────────────
  const [addDiscModalVisible, setAddDiscModalVisible] = useState(false);
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscBody, setNewDiscBody] = useState('');

  const [editDiscModalVisible, setEditDiscModalVisible] = useState(false);
  const [editDiscIndex, setEditDiscIndex] = useState<number | null>(null);
  const [editDiscTitle, setEditDiscTitle] = useState('');
  const [editDiscBody, setEditDiscBody] = useState('');

  const [activeCommentingDiscId, setActiveCommentingDiscId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');

  // ─── FETCH DISCUSSIONS ON MOUNT & AFTER CRUD ───────────────────────────────
  const fetchDiscussions = async () => {
    try {
      const res = await apiClient.get(`/subjects/${subjectId}/discussions`);
      const mapped: Discussion[] = (res.data.data || []).map((d: any) => ({
        _id: d._id,
        title: d.title,
        content: d.content,
        comments: d.comments || [],
        createdAt: d.createdAt,
        author: d.author,
        date: d.createdAt,
        body: d.content,
      }));
      setDiscussions(mapped);
    } catch {
      Alert.alert('Error', 'Failed to load discussions.');
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [subjectId]);

  // ─── DISCUSSION CRUD HANDLERS ─────────────────────────────────────────────

  const handleAddDiscussion = async () => {
    if (!newDiscTitle.trim() || !newDiscBody.trim()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a discussion.');
      return;
    }
    try {
      await apiClient.post(`/subjects/${subjectId}/discussions`, {
        title: newDiscTitle,
        content: newDiscBody,
      });
      setAddDiscModalVisible(false);
      setNewDiscTitle('');
      setNewDiscBody('');
      fetchDiscussions();
    } catch {
      Alert.alert('Error', 'Failed to add discussion.');
    }
  };

  const openEditDiscussionModal = (idx: number) => {
    setEditDiscIndex(idx);
    setEditDiscTitle(discussions[idx]?.title || '');
    setEditDiscBody(discussions[idx]?.content || '');
    setEditDiscModalVisible(true);
  };

  const handleEditDiscussion = async () => {
    if (editDiscIndex === null || !user) return;
    const toEdit = discussions[editDiscIndex];
    try {
      await apiClient.put(`/discussions/${toEdit._id}`, {
        title: editDiscTitle,
        content: editDiscBody,
      });
      setEditDiscModalVisible(false);
      setEditDiscIndex(null);
      setEditDiscTitle('');
      setEditDiscBody('');
      fetchDiscussions();
    } catch {
      Alert.alert('Error', 'Failed to update discussion.');
    }
  };

  const handleDeleteDiscussion = async (idx: number) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to delete a discussion.');
      return;
    }
    const toDelete = discussions[idx];
    try {
      await apiClient.delete(`/discussions/${toDelete._id}`);
      fetchDiscussions();
    } catch {
      Alert.alert('Error', 'Failed to delete discussion.');
    }
  };

  // ─── COMMENT HANDLERS ─────────────────────────────────────────────────────

  const handleAddComment = async (discussionId: string) => {
    if (!commentBody.trim() || !user) return;
    try {
      await apiClient.post(`/discussions/${discussionId}/comments`, {
        content: commentBody,
      });
      setCommentBody('');
      setActiveCommentingDiscId(null);
      fetchDiscussions(); // Refresh to get updated comments
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  // Helper function to check if user can delete a comment
  const canDeleteComment = (comment: Comment, discussion: Discussion): boolean => {
    if (!user || !isAuthenticated) return false;
    
    console.log('Checking delete permission:', {
      userId: user._id,
      commentAuthorId: comment.author._id,
      userRole: user.role,
      isAdminOrTeacher
    });
    
    // Any authenticated user can delete their own comment
    if (comment.author._id === user._id) return true;
    
    // Discussion author can delete comments on their discussion
    if (discussion.author._id === user._id) return true;
    
    // Admin and teachers can delete any comment
    if (user.role === 'Admin' || user.role === 'Teacher') return true;
    
    return false;
  };

  const handleDeleteComment = async (discussionId: string, commentId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to delete a comment.');
      return;
    }
    
    console.log('Attempting to delete comment:', {
      discussionId,
      commentId,
      userId: user._id,
      userRole: user.role
    });
    
    // Add confirmation dialog
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Making DELETE request to:', `/discussions/${discussionId}/comments/${commentId}`);
              
              const response = await apiClient.delete(`/discussions/${discussionId}/comments/${commentId}`);
              
              console.log('Delete response:', response.data);
              
              Alert.alert('Success', 'Comment deleted successfully.');
              await fetchDiscussions(); // Refresh to get updated comments
            } catch (error: any) {
              console.error('Error deleting comment:', {
                error: error.response?.data || error.message,
                status: error.response?.status,
                config: error.config
              });
              
              const errorMessage = error.response?.data?.message || 'Failed to delete comment.';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ],
    );
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
          Discussions:
        </Text>
        {isAdminOrTeacher && isAuthenticated && (
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-green-600' : 'bg-green-500'}`}
            style={{
              borderRadius: 8,
              padding: 8,
            }}
            onPress={() => setAddDiscModalVisible(true)}
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
      {discussions.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {discussions.map((d, idx) => (
            <View key={idx} style={{ marginBottom: 12 }}>
              <View style={cardStyle(isDarkMode)}>
                {/* Profile circle + author/date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Image
                    style={{ width: 40, height: 40, marginRight: 8 }}
                    source={d.author.profilePicture ? { uri: d.author.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    >
                      {d.author.middleName 
                        ? `${d.author.firstName} ${d.author.middleName} ${d.author.lastName}`
                        : `${d.author.firstName} ${d.author.lastName}`
                      }
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(d.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Title & Actions */}
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
                    {d.title}
                  </Text>
                  {isAdminOrTeacher && isAuthenticated && (
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => openEditDiscussionModal(idx)}>
                        <Text 
                          className='font-inter_bold'
                          style={{ color: '#3B82F6' }}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteDiscussion(idx)}
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

                {/* Body */}
                <Text
                  className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  style={{
                    marginTop: 8,
                  }}
                >
                  {d.body}
                </Text>

                {/* Comments */}
                <View style={{ marginTop: 12 }}>
                  <Text
                    className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    Comments:
                  </Text>

                  {d.comments && d.comments.length > 0 ? (
                    d.comments.map((comment) => (
                      <View
                        key={comment._id}
                        style={{
                          backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
                          borderRadius: 6,
                          padding: 8,
                          marginBottom: 6,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text
                              className={`font-inter_semibold text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                              style={{ marginBottom: 2 }}
                            >
                              {comment.author.middleName 
                                ? `${comment.author.firstName} ${comment.author.middleName} ${comment.author.lastName}`
                                : `${comment.author.firstName} ${comment.author.lastName}`
                              }
                            </Text>
                            <Text
                              className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                            >
                              {comment.content}
                            </Text>
                            <Text
                              className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
                              style={{ marginTop: 2 }}
                            >
                              {new Date(comment.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          {/* Show delete button if user can delete this comment */}
                          {canDeleteComment(comment, d) && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(d._id, comment._id)}
                              style={{ 
                                marginLeft: 8,
                                padding: 4,
                              }}
                            >
                              <Text
                                className='font-inter_bold text-xs'
                                style={{ color: '#EF4444' }}
                              >
                                Delete
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text
                      className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                      style={{ fontStyle: 'italic' }}
                    >
                      No comments yet. Be the first to comment!
                    </Text>
                  )}
                </View>

                {/* Add Comment Input - Show for all authenticated users */}
                {isAuthenticated && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      placeholder="Add a comment..."
                      value={activeCommentingDiscId === d._id ? commentBody : ''}
                      onChangeText={(text) => {
                        setActiveCommentingDiscId(d._id);
                        setCommentBody(text);
                      }}
                      className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
                      style={{
                        borderWidth: 1,
                        borderColor: '#ccc',
                        borderRadius: 8,
                        padding: 8,
                        marginBottom: 8,
                        minHeight: 40,
                      }}
                      placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                      multiline
                    />
                    <TouchableOpacity
                      style={{
                        alignSelf: 'flex-end',
                        backgroundColor: activeCommentingDiscId === d._id && commentBody.trim() ? '#3B82F6' : '#9CA3AF',
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      }}
                      onPress={() => handleAddComment(d._id)}
                      disabled={!commentBody.trim() || activeCommentingDiscId !== d._id}
                    >
                      <Text className={`font-pbold text-sm text-white`}>
                        Post Comment
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No discussions.
        </Text>
      )}

      {/* ─── ADD DISCUSSION MODAL ────────────────────────────────────────── */}
      <Modal
        visible={addDiscModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddDiscModalVisible(false)}
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
              Add Discussion
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
              value={newDiscTitle}
              onChangeText={setNewDiscTitle}
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
              placeholder="Enter discussion body..."
              value={newDiscBody}
              onChangeText={setNewDiscBody}
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
                onPress={() => setAddDiscModalVisible(false)}
                style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8  }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddDiscussion}
                className={`${isDarkMode ? 'bg-green-600' : 'bg-green-500'}`}
                style={{
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

      {/* ─── EDIT DISCUSSION MODAL ───────────────────────────────────────── */}
      <Modal
        visible={editDiscModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditDiscModalVisible(false)}
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
              Edit Discussion
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
              value={editDiscTitle}
              onChangeText={setEditDiscTitle}
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
              placeholder="Update discussion body..."
              value={editDiscBody}
              onChangeText={setEditDiscBody}
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
                onPress={() => setEditDiscModalVisible(false)}
                style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8  }}
              >
                <Text className={`font-pbold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditDiscussion}
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

export default DiscussionModal;
