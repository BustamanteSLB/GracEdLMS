// archives.web.tsx
import { Text, View, useColorScheme, ActivityIndicator, FlatList, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import DeleteIcon from '@/assets/icons/delete.svg';
import NetworkBanner from '@/components/NetworkBanner.web';

cssInterop(Image, { className: "style" });

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const ITEMS_PER_PAGE = 25;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UserListApiResponse extends ApiResponse {
  data?: User[];
  count?: number;
  total?: number;
  pagination?: {
    next?: { page: number; limit: number };
    prev?: { page: number; limit: number };
  };
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------------ */
/*  ArchivedUserRow — memoized row                                     */
/* ------------------------------------------------------------------ */
interface ArchivedUserRowProps {
  item: User;
  isDarkMode: boolean;
  searchQuery: string;
  isSelected: boolean;
  isRestoring: boolean;
  isDeleting: boolean;
  anyActionLoading: boolean;
  onToggleSelect: (id: string) => void;
  onRestore: (id: string, username: string) => void;
  onDelete: (id: string, username: string) => void;
}

const ArchivedUserRow = memo<ArchivedUserRowProps>(
  ({
    item,
    isDarkMode,
    searchQuery,
    isSelected,
    isRestoring,
    isDeleting,
    anyActionLoading,
    onToggleSelect,
    onRestore,
    onDelete,
  }) => {
    const displayName = `${item.lastName}, ${item.firstName}`;
    const emailDisplay = item.email || 'No email';

    const highlightedName = useMemo(() => {
      if (!searchQuery.trim()) return displayName;
      const q = searchQuery.trim();
      const parts = displayName.split(new RegExp(`(${escapeRegex(q)})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Text
            key={i}
            style={{
              backgroundColor: isDarkMode ? '#FFC107' : '#FFF59D',
              fontFamily: 'Inter-Bold',
            }}
          >
            {part}
          </Text>
        ) : (
          part
        )
      );
    }, [displayName, searchQuery, isDarkMode]);

    const highlightedEmail = useMemo(() => {
      if (!searchQuery.trim()) return emailDisplay;
      const q = searchQuery.trim();
      const parts = emailDisplay.split(new RegExp(`(${escapeRegex(q)})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Text
            key={i}
            style={{
              backgroundColor: isDarkMode ? '#FFC107' : '#FFF59D',
              fontFamily: 'Inter-Bold',
            }}
          >
            {part}
          </Text>
        ) : (
          part
        )
      );
    }, [emailDisplay, searchQuery, isDarkMode]);

    const handleToggleSelect = useCallback(() => {
      onToggleSelect(item._id);
    }, [item._id, onToggleSelect]);

    const handleRestore = useCallback(() => {
      onRestore(item._id, item.username);
    }, [item._id, item.username, onRestore]);

    const handleDelete = useCallback(() => {
      onDelete(item._id, item.username);
    }, [item._id, item.username, onDelete]);

    const actionsDisabled = isRestoring || isDeleting || anyActionLoading;

    return (
      <View
        style={{
          backgroundColor: isSelected
            ? isDarkMode
              ? '#2A3A4A'
              : '#E7F3FF'
            : isDarkMode
              ? '#242526'
              : '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 12,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
          borderWidth: isSelected ? 1 : 0,
          borderColor: isSelected ? '#1877F2' : 'transparent',
        }}
      >
        <View style={{ marginRight: 12, padding: 4 }}>
          <Checkbox
            value={isSelected}
            onValueChange={handleToggleSelect}
            color={isSelected ? '#1877F2' : undefined}
            disabled={anyActionLoading}
          />
        </View>

        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            marginRight: 12,
          }}
        >
          <Image
            source={
              item.profilePicture
                ? { uri: item.profilePicture }
                : require('@/assets/images/sample_profile_picture.png')
            }
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {highlightedName}
          </Text>

          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {highlightedEmail}
          </Text>

          <Text
            style={{
              fontSize: 10,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            ID: {item.userId || 'N/A'} • Username: {item.username || 'N/A'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: '#6B7280',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: 'Inter-Bold',
                  color: '#FFFFFF',
                }}
              >
                ARCHIVED
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
              >
                {item.role}
              </Text>
            </View>
          </View>
          <Text
            style={{
              marginTop: 2,
              fontSize: 10,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}
          >
            Archived: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={actionsDisabled}
            style={{
              backgroundColor: '#10B981',
              borderRadius: 8,
              padding: 10,
              opacity: actionsDisabled ? 0.6 : 1,
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
            onPress={handleDelete}
            disabled={actionsDisabled}
            style={{
              backgroundColor: '#EF4444',
              borderRadius: 8,
              padding: 10,
              opacity: actionsDisabled ? 0.6 : 1,
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <DeleteIcon width={20} height={20} fill="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);
ArchivedUserRow.displayName = 'ArchivedUserRow';

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const ArchivesWeb = () => {
  document.title = 'Archives - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  /* ------------------------- state ------------------------- */
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
    hasNext: false,
    hasPrev: false,
  });

  /* ------------------------- data fetching ------------------------- */
  const fetchUsers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const params = {
          status: 'archived',
          page,
          limit: ITEMS_PER_PAGE,
          sort: '-updatedAt',
        };

        const response = await apiClient.get<UserListApiResponse>('/users', {
          params,
        });

        if (response.data.success && response.data.data) {
          const archivedUsers = response.data.data;
          const totalItems = response.data.total || 0;
          const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

          setPagination({
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: ITEMS_PER_PAGE,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          });

          if (append && page > 1) {
            setUsers((prev) => [...prev, ...archivedUsers]);
          } else {
            setUsers(archivedUsers);
          }
          setForceNetworkBannerVisible(false);
        } else {
          setError(response.data.message || 'Failed to fetch archived users.');
          if (!append) setUsers([]);
        }
      } catch (err: any) {
        console.error('Error fetching archived users:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'An error occurred while fetching archived users.'
        );
        if (!append) setUsers([]);

        const isNetworkError =
          !err?.response ||
          err?.code === 'ECONNABORTED' ||
          err?.message?.toLowerCase().includes('network') ||
          err?.message?.toLowerCase().includes('timeout');
        if (isNetworkError) {
          setForceNetworkBannerVisible(true);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const refreshUsers = useCallback(() => {
    setRefreshing(true);
    setSelectedIds(new Set());
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchUsers(1, false).finally(() => setRefreshing(false));
  }, [fetchUsers]);

  // Initial load
  useEffect(() => {
    fetchUsers(1, false);
  }, [fetchUsers]);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing) return;
    if (!pagination.hasNext) return;
    fetchUsers(pagination.currentPage + 1, true);
  }, [
    loading,
    loadingMore,
    refreshing,
    pagination.hasNext,
    pagination.currentPage,
    fetchUsers,
  ]);

  /* ------------------------- derived data ------------------------- */
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (user.email?.toLowerCase() || '').includes(q) ||
        (user.username?.toLowerCase() || '').includes(q) ||
        (user.userId?.toLowerCase() || '').includes(q)
      );
    });
  }, [users, searchQuery]);

  const listData = searchQuery.length > 0 ? filteredUsers : users;

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    listData.length > 0 && listData.every((u) => selectedIds.has(u._id));
  const someVisibleSelected =
    listData.some((u) => selectedIds.has(u._id)) && !allVisibleSelected;

  // Stable extraData so FlatList only re-renders rows that changed
  const extraData = useMemo(
    () => ({ isDarkMode, searchQuery, actionLoading, selectedIds }),
    [isDarkMode, searchQuery, actionLoading, selectedIds]
  );

  /* ------------------------- handlers ------------------------- */
  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectUser = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        listData.length > 0 && listData.every((u) => next.has(u._id));
      if (allSelected) {
        listData.forEach((u) => next.delete(u._id));
      } else {
        listData.forEach((u) => next.add(u._id));
      }
      return next;
    });
  }, [listData]);

  const removeUsersFromState = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setUsers((prev) => prev.filter((u) => !idSet.has(u._id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setPagination((prev) => ({
      ...prev,
      totalItems: Math.max(0, prev.totalItems - ids.length),
    }));
  }, []);

  const handleRestoreUser = useCallback(
    async (userId: string, username: string) => {
      const confirmRestore = window.confirm(
        `Are you sure you want to restore user "${username}"? Their status will be set to 'active'.`
      );
      if (!confirmRestore) return;

      setActionLoading(`${userId}_restore`);
      try {
        const response = await apiClient.put<ApiResponse>(
          `/users/${userId}/restore`,
          { status: 'active' }
        );
        if (response.data.success) {
          window.alert(`Success: User ${username} restored successfully.`);
          removeUsersFromState([userId]);
        } else {
          window.alert(
            `Error: ${response.data.message || 'Failed to restore user.'}`
          );
        }
      } catch (err: any) {
        console.error('Error restoring user:', err);
        window.alert(
          `Error: ${
            err.response?.data?.message ||
            'An error occurred while restoring the user.'
          }`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [removeUsersFromState]
  );

  const handlePermanentDeleteUser = useCallback(
    async (userId: string, username: string) => {
      const confirmDelete = window.confirm(
        `DANGER: Are you sure you want to PERMANENTLY DELETE user "${username}"? This action cannot be undone.`
      );
      if (!confirmDelete) return;

      setActionLoading(`${userId}_delete`);
      try {
        const response = await apiClient.delete<ApiResponse>(
          `/users/${userId}/permanent`
        );
        if (response.data.success) {
          window.alert(`Success: User ${username} permanently deleted.`);
          removeUsersFromState([userId]);
        } else {
          window.alert(
            `Error: ${
              response.data.message || 'Failed to permanently delete user.'
            }`
          );
        }
      } catch (err: any) {
        console.error('Error permanently deleting user:', err);
        window.alert(
          `Error: ${
            err.response?.data?.message ||
            'An error occurred while deleting the user.'
          }`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [removeUsersFromState]
  );

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmRestore = window.confirm(
      `Are you sure you want to restore ${ids.length} selected user${
        ids.length === 1 ? '' : 's'
      }? Their status will be set to 'active'.`
    );
    if (!confirmRestore) return;

    setActionLoading('bulk_restore');
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      for (const userId of ids) {
        try {
          const response = await apiClient.put<ApiResponse>(
            `/users/${userId}/restore`,
            { status: 'active' }
          );
          if (response.data.success) succeeded.push(userId);
          else failed.push(userId);
        } catch {
          failed.push(userId);
        }
      }

      if (succeeded.length > 0) removeUsersFromState(succeeded);

      if (failed.length === 0) {
        window.alert(
          `Success: Restored ${succeeded.length} user${
            succeeded.length === 1 ? '' : 's'
          }.`
        );
      } else {
        window.alert(
          `Restored ${succeeded.length} user${
            succeeded.length === 1 ? '' : 's'
          }. Failed: ${failed.length}.`
        );
      }
    } finally {
      setActionLoading(null);
    }
  }, [selectedIds, removeUsersFromState]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmDelete = window.confirm(
      `DANGER: Permanently delete ${ids.length} selected user${
        ids.length === 1 ? '' : 's'
      }? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionLoading('bulk_delete');
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      for (const userId of ids) {
        try {
          const response = await apiClient.delete<ApiResponse>(
            `/users/${userId}/permanent`
          );
          if (response.data.success) succeeded.push(userId);
          else failed.push(userId);
        } catch {
          failed.push(userId);
        }
      }

      if (succeeded.length > 0) removeUsersFromState(succeeded);

      if (failed.length === 0) {
        window.alert(
          `Success: Permanently deleted ${succeeded.length} user${
            succeeded.length === 1 ? '' : 's'
          }.`
        );
      } else {
        window.alert(
          `Deleted ${succeeded.length} user${
            succeeded.length === 1 ? '' : 's'
          }. Failed: ${failed.length}.`
        );
      }
    } finally {
      setActionLoading(null);
    }
  }, [selectedIds, removeUsersFromState]);

  /* ------------------------- renderers ------------------------- */
  const renderUserItem = useCallback(
    ({ item }: { item: User }) => (
      <ArchivedUserRow
        item={item}
        isDarkMode={isDarkMode}
        searchQuery={searchQuery}
        isSelected={selectedIds.has(item._id)}
        isRestoring={actionLoading === `${item._id}_restore`}
        isDeleting={actionLoading === `${item._id}_delete`}
        anyActionLoading={!!actionLoading}
        onToggleSelect={toggleSelectUser}
        onRestore={handleRestoreUser}
        onDelete={handlePermanentDeleteUser}
      />
    ),
    [
      isDarkMode,
      searchQuery,
      selectedIds,
      actionLoading,
      toggleSelectUser,
      handleRestoreUser,
      handlePermanentDeleteUser,
    ]
  );

  /* ------------------------- list header ------------------------- */
  const listHeader = useMemo(
    () => (
      <View>
        {/* Title + refresh */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            paddingVertical: 16,
            paddingHorizontal: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
              >
                Archived Users
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  marginTop: 2,
                }}
              >
                {users.length} of {pagination.totalItems} archived user
                {pagination.totalItems === 1 ? '' : 's'} loaded
              </Text>
            </View>

            <TouchableOpacity
              onPress={refreshUsers}
              disabled={refreshing}
              style={{
                backgroundColor: isDarkMode ? '#DC2626' : '#DC2626',
                borderRadius: 8,
                padding: 8,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color={isDarkMode ? '#E4E6EA' : '#FFFFFF'}
                />
              ) : (
                <Image
                  source={require('@/assets/icons/refresh.png')}
                  style={{ width: 24, height: 24 }}
                  tintColor="white"
                  contentFit="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
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
                  style={{ width: 24, height: 24 }}
                  tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.length > 0 && (
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
                marginTop: 12,
              }}
            >
              {filteredUsers.length === 0
                ? `No results found for "${searchQuery}"`
                : `Found ${filteredUsers.length} archived user${
                    filteredUsers.length === 1 ? '' : 's'
                  } matching "${searchQuery}"`}
            </Text>
          )}
        </View>

        {/* Selection + bulk actions */}
        {listData.length > 0 && (
          <View
            style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              <Checkbox
                value={allVisibleSelected}
                onValueChange={toggleSelectAllVisible}
                color={
                  allVisibleSelected || someVisibleSelected
                    ? '#1877F2'
                    : undefined
                }
                disabled={!!actionLoading}
              />
              <TouchableOpacity
                onPress={toggleSelectAllVisible}
                disabled={!!actionLoading}
              >
                <Text
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  {allVisibleSelected
                    ? 'Deselect all'
                    : `Select all (${listData.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#B0B3B8' : '#65676B',
                    marginRight: 4,
                  }}
                >
                  {selectedCount} selected
                </Text>

                <TouchableOpacity
                  onPress={clearSelection}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBulkRestore}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading === 'bulk_restore' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Image
                        source={require('@/assets/icons/restore.png')}
                        style={{ width: 16, height: 16, marginRight: 6 }}
                        tintColor="#FFFFFF"
                        contentFit="contain"
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: 'Inter-SemiBold',
                          color: '#FFFFFF',
                        }}
                      >
                        Restore
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBulkPermanentDelete}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading === 'bulk_delete' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <DeleteIcon width={16} height={16} fill="#FFFFFF" />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: 'Inter-SemiBold',
                          color: '#FFFFFF',
                          marginLeft: 6,
                        }}
                      >
                        Delete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    ),
    [
      isDarkMode,
      users.length,
      pagination.totalItems,
      refreshing,
      searchQuery,
      filteredUsers.length,
      listData.length,
      allVisibleSelected,
      someVisibleSelected,
      selectedCount,
      actionLoading,
      refreshUsers,
      clearSearch,
      toggleSelectAllVisible,
      clearSelection,
      handleBulkRestore,
      handleBulkPermanentDelete,
    ]
  );

  /* ------------------------- list empty ------------------------- */
  const listEmpty = useMemo(
    () => (
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          minHeight: 400,
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            maxWidth: 500,
          }}
        >
          {searchQuery.length > 0 ? (
            <>
              <Image
                source={require('@/assets/icons/search.png')}
                style={{
                  width: 64,
                  height: 64,
                  marginBottom: 16,
                  opacity: 0.5,
                }}
                tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                contentFit="contain"
              />
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No Results Found
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
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
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontFamily: 'Inter-SemiBold',
                  }}
                >
                  Clear Search
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={require('@/assets/icons/archive.png')}
                style={{
                  width: 120,
                  height: 120,
                  marginBottom: 20,
                  opacity: 0.5,
                }}
                tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                contentFit="contain"
              />
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No Archived Users
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  textAlign: 'center',
                  marginBottom: 24,
                  lineHeight: 20,
                }}
              >
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
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontFamily: 'Inter-SemiBold',
                  }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    ),
    [isDarkMode, searchQuery, clearSearch, refreshUsers]
  );

  /* ------------------------- list footer ------------------------- */
  const listFooter = useMemo(
    () => (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        {loadingMore ? (
          <>
            <ActivityIndicator size="small" color="#1877F2" />
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
              }}
            >
              Loading more archived users...
            </Text>
          </>
        ) : !pagination.hasNext && users.length > ITEMS_PER_PAGE ? (
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#B0B3B8' : '#65676B',
            }}
          >
            All {pagination.totalItems} archived users loaded
          </Text>
        ) : null}
      </View>
    ),
    [loadingMore, isDarkMode, pagination.hasNext, pagination.totalItems, users.length]
  );

  /* ------------------------- early returns ------------------------- */
  if (loading && users.length === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5',
        }}
      >
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={() => fetchUsers(1, false)}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              marginTop: 16,
              fontSize: 14,
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}
          >
            Loading Archived Users...
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (error && users.length === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5',
        }}
      >
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={() => fetchUsers(1, false)}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Image
              source={require('@/assets/icons/error.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
              tintColor="#F44336"
              contentFit="contain"
            />
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Failed to Load Archived Users
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: '#F44336',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
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
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  /* ------------------------- main render ------------------------- */
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5',
      }}
    >
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={() => fetchUsers(1, false)}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Entire screen is now scrollable via FlatList */}
      <FlatList
        data={listData}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refreshUsers}
        refreshing={refreshing}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        extraData={extraData}
        keyboardShouldPersistTaps="handled"
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default memo(ArchivesWeb);