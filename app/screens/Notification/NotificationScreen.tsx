import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../services/Auth/AuthContext';
import { notificationService } from '../../../services/Notification/notificationService';
import Header from '../../components/header_for_detail';
import NotificationCard from '../../components/NotificationCard';

interface Notification {
  id: string;
  type: string;
  userId: string;
  relatedUserId: string;
  relatedOrderId: string;
  relatedProductId: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: any;
}

const NotificationScreen = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const notificationsData = await notificationService.getUserNotifications(user.uid);
      
      // Lọc và sắp xếp thông báo - mới nhất lên đầu
      const sortedNotifications = notificationsData
        .filter(notification => 
          // Bao gồm tất cả các loại thông báo: order, auction, admin actions, reports
          notification.type.includes('order') ||
          notification.type.includes('auction') ||
          notification.type.includes('admin_') ||
          notification.type.includes('report') ||
          notification.type === 'admin_product_action' ||
          notification.type === 'admin_warning' ||
          notification.type === 'admin_action'
        )
        .sort((a, b) => {
          // Sắp xếp theo thời gian - mới nhất lên đầu
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      
      setNotifications(sortedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationUpdate = () => {
    loadNotifications();
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <NotificationCard 
        notification={item} 
        onNotificationUpdate={handleNotificationUpdate}
      />
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Notifications" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Please login to view notifications</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Notifications" />
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noNotificationsText}>No notifications</Text>
          <Text style={styles.subText}>
            Your notifications will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
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
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingBottom: 20,
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
  noNotificationsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;