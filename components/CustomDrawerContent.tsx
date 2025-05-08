import { Alert, Platform, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Divider from './Divider'
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useDarkMode } from '../contexts/DarkModeContext';

const CustomDrawerContent = (props:any) => {

  cssInterop(Image, { className: "style" });

  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isEnabled, setIsEnabled] = useState(false);
  
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);
  
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        console.log('Logging out...');
        router.replace('/(auth)/signin');
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
              console.log('Logging out...');
              router.replace('/(auth)/signin');
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
          <Image
            className="ios:ml-3 android:ml-3 web:ml-0 w-[24px] h-[24px]"
            source={require('../assets/icons/dark_mode.png')}
            tintColor={`${isDarkMode ? '#E0E0E0' : 'black'}`}
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
            <Image
              className="w-[24px] h-[24px]"
              source={require('../assets/icons/logout.png')}
              tintColor="#dc2626"
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
