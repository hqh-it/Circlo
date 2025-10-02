import { Stack } from "expo-router";
import { AuthProvider } from "../services/Auth/AuthContext";
export default function RootLayout() {

  return (
  <AuthProvider>
    <Stack screenOptions={{ headerShown: false }} />
  </AuthProvider>
  );
}
