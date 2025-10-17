import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../services/Auth/AuthContext';
import { getFollowedUsers } from '../../../services/User/followService';
import FollowCard from '../../components/FollowCard';
import Header from '../../components/header_for_detail';

interface FollowedUser {
  id: string;
  fullName: string;
  avatarURL?: string;
}

const FollowListScreen: React.FC = () => {
  const { user } = useAuth();
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowedUsers = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const result = await getFollowedUsers(user.uid);
      
      if (result.success) {
        setFollowedUsers(result.users);
      } else {
        console.error('Failed to load followed users:', result.error);
      }
    } catch (error) {
      console.error('Error loading followed users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFollowedUsers();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowedUsers();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading followed users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Following" />
      
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          Following {followedUsers.length} users
        </Text>
      </View>

      <FlatList
        data={followedUsers}
        renderItem={({ item }) => (
          <FollowCard 
            user={item} 
            onFollowChange={loadFollowedUsers}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
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
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default FollowListScreen;