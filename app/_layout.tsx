import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import "@/app/globals.css"; 
import { useEffect } from "react";
import { Platform } from "react-native";
import { DarkModeProvider, useDarkMode } from '@/contexts/DarkModeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === '(auth)';
      const inAdminGroup = segments[0] === '(admins)';
      const inStudentGroup = segments[0] === '(students)';
      const inTeacherGroup = segments[0] === '(teachers)';
      
      // Check if on mobile platform
      const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

      if (isAuthenticated) {
        // Block admin access on mobile
        if (isMobile && user?.role === 'Admin') {
          // This shouldn't happen due to AuthContext checks, but as a safety measure
          router.replace('/(auth)/signin');
          return;
        }

        if (inAuthGroup) {
          // Redirect authenticated users from auth pages to their dashboard
          if (user?.role === 'Admin') {
            router.replace('/(admins)/dashboard');
          } else if (user?.role === 'Student') {
            router.replace('/(students)/dashboard');
          } else if (user?.role === 'Teacher') {
            router.replace('/(teachers)/dashboard');
          }
        } else {
          // Prevent users from accessing wrong role pages
          if (user?.role === 'Admin' && (inStudentGroup || inTeacherGroup)) {
            router.replace('/(admins)/dashboard');
          } else if (user?.role === 'Student' && (inAdminGroup || inTeacherGroup)) {
            router.replace('/(students)/dashboard');
          } else if (user?.role === 'Teacher' && (inAdminGroup || inStudentGroup)) {
            router.replace('/(teachers)/dashboard');
          } else if (!inAdminGroup && !inStudentGroup && !inTeacherGroup) {
            // User is on index or unknown path, redirect to their role dashboard
            if (user?.role === 'Admin') {
              router.replace('/(admins)/dashboard');
            } else if (user?.role === 'Student') {
              router.replace('/(students)/dashboard');
            } else if (user?.role === 'Teacher') {
              router.replace('/(teachers)/dashboard');
            }
          }
        }
      } else {
        // Block admin pages access on mobile even when not authenticated
        if (isMobile && inAdminGroup) {
          router.replace('/(auth)/signin');
          return;
        }

        if (!inAuthGroup) {
          router.replace('/(auth)/signin');
        }
      }
    }
  }, [isAuthenticated, isLoading, user, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(admins)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(students)" options={{ headerShown: false }} />
      <Stack.Screen name="(teachers)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    // Inter weights
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    
    // Poppins weights
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const { isDarkMode } = useDarkMode();
  
  const isWeb = Platform.OS === 'web'

  useEffect(()=>{
    if (error){
      throw error;
    }
    if (fontsLoaded || isWeb){
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error, isWeb]);

  if (!fontsLoaded && !error && !isWeb) {
    return null;
  }

  return (
    <AuthProvider>
      <DarkModeProvider>
        <InitialLayout />
      </DarkModeProvider>
    </AuthProvider>
  );
}
