import { useRouter } from "expo-router";
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminDeleteProduct, approveProduct, getProductRejectionReasons, sendProductNotification } from '../../../../services/Admin/AdminNotificationService';
import { formatPrice, getTimeAgo } from '../../../../services/Product/productService';

interface AuctionInfo {
  currentBid: number;
  startPrice: number;
  startTime: any;
  endTime: any;
  bidCount: number;
  status: 'active' | 'ended'|'pending';
  bidIncrement: number;
  buyNowPrice?: number;
  highestBidder?: string | null;
}

interface AdminProductCardProps {
  product: {
    id: string;
    type?: 'normal' | 'auction';
    images: string[];
    title: string;
    price: number;
    sellerAvatar?: string;
    sellerName: string;
    condition?: string;
    createdAt?: any;
    sellerId: string;
    status: 'pending' | 'active' | 'rejected';
    auctionInfo?: AuctionInfo;
  };
  onApprove?: (productId: string) => void;
  onReject?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onViewDetail?: (productId: string, isAuction: boolean) => void;
  onProductUpdate?: () => void;
}

const AdminProductCard: React.FC<AdminProductCardProps> = ({
  product,
  onApprove,
  onReject,
  onDelete,
  onViewDetail,
  onProductUpdate,
}) => {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [selectedDeleteReason, setSelectedDeleteReason] = useState('');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  
  const isAuction = product.type === 'auction' && !!product.auctionInfo;
  const rejectionReasons = getProductRejectionReasons();

  const handleViewDetail = () => {
    if (onViewDetail) {
      onViewDetail(product.id, isAuction);
    } else {
      if (isAuction) {
        router.push({
          pathname: '/screens/Auction/auction_detail',
          params: { id: product.id }
        });
      } else {
        router.push({
          pathname: '/screens/Products/product_detail',
          params: { id: product.id }
        });
      }
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveProduct(product.id, product.type);
      
      if (result.success) {
        await sendProductNotification(product.sellerId, 'approved', product.title, '', product.id);
        Alert.alert('Success', result.message);
        onProductUpdate?.();
        onApprove?.(product.id);
      } else {
        Alert.alert('Error', result.error || 'Failed to approve product');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while approving product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReason) {
      Alert.alert('Error', 'Please select a rejection reason');
      return;
    }

    if (selectedRejectReason === 'Other' && !customRejectReason.trim()) {
      Alert.alert('Error', 'Please provide a custom rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const finalReason = selectedRejectReason === 'Other' ? customRejectReason : selectedRejectReason;
      
      await sendProductNotification(product.sellerId, 'rejected', product.title, finalReason, product.id);
      
      Alert.alert('Success', 'Rejection notification sent successfully');
      setSelectedRejectReason('');
      setCustomRejectReason('');
      setShowRejectModal(false);
      onProductUpdate?.();
      onReject?.(product.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to send rejection notification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteReason) {
      Alert.alert('Error', 'Please select a deletion reason');
      return;
    }

    if (selectedDeleteReason === 'Other' && !customDeleteReason.trim()) {
      Alert.alert('Error', 'Please provide a custom deletion reason');
      return;
    }

    setActionLoading(true);
    try {
      const finalReason = selectedDeleteReason === 'Other' ? customDeleteReason : selectedDeleteReason;
      
      const result = await adminDeleteProduct(product.id, product.type, selectedDeleteReason, customDeleteReason);
      
      if (result.success) {
        await sendProductNotification(product.sellerId, 'deleted', product.title, finalReason, product.id);
        Alert.alert('Success', result.message);
        setSelectedDeleteReason('');
        setCustomDeleteReason('');
        setShowDeleteModal(false);
        onProductUpdate?.();
        onDelete?.(product.id);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete product');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while deleting product');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (product.status) {
      case 'pending': return '#FFA500';
      case 'active': return '#00A86B';
      case 'rejected': return '#FF4444';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (product.status) {
      case 'pending': return 'Pending Review';
      case 'active': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return product.status;
    }
  };

  const getDisplayPrice = () => {
    const price = product.price;
    
    if (typeof formatPrice === 'function') {
      return formatPrice(price) + ' VND';
    } else {
      return price.toLocaleString('vi-VN') + ' VND';
    }
  };

  const renderRejectModal = () => (
    <Modal
      visible={showRejectModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowRejectModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.rejectModalContent}>
          <Text style={styles.modalTitle}>Reject Product</Text>
          
          <Text style={styles.modalSubtitle}>
            Please select a reason for rejecting this product
          </Text>

          <ScrollView style={styles.reasonsList}>
            {rejectionReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reasonItem,
                  selectedRejectReason === reason && styles.selectedReasonItem
                ]}
                onPress={() => setSelectedRejectReason(reason)}
              >
                <Text style={[
                  styles.reasonText,
                  selectedRejectReason === reason && styles.selectedReasonText
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedRejectReason === 'Other' && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>Custom Reason:</Text>
              <TextInput
                style={styles.customReasonInput}
                placeholder="Please specify the rejection reason"
                value={customRejectReason}
                onChangeText={setCustomRejectReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowRejectModal(false);
                setSelectedRejectReason('');
                setCustomRejectReason('');
              }}
              disabled={actionLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalButton, 
                styles.confirmRejectButton,
                (!selectedRejectReason || actionLoading || (selectedRejectReason === 'Other' && !customRejectReason.trim())) && styles.disabledButton
              ]}
              onPress={handleConfirmReject}
              disabled={!selectedRejectReason || actionLoading || (selectedRejectReason === 'Other' && !customRejectReason.trim())}
            >
              <Text style={styles.confirmButtonText}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.rejectModalContent}>
          <Text style={styles.modalTitle}>Delete Product</Text>
          
          <Text style={styles.modalSubtitle}>
            Please select a reason for deleting this product
          </Text>

          <ScrollView style={styles.reasonsList}>
            {rejectionReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reasonItem,
                  selectedDeleteReason === reason && styles.selectedReasonItem
                ]}
                onPress={() => setSelectedDeleteReason(reason)}
              >
                <Text style={[
                  styles.reasonText,
                  selectedDeleteReason === reason && styles.selectedReasonText
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedDeleteReason === 'Other' && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>Custom Reason:</Text>
              <TextInput
                style={styles.customReasonInput}
                placeholder="Please specify the deletion reason"
                value={customDeleteReason}
                onChangeText={setCustomDeleteReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowDeleteModal(false);
                setSelectedDeleteReason('');
                setCustomDeleteReason('');
              }}
              disabled={actionLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalButton, 
                styles.confirmDeleteButton,
                (!selectedDeleteReason || actionLoading || (selectedDeleteReason === 'Other' && !customDeleteReason.trim())) && styles.disabledButton
              ]}
              onPress={handleConfirmDelete}
              disabled={!selectedDeleteReason || actionLoading || (selectedDeleteReason === 'Other' && !customDeleteReason.trim())}
            >
              <Text style={styles.confirmButtonText}>
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, product.status === 'rejected' && styles.rejectedContainer]}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      <View style={styles.content}>
        {/* Product Image and Basic Info */}
        <View style={styles.productHeader}>
          <Image
            source={{ uri: product.images[0] }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          <View style={styles.productBasicInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>
            
            <View style={styles.sellerInfo}>
              {product.sellerAvatar && (
                <Image 
                  source={{ uri: product.sellerAvatar }} 
                  style={styles.avatar} 
                />
              )}
              <Text style={styles.sellerName}>{product.sellerName}</Text>
            </View>
            
            <Text style={styles.price}>{getDisplayPrice()}</Text>
            
            <View style={styles.metaInfo}>
              <Text style={styles.metaText}>
                {isAuction ? '🛒 Auction' : '📦 Normal'} • {getTimeAgo(product.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Luôn có nút View Detail */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={handleViewDetail}
          >
            <Text style={styles.actionButtonText}>👁 View</Text>
          </TouchableOpacity>
          
          {/* Nút Approve/Reject chỉ hiển thị cho pending */}
          {product.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>
                  ✓ Approve
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>
                  ✗ Reject
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Nút Delete luôn hiển thị cho mọi trạng thái */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              🗑 Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderRejectModal()}
      {renderDeleteModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rejectedContainer: {
    backgroundColor: '#fff8f8',
    borderColor: '#ffcccc',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  productBasicInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 20,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
  },
  sellerName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00A86B',
    marginTop: 6,
  },
  metaInfo: {
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 80,
  },
  viewButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  approveButton: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  deleteButton: {
    backgroundColor: '#fff8f8',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  reasonsList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  reasonItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedReasonItem: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedReasonText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  customReasonContainer: {
    marginBottom: 15,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmRejectButton: {
    backgroundColor: '#dc3545',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff4444',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AdminProductCard;