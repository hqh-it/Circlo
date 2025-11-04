import { useFocusEffect } from "@react-navigation/native";
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
    const [productSubTab, setProductSubTab] = React.useState("Products");
    const [historySubTab, setHistorySubTab] = React.useState("Orders"); // Thêm state cho History sub-tab
    const [refreshKey, setRefreshKey] = React.useState(0);
    
    useFocusEffect(
        React.useCallback(() => {
            setRefreshKey(prev => prev + 1);
        }, [])
    );

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
                    Products
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
                    <View style={styles.productContainer}>
                        <View style={styles.ProductsubTabBar}>
                            <TouchableOpacity 
                                style={[
                                    styles.subTabButton, 
                                    productSubTab === "Products" && styles.activeProductSubTab
                                ]} 
                                onPress={() => setProductSubTab("Products")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    productSubTab === "Products" && styles.activeSubTabText
                                ]}>
                                    Normal
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.subTabButton, 
                                    productSubTab === "Auction" && styles.activeProductSubTab
                                ]} 
                                onPress={() => setProductSubTab("Auction")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    productSubTab === "Auction" && styles.activeSubTabText
                                ]}>
                                    Auction
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.feedContainer}>
                            {productSubTab === "Products" && (
                                <ProductFeed 
                                    key={`normal-${refreshKey}`}
                                    mode="user" 
                                    userId={user?.uid} 
                                    isOwnProfile={true}
                                    productType="normal"
                                />
                            )}
                            {productSubTab === "Auction" && (
                                <ProductFeed 
                                    key={`auction-${refreshKey}`}
                                    mode="user" 
                                    userId={user?.uid} 
                                    isOwnProfile={true}
                                    productType="auction" 
                                />
                            )}
                        </View>
                    </View>
                )}
                {selectedTab === "History" && (
                    <View style={styles.historyContainer}>
                        <View style={styles.historySubTabBar}>
                            <TouchableOpacity 
                                style={[
                                    styles.subTabButton, 
                                    historySubTab === "Orders" && styles.activeHistorySubTab
                                ]} 
                                onPress={() => setHistorySubTab("Orders")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    historySubTab === "Orders" && styles.activeSubTabText
                                ]}>
                                     Orders
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.subTabButton, 
                                    historySubTab === "Purchased" && styles.activeHistorySubTab
                                ]} 
                                onPress={() => setHistorySubTab("Purchased")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    historySubTab === "Purchased" && styles.activeSubTabText
                                ]}>
                                     Purchased
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.feedContainer}>
                            {historySubTab === "Orders" && (
                                <View style={styles.placeholderContainer}>
                                    <Text style={styles.placeholderText}>
                                        Your orders will appear here
                                    </Text>
                                </View>
                            )}
                            {historySubTab === "Purchased" && (
                                <View style={styles.placeholderContainer}>
                                    <Text style={styles.placeholderText}>
                                        Your purchased items will appear here
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
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
    productContainer: {
        flex: 1,
        width: '100%',
    },
    historyContainer: {
        flex: 1,
        width: '100%',
    },
    ProductsubTabBar: {
        flexDirection: 'row',
        height: 40,
        backgroundColor: '#f5f5f5',
        borderBottomWidth:2,
        borderTopWidth: 2,
        borderBottomColor: '#e0e0e0',
        borderTopColor: '#2cd53aff',
    },
    historySubTabBar: {
        flexDirection: 'row',
        height: 40,
        backgroundColor: '#f5f5f5',
        borderBottomWidth:2,
        borderTopWidth: 2,
        borderBottomColor: '#e0e0e0',
        borderTopColor: '#ffbc58ff',
    },
    subTabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    activeProductSubTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2cd53aff',
        backgroundColor: '#e3f4deff',
    },
    activeHistorySubTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#ffbc58ff',
        backgroundColor: '#f8f8e1ff',
    },
    subTabText: {
        fontSize: 14,
        color: '#666',
    },
    activeSubTabText: {
        fontWeight: 'bold',
        color: '#000000ff',
    },
    feedContainer: {
        flex: 1,
        width: '100%',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    }
});