import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';
import ProductCard from './ProductCard';

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
  viewCount?: number;
  sellerAvatar?: string;
  sellerName: string;
  condition?: string;
  createdAt?: any;
  sellerId: string;
}

interface ProductFeedProps {
  mode?: 'all' | 'user' | 'following';
  userId?: string;
  isOwnProfile?: boolean;
  onProductDeleted?: () => void;
}

const ProductFeed: React.FC<ProductFeedProps> = ({
  mode = 'all',
  userId,
  isOwnProfile = false,
  onProductDeleted,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let productsQuery;
      const productsRef = collection(db, 'products');

      if (mode === 'user' && userId) {
        productsQuery = query(
          productsRef,
          where('sellerId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else if (mode === 'following') {
        // Implement following logic here
        productsQuery = query(
          productsRef,
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else {
        productsQuery = query(
          productsRef,
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(productsQuery);
      
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          ...data,
        } as Product);
      });

      if (isRefresh) {
        setProducts(productsData);
      } else {
        setProducts(productsData);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(productsData.length === 10);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, userId]);

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      let productsQuery;
      const productsRef = collection(db, 'products');

      if (mode === 'user' && userId) {
        productsQuery = query(
          productsRef,
          where('sellerId', '==', userId),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      } else {
        productsQuery = query(
          productsRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(productsQuery);
      
      const newProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newProducts.push({
          id: doc.id,
          ...data,
        } as Product);
      });

      setProducts(prev => [...prev, ...newProducts]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(newProducts.length === 10);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = () => {
    loadProducts(true);
  };

  const handleProductDeleted = () => {
    if (onProductDeleted) {
      onProductDeleted();
    }
    loadProducts(true);
  };

  const handleLikePress = (productId: string) => {
    // Implement like functionality
    console.log('Like pressed for product:', productId);
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading products...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No products found</Text>
        <Text style={styles.emptyText}>
          {mode === 'user' ? 'This user has no products yet.' : 'No products available.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onLikePress={() => handleLikePress(item.id)}
            isLiked={false}
            mode={mode === 'user' ? 'profile' : 'default'}
            isOwnProfile={isOwnProfile}
            onProductDeleted={handleProductDeleted}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#00A86B']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#00A86B" />
              <Text style={styles.footerText}>Loading more products...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
});

export default ProductFeed;