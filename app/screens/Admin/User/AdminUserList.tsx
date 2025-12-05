import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
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
import UserSearchBar from '../../../components/UserSearchBar';

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
  strustPoint?: number;
}

const AdminUserList: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(usersQuery);
      
      const usersList: User[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          fullName: data.fullName || '',
          email: data.email || '',
          avatarURL: data.avatarURL,
          role: data.role || 'user',
          createdAt: data.createdAt,
          isActive: data.isActive !== false,
          isBanned: data.isBanned === true,
          isSuspended: data.isSuspended === true,
          suspendReason: data.suspendReason,
          suspendedUntil: data.suspendedUntil,
          strustPoint: data.strustPoint || 100,
        });
      });

      const nonAdminUsers = usersList.filter(user => user.role !== 'admin');
      
      setUsers(nonAdminUsers);
      setFilteredUsers(nonAdminUsers);
      
    } catch (error) {
      console.error("Load users error:", error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const fullName = user.fullName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || email.includes(search);
    });
    
    setFilteredUsers(filtered);
  };

  const handleClearSearch = () => {
    setFilteredUsers(users);
  };

  const handleGoBack = () => {
    router.back();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

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

  const suspendedUsers = filteredUsers.filter(user => user.isSuspended && !user.isBanned);
  const bannedUsers = filteredUsers.filter(user => user.isBanned);
  const activeUsers = filteredUsers.filter(user => !user.isSuspended && !user.isBanned);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#003B36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      
      <UserSearchBar
        placeholder="Search users by name or email..."
        onSearch={handleSearch}
        isLoading={false}
        onClear={handleClearSearch}
      />

      <View style={styles.navigationSection}>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={navigateToReports}
        >
          <Text style={styles.reportButtonText}>📋 View User Reports</Text>
        </TouchableOpacity>
      </View>

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
        data={filteredUsers}
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
});

export default AdminUserList;