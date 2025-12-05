import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserSearchBarProps {
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  isLoading?: boolean;
  onClear?: () => void;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  placeholder = "Search users...",
  onSearch,
  isLoading = false,
  onClear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onClear) {
      onClear();
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
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        
        <View style={styles.rightSection}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#00A86B" />
          ) : searchTerm ? (
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

export default UserSearchBar;