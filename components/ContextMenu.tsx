
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle, ImageStyle } from 'react-native';

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
  if (!visible) return null;

  return (
    <Pressable style={[styles.overlay, overlayStyle]} onPress={onClose}>
      <View style={[styles.menu, { top: y, left: x }, menuStyle]}>
        {items.map((item, index) => (
          <Pressable
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
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
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
