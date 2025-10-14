import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { getProducts, getProductsBySeller } from '../../services/Product/productService';
import ProductCard from './ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProductFeedProps {
  mode?: 'global' | 'user';
  userId?: string;
  onProductDeleted?: () => void;
  searchResults?: any[];
  isSearching?: boolean;
  hasSearched?: boolean;
}

interface Product {
  id: string;
  images: string[];
  title: string;
  price: number;
  address: {
    district?: string;
    province?: string;
  };
  likeCount: number;
  sellerAvatar?: string;
  sellerName: string;
  condition?: string;
  createdAt?: any;
  status?: string;
  likedBy?: string[];
}

const ProductFeed = ({ 
  mode = 'global', 
  userId, 
  onProductDeleted, 
  searchResults = [],
  isSearching = false,
  hasSearched = false
}: ProductFeedProps) => {
  const { user } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      console.log('🔄 ProductFeed: Loading products...');
      let result;
      if (mode === 'user' && userId) {
        console.log('🔄 ProductFeed: Loading user products for:', userId);
        result = await getProductsBySeller(userId);
      } else {
        result = await getProducts();
      }
      
      if (result.success) {
        console.log('✅ ProductFeed: Products loaded successfully:', result.products.length);
        setProducts(result.products);
      } else {
        console.error('❌ ProductFeed: Failed to load products:', result.error);
        setProducts([]);
      }
      
    } catch (error) {
      console.error('❌ ProductFeed: Error in loadProducts:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProductDeleted = () => {
    console.log('🔄 ProductFeed: Product deleted, reloading...');
    loadProducts();
    if (onProductDeleted) {
      onProductDeleted();
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('🎯 ProductFeed: Screen focused, reloading products...');
      loadProducts();
    }, [mode, userId])
  );

  useEffect(() => {
    loadProducts();
  }, [mode, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  // Determine which products to display
  const productsToDisplay = hasSearched ? searchResults : products;

  if (isSearching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Searching products...</Text>
      </View>
    );
  }

  if (loading && !hasSearched) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (hasSearched && searchResults.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No products found</Text>
        <Text style={styles.emptySubText}>Try different search terms</Text>
      </View>
    );
  }

  if (productsToDisplay.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          {mode === 'user' ? "You haven't posted any products yet!" : "No products found"}
        </Text>
        <Text style={styles.emptySubText}>
          {mode === 'user' ? "Start selling by adding your first product!" : "Be the first to list a product!"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasSearched && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
      
      <FlatList
        data={productsToDisplay}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <ProductCard
              product={item}
              isLiked={item.likedBy?.includes(user?.uid || '')}
              mode={mode === 'user' ? 'profile' : 'default'}
              onProductDeleted={handleProductDeleted}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00A86B']}
            tintColor={'#00A86B'}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingBottom: 10
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  searchInfo: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInfoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default ProductFeed;