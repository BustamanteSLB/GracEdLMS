import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, Platform, Pressable } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { useDarkMode } from '../../contexts/DarkModeContext';
import ActivityIcon from '@/assets/icons/activity.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import CoursesIcon from '@/assets/icons/course_book.svg'
import DashboardIcon from '@/assets/icons/dashboard.svg'
import GradesIcon from '@/assets/icons/grades.svg'
import InstitutionIcon from '@/assets/icons/institution.svg'
import ProfileIcon from '@/assets/icons/account.svg'
import DrawerIcon from '@/assets/icons/drawer_menu.svg'

export default function DrawerLayout() {

  const { isDarkMode } = useDarkMode();

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
          name="institution"
          options={{
            drawerIcon:({focused})=>(
              <InstitutionIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
              <ProfileIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
          name="edit-profile"
          options={{
            drawerIcon:({focused})=>(
              <ProfileIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            headerShown: false,
            drawerLabel: "Edit Profile",
            drawerLabelStyle:{
              fontFamily: 'Inter-24pt-SemiBold'
            },
            drawerItemStyle: { display: 'none' },
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
            title:"Edit Profile",
          }}
        />
        <Drawer.Screen
          name="activity"
          options={{
            drawerIcon:({focused})=>(
              <ActivityIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
          name="quizzes"
          options={{
            drawerIcon:({focused})=>(
              <Image
                style={{ width: 24, height: 24 }}
                source={require('@/assets/icons/quizzes.png')}
                tintColor={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
              />
            ),
            drawerLabel: "Quizzes",
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
            title:"Quizzes",
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
            drawerLabel: "Subjects",
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
            title:"Subjects",
          }}
        />
        <Drawer.Screen
          name="grades"
          options={{
            drawerIcon:({focused})=>(
              <GradesIcon
                width={24} height={24}
                fill={focused ? 'black' : (isDarkMode ? '#E0E0E0' : 'black')}
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
