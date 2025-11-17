// screens/Admin/AdminUserList.tsx
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
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
}

const AdminUserList: React.FC = () => {
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
        usersList.push({
          id: doc.id,
          fullName: data.fullName || 'No Name',
          email: data.email,
          avatarURL: data.avatarURL,
          role: data.role || 'user',
          createdAt: data.createdAt,
          isActive: data.isActive !== false
        });
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
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
    loadUsers(); // Refresh list after user update
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="User Management" />
      
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          Total Users: {users.length}
        </Text>
        <Text style={styles.counterSubText}>
          {users.filter(user => user.role === 'admin').length} admin(s), 
          {users.filter(user => user.role === 'user').length} user(s)
        </Text>
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
  counter: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003B36',
    marginBottom: 4,
  },
  counterSubText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
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
  },
});

export default AdminUserList;