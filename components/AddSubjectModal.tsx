import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';

interface AddSubjectModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAdd: (subject: any) => void;
}

const grades = ['Select Grade Level', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isVisible, onClose, onAdd }) => {
  const { isDarkMode } = useDarkMode();
  const [subjectName, setSubjectName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(grades[0]);
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState(''); // Changed to work with Picker
  const [description, setDescription] = useState('');

  // Generate school year options
  const generateSchoolYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const schoolYears = [];
    
    // Add previous school year
    const previousYear = currentYear - 1;
    schoolYears.push(`${previousYear} - ${currentYear}`);
    
    // Add current school year and next 3 years
    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      schoolYears.push(`${startYear} - ${endYear}`);
    }
    
    return schoolYears;
  };

  const schoolYearOptions = generateSchoolYearOptions();

  const handleSubmit = () => {
    if (!subjectName.trim() || gradeLevel === grades[0] || !section.trim() || !schoolYear.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Subject Name, Grade Level, Section, School Year)');
      return;
    }

    const newSubject = {
      subjectName: subjectName.trim(),
      gradeLevel: gradeLevel.trim(),
      section: section.trim(),
      schoolYear: schoolYear.trim(),
      description: description.trim(),
    };

    onAdd(newSubject);
    setSubjectName('');
    setGradeLevel(grades[0]);
    setSection('');
    setSchoolYear('');
    setDescription('');
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className={`w-[90%] p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <Text className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Add Subject
          </Text>

          <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Subject Name:</Text>
          <TextInput
            className={`w-full p-3 mb-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
            placeholder="Enter subject name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={subjectName}
            onChangeText={setSubjectName}
          />

          <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Grade Level (e.g., Grade 10):</Text>
          <View className={`w-full mb-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}>
            <Picker
              selectedValue={gradeLevel}
              onValueChange={(itemValue: string) => setGradeLevel(itemValue)}
              style={{ color: isDarkMode ? 'white' : 'black' }}
              dropdownIconColor={isDarkMode ? 'white' : 'black'}
            >
              {grades.map((grade) => (
                <Picker.Item key={grade} label={grade} value={grade} />
              ))}
            </Picker>
          </View>

          <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Section (e.g., Section A):</Text>
          <TextInput
            className={`w-full p-3 mb-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
            placeholder="Enter section"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={section}
            onChangeText={setSection}
          />

          <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>School Year:</Text>
          <View className={`w-full mb-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}>
            <Picker
              selectedValue={schoolYear}
              onValueChange={(itemValue: string) => setSchoolYear(itemValue)}
              style={{ color: isDarkMode ? 'white' : 'black' }}
              dropdownIconColor={isDarkMode ? 'white' : 'black'}
            >
              <Picker.Item label="Select School Year" value="" />
              {schoolYearOptions.map((year) => (
                <Picker.Item key={year} label={year} value={year} />
              ))}
            </Picker>
          </View>

          <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Description (Optional):</Text>
          <TextInput
            className={`w-full p-3 mb-6 rounded-lg border ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
            placeholder="Enter description"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={handleSubmit}
              className="px-4 py-2 bg-blue-500 rounded-lg"
            >
              <Text className="text-white">Add Subject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddSubjectModal;