import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import { useRouter } from 'expo-router'
import apiClient, { ApiResponse } from '@/app/services/apiClient'
import { User } from '@/app/types/index'
import EditIcon from '@/assets/icons/edit.svg';
import DeleteIcon from '@/assets/icons/delete.svg';

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

const ManageAdminsWeb = () => {
  const colorScheme = useColorScheme()
  const { isDarkMode } = useDarkMode()
  const router = useRouter()
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const handleAddAdmin = () => {
    router.push('/(admins)/add-admin');
  }

  const handleEditAdmin = (adminId: string) => {
    router.push({
      pathname: "/(admins)/edit-admin",
      params: { id: adminId }
    });
  }

  const handleDeleteAdmin = (adminId: string) => {
    const confirmDelete = window.confirm (
      'Are you sure you want to delete this admin account? It will be archived.'
    );

    if (confirmDelete) {
      const deleteAdmin = async () => {
        setDeletingId(adminId);
        try {
          const response = await apiClient.delete<ApiResponse>(`/users/${adminId}`);

          if (response.data.success) {
            window.alert('Success: Admin account archived successfully.');
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
          setDeletingId(null);
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
    </SafeAreaView>
  )
}
export default ManageAdminsWeb
