import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const InstitutionWeb: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  cssInterop(Image, { className: 'style' });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const links = [
    { label: 'GCCS Website', url: 'https://vimeo.com/gccsphilippines' },
    { label: 'GCCS Facebook Page', url: 'https://www.facebook.com/GCCSPhilippines/' },
    { label: 'GCCS Learn', url: 'https://schoollearn.com' },
    { label: 'GCCS Mail', url: 'mailto:gccspasay@yahoo.com' },
  ];

  const handleLinkPress = (url: string) =>
    Linking.openURL(url).catch(err => console.error(err));

  const sharedHeight = 200;

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Image
            source={require('@/assets/images/GCCS-logo.png')}
            contentFit="contain"
            className="w-[50px] h-[50px] mr-3"
          />
          <Text className={`text-lg font-inter_bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Welcome to Grace Community Christian School
          </Text>
        </View>

        {/* Banner + Links */}
        <View className="px-4">
          <View className="flex-row overflow-hidden" style={{ height: sharedHeight }}>
            {/* Banner */}
            <Image
              source={require('@/assets/images/school_image.png')}
              contentFit="cover"
              className="flex-1 rounded-tl-lg rounded-bl-lg"
            />

            {/* Links */}
            <View className="flex-1">
              {links.map((item, idx) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleLinkPress(item.url)}
                    onHoverIn={() => setHoveredIndex(idx)}
                    onHoverOut={() => setHoveredIndex(null)}
                    className={`
                      justify-center
                      border
                      ${isDarkMode ? 'border-[#333]' : 'border-[#ccc]'}
                      ${idx === 0 ? 'rounded-tr-lg' : ''}
                      ${idx === links.length - 1 ? 'rounded-br-lg' : ''}
                      ${isHovered
                        ? isDarkMode
                          ? 'bg-[#2a2a2a]'
                          : 'bg-gray-200'
                        : isDarkMode
                        ? 'bg-[#1E1E1E]'
                        : 'bg-[#f0f0f0]'}
                    `}
                    style={{ height: sharedHeight / links.length }}
                  >
                    <Text
                      className={`
                        pl-4
                        ${isHovered ? 'underline' : ''}
                        ${isDarkMode ? 'text-white' : 'text-black'}
                      `}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Vision & Mission Header */}
        <View className="px-4 mt-6">
          <Text className={`text-xl font-inter_bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Mission &amp; Vision
          </Text>
        </View>

        {/* Vision & Mission Content */}
        <View
          className={`border-[1px] p-[15px] mx-[15px] mt-[10px] mb-[30px] rounded-[5px] ${
            isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-black'
          }`}
        >
          <Text className={`font-inter_bold mt-[10px] text-[16px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Mission
          </Text>
          <Text className={`font-inter_regular mt-[5px] text-[14px] leading-[22px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            To provide a quality education rooted in Christian values, fostering spiritual growth and intellectual excellence.
          </Text>

          <Text className={`font-inter_bold mt-[10px] text-[16px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Vision
          </Text>
          <Text className={`font-inter_regular mt-[5px] text-[14px] leading-[22px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Grace Christian Schools endeavors to help children develop and mature in a positive, Christ-centered environment that integrates faith and learning by emphasizing Biblical training and academic excellence.
          </Text>
        </View>
      </ScrollView>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default InstitutionWeb;
