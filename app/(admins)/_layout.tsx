import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, Pressable, TouchableOpacity } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useDarkMode } from '../../contexts/DarkModeContext';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import DashboardIcon from '@/assets/icons/dashboard.svg'
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import DrawerIcon from '@/assets/icons/drawer_menu.svg'

export default function DrawerLayout() {

  const { isDarkMode } = useDarkMode();
  cssInterop(Image, { className: "style" });

  return (
    <GestureHandlerRootView className='flex-1'>
      <Drawer 
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          drawerActiveTintColor: 'black',
          drawerActiveBackgroundColor: Platform.select({
            android: '#4ADE80',
            ios: '#93C5FD',
            web: '#A78BFA'
          }),
          drawerHideStatusBarOnOpen: false,
          drawerInactiveTintColor: isDarkMode ? '#E0E0E0' : 'black',
          headerLeft: () => (
            <Pressable className="ml-2 mr-2" onPress={() => navigation.toggleDrawer()}>
              <DrawerIcon width={24} height={24} fill="white"/>
            </Pressable>
          )
        })}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerIcon:({focused})=>(
              <DashboardIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Dashboard", 
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },           
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"Dashboard",
          }}
        />
        <Drawer.Screen
          name="user-management"
          options={{
            drawerIcon:({focused})=>(
              <Image
                className='w-[24] h-[24]'
                source={require('@/assets/icons/account.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "User Management", 
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },           
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"User Management",
          }}
        />
        <Drawer.Screen
          name="edit-user"
          options={{
            drawerIcon:({focused})=>(
              <Image
                className='w-[24] h-[24]'
                source={require('@/assets/icons/edit.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerItemStyle: { display: 'none' }, // Hide this item from the drawer
            drawerLabel: "Edit User", 
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },
            headerShown: false,           
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"Edit User",
          }}
        />
        <Drawer.Screen
          name="add-user"
          options={{
            drawerIcon:({focused})=>(
              <Image
                className='w-[24] h-[24]'
                source={require('@/assets/icons/add_user.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerItemStyle: { display: 'none' }, // Hide this item from the drawer
            drawerLabel: "Add User", 
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },
            headerShown: false,           
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"Add User",
          }}
        />
        <Drawer.Screen
          name="archives"
          options={{
            drawerIcon:({focused})=>(
              <Image
                className='w-[24] h-[24]'
                source={require('@/assets/icons/archive.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Archives", 
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },        
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"Archives",
          }}
        />
        <Drawer.Screen
          name="calendar-screen"
          options={{
            drawerIcon:({focused})=>(
              <CalendarIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Calendar",
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },            
            headerStyle: {
              backgroundColor: Platform.select({
                android: '#22C55E',
                ios: '#3B82F6',
                web: '#6D28D9',
              }),
            },
            headerTintColor: 'white', 
            headerTitleAlign: 'left',             
            headerTitleStyle: {
              fontFamily: 'Poppins-Bold',
              marginTop: Platform.select({
                web: 0,
                default: 5
              })
            },
            title:"Calendar",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  )
}
