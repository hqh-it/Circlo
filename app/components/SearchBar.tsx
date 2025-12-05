import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
      <View style={styles.searchContainer}>
        <Image
          source={require('../assets/icons/search.png')}
          style={styles.searchIcon}
        />
        
        <TextInput
          style={styles.input}
          value={searchText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <View style={styles.rightSection}>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#666',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  rightSection: {
    width: 30,
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    width: 18,
    height: 18,
    tintColor: '#666',
  },
});

export default SearchBar;