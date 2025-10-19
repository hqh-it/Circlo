import Appfooter from "@/app/components/Appfooter";
import Appheader from "@/app/components/Appheader";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Dimensions, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductFeed from "../../../app/components/ProductFeed";
import { auth, db } from "../../../firebaseConfig";
import SearchBar from '../../components/SearchBar';

const { height } = Dimensions.get('window');

function Homepage() {
    const [fullname, setFullname] = useState<string>("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [hasFiltered, setHasFiltered] = useState(false);
    const [productType, setProductType] = useState<'normal' | 'auction'>('normal'); // NEW: State for product type

    useEffect(() => {
        StatusBar.setBarStyle('light-content');
        StatusBar.setBackgroundColor('#01332fff');

        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        setFullname(userData.fullName);
                    }
                } catch (error) {
                    console.log("Error getting document:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    const handleSearchResults = (results: any[]) => {
        setSearchResults(results);
        setHasSearched(true);
        setHasFiltered(false);
    };

    const handleSearchStart = () => {
        setIsSearching(true);
    };

    const handleSearchEnd = () => {
        setIsSearching(false);
    };

    const handleClearSearch = () => {
        setSearchResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setFilteredProducts([]);
        setHasFiltered(false);
    };

    const handleApplyFilters = (filterResult: any) => {
        setFilteredProducts(filterResult.products);
        setHasFiltered(true);
        setHasSearched(false);
    };

    const handleFocus = () => {};

    const handleBlur = () => {};

    // NEW: Handle tab change from AppFooter
    const handleTabChange = (type: 'normal' | 'auction') => {
        setProductType(type);
        // Clear any active search/filter when switching tabs
        handleClearSearch();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Appheader onApplyFilters={handleApplyFilters} />
                </View>
                
                <View style={styles.searchContainer}>
                    <SearchBar 
                        placeholder={productType === 'normal' ? "Search products..." : "Search auctions..."}
                        onSearchResults={handleSearchResults}
                        onSearchStart={handleSearchStart}
                        onSearchEnd={handleSearchEnd}
                        onClearSearch={handleClearSearch}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </View>
                
                <View style={styles.content}>
                    {hasSearched || hasFiltered ? (
                        <ProductFeed 
                            mode="all"
                            productType={productType} // NEW: Pass product type
                            externalProducts={hasSearched ? searchResults : filteredProducts}
                            isExternalData={true}
                        />
                    ) : (
                        <ProductFeed 
                            mode="all" 
                            productType={productType} // NEW: Pass product type
                        />
                    )}
                </View>
                
                <View style={styles.footer}>
                    <Appfooter 
                        onTabChange={handleTabChange} // NEW: Pass callback to AppFooter
                        currentTab={productType} // NEW: Pass current tab
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#01332fff",
    },
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        height: height * 0.07,
        backgroundColor: "#01332fff",
        zIndex: 1000,
    },
    searchContainer: {
        height: height * 0.1,
        backgroundColor: "#FFFFFF",
        zIndex: 999,
    },
    content: {
        flex: 1,
        backgroundColor: "#f8f8f8",
    },
    footer: {
        height: height * 0.085,
        backgroundColor: "transparent",
        zIndex: 1000,
    },
});

export default Homepage;