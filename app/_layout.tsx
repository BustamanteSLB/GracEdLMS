import { SplashScreen, Stack } from "expo-router";
import { useFonts } from 'expo-font';
import "./globals.css";
import { useEffect } from "react";
import { DarkModeProvider, useDarkMode } from '../contexts/DarkModeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    // Inter 18pt
    'Inter-18pt-ExtraLight': require('../assets/fonts/Inter-18pt-Regular.ttf'),
    'Inter-18pt-Italic': require('../assets/fonts/Inter-18pt-Italic.ttf'),
    'Inter-18pt-Light': require('../assets/fonts/Inter-18pt-Light.ttf'),
    'Inter-18pt-Medium': require('../assets/fonts/Inter-18pt-Medium.ttf'),
    'Inter-18pt-Regular': require('../assets/fonts/Inter-18pt-Regular.ttf'),
    'Inter-18pt-Thin': require('../assets/fonts/Inter-18pt-Thin.ttf'),
    // Inter 24pt
    'Inter-24pt-Bold': require('../assets/fonts/Inter-24pt-Bold.ttf'),
    'Inter-24pt-SemiBold': require('../assets/fonts/Inter-24pt-SemiBold.ttf'),
    // Inter 28pt
    'Inter-28pt-Black': require('../assets/fonts/Inter-28pt-Black.ttf'),
    'Inter-28pt-ExtraBold': require('../assets/fonts/Inter-28pt-ExtraBold.ttf'),
    // Poppins
    'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins-ExtraLight.ttf'),
    'Poppins-Italic': require('../assets/fonts/Poppins-Italic.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins-Thin.ttf'),
  });

  const { isDarkMode } = useDarkMode();
  
  useEffect(()=>{
    if (error){
      throw error;
    }
    if (fontsLoaded){
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error])

  if (!fontsLoaded && !error){
    return null;
  }

  return (
    <DarkModeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(admins)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(students)" options={{ headerShown: false }} />
        <Stack.Screen name="(teachers)" options={{ headerShown: false }} />
      </Stack>
    </DarkModeProvider>
  );
}
