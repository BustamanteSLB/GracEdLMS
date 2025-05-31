import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import { FlashList } from '@shopify/flash-list'
import CustomButton from '@/components/CustomButton'

cssInterop(Image, { className: "style" });

interface UserListApiResponse extends ApiResponse {
  data?: User[]; // Expecting an array of User objects in the data field
}

const ArchivesAndroid = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [users, setUsers] = useState<User[]>([]); // Renamed from 'admins' to 'users'
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Stores ID_action, e.g., "userId_restore"

    // Fetch users from the API based on the selected role and status
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL users first, then filter client-side for 'archived'
      // OR directly query for archived users if backend getAllUsers supports it well.
      // Your current backend getAllUsers will use status=archived if passed.
      const response = await apiClient.get<UserListApiResponse>('/users', {
        params: { status: 'archived' }, // Directly fetching archived users is more efficient
      });

      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch archived users.');
        setUsers([]); // Clear users on failure
      }
    } catch (err: any) {
      console.error('Error fetching archived users:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching archived users.'
      );
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRestoreUser = async (userId: string, username: string) => {
    Alert.alert(
      'Confirm Restoration',
      `Are you sure you want to restore user "${username}"? Their status will be set to 'active'.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Restore cancelled'),
        },
        {
          text: 'Restore',
          onPress: async () => {
            setActionLoading(`${userId}_restore`);
            try {
              const response = await apiClient.put<ApiResponse>(`/users/${userId}/restore`, { status: 'active' }); // Restore to active
              if (response.data.success) {
                Alert.alert('Success', `User ${username} restored successfully.`); // Changed to Alert.alert
                setUsers(prevUsers => prevUsers.filter(user => user._id !== userId)); // Remove from current list
              } else {
                Alert.alert('Error', response.data.message || 'Failed to restore user.'); // Changed to Alert.alert
              }
            } catch (err: any) {
              console.error('Error restoring user:', err);
              Alert.alert('Error', err.response?.data?.message || 'An error occurred while restoring the user.'); // Changed to Alert.alert
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePermanentDeleteUser = async (userId: string, username: string) => {
    Alert.alert(
      'Confirm Permanent Deletion',
      `DANGER: Are you sure you want to PERMANENTLY DELETE user "${username}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled'),
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(`${userId}_delete`);
            try {
              const response = await apiClient.delete<ApiResponse>(`/users/${userId}/permanent`);
              if (response.data.success) {
                Alert.alert('Success', `User ${username} permanently deleted.`); // Changed to Alert.alert
                setUsers(prevUsers => prevUsers.filter(user => user._id !== userId)); // Remove from current list
              } else {
                Alert.alert('Error', response.data.message || 'Failed to permanently delete user.'); // Changed to Alert.alert
              }
            } catch (err: any) {
              console.error('Error permanently deleting user:', err);
              Alert.alert('Error', err.response?.data?.message || 'An error occurred while deleting the user.'); // Changed to Alert.alert
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          {`Loading Archived Users...`}
        </Text>
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
  
  if (users.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/admin_background.png')}
        />
          <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
            {`No archived users found.`}
          </Text>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <View className='flex-row'>
        <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Archived Users List
        </Text>
        <TouchableOpacity
          className='bg-blue-400 rounded-xl h-[50px] justify-center items-center ml-auto mr-3 p-2'
          onPress={fetchUsers}
          activeOpacity={0.7}
        >
          <Text className='text-black font-psemibold text-lg'>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
      <FlashList
        data={users}
        renderItem={({ item }: { item: User }) => {
          return (
            <View className={`flex-row items-center p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Image
                source={ item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')} // Assuming profilePicture is a URL
                className="w-12 h-12 rounded-full self-start"
                contentFit="cover"
                cachePolicy="memory-disk" // Optimize image caching
              />
              <View className='flex-column ml-2 flex-shrink self-start'>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.email}
                </Text>
                <View className='flex-row'>
                  <Text className={`font-inter_semibold text-sm mr-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Status:
                  </Text>
                  <Text className={`font-inter_regular text-sm 
                    ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {item.status === 'archived' ? 'Archived' : 'Active'}
                  </Text>
                </View>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Archived At: {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>

              <View className='ml-auto flex-row self-start'>
                <CustomButton
                  containerStyles='bg-secondary-android h-[50px] mr-2 p-2'
                  handlePress={() => handleRestoreUser(item._id, item.firstName)}
                  title='Restore'
                />
                <CustomButton
                  containerStyles='bg-red-600 h-[50px] p-2'
                  handlePress={() => handlePermanentDeleteUser(item._id, item.firstName)}
                  title='Delete'
                />
              </View>              
            </View>
          )
        }}
        keyExtractor={(item) => item._id} // Unique key for each item
        estimatedItemSize={50} // Estimate item size for performance (adjust as needed)
        extraData={isDarkMode}
        onRefresh={fetchUsers}
        refreshing={refreshing}
      />
    </SafeAreaView>
  )
}

export default ArchivesAndroid