import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';
import { getAuctionProducts, getAuctionProductsByFilter, getAuctionProductsByUser, searchAuctionProducts } from '../../services/Auction/auctionService';
import { getProductsByFilter, searchProducts } from '../../services/Product/productService';
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
  status?: string;
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
  searchTerm?: string;
  filters?: any;
  status?: 'active' | 'pending';
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
  searchTerm,
  filters,
  status = 'active',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

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
  }, [productType, mode, userId, searchTerm, filters, status]);

  const shouldDisplayAuction = (product: Product): boolean => {
    if (status === 'pending') {
      return product.status === 'pending';
    }
    
    if (product.status !== 'active') {
      return false;
    }
    
    if (mode === 'user') {
      return true;
    }
    
    return product.auctionInfo?.status === 'active';
  };

const loadAuctionProducts = useCallback(async (isLoadMore = false) => {
  try {
    let result;
    
    console.log('loadAuctionProducts - mode:', mode, 'status:', status);
    
    if (mode === 'user' && userId) {
      result = await getAuctionProductsByUser(userId);
    } else if (searchTerm) {
      result = await searchAuctionProducts(searchTerm, filters);
    } else if (filters) {
      result = await getAuctionProductsByFilter(filters);
    } else {
      result = await getAuctionProducts({ 
        status: 'active'
      });
    }
    
    console.log('Result from getAuctionProducts:', {
      success: result.success,
      count: result.products?.length || 0
    });
    
    if (result.success && result.products) {
      console.log('Processing', result.products.length, 'auction products');
      
      const auctionProducts = result.products.map(auction => {
        const auctionData = auction.auctionInfo || {};
        
        console.log('Mapping product:', auction.id, 'auctionStatus:', auctionData.status);
        
        if (mode !== 'user' && auctionData.status !== 'active') {
          return null; 
        }
        
        return {
          id: auction.id,
          type: 'auction' as const,
          images: auction.images || [],
          title: auction.title || 'No Title',
          price: auction.startPrice || auction.currentBid || 0,
          address: auction.address || {},
          likeCount: auction.likeCount || 0,
          viewCount: auction.viewCount || 0,
          sellerAvatar: auction.sellerAvatar,
          sellerName: auction.sellerName || 'Unknown Seller',
          condition: auction.condition || 'used',
          createdAt: auction.createdAt,
          sellerId: auction.sellerId,
          status: auction.status,
          auctionInfo: {
            currentBid: auction.currentBid || auction.startPrice || 0,
            startPrice: auction.startPrice || 0,
            startTime: auctionData.startTime,
            endTime: auctionData.endTime,
            bidCount: auctionData.bidCount || 0,
            status: auctionData.status || 'active',
            bidIncrement: auctionData.bidIncrement || 0,
            buyNowPrice: auctionData.buyNowPrice,
            highestBidder: auctionData.highestBidder
          }
        };
      }).filter(product => product !== null); 
      return auctionProducts;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}, [mode, userId, searchTerm, filters, status]);

  const loadNormalProducts = useCallback(async (isLoadMore = false) => {
    try {
      if (searchTerm || filters) {
        let result;
        if (searchTerm) {
          result = await searchProducts(searchTerm, filters);
        } else {
          result = await getProductsByFilter(filters);
        }
        
        if (result.success) {
          const productsWithType = result.products.map(product => ({
            ...product,
            type: 'normal' as const
          }));

          const filteredProducts = productsWithType.filter(product => {
            if (status === 'pending') {
              return product.status === 'pending';
            } else {
              return product.status === 'active';
            }
          });

          return filteredProducts;
        }
        return [];
      }

      const productsRef = collection(db, 'products');
      let productsQuery;

      if (mode === 'user' && userId) {
        const baseQuery = query(
          productsRef,
          where('sellerId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );

        productsQuery = isLoadMore
          ? query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE))
          : query(baseQuery, limit(PAGE_SIZE));
      } else {
        const baseQuery = query(
          productsRef,
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
        
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

      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      setHasMore(newProducts.length === PAGE_SIZE);

      return newProducts;
    } catch (error) {
      throw error;
    }
  }, [mode, userId, lastVisible, searchTerm, filters, status, isOwnProfile]);

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
        productsData = await loadAuctionProducts(false);
        setHasMore(false);
      } else if (productType === 'normal') {
        productsData = await loadNormalProducts(false);
      } else {
        const [normalProducts, auctionProducts] = await Promise.all([
          loadNormalProducts(false),
          loadAuctionProducts(false)
        ]);
        productsData = [...normalProducts, ...auctionProducts];
        setHasMore(false);
      }

      const finalProducts = productsData.filter(product => {
        if (status === 'pending') {
          return product.status === 'pending';
        } else {
          return product.status === 'active';
        }
      });

      if (isRefresh) {
        setProducts(finalProducts);
      } else {
        setProducts(finalProducts);
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, userId, isExternalData, productType, loadAuctionProducts, loadNormalProducts, status]);

  const loadMore = async () => {
    if (!hasMore || loading || isExternalData || productType === 'auction' || searchTerm || filters || status === 'pending') {
      return;
    }

    try {
      setLoading(true);
      
      const newProducts = await loadNormalProducts(true);
      
      setProducts(prev => [...prev, ...newProducts]);
    } catch (error) {
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

  const handleManualRefresh = () => {
    if (!isExternalData) {
      loadProducts(true);
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>
          Loading {status === 'pending' ? 'pending ' : ''}
          {productType === 'auction' ? 'auctions' : 
           productType === 'normal' ? 'products' : 'items'}...
        </Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Image 
          source={require('../assets/icons/noItem.gif')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>
          {status === 'pending' 
            ? 'No pending items'
            : mode === 'user' 
              ? `No ${productType === 'auction' ? 'auctions' : 'products'} yet` 
              : `No ${productType === 'auction' ? 'auctions' : 'products'} available`}
        </Text>
        <Text style={styles.emptySubtitle}>
          {status === 'pending'
            ? 'All items have been reviewed or no items are waiting for approval.'
            : mode === 'user' 
              ? `This user hasn't posted any ${productType === 'auction' ? 'auctions' : 'products'} yet.` 
              : `There are currently no ${productType === 'auction' ? 'auctions' : 'products'} available.`}
        </Text>
        {!isExternalData && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            activeOpacity={0.8}
          >
            <Text style={styles.refreshButtonText}>⟳ Refresh</Text>
          </TouchableOpacity>
        )}
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
              tintColor="#00A86B"
            />
          ) : undefined
        }
        onEndReached={isExternalData || productType === 'auction' || searchTerm || filters || status === 'pending' ? undefined : loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !isExternalData && productType !== 'auction' && !searchTerm && !filters && status !== 'pending' ? (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#00A86B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  refreshButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProductFeed;