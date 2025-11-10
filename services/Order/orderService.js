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
      orderType = 'normal'
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
      status: orderType === 'auction' ? 'waiting_payment' : 'pending',
      orderType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    
    const createdOrder = {
      id: docRef.id,
      ...order
    };

    if (orderType === 'auction') {
      await notificationService.createOrderNotification(createdOrder, 'auction_won');
    } else {
      await notificationService.createOrderNotification(createdOrder, 'new_order');
    }
    
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

export const createAuctionOrder = async (auctionData) => {
  try {
    const {
      productId,
      sellerId,
      buyerId,
      productSnapshot,
      buyerAddress,
      sellerAddress,
      shippingFee,
      totalAmount,
      auctionId,
      sellerBankAccount,
      winnerInfo
    } = auctionData;

    // Kiểm tra kỹ order đã tồn tại chưa
    const existingOrder = await checkExistingAuctionOrder(auctionId, productId, buyerId);
    if (existingOrder.exists) {
      console.log('🔄 Auction order already exists:', existingOrder.orderId);
      return {
        success: true,
        orderId: existingOrder.orderId,
        message: 'Auction order already exists'
      };
    }

    const order = {
      productId,
      sellerId,
      buyerId,
      productSnapshot: {
        title: productSnapshot.title,
        price: productSnapshot.price,
        images: productSnapshot.images,
        condition: productSnapshot.condition || 'like_new',
        category: 'auction'
      },
      buyerAddress,
      sellerAddress,
      shippingFee,
      totalAmount,
      status: 'waiting_payment',
      orderType: 'auction',
      auctionId,
      sellerBankAccount,
      paymentPercentage: 50,
      paymentStatus: 'pending',
      winnerInfo: winnerInfo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    
    const createdOrder = {
      id: docRef.id,
      ...order
    };

    console.log('✅ Created auction order:', docRef.id);
    await notificationService.createOrderNotification(createdOrder, 'auction_won');
    
    return {
      success: true,
      orderId: docRef.id,
      message: 'Auction order created successfully!'
    };

  } catch (error) {
    console.error('Error creating auction order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const checkExistingAuctionOrder = async (auctionId, productId, buyerId) => {
  try {
    let q;
    
    // Ưu tiên tìm bằng auctionId
    if (auctionId) {
      q = query(
        collection(db, 'orders'),
        where('auctionId', '==', auctionId),
        where('orderType', '==', 'auction')
      );
    } else {
      // Fallback: tìm bằng productId và buyerId
      q = query(
        collection(db, 'orders'),
        where('productId', '==', productId),
        where('buyerId', '==', buyerId),
        where('orderType', '==', 'auction')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        exists: false
      };
    } else {
      const orderId = querySnapshot.docs[0].id;
      console.log('📦 Found existing auction order:', orderId);
      return {
        exists: true,
        orderId: orderId
      };
    }
  } catch (error) {
    console.error('Error checking existing auction order:', error);
    return { exists: false };
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

export const acceptOrderWithPayment = async (orderId, sellerNote, paymentPercentage, sellerBankAccount) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      status: 'waiting_payment',
      sellerNote: sellerNote,
      paymentPercentage: paymentPercentage || 50,
      sellerBankAccount: sellerBankAccount,
      paymentStatus: 'pending',
      updatedAt: serverTimestamp()
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

// Thêm vào file orderService.js, trong phần exports
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