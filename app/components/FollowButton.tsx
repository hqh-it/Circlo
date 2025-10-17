import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { checkFollowStatus, followUser, unfollowUser } from '../../services/User/followService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetUserName,
  onFollowChange,
}) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check follow status when component mounts
  useEffect(() => {
    checkCurrentFollowStatus();
  }, [targetUserId, user]);

  const checkCurrentFollowStatus = async () => {
    if (!user || !user.uid || !targetUserId) return;
    
    try {
      const result = await checkFollowStatus(user.uid, targetUserId);
      if (result.success) {
        setIsFollowing(result.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !user.uid) {
      Alert.alert('Notification', 'Please login to follow users');
      return;
    }

    setLoading(true);
    try {
      const result = await followUser(user.uid, targetUserId);
      if (result.success) {
        setIsFollowing(true);
        onFollowChange?.(true);
        console.log('✅ Followed user successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!user || !user.uid) {
      Alert.alert('Notification', 'Please login to unfollow users');
      return;
    }

    setLoading(true);
    try {
      const result = await unfollowUser(user.uid, targetUserId);
      if (result.success) {
        setIsFollowing(false);
        setShowUnfollowModal(false);
        onFollowChange?.(false);
        console.log('✅ Unfollowed user successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to unfollow user');
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user');
    } finally {
      setLoading(false);
    }
  };

  const confirmUnfollow = () => {
    setShowUnfollowModal(true);
  };

  const cancelUnfollow = () => {
    setShowUnfollowModal(false);
  };

  if (!user || !user.uid || user.uid === targetUserId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Following State (Default) - Chưa follow */}
      {!isFollowing && (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={handleFollow}
          disabled={loading}
        >
          <Image 
            style={[styles.icon, { tintColor: '#0482d0ff' }]}
            source={require("../assets/icons/following.png")}
          />
          <Text style={[styles.buttonText, { color: '#01332fff' }]}>
            {loading ? '...' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Follower State (After following) - Đã follow */}
      {isFollowing && (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={confirmUnfollow}
          disabled={loading}
        >
          <Image 
            style={[styles.icon, { tintColor: '#04d0bfff' }]}
            source={require("../assets/icons/follower.png")}
          />
          <Text style={[styles.buttonText, { color: '#01332fff' }]}>
            {loading ? '...' : 'Followed'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelUnfollow}
      >
        <TouchableWithoutFeedback onPress={cancelUnfollow}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Unfollow User</Text>
                <View style={styles.modalIconContainer}>
                  <Image 
                    style={[styles.modalIcon, { tintColor: 'red' }]}
                    source={require("../assets/icons/unfollow.png")}
                  />
                </View>
                <Text style={styles.modalMessage}>
                  Are you sure you want to unfollow {targetUserName}?
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={cancelUnfollow}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.unfollowButton]}
                    onPress={handleUnfollow}
                    disabled={loading}
                  >
                    <Text style={styles.unfollowButtonText}>
                      {loading ? 'Processing...' : 'Unfollow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: SCREEN_WIDTH * 0.06,
    height: SCREEN_WIDTH * 0.06,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalIcon: {
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  unfollowButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FollowButton;