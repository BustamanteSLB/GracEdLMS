import { Text, ScrollView, View, useColorScheme, ActivityIndicator, RefreshControl, TouchableOpacity, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image, ImageBackground } from 'expo-image'
import { cssInterop } from 'nativewind'
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router'

const ProfileAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user, fetchCurrentUser, isLoading: authIsLoading, isLoggingOut } = useAuth();
  const { width, height } = useWindowDimensions();

  cssInterop(Image, { className: "style" });
  cssInterop(ImageBackground, { className: "style" });

  const [refreshing, setRefreshing] = useState(false);

  // Mobile is always portrait for this design
  const isPortrait = true;

  // Function to refresh user data
  const onRefresh = useCallback(async () => {
    if (isLoggingOut) return;
    setRefreshing(true);
    await fetchCurrentUser();
    setRefreshing(false);
  }, [fetchCurrentUser, isLoggingOut]);

  useEffect(() => {
    if (!user && !authIsLoading && !isLoggingOut) {
      onRefresh();
    }
  }, [user, authIsLoading, isLoggingOut, onRefresh]);

  if (authIsLoading || (!user && !isLoggingOut)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            marginTop: 16,
            fontSize: 14,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
          }}>
            Loading Profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine full name with optional middle name
  const fullName = user?.middleName
    ? `${user?.firstName} ${user?.middleName} ${user?.lastName}`
    : `${user?.firstName} ${user?.lastName}`;

  // Helper for formatting date
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return '#EF4444';
      case 'teacher': return '#10B981';
      case 'student': return '#1877F2';
      default: return '#6B7280';
    }
  };

  // Function to get status color based on User model status field
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'inactive': return '#6B7280';
      case 'suspended': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'archived': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  // Function to get status display text
  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'ACTIVE';
      case 'inactive': return 'INACTIVE';
      case 'suspended': return 'SUSPENDED';
      case 'pending': return 'PENDING';
      case 'archived': return 'ARCHIVED';
      default: return 'UNKNOWN';
    }
  };

  // Function to get status indicator color for the profile picture
  const getStatusIndicatorColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'inactive': return '#6B7280';
      case 'suspended': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'archived': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const InfoField = ({ label, value, icon }: { label: string; value?: string; icon: any }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
    }}>
      <View style={{
        width: 24,
        height: 24,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Image
          source={icon}
          style={{ width: 20, height: 20 }}
          tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
          contentFit="contain"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 12,
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#B0B3B8' : '#65676B',
          marginBottom: 2,
        }}>
          {label}
        </Text>
        <Text style={{
          fontSize: 14,
          fontFamily: 'Inter-SemiBold',
          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
        }}>
          {value || 'Not specified'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          alignItems: 'center',
          padding: 16,
          minHeight: height - 100,
          justifyContent: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
          />
        }
      >
        {/* ID Card Container */}
        <View style={{
          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 12,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 400,
          minHeight: 600,
        }}>
          {/* Header with School Branding */}
          <View style={{
            backgroundColor: '#10B981',
            paddingVertical: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Image
                source={require('@/assets/images/GCCS-logo.png')}
                style={{ width: 50, height: 50 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontFamily: 'Inter-Bold',
                color: '#FFFFFF',
              }}>
                Grace Community Christian School
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: 'rgba(255, 255, 255, 0.8)',
              }}>
                Teacher Identification Card
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                padding: 8,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image
                  source={require('@/assets/icons/refresh.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={{
            padding: 20,
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Profile Section */}
            <View style={{
              alignItems: 'center',
              marginBottom: 20,
              width: '100%',
            }}>
              {/* Profile Picture */}
              <View style={{
                position: 'relative',
                marginBottom: 16,
              }}>
                <View style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  padding: 4,
                }}>
                  <Image
                    source={user?.profilePicture ? { uri: user?.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: 56,
                    }}
                    contentFit="cover"
                  />
                </View>
                
                {/* Status Indicator */}
                <View style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: getStatusIndicatorColor(user?.status || 'active'),
                  borderWidth: 3,
                  borderColor: isDarkMode ? '#242526' : '#FFFFFF',
                }} />
              </View>

              {/* Name and ID */}
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {fullName}
              </Text>
              
              <View style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginBottom: 8,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  ID: {user?.userId}
                </Text>
              </View>

              {/* Role Badge */}
              <View style={{
                backgroundColor: getRoleColor(user?.role || ''),
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
                marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Bold',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                }}>
                  {user?.role}
                </Text>
              </View>
            </View>

            {/* Information Section */}
            <View style={{
              flex: 1,
              width: '100%',
            }}>
              <View style={{
                backgroundColor: isDarkMode ? '#1E1F20' : '#F8F9FA',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 12,
                }}>
                  Personal Information
                </Text>

                <InfoField 
                  label="Username" 
                  value={user?.username} 
                  icon={require('@/assets/icons/account.png')} 
                />
                <InfoField 
                  label="Email Address" 
                  value={user?.email} 
                  icon={require('@/assets/icons/email.png')} 
                />
                <InfoField 
                  label="Phone Number" 
                  value={user?.phoneNumber} 
                  icon={require('@/assets/icons/phone.png')} 
                />
                <InfoField 
                  label="Gender" 
                  value={user?.sex} 
                  icon={require('@/assets/icons/gender.png')} 
                />
                <InfoField 
                  label="Address" 
                  value={user?.address} 
                  icon={require('@/assets/icons/location.png')} 
                />
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingTop: 8,
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Image
                      source={require('@/assets/icons/calendar_month.png')}
                      style={{ width: 16, height: 16 }}
                      tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                      contentFit="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#B0B3B8' : '#65676B',
                      marginBottom: 2,
                    }}>
                      Account Created On
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    }}>
                      {formatDate(user?.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{
                flexDirection: 'column',
                gap: 12,
              }}>
                <TouchableOpacity
                  onPress={() => router.push('/(teachers)/edit-profile')}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    source={require('@/assets/icons/edit.png')}
                    style={{ width: 16, height: 16, marginRight: 8 }}
                    tintColor="#FFFFFF"
                    contentFit="contain"
                  />
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: '#FFFFFF',
                  }}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onRefresh}
                  disabled={refreshing}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: refreshing ? 0.6 : 1,
                  }}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={isDarkMode ? '#E4E6EA' : '#1C1E21'} style={{ marginRight: 8 }} />
                  ) : (
                    <Image
                      source={require('@/assets/icons/refresh.png')}
                      style={{ width: 16, height: 16, marginRight: 8 }}
                      tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                      contentFit="contain"
                    />
                  )}
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}>
                    {refreshing ? 'Syncing...' : 'Sync Data'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={{
            backgroundColor: isDarkMode ? '#1E1F20' : '#F8F9FA',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getStatusColor(user?.status || 'active'),
                marginRight: 6,
              }} />
              <Text style={{
                fontSize: 11,
                fontFamily: 'Inter-SemiBold',
                color: getStatusColor(user?.status || 'active'),
              }}>
                {getStatusText(user?.status || 'active')}
              </Text>
            </View>
          </View>
        </View>

        {/* Helper Text */}
        {refreshing && (
          <Text style={{
            fontSize: 12,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#B0B3B8' : '#65676B',
            textAlign: 'center',
            marginTop: 12,
          }}>
            Updating profile information...
          </Text>
        )}
      </ScrollView>

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  )
}

export default ProfileAndroid