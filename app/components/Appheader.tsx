import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";

const {height, width}= Dimensions.get("window");

export default function Appheader(){
    const router = useRouter();
    return (
        <View style={styles.container}>
            <TouchableOpacity >
                <Image style={styles.icon} source={require('../assets/icons/menu.png')}></Image>
            </TouchableOpacity>
            
            <Image style={styles.logo} source={require('../assets/images/logo.png')}></Image>
            
            <TouchableOpacity onPress={()=>router.push("/screens/Profile/profile")}>
              <Image style={styles.profile} source={require('../assets/icons/user.png')}></Image>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    top:0,
    left: 0,
    right: 0,
    height: height* 0.07,
    width: width,
    backgroundColor: "#01332fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  logo:{
    height: height* 0.07,
    width:width*0.17, 
  },
  profile:{
    height: width*0.1,
    width:width*0.1, 
    margin:height*0.01
  },
  icon:{
    height:height*0.05,
    width:width*0.1, 
    margin:height*0.01
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },

});