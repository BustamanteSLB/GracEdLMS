import { Image, Text, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer'
import { useRouter } from 'expo-router'

const CustomDrawerContent = (props:any) => {

  const router = useRouter();
  
  const handleLogout= () =>{
    console.log('Logging out...')
    router.replace('/(auth)/signin');
  }

  return (
    <SafeAreaView className="flex-1">
      <DrawerContentScrollView {...props}>
        <View className="items-center p-5 flex-row">
          <Image
            className="w-24 h-24"
            resizeMethod="scale"
            resizeMode="contain"
            source={require('../assets/images/GCCS-logo.png')}
          />
          <Text className="font-pbold text-xl text-center flex-shrink">Grace Community Christian School</Text>
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
