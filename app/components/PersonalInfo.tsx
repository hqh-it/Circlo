import React from "react";
import { Dimensions, Image, ImageBackground, StyleSheet, Text, View } from "react-native";



const {width} = Dimensions.get("window");

export default function PersonalInfo() {   

  return (
    <View style={styles.container}>
        <View style={{width:width,flexDirection:"column", justifyContent:"space-between",}}>            
            <ImageBackground source={require('../assets/images/background_profile.jpg')}>
              {/* Avatar */}
              <View style={{justifyContent:"center", alignItems:"center",paddingVertical:10}}>
                  <Image
                  source={require("../assets/images/avatar.png")}
                  style={{
                      width: width*0.35,
                      height: width*0.35,
                      borderRadius: 100,
                      borderWidth:5,
                      borderColor:"#D4A017",
                      }}/>
              </View>
              {/* Rate - Follow*/}
              <View style={{
                  width:width,
                  flexDirection:"row",
                  justifyContent:"space-around",
                  alignItems:"center",
                  paddingVertical:5,
                  backgroundColor:"#f1aa05d5",
                  }}>
                  <View style={styles.ratingcolumn}>
                    <Image style={styles.ratingicon} source={require('../assets/icons/strust2.png')} />
                    <Text>Trust Score:0</Text>
                  </View>
                  <View style={styles.ratingcolumn}>
                    <Image style={styles.ratingicon}source={require('../assets/icons/follower.png')} />
                    <Text>follower:0</Text>
                  </View>
                  <View style={styles.ratingcolumn}>
                    <Image style={styles.ratingicon} source={require('../assets/icons/following.png')} />
                    <Text>following:0</Text>
                  </View>
              </View>
            </ImageBackground>

        </View>

        <View style={{width:width, flexDirection:"column", justifyContent:"center", alignItems:"center",paddingHorizontal:10}}>
            <View style={{width:width, flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:10,padding:5,borderTopWidth:5,borderColor:"white"}} >
              <Text style={styles.title}>Your information:</Text>

              Edit profile 
              <View style={{flexDirection:"column",justifyContent:"space-between", alignItems:"center"}}>
                  <Image source={require('../assets/icons/edit.png')}
                  style={{
                    width:width*0.03,
                    height:width*0.03,
                    padding:5
                  }}/>
                  <Text>Edit profile</Text>
              </View>
            </View>

            {/* Infor of User */}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>Nguyen Van A</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>abc@gmail.com</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>0123456789</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>123 Main Street</Text>
            </View>
        </View>    
        <View>
            <Text>Logout</Text> 
        </View>   
                                               
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    width: width,
    flexDirection: "column",
    alignItems: "center",
  },
  title:{
    fontSize:13,
    fontWeight:"bold"
  },
  infoRow: {
    flexDirection: "row",
    marginVertical: 10,
  },
  label: {
    width: "20%", 
    fontWeight: "bold",
    fontSize: 14,
    padding:5
  },
  value: {
    width: "80%", 
    fontSize: 14,
    fontWeight:"500",
    borderWidth:2,
    borderColor:"#00A86B",
    borderRadius:10,
    backgroundColor:"#ffffffff",
    padding:5
  },
    ratingcolumn: {
    flexDirection: "column",
    marginVertical: 5,
    alignItems:"center",
    justifyContent:"center"
  },
  ratingicon:{
    width: width*0.05,
    height: width*0.05,    

  }
});
