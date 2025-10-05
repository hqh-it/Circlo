import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";
const { height, width } = Dimensions.get("window");

export default function Appfooter() {
  const router = useRouter();
  return (
    <View style={styles.container}>

      <LinearGradient
        colors={["#003B36", "#00A86B", "#92f266"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/home.png")} />
        </TouchableOpacity>

        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/auction.png")} />
        </TouchableOpacity>

        <View style={{ width: width*0.01 }} />

        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/bell.png")} />
        </TouchableOpacity>

        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/chat.png")} />
        </TouchableOpacity>
      </LinearGradient>
      <View style={styles.under_main_button}>
        <TouchableOpacity style={styles.main_button} onPress={()=> router.push('/screens/Products/add_product')}>
            <Image style={styles.icon} source={require("../assets/icons/flus.png")} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    height: height * 0.085,
    alignItems: "center",
  },
  gradient: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  icon: {
    height:height*0.04,
    width:height*0.04, 
    margin:height*0.01,
    tintColor: "white",
  },
  main_button: {
    height:height*0.1,
    width:height*0.1, 
    backgroundColor: "#D4A017",
    borderRadius:100,
    justifyContent: "center",
    alignItems: "center",
  },
  under_main_button: {
    height:height*0.12,
    width:height*0.12, 
    backgroundColor: "#ffffffff",
    borderRadius:100,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom:height *0.035,
  },
});
