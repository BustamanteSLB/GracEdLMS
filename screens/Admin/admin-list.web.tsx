import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'

import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';

// Define a type for the data structure expected from the API response for the list of users
interface UserListApiResponse extends ApiResponse {
  data?: User[]; // Expecting an array of User objects in the data field
  // Include pagination or other fields if your API returns them
}

// Component to render a single admin item in the list (can reuse the one from Android version)
const AdminListItem = ({ admin, isDarkMode }: { admin: User, isDarkMode: boolean }) => (
  <View className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex-row items-center`}>
    {/* You can add an avatar/profile picture here if available */}
    <Image
      className='w-10 h-10 rounded-full mr-4'
      source={admin.profilePicture ? { uri: admin.profilePicture } : require('@/assets/images/sample_profile_picture.png')}// Use default if no profile picture
      contentFit="cover"
    /> 
    <View className="flex-1">
      <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
        {`${admin.firstName} ${admin.lastName}`}
      </Text>
      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {`${admin.email}`}
      </Text>
        {/* Add other admin details you want to display */}
        {/* <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Username: {admin.username}
        </Text> */}
    </View>
  </View>
);

const ManageAdminsWeb = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [admins, setAdmins] = useState<User[]>([]); // State to hold the list of admins
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState<string | null>(null); // State for error messages

  cssInterop(Image, { className: "style" });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors

        // Make API call to fetch users with role 'Admin'
        const response = await apiClient.get<UserListApiResponse>('/users', {
          params: { role: 'Admin' } // Pass role as a query parameter
        });

        if (response.data.success && response.data.data) {
          setAdmins(response.data.data); // Set the fetched list of admins
        } else {
          // Handle API response success: false
          setError(response.data.message || 'Failed to fetch admins.');
        }
      } 
      catch (err: any) {
        // Handle network or API call errors
        console.error('Error fetching admins:', err);
        setError(
          err.response?.data?.message ||
          err.message ||
          'An error occurred while fetching admins.'
        );
      } 
      finally {
        setLoading(false); // Set loading to false after fetch
      }
    };
    fetchAdmins(); // Call the fetch function when the component mounts
    // Optional: return a cleanup function if needed (e.g., to cancel ongoing fetch)
    // return () => { /* cleanup */ };
  }, []); // Empty dependency array means this effect runs only once after initial render

  // --- VirtualizedList specific functions ---
  const getItemCount = (_data: User[] | null | undefined) => _data ? _data.length : 0;

  const getItem = (_data: User[] | null | undefined, index: number): User => {
    // VirtualizedList requires a function to get the item at a specific index
    // We assert that _data is not null/undefined based on getItemCount
    return (_data as User[])[index];
  };

  // Function to render each item in the VirtualizedList
  const renderAdminItem = ({ item, index }: { item: User, index: number }) => (
    <AdminListItem admin={item} isDarkMode={isDarkMode} />
  );

  // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{`Loading Admins...`}</Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center text-red-500 ${isDarkMode ? 'text-red-400' : 'text-red-600'} `}>
          {`Error: ${error}`}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (admins.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/admin_background.png')}
          transition={200}
        />
        <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
          {`No admin accounts found.`}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  // If not loading, no error, and admins exist, render the VirtualizedList
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <View className="flex-1 px-4"> {/* Add padding if needed */}
        <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Admins List</Text>
        <VirtualizedList
          data={admins} // The array of admin users
          renderItem={renderAdminItem} // The function to render each item
          keyExtractor={(item) => item._id} // Unique key for each item
          getItemCount={getItemCount} // Required by VirtualizedList
          getItem={getItem} // Required by VirtualizedList
        />
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default ManageAdminsWeb