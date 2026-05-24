import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Modal,
  useWindowDimensions,
  I18nManager,
  TouchableOpacity,
} from 'react-native';

interface MenuItem {
  label: string;
  icon?: React.ReactNode | any;
  onPress?: () => void;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
  menuStyle?: ViewStyle;
  overlayStyle?: ViewStyle;
  itemStyle?: ViewStyle;
  iconStyle?: ImageStyle;
  labelStyle?: TextStyle;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  onClose,
  items = [],
  menuStyle,
  overlayStyle,
  itemStyle,
  iconStyle,
  labelStyle,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [menuLayout, setMenuLayout] = useState({ width: 0, height: 0 });

  if (!visible) return null;

  const onMenuLayout = (event: any) => {
    // Measure the menu's layout to calculate its position
    setMenuLayout(event.nativeEvent.layout);
  };

  // --- Position Calculation ---
  let top = y;
  let left = x;
  const isRTL = I18nManager.isRTL;

  if (menuLayout.width > 0) {
    // Horizontal position:
    // In LTR, open to the right, but flip left if it goes off-screen.
    // In RTL, open to the left, but flip right if it goes off-screen.
    if (isRTL) {
      left = x - menuLayout.width; // Default to left
      if (left < 0) {
        left = x; // Flip right
      }
    } else {
      if (x + menuLayout.width > windowWidth) {
        left = x - menuLayout.width; // Flip left
      }
    }

    // Vertical position:
    // Open downwards, but flip upwards if it goes off-screen.
    if (y + menuLayout.height > windowHeight) {
      top = y - menuLayout.height;
    }

    // Final boundary checks to prevent going off-screen
    if (top < 0) top = 5;
    if (left < 0) left = 5;
    if (left + menuLayout.width > windowWidth) left = windowWidth - menuLayout.width - 5;
  }

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <Pressable style={[styles.overlay, overlayStyle]} onPress={onClose}>
        <View
          onLayout={onMenuLayout}
          style={[
            styles.menu,
            {
              top,
              left,
              // Hide the menu until its layout is measured to prevent flickering
              opacity: menuLayout.width === 0 ? 0 : 1,
            },
            menuStyle,
          ]}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                item.onPress?.();
                onClose();
              }}
              style={[styles.menuItemContainer, itemStyle]}
            >
              {React.isValidElement(item.icon) ? (
                item.icon
              ) : item.icon ? (
                <Image
                  source={item.icon}
                  style={[styles.icon, iconStyle]}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={[styles.menuItem, labelStyle]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, // Use flex: 1 for the modal overlay
  },
  menu: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  menuItem: {
    fontSize: 16,
  },
});

export default ContextMenu;
