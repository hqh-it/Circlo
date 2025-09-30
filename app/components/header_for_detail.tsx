import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { height, width } = Dimensions.get("window");

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>

      <View style={styles.left}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            style={styles.backIcon}
            source={require("../assets/icons/back.png")}
          />
        </TouchableOpacity>
      </View>


      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
      </View>


      <View style={styles.right} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: width,
    height: height * 0.1,
    backgroundColor: "#01332fff",
    paddingHorizontal: 10,
  },
  left: {
    flex: 1,
    justifyContent: "flex-start",
  },
  center: {
    flex: 2,
    alignItems: "center",
  },
  right: {
    flex: 1, 
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  backIcon: {
    height: height * 0.06,
    width: height * 0.04,
    tintColor: "white",
    resizeMode: "contain",
  },
});
