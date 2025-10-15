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
                    } else {
                        console.log("No such document!");
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
        console.log('Received filter results:', filterResult);
        setFilteredProducts(filterResult.products);
        setHasFiltered(true);
        setHasSearched(false);
    };

    const handleFocus = () => {
        console.log('Search bar focused');
    };

    const handleBlur = () => {
        console.log('Search bar blurred');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Appheader onApplyFilters={handleApplyFilters} />
                </View>
                
                <View style={styles.searchContainer}>
                    <SearchBar 
                        placeholder="Search products..."
                        onSearchResults={handleSearchResults}
                        onSearchStart={handleSearchStart}
                        onSearchEnd={handleSearchEnd}
                        onClearSearch={handleClearSearch}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </View>
                
                <View style={styles.content}>
                    <ProductFeed 
                        searchResults={hasSearched ? searchResults : (hasFiltered ? filteredProducts : [])}
                        isSearching={isSearching}
                        hasSearched={hasSearched || hasFiltered}
                    />
                </View>
                
                <View style={styles.footer}>
                    <Appfooter />
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