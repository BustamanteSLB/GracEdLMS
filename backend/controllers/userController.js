const User = require('../models/User');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const mongoose = require('mongoose');

// @desc    Create a new user by Admin
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const {
    username, firstName, middleName, lastName, email, password, phoneNumber, address, role,
    sex,
    gender,
    status, bio, profilePicture
  } = req.body;

  // Add 'sex' to required field check
  if (!username || !firstName || !lastName || !email || !password || !phoneNumber || !address || !role || !sex) {
    return next(new ErrorResponse('Missing required fields for user creation by admin, including sex', 400));
  }
  // Validate enum for sex
  const validSexValues = ['Male', 'Female', 'Other'];
  if (sex && !validSexValues.includes(sex)) {
      return next(new ErrorResponse(`Invalid value for sex. Allowed values are: ${validSexValues.join(', ')}.`, 400));
  }

  let newUser;
  const userData = {
      username, firstName, middleName, lastName, email, password, phoneNumber, address, role,
      sex,
      gender,
      status: status || 'pending', // Admin can set status, default to pending
      bio, profilePicture
  };

  switch (role) {
    case 'Admin':
      newUser = await Admin.create(userData);
      break;
    case 'Teacher':
      newUser = await Teacher.create(userData);
      break;
    case 'Student':
      newUser = await Student.create(userData);
      break;
    default:
      return next(new ErrorResponse(`Invalid user role '${role}' specified for creation`, 400));
  }

  const responseUser = newUser.toObject();
  delete responseUser.password;

  res.status(201).json({
    success: true,
    data: responseUser,
  });
});

// @desc    Get all users (with filtering and pagination options)
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  // Basic filtering (extend as needed)
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  // Filter for non-archived users by default, unless 'status' is specified in query
  if (!queryObj.status) {
      queryObj.status = { $ne: 'archived' };
  } else if (queryObj.status === 'all') { // Allow fetching all including archived
      delete queryObj.status;
  }


  let query = User.find(queryObj);

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt'); // Default sort
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-password'); // Default select
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await User.countDocuments(queryObj); // Count matching documents before pagination

  query = query.skip(startIndex).limit(limit);

  const users = await query;

  // Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination,
    data: users,
  });
});

// @desc    Get a single user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid ID format: ${req.params.id}`, 400));
  }
  // Admin can view any user, including archived ones if they need to
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update a user by ID (by Admin)
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid ID format: ${req.params.id}`, 400));
  }

  // Admin can update most fields. Password changes should be handled carefully.
  const { password, sex, gender, ...otherUpdateData } = req.body;

  if (password) {
    return next(new ErrorResponse('Password updates for other users should be handled via a dedicated reset mechanism, not direct update.', 400));
  }
  const updateDataPayload = { ...otherUpdateData };
  if (sex !== undefined) {
      const validSexValues = ['Male', 'Female', 'Other'];
      if (!validSexValues.includes(sex)) {
          return next(new ErrorResponse(`Invalid value for sex. Allowed values are: ${validSexValues.join(', ')}.`, 400));
      }
      updateDataPayload.sex = sex;
  }
  if (gender !== undefined) {
      updateDataPayload.gender = gender;
  }

  // Admin can change role, status, etc.
  if (otherUpdateData.role) {
      const validRoles = ['Admin', 'Teacher', 'Student'];
      if (!validRoles.includes(otherUpdateData.role)) {
          return next(new ErrorResponse(`Invalid role: ${updateData.role}`, 400));
      }
      // If role changes, Mongoose discriminator key 'kind' needs to be updated too.
      // This is complex with findByIdAndUpdate. It's often better to fetch, modify 'kind' and role, then save.
      // Or, delete and recreate the user if a role change is a major structural change.
      // For simplicity here, we'll assume 'kind' is handled or the update is minor.
      // A more robust solution would involve changing the __t (or kind) field.
  }


  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Delete a user by ID (soft delete by Admin)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid ID format: ${req.params.id}`, 400));
  }
  // Prevent admin from archiving themselves or the last active admin
  const userToArchive = await User.findById(req.params.id);
  if (!userToArchive) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  if (userToArchive._id.equals(req.user.id)) {
      return next(new ErrorResponse('You cannot archive your own account.', 400));
  }
  if (userToArchive.role === 'Admin') {
      const activeAdminCount = await Admin.countDocuments({ status: 'active' });
      if (activeAdminCount <= 1 && userToArchive.status === 'active') {
          return next(new ErrorResponse('Cannot archive the last active admin account.', 400));
      }
  }

  userToArchive.status = 'archived';
  await userToArchive.save({ validateBeforeSave: false }); // Bypass some validations if needed for archival

  res.status(200).json({
    success: true,
    message: `User ${userToArchive.username} archived successfully`,
    data: { id: userToArchive._id, status: userToArchive.status },
  });
});

// @desc    Restore a soft-deleted user by ID (set status to 'active' or 'pending')
// @route   PUT /api/v1/users/:id/restore
// @access  Private/Admin
exports.restoreUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid ID format: ${req.params.id}`, 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status || 'pending' }, // Admin can choose status or default to pending
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  if (user.status === 'archived') { // Ensure we are restoring from archived
      user.status = req.body.status || 'pending'; // Or 'active'
      await user.save();
  } else if (user.status !== 'pending' && user.status !== 'active') {
      return next(new ErrorResponse(`User is not archived. Current status: ${user.status}`, 400));
  }


  res.status(200).json({
    success: true,
    message: `User ${user.username} status updated to '${user.status}' successfully`,
    data: user,
  });
});