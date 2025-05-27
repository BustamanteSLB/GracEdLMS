import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import apiClient from '../../app/services/apiClient'; 

type Course = {
  _id: string;
  name: string;
  description?: string;
};

const TeacherCoursesScreen = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch courses from backend
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/courses');
      setCourses(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch courses');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Add a new course
  const addCourse = async () => {
    if (!name) return Alert.alert('Validation', 'Course name is required');
    try {
      await apiClient.post('/courses', { name, description });
      setName('');
      setDescription('');
      fetchCourses();
    } catch (err) {
      Alert.alert('Error', 'Failed to add course');
    }
  };

  // Delete a course
  const deleteCourse = async (id: string) => {
    Alert.alert('Confirm', 'Delete this course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/courses/${id}`);
            fetchCourses();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete course');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Courses</Text>
      <View style={styles.form}>
        <TextInput
          placeholder="Course Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />
        <Button title="Add Course" onPress={addCourse} />
      </View>
      <FlatList
        data={courses}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={fetchCourses}
        renderItem={({ item }) => (
          <View style={styles.courseItem}>
            <View>
              <Text style={styles.courseName}>{item.name}</Text>
              <Text style={styles.courseDesc}>{item.description}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteCourse(item._id)}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No courses found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  form: { marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
  courseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  courseName: { fontSize: 16, fontWeight: 'bold' },
  courseDesc: { color: '#666' },
  deleteBtn: { color: 'red', fontWeight: 'bold' }
});

export default TeacherCoursesScreen;
