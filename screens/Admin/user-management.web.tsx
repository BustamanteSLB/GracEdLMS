import { Text, View, ScrollView, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity, Modal, Platform, TextInput } from 'react-native'
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Dropdown, { DropdownItem } from '@/components/Dropdown';

cssInterop(Image, { className: "style" });

const downloadSampleExcel = async () => {
  try {
    // Sample data structure that matches the backend requirements
    const sampleData = [
      // Header row
      ['userId', 'username', 'firstName', 'middleName', 'lastName', 'email', 'password', 'phoneNumber', 'address', 'role', 'sex'],
      // Sample data rows
      ['STU-2024-001', 'jsmith', 'John', 'Michael', 'Smith', 'john.smith@example.com', 'password123', '9123456789', '123 Main St, City, Province', 'Student', 'Male'],
      ['TEA-2024-001', 'mjohnson', 'Mary', '', 'Johnson', 'mary.johnson@example.com', 'securepass456', '9987654321', '456 Oak Ave, City, Province', 'Teacher', 'Female'],
      ['ADM-2024-001', 'rbrown', 'Robert', 'James', 'Brown', '', 'adminpass789', '', '', 'Admin', 'Male'],
      ['STU-2024-002', 'sdavis', 'Sarah', 'Ann', 'Davis', '', 'studentpass', '9555123456', '789 Pine St, City, Province', 'Student', 'Female'],
    ];

    if (Platform.OS === 'web') {
      // Web implementation - create CSV format for simplicity
      const csvContent = sampleData.map(row => 
        row.map(field => {
          // Escape fields that contain commas, quotes, or newlines
          if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ).join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'User_Import_Template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.alert('Sample template downloaded successfully!\n\nNote: You can open this CSV file in Excel and save it as .xlsx format for upload.');
    } else {
      // Mobile implementation - create simple CSV
      const csvContent = sampleData.map(row => row.join(',')).join('\n');
      const fileUri = FileSystem.documentDirectory + 'User_Import_Template.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // For mobile, you might want to use a sharing functionality
      // This is a basic implementation - you may need expo-sharing for better UX
      alert(`Sample template saved to: ${fileUri}`);
    }
  } catch (error) {
    console.error('Error downloading sample file:', error);
    if (Platform.OS === 'web') {
      window.alert('Error downloading sample file. Please try again.');
    } else {
      alert('Error creating sample file. Please try again.');
    }
  }
};

const UserManageWeb = () => {
  document.title = 'User Management - GracEdLMS';
  // Pagination interface
  interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  }

  // Enhanced API response interface with pagination
  interface UserListApiResponse extends ApiResponse {
    data?: User[];
    count?: number;
    total?: number;
    pagination?: {
      next?: { page: number; limit: number };
      prev?: { page: number; limit: number };
    };
  }

  // AddUserModal component (Facebook-inspired design)
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
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const webFile = pickedFile.file;
          if (webFile) {
            formData.append('excelFile', webFile);
          } else {
            throw new Error('File object not available for web.');
          }
        } else {
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
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.6)', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: 20 
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 8,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#1877F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Image
                  source={require('@/assets/icons/add_user.png')}
                  style={{ width: 20, height: 20 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  Add New Users
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  marginTop: 2,
                }}>
                  Choose how to add users to the system
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/close.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Excel Requirements Info */}
            <View style={{
              backgroundColor: isDarkMode ? '#263A52' : '#E3F2FD',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: '#1877F2',
            }}>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                marginBottom: 8,
              }}>
                📋 Excel File Requirements:
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                lineHeight: 16,
                marginBottom: 12,
              }}>
                • Required headers: userId, username, firstName, lastName, password, role, sex{'\n'}
                • Optional headers: middleName, email, phoneNumber, address{'\n'}
                • Role values: Admin, Teacher, Student{'\n'}
                • Sex values: Male, Female, Other{'\n'}
                • Supported formats: .xlsx, .xls
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                lineHeight: 16,
                marginBottom: 12,
              }}>You can open this CSV file in Excel and save it as .xlsx format for upload:</Text>
              
              {/* Download Sample Template Button */}
              <TouchableOpacity
                onPress={downloadSampleExcel}
                style={{
                  backgroundColor: isDarkMode ? '#42B883' : '#10B981',
                  borderRadius: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                }}
              >
                <Image
                  source={require('@/assets/icons/download.png')}
                  style={{ width: 16, height: 16, marginRight: 6 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  color: '#FFFFFF',
                }}>
                  Download Sample Template
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 12 }}>
              {/* Single User Button */}
              <TouchableOpacity
                onPress={handleAddUser}
                style={{
                  backgroundColor: '#1877F2',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/add_user.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                }}>
                  Add Single User
                </Text>
              </TouchableOpacity>

              {/* File Upload Button */}
              <TouchableOpacity
                onPress={handlePickDocument}
                style={{
                  backgroundColor: isDarkMode ? '#42B883' : '#10B981',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/import_file.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                }}>
                  {pickedFile ? 'Change Excel File' : 'Upload Excel File'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected File Info */}
            {pickedFile && (
              <View style={{
                backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F2F5',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                borderWidth: 1,
                borderColor: isDarkMode ? '#42B883' : '#10B981',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={require('@/assets/icons/excel_file.png')}
                    style={{ width: 24, height: 24, marginRight: 8 }}
                    tintColor={isDarkMode ? '#42B883' : '#10B981'}
                    contentFit="contain"
                  />
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#42B883' : '#10B981',
                  }}>
                    Selected File:
                  </Text>
                </View>
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginTop: 4,
                  marginBottom: 2,
                }}>
                  Name: {pickedFile.name}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  marginBottom: 2,
                }}>
                  Type: {pickedFile.mimeType || 'Excel file'}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                }}>
                  Size: {pickedFile.size ? (pickedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}
                </Text>
              </View>
            )}

            {/* Error Message */}
            {modalError && (
              <View style={{
                backgroundColor: isDarkMode ? '#3E2723' : '#FFEBEE',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#F44336',
              }}>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#FFCDD2' : '#C62828',
                }}>
                  ⚠️ {modalError}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            {pickedFile && (
              <TouchableOpacity
                onPress={handleSubmitFile}
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSubmitting ? (isDarkMode ? '#1565C0' : '#1565C0') : '#1877F2',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'Inter-SemiBold',
                    }}>
                      Processing...
                    </Text>
                  </>
                ) : (
                  <>
                    <Image
                      source={require('@/assets/icons/upload.png')}
                      style={{ width: 20, height: 20, marginRight: 8 }}
                      tintColor="#FFFFFF"
                      contentFit="contain"
                    />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'Inter-SemiBold',
                    }}>
                      Import Users
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  
  // Enhanced state management with pagination
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fixed pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
    hasNext: false,
    hasPrev: false,
  });

  // Search is handled locally for better performance
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const firstName = user.firstName.toLowerCase();
      const lastName = user.lastName.toLowerCase();
      const email = user.email?.toLowerCase() || '';
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

  // Fixed fetchUsers with proper pagination handling
  const fetchUsers = useCallback(async (
    roleFilter: string | null, 
    page: number = 1, 
    append: boolean = false,
    itemsPerPage?: number // Add this parameter
  ) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Use the passed itemsPerPage or current pagination value
      const currentItemsPerPage = itemsPerPage || pagination.itemsPerPage;

      const params: { 
        role?: string; 
        page: number; 
        limit: number; 
        sort?: string;
      } = {
        page,
        limit: currentItemsPerPage, // Use the current value
        sort: '-createdAt',
      }; 
      
      if (roleFilter) {
        params.role = roleFilter;
      }

      console.log('Fetching users with params:', params);

      const response = await apiClient.get<UserListApiResponse>('/users', {
        params,
      });

      if (response.data.success && response.data.data) {
        const nonArchivedUsers = response.data.data.filter(user => user.status !== 'archived');
        
        // Fixed pagination calculation with correct itemsPerPage
        const totalItems = response.data.total || 0;
        const totalPages = Math.ceil(totalItems / currentItemsPerPage);
        
        const newPagination: PaginationInfo = {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: currentItemsPerPage, // Use the current value
          hasNext: page < totalPages,
          hasPrev: page > 1,
        };
        
        setPagination(newPagination);

        if (append && page > 1) {
          // Append new users to existing list (for infinite scroll if implemented)
          setUsers(prevUsers => [...prevUsers, ...nonArchivedUsers]);
        } else {
          // Replace users list (initial load, refresh, or page navigation)
          setUsers(nonArchivedUsers);
        }

        console.log(`Loaded ${nonArchivedUsers.length} users (page ${page}/${totalPages})`);
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
      setLoadingMore(false);
    }
  }, []); // Remove pagination.itemsPerPage from dependencies

  // Refresh function that resets to page 1
  const refreshUsers = useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchUsers(selectedRole, 1, false, pagination.itemsPerPage).finally(() => {
      setRefreshing(false);
    });
  }, [fetchUsers, selectedRole, pagination.itemsPerPage]);

  // Initial load and role filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchUsers(selectedRole, 1, false, pagination.itemsPerPage);
  }, [selectedRole]); // Remove fetchUsers from dependencies

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

  const handleSubmitBulkUsersFile = async (usersData: User[]) => {
    refreshUsers();
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
            setPagination(prev => ({
              ...prev,
              totalItems: Math.max(0, prev.totalItems - 1)
            }));
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

  // VirtualizedList helper functions
  const getItemCount = useCallback((_data: User[] | null | undefined) => _data ? _data.length : 0, []);
  const getItem = useCallback((_data: User[] | null | undefined, index: number): User => {
    return (_data as User[])[index];
  }, []);

  // Fixed pagination navigation functions
  const goToPreviousPage = useCallback(() => {
    if (pagination.hasPrev && !loading && !loadingMore) {
      const prevPage = pagination.currentPage - 1;
      console.log(`Navigating to previous page: ${prevPage}`);
      fetchUsers(selectedRole, prevPage, false, pagination.itemsPerPage);
    }
  }, [pagination.hasPrev, pagination.currentPage, pagination.itemsPerPage, selectedRole, loading, loadingMore]);

  const goToNextPage = useCallback(() => {
    if (pagination.hasNext && !loading && !loadingMore) {
      const nextPage = pagination.currentPage + 1;
      console.log(`Navigating to next page: ${nextPage}`);
      fetchUsers(selectedRole, nextPage, false, pagination.itemsPerPage);
    }
  }, [pagination.hasNext, pagination.currentPage, pagination.itemsPerPage, selectedRole, loading, loadingMore]);

  const goToSpecificPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages && pageNumber !== pagination.currentPage && !loading && !loadingMore) {
      console.log(`Navigating to page: ${pageNumber}`);
      fetchUsers(selectedRole, pageNumber, false, pagination.itemsPerPage);
    }
  }, [pagination.totalPages, pagination.currentPage, pagination.itemsPerPage, selectedRole, loading, loadingMore]);

  // Fixed pagination controls with Facebook-inspired design
  const PaginationControls = () => {
    const renderPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      const currentPage = pagination.currentPage;
      const totalPages = pagination.totalPages;

      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(
          <TouchableOpacity
            key={1}
            onPress={() => goToSpecificPage(1)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginHorizontal: 2,
              borderRadius: 6,
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
            }}
            disabled={loading || loadingMore}
          >
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-SemiBold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}>
              1
            </Text>
          </TouchableOpacity>
        );
        
        if (startPage > 2) {
          pages.push(
            <Text key="ellipsis1" style={{
              paddingHorizontal: 8,
              paddingVertical: 8,
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}>
              ...
            </Text>
          );
        }
      }

      // Add visible page numbers
      for (let i = startPage; i <= endPage; i++) {
        const isCurrentPage = i === currentPage;
        pages.push(
          <TouchableOpacity
            key={i}
            onPress={() => goToSpecificPage(i)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginHorizontal: 2,
              borderRadius: 6,
              backgroundColor: isCurrentPage 
                ? '#1877F2' 
                : isDarkMode ? '#3A3B3C' : '#F0F2F5',
            }}
            disabled={loading || loadingMore || isCurrentPage}
          >
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-SemiBold',
              color: isCurrentPage 
                ? '#FFFFFF' 
                : isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}>
              {i}
            </Text>
          </TouchableOpacity>
        );
      }

      // Add last page and ellipsis if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(
            <Text key="ellipsis2" style={{
              paddingHorizontal: 8,
              paddingVertical: 8,
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}>
              ...
            </Text>
          );
        }
        
        pages.push(
          <TouchableOpacity
            key={totalPages}
            onPress={() => goToSpecificPage(totalPages)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginHorizontal: 2,
              borderRadius: 6,
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
            }}
            disabled={loading || loadingMore}
          >
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-SemiBold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}>
              {totalPages}
            </Text>
          </TouchableOpacity>
        );
      }

      return pages;
    };

    if (searchQuery || pagination.totalPages <= 1) return null;

    return (
      <View style={{
        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            flexDirection: 'row', 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          {/* Items per page selector */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 20,
          }}>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              marginRight: 8,
            }}>
              Show:
            </Text>
            <Dropdown
              selectedValue={pagination.itemsPerPage.toString()}
              onValueChange={(itemValue) => {
                const newItemsPerPage = parseInt(itemValue);
                console.log('Changing items per page to:', newItemsPerPage);
                
                // Update pagination state immediately
                setPagination(prev => ({ 
                  ...prev, 
                  itemsPerPage: newItemsPerPage,
                  currentPage: 1 
                }));
                
                // Fetch with new items per page value
                fetchUsers(selectedRole, 1, false, newItemsPerPage);
              }}
              data={[
                { label: '10', value: '10' },
                { label: '25', value: '25' },
                { label: '50', value: '50' },
                { label: '100', value: '100' }
              ]}
              style={{
                width: 80,
                height: 40,
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              }}
              containerStyle={{ width: 80 }}
            />
          </View>

          {/* Navigation Controls */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {/* Previous Button */}
            <TouchableOpacity
              onPress={goToPreviousPage}
              disabled={!pagination.hasPrev || loading || loadingMore}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 8,
                borderRadius: 6,
                backgroundColor: !pagination.hasPrev || loading || loadingMore
                  ? isDarkMode ? '#3A3B3C' : '#F0F2F5'
                  : '#1877F2',
                opacity: !pagination.hasPrev || loading || loadingMore ? 0.5 : 1,
              }}
            >
              <Image
                source={require('@/assets/icons/back.png')}
                style={{ width: 16, height: 16, marginRight: 4 }}
                tintColor={!pagination.hasPrev || loading || loadingMore
                  ? isDarkMode ? '#B0B3B8' : '#65676B'
                  : '#FFFFFF'
                }
                contentFit="contain"
              />
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: !pagination.hasPrev || loading || loadingMore
                  ? isDarkMode ? '#B0B3B8' : '#65676B'
                  : '#FFFFFF',
              }}>
                Previous
              </Text>
            </TouchableOpacity>

            {/* Page Numbers */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 8,
            }}>
              {renderPageNumbers()}
            </View>

            {/* Next Button */}
            <TouchableOpacity
              onPress={goToNextPage}
              disabled={!pagination.hasNext || loading || loadingMore}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginLeft: 8,
                borderRadius: 6,
                backgroundColor: !pagination.hasNext || loading || loadingMore
                  ? isDarkMode ? '#3A3B3C' : '#F0F2F5'
                  : '#1877F2',
                opacity: !pagination.hasNext || loading || loadingMore ? 0.5 : 1,
              }}
            >
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: !pagination.hasNext || loading || loadingMore
                  ? isDarkMode ? '#B0B3B8' : '#65676B'
                  : '#FFFFFF',
                marginRight: 4,
              }}>
                Next
              </Text>
              <Image
                source={require('@/assets/icons/forward.png')}
                style={{ width: 16, height: 16 }}
                tintColor={!pagination.hasNext || loading || loadingMore
                  ? isDarkMode ? '#B0B3B8' : '#65676B'
                  : '#FFFFFF'
                }
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Page Info */}
          <View style={{
            marginLeft: 20,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}>
              {pagination.totalItems} total users
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  // --- Render Logic ---
  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            fontFamily: 'Inter-Regular',
            marginTop: 16,
            fontSize: 14,
            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
          }}>
            Loading Users...
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (error && users.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Image
              source={require('@/assets/icons/error.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
              tintColor="#F44336"
              contentFit="contain"
            />
            <Text style={{
              fontSize: 18,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Failed to Load Users
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: '#F44336',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={refreshUsers}
              style={{
                backgroundColor: '#1877F2',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
              }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (users.length === 0 && !searchQuery) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Image
              source={require('@/assets/images/admin_background.png')}
              style={{ width: 120, height: 120, marginBottom: 20 }}
              contentFit="contain"
            />
            <Text style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              No Users Found
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}>
              No user accounts found for the selected role and status.{'\n'}
              Start by adding some users to the system.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleOpenAddUserModal}
                style={{
                  backgroundColor: '#1877F2',
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/add_user.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                }}>
                  Add User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={refreshUsers}
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/refresh.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
                <Text style={{
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                }}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AddUserModal
          isVisible={isAddUserModalVisible}
          onClose={handleCloseAddUserModal}
          onSubmitBulkFile={handleSubmitBulkUsersFile}
          isDarkMode={isDarkMode}
        />
      </SafeAreaView>
    );
  }

  // Main render
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
      {/* Header */}
      <View style={{
        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 24,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}>
              User Management
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              marginTop: 2,
            }}>
              {pagination.totalItems} total users • Page {pagination.currentPage} of {pagination.totalPages || 1}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleOpenAddUserModal}
              style={{
                backgroundColor: '#1877F2',
                borderRadius: 8,
                padding: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Image
                source={require('@/assets/icons/add_user.png')}
                style={{ width: 24, height: 24, marginRight: 8 }}
                tintColor="#FFFFFF"
                contentFit="contain"
              />
              <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                Add User
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={refreshUsers}
              disabled={refreshing}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
              style={{
                borderRadius: 8,
                padding: 8,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={isDarkMode ? '#E4E6EA' : '#1C1E21'} />
              ) : (
                <Image
                  source={require('@/assets/icons/refresh.png')}
                  style={{ width: 24, height: 24 }}
                  tintColor={isDarkMode ? '#E0E0E0' : 'white'}
                  contentFit="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={{
        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
      }}>
        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 12,
        }}>
          <Image
            source={require('@/assets/icons/search.png')}
            style={{ width: 24, height: 24, marginRight: 12 }}
            tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
            contentFit="contain"
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}
            placeholder="Search users by name, email, or username..."
            placeholderTextColor={isDarkMode ? '#B0B3B8' : '#65676B'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={{
                backgroundColor: isDarkMode ? '#4E4F50' : '#E4E6EA',
                borderRadius: 12,
                padding: 8,
                marginLeft: 8,
              }}
            >
              <Image
                source={require('@/assets/icons/close.png')}
                style={{ width: 24, height: 24}}
                tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                contentFit="contain"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Info */}
        {searchQuery.length > 0 && (
          <Text style={{
            fontSize: 14,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#B0B3B8' : '#65676B',
            marginBottom: 12,
          }}>
            {filteredUsers.length === 0 
              ? `No results found for "${searchQuery}"`
              : `Found ${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} matching "${searchQuery}"`
            }
          </Text>
        )}

        {/* Role Filter */}
        <View style={{
          alignSelf: 'flex-start',
          minWidth: 150,
        }}>
          <Dropdown
            selectedValue={selectedRole || ''}
            onValueChange={(itemValue) => setSelectedRole(itemValue || null)}
            data={[
              { label: 'All Roles', value: '' },
              { label: 'Admin', value: 'Admin' },
              { label: 'Teacher', value: 'Teacher' },
              { label: 'Student', value: 'Student' }
            ]}
            style={{
              height: 40,
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
            }}
            placeholder="All Roles"
          />
        </View>
      </View>

      {/* Pagination Controls */}
      <PaginationControls />

      {/* User List */}
      {searchQuery.length > 0 && filteredUsers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Image
              source={require('@/assets/icons/search.png')}
              style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.5 }}
              tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
              contentFit="contain"
            />
            <Text style={{
              fontSize: 18,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              No Results Found
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              No users found matching "{searchQuery}"{'\n'}
              Try searching with different keywords
            </Text>
            <TouchableOpacity
              onPress={clearSearch}
              style={{
                backgroundColor: '#1877F2',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
              }}>
                Clear Search
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <VirtualizedList
            data={filteredUsers}
            renderItem={({ item }: { item: User }) => {
              const isCurrentItemDeleting = deletingId === item._id;
              
              const highlightText = (text: string, query: string) => {
                if (!query.trim()) return text;
                
                const parts = text.split(new RegExp(`(${query})`, 'gi'));
                return parts.map((part, index) => 
                  part.toLowerCase() === query.toLowerCase() ? 
                    <Text key={index} style={{
                      backgroundColor: isDarkMode ? '#FFC107' : '#FFF59D',
                      fontFamily: 'Inter-Bold',
                    }}>
                      {part}
                    </Text> : part
                );
              };

              return (
                <View style={{
                  backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                  marginVertical: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  {/* Profile Picture */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    overflow: 'hidden',
                    marginRight: 12,
                  }}>
                    <Image
                      source={item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                      style={{ width: 48, height: 48 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>

                  {/* User Info */}
                  <View style={{ flex: 1 }}>
                    <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {searchQuery ? 
                        highlightText(`${item.lastName}, ${item.firstName}`, searchQuery) :
                        `${item.lastName}, ${item.firstName}`
                      }
                    </Text>
                    
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      {searchQuery ? 
                        highlightText(item.email || 'No email', searchQuery) :
                        item.email || 'No email'
                      }
                    </Text>
                    
                    <Text style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#B0B3B8' : '#65676B',
                      marginBottom: 4,
                    }}>
                      ID: {item.userId || 'N/A'} • Password: {item.temporaryPassword || 'N/A'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        backgroundColor: item.status === 'active' ? '#10B981' : 
                                      item.status === 'inactive' ? '#F59E0B' :
                                      item.status === 'suspended' ? '#EF4444' : '#6B7280',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        marginRight: 8,
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontFamily: 'Inter-Bold',
                          color: '#FFFFFF',
                        }}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={{
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontFamily: 'Inter-SemiBold',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}>
                          {item.role}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleEditUser(item._id)}
                      style={{
                        backgroundColor: '#10B981',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <EditIcon width={20} height={20} fill="#FFFFFF"/>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleDeleteUser(item._id)}
                      disabled={isCurrentItemDeleting}
                      style={{
                        backgroundColor: '#EF4444',
                        borderRadius: 8,
                        padding: 10,
                        opacity: isCurrentItemDeleting ? 0.6 : 1,
                      }}
                    >
                      {isCurrentItemDeleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <DeleteIcon width={20} height={20} fill="#FFFFFF"/>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ paddingVertical: 16 }}
            keyExtractor={(item) => item._id}
            getItem={getItem}
            getItemCount={getItemCount}
            extraData={[isDarkMode, searchQuery, deletingId]}
            onRefresh={refreshUsers}
            refreshing={refreshing}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
          />
        </View>
      )}   
      
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
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