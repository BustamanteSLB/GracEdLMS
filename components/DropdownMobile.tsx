import React, { useState } from 'react';
import { Text, TouchableOpacity, View, Modal } from 'react-native';
import { Image } from "expo-image";
import { FlashList } from '@shopify/flash-list';
import { useDarkMode } from '@/contexts/DarkModeContext';

// DropdownItem interface
export interface DropdownMobileItem {
  label: string;
  value: string;
  leftIcon?: React.ComponentType<any>;
  leftIconStyle?: any;
  leftIconSource?: any;
  leftIconTint?: string;
  rightIcon?: React.ComponentType<any>;
  rightIconStyle?: any;
  rightIconSource?: any;
  rightIconTint?: string;
  iconSize?: number;
}

// DropdownMobile props interface
export interface DropdownMobileProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: DropdownMobileItem[];
  placeholder?: string;
  // Button props
  buttonLeftIcon?: React.ComponentType<any>;
  buttonLeftIconStyle?: any;
  buttonLeftIconSource?: any;
  buttonLeftIconTint?: string;
  buttonRightIcon?: React.ComponentType<any>;
  buttonRightIconStyle?: any;
  buttonRightIconSource?: any;
  buttonRightIconTint?: string;
  buttonStyle?: any;
  buttonClassName?: string;
  // Modal props
  modalLeftIcon?: React.ComponentType<any>;
  modalLeftIconStyle?: any;
  modalLeftIconSource?: any;
  modalLeftIconTint?: string;
  modalRightIcon?: React.ComponentType<any>;
  modalRightIconStyle?: any;
  modalRightIconSource?: any;
  modalRightIconTint?: string;
  modalWidth?: string;
  modalMaxHeight?: string;
  headerStyle?: any;
  itemStyle?: any;
  selectedItemStyle?: any;
  enabled?: boolean;
  containerStyle?: any;
  containerClassName?: string;
}

const DropdownMobile: React.FC<DropdownMobileProps> = ({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Select...',
  // Button props
  buttonLeftIcon: ButtonLeftIcon,
  buttonLeftIconStyle,
  buttonLeftIconSource,
  buttonLeftIconTint,
  buttonRightIcon: ButtonRightIcon,
  buttonRightIconStyle,
  buttonRightIconSource,
  buttonRightIconTint,
  buttonStyle,
  buttonClassName,
  // Modal props
  modalLeftIcon: ModalLeftIcon,
  modalLeftIconStyle,
  modalLeftIconSource,
  modalLeftIconTint,
  modalRightIcon: ModalRightIcon,
  modalRightIconStyle,
  modalRightIconSource,
  modalRightIconTint,
  modalWidth = '85%',
  modalMaxHeight = '70%',
  headerStyle,
  itemStyle,
  selectedItemStyle,
  enabled = true,
  containerStyle,
  containerClassName,
}) => {
  const { isDarkMode } = useDarkMode();
  const [isVisible, setIsVisible] = useState(false);

  const selectedItem = items.find(item => item.value === selectedValue);

  // Helper function to render icon (SVG or Image)
  const renderIcon = (
    IconComponent: React.ComponentType<any> | undefined,
    iconSource: any,
    iconTint: string | undefined,
    iconStyle: any,
    size: number = 20
  ) => {
    if (IconComponent && !iconSource) {
      // Render as SVG component
      return (
        <IconComponent 
          width={size} 
          height={size} 
          fill={iconTint || (isDarkMode ? '#E0E0E0' : '#6B7280')}
          style={iconStyle}
        />
      );
    } else if (iconSource) {
      // Render as Image component
      return (
        <Image
          source={iconSource}
          style={[
            { 
              width: size, 
              height: size 
            },
            iconStyle
          ]}
          tintColor={iconTint || (isDarkMode ? '#E0E0E0' : '#6B7280')}
          contentFit="contain"
        />
      );
    }
    return null;
  };

  const renderPickerItem = ({ item }: { item: DropdownMobileItem }) => {
    const isSelected = selectedValue === item.value;
    
    return (
      <TouchableOpacity
        style={[
          {
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#3A3B3C' : '#F3F4F6',
            backgroundColor: isSelected
              ? (isDarkMode ? '#4E4F50' : '#EBF8FF')
              : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          itemStyle,
          isSelected && selectedItemStyle,
        ]}
        onPress={() => {
          onValueChange(item.value);
          setIsVisible(false);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(item.leftIcon || item.leftIconSource) && (
            <View style={{ marginRight: 12 }}>
              {renderIcon(
                item.leftIcon,
                item.leftIconSource,
                item.leftIconTint || (isDarkMode ? '#E0E0E0' : '#000'),
                item.leftIconStyle,
                item.iconSize || 18
              )}
            </View>
          )}
          
          <Text
            style={{
              fontSize: 14,
              fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Regular',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              flex: 1,
            }}
          >
            {item.label}
          </Text>
        </View>

        {(item.rightIcon || item.rightIconSource) && (
          <View style={{ marginLeft: 12 }}>
            {renderIcon(
              item.rightIcon,
              item.rightIconSource,
              item.rightIconTint,
              item.rightIconStyle,
              item.iconSize || 18
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={containerStyle} className={containerClassName}>
      {/* Dropdown Button */}
      <TouchableOpacity
        style={[
          {
            backgroundColor: isDarkMode ? '#3A3B3C' : '#F3F4F6',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#D1D5DB',
            paddingHorizontal: 12,
            paddingVertical: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 50,
            opacity: enabled ? 1 : 0.6,
          },
          buttonStyle
        ]}
        className={buttonClassName}
        onPress={() => enabled && setIsVisible(true)}
        disabled={!enabled}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(ButtonLeftIcon || buttonLeftIconSource) && (
            <View style={{ marginRight: 8 }}>
              {renderIcon(
                ButtonLeftIcon,
                buttonLeftIconSource,
                buttonLeftIconTint || (isDarkMode ? '#E0E0E0' : '#000'),
                buttonLeftIconStyle,
                18
              )}
            </View>
          )}
          
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              color: selectedItem 
                ? (isDarkMode ? '#E0E0E0' : '#000')
                : (isDarkMode ? '#9CA3AF' : '#6B7280'),
              fontSize: 14,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {selectedItem?.label || placeholder}
          </Text>
        </View>

        {(ButtonRightIcon || buttonRightIconSource) ? (
          <View style={{ marginLeft: 8 }}>
            {renderIcon(
              ButtonRightIcon,
              buttonRightIconSource,
              buttonRightIconTint || (isDarkMode ? '#E0E0E0' : '#000'),
              buttonRightIconStyle,
              20
            )}
          </View>
        ) : (
          <Image
            source={require('@/assets/icons/down.png')}
            style={{ 
              width: 20, 
              height: 20,
              transform: [{ rotate: isVisible ? '180deg' : '0deg' }]
            }}
            tintColor={isDarkMode ? '#E0E0E0' : '#000'}
          />
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 12,
              width: modalWidth as any,
              maxHeight: modalMaxHeight as any,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              overflow: 'hidden',
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View
              style={[
                {
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#3A3B3C' : '#E5E7EB',
                  flexDirection: 'row',
                  alignItems: 'center',
                },
                headerStyle,
              ]}
            >
              {(ModalLeftIcon || modalLeftIconSource) && (
                <View style={{ marginRight: 12 }}>
                  {renderIcon(ModalLeftIcon, modalLeftIconSource, modalLeftIconTint || (isDarkMode ? '#E0E0E0' : '#000'), modalLeftIconStyle, 24)}
                </View>
              )}
              
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  flex: 1,
                }}
              >
                Select {label || 'Option'}
              </Text>

              {(ModalRightIcon || modalRightIconSource) && (
                <View style={{ marginLeft: 12 }}>
                  {renderIcon(ModalRightIcon, modalRightIconSource, modalRightIconTint || (isDarkMode ? '#E0E0E0' : '#000'), modalRightIconStyle, 24)}
                </View>
              )}
            </View>

            {/* Items List with FlashList */}
            <View style={{ height: 300 }}>
              <FlashList
                data={items}
                renderItem={renderPickerItem}
                keyExtractor={(item) => item.value}
                drawDistance={200}
                optimizeItemArrangement={true}
                showsVerticalScrollIndicator={true}
              />
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? '#3A3B3C' : '#E5E7EB',
                alignItems: 'center',
              }}
              onPress={() => setIsVisible(false)}
            >
              <Text style={{
                fontSize: 16,
                fontFamily: 'Inter-SemiBold',
                color: '#EF4444',
              }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default DropdownMobile;