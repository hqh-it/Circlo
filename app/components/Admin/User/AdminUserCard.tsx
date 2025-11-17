import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../../../firebaseConfig';

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarURL?: string;
  role?: string;
  isActive?: boolean;
}

interface AdminUserCardProps {
  user: User;
  onUserUpdate: () => void;
}

const AdminUserCard: React.FC<AdminUserCardProps> = ({ user, onUserUpdate }) => {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleViewProfile = () => {
    router.push({
      pathname: "/screens/Profile/PublicProfile",
      params: { 
        userId: user.id,
        isAdminView: "true"
      }
    });
  };

  const handleToggleStatus = async () => {
    if (user.role === 'admin') {
      Alert.alert('Restricted Action', 'Cannot modify other administrator accounts.');
      return;
    }

    const action = user.isActive !== false ? 'deactivate' : 'activate';
    
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} ${user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: `Yes, ${action}`, 
          style: 'destructive',
          onPress: executeToggleStatus
        }
      ]
    );
  };

  const executeToggleStatus = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        isActive: !user.isActive,
        updatedAt: new Date()
      });
      onUserUpdate();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeRole = async () => {
    if (user.role === 'admin') {
      Alert.alert('Restricted Action', 'Cannot modify roles of administrator accounts.');
      return;
    }

    const newRole = user.role === 'user' ? 'moderator' : 'user';
    const roleText = newRole === 'moderator' ? 'Moderator' : 'User';
    
    Alert.alert(
      'Change User Role',
      `Change ${user.fullName}'s role to ${roleText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: `Make ${roleText}`, 
          onPress: () => executeChangeRole(newRole)
        }
      ]
    );
  };

  const executeChangeRole = async (newRole: string) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        role: newRole,
        updatedAt: new Date()
      });
      onUserUpdate();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  const handleBanUser = () => {
    if (user.role === 'admin') {
      Alert.alert('Restricted Action', 'Cannot ban administrator accounts.');
      return;
    }

    Alert.alert(
      'Ban User Account',
      `Permanently ban ${user.fullName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Ban User', 
          style: 'destructive',
          onPress: executeBanUser
        }
      ]
    );
  };

  const executeBanUser = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        isBanned: true,
        isActive: false,
        bannedAt: new Date(),
        updatedAt: new Date()
      });
      onUserUpdate();
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewActivity = () => {
    Alert.alert('User Activity', `View activity logs for ${user.fullName}`);
  };

  const getStatusColor = () => {
    if (user.role === 'admin') return '#00A86B';
    return user.isActive !== false ? '#00A86B' : '#ff4444';
  };

  const getStatusText = () => {
    if (user.role === 'admin') return 'Administrator';
    return user.isActive !== false ? 'Active' : 'Inactive';
  };

  const getRoleText = () => {
    switch (user.role) {
      case 'admin': return 'Admin';
      case 'moderator': return 'Moderator';
      default: return 'User';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <Image
          source={
            user.avatarURL
              ? { uri: user.avatarURL }
              : require('../../../sets/icons/profile-picture.png')
          }
          style={styles.avatar}
        />
        <View style={styles.userDetails}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.fullName}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Text style={styles.roleText}> • {getRoleText()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={handleViewProfile}
        >
          <Text style={styles.viewButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleViewActivity}
        >
          <Text style={styles.actionButtonText}>Activity</Text>
        </TouchableOpacity>

        {user.role !== 'admin' && (
          <>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.roleButton,
                updating && styles.disabledButton
              ]}
              onPress={handleChangeRole}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {user.role === 'user' ? 'Make Moderator' : 'Make User'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton, 
                user.isActive !== false ? styles.deactivateButton : styles.activateButton,
                updating && styles.disabledButton
              ]}
              onPress={handleToggleStatus}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {user.isActive !== false ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.banButton,
                updating && styles.disabledButton
              ]}
              onPress={handleBanUser}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>Ban</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#00A86B',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  roleText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
  },
  roleButton: {
    backgroundColor: '#FF9800',
  },
  deactivateButton: {
    backgroundColor: '#ff4444',
  },
  activateButton: {
    backgroundColor: '#00A86B',
  },
  banButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AdminUserCard;