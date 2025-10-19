import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../services/Auth/AuthContext";
import Header from "../../components/header_for_detail";
import PersonalInfo from "../../components/PersonalInfo";
import ProductFeed from "../../components/ProductFeed";

const {height,width} = Dimensions.get("window");

export default function Profile(){
    const { user } = useAuth(); 
    const [selectedTab, setSelectedTab] = React.useState("Information");
    const tabColors:any= {
        Information:"#e4f6efff", 
        Product:"#e3f4deff", 
        History:"#f8f8e1ff"
    };

    return(
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="User's Profile"/>
            <View style={[styles.menubar,  {backgroundColor: tabColors[selectedTab] }]}>
                <TouchableOpacity onPress={() => setSelectedTab("Information")}>
                    <Text style={{ fontWeight: selectedTab === "Information" ? "bold" : "normal" }}>
                    Information
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedTab("Product")}>
                    <Text style={{ fontWeight: selectedTab === "Product" ? "bold" : "normal" }}>
                    Product
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedTab("History")}>
                    <Text style={{ fontWeight: selectedTab === "History" ? "bold" : "normal" }}>
                    History
                    </Text>
                </TouchableOpacity>                
            </View>
            <View style={[styles.contentBox,  {backgroundColor: tabColors[selectedTab] }]}>
                {selectedTab === "Information" && <PersonalInfo/>}
                {selectedTab === "Product" && (
                    <View style={styles.productFeedContainer}>
                        <ProductFeed mode="user" userId={user?.uid} isOwnProfile={true}/>
                    </View>
                )}
                {selectedTab === "History" && <Text>You haven't buy any product!</Text>}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:{
        flex: 1,
        flexDirection:"column",
        alignItems:"center",
        backgroundColor:"#ffffffff"
    },
    menubar:{
        height: height*0.05,
        width: width,
        flexDirection: "row", 
        justifyContent: "space-around", 
        alignContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        marginTop:5,
    },
    contentBox: {
        flex:1,
        width: width,
        marginVertical:5,
        backgroundColor: "white", 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3
    },
    productFeedContainer: {
        flex: 1,
        width: '100%',
    }
});