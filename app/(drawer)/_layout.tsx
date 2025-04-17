import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, Platform } from 'react-native';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView className='flex-1'>
      <Drawer 
        screenOptions={{
          drawerActiveTintColor:'black',
          drawerActiveBackgroundColor: Platform.select({
            android: '#4ADE80',
            ios: '#93C5FD',
            web: '#A78BFA'
          }),
          drawerHideStatusBarOnOpen: true,
          drawerInactiveTintColor:'gray',
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerIcon:()=>(
              <Image
                source={require('../../assets/icons/dashboard.png')}
                tintColor='black'
              />
            ),
            drawerLabel: "Home", 
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
            drawerIcon:()=>(
              <Image
                source={require('../../assets/icons/institute.png')}
                tintColor='black'
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
          name="activity"
          options={{
            drawerIcon:()=>(
              <Image
                source={require('../../assets/icons/activity.png')}
                tintColor='black'
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
          name="profile"
          options={{
            drawerIcon:()=>(
              <Image
                source={require('../../assets/icons/account.png')}
                tintColor='black'
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
      </Drawer>
    </GestureHandlerRootView>
  )
}