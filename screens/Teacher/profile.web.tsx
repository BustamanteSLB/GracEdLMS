import { Text, ScrollView, View, useColorScheme, TextInput, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image, ImageBackground } from 'expo-image'
import { cssInterop } from 'nativewind'
import { useAuth } from '@/contexts/AuthContext';
import EmailIcon from '@/assets/icons/email.svg'
import CustomButton from '@/components/CustomButton'
import { useRouter } from 'expo-router'

const ProfileWeb: React.FC = () => {

  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isDarkMode } = useDarkMode();
  const { user, fetchCurrentUser, isLoading: authIsLoading, isLoggingOut } = useAuth(); // Get isLoading and isLoggingOut
  cssInterop(Image, { className: "style" });
  cssInterop(ImageBackground, { className: "style" });

  const [refreshing, setRefreshing] = useState(false);

  // Function to refresh user data
  const onRefresh = useCallback(async () => {
    if (isLoggingOut) return; // Don't refresh if logging out
    setRefreshing(true);
    await fetchCurrentUser();
    setRefreshing(false);
  }, [fetchCurrentUser, isLoggingOut]);

  useEffect(() => {
    // Initial fetch if user data is not present or needs to be refreshed on mount
    if (!user && !authIsLoading && !isLoggingOut) {
      onRefresh();
    }
  }, [user, authIsLoading, isLoggingOut, onRefresh]);

  if (authIsLoading || (!user && !isLoggingOut)) {
    return (
      <SafeAreaView className='flex-1 items-center justify-center bg-primary-android'>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#121212'} />
        <Text className={`mt-4 text-lg font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading Profile...
        </Text>
      </SafeAreaView>
    );
  }

  // Determine full name with optional middle name
  const fullName = user?.middleName
    ? `${user?.firstName} ${user?.middleName} ${user?.lastName}`
    : `${user?.firstName} ${user?.lastName}`;

  // Helper for formatting date
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View className={`flex-1 items-center justify-start w-full h-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView 
        className='flex-grow-1 w-full' 
        contentContainerStyle={{ alignItems:'center' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? '#E0E0E0' : 'black'}
          />
        }
      >
        <ImageBackground
          className="w-full h-[275px] max-w-3xl"
          source={require('@/assets/images/school_image.png')}
          contentFit='fill'
        />
        <Image
          className='w-[150] h-[150] mt-[-80] rounded-full'
          source={ user?.profilePicture ? { uri: user?.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
        />
        <View className='p-1 mt-3'>
          <Text className={`font-inter_bold text-center text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            {fullName}
          </Text>
          <Text className={`font-inter_semibold text-center text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            {user?.userId}
          </Text>
          <CustomButton
            containerStyles='bg-red-500 h-[55px] mt-2'
            title='Refresh'
            handlePress={onRefresh}
          />
          <Text className={`font-inter_medium text-sm text-center ${isDarkMode ? 'text-red-600' : 'text-red-500'}`}>
            (Refresh if account details aren't showing)
          </Text>
        </View>
        <View className='w-full max-w-3xl p-4 rounded-lg'>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Username:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={user?.username}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Email:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={user?.email}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Contact Number:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={user?.phoneNumber || 'Not specified'}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Address:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              multiline={true}
              value={user?.address}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Sex:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={user?.sex}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Role:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={user?.role}
            />
          </View>
          <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Joined On:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-4 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              editable={false}
              value={formatDate(user?.createdAt)}
            />
          </View>
          <CustomButton
            containerStyles={`bg-secondary-web h-[55px] mb-2`}
            title="Edit Profile"
            handlePress={() => router.push('/(teachers)/edit-profile')}
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
    </View>
  )
}

export default ProfileWeb