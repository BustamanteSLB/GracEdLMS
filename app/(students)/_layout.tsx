import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, Platform } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useDarkMode } from '../../contexts/DarkModeContext';

export default function DrawerLayout() {

  const { isDarkMode } = useDarkMode();

  return (
    <GestureHandlerRootView className='flex-1'>
      <Drawer 
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerActiveTintColor: 'black',
          drawerActiveBackgroundColor: Platform.select({
            android: '#4ADE80',
            ios: '#93C5FD',
            web: '#A78BFA'
          }),
          drawerHideStatusBarOnOpen: false,
          drawerInactiveTintColor: isDarkMode ? '#E0E0E0' : 'black',
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/dashboard.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
          name="institution"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/institute.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Institution",
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
            title:"Institution",
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/account.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Profile",
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
            title:"Profile",
          }}
        />
        <Drawer.Screen
          name="activity"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/activity.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Activity",
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
            title:"Activity",
          }}
        />
        <Drawer.Screen
          name="courses"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/course_book.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Courses",
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
            title:"Courses",
          }}
        />
        <Drawer.Screen
          name="grades"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/grades.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Grades",
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
            title:"Grades",
          }}
        />
        <Drawer.Screen
          name="calendar-screen"
          options={{
            drawerIcon:({focused})=>(
              <Image
                source={require('../../assets/icons/calendar_month.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
