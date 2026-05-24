import { Linking, ScrollView, View, Text, useColorScheme, TouchableOpacity, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { cssInterop } from "nativewind";
import { useDarkMode } from '@/contexts/DarkModeContext';

cssInterop(Image, { className: "style" });

const SchoolPageIOS: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const links = [
    { 
      label: 'GCCS Website', 
      url: 'https://vimeo.com/gccsphilippines',
      icon: require('@/assets/icons/web.png'),
      description: 'Visit our official website'
    },
    { 
      label: 'GCCS Facebook Page', 
      url: 'https://www.facebook.com/GCCSPhilippines/',
      icon: require('@/assets/icons/facebook.png'),
      description: 'Follow us on Facebook'
    },
    { 
      label: 'GCCS Learn', 
      url: 'https://schoollearn.com',
      icon: require('@/assets/icons/education.png'),
      description: 'Access learning resources'
    },
    { 
      label: 'GCCS Mail', 
      url: 'mailto:gccspasay@yahoo.com',
      icon: require('@/assets/icons/email.png'),
      description: 'Contact us via email'
    },
  ];

  const schoolStats = [
    { label: 'Students Enrolled', value: '200+', icon: require('@/assets/icons/students.png') },
    { label: 'Years of Excellence', value: '30+', icon: require('@/assets/icons/award.png') },
    { label: 'Dedicated Teachers', value: '10+', icon: require('@/assets/icons/teacher.png') },
    { label: 'Graduates', value: '2000+', icon: require('@/assets/icons/graduation.png') },
  ];

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' }}>
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
                source={require('@/assets/images/GCCS-logo.png')}
                style={{ width: 75, height: 75 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontFamily: 'Inter-24pt-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 4,
              }}>
                Grace Community Christian School
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#B0B3B8' : '#65676B',
              }}>
                Excellence in Christian Education Since 1994
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
              <Image
                source={require('@/assets/images/school_image.png')}
                style={{ width: '100%', height: width <768 ? 250 : 325 }}
                contentFit="cover"
              />
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
                  fontFamily: 'Inter-24pt-Bold',
                  color: '#FFFFFF',
                  marginBottom: 4,
                }}>
                  Welcome to Our Campus
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-18pt-Regular',
                  color: '#FFFFFF',
                  opacity: 0.9,
                }}>
                  Where faith meets learning in a nurturing environment
                </Text>
              </View>
            </View>

            {/* School Stats */}
            <View style={{ padding: 20 }}>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-24pt-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Our Achievement
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
                      fontFamily: 'Inter-24pt-Bold',
                      color: '#1877F2',
                      marginBottom: 4,
                    }}>
                      {stat.value}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      fontFamily: 'Inter-18pt-Regular',
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
                fontFamily: 'Inter-24pt-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              }}>
                Quick Links
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {links.map((item, index) => {
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
                        source={item.icon}
                        style={{ width: 20, height: 20 }}
                        tintColor={isHovered ? '#FFFFFF' : isDarkMode ? '#E4E6EA' : '#1C1E21'}
                        contentFit="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontFamily: 'Inter-24pt-SemiBold',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        marginBottom: 2,
                      }}>
                        {item.label}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        fontFamily: 'Inter-18pt-Regular',
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
                fontFamily: 'Inter-24pt-Bold',
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
                  source={require('@/assets/icons/star.png')}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  tintColor={isDarkMode ? '#9BD1FF' : '#1565C0'}
                  contentFit="contain"
                />
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Inter-24pt-Bold',
                  color: isDarkMode ? '#9BD1FF' : '#1565C0',
                }}>
                  Our Mission
                </Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#9BD1FF' : '#1565C0',
                lineHeight: 20,
              }}>
                To provide a quality education rooted in Christian values, fostering spiritual growth and intellectual excellence in every student we serve.
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
                  fontFamily: 'Inter-24pt-Bold',
                  color: isDarkMode ? '#81C784' : '#2E7D32',
                }}>
                  Our Vision
                </Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#81C784' : '#2E7D32',
                lineHeight: 20,
              }}>
                Grace Christian Schools endeavors to help children develop and mature in a positive, Christ-centered environment that integrates faith and learning by emphasizing Biblical training and academic excellence.
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
                  source={require('@/assets/icons/contact.png')}
                  style={{ width: 16, height: 16 }}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                />
              </View>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Inter-24pt-Bold',
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
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  gccspasay@yahoo.com
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
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}>
                  +639288516764
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
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  flex: 1,
                }}>
                  Pasay City, Metro Manila, Philippines
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  )
}

export default SchoolPageIOS