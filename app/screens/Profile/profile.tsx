import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../../components/backButton";
const {height,width} = Dimensions.get("window");

export default function Profile(){
    const router = useRouter();
    return(
        <SafeAreaView style={styles.container}>
            <BackButton/>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container:{
        flex:1,
        justifyContent:"center",
        alignItems:"center"
    }
});