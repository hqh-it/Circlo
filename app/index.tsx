import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Homepage from "./screens/Home/homepage";
export default function Index() {
  return (
    <SafeAreaView style={{
          flex: 1,
          flexDirection:"column",
          alignItems:"center",
          backgroundColor:"#ffffffff"
        }}>   
        <Homepage/>
    </SafeAreaView>
  );
}