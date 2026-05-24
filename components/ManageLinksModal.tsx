import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Dropdown from '@/components/Dropdown';

interface Link {
  label: string;
  url: string;
  description: string;
  icon: string;
}

interface ManageLinksModalProps {
  visible: boolean;
  onClose: () => void;
  links: Link[];
  onSave: (links: Link[]) => void;
  isDarkMode: boolean;
}

const ManageLinksModal: React.FC<ManageLinksModalProps> = ({
  visible,
  onClose,
  links,
  onSave,
  isDarkMode,
}) => {
  const [editableLinks, setEditableLinks] = useState<Link[]>(links);

  useEffect(() => {
    setEditableLinks(links);
  }, [links]);

  const iconOptions = [
    { label: 'Web', value: 'web' },
    { label: 'Facebook', value: 'facebook' },
    { label: 'Education', value: 'education' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Location', value: 'location' },
    { label: 'Other', value: 'other' },
  ];

  const addLink = () => {
    setEditableLinks([
      ...editableLinks,
      { label: '', url: '', description: '', icon: 'other' },
    ]);
  };

  const removeLink = (index: number) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to remove this link?')
      : true;

    if (confirmDelete) {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Confirm Delete',
          'Are you sure you want to remove this link?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                const newLinks = editableLinks.filter((_, i) => i !== index);
                setEditableLinks(newLinks);
              },
            },
          ]
        );
      } else {
        const newLinks = editableLinks.filter((_, i) => i !== index);
        setEditableLinks(newLinks);
      }
    }
  };

  const updateLink = (index: number, field: keyof Link, value: string) => {
    const newLinks = [...editableLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setEditableLinks(newLinks);
  };

  const handleSave = () => {
    // Validate links
    const invalidLinks = editableLinks.filter(
      (link) => !link.label || !link.url || !link.description
    );

    if (invalidLinks.length > 0) {
      if (Platform.OS === 'web') {
        alert('Please fill in all fields for each link');
      } else {
        Alert.alert('Error', 'Please fill in all fields for each link');
      }
      return;
    }

    onSave(editableLinks);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F9FAFB' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            Manage Quick Links
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Links List */}
        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          {editableLinks.map((link, index) => (
            <View
              key={index}
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                  }}
                >
                  Link {index + 1}
                </Text>
                <TouchableOpacity onPress={() => removeLink(index)}>
                  <Image
                    source={require('@/assets/icons/delete.png')}
                    style={{ width: 20, height: 20 }}
                    tintColor="#EF4444"
                    contentFit="contain"
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                }}
              >
                Label
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 12,
                  fontFamily: 'Inter-Regular',
                }}
                value={link.label}
                onChangeText={(text) => updateLink(index, 'label', text)}
                placeholder="e.g., School Website"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />

              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                }}
              >
                URL
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 12,
                  fontFamily: 'Inter-Regular',
                }}
                value={link.url}
                onChangeText={(text) => updateLink(index, 'url', text)}
                placeholder="https://example.com"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                keyboardType="url"
              />

              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                }}
              >
                Description
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 12,
                  fontFamily: 'Inter-Regular',
                }}
                value={link.description}
                onChangeText={(text) => updateLink(index, 'description', text)}
                placeholder="Brief description of the link"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />

              <Text
                style={{
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                  marginBottom: 4,
                  fontFamily: 'Inter-Medium',
                }}
              >
                Icon
              </Text>
              <Dropdown
                data={iconOptions}
                selectedValue={link.icon}
                onValueChange={(value) => updateLink(index, 'icon', value)}
                placeholder="Select icon"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                }}
                textStyle={{
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                }}
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={addLink}
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              padding: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 20,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: isDarkMode ? '#4B5563' : '#9CA3AF',
            }}
          >
            <Text
              style={{
                color: isDarkMode ? '#F9FAFB' : '#111827',
                fontSize: 16,
                fontFamily: 'Inter-Bold',
              }}
            >
              + Add New Link
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: '#10B981',
              padding: 14,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter-Bold' }}>
              Save Links
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ManageLinksModal;