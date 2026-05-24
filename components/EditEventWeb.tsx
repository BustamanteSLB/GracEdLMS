import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform, Alert } from 'react-native';
import { useDarkMode } from '@/contexts/DarkModeContext';
import dayjs from 'dayjs';
import { EventFormData } from './AddEventWeb';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Checkbox } from 'expo-checkbox';

interface Events {
  _id: string;
  title: string;
  header: string;
  body: string;
  startDate: string;
  endDate: string;
  isAllDay?: boolean; // NEW
  priority: "high" | "medium" | "low";
  targetAudience: "all" | "students" | "teachers" | "admins";
  eventType: "academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other";
  images: string[];
}

interface EditEventWebProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => void;
  submitting: boolean;
  event: Events | null;
}

const EditEventWeb: React.FC<EditEventWebProps> = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  event
}) => {
  const { isDarkMode } = useDarkMode();
  const isWeb = Platform.OS === 'web';
  
  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventHeader, setEventHeader] = useState("");
  const [eventBody, setEventBody] = useState("");
  const [eventStartDate, setEventStartDate] = useState<Date>(new Date());
  const [eventEndDate, setEventEndDate] = useState<Date>(new Date());
  const [isAllDay, setIsAllDay] = useState(true); // NEW
  const [eventPriority, setEventPriority] = useState<"high" | "medium" | "low">("medium");
  const [eventTargetAudience, setEventTargetAudience] = useState<"all" | "students" | "teachers" | "admins">("all");
  const [eventType, setEventType] = useState<"academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other">("academic");

  // Mobile DateTimePicker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false); // NEW
  const [showEndTimePicker, setShowEndTimePicker] = useState(false); // NEW

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setEventTitle(event.title);
      setEventHeader(event.header);
      setEventBody(event.body);
      
      // Convert UTC dates to Date objects
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      setEventStartDate(startDate);
      setEventEndDate(endDate);
      setIsAllDay(event.isAllDay !== undefined ? event.isAllDay : true); // NEW
      setEventPriority(event.priority);
      setEventTargetAudience(event.targetAudience);
      setEventType(event.eventType);
    }
  }, [event]);

  const resetForm = () => {
    setEventTitle("");
    setEventHeader("");
    setEventBody("");
    setEventStartDate(new Date());
    setEventEndDate(new Date());
    setIsAllDay(true); // NEW
    setEventPriority("medium");
    setEventTargetAudience("all");
    setEventType("academic");
  };

  const showAlert = (title: string, message: string) => {
    if (isWeb) {
      window.alert(message);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!eventTitle.trim()) {
      showAlert('Validation Error', 'Please enter an event title');
      return;
    }

    if (!eventHeader.trim()) {
      showAlert('Validation Error', 'Please enter an event header');
      return;
    }

    if (!eventBody.trim()) {
      showAlert('Validation Error', 'Please enter an event body');
      return;
    }

    // Compare dates/times
    if (eventStartDate > eventEndDate) {
      showAlert('Validation Error', 'Start date/time must be before or at the same time as end date/time');
      return;
    }

    const eventData: EventFormData = {
      title: eventTitle.trim(),
      header: eventHeader.trim(),
      body: eventBody.trim(),
      startDate: isAllDay 
        ? dayjs(eventStartDate).format('YYYY-MM-DD') 
        : eventStartDate.toISOString(),
      endDate: isAllDay 
        ? dayjs(eventEndDate).format('YYYY-MM-DD') 
        : eventEndDate.toISOString(),
      isAllDay: isAllDay, // NEW
      priority: eventPriority,
      targetAudience: eventTargetAudience,
      eventType: eventType,
    };

    onSubmit(eventData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Mobile DateTimePicker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setEventStartDate(selectedDate);
      if (!isAllDay) {
        setShowStartTimePicker(true);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEventEndDate(selectedDate);
      if (!isAllDay) {
        setShowEndTimePicker(true);
      }
    }
  };

  const formatDate = (date: Date) => {
    return dayjs(date).format('MMM DD, YYYY');
  };

  const formatDateTime = (date: Date) => {
    return dayjs(date).format('MMM DD, YYYY h:mm A');
  };

  // Event Type dropdown items for web
  const eventTypeOptionsWeb: DropdownItem[] = useMemo(() => [
    { label: '📚 Academic', value: 'academic' },
    { label: '🏢 Administrative', value: 'administrative' },
    { label: '🎉 Holiday', value: 'holiday' },
    { label: '📅 Meeting', value: 'meeting' },
    { label: '⏰ Deadline', value: 'deadline' },
    { label: '🔗 Other', value: 'other' },
  ], []);

  // Priority dropdown items for web
  const priorityOptionsWeb: DropdownItem[] = useMemo(() => [
    { label: '🔴 High', value: 'high' },
    { label: '🟡 Medium', value: 'medium' },
    { label: '🟢 Low', value: 'low' },
  ], []);

  // Target Audience dropdown items for web
  const targetAudienceOptionsWeb: DropdownItem[] = useMemo(() => [
    { label: '👥 All', value: 'all' },
    { label: '🎓 Students', value: 'students' },
    { label: '👨‍🏫 Teachers', value: 'teachers' },
    { label: '👑 Admins', value: 'admins' },
  ], []);

  // Event Type dropdown items for mobile
  const eventTypeItems: DropdownMobileItem[] = [
    { label: '📚 Academic', value: 'academic' },
    { label: '🏢 Administrative', value: 'administrative' },
    { label: '🎉 Holiday', value: 'holiday' },
    { label: '📅 Meeting', value: 'meeting' },
    { label: '⏰ Deadline', value: 'deadline' },
    { label: '🔗 Other', value: 'other' },
  ];

  // Priority dropdown items for mobile
  const priorityItems: DropdownMobileItem[] = [
    { label: '🔴 High', value: 'high' },
    { label: '🟡 Medium', value: 'medium' },
    { label: '🟢 Low', value: 'low' },
  ];

  // Target Audience dropdown items for mobile
  const targetAudienceItems: DropdownMobileItem[] = [
    { label: '👥 All', value: 'all' },
    { label: '🎓 Students', value: 'students' },
    { label: '👨‍🏫 Teachers', value: 'teachers' },
    { label: '👑 Admins', value: 'admins' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: 16,
        }}
      >
        <View 
          style={{
            width: '100%',
            maxWidth: 600,
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDarkMode ? 0 : 0.15,
            shadowRadius: 12,
            elevation: isDarkMode ? 0 : 8,
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View 
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#3E4042' : '#E4E6EB',
            }}
          >
            <Text 
              style={{
                fontSize: 20,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                textAlign: 'center',
              }}
            >
              Edit Event
            </Text>
          </View>

          <ScrollView 
            style={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Input */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Event Title *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 0,
                }}
                placeholder="What's the event called?"
                placeholderTextColor={isDarkMode ? '#B0B3B8' : '#8A8D91'}
                value={eventTitle}
                onChangeText={setEventTitle}
                maxLength={100}
              />
            </View>

            {/* Header Input */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Event Header *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 0,
                }}
                placeholder="Short description or tagline"
                placeholderTextColor={isDarkMode ? '#B0B3B8' : '#8A8D91'}
                value={eventHeader}
                onChangeText={setEventHeader}
                maxLength={100}
              />
            </View>

            {/* Body Input */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Event Details *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  borderWidth: 0,
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
                placeholder="Tell people more about this event..."
                placeholderTextColor={isDarkMode ? '#B0B3B8' : '#8A8D91'}
                value={eventBody}
                onChangeText={setEventBody}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text 
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#65676B',
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                {eventBody.length}/500
              </Text>
            </View>

            {/* Date Section */}
            <View 
              style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F7F8FA',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 12,
                }}
              >
                📅 When
              </Text>

              {/* All Day Checkbox - NEW */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Checkbox
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  color={isAllDay ? '#1A73E8' : undefined}
                  style={{ marginRight: 8 }}
                />
                <Text 
                  style={{
                    fontSize: 14,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  All day event
                </Text>
              </View>

              {/* Start Date */}
              <View style={{ marginBottom: 12 }}>
                <Text 
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Medium',
                    color: isDarkMode ? '#B0B3B8' : '#65676B',
                    marginBottom: 6,
                  }}
                >
                  Starts
                </Text>
                {isWeb ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <input
                      type="date"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        fontSize: 14,
                        fontFamily: 'Inter-Regular',
                      }}
                      value={dayjs(eventStartDate).format('YYYY-MM-DD')}
                      onChange={(e) => {
                        const newDate = new Date(eventStartDate);
                        const selectedDate = new Date(e.target.value);
                        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                        setEventStartDate(newDate);
                      }}
                    />
                    {!isAllDay && (
                      <input
                        type="time"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                        }}
                        value={dayjs(eventStartDate).format('HH:mm')}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = new Date(eventStartDate);
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setEventStartDate(newDate);
                        }}
                      />
                    )}
                  </View>
                ) : (
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                      style={{
                        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                        borderRadius: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text 
                        style={{
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        {isAllDay ? `📅 ${formatDate(eventStartDate)}` : `📅 ${formatDateTime(eventStartDate)}`}
                      </Text>
                    </TouchableOpacity>

                    {showStartDatePicker && (
                      <DateTimePicker
                        value={eventStartDate}
                        mode="date"
                        display="default"
                        onChange={handleStartDateChange}
                      />
                    )}

                    {showStartTimePicker && !isAllDay && (
                      <DateTimePicker
                        value={eventStartDate}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowStartTimePicker(false);
                          if (selectedTime) {
                            setEventStartDate(selectedTime);
                          }
                        }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* End Date */}
              <View>
                <Text 
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Medium',
                    color: isDarkMode ? '#B0B3B8' : '#65676B',
                    marginBottom: 6,
                  }}
                >
                  Ends
                </Text>
                {isWeb ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <input
                      type="date"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        fontSize: 14,
                        fontFamily: 'Inter-Regular',
                      }}
                      value={dayjs(eventEndDate).format('YYYY-MM-DD')}
                      onChange={(e) => {
                        const newDate = new Date(eventEndDate);
                        const selectedDate = new Date(e.target.value);
                        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                        setEventEndDate(newDate);
                      }}
                      min={dayjs(eventStartDate).format('YYYY-MM-DD')}
                    />
                    {!isAllDay && (
                      <input
                        type="time"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                        }}
                        value={dayjs(eventEndDate).format('HH:mm')}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = new Date(eventEndDate);
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setEventEndDate(newDate);
                        }}
                      />
                    )}
                  </View>
                ) : (
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowEndDatePicker(true)}
                      style={{
                        backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                        borderRadius: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text 
                        style={{
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        {isAllDay ? `📅 ${formatDate(eventEndDate)}` : `📅 ${formatDateTime(eventEndDate)}`}
                      </Text>
                    </TouchableOpacity>

                    {showEndDatePicker && (
                      <DateTimePicker
                        value={eventEndDate}
                        mode="date"
                        display="default"
                        onChange={handleEndDateChange}
                        minimumDate={eventStartDate}
                      />
                    )}

                    {showEndTimePicker && !isAllDay && (
                      <DateTimePicker
                        value={eventEndDate}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowEndTimePicker(false);
                          if (selectedTime) {
                            setEventEndDate(selectedTime);
                          }
                        }}
                      />
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Event Type */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Event Type *
              </Text>
              {isWeb ? (
                <Dropdown
                  data={eventTypeOptionsWeb}
                  selectedValue={eventType}
                  onValueChange={(value) => setEventType(value as "academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other")}
                  placeholder="Select Event Type"
                />
              ) : (
                <DropdownMobile
                  selectedValue={eventType}
                  onValueChange={(value) => setEventType(value as "academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other")}
                  items={eventTypeItems}
                  buttonRightIcon={DownIcon}
                />
              )}
            </View>

            {/* Priority */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Priority Level *
              </Text>
              {isWeb ? (
                <Dropdown
                  data={priorityOptionsWeb}
                  selectedValue={eventPriority}
                  onValueChange={(value) => setEventPriority(value as "high" | "medium" | "low")}
                  placeholder="Select Priority"
                />
              ) : (
                <DropdownMobile
                  selectedValue={eventPriority}
                  onValueChange={(value) => setEventPriority(value as "high" | "medium" | "low")}
                  items={priorityItems}
                  buttonRightIcon={DownIcon}
                />
              )}
            </View>

            {/* Target Audience */}
            <View style={{ marginBottom: 16 }}>
              <Text 
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 8,
                }}
              >
                Who can see this? *
              </Text>
              {isWeb ? (
                <Dropdown
                  data={targetAudienceOptionsWeb}
                  selectedValue={eventTargetAudience}
                  onValueChange={(value) => setEventTargetAudience(value as "all" | "students" | "teachers" | "admins")}
                  placeholder="Select Audience"
                />
              ) : (
                <DropdownMobile
                  selectedValue={eventTargetAudience}
                  onValueChange={(value) => setEventTargetAudience(value as "all" | "students" | "teachers" | "admins")}
                  items={targetAudienceItems}
                  buttonRightIcon={DownIcon}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View 
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? '#3E4042' : '#E4E6EB',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 6,
                backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EB',
              }}
            >
              <Text 
                style={{
                  fontSize: 15,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 6,
                backgroundColor: submitting 
                  ? (isDarkMode ? '#1e4d8b' : '#9DC2FF')
                  : (isDarkMode ? '#2E89FF' : '#1877F2'),
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Text 
                style={{
                  fontSize: 15,
                  fontFamily: 'Inter-SemiBold',
                  color: '#FFFFFF',
                }}
              >
                {submitting ? 'Updating...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditEventWeb;