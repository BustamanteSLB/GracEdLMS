import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from 'expo-font';
import "@/app/globals.css";
import { useEffect } from "react";
import { DarkModeProvider, useDarkMode } from '@/contexts/DarkModeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === '(auth)';
      // Define checks for being inside each role group
      const inAdminGroup = segments[0] === '(admins)';
      const inStudentGroup = segments[0] === '(students)';
      const inTeacherGroup = segments[0] === '(teachers)';

      if (isAuthenticated) {
        // User IS authenticated
        if (inAuthGroup) {
          // If authenticated and currently on an auth page (like signin),
          // redirect them to their correct dashboard based on their role.
          if (user?.role === 'Admin' && !inAdminGroup) {
             router.replace('/(admins)/dashboard');
          } else if (user?.role === 'Student' && !inStudentGroup) {
             router.replace('/(students)/dashboard');
          } else if (user?.role === 'Teacher' && !inTeacherGroup) {
             router.replace('/(teachers)/dashboard');
          }
          // If authenticated and already on the correct role dashboard group, do nothing.
          // Example: Authenticated Admin user is already in the '(admins)' segment.
        } else {
            // User is authenticated and NOT on an auth page.
            // Check if they are in the correct role group for their current path.
            // If an Admin user is somehow in the '(students)' segment, redirect them.
            if (user?.role === 'Admin' && !inAdminGroup && !inStudentGroup && !inTeacherGroup) {
                // If authenticated admin is not in any role group (e.g., index or unknown path)
                 router.replace('/(admins)/dashboard');
            } else if (user?.role === 'Student' && !inStudentGroup && !inAdminGroup && !inTeacherGroup) {
                 // If authenticated student is not in any role group
                 router.replace('/(students)/dashboard');
            } else if (user?.role === 'Teacher' && !inTeacherGroup && !inAdminGroup && !inStudentGroup) {
                 // If authenticated teacher is not in any role group
                 router.replace('/(teachers)/dashboard');
            }
            // If authenticated and in their correct role group already, do nothing.
        }
      } else {
        // User is NOT authenticated
        if (!inAuthGroup) {
          // If NOT authenticated and trying to access any page outside the auth group,
          // redirect them to the sign-in page.
          router.replace('/(auth)/signin');
        }
        // If NOT authenticated and already on an auth page, do nothing (stay on the signin page).
      }
    }
  }, [isAuthenticated, isLoading, user, segments, router]); // Keep router in dependencies

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
    <AuthProvider>
      <DarkModeProvider>
        <InitialLayout />
      </DarkModeProvider>
    </AuthProvider>
  );
}
