import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { loadUserData } from '../User/userService';
import {
  AuctionStatus,
  ChannelType,
  MessageStatus,
  MessageType
} from './chatTypes';

const orderCreationLocks = new Map();

export const auctionChatService = {
parseTimestamp: (timestamp) => {
  if (!timestamp) return new Date();
  
  try {
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }

    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  } catch (error) {
    return new Date();
  }
},

  getAuctionStatus: (startTime, endTime) => {
    const now = new Date();
    const start = auctionChatService.parseTimestamp(startTime);
    const end = auctionChatService.parseTimestamp(endTime);

    if (now < start) return AuctionStatus.UPCOMING;
    if (now > end) return AuctionStatus.ENDED;
    return AuctionStatus.LIVE;
  },

  getTimeRemaining: (endTime) => {
    const now = new Date();
    const end = auctionChatService.parseTimestamp(endTime);
    return Math.max(0, end.getTime() - now.getTime());
  },

  getTimeUntilStart: (startTime) => {
    const now = new Date();
    const start = auctionChatService.parseTimestamp(startTime);
    return Math.max(0, start.getTime() - now.getTime());
  },

  createAuctionChannel: async (createData) => {
    try {
      const docRef = await addDoc(collection(db, 'auction_channels'), {
        auctionId: createData.auctionId,
        participants: createData.participants || [createData.createdBy],
        watchers: [],
        productInfo: createData.productInfo,
        type: ChannelType.AUCTION,
        currentBid: createData.startPrice || 0,
        bidCount: 0,
        highestBidder: '',
        participantCount: createData.participants?.length || 1,
        isActive: true,
        createdBy: createData.createdBy,
        orderCreated: false,
        orderCreationInProgress: false,
        lastBidAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        channelId: docRef.id,
        channel: {
          id: docRef.id,
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  exitAuctionRoom: async (channelId, userId) => {
    try {
      const channelRef = doc(db, 'auction_channels', channelId);
      
      await updateDoc(channelRef, {
        participants: arrayRemove(userId),
        participantCount: increment(-1),
        updatedAt: serverTimestamp()
      });

      await auctionChatService.createSystemMessage(
        channelId,
        'user_left',
        `👋 A participant has left the auction room`,
        { userId }
      );

      return {
        success: true
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  placeBid: async (placeBidData) => {
    try {
      const { channelId, userId, bidAmount, currentBid, bidIncrement } = placeBidData;

      const validation = auctionChatService.validateBidAmount(bidAmount, currentBid, bidIncrement);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const result = await runTransaction(db, async (transaction) => {
        const channelRef = doc(db, 'auction_channels', channelId);
        const channelDoc = await transaction.get(channelRef);
        
        if (!channelDoc.exists()) {
          throw new Error('Auction channel not found');
        }

        const channelData = channelDoc.data();
        
        const currentValidation = auctionChatService.validateBidAmount(
          bidAmount, 
          channelData.currentBid, 
          bidIncrement
        );
        if (!currentValidation.isValid) {
          throw new Error(currentValidation.error);
        }

        const messagesRef = collection(db, 'auction_messages');
        const bidMessageRef = doc(messagesRef);
        
        const bidMessage = {
          id: bidMessageRef.id,
          channelId: channelId,
          senderId: userId,
          bidAmount: bidAmount,
          previousBid: channelData.currentBid,
          type: MessageType.BID,
          timestamp: serverTimestamp(),
          readBy: [userId],
          status: MessageStatus.SENT
        };

        transaction.set(bidMessageRef, bidMessage);

        const updateData = {
          currentBid: bidAmount,
          highestBidder: userId,
          bidCount: increment(1),
          lastBidAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (!channelData.participants.includes(userId)) {
          updateData.participants = arrayUnion(userId);
          updateData.participantCount = increment(1);
        }

        transaction.update(channelRef, updateData);

        return { bidMessage, updateData };
      });

      return {
        success: true,
        messageId: result.bidMessage.id,
        newBid: result.bidMessage.bidAmount
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  getUserAuctionChannels: async (userId) => {
    try {
      const channelsRef = collection(db, 'auction_channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', userId),
        orderBy('lastBidAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const channels = [];
      
      snapshot.forEach(doc => {
        channels.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        channels: channels
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        channels: []
      };
    }
  },

  getAuctionMessages: (channelId, callback) => {
    try {
      const messagesRef = collection(db, 'auction_messages');
      const q = query(
        messagesRef,
        where('channelId', '==', channelId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        callback({
          success: true,
          messages: messages
        });
      }, (error) => {
        callback({
          success: false,
          error: error.message,
          messages: []
        });
      });

      return unsubscribe;

    } catch (error) {
      callback({
        success: false,
        error: error.message,
        messages: []
      });
      return () => {};
    }
  },

  getAuctionChannelById: async (channelId) => {
    try {
      const channelDoc = await getDoc(doc(db, 'auction_channels', channelId));
      if (channelDoc.exists()) {
        return {
          success: true,
          channel: { id: channelDoc.id, ...channelDoc.data() }
        };
      } else {
        return { success: false, error: 'Auction channel not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  addUserToWatchers: async (channelId, userId) => {
    try {
      const channelRef = doc(db, 'auction_channels', channelId);
      await updateDoc(channelRef, {
        watchers: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  removeUserFromWatchers: async (channelId, userId) => {
    try {
      const channelRef = doc(db, 'auction_channels', channelId);
      await updateDoc(channelRef, {
        watchers: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createSystemMessage: async (channelId, systemType, content, relatedData = {}) => {
    try {
      const messagesRef = collection(db, 'auction_messages');
      const messageRef = await addDoc(messagesRef, {
        channelId: channelId,
        systemType: systemType,
        content: content,
        relatedData: relatedData,
        type: MessageType.SYSTEM,
        timestamp: serverTimestamp(),
        readBy: []
      });

      return {
        success: true,
        messageId: messageRef.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  validateBidAmount: (bidAmount, currentBid, bidIncrement) => {
    const minValidBid = currentBid + bidIncrement;
    return {
      isValid: bidAmount >= minValidBid,
      minValidBid: minValidBid,
      error: bidAmount < minValidBid ? 
        `Bid must be at least ${minValidBid.toLocaleString()} VND` : null
    };
  },

  markMessagesAsRead: async (channelId, userId) => {
    try {
      const messagesRef = collection(db, 'auction_messages');
      const q = query(
        messagesRef,
        where('channelId', '==', channelId)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = [];
      
      snapshot.forEach((document) => {
        const messageData = document.data();
        const messageId = document.id;
        
        if (messageData.senderId !== userId && 
            (!messageData.readBy || !messageData.readBy.includes(userId))) {
          
          const messageRef = doc(db, 'auction_messages', messageId);
          const updatedReadBy = messageData.readBy ? 
            [...messageData.readBy, userId] : [userId];
          
          updatePromises.push(
            updateDoc(messageRef, {
              readBy: updatedReadBy
            })
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  getUnreadAuctionMessagesCount: async (userId) => {
    try {
      const channelsResult = await auctionChatService.getUserAuctionChannels(userId);
      let totalUnread = 0;

      for (const channel of channelsResult.channels) {
        const messagesRef = collection(db, 'auction_messages');
        const q = query(
          messagesRef,
          where('channelId', '==', channel.id),
          orderBy('timestamp', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        let channelUnread = 0;
        snapshot.forEach(doc => {
          const messageData = doc.data();
          
          if (messageData.senderId !== userId && 
              (!messageData.readBy || !messageData.readBy.includes(userId))) {
            channelUnread++;
          }
        });
        
        totalUnread += channelUnread;
      }
      
      return totalUnread;
      
    } catch (error) {
      return 0;
    }
  },

  getTimeAgo: (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const time = auctionChatService.parseTimestamp(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  },

  getAuctionChannelByAuctionId: async (auctionId) => {
    try {
      const channelsRef = collection(db, 'auction_channels');
      const q = query(
        channelsRef,
        where('auctionId', '==', auctionId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          success: true,
          channel: { id: doc.id, ...doc.data() }
        };
      } else {
        return { success: false, error: 'Auction channel not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  addUserToAuctionChannel: async (channelId, userId) => {
    try {
      const channelRef = doc(db, 'auction_channels', channelId);
      
      await runTransaction(db, async (transaction) => {
        const channelDoc = await transaction.get(channelRef);
        
        if (!channelDoc.exists()) {
          throw new Error('Auction channel not found');
        }
        
        const channelData = channelDoc.data();
        
        if (channelData.participants.includes(userId)) {
          return;
        }
        
        transaction.update(channelRef, {
          participants: arrayUnion(userId),
          participantCount: increment(1),
          updatedAt: serverTimestamp()
        });
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getUserInfo: async (userId) => {
    try {
      const userData = await loadUserData({ uid: userId });
      if (userData) {
        return {
          uid: userId,
          displayName: userData.fullName || 'User',
          avatarURL: userData.avatarURL
        };
      }
      return {
        uid: userId,
        displayName: 'User',
        avatarURL: null
      };
    } catch (error) {
      return {
        uid: userId,
        displayName: 'User',
        avatarURL: null
      };
    }
  },

  getMultipleUsersInfo: async (userIds) => {
    try {
      const userPromises = userIds.map(id => auctionChatService.getUserInfo(id));
      return await Promise.all(userPromises);
    } catch (error) {
      return [];
    }
  },

  updateAuctionChannel: async (auctionId, updateData) => {
    try {
      const channelsQuery = query(
        collection(db, 'auction_channels'),
        where('auctionId', '==', auctionId)
      );
      
      const querySnapshot = await getDocs(channelsQuery);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Auction channel not found' };
      }

      const updatePromises = querySnapshot.docs.map(async (channelDoc) => {
        const channelRef = doc(db, 'auction_channels', channelDoc.id);
        
        const firestoreUpdateData = {
          ...updateData,
          updatedAt: serverTimestamp()
        };
        
        if (updateData.productInfo) {
          firestoreUpdateData.productInfo = {
            ...updateData.productInfo
          };
        }
        
        await updateDoc(channelRef, firestoreUpdateData);
      });

      await Promise.all(updatePromises);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  checkExistingAuctionOrder: async (auctionId, productId, buyerId) => {
    try {
      let q;
      
      if (auctionId) {
        q = query(
          collection(db, 'orders'),
          where('auctionId', '==', auctionId),
          where('orderType', '==', 'auction')
        );
      } else {
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
        return {
          exists: true,
          orderId: querySnapshot.docs[0].id
        };
      }
    } catch (error) {
      return { exists: false };
    }
  },

  endAuctionAndCreateOrderAutomatically: async (auctionChannel) => {
    const lockKey = `auction_${auctionChannel.id}`;
    
    if (orderCreationLocks.get(lockKey)) {
      return { success: true, message: 'Order creation in progress' };
    }

    orderCreationLocks.set(lockKey, true);

    try {
      if (!auctionChannel.highestBidder) {
        orderCreationLocks.delete(lockKey);
        return { success: false, error: 'No winner for this auction' };
      }

      const result = await runTransaction(db, async (transaction) => {
        const channelRef = doc(db, 'auction_channels', auctionChannel.id);
        const channelDoc = await transaction.get(channelRef);
        
        if (!channelDoc.exists()) {
          throw new Error('Auction channel not found');
        }

        const channelData = channelDoc.data();
        
        if (channelData.orderCreated || channelData.orderCreationInProgress) {
          return { success: true, message: 'Order already created or in progress' };
        }

        transaction.update(channelRef, {
          orderCreationInProgress: true,
          updatedAt: serverTimestamp()
        });

        const existingOrderCheck = await auctionChatService.checkExistingAuctionOrder(
          auctionChannel.id,
          auctionChannel.productInfo.id, 
          auctionChannel.highestBidder
        );
        
        if (existingOrderCheck.exists) {
          transaction.update(channelRef, {
            orderCreated: true,
            orderId: existingOrderCheck.orderId,
            orderCreationInProgress: false,
            updatedAt: serverTimestamp()
          });
          return { success: true, orderId: existingOrderCheck.orderId, message: 'Order already exists' };
        }

        const [sellerData, buyerData] = await Promise.all([
          loadUserData({ uid: auctionChannel.productInfo.sellerId }),
          loadUserData({ uid: auctionChannel.highestBidder })
        ]);

        const orderData = {
          productId: auctionChannel.productInfo.id,
          sellerId: auctionChannel.productInfo.sellerId,
          buyerId: auctionChannel.highestBidder,
          productSnapshot: {
            title: auctionChannel.productInfo.title,
            price: auctionChannel.currentBid,
            images: auctionChannel.productInfo.images,
            condition: auctionChannel.productInfo.condition || 'like_new',
            category: 'auction'
          },
          buyerAddress: buyerData?.address || {
            street: '',
            province: '',
            district: '',
            ward: '',
            fullAddress: 'Address to be provided by buyer'
          },
          sellerAddress: sellerData?.address,
          shippingFee: 0,
          totalAmount: auctionChannel.currentBid,
          orderType: 'auction',
          auctionId: auctionChannel.id,
          sellerBankAccount: sellerData?.bankAccounts?.[0] || null,
          winnerInfo: {
            uid: auctionChannel.highestBidder,
            displayName: buyerData?.fullName || 'Buyer',
            avatarURL: buyerData?.avatarURL
          }
        };

        const ordersRef = collection(db, 'orders');
        const orderRef = doc(ordersRef);
        const order = {
          ...orderData,
          id: orderRef.id,
          status: 'waiting_payment',
          paymentPercentage: 50,
          paymentStatus: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        transaction.set(orderRef, order);

        transaction.update(channelRef, {
          orderCreated: true,
          orderId: orderRef.id,
          orderCreationInProgress: false,
          updatedAt: serverTimestamp()
        });

        return { success: true, orderId: orderRef.id, orderData: order };
      });

      if (result.success && result.orderId) {
        await auctionChatService.createSystemMessage(
          auctionChannel.id,
          'auction_ended',
          `🏆 Auction ended! Order has been created for the winner.`,
          { orderId: result.orderId }
        );

        const notificationService = await import('../Notification/notificationService');
        await notificationService.notificationService.createOrderNotification(result.orderData, 'auction_won');
      }

      orderCreationLocks.delete(lockKey);
      return result;

    } catch (error) {
      orderCreationLocks.delete(lockKey);
      
      try {
        const channelRef = doc(db, 'auction_channels', auctionChannel.id);
        await updateDoc(channelRef, {
          orderCreationInProgress: false,
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
      }

      return {
        success: false,
        error: error.message
      };
    }
  },

  updateAuctionStatus: async (channelId, status) => {
    try {
      const channelRef = doc(db, 'auction_channels', channelId);
      await updateDoc(channelRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default auctionChatService;