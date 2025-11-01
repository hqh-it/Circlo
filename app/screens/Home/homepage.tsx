import Appfooter from "@/app/components/Appfooter";
import Appheader from "@/app/components/Appheader";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Dimensions, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductFeed from "../../../app/components/ProductFeed";
import { auth, db } from "../../../firebaseConfig";
import FilterDrawer from '../../components/FilterDrawer';
import SearchBar from '../../components/SearchBar';

const { height } = Dimensions.get('window');

function Homepage() {
    const [fullname, setFullname] = useState<string>("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [hasFiltered, setHasFiltered] = useState(false);
    const [productType, setProductType] = useState<'normal' | 'auction'>('normal');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeFilters, setActiveFilters] = useState<any>(null);
    const [filterVisible, setFilterVisible] = useState(false);

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
        setActiveFilters(null);
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
        setSearchTerm('');
        setActiveFilters(null);
    };

    const handleApplyFilters = (filterResult: any) => {
        setFilteredProducts(filterResult.products);
        setHasFiltered(true);
        setHasSearched(false);
        setActiveFilters(filterResult.filters);
        setSearchTerm('');
        setFilterVisible(false);
    };

    const handleOpenFilter = () => {
        setFilterVisible(true);
    };

    const handleCloseFilter = () => {
        setFilterVisible(false);
    };

    const handleFocus = () => {};

    const handleBlur = () => {};

    const handleTabChange = (type: 'normal' | 'auction') => {
        setProductType(type);
        handleClearSearch();
    };

    const getDisplayProducts = () => {
        if (hasSearched) {
            return searchResults;
        } else if (hasFiltered) {
            return filteredProducts;
        }
        return undefined;
    };

    const getSearchTerm = () => {
        if (hasSearched && searchTerm) {
            return searchTerm;
        }
        return undefined;
    };

    const getFilters = () => {
        if (hasFiltered && activeFilters) {
            return activeFilters;
        }
        return undefined;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Appheader onFilterPress={handleOpenFilter} />
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
                        productType={productType}
                    />
                </View>
                
                <View style={styles.content}>
                    <ProductFeed 
                        mode="all"
                        productType={productType}
                        externalProducts={getDisplayProducts()}
                        isExternalData={hasSearched || hasFiltered}
                        searchTerm={getSearchTerm()}
                        filters={getFilters()}
                    />
                </View>
                
                <View style={styles.footer}>
                    <Appfooter 
                        onTabChange={handleTabChange}
                        currentTab={productType}
                    />
                </View>

                <FilterDrawer
                    visible={filterVisible}
                    onClose={handleCloseFilter}
                    onApplyFilters={handleApplyFilters}
                    productType={productType}
                />
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