import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { getUserOrders } from '../../services/Order/orderService';
import OrderCard from './OrderCard';

interface Order {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  productSnapshot: {
    title: string;
    price: number;
    images: string[];
    condition: string;
    category: string;
  };
  buyerAddress: {
    street: string;
    province: string;
    district: string;
    ward: string;
    fullAddress: string;
  };
  shippingFee: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'waiting_payment';
  createdAt: any;
  updatedAt: any;
  expiresAt: any;
  orderType?: 'normal' | 'auction';
  auctionId?: string;
  winnerInfo?: {
    uid: string;
    displayName: string;
    avatarURL?: string;
  };
}

interface HistoryFeedProps {
  tabType: 'Orders' | 'Purchased';
}

const HistoryFeed: React.FC<HistoryFeedProps> = ({ tabType }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user, tabType]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const historyTab = tabType === 'Orders' ? 'selling' : 'buying';
      const result = await getUserOrders(user.uid, historyTab);
      if (result.success) {
        setOrders(result.orders || []);
      } else {
        console.error('Error loading orders:', result.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderUpdate = () => {
    loadOrders();
  };

  const renderOrder = ({ item }: { item: Order }) => {
    return (
      <OrderCard 
        order={item} 
        onOrderUpdate={handleOrderUpdate}
      />
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Please login to view your history</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={styles.loadingText}>
            {tabType === 'Orders' ? 'Loading your sales...' : 'Loading your purchases...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#00A86B']}
            tintColor={'#00A86B'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {tabType === 'Orders' ? 'No sales found' : 'No purchases found'}
            </Text>
            <Text style={styles.emptySubText}>
              {tabType === 'Orders' 
                ? 'Your sales history will appear here' 
                : 'Your purchase history will appear here'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
    flexGrow: 1,
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
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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

export default HistoryFeed;