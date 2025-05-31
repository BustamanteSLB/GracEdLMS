import React, { useState, useEffect } from 'react'
import { Text, View, useColorScheme, TouchableOpacity, Modal, TextInput, FlatList, Platform, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'

const randomColor = () => {
  const colors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#F59E42'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const LOCAL_STORAGE_KEY = 'gracedlms_courses';

const CoursesWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  const [modalVisible, setModalVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [courseData, setCourseData] = useState({
    name: '',
    section: '',
    schoolYear: '',
    adviser: '',
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [memberInput, setMemberInput] = useState('');
  const [addMemberIndex, setAddMemberIndex] = useState<number | null>(null);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [announceIndex, setAnnounceIndex] = useState<number | null>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [assignmentInput, setAssignmentInput] = useState({ title: '', description: '', dueDate: '', dueTime: '' });
  const [assignmentIndex, setAssignmentIndex] = useState<number | null>(null);
  const [channelModalVisible, setChannelModalVisible] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [channelIndex, setChannelIndex] = useState<number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [openChannelFeed, setOpenChannelFeed] = useState<{ [courseId: number]: string | null }>({});
  const [assignmentChannel, setAssignmentChannel] = useState('');
  const [editAssignment, setEditAssignment] = useState<{ channel: string, idx: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ courseIdx: number, channel: string, idx: number } | null>(null);
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<number | null>(null);

  // Load courses from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      setCourses(JSON.parse(stored));
    }
  }, []);

  // Save courses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  const handleInput = (field: string, value: string) => {
    setCourseData({ ...courseData, [field]: value });
  };

  const handleSubmit = () => {
    setCourses([
      ...courses,
      {
        ...courseData,
        color: randomColor(),
        id: Date.now(),
        members: [],
      },
    ]);
    setModalVisible(false);
    setCourseData({ name: '', section: '', schoolYear: '', adviser: '' });
  };

  const handleMenuToggle = (index: number) => {
    setMenuOpenIndex(menuOpenIndex === index ? null : index);
  };

  const handleDelete = (id: number) => {
    setDeleteCourseConfirm(id);
    setMenuOpenIndex(null);
  };

  const confirmDeleteCourse = () => {
    if (deleteCourseConfirm !== null) {
      setCourses(courses.filter(course => course.id !== deleteCourseConfirm));
      setDeleteCourseConfirm(null);
    }
  };

  const cancelDeleteCourse = () => setDeleteCourseConfirm(null);

  // Manage Course
  const openManageModal = (index: number) => {
    setEditIndex(index);
    setCourseData({
      name: courses[index].name,
      section: courses[index].section,
      schoolYear: courses[index].schoolYear,
      adviser: courses[index].adviser,
    });
    setManageModalVisible(true);
    setMenuOpenIndex(null);
  };

  const handleManageSave = () => {
    if (editIndex !== null) {
      const updated = [...courses];
      updated[editIndex] = {
        ...updated[editIndex],
        ...courseData,
      };
      setCourses(updated);
      setManageModalVisible(false);
      setEditIndex(null);
      setCourseData({ name: '', section: '', schoolYear: '', adviser: '' });
    }
  };

  // Add Member
  const openAddMemberModal = (index: number) => {
    setAddMemberIndex(index);
    setMemberInput('');
    setAddMemberModalVisible(true);
    setMenuOpenIndex(null);
  };

  const handleAddMember = () => {
    if (addMemberIndex !== null && memberInput.trim() !== '') {
      const updated = [...courses];
      if (!updated[addMemberIndex].members) updated[addMemberIndex].members = [];
      updated[addMemberIndex].members.push(memberInput.trim());
      setCourses(updated);
      setAddMemberModalVisible(false);
      setAddMemberIndex(null);
      setMemberInput('');
    }
  };

  const handleToggleLock = (index: number) => {
    const updated = [...courses];
    updated[index].locked = !updated[index].locked;
    setCourses(updated);
  };

  // Add Channel
  const openChannelModal = (index: number) => {
    setChannelIndex(index);
    setChannelInput('');
    setChannelModalVisible(true);
    setMenuOpenIndex(null);
  };

  const handleAddChannel = () => {
    if (channelIndex !== null && channelInput.trim() !== '') {
      const updated = [...courses];
      if (!updated[channelIndex].channels) updated[channelIndex].channels = [];
      updated[channelIndex].channels.push(channelInput.trim());
      setCourses(updated);
      setChannelModalVisible(false);
      setChannelIndex(null);
      setChannelInput('');
    }
  };

  // Announcement
  const openAnnouncementModal = (index: number) => {
    setAnnounceIndex(index);
    setAnnouncementInput('');
    setSelectedChannel(courses[index].channels && courses[index].channels.length > 0 ? courses[index].channels[0] : '');
    setAnnouncementModalVisible(true);
    setMenuOpenIndex(null);
  };

  const handleSaveAnnouncement = () => {
    if (announceIndex !== null && selectedChannel) {
      const updated = [...courses];
      if (!updated[announceIndex].announcements) updated[announceIndex].announcements = {};
      updated[announceIndex].announcements[selectedChannel] = announcementInput;
      setCourses(updated);
      setAnnouncementModalVisible(false);
      setAnnounceIndex(null);
      setAnnouncementInput('');
      setSelectedChannel('');
    }
  };

  // Assignment
  const openAssignmentModal = (index: number, channel?: string, assignmentIdx?: number) => {
    setAssignmentIndex(index);
    const course = courses[index];
    if (channel && assignmentIdx !== undefined && course.assignments && course.assignments[channel]) {
      // Editing existing assignment
      const assignment = course.assignments[channel][assignmentIdx];
      setAssignmentInput({
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate || '',
        dueTime: assignment.dueTime || '',
      });
      setAssignmentChannel(channel);
      setEditAssignment({ channel, idx: assignmentIdx });
    } else {
      // New assignment
      setAssignmentInput({ title: '', description: '', dueDate: '', dueTime: '' });
      setAssignmentChannel(course.channels && course.channels.length > 0 ? course.channels[0] : '');
      setEditAssignment(null);
    }
    setAssignmentModalVisible(true);
    setMenuOpenIndex(null);
  };

  const handleSaveAssignment = () => {
    if (assignmentIndex !== null && assignmentChannel) {
      const updated = [...courses];
      if (!updated[assignmentIndex].assignments) updated[assignmentIndex].assignments = {};
      if (!updated[assignmentIndex].assignments[assignmentChannel]) updated[assignmentIndex].assignments[assignmentChannel] = [];
      if (editAssignment) {
        // Edit existing
        updated[assignmentIndex].assignments[assignmentChannel][editAssignment.idx] = {
          ...assignmentInput,
          date: new Date().toLocaleDateString(),
        };
      } else {
        // Add new
        updated[assignmentIndex].assignments[assignmentChannel].push({
          ...assignmentInput,
          date: new Date().toLocaleDateString(),
        });
      }
      setCourses(updated);
      setAssignmentModalVisible(false);
      setAssignmentIndex(null);
      setAssignmentInput({ title: '', description: '', dueDate: '', dueTime: '' });
      setAssignmentChannel('');
      setEditAssignment(null);
    }
  };

  const handleDeleteAssignment = (courseIdx: number, channel: string, idx: number) => {
    setDeleteConfirm({ courseIdx, channel, idx });
  };

  const confirmDeleteAssignment = () => {
    if (deleteConfirm) {
      const updated = [...courses];
      if (updated[deleteConfirm.courseIdx].assignments && updated[deleteConfirm.courseIdx].assignments[deleteConfirm.channel]) {
        updated[deleteConfirm.courseIdx].assignments[deleteConfirm.channel].splice(deleteConfirm.idx, 1);
        setCourses(updated);
      }
      setDeleteConfirm(null);
    }
  };

  const cancelDeleteAssignment = () => setDeleteConfirm(null);

  // Channel feed open/close
  const handleChannelClick = (courseId: number, channel: string) => {
    setOpenChannelFeed((prev) => ({ ...prev, [courseId]: prev[courseId] === channel ? null : channel }));
  };

  // Edit announcement
  const handleEditAnnouncement = (courseIdx: number, channel: string) => {
    setAnnounceIndex(courseIdx);
    setAnnouncementInput(courses[courseIdx].announcements?.[channel] || '');
    setSelectedChannel(channel);
    setAnnouncementModalVisible(true);
    setMenuOpenIndex(null);
  };

  // Delete announcement
  const handleDeleteAnnouncement = (courseIdx: number, channel: string) => {
    const updated = [...courses];
    if (updated[courseIdx].announcements) {
      delete updated[courseIdx].announcements[channel];
      setCourses(updated);
    }
  };

  return (
    <View style={{ minHeight: Platform.OS === 'web' ? Dimensions.get('window').height : undefined, backgroundColor: isDarkMode ? '#121212' : '#fff' }}>
      <View style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', marginTop: 32, marginLeft: 32, marginBottom: 16 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#8B5CF6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>+ Add Course</Text>
        </TouchableOpacity>
      </View>
      <SafeAreaView style={{ flex: 1, width: '100%' }}>
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={{ padding: 32, gap: 32 }}
          columnWrapperStyle={{ gap: 32 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: isDarkMode ? '#E0E0E0' : '#333', fontSize: 20, marginTop: 80 }}>
              No courses yet. Click "+ Add Course" to create one.
            </Text>
          }
          renderItem={({ item, index }) => (
            <View style={{ backgroundColor: isDarkMode ? '#232323' : '#fff', borderRadius: 16, padding: 20, width: 420, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, position: 'relative', display: 'flex', flexDirection: 'row', gap: 0 }}>
              {/* Channel Sidebar */}
              {item.channels && item.channels.length > 0 && (
                <View style={{ width: 110, marginRight: 16, borderRightWidth: 1, borderRightColor: isDarkMode ? '#333' : '#eee', paddingRight: 8 }}>
                  <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>Channels</Text>
                  {item.channels.map((ch: string) => (
                    <TouchableOpacity key={ch} onPress={() => handleChannelClick(item.id, ch)} style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: openChannelFeed[item.id] === ch ? '#8B5CF6' : 'transparent', marginBottom: 4 }}>
                      <Text style={{ color: openChannelFeed[item.id] === ch ? '#fff' : (isDarkMode ? '#fff' : '#222'), fontWeight: openChannelFeed[item.id] === ch ? 'bold' : 'normal' }}># {ch}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Main Card Content */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: item.color, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22 }}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: isDarkMode ? '#fff' : '#222' }}>{item.name}</Text>
                    <Text style={{ color: isDarkMode ? '#A3A3A3' : '#666', fontSize: 15 }}>{item.section}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleMenuToggle(index)} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 22, color: isDarkMode ? '#fff' : '#333' }}>⋮</Text>
                  </TouchableOpacity>
                  {menuOpenIndex === index && (
                    <View style={{ position: 'absolute', top: 8, right: -230, backgroundColor: isDarkMode ? '#232323' : '#fff', borderRadius: 8, padding: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, zIndex: 20, minWidth: 230, marginTop: 8, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#eee' }}>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => handleDelete(item.id)}>
                        <Text style={{ color: '#dc2626', fontSize: 20, marginRight: 12 }}>🗑️</Text>
                        <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 16 }}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => openAssignmentModal(index)}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>📄</Text>
                        <Text style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 16 }}>Assignment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => openAnnouncementModal(index)}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>📢</Text>
                        <Text style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 16 }}>Announcement</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => openManageModal(index)}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>✏️</Text>
                        <Text style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 16 }}>Manage</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => openAddMemberModal(index)}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>👥</Text>
                        <Text style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 16 }}>Add Member</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => openChannelModal(index)}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>#</Text>
                        <Text style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 16 }}>Add Channel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 16, marginTop: 8 }}>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => openAnnouncementModal(index)}>
                    <Text role="img" aria-label="announcement" style={{ fontSize: 20 }}>📢</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => openAssignmentModal(index)}>
                    <Text role="img" aria-label="assignment" style={{ fontSize: 20 }}>📄</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => openManageModal(index)}>
                    <Text role="img" aria-label="edit" style={{ fontSize: 20 }}>✏️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 13, marginTop: 10 }}>School Year: {item.schoolYear}</Text>
                {/* Channel Feed */}
                {item.channels && openChannelFeed[item.id] && openChannelFeed[item.id] !== null && (
                  <View style={{ marginTop: 16, backgroundColor: isDarkMode ? '#18181b' : '#f4f4f4', borderRadius: 10, padding: 16, minHeight: 80 as number }}>
                    <Text style={{ color: '#8B5CF6', fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}># {openChannelFeed[item.id]} {openChannelFeed[item.id] === 'Announcement' ? 'Announcements' : openChannelFeed[item.id] === 'Assignment' ? 'Assignments' : ''}</Text>
                    {/* Show only announcements if channel is Announcement */}
                    {openChannelFeed[item.id] === 'Announcement' && (
                      item.announcements && item.announcements['Announcement'] ? (
                        <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: isDarkMode ? '#fff' : '#222', fontSize: 15 }}>{item.announcements['Announcement']}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                            <TouchableOpacity onPress={() => handleEditAnnouncement(index, 'Announcement')} style={{ marginRight: 8 }}>
                              <Text style={{ fontSize: 18, color: '#8B5CF6' }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteAnnouncement(index, 'Announcement')}>
                              <Text style={{ fontSize: 18, color: '#dc2626' }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 14 }}>No announcements yet for this channel.</Text>
                      )
                    )}
                    {/* Show only assignments if channel is Assignment */}
                    {openChannelFeed[item.id] === 'Assignment' && (
                      item.assignments && item.assignments['Assignment'] && item.assignments['Assignment'].length > 0 ? (
                        <View style={{ marginTop: 12 }}>
                          {item.assignments['Assignment'].map((assignment: any, aIdx: number) => (
                            <View key={aIdx} style={{ backgroundColor: isDarkMode ? '#232323' : '#fff', borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: isDarkMode ? '#fff' : '#222', fontWeight: 'bold', fontSize: 15 }}>{assignment.title}</Text>
                                <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', fontSize: 14 }}>{assignment.description}</Text>
                                <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 12, marginTop: 2 }}>
                                  {assignment.dueDate && assignment.dueTime ? `Due: ${assignment.dueDate} ${assignment.dueTime}` : assignment.dueDate ? `Due: ${assignment.dueDate}` : assignment.date}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                                <TouchableOpacity onPress={() => openAssignmentModal(index, 'Assignment', aIdx)} style={{ marginRight: 8 }}>
                                  <Text style={{ fontSize: 18, color: '#8B5CF6' }}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteAssignment(index, 'Assignment', aIdx)}>
                                  <Text style={{ fontSize: 18, color: '#dc2626' }}>🗑️</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 14 }}>No assignments yet for this channel.</Text>
                      )
                    )}
                    {/* For other channels, show both (default) */}
                    {openChannelFeed[item.id] !== 'Announcement' && openChannelFeed[item.id] !== 'Assignment' && (
                      <>
                        {/* Announcements */}
                        {item.announcements && item.announcements[openChannelFeed[item.id] as string] ? (
                          <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: isDarkMode ? '#fff' : '#222', fontSize: 15 }}>{item.announcements[openChannelFeed[item.id] as string]}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                              <TouchableOpacity onPress={() => handleEditAnnouncement(index, openChannelFeed[item.id] as string)} style={{ marginRight: 8 }}>
                                <Text style={{ fontSize: 18, color: '#8B5CF6' }}>✏️</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteAnnouncement(index, openChannelFeed[item.id] as string)}>
                                <Text style={{ fontSize: 18, color: '#dc2626' }}>🗑️</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 14 }}>No announcements yet for this channel.</Text>
                        )}
                        {/* Assignments */}
                        {item.assignments && item.assignments[openChannelFeed[item.id] as string] && item.assignments[openChannelFeed[item.id] as string].length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <Text style={{ color: '#8B5CF6', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Assignments</Text>
                            {item.assignments[openChannelFeed[item.id] as string].map((assignment: any, aIdx: number) => (
                              <View key={aIdx} style={{ backgroundColor: isDarkMode ? '#232323' : '#fff', borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: isDarkMode ? '#fff' : '#222', fontWeight: 'bold', fontSize: 15 }}>{assignment.title}</Text>
                                  <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', fontSize: 14 }}>{assignment.description}</Text>
                                  <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 12, marginTop: 2 }}>
                                    {assignment.dueDate && assignment.dueTime ? `Due: ${assignment.dueDate} ${assignment.dueTime}` : assignment.dueDate ? `Due: ${assignment.dueDate}` : assignment.date}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                                  <TouchableOpacity onPress={() => openAssignmentModal(index, openChannelFeed[item.id] as string, aIdx)} style={{ marginRight: 8 }}>
                                    <Text style={{ fontSize: 18, color: '#8B5CF6' }}>✏️</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteAssignment(index, 'Assignment', aIdx)}>
                                    <Text style={{ fontSize: 18, color: '#dc2626' }}>🗑️</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
                {/* Members */}
                {item.members && item.members.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: isDarkMode ? '#A3A3A3' : '#888', fontSize: 13, fontWeight: 'bold' }}>Members:</Text>
                    {item.members.map((member: string, idx: number) => (
                      <Text key={idx} style={{ color: isDarkMode ? '#fff' : '#333', fontSize: 13, marginLeft: 8 }}>- {member}</Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
      {/* Add Course Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 350, backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add New Course</Text>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Course Name:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.name}
              onChangeText={text => handleInput('name', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Section:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.section}
              onChangeText={text => handleInput('section', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>School Year:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.schoolYear}
              onChangeText={text => handleInput('schoolYear', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Adviser:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 8, fontSize: 16, backgroundColor: '#F3F4F6', color: '#888' }}
              value={courseData.adviser}
              placeholder="Adviser will appear here"
              editable={false}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Manage Course Modal */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 350, backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Manage Course</Text>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Course Name:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.name}
              onChangeText={text => handleInput('name', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Section:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.section}
              onChangeText={text => handleInput('section', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>School Year:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16 }}
              value={courseData.schoolYear}
              onChangeText={text => handleInput('schoolYear', text)}
              placeholder=""
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Adviser:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 8, fontSize: 16, backgroundColor: '#F3F4F6', color: '#888' }}
              value={courseData.adviser}
              onChangeText={text => handleInput('adviser', text)}
              placeholder="Adviser will appear here"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setManageModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleManageSave}
                style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Add Member Modal */}
      <Modal
        visible={addMemberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMemberModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 400, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: isDarkMode ? '#fff' : '#222' }}>
              Add members to {addMemberIndex !== null ? courses[addMemberIndex].name : ''}
            </Text>
            <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', marginBottom: 18, fontSize: 15 }}>
              Enter a name or email to add a member to this course. You can add multiple members one at a time.
            </Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 24, padding: 12, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
              value={memberInput}
              onChangeText={setMemberInput}
              placeholder="Type a name or email"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setAddMemberModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddMember}
                disabled={memberInput.trim() === ''}
                style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: memberInput.trim() === '' ? '#bbb' : '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', opacity: memberInput.trim() === '' ? 0.7 : 1 }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Channel Modal */}
      <Modal
        visible={channelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChannelModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 400, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: isDarkMode ? '#fff' : '#222' }}>
              Add channel to {channelIndex !== null ? courses[channelIndex].name : ''}
            </Text>
            <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', marginBottom: 18, fontSize: 15 }}>
              Enter a channel name to add a new channel to this course.
            </Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 24, padding: 12, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
              value={channelInput}
              onChangeText={setChannelInput}
              placeholder="Type a channel name"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setChannelModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddChannel}
                disabled={channelInput.trim() === ''}
                style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: channelInput.trim() === '' ? '#bbb' : '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', opacity: channelInput.trim() === '' ? 0.7 : 1 }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Announcement Modal */}
      <Modal
        visible={announcementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnnouncementModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 400, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: isDarkMode ? '#fff' : '#222' }}>
              Announcement
            </Text>
            {announceIndex !== null && courses[announceIndex].channels && courses[announceIndex].channels.length > 0 ? (
              <>
                <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', marginBottom: 8, fontSize: 15 }}>
                  Select a channel to post your announcement:
                </Text>
                <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9' }}>
                  {courses[announceIndex].channels.map((ch: string) => (
                    <TouchableOpacity key={ch} onPress={() => setSelectedChannel(ch)} style={{ padding: 10, backgroundColor: selectedChannel === ch ? '#8B5CF6' : 'transparent', borderRadius: 8 }}>
                      <Text style={{ color: selectedChannel === ch ? '#fff' : (isDarkMode ? '#fff' : '#222'), fontWeight: selectedChannel === ch ? 'bold' : 'normal' }}>{ch}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 12, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
                  value={announcementInput}
                  onChangeText={setAnnouncementInput}
                  placeholder="Type your announcement here"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  autoFocus
                />
              </>
            ) : (
              <Text style={{ color: '#dc2626', marginBottom: 20 }}>
                No channels found. Please add a channel first.
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setAnnouncementModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveAnnouncement}
                disabled={announcementInput.trim() === '' || !selectedChannel}
                style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: announcementInput.trim() === '' || !selectedChannel ? '#bbb' : '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', opacity: announcementInput.trim() === '' || !selectedChannel ? 0.7 : 1 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Assignment Modal */}
      <Modal
        visible={assignmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignmentModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: 400, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: isDarkMode ? '#fff' : '#222' }}>
              {editAssignment ? 'Edit Assignment' : 'Add Assignment'}
            </Text>
            {assignmentIndex !== null && courses[assignmentIndex].channels && courses[assignmentIndex].channels.length > 0 ? (
              <>
                <Text style={{ color: isDarkMode ? '#A3A3A3' : '#555', marginBottom: 8, fontSize: 15 }}>
                  Select a channel for this assignment:
                </Text>
                <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9' }}>
                  {courses[assignmentIndex].channels.map((ch: string) => (
                    <TouchableOpacity key={ch} onPress={() => setAssignmentChannel(ch)} style={{ padding: 10, backgroundColor: assignmentChannel === ch ? '#8B5CF6' : 'transparent', borderRadius: 8 }}>
                      <Text style={{ color: assignmentChannel === ch ? '#fff' : (isDarkMode ? '#fff' : '#222'), fontWeight: assignmentChannel === ch ? 'bold' : 'normal' }}>{ch}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Title:</Text>
                <TextInput
                  style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
                  value={assignmentInput.title}
                  onChangeText={text => setAssignmentInput({ ...assignmentInput, title: text })}
                  placeholder="Assignment title"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  autoFocus
                />
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Description:</Text>
                <TextInput
                  style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
                  value={assignmentInput.description}
                  onChangeText={text => setAssignmentInput({ ...assignmentInput, description: text })}
                  placeholder="Assignment description"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  multiline
                />
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Due Date:</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16, background: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222', width: '100%' }}
                    value={assignmentInput.dueDate}
                    onChange={e => setAssignmentInput({ ...assignmentInput, dueDate: e.target.value })}
                  />
                ) : (
                  <TextInput
                    style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
                    value={assignmentInput.dueDate}
                    onChangeText={text => setAssignmentInput({ ...assignmentInput, dueDate: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  />
                )}
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Due Time:</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="time"
                    style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 8, fontSize: 16, background: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222', width: '100%' }}
                    value={assignmentInput.dueTime}
                    onChange={e => setAssignmentInput({ ...assignmentInput, dueTime: e.target.value })}
                  />
                ) : (
                  <TextInput
                    style={{ borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 8, fontSize: 16, backgroundColor: isDarkMode ? '#18181b' : '#f9f9f9', color: isDarkMode ? '#fff' : '#222' }}
                    value={assignmentInput.dueTime}
                    onChangeText={text => setAssignmentInput({ ...assignmentInput, dueTime: text })}
                    placeholder="HH:MM"
                    placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  />
                )}
              </>
            ) : (
              <Text style={{ color: '#dc2626', marginBottom: 20 }}>
                No channels found. Please add a channel first.
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setAssignmentModalVisible(false)}
                style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
              >
                <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveAssignment}
                disabled={assignmentInput.title.trim() === '' || assignmentInput.description.trim() === '' || !assignmentChannel}
                style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: assignmentInput.title.trim() === '' || assignmentInput.description.trim() === '' || !assignmentChannel ? '#bbb' : '#8B5CF6', borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', opacity: assignmentInput.title.trim() === '' || assignmentInput.description.trim() === '' || !assignmentChannel ? 0.7 : 1 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Assignment Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteAssignment}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ width: 350, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: isDarkMode ? '#fff' : '#222' }}>
                Are you sure you want to delete this assignment?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={cancelDeleteAssignment}
                  style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
                >
                  <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmDeleteAssignment}
                  style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#dc2626', borderRadius: 8 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Course Delete Confirmation Modal */}
      {deleteCourseConfirm !== null && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteCourse}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ width: 350, backgroundColor: isDarkMode ? '#232323' : 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: isDarkMode ? '#fff' : '#222' }}>
                Are you sure you want to delete this course?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={cancelDeleteCourse}
                  style={{ marginRight: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 8 }}
                >
                  <Text style={{ color: isDarkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmDeleteCourse}
                  style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#dc2626', borderRadius: 8 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

export default CoursesWeb