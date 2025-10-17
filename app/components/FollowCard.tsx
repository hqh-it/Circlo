import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FollowButton from './FollowButton';

interface FollowCardProps {
  user: {
    id: string;
    fullName: string;
    avatarURL?: string;
  };
  onFollowChange?: () => void;
}

const FollowCard: React.FC<FollowCardProps> = ({ user, onFollowChange }) => {
  const router = useRouter();

  const handleCardPress = () => {
    router.push({
      pathname: '/screens/Profile/PublicProfile',
      params: { userId: user.id }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <Image
        source={
          user.avatarURL 
            ? { uri: user.avatarURL }
            : require('../assets/icons/profile-picture.png')
        }
        style={styles.avatar}
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.fullName || 'Unknown User'}
        </Text>
      </View>

      <FollowButton 
        targetUserId={user.id}
        targetUserName={user.fullName}
        onFollowChange={(isFollowing) => {
          onFollowChange?.();
        }}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default FollowCard;