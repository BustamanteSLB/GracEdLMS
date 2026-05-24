// index.ts
export interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName: string; // Optional
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: "Admin" | "Teacher" | "Student";
  profilePicture?: string; // Optional
  status: "active" | "inactive" | "suspended" | "pending" | "archived";
  sex: "Male" | "Female" | "Other";
  lastLogin?: Date; // Optional
  temporaryPassword?: string; // Optional, for password reset flows
  createdAt: Date;
  updatedAt: Date;

  // Role-specific populated fields (optional, depends on API response for /auth/me)
  enrolledSubjects?: Subject[];
  assignedSubjects?: Subject[];
}

export interface Subject {
  teachers: never[];
  _id: string;
  subjectName: string;
  description?: string;
  gradeLevel?: string;
  schoolYear?: string;
  section?: string;
  subjectImage?: string | null; // Added subject image
  teacher?: User;
  students?: User[];
  activities?: Activity[];
  discussions?: any[];
  announcements?: any[];
  courseMaterials?: any[];
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  title: string;
  description?: string;
  subject: string; // Subject ID
  dueDate?: string;
  maxPoints?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  // Added interface for announcements
  _id: string;
  title: string;
  content: string;
  date: string;
}

export interface Discussion {
  // Added interface for discussions
  _id: string;
  title: string;
  author: string;
  date: string;
  comments: { _id: string; author: string; content: string; date: string }[];
}

export interface Grade {
  _id: string;
  student: string; // Student ID
  activity: Partial<Activity>; // Activity ID or populated object
  subject: string; // Subject ID
  score: number;
  gradedBy: Partial<User>; // User ID or populated object
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

// Add more types as needed (e.g., for API payloads)
export interface LoginPayload {
  identifier: string;
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
  role: "Admin" | "Student" | "Teacher";
  sex: "Male" | "Female" | "Other"; // <--- ADDED (sex is required)
  status?: "active" | "inactive" | "suspended" | "pending" | "archived";
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
  // Role, status, sex, profilePicture can also be updated (if permitted by API)
  // For user's own profile, role and status usually not updated
  // sex and profilePicture should be explicitly set if changed
  sex?: "Male" | "Female" | "Other";
  profilePicture?: string;
}
