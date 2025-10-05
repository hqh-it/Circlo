// components/ProductFeed.tsx
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../services/Auth/AuthContext';
import ProductCard from './ProductCard';

const {width} = Dimensions.get("window");

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

const ProductFeed = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      console.log('Loading products from Firestore...');
      
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          images: data.images || [],
          title: data.title || '',
          price: data.price || 0,
          address: data.address || {},
          likeCount: data.likeCount || 0,
          sellerAvatar: data.sellerAvatar || '',
          sellerName: data.sellerName || 'Unknown Seller',
          condition: data.condition,
          createdAt: data.createdAt,
          status: data.status,
          likedBy: data.likedBy || []
        });
      });
      
      console.log('Products loaded:', productsData.length);
      
      // Sort by creation date (newest first)
      const sortedProducts = productsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setProducts(sortedProducts);
      
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleLikePress = (productId: string) => {
    console.log('Like product:', productId);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No products found</Text>
        <Text style={styles.emptySubText}>Be the first to list a product!</Text>
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
            isLiked={item.likedBy?.includes(user?.uid || '')}
            />
        )}
        keyExtractor={(item) => item.id}
        // ✅ BỎ numColumns để hiển thị dọc
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
    width:width,
  },
  listContent: {
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
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
});

export default ProductFeed;