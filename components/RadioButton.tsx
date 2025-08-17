import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';

interface RadioButtonProps {
  activeColor?: string;
  disabled?: boolean;
  height?: number;
  inactiveColor?: string;
  label?: string;
  labelStyle?: TextStyle;
  onChange?: (value: any) => void;
  onValueChange?: (value: any) => void;
  style?: ViewStyle;
  value: any;
  width?: number;
  selected?: boolean;
  onPress?: (value: any) => void;
  deselectable?: boolean;
  className?: string;
  labelClassName?: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  activeColor = 'black',
  disabled = false,
  height = 24,
  inactiveColor = '#D3D3D3',
  label,
  labelStyle,
  onChange,
  onValueChange,
  style,
  value,
  width = 24,
  selected = false,
  onPress,
  deselectable = false,
  className = '',
  labelClassName = '',
}) => {
  const handlePress = () => {
    if (disabled) return;
    if (onPress) onPress(value);
    if (onChange) onChange(value);
    if (onValueChange) onValueChange(value);
  };

  return (
    <TouchableOpacity
      style={[styles.radioButtonContainer, style]}
      className={`flex-row items-center my-1 ${className}`}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.radioButtonOuter,
          {
            width,
            height,
            borderColor: selected ? activeColor : inactiveColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        className="rounded-full border-2 justify-center items-center"
      >
        {selected && (
          <View
            style={[
              styles.radioButtonInner,
              {
                width: width * 0.6,
                height: height * 0.6,
                backgroundColor: activeColor,
              },
            ]}
            className="rounded-full"
          />
        )}
      </View>
      {label && (
        <Text 
          style={[styles.radioButtonLabel, labelStyle, disabled && styles.disabledLabel]}
          className={`ml-2 text-base ${labelClassName}`}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface RadioButtonGroupProps {
  activeColor?: string;
  children: React.ReactElement<RadioButtonProps>[];
  disabled?: boolean;
  height?: number;
  inactiveColor?: string;
  label?: string;
  labelStyle?: TextStyle;
  multipleSelect?: boolean;
  onChange?: (value: any | any[]) => void;
  onValueChange?: (value: any | any[]) => void;
  style?: ViewStyle;
  value?: any | any[];
  width?: number;
  deselectable?: boolean;
  className?: string;
  labelClassName?: string;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  activeColor,
  children,
  disabled = false,
  height = 24,
  inactiveColor,
  label,
  labelStyle,
  multipleSelect = false,
  onChange,
  onValueChange,
  style,
  value: propValue,
  width = 24,
  deselectable = false,
  className = '',
  labelClassName = '',
}) => {
  const [internalValue, setInternalValue] = React.useState<any | any[]>(multipleSelect ? [] : null);

  React.useEffect(() => {
    if (propValue !== undefined) {
      setInternalValue(propValue);
    }
  }, [propValue]);

  const handleRadioButtonPress = (buttonValue: any) => {
    let newValue: any | any[];

    if (multipleSelect) {
      const currentValue = Array.isArray(internalValue) ? internalValue : [];
      newValue = currentValue.includes(buttonValue)
        ? currentValue.filter((v) => v !== buttonValue)
        : [...currentValue, buttonValue];
    } else {
      newValue = (deselectable && internalValue === buttonValue) ? null : buttonValue;
    }

    setInternalValue(newValue);
    if (onChange) onChange(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  const isSelected = (buttonValue: any) => {
    if (multipleSelect) {
      return Array.isArray(internalValue) ? internalValue.includes(buttonValue) : false;
    }
    return internalValue === buttonValue;
  };

  return (
    <View 
      style={[styles.radioGroupContainer, style]}
      className={`my-2 ${className}`}
    >
      {label && (
        <Text 
          style={[styles.groupLabel, labelStyle]}
          className={`text-base font-bold mb-3 text-gray-800 ${labelClassName}`}
        >
          {label}
        </Text>
      )}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            activeColor,
            disabled: disabled || child.props.disabled,
            height: child.props.height || height,
            inactiveColor: child.props.inactiveColor || inactiveColor,
            selected: isSelected(child.props.value),
            onPress: handleRadioButtonPress,
            width: child.props.width || width,
            deselectable: child.props.deselectable !== undefined ? child.props.deselectable : deselectable,
            className: child.props.className || '',
            labelClassName: child.props.labelClassName || '',
          } as Partial<RadioButtonProps>);
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioButtonOuter: {
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    borderRadius: 10,
  },
  radioButtonLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  disabledLabel: {
    color: '#A9A9A9',
  },
  radioGroupContainer: {
    marginVertical: 8,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
});