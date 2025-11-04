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

// Tạo order mới
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

// Lấy order by ID
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

// Lấy orders của user (mua hoặc bán)
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

// Cập nhật trạng thái order
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };
    
    // Thêm timestamp cho các trạng thái đặc biệt
    if (newStatus === 'accepted') {
      updateData.acceptedAt = serverTimestamp();
    } else if (newStatus === 'rejected') {
      updateData.rejectedAt = serverTimestamp();
    } else if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(orderRef, updateData);
    
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

// Kiểm tra order đã tồn tại chưa
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

// Hủy order
export const cancelOrder = async (orderId, userId) => {
  try {
    const orderResult = await getOrderById(orderId);
    
    if (!orderResult.success) {
      return { success: false, error: 'Order not found' };
    }
    
    const order = orderResult.order;
    
    // Chỉ buyer mới được hủy order pending
    if (order.buyerId !== userId) {
      return { success: false, error: 'Only buyer can cancel this order' };
    }
    
    if (order.status !== 'pending') {
      return { success: false, error: 'Only pending orders can be cancelled' };
    }
    
    return await updateOrderStatus(orderId, 'cancelled');
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};