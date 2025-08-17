import { ActivityIndicator, Alert, Platform, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Divider from './Divider'
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
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
  
  // Use useCallback for handleLogout to prevent unnecessary re-renders and ensure stable reference
  const handleLogout = useCallback(async () => {
    if (isLoading) { // Prevent multiple logout attempts while one is in progress
      console.log('Logout already in progress.');
      return;
    }

    const confirmAndPerformLogout = async () => {
      console.log('Initiating logout process...');
      try {
        await logout(); // Call the logout function from AuthContext
        console.log('Logout successful, navigating to login screen...');
        // AuthContext's logout function handles token clearing and navigation.
        // No need for router.replace here, as AuthContext will do it.
      } catch (error) {
        console.error('Error during logout confirmation flow:', error);
        // AuthContext's logout should already handle displaying an alert if something critical fails.
        // If it doesn't, you might add a generic alert here:
        // Alert.alert('Logout Error', 'Failed to complete logout. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        confirmAndPerformLogout();
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
            onPress: confirmAndPerformLogout, // Directly call the async function
          },
        ],
        { cancelable: false }
      );
    }
  }, [logout, isLoading]); // Depend on logout and isLoading from AuthContext

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
    >
      <DrawerContentScrollView {...props}>
        <View className="items-center p-5 flex-row">
          <Image
            className='w-[72] h-[72]'
            contentFit="contain"
            source={require('../assets/images/GCCS-logo.png')}
            transition={200}
          />
          <Text className={`font-pbold text-xl text-center flex-shrink ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Grace Community Christian School</Text>
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
            isLoading ? ( // Show loading indicator if logout is in progress
              <ActivityIndicator size="small" color={isDarkMode ? 'white' : 'black'} />
            ) : (
              <LogoutIcon
                width={24} height={24}
                fill="#dc2626"
              />
            )
          )}
          label={()=>(
            <Text className="font-inter_semibold text-red-600">
              {isLoading ? 'Logging Out...' : 'Logout'}
            </Text>
          )}
          onPress={handleLogout}
        />
      </DrawerContentScrollView>
    </SafeAreaView>
  )
}

export default CustomDrawerContent
