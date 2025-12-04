import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getAuctionProducts } from '../../../../services/Auction/auctionService';
import AdminProductCard from '../../../components/Admin/Product/AdminProductCard';

interface AuctionProduct {
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
  status: 'pending' | 'active' | 'rejected';
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

interface AdminAuctionFeedProps {
  initialTab?: 'active' | 'pending';
}

const AdminAuctionFeed: React.FC<AdminAuctionFeedProps> = ({
  initialTab = 'active'
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>(initialTab);
  const [products, setProducts] = useState<AuctionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAuctionProducts = useCallback(async () => {
    try {
      const result = await getAuctionProducts({});
      
      if (result.success && result.products) {
        const auctionProducts = result.products.map(auction => {
          const auctionData = auction.auctionInfo || {};
          
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
            status: auction.status || 'pending',
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
        });

        const filteredProducts = auctionProducts.filter(product => 
          product.status === activeTab
        );
        
        setProducts(filteredProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading auction products:', error);
      setProducts([]);
    }
  }, [activeTab]);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await loadAuctionProducts();

    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAuctionProducts]);

  const handleApproveProduct = async (productId: string) => {
    try {
      Alert.alert('Success', 'Auction approved successfully!');
      loadProducts(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve auction');
    }
  };

  const handleRejectProduct = async (productId: string) => {
    try {
      Alert.alert('Success', 'Auction rejected successfully!');
      loadProducts(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject auction');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      Alert.alert('Success', 'Auction deleted successfully!');
      loadProducts(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete auction');
    }
  };

  const handleViewDetail = (productId: string, isAuction: boolean) => {
    router.push({
      pathname: '/screens/Auction/auction_detail',
      params: { id: productId }
    });
  };

  useEffect(() => {
    loadProducts();
  }, [activeTab]);

  const handleRefresh = () => {
    loadProducts(true);
  };

  const getProductStats = () => {
    const pendingCount = products.filter(p => p.status === 'pending').length;
    const activeCount = products.filter(p => p.status === 'active').length;
    
    return { pendingCount, activeCount };
  };

  const stats = getProductStats();

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading {activeTab} auctions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Auctions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending Auctions
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{products.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={products}
        renderItem={({ item }) => (
          <AdminProductCard
            product={item}
            onApprove={handleApproveProduct}
            onReject={handleRejectProduct}
            onDelete={handleDeleteProduct}
            onViewDetail={handleViewDetail}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {activeTab} auctions found
            </Text>
          </View>
        }
        contentContainerStyle={products.length === 0 ? styles.emptyListContent : undefined}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#00A86B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default AdminAuctionFeed;