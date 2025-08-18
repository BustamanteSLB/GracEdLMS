import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View, VirtualizedList, useColorScheme, useWindowDimensions, Alert, ActivityIndicator, ListRenderItem } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { useAuth } from '@/contexts/AuthContext'
import { cssInterop } from 'nativewind'
import * as DocumentPicker from 'expo-document-picker';
import DatePicker, { DateType, useDefaultClassNames, useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { Image } from 'expo-image'
import DeleteIcon from '@/assets/icons/delete.svg'
import EditIcon from '@/assets/icons/edit.svg'
import { Picker } from '@react-native-picker/picker'
import apiClient from '@/app/services/apiClient'
import AddEventWeb, { EventFormData } from '@/components/AddEventWeb'
import EditEventWeb from '@/components/EditEventWeb'

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Events {
  _id: string;
  createdBy: User;
  title: string;
  header: string;
  body: string;
  images: string[];
  startDate: string;
  endDate: string;
  priority: "high" | "medium" | "low";
  targetAudience: "all" | "students" | "teachers" | "admins";
  eventType: "academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other";
  status?: 'upcoming' | 'ongoing' | 'past'; // Virtual field from backend
  createdAt: string;
  updatedAt: string;
}

// VirtualizedList item types
type SidebarItemType = 'loading' | 'empty' | 'event';
type MainItemType = 'loading' | 'empty' | 'event';

interface SidebarListItem {
  id: string;
  type: SidebarItemType;
  data?: Events;
}

interface MainListItem {
  id: string;
  type: MainItemType;
  data?: Events;
}

// Admin's calendar page
const CalendarWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  // Calendar state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Events state
  const [events, setEvents] = useState<Events[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<Events[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit event modal state
  const [addEventVisible, setAddEventVisible] = useState(false);
  const [editEventVisible, setEditEventVisible] = useState(false);
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Events | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image viewing modal
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const currentDate = new Date();
  const dayOfWeek = currentDate.toLocaleString("en-US", { weekday: "long" });
  const date = currentDate.toLocaleDateString();
  const nowISO = new Date().toISOString().slice(0, 16);

  const defaultClassNames = useDefaultClassNames();

  cssInterop(Image, { className: "style" });

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get('/events', {
        params: {
          limit: 100, // Get more events for calendar view
          page: 1
        }
      });

      if (response.data.success) {
        setEvents(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch events for selected date
  const fetchEventsForDate = useCallback(async (date: dayjs.Dayjs) => {
    try {
      const startOfDay = date.startOf('day').toISOString();
      const endOfDay = date.endOf('day').toISOString();

      const response = await apiClient.get('/events/date-range', {
        params: {
          startDate: startOfDay,
          endDate: endOfDay
        }
      });

      if (response.data.success) {
        setTodaysEvents(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching events for date:', err);
      setError(err.response?.data?.message || 'Failed to fetch events for selected date');
    }
  }, []);

  // Create event handler
  const handleCreateEvent = useCallback(async (eventData: EventFormData) => {
    try {
      setSubmitting(true);
      
      console.log('Sending create data:', eventData);

      const response = await apiClient.post('/events', eventData);

      if (response.data.success) {
        window.alert('Event created successfully!');
        setAddEventVisible(false);
        fetchEvents();
        fetchEventsForDate(selectedDate);
      }
    } catch (err: any) {
      console.error('Error creating event:', err);
      console.error('Error response:', err.response?.data);
      window.alert('Error: ' + (err.response?.data?.message || 'Failed to create event'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedDate, fetchEvents, fetchEventsForDate]);

  // Update event handler
  const handleUpdateEvent = useCallback(async (eventData: EventFormData) => {
    if (!currentEditingEvent) return;

    try {
      setSubmitting(true);
      
      const updateData = {
        ...eventData,
        images: currentEditingEvent.images // Keep existing images
      };

      console.log('Sending update data:', updateData);

      const response = await apiClient.put(`/events/${currentEditingEvent._id}`, updateData);

      if (response.data.success) {
        window.alert('Event updated successfully!');
        setEditEventVisible(false);
        setCurrentEditingEvent(null);
        fetchEvents();
        fetchEventsForDate(selectedDate);
      }
    } catch (err: any) {
      console.error('Error updating event:', err);
      console.error('Error response:', err.response?.data);
      window.alert('Error: ' + (err.response?.data?.message || 'Failed to update event'));
    } finally {
      setSubmitting(false);
    }
  }, [currentEditingEvent, selectedDate, fetchEvents, fetchEventsForDate]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        
        const response = await apiClient.delete(`/events/${eventId}`);

        if (response.data.success) {
          window.alert('Event deleted successfully!');
          fetchEvents();
          fetchEventsForDate(selectedDate);
        }
      } catch (err: any) {
        console.error('Error deleting event:', err);
        window.alert('Error: ' + (err.response?.data?.message || 'Failed to delete event'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedDate, fetchEvents, fetchEventsForDate]);

  // Open edit modal
  const openEditModal = useCallback((event: Events) => {
    setCurrentEditingEvent(event);
    setEditEventVisible(true);
  }, []);

  // Priority color helper
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return isDarkMode ? '#dc2626' : '#ef4444';
      case 'medium': return isDarkMode ? '#d97706' : '#f59e0b';
      case 'low': return isDarkMode ? '#059669' : '#10b981';
      default: return isDarkMode ? '#6b7280' : '#9ca3af';
    }
  }, [isDarkMode]);

  // Format time helper
  const formatTime = useCallback((dateString: string) => {
    return dayjs(dateString).format('h:mm A');
  }, []);

  // Get user full name helper
  const getUserFullName = useCallback((user: User) => {
    const { firstName, middleName, lastName } = user;
    return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
  }, []);

  // Navigate to previous/next day
  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? selectedDate.subtract(1, 'day') 
      : selectedDate.add(1, 'day');
    setSelectedDate(newDate);
  }, [selectedDate]);

  // Load events on component mount and when selected date changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchEventsForDate(selectedDate);
  }, [selectedDate, fetchEventsForDate]);

  // Filtered today's events by selected date
  const filteredTodaysEvents = useMemo(() => {
    return todaysEvents.filter(event => {
      const eventStart = dayjs(event.startDate);
      const eventEnd = dayjs(event.endDate);
      const selected = selectedDate.startOf('day');
      
      return eventStart.isSame(selected, 'day') || 
             eventEnd.isSame(selected, 'day') || 
             (eventStart.isBefore(selected, 'day') && eventEnd.isAfter(selected, 'day'));
    });
  }, [todaysEvents, selectedDate]);

  // Prepare sidebar virtualized list data
  const sidebarListData = useMemo((): SidebarListItem[] => {
    if (isLoading) {
      return [{ id: 'loading', type: 'loading' }];
    }
    
    if (filteredTodaysEvents.length === 0) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return filteredTodaysEvents.map(event => ({
      id: event._id,
      type: 'event' as SidebarItemType,
      data: event
    }));
  }, [isLoading, filteredTodaysEvents]);

  // Prepare main virtualized list data
  const mainListData = useMemo((): MainListItem[] => {
    if (error) {
      return [{ id: 'error', type: 'empty' }];
    }
    
    if (isLoading) {
      return [{ id: 'loading', type: 'loading' }];
    }
    
    if (filteredTodaysEvents.length === 0) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return filteredTodaysEvents.map(event => ({
      id: event._id,
      type: 'event' as MainItemType,
      data: event
    }));
  }, [error, isLoading, filteredTodaysEvents]);

  // Sidebar item renderer
  const renderSidebarItem: ListRenderItem<SidebarListItem> = useCallback(({ item }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View 
            className='w-full items-center rounded-lg p-2 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : '#000'} />
            <Text className={`font-inter_regular my-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Loading events...
            </Text>
          </View>
        );
      
      case 'empty':
        return (
          <View 
            className='w-full items-center rounded-lg p-2 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <Text className={`font-inter_regular my-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No events scheduled.
            </Text>
          </View>
        );
      
      case 'event':
        if (!item.data) return null;
        const event = item.data;
        
        return (
          <TouchableOpacity
            className='w-full rounded-lg p-4 mb-2'
            style={{ 
              backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', 
              borderLeftWidth: 4,
              borderLeftColor: getPriorityColor(event.priority)
            }}
            onPress={() => openEditModal(event)}
          >
            <View className='flex-row items-center'>
              <Text 
                className={`font-inter_semibold text-sm mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {event.title}
              </Text>
              <View 
                className='flex-row items-center rounded-full px-2 py-1'
                style={{ backgroundColor: getPriorityColor(event.priority) }}
              >
                <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                  {event.priority === 'high' ? 'High' : event.priority === 'medium' ? 'Medium' : 'Low'}
                </Text>
              </View>
            </View>
            <View className='flex-row items-center flex-shrink'>
              <Text 
                className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {formatTime(event.startDate)} - {formatTime(event.endDate)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, getPriorityColor, formatTime, openEditModal]);

  // Main item renderer
  const renderMainItem: ListRenderItem<MainListItem> = useCallback(({ item }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View className={`w-full items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-4 mt-2`}>
            <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000'} />
            <Text className={`font-inter_regular text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Loading events...
            </Text>
          </View>
        );
      
      case 'empty':
        if (error) {
          return (
            <View className='w-full items-center bg-red-100 rounded-lg p-4 mt-2 mb-2'>
              <Text className='font-inter_regular text-red-800'>
                {error}
              </Text>
            </View>
          );
        }
        
        return (
          <View className={`w-full items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-4 mt-2`}>
            <Image
              source={require('@/assets/images/no_events.png')}
              style={{ width: 100, height: 100, marginBottom: 8 }}
              contentFit='contain'
            />
            <Text className={`font-inter_regular text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No events scheduled for this day
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Create an event to get started.
            </Text>
          </View>
        );
      
      case 'event':
        if (!item.data) return null;
        const event = item.data;
        
        return (
          <View 
            className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 mb-4 rounded-lg`}
            style={{
              borderLeftWidth: 8,
              borderLeftColor: getPriorityColor(event.priority)
            }}
          >
            {/* User Details */}
            <View className='flex-row items-center mb-2'>
              <Image
                source={event.createdBy.profilePicture ? { uri: event.createdBy.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                style={{ width: 40, height: 40, marginRight: 8, borderRadius: 20 }}
                contentFit='cover'
              />
              <View className='mr-auto'>
                <Text 
                  className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {getUserFullName(event.createdBy)}
                </Text>
                <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {dayjs(event.createdAt).format('MMMM D, YYYY h:mm A')}
                </Text>
              </View>
              
              {/* Admin Controls */}
              {user?.role === 'Admin' && (
                <>
                  <TouchableOpacity
                    className={`p-2 mr-1 rounded-md ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
                    onPress={() => openEditModal(event)}
                  >
                    <EditIcon width={16} height={16} fill={isDarkMode ? '#E0E0E0' : 'white'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`p-2 rounded-md ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
                    onPress={() => deleteEvent(event._id)}
                  >
                    <DeleteIcon width={16} height={16} fill={isDarkMode ? '#E0E0E0' : 'white'} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Event Title */}
            <View className='w-full items-center bg-secondary-web rounded-lg p-4 mb-2'>
              <Text className='font-inter_bold text-lg text-white'>
                {event.title}
              </Text>
            </View>

            {/* Priority Warning */}
            {event.priority === 'high' && (
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} mb-2`}>
                ⚠️ IMPORTANT! 
              </Text>
            )}

            {/* Event Details */}
            <View className='mb-2'>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                Deadline: {formatTime(event.startDate)} - {formatTime(event.endDate)}
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Event Type: {event.eventType === 'academic' ? 'Academic' : event.eventType === 'administrative' ? 'Administrative' : event.eventType === 'holiday' ? 'Holiday' : event.eventType === 'meeting' ? 'Meeting' : event.eventType === 'deadline' ? 'Deadline' : 'Other'}
              </Text>
            </View>

            {/* Header Text */}
            <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {event.header}
            </Text>

            {/* Body */}
            <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {event.body}
            </Text>

            {/* Images */}
            {event.images && event.images.length > 0 && (
              <View className='flex-row flex-wrap mt-2'>
                {event.images.map((imageUrl, index) => (
                  <Pressable 
                    key={index}
                    onPress={() => {
                      setSelectedImageUrl(imageUrl);
                      setImageViewerVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 100, height: 100, marginRight: 8, marginBottom: 8, borderRadius: 8 }}
                      contentFit='cover'
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, getPriorityColor, getUserFullName, formatTime, openEditModal, deleteEvent, user?.role, error]);

  // VirtualizedList get item function
  const getSidebarItem = useCallback((data: SidebarListItem[], index: number) => data[index], []);
  const getMainItem = useCallback((data: MainListItem[], index: number) => data[index], []);
  
  // VirtualizedList get item count function
  const getSidebarItemCount = useCallback((data: SidebarListItem[]) => data.length, []);
  const getMainItemCount = useCallback((data: MainListItem[]) => data.length, []);

  // VirtualizedList key extractor
  const sidebarKeyExtractor = useCallback((item: SidebarListItem) => item.id, []);
  const mainKeyExtractor = useCallback((item: MainListItem) => item.id, []);

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      {/* Header */}
      <View 
        className='flex-row items-center p-4' 
        style={{
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0'
        }}
      >
        <View className='flex-col mr-auto'>
          <Text className={`font-inter_semibold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            {selectedDate.format('dddd')}
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {selectedDate.format('MMMM D, YYYY')}
          </Text>
        </View>
        <View className='flex-row items-center'>
          <TouchableOpacity
            className='rounded-md px-2 py-3 mr-1 items-center'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F2F1' }}
            onPress={() => navigateDay('prev')}
          >
            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              ‹
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className='rounded-md p-2 mr-1 items-center'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F2F1' }}
            onPress={() => {
              setSelectedDate(dayjs());
              setCalendarVisible(true);
            }}
          >
            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className='rounded-md px-2 py-3 mr-2 items-center'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F2F1' }}
            onPress={() => navigateDay('next')}
          >
            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-md p-2 items-center ${isDarkMode ? 'bg-green-600' : 'bg-green-500'}`}
            onPress={() => setAddEventVisible(true)}
          >
            <Image
              source={require('@/assets/icons/plus.png')}
              className='w-6 h-6'
              contentFit='contain'
              tintColor={isDarkMode ? '#E0E0E0' : 'white'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View className='h-full flex-row'>
        {/* Sidebar - Today's Schedule with VirtualizedList */}
        <View
          className={`p-4 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
          style={{
            borderRightWidth: 1,
            borderRightColor: isDarkMode ? '#333333' : '#E0E0E0',
            width: '30%',
            display: width < 768 ? 'none' : 'flex',
          }}
        >
          <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            {selectedDate.format('MMM D')} Schedule:
          </Text>
          
          <VirtualizedList
            data={sidebarListData}
            initialNumToRender={10}
            renderItem={renderSidebarItem}
            keyExtractor={sidebarKeyExtractor}
            getItemCount={getSidebarItemCount}
            getItem={getSidebarItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
          />
        </View>

        {/* Main Content - Events List with VirtualizedList */}
        <View 
          className='p-4 h-full'
          style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', width: width < 768 ? '100%' : '70%' }}
        >
          <Text className={`font-inter_semibold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} mb-2`}>
            Events for {selectedDate.format('MMMM D, YYYY')}
          </Text>
          
          <VirtualizedList
            data={mainListData}
            initialNumToRender={5}
            renderItem={renderMainItem}
            keyExtractor={mainKeyExtractor}
            getItemCount={getMainItemCount}
            getItem={getMainItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            updateCellsBatchingPeriod={50}
            windowSize={8}
          />
        </View>
      </View>

      {/* Date Selector Modal */}
      <Modal
        visible={calendarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          className="flex-1 p-4 justify-center items-center bg-black/50"
          onPressOut={() => setCalendarVisible(false)}
        >
          <View className={`p-4 rounded-2xl shadow-lg ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            <DatePicker
              calendar='gregory'
              mode="single"
              date={selectedDate}
              firstDayOfWeek={1}
              onChange={(params) => {
                if (params?.date) {
                  const newDate = dayjs(params.date);
                  setSelectedDate(newDate);
                }
                setCalendarVisible(false);
              }}
              classNames={{ 
                ...defaultClassNames,
                today: 'border-amber-500',
                month_selector_label: `font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                year_selector_label: `font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                weekday_label: `font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                outside_label: `font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`,
                day_label: `font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                selected_month: 'bg-primary-web rounded-lg',
                selected_month_label: "font-inter_semibold text-white text-sm",
                month_label: `font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                year_label: `font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`,
                selected_year: 'bg-primary-web rounded-lg',
                selected_year_label: "font-inter_semibold text-white text-sm",
                selected: 'bg-primary-web rounded-full',
                selected_label: "font-inter_semibold text-white text-sm",
                disabled: 'opacity-50',
              }}
              className={`max-w-[325px] w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
              showOutsideDays={true}
              styles={{
                button_prev_image: {tintColor: isDarkMode ? '#E0E0E0' : 'black'},
                button_next_image: {tintColor: isDarkMode ? '#E0E0E0' : 'black'},
              }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Add Event Modal */}
      <AddEventWeb
        visible={addEventVisible}
        onClose={() => setAddEventVisible(false)}
        onSubmit={handleCreateEvent}
        submitting={submitting}
        selectedDate={selectedDate}
      />

      {/* Edit Event Modal */}
      <EditEventWeb
        visible={editEventVisible}
        onClose={() => {
          setEditEventVisible(false);
          setCurrentEditingEvent(null);
        }}
        onSubmit={handleUpdateEvent}
        submitting={submitting}
        event={currentEditingEvent}
      />

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/90"
          onPress={() => setImageViewerVisible(false)}
        >
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={{ width: '90%', height: '90%' }}
              contentFit='contain'
            />
          )}
        </Pressable>
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
    </SafeAreaView>
  )
}

export default CalendarWeb