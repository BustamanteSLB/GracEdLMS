import { Text, TouchableOpacity, useColorScheme, View, VirtualizedList, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDarkMode } from '@/contexts/DarkModeContext';
import AccountIcon from '@/assets/icons/account.svg';
import { useAuth } from '@/contexts/AuthContext';
import ArchiveIcon from '@/assets/icons/archive.svg';
import CoursesIcon from '@/assets/icons/course_book.svg'
import InstitutionIcon from '@/assets/icons/institution.svg'

cssInterop(VirtualizedList, { className: "style" });
cssInterop(Image, { className: "style" });

const DBWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user } = useAuth();
  
  const data = [
    {
      description: 'Add, update, delete, and store user information.',
      Icon: AccountIcon,
      title: 'User Management',
      onPress: () => router.replace('/(admins)/user-management')
    },
    {
      description: 'View archived users and decide whether to restore or delete them.',
      Icon: ArchiveIcon,
      title: 'Archives',
      onPress: () => router.replace('/(admins)/archives')
    },
    {
      description: 'Check the current date.',
      Icon: InstitutionIcon,
      title: 'Calendar',
      onPress: () => router.replace('/(admins)/calendar-screen')
    },
  ];

  const getItem = (data: { [x: string]: any; }, index: string | number) => data[index];
  const getItemCount = (data: string | any[]) => data.length;

  const [isPortrait, setIsPortrait] = useState(true);

  
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsPortrait(height >= width);
    };
    
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    // Initial check
    updateOrientation();
    
    return () => {
      subscription.remove();
    };
  }, []);

  if (!user) {
    // Handle case where user is not loaded yet, or redirect
    return <Text>Loading...</Text>;
  }
  
  return (
    <SafeAreaView className={`flex-1 justify-center ${isPortrait ? 'items-center' : 'items-start'} ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-left self-start font-inter_bold ml-[12px] mt-[12px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} sm:text-sm md:text-base lg:text-lg`}>Welcome, {user.firstName}! Your role is: {user.role}</Text>
      <VirtualizedList
        data={data}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className={
              `min-h-[125px] rounded-[10px] flex-row m-[12px] p-[12px]
              ${isPortrait ? 'w-auto' : 'w-[300px]'}
              ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-md'}`
            } 
            onPress={item.onPress}>
            <View>
              <item.Icon width={50} height={50} fill={`${isDarkMode ? '#E0E0E0' : 'black'}`} />
            </View>
            <View className="ml-[10px] mb-[10px] flex-shrink">
              <Text className={
                  `text-[24px] font-inter_bold mb-[3px] 
                  ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`
                }>
                  {item.title}
              </Text>
              <Text className={`text-[14px] font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => index.toString()}
        getItem={getItem}
        getItemCount={getItemCount}
        contentContainerStyle={{ 
          flexDirection: isPortrait ? 'column' : 'row',
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
        }}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default DBWeb;
