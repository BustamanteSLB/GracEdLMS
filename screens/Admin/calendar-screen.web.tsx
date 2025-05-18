import { Modal, Pressable, Text, TouchableOpacity, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import DatePicker from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { Image } from 'expo-image'

const CalendarWeb: React.FC = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const currentDate = new Date();
  const dayOfWeek = currentDate.toLocaleString("en-US", { weekday: "long" });
  const date = currentDate.toLocaleDateString();

  const minDate = dayjs().subtract(50, "year");
  const maxDate = dayjs().add(50, "year");

  cssInterop(Image, { className: "style" });

  return (
    <SafeAreaView className={`flex-1 items-center justify-start p-3 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <View className="flex-row items-center mb-5 bg-pink-300 mt-3 p-3 rounded-xl w-full">
          <Text className="text-black text-[18px] font-inter_semibold">
            {`${dayOfWeek}, ${date}`}
          </Text>

          <TouchableOpacity
            onPress={() => setCalendarVisible(true)}
            className="ml-auto"
          >
            <Image source={require('@/assets/icons/calendar_month.png')} className="w-6 h-6" tintColor="black" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={calendarVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setCalendarVisible(false)}
        >
          <Pressable
            className="flex-1 justify-center items-center bg-black/50"
            onPressOut={() => setCalendarVisible(false)}
          >
            <View className="bg-white p-5 rounded-2xl shadow-lg">
              <DatePicker
                mode="single"
                date={selectedDate}
                onChange={(params) => {
                  // params is usually { date: DateType }
                  if (params?.date) {
                    const newDate = dayjs(params.date);
                    setSelectedDate(newDate);
                    console.log("Selected date:", newDate.format("YYYY-MM-DD"));
                  }
                  setCalendarVisible(false);
                }}
                minDate={minDate}
                maxDate={maxDate}
                style={{ width: 325 }}
              />
            </View>
          </Pressable>
        </Modal>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default CalendarWeb