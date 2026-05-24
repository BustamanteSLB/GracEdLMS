import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cssInterop } from "nativewind";
import DatePicker, { useDefaultClassNames } from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { Image } from "expo-image";
import apiClient from "@/app/services/apiClient";
import CalendarIcon from "@/assets/icons/calendar_month.svg";
import CloseIcon from "@/assets/icons/close.svg";
import ColoredCalendarIcon from "@/assets/icons/colored_calendar.svg";
import ColoredTimeIcon from "@/assets/icons/colored_time.svg";

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
  role: "Admin" | "Teacher" | "Student";
  profilePicture?: string;
  status: "active" | "inactive" | "suspended" | "pending" | "archived";
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
  eventType:
    | "academic"
    | "administrative"
    | "holiday"
    | "meeting"
    | "deadline"
    | "other";
  status?: "upcoming" | "ongoing" | "past";
  createdAt: string;
  updatedAt: string;
}

type CalendarView = "day" | "week" | "month";

cssInterop(Image, { className: "style" });

// Student's calendar page
const CalendarAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  // Events state
  const [events, setEvents] = useState<Events[]>([]);
  const [weekEvents, setWeekEvents] = useState<Events[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calendarView, setCalendarView] = useState<CalendarView>("week");

  // Calendar picker modal state
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);

  // Event detail modal state
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] =
    useState<Events | null>(null);

  // Image viewing modal
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const defaultClassNames = useDefaultClassNames();

  // Check if current user is a student
  const isStudent = user?.role === "Student";
  const isTeacher = user?.role === "Teacher";
  const isAdmin = user?.role === "Admin";

  // Generate time slots for day/week view
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        label: dayjs().hour(hour).minute(0).format("h A"),
      });
    }
    return slots;
  }, []);

  // Get week days based on selected date
  const weekDays = useMemo(() => {
    const startOfWeek = selectedDate.startOf("week");
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"));
  }, [selectedDate]);

  // Filter events based on user role and target audience
  const filterEventsByRole = useCallback(
    (eventsList: Events[]) => {
      if (isAdmin) {
        return eventsList;
      } else if (isTeacher) {
        return eventsList.filter(
          (event) =>
            event.targetAudience === "all" ||
            event.targetAudience === "teachers"
        );
      } else if (isStudent) {
        return eventsList.filter(
          (event) =>
            event.targetAudience === "all" ||
            event.targetAudience === "students"
        );
      }
      return eventsList;
    },
    [isAdmin, isTeacher, isStudent]
  );

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get("/events", {
        params: {
          limit: 100,
          page: 1,
        },
      });

      if (response.data.success) {
        const filteredEvents = filterEventsByRole(response.data.data);
        setEvents(filteredEvents);
      }
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.response?.data?.message || "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, [filterEventsByRole]);

  // Fetch events for current week
  const fetchWeekEvents = useCallback(async () => {
    try {
      const startOfWeek = selectedDate.startOf("week").toISOString();
      const endOfWeek = selectedDate.endOf("week").toISOString();

      const response = await apiClient.get("/events/date-range", {
        params: {
          startDate: startOfWeek,
          endDate: endOfWeek,
        },
      });

      if (response.data.success) {
        const filteredEvents = filterEventsByRole(response.data.data);
        setWeekEvents(filteredEvents);
      }
    } catch (err: any) {
      console.error("Error fetching week events:", err);
      setError(
        err.response?.data?.message || "Failed to fetch events for week"
      );
    }
  }, [selectedDate, filterEventsByRole]);

  // Open event detail modal
  const openEventDetail = useCallback((event: Events) => {
    setSelectedEventForDetail(event);
    setEventDetailVisible(true);
  }, []);

  // Priority color helper
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  }, []);

  // Event type color helper
  const getEventTypeColor = useCallback((eventType: string) => {
    switch (eventType) {
      case "academic":
        return "#3B82F6";
      case "administrative":
        return "#8B5CF6";
      case "holiday":
        return "#EC4899";
      case "meeting":
        return "#06B6D4";
      case "deadline":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  }, []);

  // Format date range helper
  const formatDateRange = useCallback((startDate: string, endDate: string) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (start.isSame(end, "day")) {
      return start.format("MMM DD, YYYY");
    }

    return `${start.format("MMM DD, YYYY")} - ${end.format("MMM DD, YYYY")}`;
  }, []);

  // Get user full name helper
  const getUserFullName = useCallback((user: User) => {
    const { firstName, middleName, lastName } = user;
    return middleName
      ? `${firstName} ${middleName} ${lastName}`
      : `${firstName} ${lastName}`;
  }, []);

  // Navigate to previous/next period
  const navigatePeriod = useCallback(
    (direction: "prev" | "next") => {
      const unit =
        calendarView === "day"
          ? "day"
          : calendarView === "week"
          ? "week"
          : "month";
      const newDate =
        direction === "prev"
          ? selectedDate.subtract(1, unit)
          : selectedDate.add(1, unit);
      setSelectedDate(newDate);
    },
    [selectedDate, calendarView]
  );

  // Get events for a specific day and time slot
  const getEventsForDayAndTime = useCallback(
    (day: dayjs.Dayjs, hour: number) => {
      return weekEvents.filter((event) => {
        const eventStart = dayjs(event.startDate);
        const eventEnd = dayjs(event.endDate);

        const isMarkedAllDay = (event as any).isAllDay === true;
        if (isMarkedAllDay) return false;

        return eventStart.isSame(day, "day") && eventStart.hour() === hour;
      });
    },
    [weekEvents]
  );

  // Get all-day events for a specific day
  const getAllDayEvents = useCallback(
    (day: dayjs.Dayjs) => {
      return weekEvents.filter((event) => {
        const eventStart = dayjs(event.startDate);
        const eventEnd = dayjs(event.endDate);

        const isMarkedAllDay = (event as any).isAllDay === true;
        const isMultiDay = !eventStart.isSame(eventEnd, "day");

        const overlapsDay =
          eventStart.isSame(day, "day") ||
          eventEnd.isSame(day, "day") ||
          (eventStart.isBefore(day, "day") && eventEnd.isAfter(day, "day"));

        return overlapsDay && (isMarkedAllDay || isMultiDay);
      });
    },
    [weekEvents]
  );

  // Calculate event height based on duration
  const calculateEventHeight = useCallback(
    (startDate: string, endDate: string) => {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      const durationMinutes = end.diff(start, "minute");
      const hourHeight = 60;
      return Math.max((durationMinutes / 60) * hourHeight - 4, 60);
    },
    []
  );

  // Calculate event top offset within the hour slot
  const calculateEventTopOffset = useCallback((startDate: string) => {
    const start = dayjs(startDate);
    const minutes = start.minute();
    const hourHeight = 60;
    return (minutes / 60) * hourHeight;
  }, []);

  // Render event card in calendar grid
  const renderEventCard = useCallback(
    (event: Events, isAllDay: boolean = false) => {
      const eventStart = dayjs(event.startDate);
      const eventEnd = dayjs(event.endDate);
      const duration = eventEnd.diff(eventStart, "minute");
      const isMarkedAllDay = (event as any).isAllDay === true;

      const eventHeight =
        !isAllDay && !isMarkedAllDay
          ? calculateEventHeight(event.startDate, event.endDate)
          : undefined;
      const topOffset =
        !isAllDay && !isMarkedAllDay
          ? calculateEventTopOffset(event.startDate)
          : 0;

      return (
        <TouchableOpacity
          key={event._id}
          className="rounded-md p-2"
          style={{
            backgroundColor: getEventTypeColor(event.eventType),
            borderLeftWidth: 4,
            borderLeftColor: getPriorityColor(event.priority),
            marginBottom: 4,
            minHeight: isAllDay || isMarkedAllDay ? 32 : 60,
            height: eventHeight,
            position: !isAllDay && !isMarkedAllDay ? "absolute" : "relative",
            top: topOffset,
            left: 4,
            right: 4,
            zIndex: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() => openEventDetail(event)}
        >
          <Text
            className="font-inter_semibold text-xs text-white"
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {!isAllDay && !isMarkedAllDay && (
            <Text
              className="font-inter_regular text-xs text-white opacity-90"
              numberOfLines={1}
            >
              {eventStart.format("h:mm A")} - {eventEnd.format("h:mm A")}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [
      getEventTypeColor,
      getPriorityColor,
      openEventDetail,
      calculateEventHeight,
      calculateEventTopOffset,
    ]
  );

  // Render week view
  const renderWeekView = useCallback(() => {
    return (
      <View className="flex-1">
        {/* Week header with dates */}
        <View
          className={`flex-row ${isDarkMode ? "bg-[#121212]" : "bg-white"}`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "#333333" : "#E0E0E0",
          }}
        >
          <View
            style={{
              width: 60,
              borderRightColor: isDarkMode ? "#1E1E1E" : "#F1F3F4",
            }}
            className="p-2 border-r-2"
          >
            <Text
              className={`font-inter_regular text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              GMT+8
            </Text>
          </View>

          {weekDays.map((day, index) => {
            const isToday = day.isSame(dayjs(), "day");

            return (
              <View
                key={index}
                className="flex-1 items-center p-2"
                style={{
                  borderLeftWidth: index > 0 ? 1 : 0,
                  borderLeftColor: isDarkMode ? "#333333" : "#E0E0E0",
                }}
              >
                <Text
                  className={`font-inter_semibold text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {day.format("ddd").toUpperCase()}
                </Text>
                <View
                  className={`mt-1 rounded-full items-center justify-center ${
                    isToday ? "bg-[#1A73E8]" : ""
                  }`}
                  style={{
                    width: 28,
                    height: 28,
                  }}
                >
                  <Text
                    className={`font-inter_semibold text-sm ${
                      isToday
                        ? "text-white"
                        : isDarkMode
                        ? "text-[#E0E0E0]"
                        : "text-black"
                    }`}
                  >
                    {day.format("D")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* All-day events section */}
        <View
          className={`flex-row ${isDarkMode ? "bg-[#1A1A1A]" : "bg-[#F9FAFB]"}`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "#333333" : "#E0E0E0",
            minHeight: 48,
          }}
        >
          <View
            style={{
              width: 60,
              borderRightColor: isDarkMode ? "#1E1E1E" : "#F1F3F4",
            }}
            className="p-2 items-center justify-center border-r-2"
          >
            <Text
              className={`font-inter_regular text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              All-day
            </Text>
          </View>

          {weekDays.map((day, index) => {
            const allDayEvents = getAllDayEvents(day);

            return (
              <View
                key={index}
                className="flex-1 p-1"
                style={{
                  borderLeftWidth: index > 0 ? 1 : 0,
                  borderLeftColor: isDarkMode ? "#333333" : "#E0E0E0",
                }}
              >
                {allDayEvents.map((event) => renderEventCard(event, true))}
              </View>
            );
          })}
        </View>

        {/* Time slots grid */}
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {timeSlots.map((slot, slotIndex) => (
            <View
              key={slot.hour}
              className="flex-row"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? "#1E1E1E" : "#F1F3F4",
                height: 60,
              }}
            >
              <View
                style={{
                  width: 60,
                  borderRightColor: isDarkMode ? "#1E1E1E" : "#F1F3F4",
                }}
                className="p-2 pr-3 items-center justify-start border-r-2"
              >
                <Text
                  className={`font-inter_regular text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {slot.label}
                </Text>
              </View>

              {weekDays.map((day, dayIndex) => {
                const eventsInSlot = getEventsForDayAndTime(day, slot.hour);
                const isCurrentHour =
                  day.isSame(dayjs(), "day") && dayjs().hour() === slot.hour;

                return (
                  <View
                    key={dayIndex}
                    className={`flex-1 ${
                      isCurrentHour
                        ? isDarkMode
                          ? "bg-[#1A1A2E]"
                          : "bg-[#E8F0FE]"
                        : ""
                    }`}
                    style={{
                      borderLeftWidth: dayIndex > 0 ? 1 : 0,
                      borderLeftColor: isDarkMode ? "#1E1E1E" : "#F1F3F4",
                      position: "relative",
                    }}
                  >
                    {eventsInSlot.map((event) => renderEventCard(event, false))}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }, [
    weekDays,
    timeSlots,
    isDarkMode,
    getAllDayEvents,
    getEventsForDayAndTime,
    renderEventCard,
  ]);

  // Load events on component mount and when selected date changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchWeekEvents();
  }, [fetchWeekEvents]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-[#0F0F0F]" : "bg-[#F1F3F4]"}`}
      edges={['left', "right"]}
    >
      <View className="flex-1">
        {/* Mobile Header */}
        <View
          className={`flex-row items-center justify-between px-4 py-3 ${
            isDarkMode ? "bg-[#121212]" : "bg-white"
          }`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "#333333" : "#E0E0E0",
          }}
        >
          <Text
            className={`font-inter_semibold text-lg mr-2 ${
              isDarkMode ? "text-[#E0E0E0]" : "text-black"
            }`}
          >
            {selectedDate.format("MMM YYYY")}
          </Text>

          <View className="flex-row items-center">
            <TouchableOpacity
              className={`rounded-full p-2 mr-1 ${
                isDarkMode ? "bg-[#1E1E1E]" : "bg-[#F1F3F4]"
              }`}
              onPress={() => navigatePeriod("prev")}
            >
              <Text
                className={`font-inter_semibold ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                ‹
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-md px-3 py-2 mr-1 ${
                isDarkMode ? "bg-[#1E1E1E]" : "bg-[#F1F3F4]"
              }`}
              onPress={() => setSelectedDate(dayjs())}
            >
              <Text
                className={`font-inter_semibold text-xs ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-full p-2 mr-1 ${
                isDarkMode ? "bg-[#1E1E1E]" : "bg-[#F1F3F4]"
              }`}
              onPress={() => navigatePeriod("next")}
            >
              <Text
                className={`font-inter_semibold ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                ›
              </Text>
            </TouchableOpacity>

            {/* View Selector */}
            <View
              className="flex-row rounded-lg overflow-hidden"
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? "#333333" : "#E0E0E0",
              }}
            >
              <TouchableOpacity
                className={`px-4 py-2 ${
                  calendarView === "day"
                    ? isDarkMode
                      ? "bg-[#1A73E8]"
                      : "bg-[#1A73E8]"
                    : ""
                }`}
                onPress={() => setCalendarView("day")}
              >
                <Text
                  className={`font-inter_semibold text-xs ${
                    calendarView === "day"
                      ? "text-white"
                      : isDarkMode
                      ? "text-[#E0E0E0]"
                      : "text-black"
                  }`}
                >
                  Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 ${
                  calendarView === "week"
                    ? isDarkMode
                      ? "bg-[#1A73E8]"
                      : "bg-[#1A73E8]"
                    : ""
                }`}
                onPress={() => setCalendarView("week")}
                style={{
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: isDarkMode ? "#333333" : "#E0E0E0",
                }}
              >
                <Text
                  className={`font-inter_semibold text-xs ${
                    calendarView === "week"
                      ? "text-white"
                      : isDarkMode
                      ? "text-[#E0E0E0]"
                      : "text-black"
                  }`}
                >
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 ${
                  calendarView === "month"
                    ? isDarkMode
                      ? "bg-[#1A73E8]"
                      : "bg-[#1A73E8]"
                    : ""
                }`}
                onPress={() => setCalendarView("month")}
              >
                <Text
                  className={`font-inter_semibold text-xs ${
                    calendarView === "month"
                      ? "text-white"
                      : isDarkMode
                      ? "text-[#E0E0E0]"
                      : "text-black"
                  }`}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Calendar View */}
        <View
          className="flex-1"
          style={{ backgroundColor: isDarkMode ? "#0F0F0F" : "#FFFFFF" }}
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#1A73E8" />
              <Text
                className={`font-inter_regular mt-4 ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Loading calendar...
              </Text>
            </View>
          ) : (
            renderWeekView()
          )}
        </View>

        {/* Floating Calendar Button */}
        <TouchableOpacity
          onPress={() => setCalendarPickerVisible(true)}
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isDarkMode ? "#2C2C2E" : "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <CalendarIcon
            width={24}
            height={24}
            color={isDarkMode ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>
      </View>

      {/* Calendar Picker Modal */}
      <Modal
        visible={calendarPickerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarPickerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setCalendarPickerVisible(false)}
        >
          <Pressable
            className={`w-[90%] max-w-[400px] rounded-lg p-4 ${
              isDarkMode ? "bg-[#121212]" : "bg-white"
            }`}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row justify-between items-center mt-2 mb-4">
              <Text
                className={`font-inter_bold text-xl ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`}
              >
                Select Date
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarPickerVisible(false)}
              >
                <CloseIcon
                  width={24}
                  height={24}
                  color={isDarkMode ? "#E0E0E0" : "black"}
                />
              </TouchableOpacity>
            </View>

            <DatePicker
              calendar="gregory"
              mode="single"
              date={selectedDate}
              firstDayOfWeek={0}
              navigationPosition="right"
              onChange={(params) => {
                if (params?.date) {
                  const newDate = dayjs(params.date);
                  setSelectedDate(newDate);
                }
              }}
              classNames={{
                ...defaultClassNames,
                today: "rounded-full",
                today_label: `font-inter_semibold text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                month_selector_label: `font-inter_bold text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                year_selector_label: `font-inter_bold text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                weekday_label: `font-inter_semibold text-xs ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                outside_label: `font-inter_regular text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`,
                day_label: `font-inter_regular text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                selected_month: "bg-[#1A73E8] rounded-lg",
                selected_month_label: "font-inter_semibold text-white text-sm",
                month_label: `font-inter_regular text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                year_label: `font-inter_regular text-sm ${
                  isDarkMode ? "text-[#E0E0E0]" : "text-black"
                }`,
                selected_year: "bg-[#1A73E8] rounded-lg",
                selected_year_label: "font-inter_semibold text-white text-sm",
                selected: "bg-[#1A73E8] rounded-full",
                selected_label: "font-inter_semibold text-white text-sm",
                disabled: "opacity-50",
              }}
              className={`w-full ${isDarkMode ? "bg-[#121212]" : "bg-white"}`}
              showOutsideDays={true}
              styles={{
                button_prev_image: {
                  tintColor: isDarkMode ? "#E0E0E0" : "black",
                },
                button_next_image: {
                  tintColor: isDarkMode ? "#E0E0E0" : "black",
                },
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        visible={eventDetailVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEventDetailVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setEventDetailVisible(false)}
        >
          <Pressable
            className={`w-[90%] max-w-[600px] rounded-lg p-6 ${
              isDarkMode ? "bg-[#121212]" : "bg-white"
            }`}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedEventForDetail && (
              <>
                <View className="flex-row justify-between items-start mb-4">
                  <View
                    className="rounded-md px-3 py-1"
                    style={{
                      backgroundColor: getEventTypeColor(
                        selectedEventForDetail.eventType
                      ),
                    }}
                  >
                    <Text className="font-inter_semibold text-xs text-white">
                      {selectedEventForDetail.eventType.toUpperCase()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setEventDetailVisible(false)}
                  >
                    <CloseIcon
                      width={24}
                      height={24}
                      color={isDarkMode ? "#E0E0E0" : "black"}
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  className={`font-inter_bold text-2xl mb-2 ${
                    isDarkMode ? "text-[#E0E0E0]" : "text-black"
                  }`}
                >
                  {selectedEventForDetail.title}
                </Text>

                <View className="flex-row items-center mb-3">
                  <View>
                    {(selectedEventForDetail as any).isAllDay ? (
                      <View className="flex-row items-center">
                        <ColoredCalendarIcon
                          width={20}
                          height={20}
                          className="mr-1"
                        />
                        <Text
                          className={`font-inter_regular text-sm ${
                            isDarkMode ? "text-[#E0E0E0]" : "text-black"
                          }`}
                        >
                          {formatDateRange(
                            selectedEventForDetail.startDate,
                            selectedEventForDetail.endDate
                          )}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-col">
                        <View className="flex-row items-center">
                          <ColoredCalendarIcon
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          <Text
                            className={`font-inter_regular text-sm ${
                              isDarkMode ? "text-[#E0E0E0]" : "text-black"
                            }`}
                          >
                            {dayjs(selectedEventForDetail.startDate).format(
                              "MMM DD, YYYY"
                            )}
                            {!dayjs(selectedEventForDetail.startDate).isSame(
                              dayjs(selectedEventForDetail.endDate),
                              "day"
                            ) &&
                              ` - ${dayjs(
                                selectedEventForDetail.endDate
                              ).format("MMM DD, YYYY")}`}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <ColoredTimeIcon
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          <Text
                            className={`font-inter_regular text-sm ${
                              isDarkMode ? "text-[#E0E0E0]" : "text-black"
                            }`}
                          >
                            {dayjs(selectedEventForDetail.startDate).format(
                              "h:mm A"
                            )}{" "}
                            -{" "}
                            {dayjs(selectedEventForDetail.endDate).format(
                              "h:mm A"
                            )}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                <View className="flex-row items-center mb-4">
                  <View
                    className="rounded-full px-3 py-1"
                    style={{
                      backgroundColor: getPriorityColor(
                        selectedEventForDetail.priority
                      ),
                    }}
                  >
                    <Text className="font-inter_semibold text-xs text-white">
                      {selectedEventForDetail.priority === "high"
                        ? "🔴 High Priority"
                        : selectedEventForDetail.priority === "medium"
                        ? "🟡 Medium Priority"
                        : "🟢 Low Priority"}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`font-inter_semibold text-base mb-2 ${
                    isDarkMode ? "text-[#E0E0E0]" : "text-black"
                  }`}
                >
                  {selectedEventForDetail.header}
                </Text>

                <ScrollView className="max-h-[200px] mb-4">
                  <Text
                    className={`font-inter_regular text-sm ${
                      isDarkMode ? "text-[#E0E0E0]" : "text-black"
                    }`}
                  >
                    {selectedEventForDetail.body}
                  </Text>
                </ScrollView>

                {selectedEventForDetail.images &&
                  selectedEventForDetail.images.length > 0 && (
                    <View className="flex-row flex-wrap mb-4">
                      {selectedEventForDetail.images.map((imageUrl, index) => (
                        <Pressable
                          key={index}
                          onPress={() => {
                            setSelectedImageUrl(imageUrl);
                            setImageViewerVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri: imageUrl }}
                            style={{
                              width: 100,
                              height: 100,
                              marginRight: 8,
                              marginBottom: 8,
                              borderRadius: 8,
                            }}
                            contentFit="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}

                <View
                  className={`rounded-lg p-3 mb-4 ${
                    isDarkMode ? "bg-[#1E1E1E]" : "bg-[#F1F3F4]"
                  }`}
                >
                  <Text
                    className={`font-inter_regular text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    } mb-1`}
                  >
                    Created by
                  </Text>
                  <View className="flex-row items-center">
                    <Image
                      source={
                        selectedEventForDetail.createdBy.profilePicture
                          ? {
                              uri: selectedEventForDetail.createdBy
                                .profilePicture,
                            }
                          : require("@/assets/images/sample_profile_picture.png")
                      }
                      style={{
                        width: 32,
                        height: 32,
                        marginRight: 8,
                        borderRadius: 16,
                      }}
                      contentFit="cover"
                    />
                    <View>
                      <Text
                        className={`font-inter_semibold text-sm ${
                          isDarkMode ? "text-[#E0E0E0]" : "text-black"
                        }`}
                      >
                        {getUserFullName(selectedEventForDetail.createdBy)}
                      </Text>
                      <Text
                        className={`font-inter_regular text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {dayjs(selectedEventForDetail.createdAt).format(
                          "MMM D, YYYY h:mm A"
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
              style={{ width: "90%", height: "90%" }}
              contentFit="contain"
            />
          )}
        </Pressable>
      </Modal>

      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </SafeAreaView>
  );
};

export default CalendarAndroid;