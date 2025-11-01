import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SearchBarProps {
  placeholder?: string;
  onSearchResults?: (results: any[]) => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClearSearch?: () => void;
  autoFocus?: boolean;
  productType: 'normal' | 'auction';
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search products...",
  onSearchResults,
  onSearchStart,
  onSearchEnd,
  onFocus,
  onBlur,
  onClearSearch,
  autoFocus = false,
  productType,
}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      if (onClearSearch) {
        onClearSearch();
      }
      return;
    }

    setIsSearching(true);
    
    if (onSearchStart) {
      onSearchStart();
    }

    try {
      let result;
      
      if (productType === 'normal') {
        const { searchProducts } = await import('../../services/Product/productService');
        result = await searchProducts(searchTerm);
      } else {
        const { searchAuctionProducts } = await import('../../services/Auction/auctionService');
        result = await searchAuctionProducts(searchTerm);
      }
      
      if (result.success) {
        const productsWithType = result.products.map(p => ({ 
          ...p, 
          type: productType 
        }));
        
        if (onSearchResults) {
          onSearchResults(productsWithType);
        }
      } else {
        if (onSearchResults) {
          onSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      if (onSearchResults) {
        onSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      if (onSearchEnd) {
        onSearchEnd();
      }
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    performSearch(searchText);
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(text);
      }, 500) as unknown as number;
    } else {
      if (onClearSearch) {
        onClearSearch();
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
    
    if (!searchText.trim() && onClearSearch) {
      onClearSearch();
    }
  };

  const handleClear = () => {
    setSearchText('');
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (onClearSearch) {
      onClearSearch();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused,
      ]}>
        <Image
          source={require('../assets/icons/search.png')}
          style={styles.searchIcon}
        />
        
        <TextInput
          style={styles.textInput}
          value={searchText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <View style={styles.rightContainer}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#00A86B" />
          ) : searchText.length > 0 ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Image
                source={require('../assets/icons/close.png')}
                style={styles.clearIcon}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height * 0.1,
    paddingHorizontal: width * 0.04,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: height * 0.06,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainerFocused: {
    borderColor: '#00A86B',
    backgroundColor: '#FFFFFF',
    shadowColor: '#00A86B',
    shadowOpacity: 0.2,
    elevation: 5,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#6B7280',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
    includeFontPadding: false,
  },
  rightContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    width: 18,
    height: 18,
    tintColor: '#6B7280',
  },
});

export default SearchBar;