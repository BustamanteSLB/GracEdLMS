import { View, Text, useColorScheme, TextInput, Alert, ActivityIndicator, Keyboard, TouchableOpacity, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDarkMode } from '../../contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import CustomButton from '@/components/CustomButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types';
import * as ImagePicker from 'expo-image-picker';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';

cssInterop(Image, { className: "style" });

const EditUserAndroid = () => {

  interface UserData {
    _id: string;
    userId: string;
    username: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address: string;
    role: 'Admin' | 'Teacher' | 'Student';
    profilePicture?: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
    sex: 'Male' | 'Female' | 'Other';
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Form states
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended' | 'pending' | 'archived'>('active');
  const [role, setRole] = useState<'Admin' | 'Teacher' | 'Student'>('Student');

  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  // Dropdown items
  const sexItems: DropdownMobileItem[] = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  const roleItems: DropdownMobileItem[] = [
    { label: 'Admin', value: 'Admin' },
    { label: 'Student', value: 'Student' },
    { label: 'Teacher', value: 'Teacher' },
  ];

  const statusItems: DropdownMobileItem[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Pending', value: 'pending' },
    { label: 'Archived', value: 'archived' },
  ];

  // Function to handle image upload to Firebase
  const handleImageUpload = async () => {
    try {
      setIsUploadingImage(true);

      // Mobile image picker
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert('Permission Required', 'Permission to access camera roll is required!');
          setIsUploadingImage(false);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled) {
          // User cancelled image selection
          setIsUploadingImage(false);
          return;
        }

        if (result.assets && result.assets[0]) {
          const asset = result.assets[0];
          
          // Validate file size (10MB limit) for mobile
          if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
            Alert.alert('Error', 'File size must be less than 10MB');
            setIsUploadingImage(false);
            return;
          }
          
          const formData = new FormData();
          formData.append('profileImage', {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || 'profile.jpg',
          } as any);

          try {
            const response = await apiClient.post('/users/upload-profile-picture', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            if (response.data.success) {
              setProfilePicture(response.data.data.url);
              Alert.alert('Success', 'Profile picture uploaded successfully!');
            } else {
              Alert.alert('Upload Failed', response.data.message);
            }
          } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', error.response?.data?.message || error.message);
          }
        }
      } catch (error: any) {
        console.error('Image picker error:', error);
        Alert.alert('Error', error.message);
      } finally {
        setIsUploadingImage(false);
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('Error', error.message);
      setIsUploadingImage(false);
    }
  };

  // Fetch user data on component mount or ID change
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/users/${id}`);
        const fetchedData: UserData = response.data.data;
        setUserData(fetchedData);

        // Populate form fields with fetched data
        setProfilePicture(fetchedData.profilePicture || '');
        setUserId(fetchedData.userId || '');
        setUsername(fetchedData.username || '');
        setFirstName(fetchedData.firstName || '');
        setMiddleName(fetchedData.middleName || '');
        setLastName(fetchedData.lastName || '');
        setEmail(fetchedData.email || '');
        
        // Handle phone number - remove +63 prefix if present for display
        const phoneNum = fetchedData.phoneNumber || '';
        if (phoneNum.startsWith('+63')) {
          setPhoneNumber(phoneNum.substring(3));
        } else {
          setPhoneNumber(phoneNum);
        }
        
        setAddress(fetchedData.address || '');
        setSex(fetchedData.sex || 'Male');
        setStatus(fetchedData.status || 'active');
        setRole(fetchedData.role || 'Student');
      } catch (err: any) {
        console.error('Error fetching user data:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch user data.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    } else {
      setError('No user ID provided.');
      setLoading(false);
    }
  }, [id]);

  const handleEditUser = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    // 1. Update user details including status and role
    try {
      const updatedData = {
        userId,
        username,
        firstName,
        middleName: middleName || undefined,
        lastName,
        email: email && email.trim() !== '' ? email.trim() : undefined,
        phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? `+63${phoneNumber}` : undefined,
        address: address && address.trim() !== '' ? address.trim() : undefined,
        sex,
        status,
        role,
        profilePicture: profilePicture || undefined,
      };

      const response = await apiClient.put(`/users/${id}`, updatedData);
      successMessages.push('User details updated successfully!');
      setUserData(response.data.data);
    } catch (err: any) {
      console.error('Error updating user details:', err.response?.data || err.message);
      errorMessages.push(err.response?.data?.message || 'Failed to update user details.');
    }

    // 2. Conditionally update password
    if (newPassword !== '' || confirmNewPassword !== '') {
      if (newPassword === '') {
        errorMessages.push('New password cannot be empty.');
      } else if (newPassword !== confirmNewPassword) {
        errorMessages.push('New passwords do not match.');
      } else if (newPassword.length < 8) {
        errorMessages.push('New password must be at least 8 characters long.');
      }

      if (errorMessages.length === 0) {
        try {
          await apiClient.put(`/users/${id}/password`, { newPassword });
          successMessages.push('User password updated successfully!');
          setNewPassword('');
          setConfirmNewPassword('');
        } catch (err: any) {
          console.error('Error updating password:', err.response?.data || err.message);
          errorMessages.push(err.response?.data?.message || 'Failed to update password.');
        }
      }
    }

    setSubmitting(false);

    if (successMessages.length > 0 && errorMessages.length === 0) {
      Alert.alert('Success', successMessages.join('\n'), [
        { text: 'OK', onPress: () => router.replace('/(admins)/user-management') }
      ]);
    } else if (errorMessages.length > 0) {
      Alert.alert('Error', errorMessages.join('\n'));
    } else {
      Alert.alert('No Changes', 'No updates were submitted.');
    }
  };

  const handleBack = () => {
    router.push('/(admins)/user-management');
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            fontFamily: 'Inter-18pt-Regular',
            marginTop: 16,
            color: isDarkMode ? '#E0E0E0' : 'black',
          }}>
            Loading User data...
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (error && !userData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{
            fontFamily: 'Inter-18pt-Regular',
            textAlign: 'center',
            color: isDarkMode ? '#EF4444' : '#DC2626',
          }}>
            Error: {error}
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
      <ScrollView 
        contentContainerStyle={{
          flexGrow: 1,
          paddingVertical: 20,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Image
                source={require('@/assets/icons/back.png')}
                style={{ width: 20, height: 20 }}
                tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                contentFit="contain"
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 24,
                fontFamily: 'Inter-24pt-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Edit User Account
              </Text>
              <Text style={{
                fontSize: 15,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
                marginTop: 2,
              }}>
                Update user information and settings
              </Text>
            </View>
          </View>
        </View>

        {/* Main Form Container */}
        <View style={{
          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          {/* Profile Picture Section */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
              overflow: 'hidden',
            }}>
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={{ width: 120, height: 120, borderRadius: 60 }}
                  contentFit="cover"
                />
              ) : (
                <Image
                  source={require('@/assets/icons/account.png')}
                  style={{ width: 40, height: 40 }}
                  tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                  contentFit="contain"
                />
              )}
            </View>
            
            <TouchableOpacity
              onPress={handleImageUpload}
              disabled={isUploadingImage}
              style={{
                backgroundColor: isDarkMode ? '#1877F2' : '#1877F2',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: isUploadingImage ? 0.7 : 1,
              }}
            >
              {isUploadingImage ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className={`font-psemibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Uploading...
                  </Text>
                </>
              ) : (
                <>
                  <Image
                    source={require('@/assets/icons/camera.png')}
                    style={{ width: 24, height: 24, marginRight: 8 }}
                    tintColor="#FFFFFF"
                    contentFit="contain"
                  />
                  <Text className={`font-psemibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    {profilePicture ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* User ID */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                User ID
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 1,
                  borderColor: 'transparent',
                }}
                placeholder="Enter user ID"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={userId}
                onChangeText={setUserId}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>

            {/* Username */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Username
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 1,
                  borderColor: 'transparent',
                }}
                placeholder="Enter username"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={username}
                onChangeText={setUsername}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>

            {/* Name Fields Row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  First Name
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderWidth: 1,
                    borderColor: 'transparent',
                  }}
                  placeholder="First name"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={50}
                  autoCapitalize="words"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Last Name
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderWidth: 1,
                    borderColor: 'transparent',
                  }}
                  placeholder="Last name"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={lastName}
                  onChangeText={setLastName}
                  maxLength={50}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Middle Name */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Middle Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 1,
                  borderColor: 'transparent',
                }}
                placeholder="Middle name"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={middleName}
                onChangeText={setMiddleName}
                autoCapitalize="words"
              />
            </View>

            {/* Sex and Role Row - Replace Pickers with DropdownMobile */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Sex
                </Text>
                <DropdownMobile
                  selectedValue={sex}
                  onValueChange={(value) => setSex(value as 'Male' | 'Female' | 'Other')}
                  items={sexItems}
                  placeholder="Select Sex"
                  buttonRightIcon={DownIcon}
                  buttonStyle={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    minHeight: 48,
                  }}
                  containerStyle={{
                    width: '100%',
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Role
                </Text>
                <DropdownMobile
                  selectedValue={role}
                  onValueChange={(value) => setRole(value as 'Admin' | 'Teacher' | 'Student')}
                  items={roleItems}
                  placeholder="Select Role"
                  buttonRightIcon={DownIcon}
                  buttonStyle={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    minHeight: 48,
                  }}
                  containerStyle={{
                    width: '100%',
                  }}
                />
              </View>
            </View>

            {/* Status - Replace Picker with DropdownMobile */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Status
              </Text>
              <DropdownMobile
                selectedValue={status}
                onValueChange={(value) => setStatus(value as 'active' | 'inactive' | 'suspended' | 'pending' | 'archived')}
                items={statusItems}
                placeholder="Select Status"
                buttonRightIcon={DownIcon}
                buttonStyle={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minHeight: 48,
                }}
                containerStyle={{
                  width: '100%',
                }}
              />
            </View>

            {/* Email */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Email
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 1,
                  borderColor: 'transparent',
                }}
                placeholder="Enter email address"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Fields */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                New Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                  placeholder="Enter new password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={isSecure}
                  maxLength={30}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={toggleSecure} style={{ marginLeft: 8 }}>
                  <Image
                    source={isSecure ? require('@/assets/icons/show_password.png') : require('@/assets/icons/hide_password.png')}
                    style={{ width: 20, height: 20 }}
                    tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Confirm New Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                  placeholder="Confirm new password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={isConfirmSecure}
                  maxLength={30}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={toggleConfirmSecure} style={{ marginLeft: 8 }}>
                  <Image
                    source={isConfirmSecure ? require('@/assets/icons/show_password.png') : require('@/assets/icons/hide_password.png')}
                    style={{ width: 20, height: 20 }}
                    tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone Number */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Phone Number
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginRight: 8,
                }}>
                  +63
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                  placeholder="Enter phone number"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setPhoneNumber(numericText);
                  }}
                  maxLength={10}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Address */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Address
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 1,
                  borderColor: 'transparent',
                  minHeight: 80,
                }}
                placeholder="Enter complete address"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={address}
                onChangeText={setAddress}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Info Banner */}
          <View style={{
            backgroundColor: isDarkMode ? '#263A52' : '#E3F2FD',
            borderRadius: 8,
            padding: 16,
            marginTop: 24,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: '#1877F2',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Image
                source={require('@/assets/icons/info.png')}
                style={{ width: 20, height: 20, marginRight: 12, marginTop: 2 }}
                tintColor="#1877F2"
                contentFit="contain"
              />
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                flex: 1,
                lineHeight: 20,
              }}>
                Leave password fields empty to keep current password. Email, phone number, and address are optional fields.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={handleEditUser}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? (isDarkMode ? '#1565C0' : '#1565C0') : '#1877F2',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Updating...
                  </Text>
                </View>
              ) : (
                <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Update User
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBack}
              style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default EditUserAndroid
