import { Link, Redirect } from "expo-router";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  return <Redirect href="/(auth)/signin"/>
}
