import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import EditProfile from "./components/EditProfile";
export default function Index() {
  return (
    <SafeAreaView style={{
          flex: 1,
          flexDirection:"column",
          alignItems:"center",
          backgroundColor:"#ffffffff"
        }}>   
        <EditProfile/>
    </SafeAreaView>
  );
}