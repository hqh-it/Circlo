import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../../firebaseConfig';
import AdminProductCard from '../../../components/Admin/Product/AdminProductCard';
import SearchBar from '../../../components/SearchBar';

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
    startTime: any;
    endTime: any;
    bidCount: number;
    status: 'active' | 'ended' | 'pending';
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
  const [filteredProducts, setFilteredProducts] = useState<AuctionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Query từ collection 'auction_products'
      const auctionsRef = collection(db, 'auction_products');
      const auctionsQuery = query(
        auctionsRef,
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(auctionsQuery);
      const auctionProducts: AuctionProduct[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const auctionData = data.auctionInfo || {};
        
        auctionProducts.push({
          id: doc.id,
          type: 'auction' as const,
          images: data.images || [],
          title: data.title || 'No Title',
          price: data.startPrice || data.currentBid || 0,
          address: data.address || {},
          likeCount: data.likeCount || 0,
          viewCount: data.viewCount || 0,
          sellerAvatar: data.sellerAvatar,
          sellerName: data.sellerName || 'Unknown Seller',
          condition: data.condition || 'used',
          createdAt: data.createdAt,
          sellerId: data.sellerId,
          status: data.status || 'pending',
          auctionInfo: {
            currentBid: data.currentBid || data.startPrice || 0,
            startPrice: data.startPrice || 0,
            startTime: auctionData.startTime,
            endTime: auctionData.endTime,
            bidCount: auctionData.bidCount || 0,
            status: auctionData.status || 'pending',
            bidIncrement: auctionData.bidIncrement || 0,
            buyNowPrice: auctionData.buyNowPrice,
            highestBidder: auctionData.highestBidder
          }
        } as AuctionProduct);
      });

      setProducts(auctionProducts);
      setFilteredProducts(auctionProducts);

    } catch (error) {
      Alert.alert('Error', 'Failed to load auctions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  const handleSearchResults = async (searchTerm: string) => {
    setIsSearching(true);
    
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      setIsSearching(false);
      return;
    }

    try {
      // Tìm kiếm trong collection auction_products
      const auctionsRef = collection(db, 'auction_products');
      const auctionsQuery = query(
        auctionsRef,
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(auctionsQuery);
      const allAuctions: AuctionProduct[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const auctionData = data.auctionInfo || {};
        
        allAuctions.push({
          id: doc.id,
          type: 'auction' as const,
          images: data.images || [],
          title: data.title || 'No Title',
          price: data.startPrice || data.currentBid || 0,
          address: data.address || {},
          likeCount: data.likeCount || 0,
          viewCount: data.viewCount || 0,
          sellerAvatar: data.sellerAvatar,
          sellerName: data.sellerName || 'Unknown Seller',
          condition: data.condition || 'used',
          createdAt: data.createdAt,
          sellerId: data.sellerId,
          status: data.status || 'pending',
          auctionInfo: {
            currentBid: data.currentBid || data.startPrice || 0,
            startPrice: data.startPrice || 0,
            startTime: auctionData.startTime,
            endTime: auctionData.endTime,
            bidCount: auctionData.bidCount || 0,
            status: auctionData.status || 'pending',
            bidIncrement: auctionData.bidIncrement || 0,
            buyNowPrice: auctionData.buyNowPrice,
            highestBidder: auctionData.highestBidder
          }
        } as AuctionProduct);
      });

      // Filter trên client với searchTerm
      const searchResults = allAuctions.filter(auction => {
        const searchText = `${auction.title} ${auction.condition} ${auction.sellerName}`.toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
      
      setFilteredProducts(searchResults);
    } catch (error) {
      setFilteredProducts([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchStart = () => {
    setIsSearching(true);
  };

  const handleSearchEnd = () => {
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setFilteredProducts(products);
  };

  const handleApproveProduct = async (productId: string) => {
    await loadProducts(true);
  };

  const handleRejectProduct = async (productId: string) => {
    await loadProducts(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    await loadProducts(true);
  };

  const handleViewDetail = (productId: string, isAuction: boolean) => {
    router.push({
      pathname: '/screens/Auction/auction_detail',
      params: { id: productId }
    });
  };

  const handleProductUpdate = () => {
    loadProducts(true);
  };

  const handleBack = () => {
    router.back();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#003B36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auction Management</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search auctions..."
          onSearchResults={(results) => {
            // Chuyển đổi kết quả từ SearchBar sang định dạng AuctionProduct
            const auctionResults = results
              .filter(product => product.status === activeTab)
              .map(product => ({
                id: product.id,
                type: 'auction' as const,
                images: product.images || [],
                title: product.title || 'No Title',
                price: product.price || 0,
                address: product.address || {},
                likeCount: product.likeCount || 0,
                viewCount: product.viewCount || 0,
                sellerAvatar: product.sellerAvatar,
                sellerName: product.sellerName || 'Unknown Seller',
                condition: product.condition || 'used',
                createdAt: product.createdAt,
                sellerId: product.sellerId,
                status: product.status || 'pending',
                auctionInfo: {
                  currentBid: product.price || 0,
                  startPrice: product.price || 0,
                  startTime: null,
                  endTime: null,
                  bidCount: 0,
                  status: 'active',
                  bidIncrement: 0,
                  buyNowPrice: undefined,
                  highestBidder: null
                }
              })) as AuctionProduct[];
            
            setFilteredProducts(auctionResults);
          }}
          onSearchStart={handleSearchStart}
          onSearchEnd={handleSearchEnd}
          onClearSearch={handleClearSearch}
          productType="auction"
        />
      </View>
      
      {isSearching && (
        <View style={styles.searchingIndicator}>
          <ActivityIndicator size="small" color="#00A86B" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      )}

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
          <Text style={styles.statNumber}>{filteredProducts.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <AdminProductCard
            product={item}
            onApprove={handleApproveProduct}
            onReject={handleRejectProduct}
            onDelete={handleDeleteProduct}
            onViewDetail={handleViewDetail}
            onProductUpdate={handleProductUpdate}
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
            {isSearching ? (
              <>
                <ActivityIndicator size="large" color="#00A86B" />
                <Text style={styles.emptyText}>Searching auctions...</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>
                  No {activeTab} auctions found
                </Text>
                {searchTerm && (
                  <Text style={styles.emptySubText}>
                    No auctions match "{searchTerm}"
                  </Text>
                )}
              </>
            )}
          </View>
        }
        contentContainerStyle={filteredProducts.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003B36',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f0f9f0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchingText: {
    marginLeft: 8,
    color: '#00A86B',
    fontSize: 12,
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
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20,
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
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default AdminAuctionFeed;