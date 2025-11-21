import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { notificationService } from '../../services/Notification/notificationService';
import { acceptOrderWithPayment, cancelOrder, confirmReceipt, updateOrderStatus } from '../../services/Order/orderService';
import { formatPrice } from '../../services/Product/productService';
import { loadUserData } from '../../services/User/userService';
import AcceptOrderModal from '../components/AcceptOrderModal';

interface ProductSnapshot {
  title: string;
  price: number;
  images: string[];
  condition: string;
  category: string;
}

interface BuyerAddress {
  street: string;
  province: string;
  district: string;
  ward: string;
  fullAddress: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  bankShortName?: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

interface Order {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  productSnapshot: ProductSnapshot;
  buyerAddress: BuyerAddress;
  shippingFee: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'waiting_payment';
  sellerBankAccount?: BankAccount;
  paymentPercentage?: number;
  sellerNote?: string;
  orderType?: 'normal' | 'auction';
  auctionId?: string;
  buyerConfirmed?: boolean;
  createdAt: any;
  updatedAt: any;
  expiresAt: any;
}

interface Notification {
  id: string;
  type: string;
  userId: string;
  relatedUserId: string;
  relatedOrderId: string;
  relatedProductId: string;
  title: string;
  message: string;
  data: Order;
  isRead: boolean;
  createdAt: any;
}

interface NotificationCardProps {
  notification: Notification;
  onNotificationUpdate?: () => void;
  onAddBankRequest?: () => void;
}

interface UserData {
  fullName?: string;
  avatarURL?: string;
  phone?: string;
  bankAccounts?: BankAccount[];
}

const NotificationCard: React.FC<NotificationCardProps> = ({ 
  notification, 
  onNotificationUpdate,
  onAddBankRequest 
}) => {
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = React.useState(false);
  const [otherUserData, setOtherUserData] = useState<UserData | null>(null);
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  if (!user) return null;

  const isBuyerNotification = notification.data?.buyerId === user.uid;
  const isSellerNotification = notification.data?.sellerId === user.uid && notification.data?.buyerId !== user.uid;
  const isAuctionNotification = notification.type.includes('auction');
  const isAuctionWon = notification.type === 'auction_won';
  const isReceiptConfirmedBuyer = notification.type === 'order_receipt_confirmed_buyer';
  const isReceiptConfirmedSeller = notification.type === 'order_receipt_confirmed_seller';
  const isOrderCompleted = notification.type === 'order_completed_buyer' || notification.type === 'order_completed_seller';
  const isAdminWarning = notification.type === 'admin_warning';
  const isAdminAction = notification.type === 'admin_action';

  useEffect(() => {
    const loadUserDataForNotification = async () => {
      if (!notification.data) return;

      let otherUserId = '';
      
      if (isSellerNotification) {
        otherUserId = notification.data.buyerId;
      } else if (isBuyerNotification) {
        otherUserId = notification.data.sellerId;
      }
      
      if (otherUserId) {
        setLoadingUser(true);
        try {
          const userData = await loadUserData({ uid: otherUserId });
          setOtherUserData(userData);
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setLoadingUser(false);
        }
      }
    };

    const loadCurrentUserData = async () => {
      if (!user) return;
      
      try {
        const userData = await loadUserData({ uid: user.uid });
        setCurrentUserData(userData);
      } catch (error) {
        console.error('Error loading current user data:', error);
      }
    };

    loadUserDataForNotification();
    loadCurrentUserData();
  }, [notification.data, isSellerNotification, isBuyerNotification, user]);

  const markAsRead = async () => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        onNotificationUpdate?.();
      } catch (error) {
        console.warn('Notification might have been deleted:', error);
        onNotificationUpdate?.();
      }
    }
  };

  const handleSellerAction = async (action: 'accept' | 'reject') => {
    if (!notification.data) return;

    if (action === 'accept') {
      setShowAcceptModal(true);
      return;
    }

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await updateOrderStatus(notification.data.id, 'rejected');
      
      if (result.success) {
        Alert.alert('Success', result.message);
        onNotificationUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptWithPayment = async (sellerNote: string, selectedBankAccount: BankAccount) => {
    if (!notification.data) return;

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await acceptOrderWithPayment(
        notification.data.id,
        sellerNote,
        50,
        selectedBankAccount
      );
      
      if (result.success) {
        setShowAcceptModal(false);
        Alert.alert('Success', result.message);
        onNotificationUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error accepting order with payment:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!notification.data) return;

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await confirmReceipt(notification.data.id);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        onNotificationUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error confirming receipt:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBank = () => {
    setShowAcceptModal(false);
    onAddBankRequest?.();
  };

  const handleBuyerCancel = async () => {
    if (!notification.data) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await markAsRead();
              
              const result = await cancelOrder(notification.data.id, user.uid);
              
              if (result.success) {
                Alert.alert('Success', result.message);
                onNotificationUpdate?.();
              } else {
                Alert.alert('Error', result.error || 'Cancel failed');
              }
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(text);
      Alert.alert('Success', 'Account number copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    const visiblePart = accountNumber.slice(-4);
    const hiddenPart = '*'.repeat(accountNumber.length - 4);
    return `${hiddenPart}${visiblePart}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#00A86B';
      case 'rejected': return '#FF3B30';
      case 'completed': return '#007AFF';
      case 'cancelled': return '#8E8E93';
      case 'waiting_payment': return '#5856D6';
      default: return '#8E8E93';
    }
  };

  const renderPaymentInfo = () => {
    if ((notification.type !== 'order_accepted_with_payment' && !isAuctionWon) || !isBuyerNotification) {
      return null;
    }

    const order = notification.data;
    const sellerBankAccount = order?.sellerBankAccount;
    
    if (!sellerBankAccount && isAuctionWon) {
      return (
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Auction Won!</Text>
          <Text style={styles.auctionMessage}>
            Congratulations! You won this auction. Please wait for the seller to provide payment information.
          </Text>
        </View>
      );
    }

    if (!sellerBankAccount) {
      return null;
    }

    return (
      <View style={styles.paymentSection}>
        <TouchableOpacity 
          style={styles.paymentHeader}
          onPress={() => setShowPaymentDetails(!showPaymentDetails)}
        >
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.dropdownArrow}>
            {showPaymentDetails ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showPaymentDetails && (
          <View style={styles.paymentContent}>
            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Bank Details</Text>
              <Text style={styles.bankText}>{sellerBankAccount.bankName}</Text>
              
              <View style={styles.accountRow}>
                <Text style={styles.bankText}>
                  Account: {formatAccountNumber(sellerBankAccount.accountNumber)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(sellerBankAccount.accountNumber)}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.bankText}>Holder: {sellerBankAccount.accountHolder}</Text>
            </View>

            {order?.sellerNote && (
              <View style={styles.sellerNote}>
                <Text style={styles.noteLabel}>Seller Note:</Text>
                <Text style={styles.noteText}>{order.sellerNote}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderUserInfo = () => {
    if (loadingUser) {
      return (
        <View style={styles.userInfo}>
          <ActivityIndicator size="small" color="#00A86B" />
          <Text style={styles.userName}>Loading user info...</Text>
        </View>
      );
    }

    if (otherUserData && !isAuctionNotification && !isReceiptConfirmedBuyer && !isReceiptConfirmedSeller && !isOrderCompleted && !isAdminWarning && !isAdminAction) {
      const userRole = isSellerNotification ? 'Buyer' : 'Seller';
      const userId = isSellerNotification ? notification.data?.buyerId : notification.data?.sellerId;
      
      return (
        <View style={styles.userInfo}>
          <Image 
            source={{ uri: otherUserData.avatarURL || 'https://via.placeholder.com/40' }} 
            style={styles.userAvatar}
          />
          <View style={styles.userText}>
            <Text style={styles.userRole}>From {userRole}</Text>
            <Text style={styles.userName}>
              {otherUserData.fullName || `User ${userId?.slice(-8) || ''}`}
            </Text>
          </View>
        </View>
      );
    }

    if (isAuctionWon) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.auctionCrown}>
            <Text style={styles.crownIcon}>👑</Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>Auction Result</Text>
            <Text style={styles.userName}>You are the winner!</Text>
          </View>
        </View>
      );
    }

    if (isReceiptConfirmedBuyer) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedIcon}>✅</Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>Receipt Confirmed</Text>
            <Text style={styles.userName}>Order completed!</Text>
          </View>
        </View>
      );
    }

    if (isReceiptConfirmedSeller) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedIcon}>✅</Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>Buyer Confirmed</Text>
            <Text style={styles.userName}>Buyer received the item</Text>
          </View>
        </View>
      );
    }

    if (isOrderCompleted) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.completedBadge}>
            <Text style={styles.completedIcon}>🎉</Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>Order Completed</Text>
            <Text style={styles.userName}>Transaction successful!</Text>
          </View>
        </View>
      );
    }

    if (isAdminWarning || isAdminAction) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminIcon}>⚡</Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>System Notification</Text>
            <Text style={styles.userName}>Administrator</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderNotificationContent = () => {
    const order = notification.data;
    const isSellerActionable = isSellerNotification && notification.type === 'new_order_seller' && order?.status === 'pending';
    const isBuyerActionable = (isBuyerNotification && notification.type === 'new_order_buyer' && order?.status === 'pending') || 
                             (isBuyerNotification && (notification.type === 'order_accepted_with_payment' || isAuctionWon) && 
                              (order?.status === 'waiting_payment' || order?.status === 'accepted'));
    const canConfirmReceipt = isBuyerNotification && (notification.type === 'order_accepted' || notification.type === 'order_accepted_with_payment' || isAuctionWon) && 
                             (order?.status === 'accepted' || order?.status === 'waiting_payment');

    return (
      <TouchableOpacity 
        style={[
          styles.container,
          !notification.isRead && styles.unreadContainer,
          (isSellerActionable || isBuyerActionable) && styles.actionableContainer,
          isAuctionWon && styles.auctionContainer,
          (isReceiptConfirmedBuyer || isReceiptConfirmedSeller || isOrderCompleted) && styles.completedContainer,
          (isAdminWarning || isAdminAction) && styles.adminContainer
        ]}
        onPress={markAsRead}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {renderUserInfo()}
            
            <View style={styles.productSection}>
              {order?.productSnapshot?.images?.[0] && !isAdminWarning && !isAdminAction && (
                <Image 
                  source={{ uri: order.productSnapshot.images[0] }} 
                  style={styles.productImage}
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.message}>{notification.message}</Text>
                {!isAdminWarning && !isAdminAction && (
                  <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {order?.productSnapshot?.title || ''}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatPrice(order?.productSnapshot?.price || 0)}
                      {isAuctionWon && <Text style={styles.auctionPrice}> (Winning Bid)</Text>}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
        
        {order && !isAdminWarning && !isAdminAction && (
          <View style={styles.orderInfo}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
              </View>
            </View>

            {renderPaymentInfo()}

            {isSellerActionable && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleSellerAction('accept')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>Accept</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleSellerAction('reject')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {isBuyerActionable && canConfirmReceipt && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleBuyerCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>Cancel Order</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={handleConfirmReceipt}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>Confirm Receipt</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.date}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>
        )}

        {(isAdminWarning || isAdminAction) && (
          <View style={styles.orderInfo}>
            <Text style={styles.date}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>
        )}

        {showAcceptModal && !isAdminWarning && !isAdminAction && (
          <AcceptOrderModal
            visible={showAcceptModal}
            onClose={() => setShowAcceptModal(false)}
            onAccept={handleAcceptWithPayment}
            order={notification.data}
            bankAccounts={currentUserData?.bankAccounts || []}
            loading={actionLoading}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (isBuyerNotification || isSellerNotification || isAuctionNotification || isAdminWarning || isAdminAction) {
    return renderNotificationContent();
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  unreadContainer: {
    borderLeftColor: '#00A86B',
    backgroundColor: '#f8fffc',
  },
  actionableContainer: {
    borderLeftColor: '#FFA500',
    backgroundColor: '#fffaf0',
  },
  auctionContainer: {
    borderLeftColor: '#FFD700',
    backgroundColor: '#fffdf0',
  },
  completedContainer: {
    borderLeftColor: '#00A86B',
    backgroundColor: '#f0fff4',
  },
  adminContainer: {
    borderLeftColor: '#FF6B35',
    backgroundColor: '#fff5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  auctionCrown: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A86B',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownIcon: {
    fontSize: 16,
  },
  confirmedIcon: {
    fontSize: 16,
  },
  completedIcon: {
    fontSize: 16,
  },
  adminIcon: {
    fontSize: 16,
  },
  userText: {
    flex: 1,
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  auctionPrice: {
    fontSize: 11,
    color: '#FF6B35',
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
    marginLeft: 8,
  },
  orderInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  paymentSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  auctionMessage: {
    fontSize: 13,
    color: '#666',
    padding: 12,
    lineHeight: 18,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#007AFF',
  },
  paymentContent: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#d0e8ff',
  },
  bankInfo: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bankText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sellerNote: {
    backgroundColor: '#fffaf0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#cc8500',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    color: '#cc8500',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#00A86B',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#FF9500',
  },
  confirmButton: {
    backgroundColor: '#00A86B',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});

export default NotificationCard;