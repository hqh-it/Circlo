import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { deleteAuctionProduct, updateAuctionProduct } from '../Auction/auctionService';
import { notificationService } from '../Notification/notificationService';
import { deleteProduct, getProductById, updateProduct } from '../Product/productService';
export const sendWarningToUser = async (userId, reason = "Account warning from administrator") => {
  try {
    const notificationData = {
      type: 'admin_warning',
      userId: userId,
      title: 'Account Warning',
      message: `You have received a warning from administrator: ${reason}`,
      data: {
        actionType: 'warning',
        reason: reason,
        timestamp: new Date()
      }
    };
    
    const result = await notificationService.createNotification(notificationData);
    
    if (result) {
      return { success: true, message: 'Warning sent successfully' };
    } else {
      return { success: false, error: 'Failed to send warning notification' };
    }
  } catch (error) {
    console.error('Error sending warning:', error);
    return { success: false, error: 'Failed to send warning' };
  }
};

export const sendSuspensionNotification = async (userId, reason, duration, actionType) => {
  try {
    let title = '';
    let message = '';
    
    if (actionType === 'warning') {
      title = 'Account Warning';
      message = `You have received a warning: ${reason}`;
    } else if (actionType === 'suspend') {
      if (duration === -1) {
        title = 'Account Deactivated';
        message = `Your account has been permanently deactivated. Reason: ${reason}`;
      } else {
        title = 'Account Suspended';
        message = `Your account has been suspended for ${duration} days. Reason: ${reason}`;
      }
    } else if (actionType === 'unsuspend') {
      title = 'Account Reactivated';
      message = 'Your account has been reactivated and you can now access all features.';
    } else if (actionType === 'ban') {
      title = 'Account Banned';
      message = `Your account has been permanently banned. Reason: ${reason}`;
    } else if (actionType === 'unban') {
      title = 'Account Unbanned';
      message = 'Your account has been unbanned and you can now access all features.';
    }
    
    const notificationData = {
      type: 'admin_action',
      userId: userId,
      title: title,
      message: message,
      data: {
        actionType: actionType,
        reason: reason,
        duration: duration,
        timestamp: new Date()
      }
    };
    
    await notificationService.createNotification(notificationData);
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to send notification' };
  }
};

export const approveProduct = async (productId, productType = 'normal') => {
  try {
    let result;
    
    if (productType === 'auction') {
      const auctionDocRef = doc(db, 'auction_products', productId);
      const auctionDoc = await getDoc(auctionDocRef);
      
      if (!auctionDoc.exists()) {
        return { success: false, error: 'Auction product not found' };
      }

      await updateDoc(auctionDocRef, {
        status: 'active',
        'auctionInfo.status': 'active',
        updatedAt: new Date()
      });
      
      result = { success: true, message: 'Auction approved successfully' };
    } else {
      result = await updateProduct(productId, { status: 'active' });
    }
    
    if (result.success) {
      return { success: true, message: 'Product approved successfully' };
    } else {
      return { success: false, error: result.error || 'Failed to approve product' };
    }
  } catch (error) {
    console.error('Error approving product:', error);
    return { success: false, error: 'Failed to approve product: ' + error.message };
  }
};

export const rejectProduct = async (productId, productType = 'normal', reason, customReason = '') => {
  try {
    let result;
    const finalReason = customReason || reason;
    
    if (productType === 'auction') {
      result = await updateAuctionProduct(productId, { 
        status: 'rejected',
        rejectionReason: finalReason
      });
    } else {
      result = await updateProduct(productId, { 
        status: 'rejected',
        rejectionReason: finalReason
      });
    }
    
    if (result.success) {
      return { success: true, message: 'Product rejected successfully' };
    } else {
      return { success: false, error: result.error || 'Failed to reject product' };
    }
  } catch (error) {
    console.error('Error rejecting product:', error);
    return { success: false, error: 'Failed to reject product' };
  }
};

export const adminDeleteProduct = async (productId, productType = 'normal', reason, customReason = '') => {
  try {
    let result;
    const finalReason = customReason || reason;
    
    if (productType === 'auction') {
      result = await deleteAuctionProduct(productId);
    } else {
      result = await deleteProduct(productId);
    }
    
    if (result.success) {
      return { success: true, message: 'Product deleted successfully' };
    } else {
      return { success: false, error: result.error || 'Failed to delete product' };
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
};

export const sendProductNotification = async (userId, action, productTitle, reason = '', productId = '') => {
  try {
    let title = '';
    let message = '';
    let productImages = [];
    
    if (productId) {
      try {
        const productResult = await getProductById(productId);
        if (productResult.success && productResult.product && productResult.product.images) {
          productImages = productResult.product.images;
        }
      } catch (error) {
        console.error('Error fetching product images:', error);
      }
    }
    
    switch (action) {
      case 'approved':
        title = 'Product Approved';
        message = `Your product "${productTitle}" has been approved and is now live.`;
        break;
      case 'rejected':
        title = 'Product Rejected';
        message = `Your product "${productTitle}" has been rejected. Reason: ${reason}`;
        break;
      case 'deleted':
        title = 'Product Deleted';
        message = `Your product "${productTitle}" has been deleted by administrator. Reason: ${reason}`;
        break;
      default:
        return { success: false, error: 'Invalid action type' };
    }
    
    const notificationData = {
      type: 'admin_product_action',
      userId: userId,
      relatedProductId: productId,
      title: title,
      message: message,
      data: {
        actionType: action,
        productTitle: productTitle,
        reason: reason,
        productImages: productImages,
        timestamp: new Date()
      }
    };
    
    const result = await notificationService.createNotification(notificationData);
    
    if (result) {
      return { success: true, message: 'Notification sent successfully' };
    } else {
      return { success: false, error: 'Failed to send notification' };
    }
  } catch (error) {
    console.error('Error sending product notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
};

export const getProductRejectionReasons = () => {
  return [
    'Inappropriate content',
    'Violates community guidelines',
    'Spam or misleading information',
    'Duplicate product',
    'Incorrect category',
    'Prohibited item',
    'Low quality images',
    'Insufficient information',
    'Other'
  ];
};