import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';

const TeacherCourses = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    subject: '',
    gradeLevel: '',
    schedule: '',
  });

  const handleInput = (field: string, value: string) => {
    setCourseData({ ...courseData, [field]: value });
  };

  const handleSubmit = () => {
    console.log('Course Data:', courseData);
    setModalVisible(false);
    setCourseData({ title: '', description: '', subject: '', gradeLevel: '', schedule: '' });
  };

  return (
    <View style={{ padding: 40 }}>
      <Text style={{ color: 'magenta', fontWeight: 'bold', fontSize: 48, marginBottom: 40, textAlign: 'center' }}>
        HELLO FROM app/(teachers)/courses.tsx
      </Text>
      <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 24, marginBottom: 20 }}>
        DEBUG: This is app/(teachers)/courses.tsx (teachers group route)
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: 'orange', padding: 16, borderRadius: 8, marginBottom: 20, alignSelf: 'flex-start' }}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>DEBUG: Add Course</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: 350, backgroundColor: 'white', borderRadius: 12, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Add New Course</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              <Text>Course Title</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10, padding: 8 }}
                value={courseData.title}
                onChangeText={text => handleInput('title', text)}
                placeholder="Enter course title"
              />
              <Text>Description</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10, padding: 8 }}
                value={courseData.description}
                onChangeText={text => handleInput('description', text)}
                placeholder="Enter description"
                multiline
              />
              <Text>Subject</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10, padding: 8 }}
                value={courseData.subject}
                onChangeText={text => handleInput('subject', text)}
                placeholder="Enter subject"
              />
              <Text>Grade Level</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10, padding: 8 }}
                value={courseData.gradeLevel}
                onChangeText={text => handleInput('gradeLevel', text)}
                placeholder="Enter grade level"
              />
              <Text>Schedule</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 10, padding: 8 }}
                value={courseData.schedule}
                onChangeText={text => handleInput('schedule', text)}
                placeholder="Enter schedule"
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#eee', borderRadius: 6 }}
              >
                <Text style={{ color: '#333' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'orange', borderRadius: 6 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TeacherCourses;