import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDarkMode } from '@/contexts/DarkModeContext';
import dayjs from 'dayjs';
import { EventFormData } from './AddEventWeb';

interface Events {
  _id: string;
  title: string;
  header: string;
  body: string;
  startDate: string;
  endDate: string;
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
  
  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventHeader, setEventHeader] = useState("");
  const [eventBody, setEventBody] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventPriority, setEventPriority] = useState<"high" | "medium" | "low">("medium");
  const [eventTargetAudience, setEventTargetAudience] = useState<"all" | "students" | "teachers" | "admins">("all");
  const [eventType, setEventType] = useState<"academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other">("academic");

  const nowISO = new Date().toISOString().slice(0, 16);

  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setEventTitle(event.title);
      setEventHeader(event.header);
      setEventBody(event.body);
      
      // Convert UTC dates to local datetime-local format
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      setEventStartDate(formatForDateTimeLocal(startDate));
      setEventEndDate(formatForDateTimeLocal(endDate));
      setEventPriority(event.priority);
      setEventTargetAudience(event.targetAudience);
      setEventType(event.eventType);
    }
  }, [event]);

  const resetForm = () => {
    setEventTitle("");
    setEventHeader("");
    setEventBody("");
    setEventStartDate("");
    setEventEndDate("");
    setEventPriority("medium");
    setEventTargetAudience("all");
    setEventType("academic");
  };

  const handleSubmit = () => {
    if (!eventTitle.trim() || !eventHeader.trim() || !eventBody.trim() || !eventStartDate || !eventEndDate) {
      window.alert('Please fill in all required fields');
      return;
    }

    if (new Date(eventStartDate) > new Date(eventEndDate)) {
      window.alert('Start date must be before or equal to end date');
      return;
    }

    const eventData: EventFormData = {
      title: eventTitle.trim(),
      header: eventHeader.trim(),
      body: eventBody.trim(),
      startDate: new Date(eventStartDate).toISOString(),
      endDate: new Date(eventEndDate).toISOString(),
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className='flex-1 justify-center items-center bg-black/50 p-2'>
        <ScrollView 
          className={`w-full max-w-xl p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
          showsVerticalScrollIndicator={false}
        >
          <Text className={`font-inter_bold text-xl text-center mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Edit Event
          </Text>

          {/* Title */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Title *
          </Text>
          <TextInput
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            placeholder="Enter title..."
            placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888888'}
            value={eventTitle}
            onChangeText={setEventTitle}
            maxLength={100}
          />

          {/* Header */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Header *
          </Text>
          <TextInput
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            placeholder="Enter header..."
            placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888888'}
            value={eventHeader}
            onChangeText={setEventHeader}
            maxLength={100}
          />

          {/* Body */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Body *
          </Text>
          <TextInput
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            placeholder="Enter body..."
            placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888888'}
            value={eventBody}
            onChangeText={setEventBody}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          {/* Start Date */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Start Date *
          </Text>
          <input
            type="datetime-local"
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md text-sm ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            value={eventStartDate}
            onChange={(e) => setEventStartDate(e.target.value)}
          />

          {/* End Date */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            End Date *
          </Text>
          <input
            type="datetime-local"
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md text-sm ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            value={eventEndDate}
            onChange={(e) => setEventEndDate(e.target.value)}
            min={eventStartDate || nowISO}
          />

          {/* Event Type */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Event Type
          </Text>
          <Picker
            selectedValue={eventType}
            onValueChange={(itemValue) => setEventType(itemValue as "academic" | "administrative" | "holiday" | "meeting" | "deadline" | "other")}
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            style={{ fontSize: 14}}
            mode='dropdown'
          >
            <Picker.Item label="📚 Academic" value="academic" />
            <Picker.Item label="🏢 Administrative" value="administrative" />
            <Picker.Item label="🎉 Holiday" value="holiday" />
            <Picker.Item label="📅 Meeting" value="meeting" />
            <Picker.Item label="⏰ Deadline" value="deadline" />
            <Picker.Item label="🔗 Other" value="other" />
          </Picker>

          {/* Priority */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Priority
          </Text>
          <Picker
            selectedValue={eventPriority}
            onValueChange={(itemValue) => setEventPriority(itemValue as "high" | "medium" | "low")}
            className={`font-inter_regular w-full p-2 border mb-2 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            style={{ fontSize: 14}}
            mode='dropdown'
          >
            <Picker.Item label="🔴 High" value="high" />
            <Picker.Item label="🟡 Medium" value="medium" />
            <Picker.Item label="🟢 Low" value="low" />
          </Picker>

          {/* Target Audience */}
          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Target Audience
          </Text>
          <Picker
            selectedValue={eventTargetAudience}
            onValueChange={(itemValue) => setEventTargetAudience(itemValue as "all" | "students" | "teachers" | "admins")}
            className={`font-inter_regular w-full p-2 border mb-4 rounded-md ${isDarkMode ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 bg-white text-black'}`}
            style={{ fontSize: 14}}
            mode='dropdown'
          >
            <Picker.Item label="👥 All" value="all" />
            <Picker.Item label="🎓 Students" value="students" />
            <Picker.Item label="👨‍🏫 Teachers" value="teachers" />
            <Picker.Item label="👑 Admins" value="admins" />
          </Picker>

          {/* Action Buttons */}
          <View className='flex-row justify-end'>
            <TouchableOpacity
              className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'} mr-2`}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text className='font-inter_semibold text-white'>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`p-3 rounded-md ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} ${submitting ? 'opacity-50' : ''}`}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text className='font-inter_semibold text-white'>
                {submitting ? 'Updating...' : 'Update Event'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default EditEventWeb;