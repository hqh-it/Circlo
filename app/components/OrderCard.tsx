import { useRouter } from 'expo-router';
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
import { chatService } from '../../services/Chat/chatService';
import { DeliveryService } from '../../services/Delivery/deliveryService';
import { acceptOrderWithPayment, cancelOrder, updateOrderStatus } from '../../services/Order/orderService';
import { formatPrice } from '../../services/Product/productService';
import AcceptOrderModal from '../components/AcceptOrderModal';

interface ProductSnapshot {
  title: string;
  price: number;
  images: string[];
  condition: string;
  category: string;
}

interface Address {
  street: string;
  province: string;
  provinceCode?: string;
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

interface WinnerInfo {
  uid: string;
  displayName: string;
  avatarURL?: string;
}

interface Order {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  productSnapshot: ProductSnapshot;
  buyerAddress: Address;
  sellerAddress?: Address;
  shippingFee: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'waiting_payment';
  sellerBankAccount?: BankAccount;
  paymentPercentage?: number;
  sellerNote?: string;
  orderType?: 'normal' | 'auction';
  auctionId?: string;
  winnerInfo?: WinnerInfo;
  createdAt: any;
  updatedAt: any;
}

interface OrderCardProps {
  order: Order;
  onOrderUpdate?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onOrderUpdate }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [calculatedShippingFee, setCalculatedShippingFee] = useState(order.shippingFee);

  useEffect(() => {
    if (order.orderType === 'auction' && order.sellerAddress && order.buyerAddress) {
      calculateShippingFee();
    }
  }, [order]);

  const calculateShippingFee = () => {
    if (!order.sellerAddress || !order.buyerAddress) return;

    try {
      const shippingResult = DeliveryService.calculateShippingFee(
        order.sellerAddress,
        order.buyerAddress
      );
      
      if (shippingResult.success) {
        setCalculatedShippingFee(shippingResult.shippingFee);
      }
    } catch (error) {
      console.error('Error calculating shipping fee:', error);
    }
  };

  if (!user) return null;

  const isBuyer = order.buyerId === user.uid;
  const isSeller = order.sellerId === user.uid;
  const isAuctionOrder = order.orderType === 'auction';
  const finalShippingFee = isAuctionOrder ? calculatedShippingFee : order.shippingFee;
  const finalTotalAmount = isAuctionOrder ? order.totalAmount + finalShippingFee : order.totalAmount;

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ Pending';
      case 'accepted': return '✅ Accepted';
      case 'rejected': return '❌ Rejected';
      case 'completed': return '🎉 Completed';
      case 'cancelled': return '🚫 Cancelled';
      case 'waiting_payment': return '💰 Waiting Payment';
      default: return status;
    }
  };

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      let result;
      
      switch (action) {
        case 'accept':
          setShowAcceptModal(true);
          return;
        case 'reject':
          result = await updateOrderStatus(order.id, 'rejected');
          break;
        case 'complete':
          result = await updateOrderStatus(order.id, 'completed');
          break;
        case 'cancel':
          result = await cancelOrder(order.id, user.uid);
          break;
        default:
          return;
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        onOrderUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptWithPayment = async (sellerNote: string, selectedBankAccount: BankAccount) => {
    setLoading(true);
    try {
      const result = await acceptOrderWithPayment(
        order.id,
        sellerNote,
        50,
        selectedBankAccount
      );
      
      if (result.success) {
        setShowAcceptModal(false);
        Alert.alert('Success', result.message);
        onOrderUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error accepting order with payment:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!user) return;

    setContactLoading(true);
    try {
      const targetUserId = isBuyer ? order.sellerId : order.buyerId;
      
      const createData = {
        participants: [user.uid, targetUserId],
        productId: order.productId,
        productInfo: {
          id: order.productId,
          title: order.productSnapshot.title,
          price: order.productSnapshot.price,
          images: order.productSnapshot.images,
          sellerId: order.sellerId
        },
        type: 'direct'
      };

      const result = await chatService.createOrGetChannel(createData);
      
      if (result.success) {
        const productInfo = {
          id: order.productId,
          title: order.productSnapshot.title,
          price: order.productSnapshot.price,
          images: order.productSnapshot.images,
          sellerId: order.sellerId
        };

        router.push({
          pathname: '/screens/Chat/chatScreen',
          params: {
            channelId: result.channelId,
            productData: JSON.stringify(productInfo)
          }
        });
      } else {
        Alert.alert('Error', 'Cannot create chat room');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      Alert.alert('Error', 'Cannot start chat');
    } finally {
      setContactLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(text);
      Alert.alert('Success', 'Copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  const renderPaymentInfo = () => {
    if (!isBuyer || !order.sellerBankAccount) return null;

    return (
      <View style={styles.paymentSection}>
        <TouchableOpacity 
          style={styles.paymentHeader}
          onPress={() => setShowPaymentDetails(!showPaymentDetails)}
        >
          <Text style={styles.paymentTitle}>💳 Payment Information</Text>
          <Text style={styles.dropdownArrow}>
            {showPaymentDetails ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showPaymentDetails && (
          <View style={styles.paymentContent}>
            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Bank Details</Text>
              <Text style={styles.bankText}>{order.sellerBankAccount.bankName}</Text>
              
              <View style={styles.accountRow}>
                <Text style={styles.bankText}>
                  Account: {formatAccountNumber(order.sellerBankAccount.accountNumber)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(order.sellerBankAccount!.accountNumber)}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.bankText}>Holder: {order.sellerBankAccount.accountHolder}</Text>
              
              {order.paymentPercentage && (
                <Text style={styles.paymentPercentage}>
                  Advance Payment: {order.paymentPercentage}%
                </Text>
              )}
            </View>

            {order.sellerNote && (
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

  const renderWinnerInfo = () => {
    if (!isAuctionOrder || !order.winnerInfo) return null;

    return (
      <View style={styles.winnerSection}>
        <Text style={styles.winnerTitle}>🏆 Auction Winner</Text>
        <View style={styles.winnerInfoContainer}>
          {order.winnerInfo.avatarURL && (
            <Image
              source={{ uri: order.winnerInfo.avatarURL }}
              style={styles.winnerAvatar}
            />
          )}
          <View style={styles.winnerDetails}>
            <Text style={styles.winnerName}>{order.winnerInfo.displayName}</Text>
            <Text style={styles.winnerId}>User ID: {order.winnerInfo.uid.slice(-8)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBuyerActions = () => {
    if (!isBuyer) return null;

    switch (order.status) {
      case 'pending':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleAction('cancel')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        );
      
      case 'accepted':
      case 'waiting_payment':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContact}
            disabled={contactLoading}
          >
            {contactLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.actionButtonText}>Contact Seller</Text>
            )}
          </TouchableOpacity>
        );
      
      case 'completed':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
            >
              <Text style={styles.actionButtonText}>Leave Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.contactButton]}
              onPress={handleContact}
              disabled={contactLoading}
            >
              {contactLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Contact Seller</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderSellerActions = () => {
    if (!isSeller) return null;

    switch (order.status) {
      case 'pending':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAction('accept')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleAction('reject')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'accepted':
      case 'waiting_payment':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleAction('complete')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.contactButton]}
              onPress={handleContact}
              disabled={contactLoading}
            >
              {contactLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Contact Buyer</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderId}>Order #{order.id.slice(-8)}</Text>
          {isAuctionOrder && (
            <View style={styles.auctionBadge}>
              <Text style={styles.auctionBadgeText}>🏆 Auction</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      {renderWinnerInfo()}

      <View style={styles.productSection}>
        <Image
          source={{ uri: order.productSnapshot.images[0] }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {order.productSnapshot.title}
          </Text>
          <Text style={styles.productPrice}>
            {formatPrice(order.totalAmount)}
            {isAuctionOrder && <Text style={styles.auctionPriceNote}> (Winning Bid)</Text>}
          </Text>
          <Text style={styles.productCondition}>
            Condition: {order.productSnapshot.condition}
          </Text>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Product Price:</Text>
          <Text style={styles.detailValue}>{formatPrice(order.totalAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shipping Fee:</Text>
          <Text style={styles.detailValue}>{formatPrice(finalShippingFee)}</Text>
        </View>
        {isAuctionOrder && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount:</Text>
            <Text style={[styles.detailValue, styles.totalAmount]}>
              {formatPrice(finalTotalAmount)}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery Address:</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {order.buyerAddress.fullAddress}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Date:</Text>
          <Text style={styles.detailValue}>{formatDate(order.createdAt)}</Text>
        </View>
      </View>

      {renderPaymentInfo()}

      {loading ? (
        <ActivityIndicator size="small" color="#00A86B" style={styles.loading} />
      ) : (
        <View style={styles.actionsSection}>
          {renderBuyerActions()}
          {renderSellerActions()}
        </View>
      )}

      <AcceptOrderModal
        visible={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onAccept={handleAcceptWithPayment}
        order={order}
        bankAccounts={[]}
        loading={loading}
      />
    </View>
  );
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  auctionBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  auctionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B7500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  winnerSection: {
    backgroundColor: '#fffdf0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  winnerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B7500',
    marginBottom: 8,
  },
  winnerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  winnerDetails: {
    flex: 1,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  winnerId: {
    fontSize: 12,
    color: '#666',
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 4,
  },
  auctionPriceNote: {
    fontSize: 12,
    color: '#FF6B35',
    fontStyle: 'italic',
  },
  productCondition: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
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
  paymentPercentage: {
    fontSize: 13,
    color: '#00A86B',
    fontWeight: '600',
    marginTop: 4,
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
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
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
  completeButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF9500',
  },
  contactButton: {
    backgroundColor: '#5856D6',
  },
  reviewButton: {
    backgroundColor: '#FF2D55',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    paddingVertical: 12,
  },
});

export default OrderCard;