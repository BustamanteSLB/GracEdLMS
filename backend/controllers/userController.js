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
    username,
    firstName,
    middleName,
    lastName,
    email,
    password,
    phoneNumber,
    address,
    role,
    sex,
    gender,
    status,
    bio,
    profilePicture,
  } = req.body;

  // Required field validation
  if (
    !username || !firstName || !lastName || !email || !password ||
    !phoneNumber || !address || !role || !sex
  ) {
    return next(new ErrorResponse(
      'Missing required fields for user creation by admin, including sex',
      400
    ));
  }

  // Validate sex enum
  const validSexValues = ['Male', 'Female', 'Other'];
  if (!validSexValues.includes(sex)) {
    return next(new ErrorResponse(
      `Invalid value for sex. Allowed values are: ${validSexValues.join(', ')}`,
      400
    ));
  }

  const userData = {
    username,
    firstName,
    middleName,
    lastName,
    email,
    password,
    phoneNumber,
    address,
    role,
    sex,
    gender,
    status: status || 'pending',
    bio,
    profilePicture,
  };

  let newUser;
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
      return next(new ErrorResponse(
        `Invalid user role '${role}' specified for creation`,
        400
      ));
  }

  const responseUser = newUser.toObject();
  delete responseUser.password;

  res.status(201).json({ success: true, data: responseUser });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const queryObj = { ...req.query };
  ['page','sort','limit','fields'].forEach(f => delete queryObj[f]);

  if (!queryObj.status) queryObj.status = { $ne: 'archived' };
  else if (queryObj.status === 'all') delete queryObj.status;

  let query = User.find(queryObj);

  if (req.query.sort) {
    query = query.sort(req.query.sort.split(',').join(' '));
  } else {
    query = query.sort('-createdAt');
  }

  if (req.query.fields) {
    query = query.select(req.query.fields.split(',').join(' '));
  } else {
    query = query.select('-password');
  }

  const page  = parseInt(req.query.page,10)  || 1;
  const limit = parseInt(req.query.limit,10) || 25;
  const start = (page-1)*limit;
  const total = await User.countDocuments(queryObj);

  query = query.skip(start).limit(limit);
  const users = await query;

  const pagination = {};
  if (start>0) pagination.prev = { page: page-1, limit };
  if (page*limit<total) pagination.next = { page: page+1, limit };

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination,
    data: users
  });
});

// @desc    Get a single user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(
      `Invalid ID format: ${req.params.id}`, 400
    ));
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return next(new ErrorResponse(
      `User not found with ID ${req.params.id}`, 404
    ));
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Update a user by ID
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  console.log('--- updateUser called ---');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(
      `Invalid ID format: ${req.params.id}`, 400
    ));
  }

  try {
    const { password, sex, gender, ...otherFields } = req.body;
    if (password) {
      return next(new ErrorResponse(
        'Password updates should use a password-reset mechanism.', 400
      ));
    }

    const updatePayload = { ...otherFields };
    if (sex !== undefined) {
      const validSex = ['Male','Female','Other'];
      if (!validSex.includes(sex)) {
        return next(new ErrorResponse(
          `Invalid value for sex. Allowed values: ${validSex.join(', ')}`, 400
        ));
      }
      updatePayload.sex = sex;
    }
    if (gender !== undefined) updatePayload.gender = gender;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return next(new ErrorResponse(
        `User not found with ID ${req.params.id}`, 404
      ));
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('🔥 updateUser internal error:', error);
    return next(new ErrorResponse(
      error.message || 'Server Error', 500
    ));
  }
});

// @desc    Delete (soft-delete) user by ID
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(
      `Invalid ID format: ${req.params.id}`, 400
    ));
  }

  const userToArchive = await User.findById(req.params.id);
  if (!userToArchive) {
    return next(new ErrorResponse(
      `User not found with ID ${req.params.id}`, 404
    ));
  }

  if (userToArchive._id.equals(req.user.id)) {
    return next(new ErrorResponse(
      'You cannot archive your own account.', 400
    ));
  }

  if (userToArchive.role === 'Admin') {
    const count = await Admin.countDocuments({ status: 'active' });
    if (count <= 1 && userToArchive.status === 'active') {
      return next(new ErrorResponse(
        'Cannot archive the last active admin account.', 400
      ));
    }
  }

  userToArchive.status = 'archived';
  await userToArchive.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User ${userToArchive.username} archived successfully`,
    data: { id: userToArchive._id, status: userToArchive.status }
  });
});

// @desc    Restore a soft-deleted user by ID
// @route   PUT /api/v1/users/:id/restore
// @access  Private/Admin
exports.restoreUser = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(
      `Invalid ID format: ${req.params.id}`, 400
    ));
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return next(new ErrorResponse(
      `User not found with ID ${req.params.id}`, 404
    ));
  }

  if (user.status !== 'archived') {
    return next(new ErrorResponse(
      `User is not archived. Current status: ${user.status}`, 400
    ));
  }

  user.status = req.body.status || 'pending';
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.username} restored with status '${user.status}'.`,
    data: user
  });
});
