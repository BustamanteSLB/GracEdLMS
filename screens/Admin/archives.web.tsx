import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import DeleteIcon from '@/assets/icons/delete.svg';

cssInterop(Image, { className: "style" });

interface UserListApiResponse extends ApiResponse {
  data?: User[]; // Expecting an array of User objects in the data field
}

const ArchivesWeb = () => {

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
    const confirmRestore = window.confirm(`Are you sure you want to restore user "${username}"? Their status will be set to 'active'.`);
    if (!confirmRestore) return;

    setActionLoading(`${userId}_restore`);
    try {
      const response = await apiClient.put<ApiResponse>(`/users/${userId}/restore`, { status: 'active' }); // Restore to active
      if (response.data.success) {
        window.alert(`Success: User ${username} restored successfully.`); // Changed to window.alert
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId)); // Remove from current list
      } else {
        window.alert(`Error: ${response.data.message || 'Failed to restore user.'}`); // Changed to window.alert
      }
    } catch (err: any) {
      console.error('Error restoring user:', err);
      window.alert(`Error: ${err.response?.data?.message || 'An error occurred while restoring the user.'}`); // Changed to window.alert
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteUser = async (userId: string, username: string) => {
    const confirmDelete = window.confirm(
      `DANGER: Are you sure you want to PERMANENTLY DELETE user "${username}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionLoading(`${userId}_delete`);
    try {
      const response = await apiClient.delete<ApiResponse>(`/users/${userId}/permanent`);
      if (response.data.success) {
        window.alert(`Success: User ${username} permanently deleted.`); // Changed to window.alert
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId)); // Remove from current list
      } else {
        window.alert(`Error: ${response.data.message || 'Failed to permanently delete user.'}`); // Changed to window.alert
      }
    } catch (err: any) {
      console.error('Error permanently deleting user:', err);
      window.alert(`Error: ${err.response?.data?.message || 'An error occurred while deleting the user.'}`); // Changed to window.alert
    } finally {
      setActionLoading(null);
    }
  };

  // --- VirtualizedList specific functions ---
  const getItemCount = (_data: User[] | null | undefined) => _data ? _data.length : 0;
  
  const getItem = (_data: User[] | null | undefined, index: number): User => {
    return (_data as User[])[index];
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
      <View className='flex-row mt-2'>
        <Text className={`font-inter_bold mx-4 mt-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Archived Users List
        </Text>
        <TouchableOpacity
          className={`rounded-lg justify-center items-center ml-auto mr-3 p-2 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
          onPress={fetchUsers}
          activeOpacity={0.7}
        >
          <View className='flex-row'>
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              cachePolicy="memory-disk"
              tintColor={loading ? '#999' : isDarkMode ? '#E0E0E0' : 'white'}
            />
          </View>
        </TouchableOpacity>
      </View>
      <VirtualizedList
        data={users}
        renderItem={({ item }: { item: User }) => {
          const isRestoring = actionLoading === `${item._id}_restore`;
          const isDeleting = actionLoading === `${item._id}_delete`;
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
               <TouchableOpacity
                  className={`rounded-lg justify-center items-center mr-1 p-2 ${isDarkMode ? 'bg-green-600' : 'bg-green-500'}`}
                  onPress={() => handleRestoreUser(item._id, item.username)}
                  activeOpacity={0.7}
                  disabled={isRestoring || isDeleting || !!actionLoading} // Disable if any action is loading
                >
                  <Image
                    className="w-[24] h-[24]"
                    contentFit="contain"
                    source={require('@/assets/icons/restore.png')}
                    cachePolicy="memory-disk"
                    tintColor={loading ? '#999' : isDarkMode ? '#E0E0E0' : 'white'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-lg justify-center items-center p-2 ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
                  onPress={() => handlePermanentDeleteUser(item._id, item.username)}
                  activeOpacity={0.7}
                  disabled={isDeleting || isRestoring || !!actionLoading}
                >
                  <DeleteIcon width={24} height={24} fill={isDarkMode ? '#E0E0E0' : 'white'} />
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        keyExtractor={(item) => item._id}
        getItem={getItem}
        getItemCount={getItemCount}
        extraData={isDarkMode}
        onRefresh={fetchUsers}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
    </SafeAreaView>
  )
}

export default ArchivesWeb