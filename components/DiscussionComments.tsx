import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';

// --- INTERFACES ---
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
  isHidden?: boolean;
  hiddenBy?: User;
  replyTo?: User;
  replies?: Reply[];
}

interface Comment {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
  isEdited?: boolean;
  isHidden?: boolean;
  hiddenBy?: User;
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

interface DiscussionCommentsProps {
  visible: boolean;
  isDarkMode?: boolean;
  discussion: Discussion | null;
  isAuthenticated?: boolean;
  onClose: () => void;
  onAddComment: (discussionId: string, content: string) => Promise<void>;
  onEditComment: (discussionId: string, commentId: string, content: string) => Promise<void>;
  onDeleteComment: (discussionId: string, commentId: string) => Promise<void>;
  onToggleHideComment: (discussionId: string, commentId: string) => Promise<void>;
  onAddReply: (discussionId: string, commentId: string, content: string, replyToUserId?: string) => Promise<void>;
  onEditReply: (discussionId: string, commentId: string, replyId: string, content: string) => Promise<void>;
  onDeleteReply: (discussionId: string, commentId: string, replyId: string) => Promise<void>;
  onToggleHideReply: (discussionId: string, commentId: string, replyId: string) => Promise<void>;
  onRefreshDiscussion: (discussionId: string) => Promise<Discussion | null>;
}


// --- MEMOIZED CHILD COMPONENTS ---

const MemoizedCommentList = React.memo(({
  discussion,
  isDarkMode,
  totalCommentsCount,
  paginatedComments,
  renderCommentItem,
  renderLoadMoreFooter,
  renderEmptyState,
  isWeb,
  getFullName,
  formatTimeAgo,
}) => (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      showsVerticalScrollIndicator={!isWeb}
    >
      {/* Original Post */}
      <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A2A' : '#E5E5E5' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Image
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
            source={ discussion.author.profilePicture ? { uri: discussion.author.profilePicture } : require('@/assets/images/sample_profile_picture.png') }
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{getFullName(discussion.author)}</Text>
              {discussion.isEdited && (<Text className='font-inter_regular text-xs ml-2 text-purple-600'>• Edited</Text>)}
            </View>
            <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatTimeAgo(discussion.createdAt)}</Text>
          </View>
        </View>
        <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} mb-2`}>{discussion.title}</Text>
        <Text className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{discussion.content}</Text>
      </View>

      {/* Comments Count */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A2A' : '#E5E5E5' }}>
        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{totalCommentsCount} Comment{totalCommentsCount !== 1 ? 's' : ''}</Text>
      </View>

      {/* Comments List */}
      {paginatedComments.length > 0 ? (
        <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }}>
          {paginatedComments.map((comment) => (<View key={comment._id}>{renderCommentItem({ item: comment })}</View>))}
          {renderLoadMoreFooter()}
        </View>
      ) : (
        renderEmptyState()
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
));

const MemoizedInputIndicator = React.memo(({
  inputMode,
  isDarkMode,
  replyingToUser,
  getFullName,
  onReset,
}) => {
    if (inputMode === 'comment') return null;

    let indicatorText = '';
    if (inputMode === 'edit-comment') indicatorText = 'Editing comment';
    else if (inputMode === 'edit-reply') indicatorText = 'Editing reply';
    else if (inputMode === 'reply' && replyingToUser) indicatorText = `Replying to ${getFullName(replyingToUser)}`;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F2F5', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#404040' : '#E5E5E5' }}>
        <Text className="font-inter_semibold text-sm" style={{ color: inputMode === 'reply' ? '#10B981' : '#3B82F6' }}>{indicatorText}</Text>
        <TouchableOpacity onPress={onReset}>
          <Image source={require('@/assets/icons/close.png')} style={{ width: 20, height: 20 }} tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
        </TouchableOpacity>
      </View>
    );
});

const MemoizedCommentInput = React.memo(({
  isAuthenticated,
  discussion,
  isDarkMode,
  user,
  inputMode,
  inputContent,
  setInputContent,
  inputHeight,
  setInputHeight,
  handleSubmitInput,
  isWeb
}) => {
  if (!isAuthenticated || !discussion) return null;

  return (
    <View style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F9FA', padding: 16, borderTopWidth: inputMode === 'comment' ? 1 : 0, borderTopColor: isDarkMode ? '#404040' : '#E5E5E5' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Image
          style={{ width: 32, height: 32, borderRadius: 16 }}
          source={ user?.profilePicture ? { uri: user.profilePicture } : require('@/assets/images/sample_profile_picture.png') }
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder={
              inputMode === 'comment' ? "Write a comment..." :
              inputMode === 'edit-comment' ? "Edit your comment..." :
              inputMode === 'edit-reply' ? "Edit your reply..." :
              "Write a reply..."
            }
            value={inputContent}
            onChangeText={setInputContent}
            className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
            style={{ borderWidth: 1, borderColor: isDarkMode ? '#404040' : '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: isWeb ? 80 : 100, minHeight: inputHeight, }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            onContentSizeChange={(event) => setInputHeight(Math.max(40, event.nativeEvent.contentSize.height))}
            multiline
            blurOnSubmit={false}
            returnKeyType="default"
          />
        </View>
        <TouchableOpacity onPress={handleSubmitInput} disabled={!inputContent.trim()} style={{ backgroundColor: inputContent.trim() ? '#3B82F6' : (isDarkMode ? '#404040' : '#E5E5E5'), borderRadius: 16, padding: 8 }}>
          <Image source={require('@/assets/icons/send.png')} style={{ width: 20, height: 20 }} tintColor={inputContent.trim() ? '#FFFFFF' : (isDarkMode ? '#666666' : '#999999')}/>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ModalContent = (props) => (
  <>
    {props.discussion && <MemoizedCommentList {...props} />}
    <MemoizedInputIndicator {...props} onReset={props.resetInput} />
    <MemoizedCommentInput {...props} />
  </>
);


// --- MAIN COMPONENT ---
const DiscussionComments: React.FC<DiscussionCommentsProps> = ({
  visible,
  isDarkMode,
  discussion: initialDiscussion,
  isAuthenticated,
  onClose,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleHideComment,
  onAddReply,
  onEditReply,
  onDeleteReply,
  onToggleHideReply,
  onRefreshDiscussion,
}) => {
  const { user } = useAuth();
  
  // States
  const [inputContent, setInputContent] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [inputMode, setInputMode] = useState<'comment' | 'edit-comment' | 'edit-reply' | 'reply'>('comment');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUser, setReplyingToUser] = useState<User | null>(null);
  const [showRepliesForComment, setShowRepliesForComment] = useState<Set<string>>(new Set());
  const [discussion, setDiscussion] = useState<Discussion | null>(initialDiscussion);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const commentsPerPage = 10;
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    setDiscussion(initialDiscussion);
    setCurrentPage(1);
  }, [initialDiscussion]);

  // Logic & Handlers
  const refreshDiscussion = useCallback(async () => {
    if (!discussion?._id) return;
    try {
      const updatedDiscussion = await onRefreshDiscussion(discussion._id);
      if (updatedDiscussion) setDiscussion(updatedDiscussion);
    } catch (error) { console.error('Error refreshing discussion:', error); }
  }, [discussion?._id, onRefreshDiscussion]);

  const countReplies = (replies: Reply[]): number => {
    let count = replies.length;
    replies.forEach(reply => {
      if (reply.replies?.length > 0) count += countReplies(reply.replies);
    });
    return count;
  };

  const totalCommentsCount = useMemo(() => {
    if (!discussion?.comments) return 0;
    return discussion.comments.reduce((acc, comment) => acc + 1 + countReplies(comment.replies || []), 0);
  }, [discussion?.comments]);

  const paginatedComments = useMemo(() => {
    if (!discussion?.comments) return [];
    return discussion.comments.slice(0, currentPage * commentsPerPage);
  }, [discussion?.comments, currentPage]);

  const hasMoreComments = useMemo(() => {
    return discussion ? paginatedComments.length < discussion.comments.length : false;
  }, [discussion, paginatedComments]);

  const loadMoreComments = useCallback(() => {
    if (isLoadingMore || !hasMoreComments) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 500);
  }, [isLoadingMore, hasMoreComments]);

  const getFullName = (author: User) => author.middleName ? `${author.firstName} ${author.middleName} ${author.lastName}` : `${author.firstName} ${author.lastName}`;

  const resetInput = () => {
    setInputContent('');
    setInputHeight(40);
    setInputMode('comment');
    setEditingCommentId(null);
    setEditingReplyId(null);
    setReplyingToCommentId(null);
    setReplyingToUser(null);
  };

  const handleSubmitInput = async () => {
    if (!inputContent.trim() || !discussion) return;
    try {
      if (inputMode === 'comment') await onAddComment(discussion._id, inputContent);
      else if (inputMode === 'edit-comment' && editingCommentId) await onEditComment(discussion._id, editingCommentId, inputContent);
      else if (inputMode === 'edit-reply' && editingReplyId && replyingToCommentId) await onEditReply(discussion._id, replyingToCommentId, editingReplyId, inputContent);
      else if (inputMode === 'reply' && replyingToCommentId) {
        await onAddReply(discussion._id, replyingToCommentId, inputContent, replyingToUser?._id);
        setShowRepliesForComment(prev => new Set(prev).add(replyingToCommentId));
      }
      resetInput();
      await refreshDiscussion();
    } catch (error) {
      console.error('Error submitting:', error);
      const message = 'Failed to submit.';
      isWeb ? window.alert(`Error: ${message}`) : Alert.alert('Error', message);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setInputMode('edit-comment');
    setEditingCommentId(comment._id);
    setInputContent(comment.content);
    setInputHeight(Math.max(40, comment.content.length / 2));
  };

  const handleReplyToComment = (comment: Comment, replyToUser?: User) => {
    setInputMode('reply');
    setReplyingToCommentId(comment._id);
    setReplyingToUser(replyToUser || comment.author);
    setInputContent('');
  };

  const handleEditReply = (commentId: string, reply: Reply) => {
    setInputMode('edit-reply');
    setReplyingToCommentId(commentId);
    setEditingReplyId(reply._id);
    setInputContent(reply.content);
    setInputHeight(Math.max(40, reply.content.length / 2));
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!discussion) return;
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this comment?')
      : await new Promise((resolve) => {
          Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (confirmDelete) {
      try {
        await onDeleteComment(discussion._id, commentId);
        await refreshDiscussion();
      } catch (error) { console.error('Error deleting comment:', error); }
    }
  };

  // Add a helper function to find and delete nested replies recursively
  const findAndDeleteNestedReply = useCallback((replies: Reply[], targetReplyId: string): boolean => {
    for (let i = 0; i < replies.length; i++) {
      if (replies[i]._id === targetReplyId) {
        return true; // Found at this level
      }
      if (replies[i].replies && replies[i].replies.length > 0) {
        if (findAndDeleteNestedReply(replies[i].replies!, targetReplyId)) {
          return true; // Found in nested replies
        }
      }
    }
    return false;
  }, []);

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!discussion) return;
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this reply?')
      : await new Promise((resolve) => {
          Alert.alert('Delete Reply', 'Are you sure you want to delete this reply?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (confirmDelete) {
      try {
        await onDeleteReply(discussion._id, commentId, replyId);
        await refreshDiscussion();
      } catch (error) {
        console.error('Error deleting reply:', error);
        const message = Platform.OS === 'web' 
          ? 'Failed to delete reply. Please try again.' 
          : 'Failed to delete reply';
        Platform.OS === 'web' ? window.alert(`Error: ${message}`) : Alert.alert('Error', message);
      }
    }
  };

  const canEditComment = (comment: Comment): boolean => 
    user && isAuthenticated ? comment.author._id === user._id : false;

  const canDeleteComment = (comment: Comment): boolean => 
    user && isAuthenticated ? comment.author._id === user._id : false;

  const canHideComment = (): boolean => 
    user && isAuthenticated ? user.role === 'Admin' : false;

  const canEditReply = (reply: Reply): boolean => 
    user && isAuthenticated ? reply.author._id === user._id : false;

  const canDeleteReply = (reply: Reply): boolean => {
    if (!user || !isAuthenticated) return false;
    // Allow user to delete their own reply OR admin to delete their own reply
    return reply.author._id === user._id;
  };

  const canHideReply = (): boolean => 
    user && isAuthenticated ? user.role === 'Admin' : false;

    // Handle toggle hide comment
  const handleToggleHideComment = async (commentId: string) => {
    if (!discussion) return;
    try {
      await onToggleHideComment(discussion._id, commentId);
      await refreshDiscussion();
    } catch (error) {
      console.error('Error toggling hide comment:', error);
    }
  };

  // Handle toggle hide reply
  const handleToggleHideReply = async (commentId: string, replyId: string) => {
    if (!discussion) return;
    try {
      await onToggleHideReply(discussion._id, commentId, replyId);
      await refreshDiscussion();
    } catch (error) {
      console.error('Error toggling hide reply:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString); const now = new Date(); const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m`; if (diff < 86400) return `${Math.floor(diff / 3600)}h`; if (diff < 604800) return `${Math.floor(diff / 86400)}d`; return date.toLocaleDateString();
  };

  const toggleReplies = useCallback((commentId: string) => {
    setShowRepliesForComment(prev => { const newSet = new Set(prev); newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId); return newSet; });
  }, []);

  const renderReply = useCallback((reply: Reply, commentId: string, depth: number = 0, parentReplyId?: string) => {
    const maxDepth = 3;
    const comment = discussion?.comments.find(c => c._id === commentId);
    if(!comment) return null;

    // Show hidden message for non-admins
    if (reply.isHidden && user?.role !== 'Admin') {
      return (
        <View key={reply._id} style={{ marginBottom: 12 }}>
          <View style={{ padding: 12, backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0', borderRadius: 8 }}>
            <Text className={`font-inter_regular text-sm italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This reply has been hidden by a moderator
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View key={reply._id} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Image 
            style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, opacity: reply.isHidden ? 0.5 : 1 }} 
            source={ reply.author.profilePicture ? { uri: reply.author.profilePicture } : require('@/assets/images/sample_profile_picture.png') } 
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <View style={{ 
              backgroundColor: reply.isHidden ? (isDarkMode ? '#3A2A2A' : '#FFE5E5') : (isDarkMode ? '#2A2A2A' : '#F0F2F5'), 
              borderRadius: 12, 
              padding: 10, 
              marginBottom: 2,
              opacity: reply.isHidden ? 0.7 : 1 
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {getFullName(reply.author)}
                </Text>
                {reply.isEdited && (<Text className='font-inter_regular text-xs ml-2 text-purple-600'>• Edited</Text>)}
                {reply.isHidden && user?.role === 'Admin' && (
                  <Text className='font-inter_regular text-xs ml-2 text-red-500'>• Hidden</Text>
                )}
              </View>
              <View>
                {reply.replyTo && (
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} mb-1`}>
                    @{getFullName(reply.replyTo)}
                  </Text>
                )}
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {reply.content}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, gap: 12, flexWrap: 'wrap' }}>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {formatTimeAgo(reply.createdAt)}
              </Text>
              {depth < maxDepth && !reply.isHidden && (
                <TouchableOpacity onPress={() => handleReplyToComment(comment, reply.author)}>
                  <Text className="font-inter_semibold text-xs text-blue-500">Reply</Text>
                </TouchableOpacity>
              )}
              {canEditReply(reply) && !reply.isHidden && (
                <TouchableOpacity onPress={() => handleEditReply(commentId, reply)}>
                  <Text className="font-inter_semibold text-xs text-blue-500">Edit</Text>
                </TouchableOpacity>
              )}
              {canDeleteReply(reply) && (
                <TouchableOpacity onPress={() => handleDeleteReply(commentId, reply._id)}>
                  <Text className="font-inter_semibold text-xs text-red-500">Delete</Text>
                </TouchableOpacity>
              )}
              {canHideReply() && (
                <TouchableOpacity onPress={() => handleToggleHideReply(commentId, reply._id)}>
                  <Text className="font-inter_semibold text-xs text-orange-500">
                    {reply.isHidden ? 'Unhide' : 'Hide'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {reply.replies && reply.replies.length > 0 && depth < maxDepth && (
              <View style={{ marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: isDarkMode ? '#404040' : '#E5E5E5' }}>
                {reply.replies.map(nestedReply => renderReply(nestedReply, commentId, depth + 1, reply._id))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [isDarkMode, discussion, getFullName, formatTimeAgo, user, canEditReply, canDeleteReply, canHideReply, handleEditReply, handleDeleteReply, handleToggleHideReply, handleReplyToComment]);
  
  const renderCommentItem = useCallback(({ item: comment }: { item: Comment }) => {
    // Debug log to check if isHidden is being received
    console.log(`Comment ${comment._id} isHidden:`, comment.isHidden, 'User role:', user?.role);
    
    // Show hidden message for non-admins
    if (comment.isHidden && user?.role !== 'Admin') {
      return (
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }}>
          <View style={{ padding: 16, backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0', borderRadius: 12 }}>
            <Text className={`font-inter_regular italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This comment has been hidden by a moderator
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Image 
            style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, opacity: comment.isHidden ? 0.5 : 1 }} 
            source={ comment.author.profilePicture ? { uri: comment.author.profilePicture } : require('@/assets/images/sample_profile_picture.png') } 
            contentFit="cover" 
          />
          <View style={{ flex: 1 }}>
            <View style={{ 
              backgroundColor: comment.isHidden ? (isDarkMode ? '#3A2A2A' : '#FFE5E5') : (isDarkMode ? '#2A2A2A' : '#F0F2F5'), 
              borderRadius: 16, 
              padding: 12, 
              marginBottom: 4,
              opacity: comment.isHidden ? 0.7 : 1 
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {getFullName(comment.author)}
                </Text>
                {comment.isEdited && (<Text className='font-inter_regular text-xs ml-2 text-purple-600'>• Edited</Text>)}
                {comment.isHidden && user?.role === 'Admin' && (
                  <Text className='font-inter_regular text-xs ml-2 text-red-500'>• Hidden</Text>
                )}
              </View>
              <Text className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                {comment.content}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 16, flexWrap: 'wrap' }}>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {formatTimeAgo(comment.createdAt)}
              </Text>
              {!comment.isHidden && (
                <TouchableOpacity onPress={() => handleReplyToComment(comment)}>
                  <Text className="font-inter_semibold text-xs text-blue-500">Reply</Text>
                </TouchableOpacity>
              )}
              {canEditComment(comment) && !comment.isHidden && (
                <TouchableOpacity onPress={() => handleEditComment(comment)}>
                  <Text className="font-inter_semibold text-xs text-blue-500">Edit</Text>
                </TouchableOpacity>
              )}
              {canDeleteComment(comment) && (
                <TouchableOpacity onPress={() => handleDeleteComment(comment._id)}>
                  <Text className="font-inter_semibold text-xs text-red-500">Delete</Text>
                </TouchableOpacity>
              )}
              {canHideComment() && (
                <TouchableOpacity onPress={() => handleToggleHideComment(comment._id)}>
                  <Text className="font-inter_semibold text-xs text-orange-500">
                    {comment.isHidden ? 'Unhide' : 'Hide'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {comment.replies && comment.replies.length > 0 && (
              <View style={{ marginTop: 8, marginLeft: 12 }}>
                <TouchableOpacity onPress={() => toggleReplies(comment._id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                  <Image 
                    source={require('@/assets/icons/down.png')} 
                    style={{ width: 12, height: 12, marginRight: 6, transform: [{ rotate: showRepliesForComment.has(comment._id) ? '0deg' : '-90deg' }]}} 
                    tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  />
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>
                    {countReplies(comment.replies)} {countReplies(comment.replies) === 1 ? 'Reply' : 'Replies'}
                  </Text>
                </TouchableOpacity>
                {showRepliesForComment.has(comment._id) && (
                  <View style={{ marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: isDarkMode ? '#404040' : '#E5E5E5' }}>
                    {comment.replies.map(reply => renderReply(reply, comment._id))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [isDarkMode, toggleReplies, showRepliesForComment, renderReply, getFullName, formatTimeAgo, countReplies, user, canEditComment, canDeleteComment, canHideComment, handleReplyToComment, handleEditComment, handleDeleteComment, handleToggleHideComment]);

  const renderLoadMoreFooter = useCallback(() => {
    if (!hasMoreComments && !isLoadingMore) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        {isLoadingMore ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : '#6B7280'} /><Text className={`font-inter_regular ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading more comments...</Text></View>
        ) : (
          <TouchableOpacity onPress={loadMoreComments} style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F2F5', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-gray-700'}`}>Load More Comments</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [hasMoreComments, isLoadingMore, loadMoreComments, isDarkMode]);
  
  const renderEmptyState = useCallback(() => (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Image source={require('@/assets/icons/chat.png')} style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.3 }} tintColor={isDarkMode ? '#6B7280' : '#9CA3AF'}/>
      <Text className={`font-inter_regular ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No comments yet. Be the first to comment!</Text>
    </View>
  ), [isDarkMode]);

  const modalContentProps = {
    discussion, isDarkMode, totalCommentsCount, paginatedComments, renderCommentItem, renderLoadMoreFooter, renderEmptyState,
    isWeb, getFullName, formatTimeAgo, isAuthenticated, user, inputMode, inputContent, setInputContent, inputHeight,
    setInputHeight, handleSubmitInput, replyingToUser, resetInput
  };
  
  return (
    <Modal visible={visible} animationType={isWeb ? "fade" : "slide"} transparent={isWeb} onRequestClose={() => { resetInput(); onClose(); }}>
      {isWeb ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <View style={{ paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#404040' : '#E5E5E5' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => { resetInput(); onClose(); }}><Image source={require('@/assets/icons/close.png')} style={{ width: 24, height: 24 }} tintColor={isDarkMode ? '#E0E0E0' : '#000000'}/></TouchableOpacity>
                <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Comments</Text>
                <View style={{ width: 24 }} />
              </View>
            </View>
            <ModalContent {...modalContentProps} />
          </View>
        </View>
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }}>
          <View style={{ paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A2A' : '#E5E5E5' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => { resetInput(); onClose(); }}><Image source={require('@/assets/icons/back.png')} style={{ width: 24, height: 24 }} tintColor={isDarkMode ? '#E0E0E0' : '#000000'}/></TouchableOpacity>
              <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Comments</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>
          <ModalContent {...modalContentProps} />
        </SafeAreaView>
      )}
    </Modal>
  );
};

export default React.memo(DiscussionComments);

