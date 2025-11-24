// screens/Admin/AdminUserList.tsx
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../../firebaseConfig';
import AdminUserCard from '../../../components/Admin/User/AdminUserCard';
import Header from '../../../components/header_for_detail';

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarURL?: string;
  role?: string;
  createdAt?: any;
  isActive?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  suspendReason?: string;
  suspendedUntil?: any;
}

const AdminUserList: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, "users"), 
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(usersQuery);
      
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Lọc bỏ tài khoản admin
        if (data.role !== 'admin') {
          usersList.push({
            id: doc.id,
            fullName: data.fullName || 'No Name',
            email: data.email,
            avatarURL: data.avatarURL,
            role: data.role || 'user',
            createdAt: data.createdAt,
            isActive: data.isActive !== false,
            isBanned: data.isBanned === true,
            isSuspended: data.isSuspended === true,
            suspendReason: data.suspendReason,
            suspendedUntil: data.suspendedUntil
          });
        }
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error("Load users error:", error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUserUpdate = () => {
    loadUsers();
  };

  const navigateToReports = () => {
    router.push('../../../components/Report/AdminReportList');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  const suspendedUsers = users.filter(user => user.isSuspended && !user.isBanned);
  const bannedUsers = users.filter(user => user.isBanned);
  const activeUsers = users.filter(user => !user.isSuspended && !user.isBanned);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="User Management" />
      
      {/* Navigation to Reports */}
      <View style={styles.navigationSection}>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={navigateToReports}
        >
          <Text style={styles.reportButtonText}>📋 View User Reports</Text>
        </TouchableOpacity>
      </View>

      {/* User Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeUsers.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{suspendedUsers.length}</Text>
          <Text style={styles.statLabel}>Suspended</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{bannedUsers.length}</Text>
          <Text style={styles.statLabel}>Banned</Text>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={({ item }) => (
          <AdminUserCard 
            user={item} 
            onUserUpdate={handleUserUpdate}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubText}>
              All accounts are administrator accounts
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    backgroundColor: '#f8f9fa',
  },
  navigationSection: {
    padding: 16,
    paddingBottom: 8,
  },
  reportButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003B36',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default AdminUserList;