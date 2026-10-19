import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid,
} from 'react-native';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import AddEditDiscussion from './AddEditDiscussion';
import DiscussionComments from './DiscussionComments';

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

interface Reply {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
  isEdited?: boolean;
  isHidden?: boolean; // Add isHidden
  hiddenBy?: User; // Add hiddenBy
  replyTo?: User;
  replies?: Reply[];
}

// Update the Comment interface
interface Comment {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
  isEdited?: boolean;
  isHidden?: boolean; // Add isHidden
  hiddenBy?: User; // Add hiddenBy
  replies: Reply[];
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
  isEdited?: boolean;
}

interface DiscussionModalProps {
  subjectId: string;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
  isAuthenticated?: boolean;
}

const DiscussionModal: React.FC<DiscussionModalProps> = ({
  subjectId,
  isDarkMode,
  isAdminOrTeacher,
  isAuthenticated,
}) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // Modal states
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  
  // Edit states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<Discussion | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Add loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to map nested replies recursively
  const mapReplies = (replies: any[]): Reply[] => {
    return (replies || []).map((r: any) => ({
      _id: r._id,
      content: r.content,
      author: r.author,
      createdAt: r.createdAt,
      isEdited: r.isEdited || false,
      isHidden: r.isHidden || false, // Explicitly map isHidden
      hiddenBy: r.hiddenBy, // Map hiddenBy
      replyTo: r.replyTo, // Add replyTo field
      replies: mapReplies(r.replies || []), // Recursively map nested replies
    }));
  };

  const fetchDiscussions = async (showLoading = false) => {
    if (showLoading) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await apiClient.get(`/subjects/${subjectId}/discussions`);
      const mapped: Discussion[] = (res.data.data || []).map((d: any) => ({
        _id: d._id,
        title: d.title,
        content: d.content,
        comments: (d.comments || []).map((c: any) => ({
          _id: c._id,
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          isEdited: c.isEdited || false,
          isHidden: c.isHidden || false, // Explicitly map isHidden for comments
          hiddenBy: c.hiddenBy, // Map hiddenBy
          replies: mapReplies(c.replies),
        })),
        createdAt: d.createdAt,
        author: d.author,
        date: d.createdAt,
        body: d.content,
        isEdited: d.isEdited || false,
      }));
      setDiscussions(mapped);
    } catch {
      const message = 'Failed to load discussions.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // New function to refresh a single discussion
  const refreshSingleDiscussion = async (discussionId: string): Promise<Discussion | null> => {
    try {
      const res = await apiClient.get(`/discussions/${discussionId}`);
      const updatedDiscussion = res.data.data;
      
      const mappedDiscussion = {
        _id: updatedDiscussion._id,
        title: updatedDiscussion.title,
        content: updatedDiscussion.content,
        comments: (updatedDiscussion.comments || []).map((c: any) => ({
          _id: c._id,
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          isEdited: c.isEdited || false,
          isHidden: c.isHidden || false, // Explicitly map isHidden
          hiddenBy: c.hiddenBy, // Map hiddenBy
          replies: mapReplies(c.replies),
        })),
        createdAt: updatedDiscussion.createdAt,
        author: updatedDiscussion.author,
        date: updatedDiscussion.createdAt,
        body: updatedDiscussion.content,
        isEdited: updatedDiscussion.isEdited || false,
      };
      
      // Update the discussion in the local state
      setDiscussions(prevDiscussions => 
        prevDiscussions.map(d => 
          d._id === discussionId ? mappedDiscussion : d
        )
      );
      
      // Update selected discussion if it's the one being viewed
      if (selectedDiscussion?._id === discussionId) {
        setSelectedDiscussion(mappedDiscussion);
      }
      
      return mappedDiscussion;
    } catch (error) {
      console.error('Error refreshing discussion:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [subjectId]);

  const handleRefresh = () => {
    fetchDiscussions(true);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingDiscussion(null);
    setTitle('');
    setBody('');
    setAddEditModalVisible(true);
  };

  // Update canEditDiscussion - only author
  const canEditDiscussion = (discussion: Discussion): boolean => {
    if (!user || !isAuthenticated) return false;
    return discussion.author._id === user._id;
  };

  // Update canDeleteDiscussion - only author
  const canDeleteDiscussion = (discussion: Discussion): boolean => {
    if (!user || !isAuthenticated) return false;
    return discussion.author._id === user._id;
  };

  const openEditModal = (discussion: Discussion) => {
    // Check if user can edit this discussion
    if (!canEditDiscussion(discussion)) {
      const message = 'You can only edit discussions you created.';
      if (Platform.OS === 'web') {
        window.alert(`Access Denied: ${message}`);
      } else {
        Alert.alert('Access Denied', message);
      }
      return;
    }

    setIsEditMode(true);
    setEditingDiscussion(discussion);
    setTitle(discussion.title);
    setBody(discussion.content);
    setAddEditModalVisible(true);
  };

  const closeAddEditModal = () => {
    setAddEditModalVisible(false);
    setIsEditMode(false);
    setEditingDiscussion(null);
    setTitle('');
    setBody('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    if (!user) {
      const message = 'You must be logged in to perform this action.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    try {
      if (isEditMode && editingDiscussion) {
        // Double check permission before editing
        if (!canEditDiscussion(editingDiscussion)) {
          const message = 'You can only edit discussions you created.';
          if (Platform.OS === 'web') {
            window.alert(`Access Denied: ${message}`);
          } else {
            Alert.alert('Access Denied', message);
          }
          closeAddEditModal();
          return;
        }

        await apiClient.put(`/discussions/${editingDiscussion._id}`, {
          title,
          content: body,
        });
      } else {
        await apiClient.post(`/subjects/${subjectId}/discussions`, {
          title,
          content: body,
        });
      }
      closeAddEditModal();
      fetchDiscussions(true);
    } catch {
      const message = isEditMode ? 'Failed to update discussion.' : 'Failed to add discussion.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      }
    }
  };

  const handleDeleteDiscussion = async (discussion: Discussion) => {
    if (!user) {
      const message = 'You must be logged in to delete a discussion.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    // Check if user can delete this discussion
    if (!canDeleteDiscussion(discussion)) {
      const message = 'You can only delete discussions you created.';
      if (Platform.OS === 'web') {
        window.alert(`Access Denied: ${message}`);
      } else {
        Alert.alert('Access Denied', message);
      }
      return;
    }

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this discussion?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Discussion',
            'Are you sure you want to delete this discussion?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (confirmDelete) {
      try {
        await apiClient.delete(`/discussions/${discussion._id}`);
        fetchDiscussions(true);
        
        const message = 'Discussion deleted successfully!';
        if (Platform.OS === 'web') {
          window.alert(`Success: ${message}`);
        } else {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        }
      } catch {
        const message = 'Failed to delete discussion.';
        if (Platform.OS === 'web') {
          window.alert(`Error: ${message}`);
        } else {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        }
      }
    }
  };

  const openCommentsModal = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setCommentsModalVisible(true);
  };

  const closeCommentsModal = () => {
    setSelectedDiscussion(null);
    setCommentsModalVisible(false);
    fetchDiscussions(true); // Refresh with loading indicator
  };

  const handleAddComment = async (discussionId: string, content: string) => {
    await apiClient.post(`/discussions/${discussionId}/comments`, { content });
    // Don't call fetchDiscussions here as it will be handled by the refresh function
  };

  const handleEditComment = async (discussionId: string, commentId: string, content: string) => {
    await apiClient.put(`/discussions/${discussionId}/comments/${commentId}`, { content });
    // Don't call fetchDiscussions here as it will be handled by the refresh function
  };

  const handleDeleteComment = async (discussionId: string, commentId: string) => {
    await apiClient.delete(`/discussions/${discussionId}/comments/${commentId}`);
    // Don't call fetchDiscussions here as it will be handled by the refresh function
  };

  // Update the handleAddReply function
  const handleAddReply = async (discussionId: string, commentId: string, content: string, replyToUserId?: string) => {
    await apiClient.post(`/discussions/${discussionId}/comments/${commentId}/replies`, { 
      content,
      replyToUserId 
    });
  };

  const handleEditReply = async (discussionId: string, commentId: string, replyId: string, content: string) => {
    await apiClient.put(`/discussions/${discussionId}/comments/${commentId}/replies/${replyId}`, { content });
  };

  const handleDeleteReply = async (discussionId: string, commentId: string, replyId: string) => {
    await apiClient.delete(`/discussions/${discussionId}/comments/${commentId}/replies/${replyId}`);
  };

  const handleToggleHideComment = async (discussionId: string, commentId: string) => {
    try {
      await apiClient.patch(`/discussions/${discussionId}/comments/${commentId}/hide`);
    } catch (error) {
      console.error('Error toggling hide comment:', error);
      throw error;
    }
  };

  const handleToggleHideReply = async (discussionId: string, commentId: string, replyId: string) => {
    try {
      await apiClient.patch(`/discussions/${discussionId}/comments/${commentId}/replies/${replyId}/hide`);
    } catch (error) {
      console.error('Error toggling hide reply:', error);
      throw error;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  const countAllReplies = (replies: Reply[]): number => {
    return replies.reduce((acc, reply) => {
      return acc + 1 + (reply.replies ? countAllReplies(reply.replies) : 0);
    }, 0);
  };

  const getTotalCommentsCount = (discussion: Discussion): number => {
    const topLevelCommentsCount = discussion.comments.length;
    const repliesCount = discussion.comments.reduce((acc, comment) => {
      return acc + (comment.replies ? countAllReplies(comment.replies) : 0);
    }, 0);
    return topLevelCommentsCount + repliesCount;
  };

  return (
    <View style={{ padding: 8, flex: 1 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text className={`font-pbold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Class Discussions
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* New Post Button */}
          {isAdminOrTeacher && isAuthenticated && (
            <TouchableOpacity
              onPress={openAddModal}
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Image
                source={require('@/assets/icons/plus.png')}
                style={{ width: 16, height: 16 }}
                tintColor="white"
              />
              <Text className="font-inter_semibold text-white text-sm">
                New Post
              </Text>
            </TouchableOpacity>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefreshing}
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              borderRadius: 20,
              padding: 8,
              opacity: isRefreshing ? 0.6 : 1,
            }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Image
                source={require('@/assets/icons/refresh.png')}
                style={{ width: 20, height: 20 }}
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
            Loading discussions...
          </Text>
        </View>
      ) : discussions.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {discussions.map((discussion, idx) => {
            const totalComments = getTotalCommentsCount(discussion);
            return (
            <View
              key={discussion._id}
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                borderRadius: 12,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {/* Post Header */}
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Image
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                      source={
                        discussion.author.profilePicture 
                          ? { uri: discussion.author.profilePicture } 
                          : require('@/assets/images/sample_profile_picture.png')
                      }
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          {discussion.author.middleName 
                            ? `${discussion.author.firstName} ${discussion.author.middleName} ${discussion.author.lastName}`
                            : `${discussion.author.firstName} ${discussion.author.lastName}`
                        }
                        </Text>
                        {discussion.isEdited && (
                          <Text className='font-inter_regular ml-2 text-xs text-purple-600'>
                            • Edited
                          </Text>
                        )}
                      </View>
                      <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatTimeAgo(discussion.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Options Menu - Only show if user can edit or delete */}
                  {(canEditDiscussion(discussion) || canDeleteDiscussion(discussion)) && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {canEditDiscussion(discussion) && (
                        <TouchableOpacity onPress={() => openEditModal(discussion)}>
                          <Image
                            source={require('@/assets/icons/edit.png')}
                            style={{ width: 20, height: 20 }}
                            tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                          />
                        </TouchableOpacity>
                      )}
                      {canDeleteDiscussion(discussion) && (
                        <TouchableOpacity onPress={() => handleDeleteDiscussion(discussion)}>
                          <Image
                            source={require('@/assets/icons/delete.png')}
                            style={{ width: 20, height: 20 }}
                            tintColor="#EF4444"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Post Content */}
                <View style={{ marginTop: 12 }}>
                  <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} mb-2`}>
                    {discussion.title}
                  </Text>
                  <Text className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {discussion.content}
                  </Text>
                </View>
              </View>

              {/* Interaction Bar */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: isDarkMode ? '#2A2A2A' : '#E5E5E5',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => openCommentsModal(discussion)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 8,
                  }}
                >
                  <Image
                    source={require('@/assets/icons/comment.png')}
                    style={{ width: 20, height: 20, marginRight: 8 }}
                    tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  />
                  <Text className={`font-inter_semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {totalComments} Comment{totalComments !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )})}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <Image
            source={require('@/assets/icons/chat.png')}
            style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.3 }}
            tintColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
          <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No discussions yet.{'\n'}Start a conversation!
          </Text>
        </View>
      )}

      {/* Add/Edit Discussion Modal */}
      <AddEditDiscussion
        visible={addEditModalVisible}
        isDarkMode={isDarkMode}
        isEditMode={isEditMode}
        title={title}
        body={body}
        onTitleChange={setTitle}
        onBodyChange={setBody}
        onCancel={closeAddEditModal}
        onSubmit={handleSubmit}
      />

      {/* Comments Modal */}
      <DiscussionComments
        visible={commentsModalVisible}
        isDarkMode={isDarkMode}
        discussion={selectedDiscussion}
        isAuthenticated={isAuthenticated}
        onClose={closeCommentsModal}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        onToggleHideComment={handleToggleHideComment}
        onAddReply={handleAddReply}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
        onToggleHideReply={handleToggleHideReply}
        onRefreshDiscussion={refreshSingleDiscussion}
      />
    </View>
  );
};

export default DiscussionModal;
