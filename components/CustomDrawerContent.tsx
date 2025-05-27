import { Alert, Platform, Switch, Text, View, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Divider from './Divider'
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import DarkModeIcon from '@/assets/icons/dark_mode.svg'
import LogoutIcon from '@/assets/icons/logout.svg'

const CustomDrawerContent = (props:any) => {

  cssInterop(Image, { className: "style" });
  cssInterop(DarkModeIcon, { className: "style"});

  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isEnabled, setIsEnabled] = useState(false);
  const { logout, isLoading } = useAuth(); // Also get isLoading to potentially disable logout during initial load
  
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);
  
  const handleLogout = async () => { // Make handleLogout async
    const performLogout = async () => {
      console.log('Attempting to log out...');
      try {
        await logout(); // Call the logout function from AuthContext
        console.log('Logout successful.');
        // The AuthContext state change should automatically trigger navigation in _layout.tsx
        // router.replace('/(auth)/signin'); // This line is now often redundant due to _layout.tsx
      } catch (error) {
        console.error('Logout failed:', error);
        Alert.alert('Logout Failed', 'An error occurred during logout.');
        // Even if API call fails, AuthContext clears local storage, so still attempt redirect
        // if you kept the router.replace above. If relying solely on _layout,
        // the state would remain authenticated if the logout() call itself failed.
        // Given logout primarily clears client state with JWT, error here is less likely from backend
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        performLogout(); // Call the async function
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: () => {
              performLogout(); // Call the async function
            },
          },
        ],
        { cancelable: false }
      );
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <DrawerContentScrollView {...props}>
        <View className="items-center p-5 flex-row">
          <TouchableOpacity
            className="flex-row items-center w-full"
            onPress={() => router.replace('/(students)/dashboard')}
            activeOpacity={0.7}
            style={{ flex: 1 }}
          >
            <Image
              className='w-[72] h-[72]'
              contentFit="contain"
              source={require('../assets/images/GCCS-logo.png')}
              transition={200}
            />
            <Text
              className={`font-pbold text-xl text-left flex-shrink flex-wrap ml-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              numberOfLines={2}
              style={{ flexShrink: 1, flexWrap: 'wrap' }}
            >
              Grace Community Christian School
            </Text>
          </TouchableOpacity>
        </View>
        <Divider />
        <View className="flex-row items-center ios:p-1 android:p-1 web:p-4">
          <DarkModeIcon
            className="ios:ml-3 android:ml-3 web:ml-0"
            width={24} height={24}
            fill={isDarkMode ? '#E0E0E0' : 'black'}
          />
          <Text className={`font-inter_semibold mr-auto ios:ml-4 android:ml-4 web:ml-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Dark Mode</Text>
          <Switch
            {...Platform.select({
              web:{
                activeThumbColor:'white'
              }
            })}
            className="mr-3"
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={isDarkMode ? 'white' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleDarkMode}
            value={isDarkMode}
          />
        </View>
        <DrawerItemList {...props}/>
        <DrawerItem
          icon={() => (
            <LogoutIcon
              width={24} height={24}
              fill="#dc2626"
            />
          )}
          label={()=>(
            <Text className="font-inter_semibold text-red-600">Logout</Text>
          )}
          onPress={handleLogout}
        />
      </DrawerContentScrollView>
    </SafeAreaView>
  )
}

export default CustomDrawerContent
