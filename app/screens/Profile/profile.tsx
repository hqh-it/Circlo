import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../services/Auth/AuthContext";
import Header from "../../components/header_for_detail";
import HistoryFeed from "../../components/HistoryFeed";
import PersonalInfo from "../../components/PersonalInfo";
import ProductFeed from "../../components/ProductFeed";

const {height,width} = Dimensions.get("window");

export default function Profile(){
    const { user } = useAuth(); 
    const [selectedTab, setSelectedTab] = React.useState("Information");
    const [productSubTab, setProductSubTab] = React.useState("Products");
    const [historySubTab, setHistorySubTab] = React.useState("Orders");
    const [refreshKey, setRefreshKey] = React.useState(0);
    
    // Animation values
    const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
    const productTabIndicatorAnim = useRef(new Animated.Value(0)).current;
    const historyTabIndicatorAnim = useRef(new Animated.Value(0)).current;
    const tabWidth = width / 3; // 3 tabs
    
    useFocusEffect(
        React.useCallback(() => {
            setRefreshKey(prev => prev + 1);
        }, [])
    );

    // Update indicator position when main tab changes
    useEffect(() => {
        let targetPosition = 0;
        switch(selectedTab) {
            case "Information":
                targetPosition = 0;
                break;
            case "Product":
                targetPosition = 1;
                break;
            case "History":
                targetPosition = 2;
                break;
        }
        
        Animated.spring(tabIndicatorAnim, {
            toValue: targetPosition,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
        }).start();
    }, [selectedTab]);

    // Update product subtab indicator position
    useEffect(() => {
        let targetPosition = 0;
        switch(productSubTab) {
            case "Products":
                targetPosition = 0;
                break;
            case "Auction":
                targetPosition = 1;
                break;
            case "Pending":
                targetPosition = 2;
                break;
        }
        
        Animated.spring(productTabIndicatorAnim, {
            toValue: targetPosition,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
        }).start();
    }, [productSubTab]);

    // Update history subtab indicator position
    useEffect(() => {
        let targetPosition = 0;
        switch(historySubTab) {
            case "Orders":
                targetPosition = 0;
                break;
            case "Purchased":
                targetPosition = 1;
                break;
        }
        
        Animated.spring(historyTabIndicatorAnim, {
            toValue: targetPosition,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
        }).start();
    }, [historySubTab]);

    const tabColors:any= {
        Information:"#e4f6efff", 
        Product:"#e3f4deff", 
        History:"#f8f8e1ff"
    };

    const handleTabPress = (tabName: string) => {
        setSelectedTab(tabName);
    };

    const handleProductSubTabPress = (subTabName: string) => {
        setProductSubTab(subTabName);
    };

    const handleHistorySubTabPress = (subTabName: string) => {
        setHistorySubTab(subTabName);
    };

    return(
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="User's Profile"/>
            
            <View style={[styles.menubar,  {backgroundColor: tabColors[selectedTab] }]}>
                {/* Animated White Background Indicator */}
                <Animated.View 
                    style={[
                        styles.tabIndicator,
                        {
                            transform: [{
                                translateX: tabIndicatorAnim.interpolate({
                                    inputRange: [0, 1, 2],
                                    outputRange: [0, tabWidth, tabWidth * 2]
                                })
                            }]
                        }
                    ]} 
                />
                
                <TouchableOpacity 
                    style={styles.tabButton} 
                    onPress={() => handleTabPress("Information")}
                >
                    <Text style={[
                        styles.tabText,
                        selectedTab === "Information" && styles.activeTabText
                    ]}>
                        Information
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.tabButton} 
                    onPress={() => handleTabPress("Product")}
                >
                    <Text style={[
                        styles.tabText,
                        selectedTab === "Product" && styles.activeTabText
                    ]}>
                        Products
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.tabButton} 
                    onPress={() => handleTabPress("History")}
                >
                    <Text style={[
                        styles.tabText,
                        selectedTab === "History" && styles.activeTabText
                    ]}>
                        History
                    </Text>
                </TouchableOpacity>                
            </View>
            
            <View style={[styles.contentBox,  {backgroundColor: tabColors[selectedTab] }]}>
                {selectedTab === "Information" && <PersonalInfo/>}
                {selectedTab === "Product" && (
                    <View style={styles.productContainer}>
                        <View style={[styles.ProductsubTabBar, { position: 'relative' }]}>
                            {/* Product SubTab Indicator */}
                            <Animated.View 
                                style={[
                                    styles.subTabIndicator,
                                    {
                                        width: width / 3,
                                        transform: [{
                                            translateX: productTabIndicatorAnim.interpolate({
                                                inputRange: [0, 1, 2],
                                                outputRange: [0, width / 3, (width / 3) * 2]
                                            })
                                        }],
                                        backgroundColor: '#e3f4deff',
                                    }
                                ]} 
                            />
                            
                            {/* Product SubTab Border Indicator */}
                            <Animated.View 
                                style={[
                                    styles.subTabBorderIndicator,
                                    {
                                        width: width / 3,
                                        transform: [{
                                            translateX: productTabIndicatorAnim.interpolate({
                                                inputRange: [0, 1, 2],
                                                outputRange: [0, width / 3, (width / 3) * 2]
                                            })
                                        }],
                                        borderBottomColor: '#2cd53aff',
                                    }
                                ]} 
                            />
                            
                            <TouchableOpacity 
                                style={styles.subTabButton} 
                                onPress={() => handleProductSubTabPress("Products")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    productSubTab === "Products" && styles.activeSubTabText
                                ]}>
                                    Normal
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.subTabButton} 
                                onPress={() => handleProductSubTabPress("Auction")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    productSubTab === "Auction" && styles.activeSubTabText
                                ]}>
                                    Auction
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.subTabButton} 
                                onPress={() => handleProductSubTabPress("Pending")}
                            >
                                <View style={styles.pendingTab}>
                                    <Text style={[
                                        styles.subTabText,
                                        productSubTab === "Pending" && styles.activeSubTabText
                                    ]}>
                                        Pending
                                    </Text>
                                </View>
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
                                    status="active"
                                />
                            )}
                            {productSubTab === "Auction" && (
                                <ProductFeed 
                                    key={`auction-${refreshKey}`}
                                    mode="user" 
                                    userId={user?.uid} 
                                    isOwnProfile={true}
                                    productType="auction" 
                                    status="active"
                                />
                            )}
                            {productSubTab === "Pending" && (
                                <ProductFeed 
                                    key={`pending-${refreshKey}`}
                                    mode="user" 
                                    userId={user?.uid} 
                                    isOwnProfile={true}
                                    productType="all"
                                    status="pending"
                                />
                            )}
                        </View>
                    </View>
                )}
                {selectedTab === "History" && (
                    <View style={styles.historyContainer}>
                        <View style={[styles.historySubTabBar, { position: 'relative' }]}>
                            {/* History SubTab Indicator */}
                            <Animated.View 
                                style={[
                                    styles.subTabIndicator,
                                    {
                                        width: width / 2,
                                        transform: [{
                                            translateX: historyTabIndicatorAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, width / 2]
                                            })
                                        }],
                                        backgroundColor: '#f8f8e1ff',
                                    }
                                ]} 
                            />
                            
                            {/* History SubTab Border Indicator */}
                            <Animated.View 
                                style={[
                                    styles.subTabBorderIndicator,
                                    {
                                        width: width / 2,
                                        transform: [{
                                            translateX: historyTabIndicatorAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, width / 2]
                                            })
                                        }],
                                        borderBottomColor: '#ffbc58ff',
                                    }
                                ]} 
                            />
                            
                            <TouchableOpacity 
                                style={styles.subTabButton} 
                                onPress={() => handleHistorySubTabPress("Orders")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    historySubTab === "Orders" && styles.activeSubTabText
                                ]}>
                                    Your Sales
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.subTabButton} 
                                onPress={() => handleHistorySubTabPress("Purchased")}
                            >
                                <Text style={[
                                    styles.subTabText,
                                    historySubTab === "Purchased" && styles.activeSubTabText
                                ]}>
                                    Your Purchases
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.feedContainer}>
                            {historySubTab === "Orders" && (
                                <HistoryFeed 
                                    key={`history-orders-${refreshKey}`} 
                                    tabType="Orders" 
                                />
                            )}
                            {historySubTab === "Purchased" && (
                                <HistoryFeed 
                                    key={`history-purchased-${refreshKey}`} 
                                    tabType="Purchased" 
                                />
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
        height: height*0.06,
        width: width,
        flexDirection: "row", 
        justifyContent: "space-around", 
        alignContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        marginTop:5,
        position: 'relative',
        overflow: 'hidden',
    },
    tabIndicator: {
        position: 'absolute',
        top: 3,
        bottom: 3,
        left: 10,
        width: width / 3 - 20,
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    subTabIndicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        height: '100%',
        zIndex: 0,
    },
    subTabBorderIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '100%',
        borderBottomWidth: 2,
        zIndex: 1,
    },
    tabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        marginHorizontal: 4,
        zIndex: 1,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        fontWeight: 'bold',
        color: '#000000',
    },
    contentBox: {
        flex:1,
        width: width,
        marginVertical:5,
        backgroundColor: "white", 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
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
        height: 48,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    historySubTabBar: {
        flexDirection: 'row',
        height: 48,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    subTabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        zIndex: 2,
    },
    subTabText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    activeSubTabText: {
        fontWeight: 'bold',
        color: '#000000ff',
    },
    pendingTab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedContainer: {
        flex: 1,
        width: '100%',
    },
});