// subjects.web.tsx
import apiClient from "@/app/services/apiClient";
import { Subject } from "@/app/types/index";
import ContextMenu from "@/components/ContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  memo,
} from "react";
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
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MoreVertIcon from "@/assets/icons/more_vert.svg";
import DeleteIcon from "@/assets/icons/delete.svg";
import * as DocumentPicker from "expo-document-picker";
import Dropdown, { DropdownItem } from "@/components/Dropdown";
import {
  formatSubjectDisplay,
  normalizeClassCodeInput,
} from "@/app/utils/subjectUtils";
import NetworkBanner from "@/components/NetworkBanner.web";

cssInterop(Image, { className: "style" });

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const ITEMS_PER_PAGE = 10;

const GRADE_LEVEL_OPTIONS: DropdownItem[] = [
  { label: "Select Grade Level", value: "" },
  { label: "Grade 1", value: "Grade 1" },
  { label: "Grade 2", value: "Grade 2" },
  { label: "Grade 3", value: "Grade 3" },
  { label: "Grade 4", value: "Grade 4" },
  { label: "Grade 5", value: "Grade 5" },
  { label: "Grade 6", value: "Grade 6" },
];

const GRADE_LEVEL_FILTER_OPTIONS: DropdownItem[] = [
  { label: "All Grade Levels", value: "" },
  { label: "Grade 1", value: "Grade 1" },
  { label: "Grade 2", value: "Grade 2" },
  { label: "Grade 3", value: "Grade 3" },
  { label: "Grade 4", value: "Grade 4" },
  { label: "Grade 5", value: "Grade 5" },
  { label: "Grade 6", value: "Grade 6" },
];

const buildSchoolYearOptions = (includeAll: boolean): DropdownItem[] => {
  const currentYear = new Date().getFullYear();
  const options: DropdownItem[] = [
    { label: includeAll ? "All School Years" : "Select School Year", value: "" },
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
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface TeacherAssignment {
  teacherId: string;
  terms: {
    1: boolean;
    2: boolean;
    3: boolean;
  };
  isAssignedToAllTerms: boolean;
}

interface SubjectForm {
  subjectName: string;
  classCode: string;
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

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */
const COLOR_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#14B8A6",
  "#EC4899",
];

const getConsistentColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
};

const getAdviserInfo = (item: Subject): string => {
  if (!item.teachers || item.teachers.length === 0) return "Not assigned";
  return (
    item.teachers
      .map((ta: any) => {
        const teacher = ta.teacher as any;
        if (!teacher) return null;
        const fullName = teacher.middleName
          ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
          : `${teacher.firstName} ${teacher.lastName}`;

        if (ta.isAssignedToAllTerms) return fullName;

        const terms: string[] = [];
        if (ta.terms?.["1"]) terms.push("1st");
        if (ta.terms?.["2"]) terms.push("2nd");
        if (ta.terms?.["3"]) terms.push("3rd");

        if (terms.length > 0) {
          return `${fullName} (${terms.join(", ")} Term${
            terms.length > 1 ? "s" : ""
          })`;
        }
        return fullName;
      })
      .filter(Boolean)
      .join(", ") || "Not assigned"
  );
};

/* ------------------------------------------------------------------ */
/*  SubjectItem — memoized row                                         */
/* ------------------------------------------------------------------ */
interface SubjectItemProps {
  item: Subject;
  isDarkMode: boolean;
  onPress: (subject: Subject) => void;
  onMenuPress: (event: any, subject: Subject) => void;
}

const SubjectItem = memo<SubjectItemProps>(
  ({ item, isDarkMode, onPress, onMenuPress }) => {
    const handlePress = useCallback(() => onPress(item), [item, onPress]);
    const handleMenuPress = useCallback(
      (event: any) => onMenuPress(event, item),
      [item, onMenuPress]
    );

    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);
    const adviserInfo = getAdviserInfo(item);

    return (
      <TouchableOpacity
        className={`rounded-xl p-4 mt-3 mx-3 border ${
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
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-row flex-1">
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

            <View className="flex-1 ml-3">
              <Text
                className={`text-lg font-inter_bold mb-1 ${
                  isDarkMode ? "text-[#F9FAFB]" : "text-[#111827]"
                }`}
                numberOfLines={1}
              >
                {formatSubjectDisplay(item)}
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

          <Pressable onPress={handleMenuPress} className="p-2">
            <MoreVertIcon
              width={20}
              height={20}
              fill={isDarkMode ? "#E0E0E0" : "#111827"}
            />
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  }
);
SubjectItem.displayName = "SubjectItem";

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const SubjectsWeb: React.FC = () => {
  document.title = "Subjects - GracEdLMS";
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();
  const { width } = useWindowDimensions();

  /* ------------------------- list data state ------------------------- */
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("");

  /* ------------------------- pagination state ------------------------ */
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<FlatList<Subject>>(null);

  /* ------------------------- network banner -------------------------- */
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  /* ------------------------- context menu ---------------------------- */
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  /* ------------------------- add/edit modal -------------------------- */
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  /* ------------------------- form fields ----------------------------- */
  const [subjectName, setSubjectName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [description, setDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [activeSchoolYear, setActiveSchoolYear] = useState<string | null>(null);
  const [setSchoolYearSelection, setSetSchoolYearSelection] = useState("");
  const [settingSchoolYear, setSettingSchoolYear] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([
    { teacherId: "", terms: { 1: false, 2: false, 3: false }, isAssignedToAllTerms: false },
  ]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  /* ------------------------- sections -------------------------------- */
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "sections">("details");

  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionGradeLevel, setSectionGradeLevel] = useState("");
  const [sectionSchoolYear, setSectionSchoolYear] = useState("");

  /* ------------------------- students/teachers ----------------------- */
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isAdminOrTeacher = user?.role === "Admin" || user?.role === "Teacher";

  /* ------------------------- memoized options ------------------------ */
  const schoolYearOptions = useMemo(() => buildSchoolYearOptions(false), []);
  const schoolYearFilterOptions = useMemo(() => buildSchoolYearOptions(true), []);

  const teacherOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [
      { label: "Select Teacher (Optional)", value: "" },
    ];
    allTeachers.forEach((teacher) => {
      const fullName = teacher.middleName
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;
      options.push({ label: fullName, value: teacher._id });
    });
    return options;
  }, [allTeachers]);

  /* ------------------------- fetch functions ------------------------- */
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

  const fetchActiveSchoolYear = useCallback(async () => {
    try {
      const response = await apiClient.get("/subjects/active-school-year");
      const year = response.data.data?.activeSchoolYear || null;
      setActiveSchoolYear(year);
      if (year) setSetSchoolYearSelection(year);
    } catch (error) {
      console.error("Failed to fetch active school year:", error);
    }
  }, []);

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

  const fetchStudents = useCallback(async () => {
    try {
      let allStudentsData: Student[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await apiClient.get(
          `/users?role=Student&status=active&page=${page}&limit=100`
        );
        const students = response.data.data || [];
        if (students.length === 0) hasMore = false;
        else {
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

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      let allSubjects: Subject[] = [];
      let page = 1;
      let hasMore = true;
  
      while (hasMore) {
        const response = await apiClient.get<{ data: Subject[] }>(
          `/subjects?page=${page}&limit=100`
        );
        const batch = response.data.data || [];
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allSubjects = [...allSubjects, ...batch];
          // If the API returns fewer than the limit, we've reached the end
          if (batch.length < 100) hasMore = false;
          else page++;
        }
      }
  
      setSubjects(allSubjects);
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.error("Failed to fetch subjects:", error);
      window.alert("Error: Failed to load subjects.");
  
      const isNetworkError =
        !error?.response ||
        error?.code === "ECONNABORTED" ||
        error?.message?.toLowerCase().includes("network") ||
        error?.message?.toLowerCase().includes("timeout");
      if (isNetworkError) {
        setForceNetworkBannerVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* ------------------------- effects --------------------------------- */
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
      fetchTeachers();
      fetchActiveSchoolYear();
    }
  }, [fetchStudents, fetchTeachers, fetchActiveSchoolYear, isAdmin]);

  useEffect(() => {
    if (gradeLevel && schoolYear && isAdmin) {
      fetchSections(gradeLevel, schoolYear);
    }
  }, [gradeLevel, schoolYear, fetchSections, isAdmin]);

  /* ------------------------- derived data ---------------------------- */
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        subject.subjectName.toLowerCase().includes(q) ||
        subject.classCode?.toLowerCase().includes(q) ||
        subject.description?.toLowerCase().includes(q) ||
        subject.section?.toLowerCase().includes(q);
      const matchesGradeLevel =
        !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear =
        !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [subjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  const displayedSubjects = useMemo(
    () => filteredSubjects.slice(0, displayedCount),
    [filteredSubjects, displayedCount]
  );

  const hasMore = displayedCount < filteredSubjects.length;

  /* ------------------------- reset pagination on filter change ------- */
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch {}
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear]);

  /* ------------------------- infinite scroll ------------------------- */
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Small delay so the footer spinner is perceivable
    setTimeout(() => {
      setDisplayedCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, filteredSubjects.length)
      );
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredSubjects.length]);

  /* ------------------------- section derived ------------------------- */
  const availableSections = useMemo(() => {
    return sections.filter(
      (s) => s.gradeLevel === gradeLevel && s.schoolYear === schoolYear
    );
  }, [sections, gradeLevel, schoolYear]);

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

  /* ------------------------- filtered students ----------------------- */
  const filteredStudents = useMemo(() => {
    const notSelected = allStudents.filter(
      (s) => !selectedStudents.includes(s._id)
    );
    if (!studentSearchQuery.trim()) return notSelected;
    const q = studentSearchQuery.toLowerCase();
    return notSelected.filter(
      (student) =>
        student.firstName?.toLowerCase().includes(q) ||
        student.lastName?.toLowerCase().includes(q) ||
        student.middleName?.toLowerCase().includes(q) ||
        student.email?.toLowerCase().includes(q) ||
        student.userId?.toLowerCase().includes(q)
    );
  }, [allStudents, studentSearchQuery, selectedStudents]);

  /* ------------------------- handlers -------------------------------- */
  const handleSetActiveSchoolYear = useCallback(async () => {
    if (!setSchoolYearSelection) {
      window.alert("Please select a school year to set.");
      return;
    }
    try {
      setSettingSchoolYear(true);
      const response = await apiClient.put("/subjects/active-school-year", {
        schoolYear: setSchoolYearSelection,
      });
      const year = response.data.data?.activeSchoolYear || setSchoolYearSelection;
      setActiveSchoolYear(year);
      window.alert(response.data.message || `Active school year set to ${year}`);
    } catch (error: any) {
      console.error("Failed to set active school year:", error);
      window.alert(
        error.response?.data?.message || "Failed to set active school year."
      );
    } finally {
      setSettingSchoolYear(false);
    }
  }, [setSchoolYearSelection]);

  const handleSectionChange = useCallback(
    (value: string) => {
      if (value === "__create_new__") {
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
      } else {
        setSection(value);
        setSelectedSection(value);
      }
    },
    [gradeLevel, schoolYear]
  );

  const handleOpenSectionModal = useCallback(() => {
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
  }, [gradeLevel, schoolYear]);

  const handleEditSection = useCallback((sec: Section) => {
    setEditingSection(sec);
    setNewSectionName(sec.sectionName);
    setSectionGradeLevel(sec.gradeLevel);
    setSectionSchoolYear(sec.schoolYear);
    setSelectedStudents(sec.students.map((s) => s._id));
    setStudentSearchQuery("");
    setSectionModalVisible(true);
  }, []);

  const handleSaveSection = useCallback(async () => {
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
        "Error: " + (error.response?.data?.message || "Failed to save section")
      );
    }
  }, [
    newSectionName,
    sectionGradeLevel,
    sectionSchoolYear,
    selectedStudents,
    editingSection,
    fetchSections,
    gradeLevel,
    schoolYear,
  ]);

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
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
    },
    [fetchSections, gradeLevel, schoolYear]
  );

  const handleToggleStudent = useCallback((studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  const handleAddSubject = useCallback(() => {
    setIsEditing(false);
    setCurrentSubject(null);
    setSubjectName("");
    setClassCode("");
    setDescription("");
    setGradeLevel("");
    setSection("");
    setSchoolYear("");
    setTeacherAssignments([
      { teacherId: "", terms: { 1: false, 2: false, 3: false }, isAssignedToAllTerms: false },
    ]);
    setSelectedImage(null);
    setActiveTab("details");
    setModalVisible(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
    setSelectedSubject(null);
  }, []);

  const handleEditSubject = useCallback((subject: Subject) => {
    setIsEditing(true);
    setCurrentSubject(subject);
    setSubjectName(subject.subjectName);
    setClassCode(subject.classCode || "");
    setDescription(subject.description || "");
    setGradeLevel(subject.gradeLevel || "");
    setSection(subject.section || "");
    setSchoolYear(subject.schoolYear || "");

    const assignments: TeacherAssignment[] = (subject.teachers || []).map(
      (ta: any) => ({
        teacherId: ta.teacher?._id || "",
        terms: ta.terms || { 1: false, 2: false, 3: false },
        isAssignedToAllTerms: ta.isAssignedToAllTerms || false,
      })
    );

    setTeacherAssignments(
      assignments.length > 0
        ? assignments
        : [
            {
              teacherId: "",
              terms: { 1: false, 2: false, 3: false },
              isAssignedToAllTerms: false,
            },
          ]
    );
    setSelectedImage(null);
    setActiveTab("details");
    setModalVisible(true);
    setMenuVisible(false);
    setSelectedSubject(null);
  }, []);

  const handleTeacherChange = useCallback((index: number, teacherId: string) => {
    setTeacherAssignments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], teacherId };
      return updated;
    });
  }, []);

  const handleTermChange = useCallback(
    (index: number, term: "1" | "2" | "3") => {
      setTeacherAssignments((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          terms: {
            ...updated[index].terms,
            [term]: !updated[index].terms[term],
          },
        };
        return updated;
      });
    },
    []
  );

  const handleAllTermsToggle = useCallback((index: number) => {
    setTeacherAssignments((prev) => {
      const updated = [...prev];
      const isAll = !updated[index].isAssignedToAllTerms;
      updated[index] = {
        ...updated[index],
        isAssignedToAllTerms: isAll,
        terms: isAll ? { 1: true, 2: true, 3: true } : updated[index].terms,
      };
      return updated;
    });
  }, []);

  const handleAddTeacherRow = useCallback(() => {
    setTeacherAssignments((prev) => [
      ...prev,
      {
        teacherId: "",
        terms: { 1: false, 2: false, 3: false },
        isAssignedToAllTerms: false,
      },
    ]);
  }, []);

  const handleRemoveTeacherRow = useCallback((index: number) => {
    setTeacherAssignments((prev) => {
      if (prev.length === 1) {
        window.alert("At least one teacher assignment is required");
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUploadImage = useCallback(
    async (subjectId: string, imageUri: string) => {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append("subjectImage", blob, "subject-image.jpg");

        await apiClient.put(`/subjects/${subjectId}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        window.alert("Success: Subject image uploaded successfully");
        setSelectedImage(null);
        fetchSubjects();
      } catch (error: any) {
        console.error("Error uploading image:", error);
        window.alert(
          "Error: " +
            (error.response?.data?.message || "Failed to upload image")
        );
      } finally {
        setUploadingImage(false);
      }
    },
    [fetchSubjects]
  );

  const handleSubmit = useCallback(async () => {
    if (!teacherAssignments.some((ta) => ta.teacherId.trim())) {
      window.alert("Error: Please assign at least one teacher");
      return;
    }

    const validAssignments = teacherAssignments.filter(
      (ta) =>
        ta.teacherId.trim() &&
        (ta.isAssignedToAllTerms || Object.values(ta.terms).some((t) => t))
    );

    if (validAssignments.length === 0) {
      window.alert("Error: Each teacher must be assigned to at least one term");
      return;
    }

    if (!classCode.trim()) {
      window.alert("Error: Class code is required.");
      return;
    }

    if (classCode.trim().length > 12) {
      window.alert("Error: Class code must be at most 12 characters.");
      return;
    }

    const formData: SubjectForm = {
      subjectName,
      classCode: classCode.trim().toUpperCase(),
      description,
      gradeLevel,
      section,
      schoolYear,
      teachers: validAssignments,
    };

    try {
      if (isEditing && currentSubject) {
        const response = await apiClient.put(
          `/subjects/${currentSubject._id}`,
          formData
        );
        const updated = response.data.data;
        window.alert(
          `Success: ${formatSubjectDisplay(
            updated || {
              classCode: formData.classCode,
              subjectName: formData.subjectName,
            }
          )}`
        );
      } else {
        const response = await apiClient.post("/subjects", formData);
        if (selectedImage && response.data.data?._id) {
          await handleUploadImage(response.data.data._id, selectedImage);
        }
        const created = response.data.data;
        window.alert(`Success: ${formatSubjectDisplay(created)}`);
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
      if (
        backendErrorMessage?.includes("Class code already exists") ||
        (backendErrorMessage?.includes("Duplicate field value entered") &&
          backendErrorMessage?.includes("classCode"))
      ) {
        window.alert(
          "Error: Class code already exists. Please use a different code."
        );
      } else {
        window.alert(
          "Error: " + (backendErrorMessage || "Failed to save subject.")
        );
      }
    }
  }, [
    teacherAssignments,
    classCode,
    subjectName,
    description,
    gradeLevel,
    section,
    schoolYear,
    isEditing,
    currentSubject,
    selectedImage,
    handleUploadImage,
    fetchSubjects,
  ]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      window.alert("Error: Failed to pick image");
    }
  }, []);

  const handleDeleteImage = useCallback(
    async (subjectId: string) => {
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
          "Error: " +
            (error.response?.data?.message || "Failed to delete image")
        );
      }
    },
    [fetchSubjects]
  );

  const handleDeleteSubject = useCallback(
    async (subjectId: string) => {
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
        window.alert(
          "Error: " +
            (error.response?.data?.message || "Failed to delete subject.")
        );
      }
    },
    [handleCloseMenu, fetchSubjects]
  );

  const handleOpenMenu = useCallback((event: any, subject: Subject) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setSelectedSubject(subject);
    setMenuVisible(true);
  }, []);

  const handleViewSubject = useCallback(
    (subject: Subject) => {
      router.push(`/subjects/${subject._id}` as any);
    },
    [router]
  );

  const handleViewingSubjectTab = useCallback((tab: "details" | "sections") => {
    setActiveTab(tab);
  }, []);

  const handleCloseSubjectModal = useCallback(() => {
    setModalVisible(false);
    setSelectedImage(null);
    setActiveTab("details");
  }, []);

  /* ------------------------- renderers ------------------------------- */
  const renderSubjectItem = useCallback(
    ({ item }: { item: Subject }) => (
      <SubjectItem
        item={item}
        isDarkMode={isDarkMode}
        onPress={handleViewSubject}
        onMenuPress={handleOpenMenu}
      />
    ),
    [isDarkMode, handleViewSubject, handleOpenMenu]
  );

  /* ------------------------- context menu items ---------------------- */
  const menuItems = useMemo(
    () => [
      {
        label: "Edit Subject",
        onPress: () => selectedSubject && handleEditSubject(selectedSubject),
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
        onPress: () =>
          selectedSubject && handleDeleteSubject(selectedSubject._id),
        icon: (
          <DeleteIcon
            width={20}
            height={20}
            style={{ marginRight: 8 }}
            fill="#EF4444"
          />
        ),
      },
    ],
    [selectedSubject, isDarkMode, handleEditSubject, handleDeleteSubject]
  );

  /* ------------------------- list header ----------------------------- */
  const listHeader = useMemo(
    () => (
      <View
        className={`px-5 pt-5 pb-4 border-b ${
          isDarkMode
            ? "bg-[#1E1E1E] border-[#333333]"
            : "bg-white border-[#E5E7EB]"
        }`}
      >
        <View className="flex-row justify-between items-center">
          <View style={{ flex: 1 }}>
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
              Showing {displayedSubjects.length} of {filteredSubjects.length}{" "}
              subjects
            </Text>
          </View>

          <View className="flex-row gap-1">
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
              className="bg-[#10B981] px-4 py-2 rounded-lg justify-center items-center h-[45px]"
            >
              <Text className="text-white font-inter_semibold">Search</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text
                className={`text-xs font-inter_medium mb-1 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-[#6B7280]"
                }`}
              >
                Grade Level
              </Text>
              <Dropdown
                data={GRADE_LEVEL_FILTER_OPTIONS}
                selectedValue={selectedGradeLevel}
                onValueChange={setSelectedGradeLevel}
                placeholder="All Grade Levels"
              />
            </View>

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
    ),
    [
      isDarkMode,
      displayedSubjects.length,
      filteredSubjects.length,
      isAdminOrTeacher,
      width,
      loading,
      searchQuery,
      selectedGradeLevel,
      selectedSchoolYear,
      schoolYearFilterOptions,
      handleAddSubject,
      fetchSubjects,
    ]
  );

  /* ------------------------- list empty ------------------------------ */
  const listEmpty = useMemo(
    () => (
      <View className="justify-center items-center p-10" style={{ minHeight: 300 }}>
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
    ),
    [isDarkMode, searchQuery, selectedGradeLevel, selectedSchoolYear]
  );

  /* ------------------------- list footer ----------------------------- */
  const listFooter = useMemo(
    () => (
      <View className="py-5 items-center">
        {isLoadingMore ? (
          <>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text
              className={`mt-2 text-xs font-inter_regular ${
                isDarkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
              }`}
            >
              Loading more subjects...
            </Text>
          </>
        ) : !hasMore && filteredSubjects.length > ITEMS_PER_PAGE ? (
          <Text
            className={`text-xs font-inter_regular ${
              isDarkMode ? "text-[#6B7280]" : "text-[#9CA3AF]"
            }`}
          >
            All {filteredSubjects.length} subjects loaded
          </Text>
        ) : null}
      </View>
    ),
    [
      isLoadingMore,
      isDarkMode,
      hasMore,
      filteredSubjects.length,
    ]
  );

  /* ------------------------- early returns --------------------------- */
  if (isLoading || loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? "bg-[#1A1A1A]" : "bg-[#F9FAFB]"
        }`}
      >
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchSubjects}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
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

  /* ------------------------- main render ----------------------------- */
  return (
    <View className={`flex-1 ${isDarkMode ? "bg-[#1A1A1A]" : "bg-[#F9FAFB]"}`}>
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchSubjects}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Entire screen scrolls as one unit */}
      <FlatList
        ref={listRef}
        data={displayedSubjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={ITEMS_PER_PAGE}
        maxToRenderPerBatch={ITEMS_PER_PAGE}
        windowSize={7}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />

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
        transparent
        visible={modalVisible}
        onRequestClose={handleCloseSubjectModal}
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
                onPress={() => handleViewingSubjectTab("details")}
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
                  onPress={() => handleViewingSubjectTab("sections")}
                  className={`flex-1 py-3 ${
                    activeTab === "sections" ? "border-b-2 border-blue-500" : ""
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

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {activeTab === "details" ? (
                <>
                  {/* Subject Image */}
                  <Text
                    className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Subject Image (Optional)
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

                  {/* Class Code */}
                  <Text
                    className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Class Code <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className={`font-inter_regular border rounded-lg p-3 mb-2 ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="e.g. SCIBIOG06"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                    value={classCode}
                    onChangeText={(text) =>
                      setClassCode(normalizeClassCodeInput(text))
                    }
                    maxLength={12}
                    autoCapitalize="characters"
                  />
                  <Text
                    className={`font-inter_regular text-xs mb-4 ml-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Max 12 characters. Letters and numbers only.
                  </Text>

                  {/* Subject Name */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Subject Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className={`font-inter_regular border rounded-lg p-3 mb-4 ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="e.g. Science Biology 6"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                    value={subjectName}
                    onChangeText={setSubjectName}
                  />

                  {/* Teacher Assignments */}
                  <Text
                    className={`font-inter_bold ml-1 mb-3 text-base ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Assign Teachers <Text className="text-red-500">*</Text>
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
                          <View className="flex-row items-center mb-3 p-2 rounded-lg bg-opacity-50">
                            <Checkbox
                              value={assignment.isAssignedToAllTerms}
                              onValueChange={() => handleAllTermsToggle(index)}
                              color={
                                assignment.isAssignedToAllTerms
                                  ? "#3B82F6"
                                  : undefined
                              }
                            />
                            <Text
                              className={`ml-2 font-inter_semibold ${
                                isDarkMode ? "text-[#E0E0E0]" : "text-black"
                              }`}
                            >
                              Assign to All Terms
                            </Text>
                          </View>

                          {!assignment.isAssignedToAllTerms && (
                            <>
                              <Text
                                className={`font-inter_semibold mb-2 text-sm ${
                                  isDarkMode
                                    ? "text-[#9CA3AF]"
                                    : "text-gray-600"
                                }`}
                              >
                                Select Terms:
                              </Text>

                              <View className="space-y-2">
                                {(["1", "2", "3"] as const).map((term) => (
                                  <View
                                    key={term}
                                    className="flex-row items-center"
                                  >
                                    <Checkbox
                                      value={assignment.terms[term]}
                                      onValueChange={() =>
                                        handleTermChange(index, term)
                                      }
                                      color={
                                        assignment.terms[term]
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
                                      {term === "1" && "1st Term"}
                                      {term === "2" && "2nd Term"}
                                      {term === "3" && "3rd Term"}
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
                    Grade Level <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="mb-3">
                    <Dropdown
                      data={GRADE_LEVEL_OPTIONS}
                      selectedValue={gradeLevel}
                      onValueChange={setGradeLevel}
                      placeholder="Select Grade Level"
                    />
                  </View>

                  {/* Set School Year (admin only) */}
                  {isAdmin && (
                    <View className="mb-4">
                      <Text
                        className={`font-inter_semibold ml-1 mb-2 ${
                          isDarkMode ? "text-[#E0E0E0]" : "text-black"
                        }`}
                      >
                        Set School Year
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Dropdown
                            data={schoolYearOptions}
                            selectedValue={setSchoolYearSelection}
                            onValueChange={setSetSchoolYearSelection}
                            placeholder="Select School Year"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={handleSetActiveSchoolYear}
                          disabled={
                            settingSchoolYear || !setSchoolYearSelection
                          }
                          className={`px-4 py-3 rounded-lg ${
                            settingSchoolYear || !setSchoolYearSelection
                              ? "bg-gray-400"
                              : "bg-blue-500"
                          }`}
                        >
                          <Text className="text-white font-inter_semibold">
                            {settingSchoolYear ? "Setting..." : "Set"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        className={`font-inter_regular text-xs mt-2 ml-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {activeSchoolYear
                          ? `Active school year for teachers: ${activeSchoolYear}`
                          : "No active school year set. Teachers can choose any school year."}
                      </Text>
                    </View>
                  )}

                  {/* School Year */}
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    School Year <Text className="text-red-500">*</Text>
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
                    Section <Text className="text-red-500">*</Text>
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
                  {/* Sections tab */}
                  <Text
                    className={`font-inter_bold text-lg mb-4 ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    Manage Sections
                  </Text>

                  {!gradeLevel || !schoolYear ? (
                    <View
                      className={`p-4 rounded-lg border ${
                        isDarkMode
                          ? "bg-[#2A2A2A] border-gray-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      <Text
                        className={`font-inter_regular ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Please select grade level and school year first on the
                        Subject Details tab
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
                                <Text
                                  className={`font-inter_bold ${
                                    isDarkMode
                                      ? "text-[#E0E0E0]"
                                      : "text-black"
                                  }`}
                                >
                                  {sec.sectionName}
                                </Text>
                                <Text
                                  className={`text-sm font-inter_regular ${
                                    isDarkMode
                                      ? "text-[#9CA3AF]"
                                      : "text-[#6B7280]"
                                  }`}
                                >
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
                        <View
                          className={`p-4 rounded-lg border ${
                            isDarkMode
                              ? "bg-[#2A2A2A] border-gray-600"
                              : "bg-gray-100 border-gray-300"
                          }`}
                        >
                          <Text
                            className={`font-inter_regular text-center ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            No sections available. Create one to get started.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            {/* Modal buttons */}
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
                onPress={handleCloseSubjectModal}
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
        transparent
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
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Section Name <Text className="text-red-500">*</Text>
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

              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Students ({selectedStudents.length}){" "}
                <Text className="text-red-500">*</Text>
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

              <View
                className={`border rounded-lg max-h-[300px] ${
                  isDarkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                {filteredStudents.length > 0 ? (
                  <FlatList
                    scrollEnabled
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
                              isDarkMode
                                ? "text-[#9CA3AF]"
                                : "text-[#6B7280]"
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