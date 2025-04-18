import { Image, Platform, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Divider from './Divider'
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer'
import { useRouter } from 'expo-router'
import { useState } from 'react'

const CustomDrawerContent = (props:any) => {

  const router = useRouter();

  const [isEnabled, setIsEnabled] = useState(false);
  
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);
  
  const handleLogout= () =>{
    console.log('Logging out...')
    router.replace('/(auth)/signin');
  }

  return (
    <SafeAreaView className="flex-1">
      <DrawerContentScrollView {...props}>
        <View className="items-center p-5 flex-row">
          <Image
            style={{width: 72, height: 72}}
            resizeMethod="scale"
            resizeMode="contain"
            source={require('../assets/images/GCCS-logo.png')}
          />
          <Text className="font-pbold text-xl text-center flex-shrink">Grace Community Christian School</Text>
        </View>
        <Divider />
        <View className="flex-row items-center ios:p-1 android:p-1 web:p-4">
          <Image
            className="ios:ml-3 android:ml-3 web:ml-0"
            source={require('../assets/icons/dark_mode.png')}
            tintColor="black"
          />
          <Text className="font-inter_semibold mr-auto ios:ml-4 android:ml-4 web:ml-3">Dark Mode</Text>
          <Switch
            {...Platform.select({
              web:{
                activeThumbColor:'white'
              }
            })}
            className="mr-3"
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={isEnabled ? 'white' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View>
        <DrawerItemList {...props}/>
        <DrawerItem
          icon={() => (
            <Image
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
