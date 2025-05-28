import React, { useState } from 'react'
import { Text, View, ScrollView, useColorScheme, TextInput, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgXml } from 'react-native-svg'
import { useDarkMode } from '@/contexts/DarkModeContext'

const AddStudentWeb = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [password, setPassword] = useState('');

  const handleAddStudent = () => {
    console.log('Adding student:', {
      studentId,
      studentName,
      birthdate,
      password,
    });
  };

  const headerSvg = `
    <svg width="44" height="43" viewBox="0 0 44 43" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="44" height="43" fill="white"/>
    </svg>
  `;

  const AddStudentFormField = ({
    label,
    value,
    onChangeText,
    secureTextEntry = false,
    editable = true,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    editable?: boolean;
  }) => (
    <View className="mb-4">
      <View className="mb-1">
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
      </View>
      <View className="border border-gray-300 rounded-md">
        <TextInput
          className="p-3 text-base text-gray-800"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={editable}
          placeholder="Value"
          accessibilityLabel={label}
        />
      </View>
    </View>
  );

  const AddStudentButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity
      className="bg-[#005792] py-3 rounded-md mt-4"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add student"
    >
      <Text className="text-white text-center font-bold">ADD</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <View className="w-full h-[76px] bg-[#005792] flex-row items-center px-2">
        <View className="ml-2 mr-2">
          <SvgXml xml={headerSvg} width={44} height={43} />
        </View>
        <Text className="text-white text-[28px] font-normal font-['Roboto']">
          MANAGE STUDENT
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            ADD STUDENT
          </Text>
        </View>

        <View className="space-y-4">
          <AddStudentFormField
            label="STUDENT ID (YEAR - 1001) AUTO-INCREMENT"
            value={studentId}
            onChangeText={setStudentId}
            editable={false}
          />

          <AddStudentFormField
            label="STUDENT NAME (LN, FN, MI)"
            value={studentName}
            onChangeText={setStudentName}
          />

          <AddStudentFormField
            label="BIRTHDATE"
            value={birthdate}
            onChangeText={setBirthdate}
          />

          <AddStudentFormField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <AddStudentButton onPress={handleAddStudent} />
        </View>
      </ScrollView>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? '#121212' : 'white'} />
    </SafeAreaView>
  )
}

export default AddStudentWeb
