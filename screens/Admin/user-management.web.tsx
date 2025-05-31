import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import EditIcon from '@/assets/icons/edit.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import { router } from 'expo-router'
import { Picker } from '@react-native-picker/picker'

cssInterop(Image, { className: "style" });

const UserManageWeb = () => {

  // AddUserModal component (defined within the same file for simplicity)
  interface AddUserModalProps {
    isVisible: boolean;
    onClose: () => void;
    onAddMultipleUsers: () => void;
    isDarkMode: boolean; // Pass dark mode state for styling
  }

  const AddUserModal: React.FC<AddUserModalProps> = ({ isVisible, onClose, onAddMultipleUsers, isDarkMode }) => {
  return (
    <Modal
      animationType="fade" // or "slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // For Android back button
    >
      <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} className='flex-1 justify-center items-center'>
        <View
          className={`rounded-lg p-4 ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-lg'}`}
        >
          <Text className={`font-inter_bold text-xl text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Adding New User
          </Text>

          <Text className={`font-inter_medium text-base mt-2 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Choose your option:
          </Text>
          <View className='flex-row'>
            <TouchableOpacity
              className='bg-secondary-web rounded-xl h-[50px] justify-center items-center p-2 mr-2'
              onPress={handleAddUser}
              activeOpacity={0.7}
            >
              <Text className='text-black font-psemibold text-lg'>
                Add Single User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className='bg-gray-400 rounded-xl h-[50px] justify-center items-center p-2'
              onPress={onAddMultipleUsers}
              activeOpacity={0.7}
            >
              <Text className='text-black font-psemibold text-lg'>
                Add Multiple Users
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
              className='bg-red-500 rounded-xl h-[50px] justify-center items-center mt-2 p-2'
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text className='text-black font-psemibold text-lg'>
                Cancel
              </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

  interface UserListApiResponse extends ApiResponse {
    data?: User[]; // Expecting an array of User objects in the data field
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [users, setUsers] = useState<User[]>([]); // Renamed from 'admins' to 'users'
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [deletingId, setDeletingId] = useState<string | null>(null); // State to track which item is being deleted
  const [selectedRole, setSelectedRole] = useState<string | null>(null); // New state for selected role filter
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false); // State for modal visibility

  // Fetch users from the API based on the selected role and status
  const fetchUsers = useCallback(async (roleFilter: string | null) => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // Removed status: 'active' from params.
      // Now, the API request will not filter by status at the backend.
      const params: { role?: string } = {}; 
      if (roleFilter) {
        params.role = roleFilter; // Add role filter if a role is selected
      }

      // Make API call to fetch users
      const response = await apiClient.get<UserListApiResponse>('/users', {
        params, // Pass role as query parameter, status is now filtered client-side
      });

      if (response.data.success && response.data.data) {
        // Filter out archived users on the client-side
        const nonArchivedUsers = response.data.data.filter(user => user.status !== 'archived');
        setUsers(nonArchivedUsers); // Set the fetched and filtered list of users
      } else {
        setError(response.data.message || 'Failed to fetch users.');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching users.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect to call fetchUsers when the component mounts or selectedRole changes
  useEffect(() => {
    fetchUsers(selectedRole);
  }, [fetchUsers, selectedRole]);

  // Function for adding a user (e.g., admin, student, teacher)
  const handleAddUser = () => {
    handleCloseAddUserModal(); // Close modal before navigating
    router.push('/(admins)/add-user'); // Adjust this path based on your expo-router structure
  }

  // Function to open the Add User modal
  const handleOpenAddUserModal = () => {
    setIsAddUserModalVisible(true);
  };

  // Function to close the Add User modal
  const handleCloseAddUserModal = () => {
    setIsAddUserModalVisible(false);
  };

  // Function for navigating to Add Single User route
  const handleAddSingleUser = () => {
    handleCloseAddUserModal(); // Close modal before navigating
    router.push('/(admins)/add-user'); // Adjust this path based on your expo-router structure
  };

  // Placeholder function for Add Multiple Users
  const handleAddMultipleUsers = () => {
    handleCloseAddUserModal(); // Close modal
    window.alert('Future functionality: Admin will submit JSON/CSV for multiple users.');
    // Here you would implement logic for file upload, parsing, and bulk API submission
  };

  // Function for editing a user
  const handleEditUser = (userId: string) => {
    router.push({
      pathname: "/(admins)/edit-user", // This path might need to be dynamic based on user role
      params: { id: userId }
    });
  }

  // Function for soft-deleting a user
  const handleDeleteUser = (userId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this user account? It will be archived.'
    );

    if (confirmDelete) {
      const deleteUser = async () => {
        setDeletingId(userId);
        try {
          const response = await apiClient.delete<ApiResponse>(`/users/${userId}`);

          if (response.data.success) {
            window.alert('Success: User account archived successfully.');
            setUsers((prevUsers) =>
              prevUsers.filter((user) => user._id !== userId)
            );
          } else {
            window.alert('Error: ' + (response.data.message || 'Failed to archive user.'));
          }
        } catch (err: any) {
          console.error('Error archiving user:', err);
          window.alert(
            'Error: ' + (err.response?.data?.message || err.message || 'An error occurred during archival.')
          );
        } finally {
          setDeletingId(null);
        }
      };

      deleteUser();
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
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{`Loading Users...`}</Text>
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
          {`No user accounts found for the selected role and status.`}
        </Text>
        <TouchableOpacity
          className='rounded-xl h-[50px] justify-center items-center mt-4 p-2'
          onPress={handleOpenAddUserModal}
          activeOpacity={0.7}
          style={{ backgroundColor:'#60a5fa' }}
        >
          <View className='flex-row'>
            <Image
              source={require('@/assets/icons/add_user.png')}
              className='w-[24px] h-[24px] mr-2'
              contentFit='contain'
            />
            <Text className='text-black font-psemibold text-lg'>
              Add User
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className='bg-orange-400 rounded-xl h-[50px] justify-center items-center mr-3 p-2'
          onPress={() => fetchUsers(selectedRole)} // Call fetchUsers with the current role filter
          activeOpacity={0.7}
        >
          <Text className='text-black font-psemibold text-lg'>
            Refresh
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  // If not loading, no error, and admins exist, render the VirtualizedList
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <View className='flex-row mt-2 mb-2'>
        <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Users List
        </Text>
        <TouchableOpacity
          className='rounded-xl h-[50px] justify-center items-center ml-auto mr-1 p-2'
          onPress={handleOpenAddUserModal}
          activeOpacity={0.7}
          style={{ backgroundColor:'#60a5fa' }}
        >
          <View className='flex-row'>
            <Image
              source={require('@/assets/icons/add_user.png')}
              className='w-[24px] h-[24px] mr-2'
              contentFit='contain'
            />
            <Text className='text-black font-psemibold text-lg'>
              Add User
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className='bg-orange-400 rounded-xl h-[50px] justify-center items-center mr-3 p-2'
          onPress={() => fetchUsers(selectedRole)} // Call fetchUsers with the current role filter
          activeOpacity={0.7}
        >
          <Text className='text-black font-psemibold text-lg'>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
        <Picker
          style={{ 
            backgroundColor: isDarkMode ? '#1E1E1E' : 'white', 
            color: isDarkMode ? '#E0E0E0' : 'black', 
            borderWidth: 1,
            borderRadius: 8,
            borderColor: isDarkMode ? '#1E1E1E' : 'gray',
            height: 55, 
            width: 150, 
            fontFamily: 'Inter-18pt-Regular', 
            fontSize: 16, 
            padding: 12 ,
            marginLeft: 12
          }}
          dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
          mode='dropdown'
          selectedValue={selectedRole} // Bind selectedValue to state
          onValueChange={(itemValue) => setSelectedRole(itemValue)} // Update state on change
        >
          <Picker.Item label="Show All" value={null}/>
          <Picker.Item label="Admin" value="Admin"/>
          <Picker.Item label="Student" value="Student"/>
          <Picker.Item label="Teacher" value="Teacher"/>          
        </Picker>
      <VirtualizedList
        data={users}
        renderItem={({ item }: { item: User }) => {
          // Check if the item is the one being deleted
          const isCurrentItemDeleting = deletingId === item._id;
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
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Status:
                  </Text>
                  <Text className={`font-inter_regular text-sm 
                    ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {item.status === 'active'
                      ? ' Active'
                      : item.status === 'inactive'
                      ? ' Inactive'
                      : item.status === 'pending'
                      ? ' Pending'
                      : item.status === 'suspended'
                      ? ' Suspended'
                      : ''}
                  </Text>
                </View>
              </View>
        
              <View className='ml-auto flex-row self-start'>
                <TouchableOpacity
                  className='bg-green-500 rounded-xl h-[50px] justify-center items-center mr-2 p-2'
                  onPress={() => handleEditUser(item._id)}
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
                  onPress={() => handleDeleteUser(item._id)}
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
        onRefresh={() => fetchUsers(selectedRole)} // Refresh users when pulled
        refreshing={refreshing}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
      <AddUserModal
        isVisible={isAddUserModalVisible}
        onClose={handleCloseAddUserModal}
        onAddMultipleUsers={handleAddMultipleUsers}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  )
}

export default React.memo(UserManageWeb)