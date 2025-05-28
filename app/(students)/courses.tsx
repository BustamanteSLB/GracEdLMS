import { Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import CoursesAndroid from '@/screens/courses.android'
import CoursesIOS from '@/screens/courses.ios'
import apiClient from '../services/apiClient'

type Course = {
  _id: string;
  name: string;
  section: string;
  schoolYear: string;
  adviser: string;
  courseCode: string;
  courseName: string;
  description: string;
};

const TeacherCoursesWeb = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showEdit, setShowEdit] = useState<{visible: boolean, course: Course | null}>({visible: false, course: null});
  const [showAddStudent, setShowAddStudent] = useState<{visible: boolean, course: Course | null}>({visible: false, course: null});
  const [editCourse, setEditCourse] = useState({ courseCode: '', courseName: '', description: '' });
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiClient.get('/courses');
        console.log('API /courses response:', response.data);
        setCourses(response.data.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, []);

  const openEdit = (course: Course) => {
    setEditCourse({
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      description: course.description || '',
    });
    setShowEdit({ visible: true, course });
  };

  const saveEdit = async () => {
    if (!showEdit.course) return;
    try {
      await apiClient.put(`/courses/${showEdit.course._id}`, {
        courseCode: editCourse.courseCode,
        courseName: editCourse.courseName,
        description: editCourse.description,
      });
      setCourses(courses.map(c =>
        c._id === showEdit.course?._id
          ? { ...c, ...editCourse }
          : c
      ));
      setShowEdit({ visible: false, course: null });
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const openAddStudent = (course: Course) => {
    setStudentEmail('');
    setShowAddStudent({ visible: true, course });
  };

  const addStudent = async () => {
    if (!showAddStudent.course) return;
    try {
      await apiClient.post(`/courses/${showAddStudent.course._id}/students`, { email: studentEmail });
      alert(`Student ${studentEmail} added to ${showAddStudent.course.name}`);
      setShowAddStudent({ visible: false, course: null });
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await apiClient.delete(`/courses/${courseId}`);
      setCourses(courses.filter(c => c._id !== courseId));
    } catch (error) {
      alert('Failed to delete course.');
      console.error('Delete error:', error);
    }
  };

  return (
    <div style={{ padding: 32, background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 24 }}>Teacher Courses</h1>
      <button
        style={{ background: '#6D28D9', color: 'white', border: 'none', borderRadius: 6, padding: '12px 32px', fontWeight: 'bold', fontSize: 18, cursor: 'pointer', marginBottom: 24 }}
        onClick={async () => {
          try {
            const res = await apiClient.post('/courses', {
              courseCode: `CODE${courses.length + 1}`,
              courseName: `Sample Course ${courses.length + 1}`,
              description: `Section ${courses.length + 1} - 2024-2025 - Adviser: Mr. Smith`,
            });
            setCourses([...courses, res.data.data]);
          } catch (error) {
            alert('Failed to add course.');
            console.error('Add error:', error);
          }
        }}
      >
        + Add Course
      </button>
      {courses.length === 0 ? (
        <div style={{ marginTop: 24, color: '#888', fontSize: 20 }}>No courses found.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {courses.map(course => (
            <div key={course._id} style={{ border: '1px solid #bbb', borderRadius: 12, padding: 24, width: 320, background: '#fafafa', boxShadow: '0 2px 8px #eee' }}>
              <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{course.courseName || course.name}</div>
              <div style={{ color: '#333', marginBottom: 4 }}>Code: {course.courseCode}</div>
              <div style={{ color: '#666', marginBottom: 4 }}>Section: {course.section}</div>
              <div style={{ color: '#666', marginBottom: 4 }}>School Year: {course.schoolYear}</div>
              <div style={{ color: '#888', marginBottom: 12 }}>Adviser: {course.adviser}</div>
              <div style={{ color: '#888', marginBottom: 12 }}>{course.description}</div>
              <button style={{ background: '#6D28D9', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', marginRight: 8 }} onClick={() => openEdit(course)}>Edit</button>
              <button style={{ background: '#22C55E', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => openAddStudent(course)}>Add Student</button>
              <button
                style={{ marginLeft: 8, background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
                onClick={() => deleteCourse(course._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Edit Modal */}
      {showEdit.visible && showEdit.course && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 32, width: 400 }}>
            <h2>Edit Course</h2>
            <input value={editCourse.courseCode} onChange={e => setEditCourse({ ...editCourse, courseCode: e.target.value })} placeholder="Course Code" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input value={editCourse.courseName} onChange={e => setEditCourse({ ...editCourse, courseName: e.target.value })} placeholder="Course Name" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input value={editCourse.description} onChange={e => setEditCourse({ ...editCourse, description: e.target.value })} placeholder="Description" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowEdit({ visible: false, course: null })} style={{ padding: '8px 20px', borderRadius: 6 }}>Cancel</button>
              <button onClick={saveEdit} style={{ background: '#6D28D9', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 'bold' }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {/* Add Student Modal */}
      {showAddStudent.visible && showAddStudent.course && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 32, width: 400 }}>
            <h2>Add Student</h2>
            <input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="Student Email" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAddStudent({ visible: false, course: null })} style={{ padding: '8px 20px', borderRadius: 6 }}>Cancel</button>
              <button onClick={addStudent} style={{ background: '#22C55E', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 'bold' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Courses = () => {
  if (Platform.OS === 'ios'){
    return <CoursesIOS/>
  }
  if (Platform.OS === 'web'){
    return <TeacherCoursesWeb />;
  }
  else{
    return <CoursesAndroid/>
  }
}

export default Courses