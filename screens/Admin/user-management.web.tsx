import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity, Modal, Platform, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

cssInterop(Image, { className: "style" });

const UserManageWeb = () => {

  // AddUserModal component
  interface AddUserModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSubmitBulkFile: (usersData: User[]) => Promise<void>;
    isDarkMode: boolean;
  }

  const AddUserModal: React.FC<AddUserModalProps> = ({ isVisible, onClose, onSubmitBulkFile, isDarkMode }) => {

    const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const handlePickDocument = async () => {
      setModalError(null);
      setPickedFile(null);
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
          ],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
           if (result.assets[0].uri && result.assets[0].name && result.assets[0].mimeType) {
            setPickedFile(result.assets[0]);
          } else {
            setModalError('Picked file is missing some information.');
          }
        }
      } catch (err) {
        console.error('Error picking document:', err);
        setModalError('Failed to pick document. Please try again.');
      }
    };

    const handleSubmitFile = async () => {
      if (!pickedFile || (!pickedFile.uri && !pickedFile.file)) {
        setModalError('Please select an Excel file first.');
        return;
      }

      // Validate file type
      const fileName = pickedFile.name.toLowerCase();
      const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                         pickedFile.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         pickedFile.mimeType === 'application/vnd.ms-excel';

      if (!isExcelFile) {
        setModalError('Please select a valid Excel file (.xlsx or .xls).');
        return;
      }

      setIsSubmitting(true);
      setModalError(null);

      try {
        // For Excel files, we need to send them as FormData to the backend
        // The backend will handle parsing the Excel file using exceljs
        const formData = new FormData();

        if (Platform.OS === 'web') {
          // On web, use the File object
          const webFile = pickedFile.file;
          if (webFile) {
            formData.append('excelFile', webFile);
          } else {
            throw new Error('File object not available for web.');
          }
        } else {
          // On native platforms, create a file object from URI
          const fileInfo = await FileSystem.getInfoAsync(pickedFile.uri!);
          if (!fileInfo.exists) {
            throw new Error('File does not exist.');
          }

          const fileToUpload = {
            uri: pickedFile.uri,
            type: pickedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            name: pickedFile.name,
          };
          formData.append('excelFile', fileToUpload as any);
        }

        // Send the Excel file to the backend for processing
        const response = await apiClient.post('/users/bulk-excel', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          let successMessage = 'Bulk user import from Excel successful!';
          if (response.data.data?.createdCount !== undefined) {
            successMessage = `${response.data.data.createdCount} users created.`;
            if (response.data.data?.failedCount && response.data.data.failedCount > 0) {
              successMessage += ` ${response.data.data.failedCount} failed. Check console for details.`;
              console.warn('Bulk import failures:', response.data.data.errors);
              if (Platform.OS === 'web') {
                window.alert(successMessage + '\nSome users failed to import. See console for details.');
              }
            } else {
              if (Platform.OS === 'web') {
                window.alert(successMessage);
              }
            }
          } else {
            if (Platform.OS === 'web') {
              window.alert(response.data.message || successMessage);
            }
          }
          onClose();
          // Refresh the user list (this will be handled by the parent component)
        } else {
          let errorMessage = 'Error: ' + (response.data.message || 'Failed to import users from Excel.');
          if (response.data.data?.errors) {
            console.error("Detailed bulk import errors:", response.data.data.errors);
            errorMessage += ` See console for detailed errors. Failed items: ${response.data.data.failedCount || response.data.data.errors.length}.`
          }
          setModalError(errorMessage);
        }

      } catch (e: any) {
        console.error('Error processing Excel file:', e);
        const errorMessage = e.response?.data?.message || e.message || 'Could not process the Excel file.';
        setModalError(`Error: ${errorMessage}`);
        if (e.response?.data?.errors) {
          console.error("Detailed errors from server:", e.response.data.errors);
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    useEffect(() => {
      if (!isVisible) {
        setPickedFile(null);
        setModalError(null);
        setIsSubmitting(false);
      }
    }, [isVisible]);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 16 }} className='flex-1 justify-center items-center'>
          <View
            className={`rounded-lg p-4 ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-lg'}`}
            style={{ maxWidth: 500 }}
          >
            <Text className={`font-inter_bold text-xl text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Adding New Users
            </Text>

            <Text className={`font-inter_medium text-base mt-2 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Choose your option:
            </Text>

            {/* Excel File Format Instructions */}
            <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F8FF' }}>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                Excel File Format Requirements:
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                1. First row must contain headers: username, firstName, lastName, email, password, phoneNumber, address, role, sex
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                2. Role values: Admin, Teacher, Student
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                3. Sex values: Male, Female, Other
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                4. Supported formats: .xlsx, .xls
              </Text>
            </View>

            <View className='flex-column'>
              <TouchableOpacity
                className='bg-secondary-web rounded-xl h-[50px] w-full justify-center items-center p-2'
                onPress={handleAddUser}
                activeOpacity={0.7}
              >
                <Text className='text-black font-psemibold text-lg'>
                  Add Single User
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className='bg-green-500 rounded-xl h-[50px] w-full justify-center items-center p-2 mt-4'
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <View className='flex-row'>
                  <Image
                    className="w-[24] h-[24] mr-2"
                    contentFit="contain"
                    source={require('@/assets/icons/import_file.png')}
                  />
                  <Text className='text-white font-psemibold text-lg'>
                    {pickedFile ? `File: ${pickedFile.name}` : 'Choose Excel File'}
                  </Text>
                </View>
              </TouchableOpacity>

              {pickedFile && (
                <View className='mt-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }}>
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                    Selected File:
                  </Text>
                  <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name: {pickedFile.name}
                  </Text>
                  <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Type: {pickedFile.mimeType || 'Excel file'}
                  </Text>
                  <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Size: {pickedFile.size ? (pickedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}
                  </Text>
                </View>
              )}

              {modalError && (
                <View className='mt-2 p-2 rounded-lg bg-red-100'>
                  <Text className='text-red-800 text-sm font-inter_regular'>
                    {modalError}
                  </Text>
                </View>
              )}
            </View>

            <View className='flex-row flex-shrink mt-4 items-center justify-center'>
              <TouchableOpacity
                className='bg-red-500 rounded-xl h-[50px] w-[48%] justify-center items-center p-2 mr-2'
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text className='text-white font-psemibold text-lg'>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`rounded-xl h-[50px] w-[48%] justify-center items-center p-2 ${
                  (pickedFile && !isSubmitting) ? 'bg-blue-500' : 'bg-gray-400'
                }`}
                onPress={handleSubmitFile}
                activeOpacity={(pickedFile && !isSubmitting) ? 0.7 : 1}
                disabled={!pickedFile || isSubmitting}
              >
                <Text className='text-white font-psemibold text-lg'>
                  {isSubmitting ? 'Processing...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  interface UserListApiResponse extends ApiResponse {
    data?: User[];
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const firstName = user.firstName.toLowerCase();
      const lastName = user.lastName.toLowerCase();
      const email = user.email.toLowerCase();
      const username = user.username?.toLowerCase() || '';
      const userId = user.userId?.toLowerCase() || '';
      
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        email.includes(query) ||
        username.includes(query) ||
        userId.includes(query)
      );
    });
  }, [users, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const fetchUsers = useCallback(async (roleFilter: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const params: { role?: string } = {}; 
      if (roleFilter) {
        params.role = roleFilter;
      }

      const response = await apiClient.get<UserListApiResponse>('/users', {
        params,
      });

      if (response.data.success && response.data.data) {
        const nonArchivedUsers = response.data.data.filter(user => user.status !== 'archived');
        setUsers(nonArchivedUsers);
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

  useEffect(() => {
    fetchUsers(selectedRole);
  }, [fetchUsers, selectedRole]);

  const handleAddUser = () => {
    handleCloseAddUserModal();
    router.push('/(admins)/add-user');
  }

  const handleOpenAddUserModal = () => {
    setIsAddUserModalVisible(true);
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalVisible(false);
  };

  const handleAddSingleUser = () => {
    handleCloseAddUserModal();
    router.push('/(admins)/add-user');
  };

  const handleSubmitBulkUsersFile = async (usersData: User[]) => {
    // This function is now handled differently since we're sending the Excel file directly
    // The actual processing happens in the modal's handleSubmitFile function
    fetchUsers(selectedRole); // Refresh the user list after successful import
  };

  const handleEditUser = (userId: string) => {
    router.push({
      pathname: "/(admins)/edit-user",
      params: { id: userId }
    });
  }

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

  if (users.length === 0 && !searchQuery) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/admin_background.png')}
        />
        <Text 
          className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}
          ellipsizeMode='tail'
          numberOfLines={2}
        >
          {`No user accounts found for the selected role and status.`}
        </Text>
        <View className='flex-row items-center mt-2'>
          <TouchableOpacity
            className='rounded-md mr-1 justify-center items-center p-2'
            onPress={handleOpenAddUserModal}
            activeOpacity={0.7}
            style={{ backgroundColor:'#60a5fa' }}
          >
            <View className='flex-row'>
              <Image
                source={require('@/assets/icons/add_user.png')}
                className='w-[24px] h-[24px] mr-1'
                contentFit='contain'
                tintColor={isDarkMode ? '#E0E0E0' : 'white'}
              />
              <Text className={`font-psemibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                Add User
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-md justify-center items-center mr-3 p-2 ${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
            onPress={() => fetchUsers(selectedRole)}
            activeOpacity={0.7}
          >
            <View className='flex-row'>
              <Image
                source={require('@/assets/icons/refresh.png')}
                className='w-[24px] h-[24px] mr-1'
                contentFit='contain'
                tintColor={isDarkMode ? '#E0E0E0' : 'white'}
              />
              <Text className={`font-psemibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                Refresh
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
        <AddUserModal
          isVisible={isAddUserModalVisible}
          onClose={handleCloseAddUserModal}
          onSubmitBulkFile={handleSubmitBulkUsersFile}
          isDarkMode={isDarkMode}
        />
      </SafeAreaView>
    );
  }

  // If not loading, no error, and admins exist, render the VirtualizedList
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      {/* Search bar - finds users by name or email */}
      <View className='flex-row items-center'>
        <TextInput
          className={`w-full border rounded-md mx-4 mt-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
          placeholder='Search users by name or email...'
          placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          autoCapitalize="none"
          selectionColor="#22C55E"
          selectionHandleColor="#22C55E" 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={clearSearch}
            className={`rounded-md px-4 py-2 mr-3 mt-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-300'}`}
            activeOpacity={0.7}
          >
            <Text className={`font-pregular text-base ${isDarkMode ? 'text-[#1E1E1E]' : 'text-black'}`}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search results indicator */}
      {searchQuery.length > 0 && (
        <View className='mx-4 mt-1 mb-2'>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {filteredUsers.length === 0 
              ? `No results found for "${searchQuery}"`
              : `Found ${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} matching "${searchQuery}"`
            }
          </Text>
        </View>
      )}

      <View className='flex-row items-center my-2'>
        <Text className={`font-inter_bold mx-4 my-2 text-lg mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Users List
        </Text>
        <TouchableOpacity
          className='mr-1'
          onPress={handleOpenAddUserModal}
          activeOpacity={0.7}
          style={{ 
            backgroundColor:'#60a5fa',
            borderRadius: 8,
            padding: 8,
          }}
        >
          <Image
            className="w-[24] h-[24]"
            contentFit="contain"
            source={require('@/assets/icons/add_user.png')}
            cachePolicy="memory-disk"
            tintColor={isDarkMode ? '#E0E0E0' : 'white'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
          onPress={() => fetchUsers(selectedRole)}
          activeOpacity={0.7}
          style={{ 
            borderRadius: 8,
            marginRight: 12,
            padding: 8,
          }}
        >
          <Image
            className="w-[24] h-[24]"
            contentFit="contain"
            source={require('@/assets/icons/refresh.png')}
            cachePolicy="memory-disk"
            tintColor={isDarkMode ? '#E0E0E0' : 'white'}
          />
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
        selectedValue={selectedRole}
        onValueChange={(itemValue) => setSelectedRole(itemValue)}
      >
        <Picker.Item label="Show All" value=""/>
        <Picker.Item label="Admin" value="Admin"/>
        <Picker.Item label="Student" value="Student"/>
        <Picker.Item label="Teacher" value="Teacher"/>          
      </Picker>

      {/* Show message when search returns no results */}
      {searchQuery.length > 0 && filteredUsers.length === 0 ? (
        <View className='flex-1 items-center justify-center'>
          <Image
            className="w-[100] h-[100] opacity-50"
            contentFit="contain"
            source={require('@/assets/images/no_results.png')}
          />
          <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            No users found matching "{searchQuery}"
          </Text>
          <Text className={`font-inter_regular text-center mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Try searching with different keywords
          </Text>
          <TouchableOpacity
            className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
            onPress={clearSearch}
            activeOpacity={0.7}
          >
            <Text className='text-white font-psemibold text-base'>
              Clear Search
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <VirtualizedList
          data={filteredUsers}
          renderItem={({ item }: { item: User }) => {
            const isCurrentItemDeleting = deletingId === item._id;
            
            const highlightText = (text: string, query: string) => {
              if (!query.trim()) return text;
              
              const parts = text.split(new RegExp(`(${query})`, 'gi'));
              return parts.map((part, index) => 
                part.toLowerCase() === query.toLowerCase() ? 
                  <Text key={index} className={`${isDarkMode ? 'bg-yellow-600' : 'bg-yellow-200'} font-inter_bold`}>
                    {part}
                  </Text> : part
              );
            };

            return (
              <View className={`flex-row items-center p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Image
                  source={ item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                  className="w-12 h-12 rounded-full self-start"
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View className='flex-column ml-2 flex-shrink self-start'>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {searchQuery ? 
                      highlightText(`${item.lastName}, ${item.firstName} (${item.userId || 'N/A'})`, searchQuery)  :
                      `${item.lastName}, ${item.firstName} (${item.userId || 'N/A'})`
                    }
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {searchQuery ? 
                      highlightText(item.email, searchQuery) :
                      item.email
                    }
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Password: {item.temporaryPassword || 'N/A'}
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
                    className={`mr-1 ${isDarkMode ? 'bg-green-500' : 'bg-green-600'}`}
                    onPress={() => handleEditUser(item._id)}
                    activeOpacity={0.7}
                    style={{ 
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <EditIcon width={24} height={24} fill={isDarkMode ? '#E0E0E0' : 'white'}/>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
                    onPress={() => handleDeleteUser(item._id)}
                    activeOpacity={0.7}
                    style={{ 
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <DeleteIcon width={24} height={24} fill={isDarkMode ? '#E0E0E0' : 'white'}/>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
          keyExtractor={(item) => item._id}
          getItem={getItem}
          getItemCount={getItemCount}
          extraData={[isDarkMode, searchQuery]}
          onRefresh={() => fetchUsers(selectedRole)}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          
        />
      )}   
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
      <AddUserModal
        isVisible={isAddUserModalVisible}
        onClose={handleCloseAddUserModal}
        onSubmitBulkFile={handleSubmitBulkUsersFile}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  )
}

export default React.memo(UserManageWeb)