import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '@/contexts/DarkModeContext';
import apiClient from '@/app/services/apiClient'
import * as ImagePicker from 'expo-image-picker';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';

cssInterop(Image, { className: "style" });

const AddUserAndroid = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  // User data states
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [role, setRole] = useState<'Admin' | 'Student' | 'Teacher' | null>(null);

  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  // Function to clear all fields
  const clearAllFields = () => {
    setProfilePicture('');
    setUserId('');
    setUsername('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
    setAddress('');
    setSex(null);
    setRole(null);
  };

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
          
          // Validate file size (10MB limit) - mobile specific validation
          if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
            Alert.alert('Error', 'File size must be less than 10MB');
            setIsUploadingImage(false);
            return;
          }

          // Validate image dimensions (optional mobile validation)
          if (asset.width && asset.height && (asset.width < 100 || asset.height < 100)) {
            Alert.alert('Error', 'Image must be at least 100x100 pixels');
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

  // Function to handle registration
  const handleAddUser = async () => {
    setIsSubmitting(true);

    // Mobile-specific validations
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!userId || !username || !firstName || !lastName || !password || !sex || !role) {
      Alert.alert('Error', 'Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    // Validate user ID format (mobile specific)
    if (userId.length < 3) {
      Alert.alert('Error', 'User ID must be at least 3 characters long.');
      setIsSubmitting(false);
      return;
    }

    // Validate username format (mobile specific)
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long.');
      setIsSubmitting(false);
      return;
    }

    // Validate password strength (mobile specific)
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    // Validate email format if provided (mobile specific)
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }
    }

    // Validate phone number if provided (mobile specific)
    if (phoneNumber && phoneNumber.trim() !== '') {
      if (phoneNumber.length !== 10) {
        Alert.alert('Error', 'Phone number must be exactly 10 digits (excluding +63).');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await apiClient.post('/auth/register', {
        userId,
        username,
        firstName,
        middleName: middleName || undefined,
        lastName,
        email: email && email.trim() !== '' ? email.trim() : undefined,
        password,
        phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? `+63${phoneNumber}` : undefined,
        address: address && address.trim() !== '' ? address.trim() : undefined,
        sex,
        role,
        status: 'active',
        profilePicture: profilePicture || undefined
      });

      if (response.data.success) {
        Alert.alert('Success', 'User account created successfully with active status!', [
          {
            text: 'OK',
            onPress: () => {
              clearAllFields();
              router.replace('/(admins)/user-management');
            }
          }
        ]);
      } else {
        Alert.alert('Registration Failed', response.data.message || 'Something went wrong.');
      }
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      Alert.alert('Registration Failed', error.response?.data?.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    clearAllFields();
    router.push('/(admins)/user-management');
  }

  // Sex dropdown items
  const sexItems: DropdownMobileItem[] = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  // Role dropdown items
  const roleItems: DropdownMobileItem[] = [
    { label: 'Admin', value: 'Admin' },
    { label: 'Student', value: 'Student' },
    { label: 'Teacher', value: 'Teacher' },
  ];

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
                Create New Account
              </Text>
              <Text style={{
                fontSize: 15,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
                marginTop: 2,
              }}>
                Add a new user to the system
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
                  style={{ width: 60, height: 60 }}
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
                    tintColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
                    contentFit="contain"
                  />
                  <Text className={`font-psemibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Add Photo
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
                User ID <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
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
                placeholder="Enter user ID (e.g., 2024-00001)"
                placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                value={userId}
                onChangeText={setUserId}
                maxLength={30}
              />
            </View>

            {/* Username */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Username <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
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
                  First Name <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
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
                  Last Name <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
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
                Middle Name <Text className='font-inter_semibold' style={{ color: '#8A8D91', fontSize: 12 }}>(optional)</Text>
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
                  Sex <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
                </Text>
                <DropdownMobile
                  selectedValue={sex || ''}
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
                  Role <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
                </Text>
                <DropdownMobile
                  selectedValue={role || ''}
                  onValueChange={(value) => setRole(value as 'Admin' | 'Student' | 'Teacher')}
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

            {/* Email */}
            <View>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Email <Text className='font-inter_semibold' style={{ color: '#8A8D91', fontSize: 12 }}>(optional)</Text>
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
                Password <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                  placeholder="Enter password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={isSecure}
                  maxLength={30}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={toggleSecure} style={{ marginHorizontal: 12 }}>
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
                Confirm Password <Text className='font-inter_regular' style={{ color: '#E41E3F' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                  placeholder="Confirm password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={isConfirmSecure}
                  maxLength={30}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={toggleConfirmSecure} style={{ marginHorizontal: 12 }}>
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
                Phone Number <Text className='font-inter_semibold' style={{ color: '#8A8D91', fontSize: 12 }}>(optional)</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginLeft: 8,
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
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                Address <Text className='font-inter_semibold' style={{ color: '#8A8D91', fontSize: 12 }}>(optional)</Text>
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
                User accounts created by admins are automatically activated. Email, phone number, and address are optional fields.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={handleAddUser}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? (isDarkMode ? '#1565C0' : '#1565C0') : '#1877F2',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  Create Account
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

export default AddUserAndroid;
