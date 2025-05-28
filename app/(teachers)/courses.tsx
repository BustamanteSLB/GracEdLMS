import React, { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';
import apiClient from '../services/apiClient';
import './courses.css';

type Course = {
  _id: string;
  name: string;
  section?: string;
  schoolYear?: string;
  status?: string;
  adviser?: string;
};

const TeacherCoursesScreen = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  // For demo, show a sample course always
  const sampleCourse = {
    _id: 'CODE1',
    name: 'Sample Course 1',
    section: 'Section 1',
    schoolYear: '2024-2025',
    adviser: 'Mr. Smith',
  };

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      setCourses(res.data);
      setFilteredCourses(res.data);
    } catch (err) {
      alert('Failed to fetch courses');
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
    if (!window.confirm('Remove this course?')) return;
    try {
      await apiClient.delete(`/courses/${id}`);
      fetchCourses();
    } catch (err) {
      alert('Failed to remove course');
    }
  };

  return (
    <div className="courses-page">
      <div className="courses-header">Teacher Courses</div>
      <div className="courses-topbar">
        <button className="add-course-btn">+ Add Course</button>
        <input
          className="courses-search"
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="courses-list">
        <CourseCard
          title={sampleCourse.name}
          code={sampleCourse._id}
          section={sampleCourse.section}
          schoolYear={sampleCourse.schoolYear}
          adviser={sampleCourse.adviser}
          details={`Section 1 - 2024-2025 - Adviser: Mr. Smith`}
          onEdit={() => {}}
          onAddStudent={() => {}}
          onDelete={() => {}}
        />
        {filteredCourses.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <div className="empty-title">No courses found.</div>
            <div className="empty-desc">Click <b>+ Add Course</b> to create your first course.</div>
          </div>
        ) : (
          filteredCourses.map(course => (
            <CourseCard
              key={course._id}
              title={course.name}
              code={course._id}
              section={course.section}
              schoolYear={course.schoolYear}
              adviser={course.adviser}
              details={
                `${course.section || ''} - ${course.schoolYear || ''} - Adviser: ${course.adviser || ''}`
              }
              onEdit={() => {}}
              onAddStudent={() => {}}
              onDelete={() => removeCourse(course._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherCoursesScreen;