import { Linking, ScrollView, View, Text, useColorScheme, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React, { useState, useEffect, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { cssInterop } from "nativewind";
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useFocusEffect } from 'expo-router';
import apiClient from '@/app/services/apiClient';
import ImagePreviewModal from '@/components/ImagePreviewModal';

cssInterop(Image, { className: "style" });

interface SchoolData {
  _id?: string;
  name: string;
  tagline: string;
  logoUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  stats: {
    studentsEnrolled: string;
    yearsOfExcellence: string;
    dedicatedTeachers: string;
    graduates: string;
  };
  links: Array<{
    label: string;
    url: string;
    description: string;
    icon: string;
  }>;
  mission: string;
  vision: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  galleryImages: Array<{
    _id: string;
    url: string;
    caption: string;
    uploadedAt: Date;
  }>;
}

const SchoolPageAndroid: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);

  // Image preview modal states
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // Fetch school data from API
  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/school');
      
      if (response.data.success) {
        setSchoolData(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching school data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load school information';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSchoolData();
    }, [])
  );

  // Get icon source based on icon name
  const getIconSource = (iconName: string) => {
    const icons: { [key: string]: any } = {
      web: require('@/assets/icons/web.png'),
      facebook: require('@/assets/icons/facebook.png'),
      education: require('@/assets/icons/education.png'),
      email: require('@/assets/icons/email.png'),
      phone: require('@/assets/icons/phone.png'),
      location: require('@/assets/icons/location.png'),
      other: require('@/assets/icons/attach.png'),
    };
    return icons[iconName] || icons.other;
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  // Handle image preview
  const handleImagePreview = (imageUrl: string, caption?: string) => {
    setPreviewImageUrl(imageUrl);
    setPreviewModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            marginTop: 16,
            fontSize: 14,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
          }}>
            Loading school information...
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (!schoolData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Image
            source={require('@/assets/icons/error.png')}
            style={{ width: 100, height: 100, marginBottom: 16 }}
            tintColor={isDarkMode ? '#EF4444' : '#DC2626'}
            contentFit="contain"
          />
          <Text style={{
            fontSize: 18,
            fontFamily: 'Inter-Bold',
            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            marginBottom: 8,
          }}>
            Failed to Load School Information
          </Text>
          <Text style={{
            fontSize: 14,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#B0B3B8' : '#65676B',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            There was an error loading the school information. Please try again.
          </Text>
          <TouchableOpacity
            onPress={fetchSchoolData}
            style={{
              backgroundColor: '#1877F2',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: 'Inter-Bold',
            }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  const schoolStats = [
    { label: 'Students Enrolled', value: schoolData.stats.studentsEnrolled, icon: require('@/assets/icons/students.png') },
    { label: 'Years of Excellence', value: schoolData.stats.yearsOfExcellence, icon: require('@/assets/icons/award.png') },
    { label: 'Dedicated Teachers', value: schoolData.stats.dedicatedTeachers, icon: require('@/assets/icons/teacher.png') },
    { label: 'Graduates', value: schoolData.stats.graduates, icon: require('@/assets/icons/graduation.png') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{
          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
          paddingVertical: 20,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}>
              <Image
                source={schoolData.logoUrl 
                  ? { uri: schoolData.logoUrl }
                  : require('@/assets/images/GCCS-logo.png')
                }
                style={{ width: 75, height: 75 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 4,
              }}>
                {schoolData.name}
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
              }}>
                {schoolData.tagline}
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={{ padding: 16 }}>
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
            marginBottom: 20,
          }}>
            {/* School Image */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (schoolData.heroImageUrl) {
                    handleImagePreview(schoolData.heroImageUrl, `${schoolData.heroTitle} - ${schoolData.heroSubtitle}`);
                  }
                }}
              >
                <Image
                  source={schoolData.heroImageUrl
                    ? { uri: schoolData.heroImageUrl }
                    : require('@/assets/images/school_image.png')
                  }
                  style={{ width: '100%', height: width < 768 ? 250 : 325 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                paddingVertical: 20,
                paddingHorizontal: 20,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontFamily: 'Inter-Bold',
                  color: '#FFFFFF',
                  marginBottom: 4,
                }}>
                  {schoolData.heroTitle}
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: '#FFFFFF',
                  opacity: 0.9,
                }}>
                  {schoolData.heroSubtitle}
                </Text>
              </View>
            </View>

            {/* School Stats */}
            <View style={{ padding: 20 }}>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Our Achievements
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}>
                {schoolStats.map((stat, index) => (
                  <View
                    key={index}
                    style={{
                      width: '48%',
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      alignItems: 'center',
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#1877F2',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                      <Image
                        source={stat.icon}
                        style={{ width: 20, height: 20 }}
                        tintColor="#FFFFFF"
                        contentFit="contain"
                      />
                    </View>
                    <Text style={{
                      fontSize: 20,
                      fontFamily: 'Inter-Bold',
                      color: '#1877F2',
                      marginBottom: 4,
                    }}>
                      {stat.value}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#B0B3B8' : '#65676B',
                      textAlign: 'center',
                    }}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Quick Links Section */}
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1877F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Image
                  source={require('@/assets/icons/attach.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              </View>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Quick Links
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {schoolData.links.map((item, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleLinkPress(item.url)}
                    onPressIn={() => setHoveredIndex(index)}
                    onPressOut={() => setHoveredIndex(null)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isHovered
                        ? isDarkMode ? '#3A3B3C' : '#F0F2F5'
                        : 'transparent',
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isHovered ? '#1877F2' : isDarkMode ? '#4E4F50' : '#E4E6EA',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Image
                        source={getIconSource(item.icon)}
                        style={{ width: 20, height: 20 }}
                        tintColor={isHovered ? '#FFFFFF' : isDarkMode ? '#E4E6EA' : '#1C1E21'}
                        contentFit="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontFamily: 'Inter-SemiBold',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        marginBottom: 2,
                      }}>
                        {item.label}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#B0B3B8' : '#65676B',
                      }}>
                        {item.description}
                      </Text>
                    </View>
                    <Image
                      source={require('@/assets/icons/forward.png')}
                      style={{ width: 16, height: 16 }}
                      tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Mission & Vision Section */}
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1877F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Image
                  source={require('@/assets/icons/target.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              </View>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Mission & Vision
              </Text>
            </View>

            {/* Mission Card */}
            <View style={{
              backgroundColor: isDarkMode ? '#1E3A5F' : '#E3F2FD',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#1877F2',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  source={require('@/assets/icons/flag.png')}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  tintColor={isDarkMode ? '#9BD1FF' : '#1565C0'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#9BD1FF' : '#1565C0',
                }}>
                  Our Mission
                </Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                lineHeight: 20,
              }}>
                {schoolData.mission}
              </Text>
            </View>

            {/* Vision Card */}
            <View style={{
              backgroundColor: isDarkMode ? '#2E7D32' : '#E8F5E8',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#10B981',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  source={require('@/assets/icons/show_password.png')}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  tintColor={isDarkMode ? '#81C784' : '#2E7D32'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#81C784' : '#2E7D32',
                }}>
                  Our Vision
                </Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#81C784' : '#2E7D32',
                lineHeight: 20,
              }}>
                {schoolData.vision}
              </Text>
            </View>
          </View>

          {/* Contact Information */}
          <View style={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1877F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Image
                  source={require('@/assets/icons/contact.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              </View>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Contact Information
              </Text>
            </View>

            <View style={{
              backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              borderRadius: 8,
              padding: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  source={require('@/assets/icons/email.png')}
                  style={{ width: 16, height: 16, marginRight: 8 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  {schoolData.contact.email}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  source={require('@/assets/icons/phone.png')}
                  style={{ width: 16, height: 16, marginRight: 8 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  {schoolData.contact.phone}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('@/assets/icons/location.png')}
                  style={{ width: 16, height: 16, marginRight: 8 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  flex: 1,
                }}>
                  {schoolData.contact.address}
                </Text>
              </View>
            </View>
          </View>

          {/* Photo Gallery Section */}
          {schoolData.galleryImages.length > 0 && (
            <View style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
              marginBottom: 32,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#1877F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Image
                    source={require('@/assets/icons/gallery.png')}
                    style={{ width: 16, height: 16 }}
                    tintColor="#FFFFFF"
                    contentFit="contain"
                  />
                </View>
                <Text style={{
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  Photo Gallery ({schoolData.galleryImages.length})
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                {schoolData.galleryImages.map((image, index) => (
                  <TouchableOpacity
                    key={image._id}
                    activeOpacity={0.9}
                    onPress={() => handleImagePreview(image.url, image.caption)}
                    style={{
                      width: width < 768 ? '48%' : '31%',
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Image
                      source={{ uri: image.url }}
                      style={{ width: '100%', height: 200 }}
                      contentFit="cover"
                      transition={200}
                    />

                    {image.caption && (
                      <View style={{ padding: 8, backgroundColor: isDarkMode ? '#242526' : '#FFFFFF' }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: 'Inter-Regular',
                            color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                          }}
                          numberOfLines={2}
                        >
                          {image.caption}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        imageUrl={previewImageUrl}
        isDarkMode={isDarkMode}
      />

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default SchoolPageAndroid