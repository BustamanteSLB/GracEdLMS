// edit-profile.web.tsx
import { View, Text, useColorScheme, TextInput, Alert, ActivityIndicator, Keyboard, TouchableOpacity, Platform } from 'react-native'
import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/app/types';
import * as ImagePicker from 'expo-image-picker';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import NetworkBanner from '@/components/NetworkBanner.web';

cssInterop(Image, { className: "style" });

const EditProfileWeb = () => {
  document.title = 'Edit Profile - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user, fetchCurrentUser, isLoading: authIsLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);

  const [profilePicture, setProfilePicture] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  const sexOptions: DropdownItem[] = useMemo(() => [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ], []);

  // Shared network error detection helper
  const isNetworkError = (err: any) =>
    err?.message?.toLowerCase?.().includes('network') ||
    err?.status === 0 ||
    !err?.response;

  const handleImageUpload = async () => {
    try {
      setIsUploadingImage(true);
      setNetworkError(false);

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
        input.onchange = async (event) => {
          try {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) {
              setIsUploadingImage(false);
              return;
            }

            if (file.size > 10 * 1024 * 1024) {
              window.alert('Error: File size must be less than 10MB');
              setIsUploadingImage(false);
              return;
            }

            const formData = new FormData();
            formData.append('profileImage', file);

            try {
              const response = await apiClient.post('/auth/upload-profile-picture', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });

              if (response.data.success) {
                setProfilePicture(response.data.data.url);
                await fetchCurrentUser();
                window.alert('Profile picture uploaded and updated successfully!');
              } else {
                window.alert(`Upload failed: ${response.data.message}`);
              }
            } catch (error: any) {
              console.error('Upload error:', error);
              if (isNetworkError(error)) setNetworkError(true);
              window.alert(`Upload failed: ${error.response?.data?.message || error.message}`);
            }
          } catch (error: any) {
            console.error('Image processing error:', error);
            window.alert(`Error: ${error.message}`);
          } finally {
            setIsUploadingImage(false);
          }
        };
        
        input.oncancel = () => {
          setIsUploadingImage(false);
        };
        
        const handleFocus = () => {
          setTimeout(() => {
            if (!input.files || input.files.length === 0) {
              setIsUploadingImage(false);
            }
          }, 100);
          window.removeEventListener('focus', handleFocus);
        };
        window.addEventListener('focus', handleFocus);
        
        input.click();
      } else {
        try {
          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          
          if (permissionResult.granted === false) {
            alert('Permission to access camera roll is required!');
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
            setIsUploadingImage(false);
            return;
          }

          if (result.assets && result.assets[0]) {
            const asset = result.assets[0];
            
            const formData = new FormData();
            formData.append('profileImage', {
              uri: asset.uri,
              type: asset.mimeType || 'image/jpeg',
              name: asset.fileName || 'profile.jpg',
            } as any);

            try {
              const response = await apiClient.post('/auth/upload-profile-picture', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });

              if (response.data.success) {
                setProfilePicture(response.data.data.url);
                await fetchCurrentUser();
                alert('Profile picture uploaded and updated successfully!');
              } else {
                alert(`Upload failed: ${response.data.message}`);
              }
            } catch (error: any) {
              console.error('Upload error:', error);
              if (isNetworkError(error)) setNetworkError(true);
              alert(`Upload failed: ${error.response?.data?.message || error.message}`);
            }
          }
        } catch (error: any) {
          console.error('Image picker error:', error);
          alert(`Error: ${error.message}`);
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      } else {
        alert(`Error: ${error.message}`);
      }
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || '');
      setEmail(user.email || '');
      const phoneNum = user.phoneNumber || '';
      if (phoneNum.startsWith('+63')) {
        setPhoneNumber(phoneNum.substring(3));
      } else {
        setPhoneNumber(phoneNum);
      }
      setAddress(user.address || '');
      setSex(user.sex || 'Male');
      setLoading(false);
    } else if (!authIsLoading) {
      setError('User data not available.');
      setLoading(false);
    }
  }, [user, authIsLoading]);

  const handleEditProfile = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    setNetworkError(false);

    // --- Validation ---
    if (!email || email.trim() === '') {
      window.alert('Validation Error: Email address is required.');
      setSubmitting(false);
      return;
    }
    if (!sex) {
      window.alert('Validation Error: Please select your gender.');
      setSubmitting(false);
      return;
    }
    if (phoneNumber && phoneNumber.trim() !== '') {
      const cleaned = phoneNumber.replace(/[^0-9]/g, '');
      if (cleaned.length !== 10) {
        window.alert('Validation Error: Phone number must be exactly 10 digits (e.g., 9123456789).');
        setSubmitting(false);
        return;
      }
      if (!cleaned.startsWith('9')) {
        window.alert('Validation Error: Phone number must start with 9 (Philippine mobile format).');
        setSubmitting(false);
        return;
      }
    }

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    try {
      const updatedData: { [key: string]: any } = {
        profilePicture,
        email: email.trim(),
        phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? `+63${phoneNumber}` : undefined,
        address: address && address.trim() !== '' ? address.trim() : undefined,
        sex,
      };
      
      const response = await apiClient.put('/auth/updateme', updatedData);
      successMessages.push('Profile details updated successfully!');
      fetchCurrentUser();
    } catch (err: any) {
      console.error('Error updating profile details:', err.response?.data || err.message);
      if (isNetworkError(err)) setNetworkError(true);
      errorMessages.push(err.response?.data?.message || 'Failed to update profile details.');
    }

    if (newPassword !== '' || confirmNewPassword !== '') {
      if (newPassword === '') {
        errorMessages.push('New password cannot be empty.');
      } else if (newPassword !== confirmNewPassword) {
        errorMessages.push('New passwords do not match.');
      } else if (newPassword.length < 8) {
        errorMessages.push('New password must be at least 8 characters long.');
      } else {
        try {
          const verifyResponse = await apiClient.post('/auth/verify-password', { 
            password: newPassword 
          });
          
          if (verifyResponse.data.success && verifyResponse.data.data.isMatch) {
            errorMessages.push('New password cannot be the same as your current password.');
          } else {
            try {
              await apiClient.put('/auth/reset-my-password', { newPassword });
              successMessages.push('Password updated successfully!');
              setNewPassword('');
              setConfirmNewPassword('');
            } catch (err: any) {
              console.error('Error updating password:', err.response?.data || err.message);
              if (isNetworkError(err)) setNetworkError(true);
              errorMessages.push(err.response?.data?.message || 'Failed to update password.');
            }
          }
        } catch (err: any) {
          if (err.response?.status === 401) {
            try {
              await apiClient.put('/auth/reset-my-password', { newPassword });
              successMessages.push('Password updated successfully!');
              setNewPassword('');
              setConfirmNewPassword('');
            } catch (updateErr: any) {
              console.error('Error updating password:', updateErr.response?.data || updateErr.message);
              if (isNetworkError(updateErr)) setNetworkError(true);
              errorMessages.push(updateErr.response?.data?.message || 'Failed to update password.');
            }
          } else {
            console.error('Error verifying password:', err.response?.data || err.message);
            if (isNetworkError(err)) setNetworkError(true);
            errorMessages.push('Failed to verify password. Please try again.');
          }
        }
      }
    }

    setSubmitting(false);

    if (successMessages.length > 0 && errorMessages.length === 0) {
      window.alert('Success: ' + successMessages.join('\n'));
      router.replace('/(teachers)/profile');
    } else if (errorMessages.length > 0) {
      window.alert('Error: ' + errorMessages.join('\n'));
    } else {
      window.alert('No Changes: No updates were submitted.');
    }
  };

  const handleBack = () => {
    router.push('/(teachers)/profile');
  };

  if (loading || authIsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            fontFamily: 'Inter-Regular',
            marginTop: 16,
            fontSize: 14,
            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
          }}>
            Loading Profile data...
          </Text>
        </View>
        <NetworkBanner
          forceVisible={networkError}
          onDismiss={() => setNetworkError(false)}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Image
              source={require('@/assets/icons/error.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
              tintColor="#F44336"
              contentFit="contain"
            />
            <Text style={{
              fontSize: 18,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Profile Loading Failed
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: '#F44336',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              style={{
                backgroundColor: '#10B981',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
              }}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <NetworkBanner
          forceVisible={networkError}
          onDismiss={() => setNetworkError(false)}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  const fullName = user?.middleName
    ? `${user?.firstName} ${user?.middleName} ${user?.lastName}`
    : `${user?.firstName} ${user?.lastName}`;

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
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Edit Your Profile
              </Text>
              <Text style={{
                fontSize: 15,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
                marginTop: 2,
              }}>
                Update your personal information and settings
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
            
            <Text style={{
              fontSize: 18,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 4,
            }}>
              {fullName}
            </Text>
            
            <View style={{
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                ID: {user?.userId}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={handleImageUpload}
              disabled={isUploadingImage}
              style={{
                backgroundColor: isDarkMode ? '#10B981' : '#10B981',
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
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: '#FFFFFF',
                  }}>
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
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: '#FFFFFF',
                  }}>
                    {profilePicture ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* Email - required */}
            <View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                Email Address <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-Regular',
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

            {/* Sex - required */}
            <View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                Gender <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <Dropdown
                data={sexOptions}
                selectedValue={sex}
                onValueChange={(value) => setSex(value as 'Male' | 'Female' | 'Other')}
                placeholder="Select Gender"
              />
            </View>

            {/* Password Fields */}
            <View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                New Password
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
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                  placeholder="Enter new password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={newPassword}
                  onChangeText={setNewPassword}
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
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                Confirm New Password
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
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                  placeholder="Confirm new password"
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#8A8D91'}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
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
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                Phone Number (optional)
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
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginRight: 8,
                }}>
                  +63
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
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
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}>
                Address (optional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontFamily: 'Inter-Regular',
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
            backgroundColor: isDarkMode ? '#1E3A2C' : '#D1FAE5',
            borderRadius: 8,
            padding: 16,
            marginTop: 24,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: '#10B981',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Image
                source={require('@/assets/icons/info.png')}
                style={{ width: 20, height: 20, marginRight: 12, marginTop: 2 }}
                tintColor="#10B981"
                contentFit="contain"
              />
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#6EE7B7' : '#047857',
                flex: 1,
                lineHeight: 20,
              }}>
                Leave password fields empty to keep current password. Email and Gender are required.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={handleEditProfile}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? (isDarkMode ? '#047857' : '#047857') : '#10B981',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{
                    fontSize: 16,
                    fontFamily: 'Inter-SemiBold',
                    color: '#FFFFFF',
                  }}>
                    Updating...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                  color: '#FFFFFF',
                }}>
                  Save Changes
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
              <Text style={{
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Animated network banner overlay */}
      <NetworkBanner
        forceVisible={networkError}
        onDismiss={() => setNetworkError(false)}
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default EditProfileWeb