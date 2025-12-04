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

interface ReportData {
  reportId: string;
  reporterId: string;
  reportedUserId: string;
  reporterName: string;
  reportedUserName: string;
  reason: string;
  level: string;
  description: string;
  hasImages: boolean;
  hasVideo: boolean;
  timestamp: any;
}

interface ReportConfirmationData {
  reportId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  level: string;
  status: string;
  timestamp: any;
}

interface ReportResolvedData {
  reportId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  duration: number;
  action: string;
  status: string;
  timestamp: any;
}

interface ReportRejectedData {
  reportId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  rejectReason: string;
  customRejectReason: string;
  status: string;
  timestamp: any;
}

interface AdminWarningData {
  actionType: string;
  reason: string;
  timestamp: any;
}

interface AdminProductActionData {
  actionType: string;
  productTitle: string;
  reason: string;
  timestamp: any;
  productImages?: string[];
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
  data: Order | ReportData | ReportConfirmationData | ReportResolvedData | ReportRejectedData | AdminWarningData | AdminProductActionData;
  isRead: boolean;
  createdAt: any;
  isAdminNotification?: boolean;
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
  const [reportedUserData, setReportedUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  if (!user) return null;

  const isBuyerNotification = (notification.data as Order)?.buyerId === user.uid;
  const isSellerNotification = (notification.data as Order)?.sellerId === user.uid && (notification.data as Order)?.buyerId !== user.uid;
  const isAuctionNotification = notification.type.includes('auction');
  const isAuctionWon = notification.type === 'auction_won';
  const isReceiptConfirmedBuyer = notification.type === 'order_receipt_confirmed_buyer';
  const isReceiptConfirmedSeller = notification.type === 'order_receipt_confirmed_seller';
  const isOrderCompleted = notification.type === 'order_completed_buyer' || notification.type === 'order_completed_seller';
  const isAdminWarning = notification.type === 'admin_warning';
  const isAdminAction = notification.type === 'admin_action';
  const isAdminProductAction = notification.type === 'admin_product_action';
  const isReportNotification = notification.type === 'new_report' || notification.isAdminNotification;
  const isReportConfirmation = notification.type === 'report_submitted';
  const isReportResolved = notification.type === 'report_resolved';
  const isReportRejected = notification.type === 'report_rejected';

  useEffect(() => {
    const loadUserDataForNotification = async () => {
      const orderData = notification.data as Order;
      
      if (orderData && !isReportNotification && !isReportConfirmation && !isAdminWarning && !isAdminAction && !isAdminProductAction && !isReportResolved && !isReportRejected) {
        let otherUserId = '';
        
        if (isSellerNotification) {
          otherUserId = orderData.buyerId;
        } else if (isBuyerNotification) {
          otherUserId = orderData.sellerId;
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
      }
    };

    const loadReportedUserData = async () => {
      if (isReportConfirmation || isReportResolved || isReportRejected) {
        const reportData = notification.data as ReportConfirmationData | ReportResolvedData | ReportRejectedData;
        if (reportData.reportedUserId) {
          try {
            const userData = await loadUserData({ uid: reportData.reportedUserId });
            setReportedUserData(userData);
          } catch (error) {
            console.error('Error loading reported user data:', error);
          }
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
    loadReportedUserData();
    loadCurrentUserData();
  }, [notification.data, isSellerNotification, isBuyerNotification, user, isReportNotification, isReportConfirmation, isAdminWarning, isAdminAction, isAdminProductAction, isReportResolved, isReportRejected]);

  const markAsRead = async () => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        onNotificationUpdate?.();
      } catch (error) {
        console.error('Error marking as read:', error);
        onNotificationUpdate?.();
      }
    }
  };

  const handleSellerAction = async (action: 'accept' | 'reject') => {
    const orderData = notification.data as Order;
    if (!orderData) return;

    if (action === 'accept') {
      setShowAcceptModal(true);
      return;
    }

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await updateOrderStatus(orderData.id, 'rejected');
      
      if (result.success) {
        Alert.alert('Success', result.message);
        onNotificationUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptWithPayment = async (sellerNote: string, selectedBankAccount: BankAccount) => {
    const orderData = notification.data as Order;
    if (!orderData) return;

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await acceptOrderWithPayment(
        orderData.id,
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
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    const orderData = notification.data as Order;
    if (!orderData) return;

    setActionLoading(true);
    try {
      await markAsRead();
      
      const result = await confirmReceipt(orderData.id);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        onNotificationUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
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
    const orderData = notification.data as Order;
    if (!orderData) return;

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
              
              const result = await cancelOrder(orderData.id, user.uid);
              
              if (result.success) {
                Alert.alert('Success', result.message);
                onNotificationUpdate?.();
              } else {
                Alert.alert('Error', result.error || 'Cancel failed');
              }
            } catch (error) {
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

    const orderData = notification.data as Order;
    const sellerBankAccount = orderData?.sellerBankAccount;
    
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

            {orderData?.sellerNote && (
              <View style={styles.sellerNote}>
                <Text style={styles.noteLabel}>Seller Note:</Text>
                <Text style={styles.noteText}>{orderData.sellerNote}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderReportedUserInfo = () => {
    const reportData = notification.data as ReportConfirmationData | ReportResolvedData | ReportRejectedData;
    
    return (
      <View style={styles.reportedUserInfo}>
        <Image 
          source={{ uri: reportedUserData?.avatarURL || 'https://via.placeholder.com/40' }} 
          style={styles.reportedUserAvatar}
        />
        <View style={styles.reportedUserText}>
          <Text style={styles.reportedUserLabel}>Reported User</Text>
          <Text style={styles.reportedUserName}>
            {reportedUserData?.fullName || reportData.reportedUserName}
          </Text>
        </View>
      </View>
    );
  };

  const renderReportContent = () => {
    const reportData = notification.data as ReportData;
    
    return (
      <View style={styles.reportDetails}>
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Reporter:</Text>
          <Text style={styles.reportValue}>{reportData.reporterName}</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Reported User:</Text>
          <Text style={styles.reportValue}>{reportData.reportedUserName}</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Reason:</Text>
          <Text style={styles.reportValue}>{reportData.reason}</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Level:</Text>
          <Text style={styles.reportValue}>{reportData.level}</Text>
        </View>
        
        {reportData.description && (
          <View style={styles.reportField}>
            <Text style={styles.reportLabel}>Description:</Text>
            <Text style={styles.reportValue}>{reportData.description}</Text>
          </View>
        )}
        
        <View style={styles.evidenceInfo}>
          <Text style={styles.evidenceText}>
            Evidence: {reportData.hasImages ? '📷' : ''} {reportData.hasVideo ? '🎥' : ''} 
            {!reportData.hasImages && !reportData.hasVideo ? 'No evidence' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderReportConfirmationContent = () => {
    const reportData = notification.data as ReportConfirmationData;
    
    return (
      <View style={styles.reportDetails}>
        {renderReportedUserInfo()}
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Report Reason:</Text>
          <Text style={styles.reportValue}>{reportData.reason}</Text>
        </View>

        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Level:</Text>
          <Text style={styles.reportValue}>{reportData.level}</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Status:</Text>
          <Text style={[styles.reportValue, styles.confirmationStatus]}>Submitted Successfully</Text>
        </View>
      </View>
    );
  };

  const renderReportResolvedContent = () => {
    const reportData = notification.data as ReportResolvedData;
    
    return (
      <View style={styles.reportDetails}>
        {renderReportedUserInfo()}
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Report Reason:</Text>
          <Text style={styles.reportValue}>{reportData.reason}</Text>
        </View>

        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Action Taken:</Text>
          <Text style={styles.reportValue}>User Suspension</Text>
        </View>

        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Duration:</Text>
          <Text style={styles.reportValue}>
            {reportData.duration === -1 ? 'Permanent' : `${reportData.duration} days`}
          </Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Status:</Text>
          <Text style={[styles.reportValue, styles.resolvedStatus]}>Resolved</Text>
        </View>
      </View>
    );
  };

  const renderReportRejectedContent = () => {
    const reportData = notification.data as ReportRejectedData;
    
    return (
      <View style={styles.reportDetails}>
        {renderReportedUserInfo()}
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Report Reason:</Text>
          <Text style={styles.reportValue}>{reportData.reason}</Text>
        </View>

        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Rejection Reason:</Text>
          <Text style={styles.reportValue}>{reportData.rejectReason}</Text>
        </View>

        {reportData.customRejectReason && (
          <View style={styles.reportField}>
            <Text style={styles.reportLabel}>Details:</Text>
            <Text style={styles.reportValue}>{reportData.customRejectReason}</Text>
          </View>
        )}
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Status:</Text>
          <Text style={[styles.reportValue, styles.rejectedStatus]}>Rejected</Text>
        </View>
      </View>
    );
  };

  const renderAdminWarningContent = () => {
    const adminData = notification.data as AdminWarningData;
    
    return (
      <View style={styles.reportDetails}>
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Action Type:</Text>
          <Text style={styles.reportValue}>Warning</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Reason:</Text>
          <Text style={styles.reportValue}>{adminData.reason}</Text>
        </View>
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Status:</Text>
          <Text style={[styles.reportValue, styles.warningStatus]}>Warning Issued</Text>
        </View>
      </View>
    );
  };

  const renderAdminProductActionContent = () => {
    const adminData = notification.data as AdminProductActionData;
    const productImages = adminData.productImages || [];
    const productImage = productImages[0];
    
    return (
      <View style={styles.reportDetails}>
        <View style={styles.productSection}>
          {productImage && (
            <Image 
              source={{ uri: productImage }} 
              style={styles.productImage}
            />
          )}
          <View style={styles.productInfo}>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={2}>
                {adminData.productTitle || ''}
              </Text>
            </View>
          </View>
        </View>
        
        {adminData.reason && (
          <View style={styles.reportField}>
            <Text style={styles.reportLabel}>Reason:</Text>
            <Text style={styles.reportValue}>{adminData.reason}</Text>
          </View>
        )}
        
        <View style={styles.reportField}>
          <Text style={styles.reportLabel}>Status:</Text>
          <Text style={[styles.reportValue, 
            adminData.actionType === 'approved' ? styles.approvedStatus : 
            adminData.actionType === 'rejected' ? styles.rejectedStatus :
            adminData.actionType === 'deleted' ? styles.deletedStatus :
            styles.warningStatus
          ]}>
            {adminData.actionType?.charAt(0).toUpperCase() + adminData.actionType?.slice(1) || 'Unknown'}
          </Text>
        </View>
      </View>
    );
  };

  const renderUserInfo = () => {
    if (loadingUser && !isReportConfirmation && !isReportResolved && !isReportRejected && !isAdminProductAction) {
      return (
        <View style={styles.userInfo}>
          <ActivityIndicator size="small" color="#00A86B" />
          <Text style={styles.userName}>Loading user info...</Text>
        </View>
      );
    }

    if (isReportNotification || isReportConfirmation || isReportResolved || isReportRejected || isAdminWarning || isAdminAction || isAdminProductAction) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.adminAvatar}>
            <Image 
              source={require('../assets/images/logo.png')}
              style={styles.adminLogo}
            />
          </View>
          <View style={styles.userText}>
            <Text style={styles.userRole}>System Notification</Text>
            <Text style={styles.userName}>Circlo Admin</Text>
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

    if (otherUserData && !isAuctionNotification && !isReceiptConfirmedBuyer && !isReceiptConfirmedSeller && !isOrderCompleted) {
      const userRole = isSellerNotification ? 'Buyer' : 'Seller';
      const orderData = notification.data as Order;
      const userId = isSellerNotification ? orderData?.buyerId : orderData?.sellerId;
      
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

    return null;
  };

  const renderNotificationContent = () => {
    const orderData = notification.data as Order;
    const isSellerActionable = isSellerNotification && notification.type === 'new_order_seller' && orderData?.status === 'pending';
    const isBuyerActionable = (isBuyerNotification && notification.type === 'new_order_buyer' && orderData?.status === 'pending') || 
                             (isBuyerNotification && (notification.type === 'order_accepted_with_payment' || isAuctionWon) && 
                              (orderData?.status === 'waiting_payment' || orderData?.status === 'accepted'));
    const canConfirmReceipt = isBuyerNotification && (notification.type === 'order_accepted' || notification.type === 'order_accepted_with_payment' || isAuctionWon) && 
                             (orderData?.status === 'accepted' || orderData?.status === 'waiting_payment');

    return (
      <View style={styles.cardContainer}>
        {!notification.isRead && <View style={styles.unreadIndicator} />}
        
        <TouchableOpacity 
          style={[
            styles.container,
            (isSellerActionable || isBuyerActionable) && styles.actionableContainer,
            isAuctionWon && styles.auctionContainer,
            (isReceiptConfirmedBuyer || isReceiptConfirmedSeller || isOrderCompleted) && styles.completedContainer,
            (isAdminWarning || isAdminAction) && styles.adminWarningContainer,
            isAdminProductAction && styles.adminProductActionContainer,
            isReportConfirmation && styles.reportConfirmationContainer,
            isReportResolved && styles.reportResolvedContainer,
            isReportRejected && styles.reportRejectedContainer
          ]}
          onPress={markAsRead}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {renderUserInfo()}
              
              <View style={styles.productSection}>
                {orderData?.productSnapshot?.images?.[0] && !isAdminWarning && !isAdminAction && !isAdminProductAction && !isReportConfirmation && !isReportResolved && !isReportRejected && (
                  <Image 
                    source={{ uri: orderData.productSnapshot.images[0] }} 
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  {!isAdminWarning && !isAdminAction && !isAdminProductAction && !isReportConfirmation && !isReportResolved && !isReportRejected && (
                    <View style={styles.productDetails}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {orderData?.productSnapshot?.title || ''}
                      </Text>
                      <Text style={styles.productPrice}>
                        {formatPrice(orderData?.productSnapshot?.price || 0)}
                        {isAuctionWon && <Text style={styles.auctionPrice}> (Winning Bid)</Text>}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {isReportNotification && renderReportContent()}
              {isReportConfirmation && renderReportConfirmationContent()}
              {isReportResolved && renderReportResolvedContent()}
              {isReportRejected && renderReportRejectedContent()}
              {(isAdminWarning || isAdminAction) && renderAdminWarningContent()}
              {isAdminProductAction && renderAdminProductActionContent()}
            </View>
          </View>
          
          {orderData && !isAdminWarning && !isAdminAction && !isAdminProductAction && !isReportConfirmation && !isReportResolved && !isReportRejected && (
            <View style={styles.orderInfo}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderData.status) }]}>
                  <Text style={styles.statusText}>
                    {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
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

          {(isAdminWarning || isAdminAction || isAdminProductAction || isReportConfirmation || isReportResolved || isReportRejected) && (
            <View style={styles.orderInfo}>
              <Text style={styles.date}>
                {formatDate(notification.createdAt)}
              </Text>
            </View>
          )}

          {showAcceptModal && !isAdminWarning && !isAdminAction && !isAdminProductAction && !isReportConfirmation && !isReportResolved && !isReportRejected && (
            <AcceptOrderModal
              visible={showAcceptModal}
              onClose={() => setShowAcceptModal(false)}
              onAccept={handleAcceptWithPayment}
              order={orderData}
              bankAccounts={currentUserData?.bankAccounts || []}
              loading={actionLoading}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isReportConfirmation || isReportResolved || isReportRejected || isAdminWarning || isAdminAction || isAdminProductAction || isBuyerNotification || isSellerNotification || isAuctionNotification || isReportNotification) {
    return renderNotificationContent();
  }

  return null;
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
    zIndex: 10,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  actionableContainer: {
    borderLeftColor: '#FFA500',
  },
  auctionContainer: {
    borderLeftColor: '#FFD700',
  },
  completedContainer: {
    borderLeftColor: '#00A86B',
  },
  adminWarningContainer: {
    borderLeftColor: '#af4c4cff',
  },
  adminProductActionContainer: {
    borderLeftColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  reportConfirmationContainer: {
    backgroundColor: 'white',
    borderLeftColor: '#4CAF50',
  },
  reportResolvedContainer: {
    backgroundColor: '#f0fff4',
    borderLeftColor: '#00A86B',
  },
  reportRejectedContainer: {
    backgroundColor: '#fff5f5',
    borderLeftColor: '#dc3545',
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
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminLogo: {
    width: 30,
    height: 30,
    borderRadius: 100,
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
    backgroundColor: '#4CAF50',
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
  crownIcon: {
    fontSize: 16,
  },
  confirmedIcon: {
    fontSize: 16,
  },
  completedIcon: {
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
  reportedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  reportedUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  reportedUserText: {
    flex: 1,
  },
  reportedUserLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  reportedUserName: {
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
  reportDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reportField: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  reportValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  confirmationStatus: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  resolvedStatus: {
    color: '#00A86B',
    fontWeight: 'bold',
  },
  rejectedStatus: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  approvedStatus: {
    color: '#00A86B',
    fontWeight: 'bold',
  },
  deletedStatus: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  warningStatus: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  evidenceInfo: {
    flexDirection: 'row',
    marginTop: 4,
  },
  evidenceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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