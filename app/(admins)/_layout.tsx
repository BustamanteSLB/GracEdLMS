import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, Pressable, TouchableOpacity } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useDarkMode } from '../../contexts/DarkModeContext';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import CoursesIcon from '@/assets/icons/course_book.svg'
import DashboardIcon from '@/assets/icons/dashboard.svg'
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import ActivityIcon from '@/assets/icons/activity.svg';
import GradesIcon from '@/assets/icons/grades.svg'
import InstitutionIcon from '@/assets/icons/institution.svg'
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
          drawerActiveBackgroundColor: '#93C5FD',
          drawerHideStatusBarOnOpen: false,
          drawerInactiveTintColor: isDarkMode ? '#E0E0E0' : 'black',
          headerLeft: () => (
            <TouchableOpacity className="ml-3 mr-2" onPress={() => navigation.toggleDrawer()}>
              <DrawerIcon width={24} height={24} fill="white"/>
            </TouchableOpacity>
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
              fontFamily: 'Inter-SemiBold'
            },           
            headerStyle: {
              backgroundColor: '#4276B4',
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
          name="school-page"
          options={{
            drawerIcon:({focused})=>(
              <InstitutionIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "School Page",
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },            
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"School Page",
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
              fontFamily: 'Inter-SemiBold'
            },           
            headerStyle: {
              backgroundColor: '#4276B4',
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
              fontFamily: 'Inter-SemiBold'
            },
            headerShown: false,           
            headerStyle: {
              backgroundColor: '#4276B4',
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
              fontFamily: 'Inter-SemiBold'
            },
            headerShown: false,           
            headerStyle: {
              backgroundColor: '#4276B4',
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
            drawerLabel: "Archived Users", 
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },        
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"Archived Users",
          }}
        />
        <Drawer.Screen
          name="subjects"
          options={{
            drawerIcon:({focused})=>(
              <CoursesIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Subject Management",
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },            
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"Subject Management",
          }}
        />
        <Drawer.Screen
          name="subjects/[id]"
          options={{
            drawerIcon:({focused})=>(
              <CoursesIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            headerShown: false,
            drawerLabel: "Subject Details",
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },            
            drawerItemStyle: { display: 'none' },
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"Subject Details",
          }}
        />
        <Drawer.Screen
          name="subject-archives"
          options={{
            drawerIcon:({focused})=>(
              <Image
                className='w-[24] h-[24]'
                source={require('@/assets/icons/archive.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Archived Subjects",
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },            
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"Archived Subjects",
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
            drawerLabel: "Calendar Management",
            drawerLabelStyle:{
              fontFamily: 'Inter-SemiBold'
            },            
            headerStyle: {
              backgroundColor: '#4276B4',
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
            title:"Calendar Management",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  )
}
