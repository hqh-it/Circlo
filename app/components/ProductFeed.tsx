import { useLocalSearchParams } from 'expo-router';
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
import { getAuctionProducts } from '../../services/Auction/auctionService';
import ProductCard from './ProductCard';

interface Product {
  id: string;
  type?: 'normal' | 'auction';
  images: string[];
  title: string;
  price: number;
  address: {
    district?: string;
    province?: string;
    street?: string;
    ward?: string;
    fullAddress?: string;
  };
  likeCount: number;
  viewCount?: number;
  sellerAvatar?: string;
  sellerName: string;
  condition?: string;
  createdAt?: any;
  sellerId: string;
  auctionInfo?: {
    currentBid: number;
    startPrice: number;
    startTime: Date;
    endTime: Date;
    bidCount: number;
    status: 'active' | 'ended';
    bidIncrement: number;
    buyNowPrice?: number;
    highestBidder?: string | null;
  };
}

interface ProductFeedProps {
  mode?: 'all' | 'user' | 'following';
  productType?: 'normal' | 'auction' | 'all';
  userId?: string;
  isOwnProfile?: boolean;
  onProductDeleted?: () => void;
  externalProducts?: Product[];
  isExternalData?: boolean;
}

const PAGE_SIZE = 10;

const ProductFeed: React.FC<ProductFeedProps> = ({
  mode = 'all',
  productType = 'normal',
  userId,
  isOwnProfile = false,
  onProductDeleted,
  externalProducts,
  isExternalData = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const params = useLocalSearchParams();

  useEffect(() => {
    if (isExternalData && externalProducts) {
      setProducts(externalProducts);
      setLoading(false);
      setHasMore(false);
    }
  }, [externalProducts, isExternalData]);

  useEffect(() => {
    if (!isExternalData) {
      loadProducts();
    }
  }, [productType, mode, userId]);

  useEffect(() => {
    if (params.refreshAuction === 'true' && productType === 'auction') {
      loadProducts(true);
    }
  }, [params.refreshAuction]);

  const loadAuctionProducts = useCallback(async (filters: any = {}) => {
    try {
      const result = await getAuctionProducts(filters);
      
      if (result.success) {
        return result.products.map(auction => {
          return {
            id: auction.id,
            type: 'auction' as const,
            images: auction.images || [],
            title: auction.title,
            price: auction.startPrice,
            address: auction.address || {},
            likeCount: 0,
            viewCount: auction.viewCount,
            sellerAvatar: auction.sellerAvatar,
            sellerName: auction.sellerName,
            condition: auction.condition,
            createdAt: auction.createdAt,
            sellerId: auction.sellerId,
            auctionInfo: {
              currentBid: auction.currentBid, 
              startPrice: auction.startPrice, 
              startTime: auction.auctionInfo?.startTime,
              endTime: auction.auctionInfo?.endTime,
              bidCount: auction.auctionInfo?.bidCount || 0,
              status: auction.auctionInfo?.status || 'active',
              bidIncrement: auction.auctionInfo?.bidIncrement,
              buyNowPrice: auction.auctionInfo?.buyNowPrice,
              highestBidder: auction.auctionInfo?.highestBidder
            }
          };
        });
      } else {
        throw new Error(result.error || 'Failed to load auctions');
      }
    } catch (error) {
      console.error('Error loading auction products:', error);
      throw error;
    }
  }, []);

  const loadNormalProducts = useCallback(async (isLoadMore = false) => {
    try {
      const productsRef = collection(db, 'products');
      let productsQuery;

      if (mode === 'user' && userId) {
        const baseQuery = query(
          productsRef,
          where('sellerId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        productsQuery = isLoadMore
          ? query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE))
          : query(baseQuery, limit(PAGE_SIZE));
      } else {
        const baseQuery = query(productsRef, orderBy('createdAt', 'desc'));
        
        productsQuery = isLoadMore
          ? query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE))
          : query(baseQuery, limit(PAGE_SIZE));
      }
      
      const querySnapshot = await getDocs(productsQuery);
      const newProducts: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newProducts.push({
          id: doc.id,
          ...data,
          type: 'normal' as const
        } as Product);
      });

      if (!isLoadMore) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      setHasMore(newProducts.length === PAGE_SIZE);

      return newProducts;
    } catch (error) {
      console.error('Error loading normal products:', error);
      throw error;
    }
  }, [mode, userId, lastVisible]);

  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isExternalData) {
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let productsData: Product[] = [];

      if (productType === 'auction') {
        let filters: any = { status: 'active' };

        if (mode === 'user' && userId) {
          filters = { ...filters, sellerId: userId };
        }

        productsData = await loadAuctionProducts(filters);
        
        setHasMore(false);
      } else {
        productsData = await loadNormalProducts(false);
        
        if (!isRefresh) {
          setLastVisible(productsData[productsData.length - 1]);
        }
      }

      if (isRefresh) {
        setProducts(productsData);
      } else {
        setProducts(productsData);
      }

    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, userId, isExternalData, productType, loadAuctionProducts, loadNormalProducts]);

  const loadMore = async () => {
    if (!hasMore || loading || isExternalData || productType === 'auction') {
      return;
    }

    try {
      setLoading(true);
      
      const newProducts = await loadNormalProducts(true);
      
      setProducts(prev => [...prev, ...newProducts]);
      
      if (newProducts.length > 0) {
        setLastVisible(newProducts[newProducts.length - 1]);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!isExternalData) {
      loadProducts(true);
    }
  };

  const handleProductDeleted = () => {
    onProductDeleted?.();
    
    if (!isExternalData) {
      loadProducts(true);
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading {productType === 'auction' ? 'auctions' : 'products'}...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No {productType === 'auction' ? 'auctions' : 'products'} found</Text>
        <Text style={styles.emptyText}>
          {mode === 'user' 
            ? `This user has no ${productType === 'auction' ? 'auctions' : 'products'} yet.` 
            : `No ${productType === 'auction' ? 'auctions' : 'products'} available.`}
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
            mode={mode === 'user' ? 'profile' : 'default'}
            isOwnProfile={isOwnProfile}
            onProductDeleted={handleProductDeleted}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isExternalData ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#00A86B']}
            />
          ) : undefined
        }
        onEndReached={isExternalData || productType === 'auction' ? undefined : loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !isExternalData && productType !== 'auction' ? (
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