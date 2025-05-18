import { Linking, ScrollView, View, Text, useColorScheme, TouchableOpacity } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { cssInterop } from "nativewind";
import { useDarkMode } from '@/contexts/DarkModeContext';

const InstitutionWeb: React.FC = () => {

  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();

  cssInterop(Image, { className: "style" });

  const [isExpanded, setIsExpanded] = useState(false);
    
  // Links for the school sections
  const links = [
    { label: 'Grace Community Christian School Website', url: 'https://vimeo.com/gccsphilippines?fbclid=IwY2xjawKCoNhleHRuA2FlbQIxMABicmlkETEwRWNLbkJKdnJlcWtacnB0AR7sq8VpRnDXo3lyHiXrNMvVXI9dwAwEy8C7FlTj4sZ1gZqvinJb9E1JL7AbxA_aem_tUzFI3tafCRw5DDzL1DFag' },
    { label: 'Grace Community Christian School Facebook Page', url: 'https://www.facebook.com/GCCSPhilippines/' },
    { label: 'Grace Community Christian School Learn', url: 'https://schoollearn.com' },
    { label: 'Grace Community Christian School Mail', url: 'https://gccspasay@yahoo.com/' },
  ];

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
 };

  return (
    <SafeAreaView className={`flex-1 h-full w-full justify-start items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView className='flex-grow-1 w-full'>
        <View className="items-center p-[12px]">
          <Image
            className="w-[200px] h-[200px] self-center"
            source={require('@/assets/images/GCCS-logo.png')}
            contentFit="contain"
          />
          <Text className={`font-inter_bold text-[16px] text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Welcome to Grace Community Christian School</Text>
          <Image
            className="rounded-[15px] w-[375px] h-[200px] self-center mb-[10px]"
            source={require('@/assets/images/school_image.png')}
            contentFit="fill"
          />
        </View>
        <View className="mt-[5px]">
          {links.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              className={`border-[1px] py-[12px] px-[12px] my-[5px] mx-[15px] rounded-md ${isDarkMode ? 'bg-[#1E1E1E] border-[#E0E0E0]' : 'bg-white border-black'}`}
              onPress={() => handleLinkPress(item.url)}
              >
              <Text className={`font-inter_semibold justify-center text-left text-[14px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          className={`border-[1px] p-[10px] mx-[15px] my-[10px] rounded-md ${isDarkMode ? 'bg-[#1E1E1E] border-[#E0E0E0]' : 'bg-white border-black'}`}
          onPress={() => setIsExpanded(!isExpanded)}
          >
          <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Mission & Vision</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View className={`border-[1px] p-[15px] mx-[15px] mb-[15px] rounded-[5px] ${isDarkMode ? 'bg-[#1E1E1E] border-[#E0E0E0]' : 'bg-white border-black'}`}>
            <Text className={`font-inter_bold mt-[10px] text-[16px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Mission</Text>
            <Text className={`font-inter_regular mt-[5px] text-[14px] leading-[22px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>To provide a quality education rooted in Christian values, fostering spiritual growth and intellectual excellence.</Text>
            <Text className={`font-inter_bold mt-[10px] text-[16px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Vision</Text>
            <Text className={`font-inter_regular mt-[5px] text-[14px] leading-[22px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Grace Christian Schools endeavors to help children develop and mature in a positive, Christ-centered environment that integrates faith and learning by emphasizing Biblical training and academic excellence.</Text>
          </View>
        )}
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default InstitutionWeb