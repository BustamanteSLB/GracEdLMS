import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import { cssInterop } from 'nativewind'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  VirtualizedList,
  useColorScheme,
  Alert as RNAlert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import apiClient, { ApiResponse } from '@/app/services/apiClient'
import { User } from '@/app/types/index'

// Cross-platform confirm: web uses window.confirm, native skips confirm
function confirmDelete(message: string): boolean {
  if (typeof window !== 'undefined' && window.confirm) {
    return window.confirm(message)
  }
  // Native: fallback to RNAlert without confirmation
  return true
}

// Cross-platform alert: web uses window.alert
function showAlert(title: string, message?: string) {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    // @ts-ignore
    RNAlert.alert(title, message)
  }
}

interface UserListApiResponse extends ApiResponse {
  data?: User[]
}

const AdminListItem = ({
  admin,
  isDarkMode,
  onEdit,
  onDelete
}: {
  admin: User
  isDarkMode: boolean
  onEdit: (u: User) => void
  onDelete: (id: string) => void
}) => (
  <View
    className={`p-4 border-b ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    } flex-row items-center justify-between`}
  >
    <View className="flex-row items-center">
      <Image
        className="w-10 h-10 rounded-full mr-4"
        source={
          admin.profilePicture
            ? { uri: admin.profilePicture }
            : require('@/assets/images/sample_profile_picture.png')
        }
        contentFit="cover"
      />
      <View>
        <Text
          className={`font-inter_semibold text-lg ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          {admin.firstName} {admin.lastName}
        </Text>
        <Text
          className={`font-inter_regular text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {admin.email}
        </Text>
      </View>
    </View>
    <View className="flex-row space-x-2">
      <TouchableOpacity
        onPress={() => onEdit(admin)}
        className={`px-3 py-1 rounded ${
          isDarkMode ? 'bg-yellow-600' : 'bg-yellow-500'
        }`}
      >
        <Text className="text-white">Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          if (confirmDelete('Are you sure you want to delete this admin?')) {
            onDelete(admin._id!)
          }
        }}
        className={`px-3 py-1 rounded ${
          isDarkMode ? 'bg-red-600' : 'bg-red-500'
        }`}
      >
        <Text className="text-white">Delete</Text>
      </TouchableOpacity>
    </View>
  </View>
)
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import EditIcon from '@/assets/icons/edit.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import { router } from 'expo-router'

const ManageAdminsWeb = () => {
  const colorScheme = useColorScheme()
  const { isDarkMode } = useDarkMode()
  const router = useRouter()
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get<UserListApiResponse>('/users', {
        params: { role: 'Admin' }
      })
      console.log('Fetch admins response:', res.data)
      if (res.data.success && res.data.data) {
        setAdmins(res.data.data)
      } else {
        setError(res.data.message || 'Failed to fetch admins.')
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleEdit = (admin: User) => {
    router.push({ pathname: '/edit-admin', params: { id: admin._id } })
  }

  const handleDelete = async (id: string) => {
    console.log('🗑️ Deleting admin with id:', id)
    try {
      const res = await apiClient.delete<ApiResponse>(`/users/${id}`)
      console.log('Delete response status:', res.status, res.data)
      if (res.data.success) {
        showAlert('Deleted', res.data.message || 'Admin removed successfully')
        fetchAdmins()
      } else {
        showAlert('Error', res.data.message || 'Delete failed')
      }
    } catch (err: any) {
      console.error('Delete error:', err)
      const code = err.response?.status
      const msg = err.response?.data?.message || err.message
      showAlert('Error', `Status ${code}: ${msg}`)
    }
  }
  
  interface UserListApiResponse extends ApiResponse {
    data?: User[]; // Expecting an array of User objects in the data field
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [admins, setAdmins] = useState<User[]>([]); // State to hold the list of admins
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [deletingId, setDeletingId] = useState<string | null>(null); // State to track which item is being deleted

  // Fetch admins from the API
  // Using useCallback to memoize the fetch function
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // Make API call to fetch users with role 'Admin'
      const response = await apiClient.get<UserListApiResponse>('/users', {
        params: { role: 'Admin' }, // Pass role as a query parameter
      });

      if (response.data.success && response.data.data) {
        setAdmins(response.data.data); // Set the fetched list of admins
      } else {
        // Handle API response success: false
        setError(response.data.message || 'Failed to fetch admins.');
      }
    } catch (err: any) {
      // Handle network or API call errors
      console.error('Error fetching admins:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching admins.'
      );
    } finally {
      setLoading(false); // Set loading to false after fetch
    }
  }, []); // Empty dependency array means this function is created once

  // useEffect to call fetchAdmins when the component mounts
  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]); // Dependency on fetchAdmins memoized function

  // Function for adding an admin
  const handleAddAdmin = () => {
    router.push('/(admins)/add-admin'); // Adjust this path based on your expo-router structure
  }

  //Function for editing an admin
    const handleEditAdmin = (adminId: string) => {
      router.push({
        pathname: "/(admins)/edit-admin", // Adjust this path based on your expo-router structure
        params: { id: adminId }
      });
    }

  // Function for soft-deleting an admin
  const handleDeleteAdmin = (adminId: string) => {
    const confirmDelete = window.confirm (
      'Are you sure you want to delete this admin account? It will be archived.'
    );

    if (confirmDelete) {
      const deleteAdmin = async () => {
        setDeletingId(adminId); // Set state to show loading on this specific item
        try {
          const response = await apiClient.delete<ApiResponse>(`/users/${adminId}`);

          if (response.data.success) {
            window.alert('Success: Admin account archived successfully.');
            // Update the local state to remove the soft-deleted admin
            setAdmins((prevAdmins) =>
              prevAdmins.filter((admin) => admin._id !== adminId)
            );
          } else {
            window.alert('Error: ' + (response.data.message || 'Failed to archive admin.'));
          }
        } catch (err: any) {
          console.error('Error archiving admin:', err);
          window.alert(
            'Error: ' + (err.response?.data?.message || err.message || 'An error occurred during archival.')
          );
        } finally {
          setDeletingId(null); // Clear deleting state
        }
      };

      deleteAdmin();
    }
  };

  cssInterop(Image, { className: "style" });

  // --- VirtualizedList specific functions ---
  const getItemCount = (_data: User[] | null | undefined) => _data ? _data.length : 0;

  const getItem = (_data: User[] | null | undefined, index: number): User => {
    // VirtualizedList requires a function to get the item at a specific index
    // We assert that _data is not null/undefined based on getItemCount
    return (_data as User[])[index];
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#121212]' : 'bg-white'
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? '#E0E0E0' : '#000000'}
        />
        <Text
          className={`mt-4 ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          Loading Admins...
        </Text>
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
        />
      </SafeAreaView>
    )
  }
  
  if (error) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#121212]' : 'bg-white'
        }`}
      >
        <Text
          className={`text-red-500 ${
            isDarkMode ? 'text-red-400' : 'text-red-600'
          }`}
        >
          {error}
        </Text>
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
        />
      </SafeAreaView>
    )
  }
  
  if (admins.length === 0) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#121212]' : 'bg-white'
        }`}
      >
        <Image
          className="w-[150] h-[150]"
          source={require('@/assets/images/admin_background.png')}
          contentFit="contain"
        />
        <Text
          className={`mt-4 ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          No admin accounts found.
        </Text>
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
        />
      </SafeAreaView>
    )
  }

  const getItemCount = (data?: User[]) => data?.length || 0
  const getItem = (
    data: User[] | null | undefined,
    index: number
  ) => data![index]

  return (
    <SafeAreaView
      className={`flex-1 ${
        isDarkMode ? 'bg-[#121212]' : 'bg-white'
      }`}
    >
      <View className="flex-1 px-4">
        <View className="flex-row justify-between items-center my-2">
          <Text
            className={`text-lg font-inter_bold ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            Admins List
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/add-admin')}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}
          >
            <Text
              className={`font-inter_bold text-lg ${
                isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
              }`}
            >
              Add Admin
            </Text>
          </TouchableOpacity>
        </View>

        <VirtualizedList
          data={admins}
          renderItem={({ item }) => (
            <AdminListItem
              admin={item}
              isDarkMode={isDarkMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item._id!}
          getItemCount={getItemCount}
          getItem={getItem}
        />
      </View>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <View className='flex-row mt-2'>
        <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Admins List
        </Text>
        <TouchableOpacity
          className='rounded-xl h-[50px] justify-center items-center ml-auto mr-3 p-2'
          onPress={() => handleAddAdmin()}
          activeOpacity={0.7}
          style={{ backgroundColor:'#60a5fa' }}
        >
          <View className='flex-row'>
            <Text className='text-black font-psemibold text-lg'>
              Add Admin
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <VirtualizedList
        data={admins}
        renderItem={({ item }: { item: User }) => {
          // Check if the item is the one being deleted
          const isCurrentItemDeleting = deletingId === item._id;
          return (
            <View className={`flex-row items-center p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Image
                source={ item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')} // Assuming profilePicture is a URL
                className="w-12 h-12 rounded-full"
                contentFit="cover"
              />
              <View className='flex-column ml-2 flex-shrink'>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.email}
                </Text>
              </View>
        
              <View className='ml-auto flex-row'>
                <TouchableOpacity
                  className='bg-green-500 rounded-xl h-[50px] justify-center items-center mr-2 p-2'
                  onPress={() => handleEditAdmin(item._id)}
                  activeOpacity={0.7}
                >
                  <View className='flex-row'>
                    <EditIcon className='w-[24px] h-[24px] mr-1' />
                    <Text className='text-black font-psemibold text-lg'>
                      Edit
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className='bg-red-500 rounded-xl h-[50px] justify-center items-center p-2'
                  onPress={() => handleDeleteAdmin(item._id)}
                  activeOpacity={0.7}
                  disabled={isCurrentItemDeleting} // Disable button if currently deleting
                >
                  <View className='flex-row'>
                    <DeleteIcon className='w-[24px] h-[24px] mr-1' />
                    <Text className='text-black font-psemibold text-lg'>
                      {isCurrentItemDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        keyExtractor={(item) => item._id}
        getItem={getItem}
        getItemCount={getItemCount}
        extraData={isDarkMode}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}
export default ManageAdminsWeb
