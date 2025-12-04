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
import { db } from '../../../../firebaseConfig';
import AdminProductCard from '../../../components/Admin/Product/AdminProductCard';

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
  status: 'pending' | 'active' | 'rejected';
}

interface AdminProductFeedProps {
  initialTab?: 'active' | 'pending';
}

const AdminProductFeed: React.FC<AdminProductFeedProps> = ({
  initialTab = 'active'
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const productsRef = collection(db, 'products');
      const productsQuery = query(
        productsRef,
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const normalProducts: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        normalProducts.push({
          id: doc.id,
          ...data,
          type: 'normal' as const
        } as Product);
      });

      setProducts(normalProducts);

    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

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
      pathname: '/screens/Products/product_detail',
      params: { id: productId }
    });
  };

  const handleProductUpdate = () => {
    loadProducts(true);
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
        <Text>Loading {activeTab} products...</Text>
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
            Active Products
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending Products
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
            <Text style={styles.emptyText}>
              No {activeTab} products found
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

export default AdminProductFeed;