import { Text, ScrollView, View, useColorScheme, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image, ImageBackground } from 'expo-image'
import { cssInterop } from 'nativewind'
import EmailIcon from '@/assets/icons/email.svg'

const ProfileAndroid: React.FC = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  cssInterop(Image, { className: "style" });
  cssInterop(ImageBackground, { className: "style" });

  return (
    <View className={`flex-1 items-center justify-start w-full h-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView className='flex-grow-1 w-full' contentContainerStyle={{ alignItems:'center' }}>
        <ImageBackground
          className="w-full h-[225]"
          source={require('@/assets/images/school_image.png')}
          contentFit='fill'
        />
        <Image
          className='w-[150] h-[150] mt-[-80] rounded-full'
          source={require('@/assets/images/sample_profile_picture.png')}
        />
        <View className='p-1 mt-3'>
          <Text className={`font-inter_bold texxt-center text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Samuel Alejandro
          </Text>
          <Text className={`font-inter_semibold text-center text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            S.Y. 2012-2025
          </Text>
        </View>
        <View className={`flex-row items-center border rounded-xl m-2 px-3 py-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
          <EmailIcon height={24} width={24} className="mr-2" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
          <TextInput
            className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
            editable={false}
            value='alejandro345@gmail.com'
            keyboardType="email-address"
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </View>
  )
}

export default ProfileAndroid