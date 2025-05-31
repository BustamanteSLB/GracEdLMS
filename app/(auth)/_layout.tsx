import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="register" options={{ headerShown: false }}/>
      <Stack.Screen name="signin" options={{ headerShown: false }}/>
    </Stack>
  )
}
