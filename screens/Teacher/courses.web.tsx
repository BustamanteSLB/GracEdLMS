import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Modal } from 'react-native';
import apiClient from '../../app/services/apiClient';

console.log('LOADED: screens/Teacher/courses.web.tsx');

type Course = {
  _id: string;
  name: string;
  section?: string;
  schoolYear?: string;
  status?: string;
  adviser?: string;
};

const CoursesWeb: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    section: '',
    schoolYear: '',
    adviser: '',
  });
  const [adding, setAdding] = useState(false);
  const [editModal, setEditModal] = useState<{visible: boolean, course: Course | null}>({visible: false, course: null});
  const [editCourse, setEditCourse] = useState({ name: '', section: '', schoolYear: '', adviser: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [addStudentModal, setAddStudentModal] = useState<{visible: boolean, courseId: string | null}>({visible: false, courseId: null});
  const [studentEmail, setStudentEmail] = useState('');
  const [addStudentLoading, setAddStudentLoading] = useState(false);

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      setCourses(res.data);
      setFilteredCourses(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch courses');
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Search filter
  useEffect(() => {
    if (!search) setFilteredCourses(courses);
    else {
      setFilteredCourses(
        courses.filter(course =>
          course.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, courses]);

  // Remove course
  const removeCourse = async (id: string) => {
    Alert.alert('Confirm', 'Remove this course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/courses/${id}`);
            fetchCourses();
          } catch (err) {
            Alert.alert('Error', 'Failed to remove course');
          }
        }
      }
    ]);
  };

  // Add course
  const handleAddCourse = async () => {
    if (!newCourse.name) {
      Alert.alert('Validation', 'Course name is required');
      return;
    }
    setAdding(true);
    try {
      await apiClient.post('/courses', {
        name: newCourse.name,
        section: newCourse.section,
        schoolYear: newCourse.schoolYear,
        adviser: newCourse.adviser,
      });
      setShowModal(false);
      setNewCourse({ name: '', section: '', schoolYear: '', adviser: '' });
      fetchCourses();
    } catch (err) {
      Alert.alert('Error', 'Failed to add course');
    }
    setAdding(false);
  };

  // Edit course logic
  const openEditModal = (course: Course) => {
    setEditCourse({
      name: course.name || '',
      section: course.section || '',
      schoolYear: course.schoolYear || '',
      adviser: course.adviser || '',
    });
    setEditModal({ visible: true, course });
  };

  const handleEditCourse = async () => {
    if (!editModal.course) return;
    setEditLoading(true);
    try {
      await apiClient.put(`/courses/${editModal.course._id}`, {
        name: editCourse.name,
        section: editCourse.section,
        schoolYear: editCourse.schoolYear,
        adviser: editCourse.adviser,
      });
      setEditModal({ visible: false, course: null });
      fetchCourses();
    } catch (err) {
      Alert.alert('Error', 'Failed to update course');
    }
    setEditLoading(false);
  };

  // Add student logic
  const openAddStudentModal = (courseId: string) => {
    setStudentEmail('');
    setAddStudentModal({ visible: true, courseId });
  };

  const handleAddStudent = async () => {
    if (!addStudentModal.courseId || !studentEmail) return;
    setAddStudentLoading(true);
    try {
      await apiClient.put(`/courses/${addStudentModal.courseId}/enroll-student`, { email: studentEmail });
      setAddStudentModal({ visible: false, courseId: null });
      fetchCourses();
    } catch (err) {
      Alert.alert('Error', 'Failed to add student');
    }
    setAddStudentLoading(false);
  };

  // Render a course card
  const renderCourse = ({ item }: { item: Course }) => (
    <View style={styles.card} key={item._id}>
      <Text style={styles.cardHeader}>
        {item.section || 'GRADE AND SECTION'} • {item.schoolYear || 'SCHOOL YEAR'}
      </Text>
      <Text style={styles.subject}>{item.name || 'SUBJECT NAME'}</Text>
      <Text style={styles.status}>Open</Text>
      <Text style={styles.adviser}>Adviser {item.adviser || 'Name'}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.infoBtn}><Text>More info ▼</Text></TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}><Text>EDIT</Text></TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn} onPress={() => removeCourse(item._id)}><Text>REMOVE</Text></TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => openAddStudentModal(item._id)}><Text>Add Student</Text></TouchableOpacity>
        <TouchableOpacity style={styles.starBtn}><Text>☆</Text></TouchableOpacity>
      </View>
    </View>
  );

  console.log('Rendering CoursesWeb, courses:', courses);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.addBtnLarge} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>ADD COURSE</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.search}
          placeholder="Search courses..."
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {filteredCourses.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, width: '100%' }}>
            No courses found. Click ADD to create a new course.
          </Text>
        ) : (
          filteredCourses.map(course => renderCourse({ item: course }))
        )}
      </ScrollView>
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add Course</Text>
            <TextInput
              placeholder="Course Name"
              value={newCourse.name}
              onChangeText={text => setNewCourse({ ...newCourse, name: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Section"
              value={newCourse.section}
              onChangeText={text => setNewCourse({ ...newCourse, section: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="School Year"
              value={newCourse.schoolYear}
              onChangeText={text => setNewCourse({ ...newCourse, schoolYear: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Adviser"
              value={newCourse.adviser}
              onChangeText={text => setNewCourse({ ...newCourse, adviser: text })}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.editBtn, { marginRight: 8 }]}> 
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCourse} style={styles.addBtn} disabled={adding}>
                <Text>{adding ? 'Adding...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Course Modal */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal({ visible: false, course: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Course</Text>
            <TextInput
              placeholder="Course Name"
              value={editCourse.name}
              onChangeText={text => setEditCourse({ ...editCourse, name: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Section"
              value={editCourse.section}
              onChangeText={text => setEditCourse({ ...editCourse, section: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="School Year"
              value={editCourse.schoolYear}
              onChangeText={text => setEditCourse({ ...editCourse, schoolYear: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Adviser"
              value={editCourse.adviser}
              onChangeText={text => setEditCourse({ ...editCourse, adviser: text })}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setEditModal({ visible: false, course: null })} style={[styles.editBtn, { marginRight: 8 }]}> 
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditCourse} style={styles.addBtn} disabled={editLoading}>
                <Text>{editLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Add Student Modal */}
      <Modal
        visible={addStudentModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddStudentModal({ visible: false, courseId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add Student to Course</Text>
            <TextInput
              placeholder="Student Email"
              value={studentEmail}
              onChangeText={setStudentEmail}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setAddStudentModal({ visible: false, courseId: null })} style={[styles.editBtn, { marginRight: 8 }]}> 
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddStudent} style={styles.addBtn} disabled={addStudentLoading}>
                <Text>{addStudentLoading ? 'Adding...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addBtn: { backgroundColor: '#eee', padding: 8, borderRadius: 4, marginRight: 12 },
  addBtnLarge: { backgroundColor: '#6D28D9', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  search: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginRight: 8 },
  searchIcon: { fontSize: 20, marginRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: 260, minHeight: 120, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#bbb',
    borderRadius: 8, padding: 12, margin: 8, justifyContent: 'space-between'
  },
  cardHeader: { fontWeight: 'bold', fontSize: 13, color: '#1a237e', marginBottom: 4 },
  subject: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  status: { fontSize: 12, color: '#388e3c', marginBottom: 2 },
  adviser: { fontSize: 12, color: '#333', marginBottom: 8 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBtn: { padding: 4 },
  editBtn: { backgroundColor: '#eee', padding: 4, borderRadius: 4 },
  removeBtn: { backgroundColor: '#ffcdd2', padding: 4, borderRadius: 4 },
  starBtn: { marginLeft: 'auto', padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, padding: 24, width: 350, elevation: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
});

export default CoursesWeb; 