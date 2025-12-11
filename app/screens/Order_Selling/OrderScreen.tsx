import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../services/Auth/AuthContext';
import { getUserOrders } from '../../../services/Order/orderService';
import Header from '../../components/header_for_detail';
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

const OrderScreen: React.FC = () => {
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
        const activeOrders = (result.orders || []).filter(
          (order: Order) => order.status !== 'completed'
        );
        setOrders(activeOrders);
      }
    } catch (error) {
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
      <SafeAreaView style={styles.container}>
        <Header title="Your Orders" />
        <View style={styles.centerContainer}>
          <Image 
            source={require('../../assets/icons/buy.gif')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Please login to view your orders</Text>
          <Text style={styles.emptySubtitle}>
            Login to see all your purchase orders and track them
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Your Orders" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
            <Text style={styles.loadingSubtext}>
              We're getting your order information ready
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Your Orders" />
      
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
            <Image 
              source={require('../../assets/icons/buy.gif')} 
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No active orders found</Text>
            <Text style={styles.emptySubtitle}>
              Your active purchase orders will appear here
            </Text>
            <Text style={styles.emptyHint}>
              🛒 Check history tab for completed orders
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  emptyHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default OrderScreen;