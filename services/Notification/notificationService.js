import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const notificationService = {
  async getUserNotifications(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notifications;
    } catch (error) {
      return [];
    }
  },

  async getUnreadCount(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  },

  subscribeToUnreadCount(userId, callback) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
      }, (error) => {
        callback(0);
      });

      return unsubscribe;
    } catch (error) {
      return () => {};
    }
  },

  subscribeToNotifications(userId, callback) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
          notifications.push({
            id: doc.id,
            ...doc.data()
          });
        });
        callback(notifications);
      }, (error) => {
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      return () => {};
    }
  },

  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = [];
      
      snapshot.forEach((doc) => {
        updatePromises.push(updateDoc(doc.ref, { isRead: true }));
      });
      
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      return false;
    }
  },

  async createNotification(notificationData) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp(),
        isRead: false
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      return true;
    } catch (error) {
      return false;
    }
  },

  async deleteNotificationsByOrderId(orderId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('relatedOrderId', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = [];
      
      snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      return false;
    }
  },

  async getNotificationsByOrderId(orderId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('relatedOrderId', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notifications;
    } catch (error) {
      return [];
    }
  },

  async createOrderNotification(order, type) {
    try {
      let notificationsToCreate = [];
      
      if (type === 'new_order') {
        notificationsToCreate.push({
          type: 'new_order_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'New Order Received',
          message: `You have a new order for "${order.productSnapshot?.title}"`,
          data: order
        });

        notificationsToCreate.push({
          type: 'new_order_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Sent',
          message: `You sent purchase request for "${order.productSnapshot?.title}"`,
          data: order
        });
      } else if (type === 'auction_won') {
        const existingNotifications = await this.getNotificationsByOrderId(order.id);
        if (existingNotifications.length > 0) {
          return true;
        }

        notificationsToCreate.push({
          type: 'auction_won',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Auction Won!',
          message: `Congratulations! You won the auction for "${order.productSnapshot?.title}"`,
          data: order
        });

        notificationsToCreate.push({
          type: 'auction_ended_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Auction Completed',
          message: `Your auction for "${order.productSnapshot?.title}" has ended. Winner: ${order.winnerInfo?.displayName || 'User'}`,
          data: order
        });
      } else if (type === 'order_accepted') {
        await this.deleteNotificationsByOrderId(order.id);

        notificationsToCreate.push({
          type: 'order_accepted_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Accepted',
          message: `Your purchase request for "${order.productSnapshot?.title}" has been accepted`,
          data: { ...order, status: 'accepted' }
        });

        notificationsToCreate.push({
          type: 'order_accepted_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Accepted',
          message: `You accepted order for "${order.productSnapshot?.title}"`,
          data: { ...order, status: 'accepted' }
        });
      } else if (type === 'order_rejected') {
        await this.deleteNotificationsByOrderId(order.id);

        notificationsToCreate.push({
          type: 'order_rejected_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Rejected',
          message: `Your purchase request for "${order.productSnapshot?.title}" has been rejected`,
          data: { ...order, status: 'rejected' }
        });

        notificationsToCreate.push({
          type: 'order_rejected_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Rejected',
          message: `You rejected order for "${order.productSnapshot?.title}"`,
          data: { ...order, status: 'rejected' }
        });
      } else if (type === 'order_accepted_with_payment') {
        await this.deleteNotificationsByOrderId(order.id);

        notificationsToCreate.push({
          type: 'order_accepted_with_payment_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Payment Information',
          message: `Your order for "${order.productSnapshot?.title}" has been accepted. Check payment details.`,
          data: order
        });

        notificationsToCreate.push({
          type: 'order_accepted_with_payment_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Accepted',
          message: `You accepted order for "${order.productSnapshot?.title}" with payment request`,
          data: order
        });
      } else if (type === 'order_completed') {
        await this.deleteNotificationsByOrderId(order.id);

        notificationsToCreate.push({
          type: 'order_completed_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Completed',
          message: `Your order for "${order.productSnapshot?.title}" has been completed successfully!`,
          data: { ...order, status: 'completed' }
        });

        notificationsToCreate.push({
          type: 'order_completed_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Order Completed',
          message: `Your order for "${order.productSnapshot?.title}" has been completed successfully!`,
          data: { ...order, status: 'completed' }
        });
      } else if (type === 'order_receipt_confirmed') {
        await this.deleteNotificationsByOrderId(order.id);

        notificationsToCreate.push({
          type: 'order_receipt_confirmed_buyer',
          userId: order.buyerId,
          relatedUserId: order.sellerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Receipt Confirmed',
          message: `You confirmed receipt of "${order.productSnapshot?.title}". Order completed!`,
          data: order
        });

        notificationsToCreate.push({
          type: 'order_receipt_confirmed_seller',
          userId: order.sellerId,
          relatedUserId: order.buyerId,
          relatedOrderId: order.id,
          relatedProductId: order.productId,
          title: 'Buyer Confirmed Receipt',
          message: `Buyer confirmed receipt of "${order.productSnapshot?.title}". You can now complete the order.`,
          data: order
        });
      }

      const createPromises = notificationsToCreate.map(notification => 
        this.createNotification(notification)
      );
      
      await Promise.all(createPromises);
      return true;
    } catch (error) {
      return false;
    }
  },

  async createReportNotification(reportData) {
    try {
      const userNotification = {
        type: 'report_submitted',
        userId: reportData.reporterId,
        relatedUserId: reportData.reportedUserId,
        relatedOrderId: '',
        relatedProductId: '',
        title: 'Report Submitted Successfully',
        message: `Your report about ${reportData.reportedUserName} has been received and is under review.`,
        data: {
          reportId: reportData.reportId,
          reportedUserId: reportData.reportedUserId,
          reportedUserName: reportData.reportedUserName,
          reason: reportData.reason,
          level: reportData.level,
          status: 'submitted',
          timestamp: serverTimestamp()
        },
        isRead: false
      };

      const result = await this.createNotification(userNotification);
      
      return true;
    } catch (error) {
      return false;
    }
  },

  async getReportNotification(reportId, userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('data.reportId', '==', reportId),
        where('type', 'in', ['report_submitted', 'report_resolved', 'report_rejected'])
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  async updateReportNotification(reportId, updateData) {
    try {
      const reportDoc = await getDocs(query(collection(db, 'reports'), where('__name__', '==', reportId)));
      if (reportDoc.empty) return false;

      const reportData = reportDoc.docs[0].data();
      const reporterId = reportData.reporterId;

      const existingNotification = await this.getReportNotification(reportId, reporterId);
      
      if (existingNotification) {
        const notificationRef = doc(db, 'notifications', existingNotification.id);
        
        await updateDoc(notificationRef, {
          ...updateData,
          updatedAt: serverTimestamp(),
          isRead: false
        });
        
        return true;
      } else {
        const newNotification = {
          type: updateData.type,
          userId: reporterId,
          relatedUserId: reportData.reportedUserId,
          relatedOrderId: '',
          relatedProductId: '',
          title: updateData.title,
          message: updateData.message,
          data: updateData.data,
          isRead: false,
          createdAt: serverTimestamp()
        };
        
        await this.createNotification(newNotification);
        return true;
      }
    } catch (error) {
      return false;
    }
  },

  async createReportResolvedNotification(reportId, reason, duration) {
    try {
      const reportDoc = await getDocs(query(collection(db, 'reports'), where('__name__', '==', reportId)));
      if (reportDoc.empty) return false;

      const reportData = reportDoc.docs[0].data();
      
      const updateData = {
        type: 'report_resolved',
        title: 'Report Resolved',
        message: `Your report about ${reportData.reportedUserName} has been resolved.`,
        data: {
          reportId: reportId,
          reportedUserId: reportData.reportedUserId,
          reportedUserName: reportData.reportedUserName,
          reason: reportData.reason,
          duration: duration,
          action: 'suspension',
          status: 'resolved',
          timestamp: serverTimestamp()
        }
      };

      await this.updateReportNotification(reportId, updateData);
      return true;
    } catch (error) {
      return false;
    }
  },

  async createReportRejectedNotification(reportId, rejectReason, customRejectReason) {
    try {
      const reportDoc = await getDocs(query(collection(db, 'reports'), where('__name__', '==', reportId)));
      if (reportDoc.empty) return false;

      const reportData = reportDoc.docs[0].data();
      
      const updateData = {
        type: 'report_rejected',
        title: 'Report Rejected',
        message: `Your report about ${reportData.reportedUserName} has been rejected.`,
        data: {
          reportId: reportId,
          reportedUserId: reportData.reportedUserId,
          reportedUserName: reportData.reportedUserName,
          reason: reportData.reason,
          rejectReason: rejectReason,
          customRejectReason: customRejectReason,
          status: 'rejected',
          timestamp: serverTimestamp()
        }
      };

      await this.updateReportNotification(reportId, updateData);
      return true;
    } catch (error) {
      return false;
    }
  },

  async getNotificationsByType(userId, type) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notifications;
    } catch (error) {
      return [];
    }
  },

  async getRecentNotifications(userId, limit = 10) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      let count = 0;
      snapshot.forEach((doc) => {
        if (count < limit) {
          notifications.push({
            id: doc.id,
            ...doc.data()
          });
          count++;
        }
      });
      
      return notifications;
    } catch (error) {
      return [];
    }
  }
};