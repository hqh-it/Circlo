// components/BuyButton.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { checkExistingOrder } from '../../services/Order/orderService';

interface BuyButtonProps {
  productId: string;
  sellerId: string;
  onPress: () => void;
  disabled?: boolean;
  refreshTrigger?: number;
}

const BuyButton: React.FC<BuyButtonProps> = ({
  productId,
  sellerId,
  onPress,
  disabled = false,
  refreshTrigger = 0,
}) => {
  const { user } = useAuth();
  const [orderStatus, setOrderStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'>('none');
  const [loading, setLoading] = useState(true);

  const checkOrderStatus = async () => {
    if (!user || !productId) {
      setLoading(false);
      return;
    }

    try {
      const result = await checkExistingOrder(productId, user.uid);
      if (result.success && result.exists) {
        setOrderStatus(result.status as any);
      } else {
        setOrderStatus('none');
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      setOrderStatus('none');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkOrderStatus();
  }, [user, productId, refreshTrigger]);

  const isOwner = user && user.uid === sellerId;

  const handlePress = () => {
    if (isOwner || orderStatus !== 'none' || !user || disabled) {
      return;
    }
    onPress();
  };

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.buttonText}>Loading...</Text>
      </TouchableOpacity>
    );
  }

  if (isOwner) {
    return (
      <TouchableOpacity style={[styles.button, styles.ownerButton]} disabled>
        <Text style={styles.buttonText}>🛒 Your Product</Text>
      </TouchableOpacity>
    );
  }

  if (!user) {
    return (
      <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
        <Text style={styles.buttonText}>🛒 Login to Buy</Text>
      </TouchableOpacity>
    );
  }

  if (orderStatus !== 'none') {
    const getStatusConfig = () => {
      switch (orderStatus) {
        case 'pending':
          return {
            text: '⏳ Request Sent',
            style: styles.pendingButton,
          };
        case 'accepted':
          return {
            text: '✅ Order Accepted',
            style: styles.acceptedButton,
          };
        case 'rejected':
          return {
            text: '❌ Order Rejected',
            style: styles.rejectedButton,
          };
        case 'cancelled':
          return {
            text: '🗑️ Order Cancelled',
            style: styles.cancelledButton,
          };
        case 'completed':
          return {
            text: '🎉 Order Completed',
            style: styles.completedButton,
          };
        default:
          return {
            text: '🛒 Buy Now',
            style: styles.button,
          };
      }
    };

    const config = getStatusConfig();

    return (
      <TouchableOpacity style={[styles.button, config.style]} disabled>
        <Text style={styles.buttonText}>{config.text}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.button, disabled && styles.disabledButton]} 
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>🛒 Buy Now</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: '#00A86B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingButton: {
    backgroundColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  ownerButton: {
    backgroundColor: '#666',
  },
  pendingButton: {
    backgroundColor: '#FFA500',
  },
  acceptedButton: {
    backgroundColor: '#00A86B',
  },
  rejectedButton: {
    backgroundColor: '#FF4444',
  },
  cancelledButton: {
    backgroundColor: '#666',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
});

export default BuyButton;