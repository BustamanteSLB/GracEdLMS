import { View } from 'react-native'
import React from 'react'

interface DividerProps {
  width?: number;
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  dividerStyle?: any;
 }
 
 const Divider: React.FC<DividerProps> = ({
  width = 1,
  orientation = 'horizontal',
  color = '#DFE4EA',
  dividerStyle,
 }) => {
  const dividerStyles = [
    {width: orientation === 'horizontal' ? '100%' : width},
    {height: orientation === 'vertical' ? '100%' : width},
    {backgroundColor: color},
    dividerStyle,
  ];
 
  return <View style={dividerStyles} />;
 };
 
export default Divider;