import React from "react";
import { Dimensions, Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Header from "../components/header_for_detail";

const { width } = Dimensions.get("window");

export default function EditProfile() {   
  return (
    <View style={styles.container}>

      <Header title="Edit Profile"/>

      <ImageBackground 
        source={require('../assets/images/background_profile.jpg')} 
        style={styles.headerBackground}
        imageStyle={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <View>
          <Image
            source={require("../assets/images/avatar.png")}
            style={styles.avatar}/>

          {/* Change avatar button */}
          <TouchableOpacity style={styles.changeAvatarBtn}>
            <Image 
              source={require('../assets/icons/avatar.png')} 
              style={styles.changeAvatarIcon} />
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Thông tin */}
      <View style={styles.formWrapper}>
        <Text style={styles.sectionTitle}>Your information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <TextInput style={styles.input} defaultValue="Nguyen Van A"/>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <TextInput style={styles.input} defaultValue="abc@gmail.com"/>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Phone:</Text>
          <TextInput style={styles.input} defaultValue="0123456789"/>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address:</Text>
          <TextInput style={styles.input} defaultValue="123 Main Street"/>
        </View>
      </View>
        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSave]}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>

        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor: "#f8f8f8",
  },
  headerBackground:{
    width:"100%",
    alignItems:"center",
    paddingVertical:20,
  },
  avatar:{
    width: width*0.35,
    height: width*0.35,
    borderRadius: 100,
    borderWidth:4,
    borderColor:"#D4A017",
  },
  changeAvatarBtn:{
    position:"absolute",
    bottom:5,
    right: width*0.28/2,
    backgroundColor:"#D4A017",
    borderRadius:20,
    padding:6,
    elevation:3,
  },
  changeAvatarIcon:{
    width:20,
    height:20,
    tintColor:"#ffffffff"
  },
  formWrapper:{
    flex:1,
    marginTop:15,
    paddingHorizontal:20,
  },
  sectionTitle:{
    fontSize:16,
    fontWeight:"bold",
    marginBottom:10,
    color:"#333"
  },
  infoRow:{
    flexDirection:"row",
    alignItems:"center",
    marginBottom:12,
  },
  label:{
    width:"25%",
    fontWeight:"600",
    fontSize:14,
    color:"#444",
  },
  input:{
    flex:1,
    fontSize:14,
    borderWidth:1.5,
    borderColor:"#00A86B",
    borderRadius:12,
    backgroundColor:"#fff",
    paddingHorizontal:12,
    paddingVertical:8,
  },
  btnRow:{
    flexDirection:"row",
    justifyContent:"space-around",
    marginTop:25,
    paddingVertical:10
  },
  btn:{
    width:"40%",
    paddingVertical:10,
    borderRadius:20,
    alignItems:"center",
  },
  btnSave:{
    backgroundColor:"#00A86B",
  },
  btnCancel:{
    backgroundColor:"#e97575ff",
  },
  btnText:{
    color:"#fff",
    fontSize:14,
    fontWeight:"600"
  }
});
