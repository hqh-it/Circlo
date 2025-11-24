import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { sendSuspensionNotification, sendWarningToUser } from '../../../../services/Admin/AdminNotificationService';
import { activateUser, banUser, deactivateUser, unbanUser } from '../../../../services/Admin/AdminUserService';
import SuspensionModal from './SuspensionModal';

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarURL?: string;
  role?: string;
  isActive?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  suspendReason?: string;
  suspendedUntil?: any;
}

interface AdminUserCardProps {
  user: User;
  onUserUpdate: () => void;
}

const AdminUserCard: React.FC<AdminUserCardProps> = ({ user, onUserUpdate }) => {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const isBanned = user.isBanned === true;
  const isSuspended = user.isSuspended === true;
  const isAdmin = user.role === 'admin';

  const handleViewProfile = () => {
    router.push({
      pathname: "/screens/Profile/PublicProfile",
      params: { 
        userId: user.id,
        isAdminView: "true"
      }
    });
  };

  const handleManageUser = () => {
    if (isAdmin) {
      Alert.alert('Restricted Action', 'Cannot modify other administrator accounts.');
      return;
    }
    setShowActionModal(true);
  };

  const handleConfirmAction = async (reason: string, duration: number, customReason?: string) => {
    setUpdating(true);
    try {
      const finalReason = customReason || reason;
      
      if (duration === 0) {
        const warningResult = await sendWarningToUser(user.id, finalReason);
        if (!warningResult.success) {
          Alert.alert('Error', warningResult.error);
          return;
        }
      } else {
        const suspendResult = await deactivateUser(user.id, finalReason, duration);
        if (!suspendResult.success) {
          Alert.alert('Error', suspendResult.error);
          return;
        }
        
        const notificationResult = await sendSuspensionNotification(
          user.id, 
          finalReason, 
          duration, 
          'suspend'
        );
        
        if (!notificationResult.success) {
          console.warn('Failed to send notification:', notificationResult.error);
        }
      }
      
      Alert.alert('Success', duration === 0 ? 'Warning sent successfully' : 'User deactivated successfully');
      onUserUpdate();
    } catch (error) {
      Alert.alert('Error', 'Failed to perform action');
    } finally {
      setUpdating(false);
      setShowActionModal(false);
    }
  };

  const handleActivate = async () => {
    setUpdating(true);
    try {
      const result = await activateUser(user.id);
      if (result.success) {
        await sendSuspensionNotification(user.id, '', 0, 'unsuspend');
        Alert.alert('Success', result.message);
        onUserUpdate();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate user');
    } finally {
      setUpdating(false);
    }
  };

  const handleBanUser = () => {
    if (isAdmin) {
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
      const result = await banUser(user.id, "Manual ban by administrator");
      if (result.success) {
        await sendSuspensionNotification(user.id, "Manual ban by administrator", -1, 'ban');
        Alert.alert('Success', result.message);
        onUserUpdate();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnbanUser = () => {
    Alert.alert(
      'Unban User Account',
      `Unban ${user.fullName}? This will restore their account access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unban User', 
          style: 'default',
          onPress: executeUnbanUser
        }
      ]
    );
  };

  const executeUnbanUser = async () => {
    setUpdating(true);
    try {
      const result = await unbanUser(user.id);
      if (result.success) {
        await sendSuspensionNotification(user.id, '', 0, 'unban');
        Alert.alert('Success', result.message);
        onUserUpdate();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = () => {
    if (isBanned) return '#dc3545';
    if (isSuspended) return '#ff8800';
    if (isAdmin) return '#00A86B';
    return '#00A86B';
  };

  const getStatusText = () => {
    if (isBanned) return 'Banned';
    if (isSuspended) return 'Suspended';
    if (isAdmin) return 'Administrator';
    return 'Active';
  };

  const getRoleText = () => {
    switch (user.role) {
      case 'admin': return 'Admin';
      case 'moderator': return 'Moderator';
      default: return 'User';
    }
  };

  const getSuspensionInfo = () => {
    if (!isSuspended) return null;
    
    let info = `Reason: ${user.suspendReason || 'No reason provided'}`;
    
    if (user.suspendedUntil) {
      const untilDate = user.suspendedUntil.toDate ? user.suspendedUntil.toDate() : new Date(user.suspendedUntil);
      info += `\nUntil: ${untilDate.toLocaleDateString()}`;
    } else {
      info += `\nDuration: Permanent`;
    }
    
    return info;
  };

  const showBanButton = !isAdmin && !isBanned && !isSuspended;
  const showUnbanButton = !isAdmin && isBanned;
  const showManageButton = !isAdmin && !isBanned && !isSuspended;
  const showActivateButton = !isAdmin && !isBanned && isSuspended;

  return (
    <View style={[
      styles.card,
      isBanned && styles.bannedCard,
      isSuspended && styles.suspendedCard
    ]}>
      <View style={styles.userInfo}>
        <Image
          source={
            user.avatarURL
              ? { uri: user.avatarURL }
              : require('../../../assets/icons/profile-picture.png')
          }
          style={styles.avatar}
        />
        <View style={styles.userDetails}>
          <Text style={[
            styles.userName,
            isBanned && styles.bannedText,
            isSuspended && styles.suspendedText
          ]} numberOfLines={1}>
            {user.fullName}
            {isBanned && ' 🚫'}
            {isSuspended && ' ⚠️'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Text style={styles.roleText}> • {getRoleText()}</Text>
          </View>
          {isSuspended && getSuspensionInfo() && (
            <Text style={styles.suspensionInfo}>
              {getSuspensionInfo()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={handleViewProfile}
        >
          <Text style={styles.viewButtonText}>View Profile</Text>
        </TouchableOpacity>

        {showManageButton && (
          <TouchableOpacity 
            style={[
              styles.manageButton,
              updating && styles.disabledButton
            ]}
            onPress={handleManageUser}
            disabled={updating}
          >
            <Text style={styles.buttonText}>
              Manage User
            </Text>
          </TouchableOpacity>
        )}

        {showActivateButton && (
          <TouchableOpacity 
            style={[
              styles.activateButton,
              updating && styles.disabledButton
            ]}
            onPress={handleActivate}
            disabled={updating}
          >
            <Text style={styles.buttonText}>
              Activate
            </Text>
          </TouchableOpacity>
        )}

        {showBanButton && (
          <TouchableOpacity 
            style={[
              styles.banButton,
              updating && styles.disabledButton
            ]}
            onPress={handleBanUser}
            disabled={updating}
          >
            <Text style={styles.buttonText}>
              Ban
            </Text>
          </TouchableOpacity>
        )}

        {showUnbanButton && (
          <TouchableOpacity 
            style={[
              styles.unbanButton,
              updating && styles.disabledButton
            ]}
            onPress={handleUnbanUser}
            disabled={updating}
          >
            <Text style={styles.buttonText}>
              Unban
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <SuspensionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        onConfirm={handleConfirmAction}
        userName={user.fullName}
      />
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
  bannedCard: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  suspendedCard: {
    borderLeftColor: '#ff8800',
    backgroundColor: '#fffaf0',
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
  bannedText: {
    color: '#dc3545',
  },
  suspendedText: {
    color: '#ff8800',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  suspensionInfo: {
    fontSize: 11,
    color: '#ff8800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  manageButton: {
    backgroundColor: '#ff8800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activateButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  banButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unbanButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminUserCard;