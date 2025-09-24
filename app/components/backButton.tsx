import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, TouchableOpacity, View } from "react-native";


export default function BackButton() {
    const router = useRouter();
    const {height,width} = Dimensions.get("window");
    return (
        <View style={{ alignItems: "flex-start"}}>
                        <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", left: 0, top: 0 }}>
                            <Image
                            style={{
                                position: "absolute",
                                height: height * 0.06,
                                width: height * 0.04,
                                tintColor: "black",
                                resizeMode: "contain",
                            }}
                            source={require("../assets/icons/back.png")}
                            />
                        </TouchableOpacity>
                    </View>);}