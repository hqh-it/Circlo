import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Login from "./screens/Auth/login";
export default function Index() {
  return (
    <SafeAreaView style={{
          flex: 1,
          flexDirection:"column",
          alignItems:"center",
          backgroundColor:"#ffffffff"
        }}>   
        <Login/>
    </SafeAreaView>
  );
}