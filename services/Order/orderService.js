import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { notificationService } from '../Notification/notificationService';

export const createOrder = async (orderData) => {
  try {
    const {
      productId,
      sellerId,
      buyerId,
      productSnapshot,
      buyerAddress,
      shippingFee,
      totalAmount,
    } = orderData;

    const order = {
      productId,
      sellerId,
      buyerId,
      productSnapshot: {
        title: productSnapshot.title,
        price: productSnapshot.price,
        images: productSnapshot.images,
        condition: productSnapshot.condition || 'like_new',
        category: productSnapshot.category || 'normal'
      },
      buyerAddress, 
      shippingFee,
      totalAmount,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    
    const createdOrder = {
      id: docRef.id,
      ...order
    };

    await notificationService.createOrderNotification(createdOrder, 'new_order');
    
    return {
      success: true,
      orderId: docRef.id,
      message: 'Order created successfully!'
    };

  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getOrderById = async (orderId) => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    
    if (orderDoc.exists()) {
      return {
        success: true,
        order: { id: orderDoc.id, ...orderDoc.data() }
      };
    } else {
      return {
        success: false,
        error: 'Order not found'
      };
    }
  } catch (error) {
    console.error('Error getting order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserOrders = async (userId, type = 'buying') => {
  try {
    let field = type === 'buying' ? 'buyerId' : 'sellerId';
    
    const q = query(
      collection(db, 'orders'),
      where(field, '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      success: true,
      orders
    };
    
  } catch (error) {
    console.error('Error getting user orders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };
    
    if (newStatus === 'accepted') {
      updateData.acceptedAt = serverTimestamp();
    } else if (newStatus === 'rejected') {
      updateData.rejectedAt = serverTimestamp();
    } else if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(orderRef, updateData);

    const orderResult = await getOrderById(orderId);
    if (orderResult.success) {
      const notificationType = `order_${newStatus}`;
      await notificationService.createOrderNotification(orderResult.order, notificationType);
    }
    
    return {
      success: true,
      message: `Order ${newStatus} successfully!`
    };
    
  } catch (error) {
    console.error('Error updating order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const checkExistingOrder = async (productId, buyerId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('productId', '==', productId),
      where('buyerId', '==', buyerId),
      where('status', 'in', ['pending', 'accepted'])
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: true,
        exists: false
      };
    } else {
      const existingOrder = querySnapshot.docs[0].data();
      return {
        success: true,
        exists: true,
        orderId: querySnapshot.docs[0].id,
        status: existingOrder.status
      };
    }
    
  } catch (error) {
    console.error('Error checking existing order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const cancelOrder = async (orderId, userId) => {
  try {
    const orderResult = await getOrderById(orderId);
    
    if (!orderResult.success) {
      return { success: false, error: 'Order not found' };
    }
    
    const order = orderResult.order;
    
    if (order.buyerId !== userId) {
      return { success: false, error: 'Only buyer can cancel this order' };
    }
    
    if (order.status !== 'pending') {
      return { success: false, error: 'Only pending orders can be cancelled' };
    }
    
    const result = await updateOrderStatus(orderId, 'cancelled');
    
    if (result.success) {
      await notificationService.createOrderNotification(order, 'order_cancelled');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// New function for accepting order with payment information
export const acceptOrderWithPayment = async (orderId, sellerNote, paymentPercentage, sellerBankAccount) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      status: 'waiting_payment',
      sellerNote: sellerNote,
      paymentPercentage: paymentPercentage || 50,
      sellerBankAccount: sellerBankAccount,
      paymentStatus: 'pending',
      updatedAt: serverTimestamp(),
      acceptedAt: serverTimestamp()
    };
    
    await updateDoc(orderRef, updateData);

    const orderResult = await getOrderById(orderId);
    if (orderResult.success) {
      await notificationService.createOrderNotification(orderResult.order, 'order_accepted_with_payment');
    }
    
    return {
      success: true,
      message: 'Order accepted successfully! Payment request sent to buyer.'
    };
    
  } catch (error) {
    console.error('Error accepting order with payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Additional function to get orders by status
export const getOrdersByStatus = async (userId, status, type = 'buying') => {
  try {
    let field = type === 'buying' ? 'buyerId' : 'sellerId';
    
    const q = query(
      collection(db, 'orders'),
      where(field, '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      success: true,
      orders
    };
    
  } catch (error) {
    console.error('Error getting orders by status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};