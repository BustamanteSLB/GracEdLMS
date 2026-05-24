import React, { useState, useRef } from 'react';
import { Text, TouchableOpacity, View, Modal } from 'react-native';
import { Image } from "expo-image";
import { FlashList } from '@shopify/flash-list';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DownIcon from '@/assets/icons/down.svg';

// DropdownItem interface
export interface DropdownItem {
  label: string;
  value: string;
  leftIcon?: React.ComponentType<any> | React.ComponentType<{ source: any; style?: any; tintColor?: string }>;
  leftIconStyle?: any;
  rightIcon?: React.ComponentType<any> | React.ComponentType<{ source: any; style?: any; tintColor?: string }>;
  rightIconStyle?: any;
  iconSize?: number;
  leftIconSource?: any; // For Image components
  rightIconSource?: any; // For Image components
  leftIconTint?: string;
  rightIconTint?: string;
}

// Dropdown props interface
export interface DropdownProps {
  onValueChange: (value: string) => void;
  selectedValue: string;
  enabled?: boolean;
  leftIcon?: React.ComponentType<any> | React.ComponentType<{ source: any; style?: any; tintColor?: string }>;
  leftIconStyle?: any;
  leftIconSource?: any; // For Image components
  leftIconTint?: string;
  rightIcon?: React.ComponentType<any> | React.ComponentType<{ source: any; style?: any; tintColor?: string }>;
  rightIconStyle?: any;
  rightIconSource?: any; // For Image components
  rightIconTint?: string;
  dropdownIconColor?: string;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  numberOfLines?: number;
  style?: any;
  className?: string;
  data: DropdownItem[];
  placeholder?: string;
  maxHeight?: number;
  containerStyle?: any;
  dropdownStyle?: any;
  itemStyle?: any;
  selectedItemStyle?: any;
  textStyle?: any;
  placeholderTextColor?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  onValueChange,
  selectedValue,
  enabled = true,
  leftIcon: LeftIcon,
  leftIconStyle,
  leftIconSource,
  leftIconTint,
  rightIcon: RightIcon,
  rightIconStyle,
  rightIconSource,
  rightIconTint,
  dropdownIconColor,
  ellipsizeMode = 'tail',
  numberOfLines = 1,
  style,
  className,
  data,
  placeholder = 'Select...',
  maxHeight = 200,
  containerStyle,
  dropdownStyle,
  itemStyle,
  selectedItemStyle,
  textStyle,
  placeholderTextColor
}) => {
  const { isDarkMode } = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<TouchableOpacity>(null);

  const selectedItem = data.find(item => item.value === selectedValue);

  const handlePress = () => {
    if (!enabled) return;
    
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setDropdownPosition({
        top: pageY + height + 4,
        left: pageX,
        width: width
      });
      setIsOpen(true);
    });
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsOpen(false);
  };

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
          fill={iconTint || (isDarkMode ? '#E0E0E0' : 'black')}
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
          tintColor={iconTint || (isDarkMode ? '#E0E0E0' : 'black')}
          contentFit="contain"
        />
      );
    }
    return null;
  };

  const renderDropdownItem = ({ item }: { item: DropdownItem }) => {
    const isSelected = item.value === selectedValue;
    
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item.value)}
        style={[
          {
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#3A3B3C' : '#F3F4F6',
            backgroundColor: isSelected 
              ? (isDarkMode ? '#4E4F50' : '#EBF8FF') 
              : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          },
          itemStyle,
          isSelected && selectedItemStyle
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(item.leftIcon || item.leftIconSource) && (
            <View style={{ marginRight: 8 }}>
              {renderIcon(
                item.leftIcon,
                item.leftIconSource,
                item.leftIconTint,
                item.leftIconStyle,
                item.iconSize || 16
              )}
            </View>
          )}
          
          <Text style={[
            {
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
              flex: 1
            },
            textStyle
          ]}>
            {item.label}
          </Text>
        </View>

        {(item.rightIcon || item.rightIconSource) && (
          <View style={{ marginLeft: 8 }}>
            {renderIcon(
              item.rightIcon,
              item.rightIconSource,
              item.rightIconTint,
              item.rightIconStyle,
              item.iconSize || 16
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={containerStyle}>
      <TouchableOpacity
        ref={buttonRef}
        onPress={handlePress}
        disabled={!enabled}
        style={[
          {
            backgroundColor: isDarkMode ? '#3A3B3C' : '#F3F4F6',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#D1D5DB',
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 45,
            opacity: enabled ? 1 : 0.6
          },
          style
        ]}
        className={className}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(LeftIcon || leftIconSource) && (
            <View style={{ marginRight: 8 }}>
              {renderIcon(LeftIcon, leftIconSource, leftIconTint, leftIconStyle, 20)}
            </View>
          )}
          
          <Text
            style={[
              {
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: selectedItem 
                  ? (isDarkMode ? '#E0E0E0' : '#000')
                  : (placeholderTextColor || (isDarkMode ? '#9CA3AF' : '#6B7280')),
                flex: 1
              },
              textStyle
            ]}
            ellipsizeMode={ellipsizeMode}
            numberOfLines={numberOfLines}
          >
            {selectedItem?.label || placeholder}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(RightIcon || rightIconSource) && (
            <View style={{ marginRight: 8 }}>
              {renderIcon(RightIcon, rightIconSource, rightIconTint, rightIconStyle, 20)}
            </View>
          )}

          <DownIcon width={20} height={20} fill={dropdownIconColor || (isDarkMode ? '#E0E0E0' : 'black')} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
        </View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              {
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: maxHeight,
                backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#3A3B3C' : '#D1D5DB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 1000
              },
              dropdownStyle
            ]}
          >
            <FlashList
              data={data}
              renderItem={renderDropdownItem}
              keyExtractor={(item) => item.value}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Dropdown;