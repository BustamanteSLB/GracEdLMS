import { Image, View, Text, TouchableOpacity } from 'react-native'
import React from 'react'

interface CustomButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  iconVector?: React.ReactNode;
  iconImage?: any;
  iconStyles?: string;
  tintColor?: string;
}
  
const CustomButton: React.FC<CustomButtonProps> = ({ title, handlePress, containerStyles, textStyles, isLoading, iconVector, iconImage, iconStyles, tintColor }) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`bg-orange-500 rounded-xl h-[50px] justify-center items-center ${containerStyles}`}
      disabled={isLoading}
    >
      <View className="flex-row">
        {iconVector && <View style={{ marginRight: 8 }}>{iconVector}</View>}
        {iconImage && <Image source={iconImage} style={{ tintColor }} className={`h-[24px] mr-[8px] w-[24px] ${iconStyles}`}/>}
        <Text className={`text-black font-psemibold text-lg ${textStyles}`}>{title}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default CustomButton