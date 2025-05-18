const mongoose = require('mongoose');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const User = require('../models/User'); // For checking roles
const Activity = require('../models/Activity');
const Grade = require('../models/Grade');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');

// @desc    Create a new course
// @route   POST /api/v1/courses
// @access  Private/Admin
exports.createCourse = asyncHandler(async (req, res, next) => {
  const { courseCode, courseName, description, teacherId } = req.body;

  if (!courseCode || !courseName) {
    return next(new ErrorResponse('Course code and name are required', 400));
  }

  let courseData = { courseCode, courseName, description };

  if (teacherId) {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return next(new ErrorResponse(`Invalid teacher ID format: ${teacherId}`, 400));
    }
    const teacher = await User.findOne({ _id: teacherId, role: 'Teacher', status: 'active' });
    if (!teacher) {
      return next(new ErrorResponse(`Active teacher not found with ID ${teacherId}`, 404));
    }
    courseData.teacher = teacherId;
  }

  const course = await Course.create(courseData);

  // If teacher was assigned, update teacher's record
  if (teacherId && course.teacher) {
      await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { assignedCourses: course._id } });
  }

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc    Get all courses
// @route   GET /api/v1/courses
// @access  Private (All authenticated users can view courses)
exports.getAllCourses = asyncHandler(async (req, res, next) => {
  // Allow filtering by teacher, student (enrolled)
  let queryFilters = {};
  if(req.query.teacherId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.teacherId)) {
          return next(new ErrorResponse('Invalid teacher ID format for filtering', 400));
      }
      queryFilters.teacher = req.query.teacherId;
  }
  // For student enrolled courses, this is better handled by getting the student and populating their courses

  const courses = await Course.find(queryFilters)
    .populate({ path: 'teacher', select: 'firstName lastName email username userId' })
    .populate({ path: 'students', select: 'firstName lastName email username userId' }) // For admin/teacher view
    .populate({ path: 'activities', select: 'title dueDate' })
    .sort({ courseName: 1 });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// @desc    Get a single course by ID
// @route   GET /api/v1/courses/:id
// @access  Private
exports.getCourse = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid course ID format: ${req.params.id}`, 400));
  }

  const course = await Course.findById(req.params.id)
    .populate({ path: 'teacher', select: 'firstName lastName email username userId profilePicture' })
    .populate({ path: 'students', select: 'firstName lastName email username userId profilePicture status' })
    .populate({
        path: 'activities',
        select: 'title description dueDate maxPoints',
        // Further populate grades for each activity if needed, though can get heavy
    });

  if (!course) {
    return next(new ErrorResponse(`Course not found with ID ${req.params.id}`, 404));
  }
  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Update a course by ID
// @route   PUT /api/v1/courses/:id
// @access  Private/Admin
exports.updateCourse = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid course ID format: ${req.params.id}`, 400));
  }
  const { teacherId, ...updateData } = req.body;
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Course not found with ID ${req.params.id}`, 404));
  }

  const oldTeacherId = course.teacher ? course.teacher.toString() : null;

  if (teacherId !== undefined) { // If teacherId is part of the update
      if (teacherId === null) { // Unassign teacher
          updateData.teacher = null;
      } else {
          if (!mongoose.Types.ObjectId.isValid(teacherId)) {
              return next(new ErrorResponse(`Invalid new teacher ID format: ${teacherId}`, 400));
          }
          const newTeacher = await User.findOne({ _id: teacherId, role: 'Teacher', status: 'active' });
          if (!newTeacher) {
              return next(new ErrorResponse(`Active teacher not found with ID ${teacherId}`, 404));
          }
          updateData.teacher = teacherId;
      }
  }

  course = await Course.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate({ path: 'teacher', select: 'firstName lastName email' });

  // Handle changes in teacher assignment
  const newTeacherId = course.teacher ? course.teacher._id.toString() : null;

  if (oldTeacherId !== newTeacherId) {
      if (oldTeacherId) { // Remove course from old teacher
          await Teacher.findByIdAndUpdate(oldTeacherId, { $pull: { assignedCourses: course._id } });
      }
      if (newTeacherId) { // Add course to new teacher
          await Teacher.findByIdAndUpdate(newTeacherId, { $addToSet: { assignedCourses: course._id } });
      }
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Delete a course by ID
// @route   DELETE /api/v1/courses/:id
// @access  Private/Admin
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid course ID format: ${req.params.id}`, 400));
  }
  const course = await Course.findById(req.params.id);
  if (!course) {
    return next(new ErrorResponse(`Course not found with ID ${req.params.id}`, 404));
  }

  // Before deleting course, consider related data:
  // 1. Unassign teacher
  if (course.teacher) {
      await Teacher.findByIdAndUpdate(course.teacher, { $pull: { assignedCourses: course._id } });
  }
  // 2. Unenroll students
  if (course.students && course.students.length > 0) {
      await Student.updateMany({ _id: { $in: course.students } }, { $pull: { enrolledCourses: course._id } });
  }
  // 3. Delete related activities
  await Activity.deleteMany({ course: course._id });
  // 4. Delete related grades
  await Grade.deleteMany({ course: course._id });

  await course.deleteOne(); // Or course.remove() for older Mongoose

  res.status(200).json({
    success: true,
    message: 'Course and related data deleted successfully',
    data: {},
  });
});

// @desc    Assign a teacher to a course (specific endpoint, can also be part of updateCourse)
// @route   PUT /api/v1/courses/:id/assign-teacher
// @access  Private/Admin
exports.assignTeacher = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id;
    const { teacherId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorResponse(`Invalid course ID format: ${courseId}`, 400));
    }
    if (!teacherId) { // Check if teacherId is provided
        return next(new ErrorResponse('Teacher ID is required', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return next(new ErrorResponse(`Invalid teacher ID format: ${teacherId}`, 400));
    }

    const course = await Course.findById(courseId);
    if (!course) {
        return next(new ErrorResponse(`Course not found with ID ${courseId}`, 404));
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'Teacher', status: 'active' });
    if (!teacher) {
        return next(new ErrorResponse(`Active teacher not found with ID ${teacherId}`, 404));
    }

    const oldTeacherId = course.teacher ? course.teacher.toString() : null;

    if (oldTeacherId === teacherId) {
        return res.status(200).json({ success: true, message: 'Teacher already assigned to this course', data: course });
    }

    course.teacher = teacherId;
    await course.save();

    // Update teacher documents
    if (oldTeacherId) {
        await Teacher.findByIdAndUpdate(oldTeacherId, { $pull: { assignedCourses: course._id } });
    }
    await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { assignedCourses: course._id } });

    await course.populate({ path: 'teacher', select: 'firstName lastName email' });

    res.status(200).json({
        success: true,
        message: `Teacher ${teacher.firstName} ${teacher.lastName} assigned to course ${course.courseName}`,
        data: course,
    });
});


// @desc    Enroll a student in a course
// @route   POST /api/v1/courses/:courseId/students
// @access  Private/Admin or Private/Teacher (if teacher manages their own course enrollment)
exports.enrollStudent = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { studentId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new ErrorResponse(`Invalid course ID format: ${courseId}`, 400));
  }
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return next(new ErrorResponse(`Invalid or missing student ID`, 400));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse(`Course not found with ID ${courseId}`, 404));
  }

  // Authorization: If a teacher is doing this, check they are assigned to this course
  if (req.user.role === 'Teacher' && (!course.teacher || course.teacher.toString() !== req.user.id.toString())) {
      return next(new ErrorResponse('You are not authorized to enroll students in this course.', 403));
  }

  const student = await User.findOne({ _id: studentId, role: 'Student', status: 'active' });
  if (!student) {
    return next(new ErrorResponse(`Active student not found with ID ${studentId}`, 404));
  }

  // Add student to course's student list ($addToSet prevents duplicates)
  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { students: studentId } },
    { new: true, runValidators: true }
  ).populate({ path: 'students', select: 'firstName lastName email' });

  // Add course to student's enrolledCourses list
  await Student.findByIdAndUpdate(studentId, { $addToSet: { enrolledCourses: courseId } });

  res.status(200).json({
    success: true,
    message: `Student ${student.firstName} ${student.lastName} enrolled in course ${course.courseName}`,
    data: updatedCourse,
  });
});

// @desc    Remove a student from a course
// @route   DELETE /api/v1/courses/:courseId/students/:studentId
// @access  Private/Admin or Private/Teacher
exports.removeStudentFromCourse = asyncHandler(async (req, res, next) => {
  const { courseId, studentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new ErrorResponse(`Invalid course ID format: ${courseId}`, 400));
  }
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return next(new ErrorResponse(`Invalid student ID format: ${studentId}`, 400));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse(`Course not found with ID ${courseId}`, 404));
  }

  // Authorization: If a teacher is doing this
  if (req.user.role === 'Teacher' && (!course.teacher || course.teacher.toString() !== req.user.id.toString())) {
      return next(new ErrorResponse('You are not authorized to remove students from this course.', 403));
  }

  const student = await User.findById(studentId); // Check if student exists, role not strictly needed here
  if (!student) {
    return next(new ErrorResponse(`Student not found with ID ${studentId}`, 404));
  }

  // Remove student from course's student list
  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $pull: { students: studentId } },
    { new: true }
  );

  // Remove course from student's enrolledCourses list
  await Student.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: courseId } });

  res.status(200).json({
    success: true,
    message: `Student removed from course ${course.courseName}`,
    data: updatedCourse,
  });
});