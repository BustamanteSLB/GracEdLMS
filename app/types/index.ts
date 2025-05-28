export interface User {
  _id: string;
  userId: string; // YYYY-XXXXXX
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  // password is not stored on client
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Student' | 'Teacher';
  sex: 'Male' | 'Female' | 'Other' | null;
  gender?: string | null;
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  bio?: string;
  createdAt: string; // Date string
  updatedAt: string; // Date string
  lastLogin?: string; // Date string

  // Role-specific populated fields (optional, depends on API response for /auth/me)
  enrolledCourses?: Course[];
  assignedCourses?: Course[];
}

export interface Course {
    _id: string;
    courseCode: string;
    courseName: string;
    description?: string;
    teacher?: Partial<User>; // Only relevant fields like name, email
    students?: Partial<User>[];
    activities?: Partial<Activity>[];
    // ... other course fields
}

export interface Activity {
    _id: string;
    title: string;
    description?: string;
    course: string; // Course ID
    dueDate?: string;
    maxPoints?: number;
    // ... other activity fields
}

export interface Grade {
    _id: string;
    student: string; // Student ID
    activity: Partial<Activity>; // Activity ID or populated object
    course: string; // Course ID
    score: number;
    gradedBy: Partial<User>; // User ID or populated object
    comments?: string;
    createdAt: string;
    updatedAt: string;
}

// Add more types as needed (e.g., for API payloads)
export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserCreationPayload {
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password?: string; // Password is required for creation
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Student' | 'Teacher';
  sex: 'Male' | 'Female' | 'Other'; // <--- ADDED (sex is required)
  gender?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  bio?: string;
  profilePicture?: string;
}

// For profile updates, fields are optional
export interface UserUpdatePayload {
  username?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  // email typically not updated here
  // password updated separately
  phoneNumber?: string;
  address?: string;
  sex?: 'Male' | 'Female' | 'Other'; // <--- ADDED
  gender?: string; // <--- ADDED
  status?: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived'; // If admin updates
  bio?: string;
  profilePicture?: string;
  role?: 'Admin' | 'Student' | 'Teacher'; // If admin updates
}
