// OrderFeed.tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAuth } from '../../../services/Auth/AuthContext';
import { getUserOrders } from '../../../services/Order/orderService';
import OrderCard from '../../components/OrderCard';

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
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
  expiresAt: any;
}

const OrderFeed: React.FC = () => {
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
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const result = await getUserOrders(user.uid, 'buying');
      if (result.success) {
        setOrders(result.orders || []);
      } else {
        console.error('Error loading orders:', result.error);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
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
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please login to view your orders</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
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
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubText}>
              Your purchase orders will appear here
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

export default OrderFeed;