import apiClient from "@/app/services/apiClient";
import { Subject } from "@/app/types/index";
import ContextMenu from "@/components/ContextMenu";
import SubjectDetailsTabs from "@/components/SubjectDetailsTabs";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
  VirtualizedList,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MoreVertIcon from "@/assets/icons/more_vert.svg";
import DeleteIcon from "@/assets/icons/delete.svg";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Dropdown, { DropdownItem } from "@/components/Dropdown";

cssInterop(Image, { className: "style" });

interface TeacherAssignment {
  teacherId: string;
  quarters: {
    firstQuarter: boolean;
    secondQuarter: boolean;
    thirdQuarter: boolean;
    fourthQuarter: boolean;
  };
  isAssignedToAllQuarters: boolean;
}

interface SubjectForm {
  subjectName: string;
  description: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  teachers: TeacherAssignment[];
}

interface Section {
  _id: string;
  sectionName: string;
  gradeLevel: string;
  schoolYear: string;
  students: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    userId: string;
  }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  userId: string;
}

interface Teacher {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: "Teacher";
  profilePicture?: string;
  status: "active" | "inactive" | "suspended" | "pending" | "archived";
}

const SubjectsWeb: React.FC = () => {
  document.title = "Subjects - GracEdLMS";
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();
  const { width } = useWindowDimensions();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Context menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Add/Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  // View Details
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

  // Form fields
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  
  // Teacher assignments state
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([
    {
      teacherId: "",
      quarters: {
        firstQuarter: false,
        secondQuarter: false,
        thirdQuarter: false,
        fourthQuarter: false,
      },
      isAssignedToAllQuarters: false,
    },
  ]);

  // Add new state for image upload
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // New state for sections
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "sections">(
    "details"
  );

  // Section management modal
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionGradeLevel, setSectionGradeLevel] = useState("");
  const [sectionSchoolYear, setSectionSchoolYear] = useState("");

  // Student selection
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Teacher selection
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isAdminOrTeacher = user?.role === "Admin" || user?.role === "Teacher";

  // Memoized dropdown options
  const gradeLevelOptions: DropdownItem[] = useMemo(
    () => [
      { label: "Select Grade Level", value: "" },
      { label: "Grade 1", value: "Grade 1" },
      { label: "Grade 2", value: "Grade 2" },
      { label: "Grade 3", value: "Grade 3" },
      { label: "Grade 4", value: "Grade 4" },
      { label: "Grade 5", value: "Grade 5" },
      { label: "Grade 6", value: "Grade 6" },
    ],
    []
  );

  const gradeLevelFilterOptions: DropdownItem[] = useMemo(
    () => [
      { label: "All Grade Levels", value: "" },
      { label: "Grade 1", value: "Grade 1" },
      { label: "Grade 2", value: "Grade 2" },
      { label: "Grade 3", value: "Grade 3" },
      { label: "Grade 4", value: "Grade 4" },
      { label: "Grade 5", value: "Grade 5" },
      { label: "Grade 6", value: "Grade 6" },
    ],
    []
  );

  const schoolYearOptions: DropdownItem[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: DropdownItem[] = [
      { label: "Select School Year", value: "" },
    ];

    const previousYear = currentYear - 1;
    options.push({
      label: `${previousYear} - ${currentYear}`,
      value: `${previousYear} - ${currentYear}`,
    });

    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      options.push({
        label: `${startYear} - ${endYear}`,
        value: `${startYear} - ${endYear}`,
      });
    }

    return options;
  }, []);

  const schoolYearFilterOptions: DropdownItem[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: DropdownItem[] = [{ label: "All School Years", value: "" }];

    const previousYear = currentYear - 1;
    options.push({
      label: `${previousYear} - ${currentYear}`,
      value: `${previousYear} - ${currentYear}`,
    });

    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      options.push({
        label: `${startYear} - ${endYear}`,
        value: `${startYear} - ${endYear}`,
      });
    }

    return options;
  }, []);

  const itemsPerPageOptions: DropdownItem[] = useMemo(
    () => [
      { label: "5", value: "5" },
      { label: "10", value: "10" },
      { label: "20", value: "20" },
      { label: "50", value: "50" },
    ],
    []
  );

  // Memoized teacher dropdown options
  const teacherOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [{ label: "Select Teacher (Optional)", value: "" }];

    allTeachers.forEach((teacher) => {
      const fullName = teacher.middleName
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;
      options.push({
        label: fullName,
        value: teacher._id,
      });
    });

    return options;
  }, [allTeachers]);

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const response = await apiClient.get("/users?role=Teacher&status=active");
      setAllTeachers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // Fetch sections
  const fetchSections = useCallback(async (grade?: string, year?: string) => {
    try {
      const params = new URLSearchParams();
      if (grade) params.append("gradeLevel", grade);
      if (year) params.append("schoolYear", year);

      const response = await apiClient.get(`/sections?${params.toString()}`);
      setSections(response.data.data);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  }, []);

  // Fetch all students
  const fetchStudents = useCallback(async () => {
    try {
      let allStudentsData: Student[] = [];
      let page = 1;
      let hasMore = true;

      // Fetch all pages of students
      while (hasMore) {
        const response = await apiClient.get(
          `/users?role=Student&status=active&page=${page}&limit=100`
        );
        const students = response.data.data || [];
        
        if (students.length === 0) {
          hasMore = false;
        } else {
          allStudentsData = [...allStudentsData, ...students];
          page++;
        }
      }

      setAllStudents(allStudentsData);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setAllStudents([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
      fetchTeachers();
    }
  }, [fetchStudents, fetchTeachers, isAdmin]);

  // Update sections when grade level or school year changes
  useEffect(() => {
    if (gradeLevel && schoolYear && isAdmin) {
      fetchSections(gradeLevel, schoolYear);
    }
  }, [gradeLevel, schoolYear, fetchSections, isAdmin]);

  // Filter available sections based on selected grade and school year
  const availableSections = useMemo(() => {
    return sections.filter(
      (s) => s.gradeLevel === gradeLevel && s.schoolYear === schoolYear
    );
  }, [sections, gradeLevel, schoolYear]);

  // Section dropdown options
  const sectionOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [{ label: "Select Section", value: "" }];

    availableSections.forEach((sec) => {
      options.push({
        label: `${sec.sectionName} (${sec.students.length} students)`,
        value: sec.sectionName,
      });
    });

    if (isAdmin) {
      options.push({ label: "+ Create New Section", value: "__create_new__" });
    }

    return options;
  }, [availableSections, isAdmin]);

  // Handle section selection
  const handleSectionChange = (value: string) => {
    if (value === "__create_new__") {
      handleOpenSectionModal();
    } else {
      setSection(value);
      setSelectedSection(value);
    }
  };

  // Open section management modal
  const handleOpenSectionModal = () => {
    if (!gradeLevel || !schoolYear) {
      window.alert("Please select grade level and school year first");
      return;
    }

    setEditingSection(null);
    setNewSectionName("");
    setSectionGradeLevel(gradeLevel);
    setSectionSchoolYear(schoolYear);
    setSelectedStudents([]);
    setStudentSearchQuery("");
    setSectionModalVisible(true);
  };

  // Handle edit section
  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setNewSectionName(section.sectionName);
    setSectionGradeLevel(section.gradeLevel);
    setSectionSchoolYear(section.schoolYear);
    setSelectedStudents(section.students.map((s) => s._id));
    setStudentSearchQuery("");
    setSectionModalVisible(true);
  };

  // Save section
  const handleSaveSection = async () => {
    if (!newSectionName.trim()) {
      window.alert("Please enter section name");
      return;
    }

    try {
      const sectionData = {
        sectionName: newSectionName.trim(),
        gradeLevel: sectionGradeLevel,
        schoolYear: sectionSchoolYear,
        studentIds: selectedStudents,
      };

      if (editingSection) {
        await apiClient.put(`/sections/${editingSection._id}`, sectionData);
        window.alert("Section updated successfully");
      } else {
        await apiClient.post("/sections", sectionData);
        window.alert("Section created successfully");
      }

      setSectionModalVisible(false);
      fetchSections(gradeLevel, schoolYear);
    } catch (error: any) {
      console.error("Failed to save section:", error);
      window.alert(
        "Error: " +
          (error.response?.data?.message || "Failed to save section")
      );
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to archive this section?"
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/sections/${sectionId}`);
      window.alert("Section archived successfully");
      fetchSections(gradeLevel, schoolYear);
    } catch (error: any) {
      console.error("Failed to delete section:", error);
      window.alert(
        "Error: " +
          (error.response?.data?.message || "Failed to delete section")
      );
    }
  };

  // Toggle student selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Filter students for search - UPDATED to exclude already selected students
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) {
      // Return all students except those already in the section
      return allStudents.filter(
        (student) => !selectedStudents.includes(student._id)
      );
    }

    const query = studentSearchQuery.toLowerCase();
    return allStudents.filter(
      (student) =>
        !selectedStudents.includes(student._id) &&
        ((student.firstName?.toLowerCase().includes(query) ?? false) ||
          (student.lastName?.toLowerCase().includes(query) ?? false) ||
          (student.middleName?.toLowerCase().includes(query) ?? false) ||
          (student.email?.toLowerCase().includes(query) ?? false) ||
          (student.userId?.toLowerCase().includes(query) ?? false))
    );
  }, [allStudents, studentSearchQuery, selectedStudents]);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>("/subjects");
      setSubjects(response.data.data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      window.alert("Error: Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        subject.section?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel =
        !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear =
        !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;

      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [subjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear, itemsPerPage]);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Handlers
  const handleAddSubject = () => {
    setIsEditing(false);
    setCurrentSubject(null);
    setSubjectName("");
    setDescription("");
    setGradeLevel("");
    setSection("");
    setSchoolYear("");
    setTeacherAssignments([
      {
        teacherId: "",
        quarters: {
          firstQuarter: false,
          secondQuarter: false,
          thirdQuarter: false,
          fourthQuarter: false,
        },
        isAssignedToAllQuarters: false,
      },
    ]);
    setSelectedImage(null);
    setActiveTab("details");
    setModalVisible(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setIsEditing(true);
    setCurrentSubject(subject);
    setSubjectName(subject.subjectName);
    setDescription(subject.description || "");
    setGradeLevel(subject.gradeLevel || "");
    setSection(subject.section || "");
    setSchoolYear(subject.schoolYear || "");
    
    // Map backend teachers to frontend format
    const assignments = subject.teachers?.map((ta: any) => ({
      teacherId: ta.teacher?._id || "",
      quarters: ta.quarters || {
        firstQuarter: false,
        secondQuarter: false,
        thirdQuarter: false,
        fourthQuarter: false,
      },
      isAssignedToAllQuarters: ta.isAssignedToAllQuarters || false,
    })) || [];
    
    setTeacherAssignments(assignments.length > 0 ? assignments : [
      {
        teacherId: "",
        quarters: {
          firstQuarter: false,
          secondQuarter: false,
          thirdQuarter: false,
          fourthQuarter: false,
        },
        isAssignedToAllQuarters: false,
      },
    ]);
    
    setSelectedImage(null);
    setActiveTab("details");
    setModalVisible(true);
    handleCloseMenu();
  };

  // Handle teacher assignment changes
  const handleTeacherChange = (index: number, teacherId: string) => {
    const updated = [...teacherAssignments];
    updated[index].teacherId = teacherId;
    setTeacherAssignments(updated);
  };

  const handleQuarterChange = (
    index: number,
    quarter: "firstQuarter" | "secondQuarter" | "thirdQuarter" | "fourthQuarter"
  ) => {
    const updated = [...teacherAssignments];
    updated[index].quarters[quarter] = !updated[index].quarters[quarter];
    setTeacherAssignments(updated);
  };

  const handleAllQuartersToggle = (index: number) => {
    const updated = [...teacherAssignments];
    updated[index].isAssignedToAllQuarters =
      !updated[index].isAssignedToAllQuarters;
    
    if (updated[index].isAssignedToAllQuarters) {
      updated[index].quarters = {
        firstQuarter: true,
        secondQuarter: true,
        thirdQuarter: true,
        fourthQuarter: true,
      };
    }
    setTeacherAssignments(updated);
  };

  const handleAddTeacherRow = () => {
    setTeacherAssignments([
      ...teacherAssignments,
      {
        teacherId: "",
        quarters: {
          firstQuarter: false,
          secondQuarter: false,
          thirdQuarter: false,
          fourthQuarter: false,
        },
        isAssignedToAllQuarters: false,
      },
    ]);
  };

  const handleRemoveTeacherRow = (index: number) => {
    if (teacherAssignments.length === 1) {
      window.alert("At least one teacher assignment is required");
      return;
    }
    const updated = teacherAssignments.filter((_, i) => i !== index);
    setTeacherAssignments(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!teacherAssignments.some((ta) => ta.teacherId.trim())) {
      window.alert("Error: Please assign at least one teacher");
      return;
    }

    const validAssignments = teacherAssignments.filter(
      (ta) =>
        ta.teacherId.trim() &&
        (ta.isAssignedToAllQuarters ||
          Object.values(ta.quarters).some((q) => q))
    );

    if (validAssignments.length === 0) {
      window.alert(
        "Error: Each teacher must be assigned to at least one quarter"
      );
      return;
    }

    const formData: SubjectForm = {
      subjectName,
      description,
      gradeLevel,
      section,
      schoolYear,
      teachers: validAssignments,
    };

    try {
      if (isEditing && currentSubject) {
        await apiClient.put(`/subjects/${currentSubject._id}`, formData);
        window.alert("Success: Subject updated successfully.");
      } else {
        const response = await apiClient.post("/subjects", formData);
        if (selectedImage && response.data.data?._id) {
          await handleUploadImage(response.data.data._id);
        }
        window.alert("Success: Subject added successfully.");
      }
      setModalVisible(false);
      setSelectedImage(null);
      setSections([]);
      fetchSubjects();
    } catch (error: any) {
      console.error(
        "Failed to save subject:",
        error.response?.data || error.message
      );
      const backendErrorMessage = error.response?.data?.message;
      window.alert(
        "Error: " + (backendErrorMessage || "Failed to save subject.")
      );
    }
  };

  // Add image picker handler
  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      window.alert("Error: Failed to pick image");
    }
  };

  // Add image upload handler
  const handleUploadImage = async (subjectId: string) => {
    if (!selectedImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();

      // For web, fetch the image and convert to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      formData.append("subjectImage", blob, "subject-image.jpg");

      await apiClient.put(`/subjects/${subjectId}/upload-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      window.alert("Success: Subject image uploaded successfully");
      setSelectedImage(null);
      fetchSubjects();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      window.alert(
        "Error: " + (error.response?.data?.message || "Failed to upload image")
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Add image delete handler
  const handleDeleteImage = async (subjectId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this subject image?"
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/subjects/${subjectId}/delete-image`);
      window.alert("Success: Subject image deleted successfully");
      fetchSubjects();
    } catch (error: any) {
      console.error("Error deleting image:", error);
      window.alert(
        "Error: " + (error.response?.data?.message || "Failed to delete image")
      );
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this subject? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/subjects/${subjectId}`);
      window.alert("Success: Subject deleted successfully.");
      handleCloseMenu();
      fetchSubjects();
    } catch (error: any) {
      console.error("Failed to delete subject:", error);
      const backendErrorMessage = error.response?.data?.message;
      window.alert(
        "Error: " + (backendErrorMessage || "Failed to delete subject.")
      );
    }
  };

  const handleOpenMenu = (event: any, subject: Subject) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setSelectedSubject(subject);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedSubject(null);
  };

  const handleViewSubject = (subject: Subject) => {
    router.push(`/subjects/${subject._id}` as any);
  };

  // Menu items
  const menuItems = [
    {
      label: "Edit Subject",
      onPress: () => {
        if (selectedSubject) {
          handleEditSubject(selectedSubject);
        }
      },
      icon: (
        <Image
          className="w-[20] h-[20] mr-2"
          contentFit="contain"
          source={require("@/assets/icons/edit.png")}
          cachePolicy="memory-disk"
          tintColor={isDarkMode ? "#E0E0E0" : "#333"}
        />
      ),
    },
    {
      label: "Delete Subject",
      onPress: () => {
        if (selectedSubject) {
          handleDeleteSubject(selectedSubject._id);
        }
      },
      icon: (
        <DeleteIcon
          width={20}
          height={20}
          style={{ marginRight: 8 }}
          fill="#EF4444"
        />
      ),
    },
  ];

  // Get consistent color
  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#F97316",
      "#14B8A6",
      "#EC4899",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string) => {
    const teacher = allTeachers.find((t) => t._id === teacherId);
    if (!teacher) return "Not assigned";
    return teacher.middleName
      ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
      : `${teacher.firstName} ${teacher.lastName}`;
  };

  // Loading state
  if (isLoading || loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? "bg-[#1A1A1A]" : "bg-[#F9FAFB]"
        }`}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text
          className={`mt-4 text-sm font-inter_regular ${
            isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
          }`}
        >
          Loading subjects...
        </Text>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </SafeAreaView>
    );
  }

  // Render subject item
  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);
    
    // Get adviser names with quarter info from teachers array
    const adviserInfo = item.teachers?.map((ta: any) => {
      const teacher = ta.teacher as any;
      const fullName = teacher?.middleName
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;
      
      // If assigned to all quarters, just show name
      if (ta.isAssignedToAllQuarters) {
        return fullName;
      }
      
      // Otherwise, show name with quarters
      const quarters = [];
      if (ta.quarters.firstQuarter) quarters.push("1st");
      if (ta.quarters.secondQuarter) quarters.push("2nd");
      if (ta.quarters.thirdQuarter) quarters.push("3rd");
      if (ta.quarters.fourthQuarter) quarters.push("4th");
      
      if (quarters.length > 0) {
        return `${fullName} (${quarters.join(", ")} Quarter${quarters.length > 1 ? "s" : ""})`;
      }
      return fullName;
    }).join(", ") || "Not assigned";

    return (
      <TouchableOpacity
        className={`rounded-xl p-4 mb-3 border ${
          isDarkMode
            ? "bg-[#1E1E1E] border-[#333333]"
            : "bg-white border-[#E5E7EB]"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => handleViewSubject(item)}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-row flex-1">
            {/* Icon or Image */}
            {item.subjectImage ? (
              <Image
                source={{ uri: item.subjectImage }}
                className="w-[50px] h-[50px] rounded-lg"
                contentFit="cover"
              />
            ) : (
              <View
                className="w-[50px] h-[50px] rounded-lg justify-center items-center"
                style={{ backgroundColor: bgColor }}
              >
                <Text className="text-white font-inter_bold text-lg">
                  {initials}
                </Text>
              </View>
            )}

            {/* Content */}
            <View className="flex-1 ml-3">
              <Text
                className={`text-lg font-inter_bold mb-1 ${
                  isDarkMode ? "text-[#F9FAFB]" : "text-[#111827]"
                }`}
                numberOfLines={1}
              >
                {item.subjectName}
              </Text>
              <Text
                className={`text-sm font-inter_semibold mb-1 ${
                  isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                {item.gradeLevel} - {item.section}
              </Text>
              <Text
                className={`text-sm font-inter_semibold mb-1 ${
                  isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                S.Y {item.schoolYear}
              </Text>
              <Text
                className={`text-sm font-inter_regular ${
                  isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
                numberOfLines={2}
              >
                Adviser: {adviserInfo}
              </Text>
            </View>
          </View>

          {/* Menu Icon */}
          <Pressable
            onPress={(event) => handleOpenMenu(event, item)}
            className="p-2"
          >
            <MoreVertIcon
              width={20}
              height={20}
              fill={isDarkMode ? "#E0E0E0" : "#111827"}
            />
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-[#1A1A1A]" : "bg-[#F9FAFB]"}`}>
      {/* Header */}
      <View
        className={`px-5 pt-5 pb-4 border-b ${
          isDarkMode
            ? "bg-[#1E1E1E] border-[#333333]"
            : "bg-white border-[#E5E7EB]"
        }`}
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text
              className={`text-2xl font-inter_bold ${
                isDarkMode ? "text-[#F9FAFB]" : "text-[#111827]"
              }`}
            >
              Subjects
            </Text>
            <Text
              className={`text-sm font-inter_regular mt-1 ${
                isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
              }`}
            >
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredSubjects.length)} of{" "}
              {filteredSubjects.length} subjects
            </Text>
          </View>

          {/* Buttons Container */}
          <View className="flex-row gap-1">
            {/* Add Subject Button */}
            {isAdminOrTeacher && (
              <TouchableOpacity
                onPress={handleAddSubject}
                className="bg-[#3B82F6] px-2 py-2 rounded-lg flex-row items-center"
              >
                <Image
                  source={require("@/assets/icons/plus.png")}
                  className="w-[24] h-[24]"
                  tintColor="white"
                />
                {width >= 768 && (
                  <Text className="text-white font-inter_semibold mx-2">
                    Add Subject
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {/* Refresh Button */}
            <TouchableOpacity
              onPress={fetchSubjects}
              disabled={loading}
              className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
            >
              <Image
                source={require("@/assets/icons/refresh.png")}
                className="w-[24] h-[24]"
                tintColor="white"
                style={{
                  transform: loading
                    ? [{ rotate: "180deg" }]
                    : [{ rotate: "0deg" }],
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <View className="mt-4">
          <View className="flex-row mb-3">
            <View className="flex-1 mr-2">
              <TextInput
                placeholder="Search subjects..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`px-3 py-2.5 h-[45px] rounded-lg font-inter_regular ${
                  isDarkMode
                    ? "bg-[#2A2A2A] text-[#E0E0E0]"
                    : "bg-[#F3F4F6] text-[#111827]"
                }`}
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>
            <TouchableOpacity
              onPress={fetchSubjects}
              className="bg-[#10B981] px-4 py-2 rounded-lg mr-2 justify-center items-center h-[45px]"
            >
              <Text className="text-white font-inter_semibold">Search</Text>
            </TouchableOpacity>
            <View style={{ width: 100 }}>
              <Dropdown
                data={itemsPerPageOptions}
                selectedValue={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
                placeholder="Items per page"
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            {/* Grade Level Filter */}
            <View className="flex-1">
              <Text
                className={`text-xs font-inter_medium mb-1 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-[#6B7280]"
                }`}
              >
                Grade Level
              </Text>
              <Dropdown
                data={gradeLevelFilterOptions}
                selectedValue={selectedGradeLevel}
                onValueChange={setSelectedGradeLevel}
                placeholder="All Grade Levels"
              />
            </View>

            {/* School Year Filter */}
            <View className="flex-1">
              <Text
                className={`text-xs font-inter_medium mb-1 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-[#6B7280]"
                }`}
              >
                School Year
              </Text>
              <Dropdown
                data={schoolYearFilterOptions}
                selectedValue={selectedSchoolYear}
                onValueChange={setSelectedSchoolYear}
                placeholder="All School Years"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        {paginatedSubjects.length > 0 ? (
          <FlatList
            data={paginatedSubjects}
            renderItem={renderSubjectItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-5">
            <Image
              source={require("@/assets/images/online-course.png")}
              className="w-[64] h-[64] mb-4 opacity-45"
            />
            <Text
              className={`text-lg font-inter_semibold mb-2 ${
                isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
              }`}
            >
              No subjects found
            </Text>
            <Text
              className={`text-sm font-inter_regular text-center ${
                isDarkMode ? "text-[#6B7280]" : "text-[#9CA3AF]"
              }`}
            >
              {searchQuery || selectedGradeLevel || selectedSchoolYear
                ? "Try adjusting your filters"
                : "Create your first subject to get started"}
            </Text>
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View
            className={`px-5 py-4 border-t ${
              isDarkMode
                ? "bg-[#1E1E1E] border-[#333333]"
                : "bg-white border-[#E5E7EB]"
            }`}
          >
            <View className="flex-row justify-between items-center">
              {/* Previous Button */}
              <TouchableOpacity
                onPress={goToPreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === 1
                    ? isDarkMode
                      ? "bg-[#2A2A2A]"
                      : "bg-[#F3F4F6]"
                    : "bg-[#3B82F6]"
                }`}
              >
                <Text
                  className={`font-inter_semibold ${
                    currentPage === 1
                      ? isDarkMode
                        ? "text-[#6B7280]"
                        : "text-[#9CA3AF]"
                      : "text-white"
                  }`}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              {/* Page Numbers */}
              <View className="flex-row gap-2">
                {getPageNumbers().map((page, index) => {
                  if (page === "...") {
                    return (
                      <View key={`ellipsis-${index}`} className="px-3 py-2">
                        <Text
                          className={`font-inter_regular ${
                            isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          }`}
                        >
                          ...
                        </Text>
                      </View>
                    );
                  }

                  const isCurrentPage = page === currentPage;

                  return (
                    <TouchableOpacity
                      key={page}
                      onPress={() => goToPage(page as number)}
                      className={`px-3 py-2 rounded-lg min-w-[40px] items-center ${
                        isCurrentPage
                          ? "bg-[#3B82F6]"
                          : isDarkMode
                          ? "bg-[#2A2A2A]"
                          : "bg-[#F3F4F6]"
                      }`}
                    >
                      <Text
                        className={`font-inter_semibold ${
                          isCurrentPage
                            ? "text-white"
                            : isDarkMode
                            ? "text-[#E0E0E0]"
                            : "text-[#111827]"
                        }`}
                      >
                        {page}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Next Button */}
              <TouchableOpacity
                onPress={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === totalPages
                    ? isDarkMode
                      ? "bg-[#2A2A2A]"
                      : "bg-[#F3F4F6]"
                    : "bg-[#3B82F6]"
                }`}
              >
                <Text
                  className={`font-inter_semibold ${
                    currentPage === totalPages
                      ? isDarkMode
                        ? "text-[#6B7280]"
                        : "text-[#9CA3AF]"
                      : "text-white"
                  }`}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      {/* Context Menu */}
      <ContextMenu
        visible={menuVisible}
        x={menuPosition.x}
        y={menuPosition.y}
        onClose={handleCloseMenu}
        items={menuItems}
        menuStyle={{
          backgroundColor: isDarkMode ? "#333333" : "white",
          borderRadius: 8,
          minWidth: 150,
        }}
        itemStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
        labelStyle={{
          color: isDarkMode ? "#F9FAFB" : "#111827",
          fontSize: 14,
          fontFamily: "Inter-Medium",
        }}
      />

      {/* Add/Edit Subject Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center p-4 bg-black/50">
          <View
            className={`rounded-xl p-6 w-full max-w-3xl max-h-[85vh] ${
              isDarkMode ? "bg-[#1E1E1E]" : "bg-white"
            }`}
          >
            <Text
              className={`font-inter_bold text-xl text-center mb-4 ${
                isDarkMode ? "text-[#E0E0E0]" : "text-black"
              }`}
            >
              {isEditing ? "Edit Subject" : "Add Subject"}
            </Text>

            {/* Tabs */}
            <View className="flex-row mb-4 border-b border-gray-300">
              <TouchableOpacity
                onPress={() => setActiveTab("details")}
                className={`flex-1 py-3 ${
                  activeTab === "details" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                <Text
                  className={`text-center font-inter_semibold ${
                    activeTab === "details"
                      ? "text-blue-500"
                      : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  Subject Details
                </Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setActiveTab("sections")}
                  className={`flex-1 py-3 ${
                    activeTab === "sections"
                      ? "border-b-2 border-blue-500"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-center font-inter_semibold ${
                      activeTab === "sections"
                        ? "text-blue-500"
                        : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    Sections
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              className="flex-1"
            >
              {activeTab === "details" ? (
                <>
                  {/* Subject Image */}
                  <Text
                    className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Subject Image (Optional):
                  </Text>

                  {(selectedImage ||
                    (isEditing && currentSubject?.subjectImage)) && (
                    <View className="mb-3">
                      <Image
                        source={{
                          uri: selectedImage || currentSubject?.subjectImage,
                        }}
                        className="w-full h-[200px] rounded-lg"
                        contentFit="cover"
                      />
                      {isEditing &&
                        currentSubject?.subjectImage &&
                        !selectedImage && (
                          <TouchableOpacity
                            onPress={() =>
                              currentSubject &&
                              handleDeleteImage(currentSubject._id)
                            }
                            className="bg-red-500 p-2 rounded-lg mt-2"
                          >
                            <Text className="text-white font-inter_semibold text-center">
                              Delete Current Image
                            </Text>
                          </TouchableOpacity>
                        )}
                      {selectedImage && (
                        <TouchableOpacity
                          onPress={() => setSelectedImage(null)}
                          className="bg-gray-500 p-2 rounded-lg mt-2"
                        >
                          <Text className="text-white font-inter_semibold text-center">
                            Remove Selected Image
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handlePickImage}
                    className={`p-3 rounded-lg mb-3 border ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`font-inter_regular text-center ${
                        isDarkMode ? "text-[#E0E0E0]" : "text-black"
                      }`}
                    >
                      {selectedImage ||
                      (isEditing && currentSubject?.subjectImage)
                        ? "Change Image"
                        : "Upload Image"}
                    </Text>
                  </TouchableOpacity>

                  {/* Subject Name */}
                  <Text
                    className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Subject Name:
                  </Text>
                  <TextInput
                    className={`font-inter_regular border rounded-lg p-3 mb-4 ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="Enter subject name"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                    value={subjectName}
                    onChangeText={setSubjectName}
                  />

                  {/* Teachers Assignment Section (REQUIRED) */}
                  <Text
                    className={`font-inter_bold ml-1 mb-3 text-base ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Assign Teachers (Required):
                  </Text>

                  {teacherAssignments.map((assignment, index) => (
                    <View
                      key={index}
                      className={`p-4 mb-4 rounded-lg border ${
                        isDarkMode
                          ? "bg-[#2A2A2A] border-gray-600"
                          : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      {/* Teacher Selection */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text
                          className={`font-inter_semibold ${
                            isDarkMode ? "text-[#E0E0E0]" : "text-black"
                          }`}
                        >
                          Teacher {index + 1}:
                        </Text>
                        {teacherAssignments.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveTeacherRow(index)}
                            className="bg-red-500 px-3 py-1 rounded-lg"
                          >
                            <Text className="text-white text-xs font-inter_semibold">
                              Remove
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View className="mb-3">
                        <Dropdown
                          data={teacherOptions}
                          selectedValue={assignment.teacherId}
                          onValueChange={(value) =>
                            handleTeacherChange(index, value)
                          }
                          placeholder="Select Teacher"
                        />
                      </View>

                      {assignment.teacherId && (
                        <>
                          {/* All Quarters Toggle */}
                          <View className="flex-row items-center mb-3 p-2 rounded-lg bg-opacity-50">
                            <Checkbox
                              value={assignment.isAssignedToAllQuarters}
                              onValueChange={() =>
                                handleAllQuartersToggle(index)
                              }
                              color={
                                assignment.isAssignedToAllQuarters
                                  ? "#3B82F6"
                                  : undefined
                              }
                            />
                            <Text
                              className={`ml-2 font-inter_semibold ${
                                isDarkMode ? "text-[#E0E0E0]" : "text-black"
                              }`}
                            >
                              Assign to All Quarters
                            </Text>
                          </View>

                          {!assignment.isAssignedToAllQuarters && (
                            <>
                              <Text
                                className={`font-inter_semibold mb-2 text-sm ${
                                  isDarkMode ? "text-[#9CA3AF]" : "text-gray-600"
                                }`}
                              >
                                Select Quarters:
                              </Text>

                              <View className="space-y-2">
                                {[
                                  "firstQuarter",
                                  "secondQuarter",
                                  "thirdQuarter",
                                  "fourthQuarter",
                                ].map((quarter) => (
                                  <View
                                    key={quarter}
                                    className="flex-row items-center"
                                  >
                                    <Checkbox
                                      value={
                                        assignment.quarters[
                                          quarter as keyof typeof assignment.quarters
                                        ]
                                      }
                                      onValueChange={() =>
                                        handleQuarterChange(
                                          index,
                                          quarter as
                                            | "firstQuarter"
                                            | "secondQuarter"
                                            | "thirdQuarter"
                                            | "fourthQuarter"
                                        )
                                      }
                                      color={
                                        assignment.quarters[
                                          quarter as keyof typeof assignment.quarters
                                        ]
                                          ? "#3B82F6"
                                          : undefined
                                      }
                                    />
                                    <Text
                                      className={`ml-2 font-inter_regular ${
                                        isDarkMode
                                          ? "text-[#E0E0E0]"
                                          : "text-black"
                                      }`}
                                    >
                                      {quarter === "firstQuarter" &&
                                        "1st Quarter"}
                                      {quarter === "secondQuarter" &&
                                        "2nd Quarter"}
                                      {quarter === "thirdQuarter" &&
                                        "3rd Quarter"}
                                      {quarter === "fourthQuarter" &&
                                        "4th Quarter"}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={handleAddTeacherRow}
                    className="bg-green-500 p-3 rounded-lg mb-4 items-center"
                  >
                    <Text className="text-white font-inter_semibold">
                      + Add Another Teacher
                    </Text>
                  </TouchableOpacity>

                  {/* Grade Level */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Grade Level:
                  </Text>
                  <View className="mb-3">
                    <Dropdown
                      data={gradeLevelOptions}
                      selectedValue={gradeLevel}
                      onValueChange={setGradeLevel}
                      placeholder="Select Grade Level"
                    />
                  </View>

                  {/* School Year */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    School Year:
                  </Text>
                  <View className="mb-3">
                    <Dropdown
                      data={schoolYearOptions}
                      selectedValue={schoolYear}
                      onValueChange={setSchoolYear}
                      placeholder="Select School Year"
                    />
                  </View>

                  {/* Section */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Section:
                  </Text>
                  <View className="mb-3">
                    <Dropdown
                      data={sectionOptions}
                      selectedValue={section}
                      onValueChange={handleSectionChange}
                      placeholder="Select Section"
                      disabled={!gradeLevel || !schoolYear}
                    />
                  </View>

                  {/* Description */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Description (Optional):
                  </Text>
                  <TextInput
                    className={`font-inter_regular border rounded-lg p-3 mb-2 ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="Enter description"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                  />
                </>
              ) : (
                <>
                  {/* Sections Tab Content */}
                  <Text
                    className={`font-inter_bold text-lg mb-4 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Manage Sections
                  </Text>

                  {!gradeLevel || !schoolYear ? (
                    <View className={`p-4 rounded-lg border ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600"
                        : "bg-gray-100 border-gray-300"
                    }`}>
                      <Text className={`font-inter_regular ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Please select grade level and school year first on the Subject Details tab
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleOpenSectionModal}
                        className="bg-blue-500 p-3 rounded-lg mb-4 items-center"
                      >
                        <Text className="text-white font-inter_semibold">
                          + Create New Section
                        </Text>
                      </TouchableOpacity>

                      {availableSections.length > 0 ? (
                        <View className="space-y-2">
                          {availableSections.map((sec) => (
                            <View
                              key={sec._id}
                              className={`p-4 rounded-lg border flex-row justify-between items-center ${
                                isDarkMode
                                  ? "bg-[#2A2A2A] border-gray-600"
                                  : "bg-gray-50 border-gray-300"
                              }`}
                            >
                              <View className="flex-1">
                                <Text className={`font-inter_bold ${
                                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                                }`}>
                                  {sec.sectionName}
                                </Text>
                                <Text className={`text-sm font-inter_regular ${
                                  isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                                }`}>
                                  {sec.students.length} students
                                </Text>
                              </View>
                              <View className="flex-row gap-2">
                                <TouchableOpacity
                                  onPress={() => handleEditSection(sec)}
                                  className="bg-blue-500 px-3 py-1 rounded-lg"
                                >
                                  <Text className="text-white text-xs font-inter_semibold">
                                    Edit
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeleteSection(sec._id)}
                                  className="bg-red-500 px-3 py-1 rounded-lg"
                                >
                                  <Text className="text-white text-xs font-inter_semibold">
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View className={`p-4 rounded-lg border ${
                          isDarkMode
                            ? "bg-[#2A2A2A] border-gray-600"
                            : "bg-gray-100 border-gray-300"
                        }`}>
                          <Text className={`font-inter_regular text-center ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            No sections available. Create one to get started.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            {/* Buttons */}
            <View className="flex-row mt-4 gap-2">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={uploadingImage}
                className="bg-[#3B82F6] p-3 rounded-xl flex-1 items-center"
              >
                {uploadingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-inter_semibold text-base">
                    {isEditing ? "Update Subject" : "Add Subject"}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedImage(null);
                  setActiveTab("details");
                }}
                className="bg-gray-500 p-3 rounded-xl flex-1 items-center"
              >
                <Text className="text-white font-inter_semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Management Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={sectionModalVisible}
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center p-4 bg-black/50">
          <View
            className={`rounded-xl p-6 w-full max-w-2xl max-h-[85vh] ${
              isDarkMode ? "bg-[#1E1E1E]" : "bg-white"
            }`}
          >
            <Text
              className={`font-inter_bold text-xl text-center mb-4 ${
                isDarkMode ? "text-[#E0E0E0]" : "text-black"
              }`}
            >
              {editingSection ? "Edit Section" : "Create New Section"}
            </Text>

            <ScrollView className="flex-1">
              {/* Section Name */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Section Name:
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-3 mb-4 ${
                  isDarkMode
                  ? "bg-[#2A2A2A] border-gray-600 text-white"
                  : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Enter section name"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                value={newSectionName}
                onChangeText={setNewSectionName}
              />

              {/* Students Search and List */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Students ({selectedStudents.length}):
              </Text>

              <TextInput
                className={`font-inter_regular border rounded-lg p-3 mb-3 ${
                  isDarkMode
                  ? "bg-[#2A2A2A] border-gray-600 text-white"
                  : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Search students..."
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                value={studentSearchQuery}
                onChangeText={setStudentSearchQuery}
              />

              {/* Selected Students */}
              {selectedStudents.length > 0 && (
              <View className="mb-3">
                <Text
                  className={`text-xs font-inter_semibold mb-2 ${
                    isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                  }`}
                >
                  Selected Students:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                {allStudents
                  .filter((s) => selectedStudents.includes(s._id))
                  .map((student) => (
                  <View
                    key={student._id}
                    className="bg-blue-500 px-3 py-1 rounded-full flex-row items-center gap-2"
                  >
                    <Text className="text-white text-xs font-inter_semibold">
                    {student.middleName
                      ? `${student.firstName} ${student.middleName} ${student.lastName}`
                      : `${student.firstName} ${student.lastName}`}
                    </Text>
                    <TouchableOpacity
                    onPress={() => handleToggleStudent(student._id)}
                    >
                    <Text className="text-white font-inter_bold">×</Text>
                    </TouchableOpacity>
                  </View>
                  ))}
                </View>
              </View>
              )}

              {/* Available Students List */}
              <View
              className={`border rounded-lg max-h-[300px] ${
                isDarkMode ? "border-gray-600" : "border-gray-300"
              }`}
              >
              {filteredStudents.length > 0 ? (
                <FlatList
                  scrollEnabled={true}
                  data={filteredStudents}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item: student }) => (
                    <TouchableOpacity
                      onPress={() => handleToggleStudent(student._id)}
                      className={`p-3 border-b flex-row items-center ${
                        isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600"
                        : "bg-white border-gray-200"
                      }`}
                    >
                    <Checkbox
                      value={selectedStudents.includes(student._id)}
                      onValueChange={() =>
                      handleToggleStudent(student._id)
                      }
                      color={
                      selectedStudents.includes(student._id)
                        ? "#3B82F6"
                        : undefined
                      }
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-inter_semibold ${
                          isDarkMode
                          ? "text-[#E0E0E0]"
                          : "text-[#111827]"
                        }`}
                      >
                        {student.middleName
                          ? `${student.firstName} ${student.middleName} ${student.lastName}`
                          : `${student.firstName} ${student.lastName}`}
                      </Text>
                      <Text
                        className={`text-xs font-inter_regular ${
                          isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                        }`}
                      >
                        {student.email}
                      </Text>
                    </View>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <View className="p-4 items-center">
                  <Text
                    className={`font-inter_regular ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    No students available
                  </Text>
                </View>
              )}
              </View>
            </ScrollView>

            {/* Buttons */}
            <View className="flex-row mt-4 gap-2">
              <TouchableOpacity
                onPress={handleSaveSection}
                className="bg-[#3B82F6] p-3 rounded-xl flex-1 items-center"
              >
                <Text className="text-white font-inter_semibold text-base">
                  {editingSection ? "Update Section" : "Create Section"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSectionModalVisible(false)}
                className="bg-gray-500 p-3 rounded-xl flex-1 items-center"
              >
                <Text className="text-white font-inter_semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SubjectsWeb;