import React from 'react';
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddEditDiscussionProps {
  visible: boolean;
  isDarkMode?: boolean;
  isEditMode: boolean;
  title: string;
  body: string;
  onTitleChange: (text: string) => void;
  onBodyChange: (text: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const AddEditDiscussion: React.FC<AddEditDiscussionProps> = ({
  visible,
  isDarkMode,
  isEditMode,
  title,
  body,
  onTitleChange,
  onBodyChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text
            className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{
              fontSize: 20,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {isEditMode ? 'Edit Discussion' : 'Create Discussion'}
          </Text>

          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{
              marginBottom: 8,
              fontSize: 16,
            }}
          >
            Title
          </Text>
          <TextInput
            placeholder="What's on your mind?"
            value={title}
            onChangeText={onTitleChange}
            className={`font-inter_regular ${isDarkMode ? 'bg-[#2A2A2A] text-[#E0E0E0]' : 'bg-gray-50 text-black'}`}
            style={{
              borderWidth: 1,
              borderColor: isDarkMode ? '#404040' : '#E5E5E5',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 14,
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />

          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{
              marginBottom: 8,
              fontSize: 16,
            }}
          >
            Content
          </Text>
          <TextInput
            placeholder="Share your thoughts with the class..."
            value={body}
            onChangeText={onBodyChange}
            className={`font-inter_regular ${isDarkMode ? 'bg-[#2A2A2A] text-[#E0E0E0]' : 'bg-gray-50 text-black'}`}
            style={{
              borderWidth: 1,
              borderColor: isDarkMode ? '#404040' : '#E5E5E5',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              minHeight: 100,
              textAlignVertical: 'top',
              fontSize: 14,
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            multiline
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                backgroundColor: isDarkMode ? '#404040' : '#E5E5E5',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-gray-700'}`}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text className="font-inter_semibold text-white">
                {isEditMode ? 'Save Changes' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddEditDiscussion;