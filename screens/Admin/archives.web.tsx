import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import DeleteIcon from '@/assets/icons/delete.svg';
import { TextInput } from 'react-native'
import Dropdown, { DropdownItem } from '@/components/Dropdown';

cssInterop(Image, { className: "style" });

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

const ArchivesWeb = () => {
  document.title = 'Archives - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  
  // Enhanced state management with pagination
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
    page: number = 1, 
    append: boolean = false,
    itemsPerPage?: number
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
        status: string;
        page: number; 
        limit: number; 
        sort?: string;
      } = {
        status: 'archived',
        page,
        limit: currentItemsPerPage,
        sort: '-updatedAt', // Sort by most recently archived first
      }; 

      console.log('Fetching archived users with params:', params);

      const response = await apiClient.get<UserListApiResponse>('/users', {
        params,
      });

      if (response.data.success && response.data.data) {
        const archivedUsers = response.data.data;
        
        // Fixed pagination calculation with correct itemsPerPage
        const totalItems = response.data.total || 0;
        const totalPages = Math.ceil(totalItems / currentItemsPerPage);
        
        const newPagination: PaginationInfo = {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: currentItemsPerPage,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        };
        
        setPagination(newPagination);

        if (append && page > 1) {
          // Append new users to existing list (for infinite scroll if implemented)
          setUsers(prevUsers => [...prevUsers, ...archivedUsers]);
        } else {
          // Replace users list (initial load, refresh, or page navigation)
          setUsers(archivedUsers);
        }

        console.log(`Loaded ${archivedUsers.length} archived users (page ${page}/${totalPages})`);
      } else {
        setError(response.data.message || 'Failed to fetch archived users.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching archived users:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching archived users.'
      );
      setUsers([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // Remove pagination.itemsPerPage from dependencies

  // Refresh function that resets to page 1
  const refreshUsers = useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchUsers(1, false, pagination.itemsPerPage).finally(() => {
      setRefreshing(false);
    });
  }, [fetchUsers, pagination.itemsPerPage]);

  // Initial load
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchUsers(1, false, pagination.itemsPerPage);
  }, []); // Remove fetchUsers from dependencies

  // Fixed pagination navigation functions
  const goToPreviousPage = useCallback(() => {
    if (pagination.hasPrev && !loading && !loadingMore) {
      const prevPage = pagination.currentPage - 1;
      console.log(`Navigating to previous page: ${prevPage}`);
      fetchUsers(prevPage, false, pagination.itemsPerPage);
    }
  }, [pagination.hasPrev, pagination.currentPage, pagination.itemsPerPage, loading, loadingMore]);

  const goToNextPage = useCallback(() => {
    if (pagination.hasNext && !loading && !loadingMore) {
      const nextPage = pagination.currentPage + 1;
      console.log(`Navigating to next page: ${nextPage}`);
      fetchUsers(nextPage, false, pagination.itemsPerPage);
    }
  }, [pagination.hasNext, pagination.currentPage, pagination.itemsPerPage, loading, loadingMore]);

  const goToSpecificPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages && pageNumber !== pagination.currentPage && !loading && !loadingMore) {
      console.log(`Navigating to page: ${pageNumber}`);
      fetchUsers(pageNumber, false, pagination.itemsPerPage);
    }
  }, [pagination.totalPages, pagination.currentPage, pagination.itemsPerPage, loading, loadingMore]);

  // Memoized dropdown items
  const itemsPerPageOptions: DropdownItem[] = useMemo(() => [
    { label: '10', value: '10' },
    { label: '25', value: '25' },
    { label: '50', value: '50' },
    { label: '100', value: '100' },
  ], []);

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
            <View style={{ width: 80 }}>
              <Dropdown
                data={itemsPerPageOptions}
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
                  fetchUsers(1, false, newItemsPerPage);
                }}
                placeholder="25"
              />
            </View>
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
              {pagination.totalItems} total archived users
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const handleRestoreUser = async (userId: string, username: string) => {
    const confirmRestore = window.confirm(`Are you sure you want to restore user "${username}"? Their status will be set to 'active'.`);
    if (!confirmRestore) return;

    setActionLoading(`${userId}_restore`);
    try {
      const response = await apiClient.put<ApiResponse>(`/users/${userId}/restore`, { status: 'active' });
      if (response.data.success) {
        window.alert(`Success: User ${username} restored successfully.`);
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        // Update pagination info after restoration
        setPagination(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1)
        }));
      } else {
        window.alert(`Error: ${response.data.message || 'Failed to restore user.'}`);
      }
    } catch (err: any) {
      console.error('Error restoring user:', err);
      window.alert(`Error: ${err.response?.data?.message || 'An error occurred while restoring the user.'}`);
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
        window.alert(`Success: User ${username} permanently deleted.`);
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        // Update pagination info after deletion
        setPagination(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1)
        }));
      } else {
        window.alert(`Error: ${response.data.message || 'Failed to permanently delete user.'}`);
      }
    } catch (err: any) {
      console.error('Error permanently deleting user:', err);
      window.alert(`Error: ${err.response?.data?.message || 'An error occurred while deleting the user.'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // --- VirtualizedList specific functions ---
  const getItemCount = useCallback((_data: User[] | null | undefined) => _data ? _data.length : 0, []);
  
  const getItem = useCallback((_data: User[] | null | undefined, index: number): User => {
    return (_data as User[])[index];
  }, []);

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
            Loading Archived Users...
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
              Failed to Load Archived Users
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
              source={require('@/assets/icons/archive.png')}
              style={{ width: 120, height: 120, marginBottom: 20, opacity: 0.5 }}
              tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
              contentFit="contain"
            />
            <Text style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              No Archived Users
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}>
              No archived user accounts found.{'\n'}
              Archived users will appear here when deleted.
            </Text>
            <TouchableOpacity
              onPress={refreshUsers}
              style={{
                backgroundColor: '#1877F2',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Image
                source={require('@/assets/icons/refresh.png')}
                style={{ width: 20, height: 20, marginRight: 8 }}
                tintColor="#FFFFFF"
                contentFit="contain"
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
              }}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
              Archived Users
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              marginTop: 2,
            }}>
              {pagination.totalItems} total archived users • Page {pagination.currentPage} of {pagination.totalPages || 1}
            </Text>
          </View>
          
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

      {/* Search Bar */}
      <View style={{
        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}>
          <Image
            source={require('@/assets/icons/search.png')}
            style={{ width: 24, height: 24, marginRight: 8 }}
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
            placeholder="Search archived users by name, email, or username..."
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
            marginTop: 12,
          }}>
            {filteredUsers.length === 0 
              ? `No results found for "${searchQuery}"`
              : `Found ${filteredUsers.length} archived user${filteredUsers.length === 1 ? '' : 's'} matching "${searchQuery}"`
            }
          </Text>
        )}
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
              No archived users found matching "{searchQuery}"{'\n'}
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
              const isRestoring = actionLoading === `${item._id}_restore`;
              const isDeleting = actionLoading === `${item._id}_delete`;

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
                    <Text style={{
                      fontSize: 16,
                      fontFamily: 'Inter-Bold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      marginBottom: 2,
                    }}>
                      {searchQuery ? 
                        highlightText(`${item.lastName}, ${item.firstName}`, searchQuery) :
                        `${item.lastName}, ${item.firstName}`
                      }
                    </Text>
                    
                    <Text style={{
                      fontSize: 14,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#B0B3B8' : '#65676B',
                      marginBottom: 2,
                    }}>
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
                      ID: {item.userId || 'N/A'} • Username: {item.username || 'N/A'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        backgroundColor: '#6B7280',
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
                          ARCHIVED
                        </Text>
                      </View>
                      
                      <View style={{
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        marginRight: 8,
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontFamily: 'Inter-SemiBold',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}>
                          {item.role}
                        </Text>
                      </View>

                      <Text style={{
                        fontSize: 12,
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#B0B3B8' : '#65676B',
                      }}>
                        Archived: {new Date(item.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleRestoreUser(item._id, item.username)}
                      disabled={isRestoring || isDeleting || !!actionLoading}
                      style={{
                        backgroundColor: '#10B981',
                        borderRadius: 8,
                        padding: 10,
                        opacity: isRestoring || isDeleting || !!actionLoading ? 0.6 : 1,
                      }}
                    >
                      {isRestoring ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Image
                          source={require('@/assets/icons/restore.png')}
                          style={{ width: 20, height: 20 }}
                          tintColor="#FFFFFF"
                          contentFit="contain"
                        />
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handlePermanentDeleteUser(item._id, item.username)}
                      disabled={isDeleting || isRestoring || !!actionLoading}
                      style={{
                        backgroundColor: '#EF4444',
                        borderRadius: 8,
                        padding: 10,
                        opacity: isDeleting || isRestoring || !!actionLoading ? 0.6 : 1,
                      }}
                    >
                      {isDeleting ? (
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
            extraData={[isDarkMode, searchQuery, actionLoading]}
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
    </SafeAreaView>
  )
}

export default ArchivesWeb