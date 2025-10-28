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
export const auctionChatService = {

  parseTimestamp: (timestamp) => {
    if (!timestamp) return new Date();
    
    try {
      if (timestamp.type === 'firestore/timestamp/1.0' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      }
      
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      
      if (timestamp instanceof Date) {
        return timestamp;
      }
      
      return new Date(timestamp);
    } catch (error) {
      console.error('Error parsing timestamp:', error, timestamp);
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
      console.error('Error creating auction channel:', error);
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
      console.error('Error placing bid:', error);
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
      console.error('Error getting auction channels:', error);
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
        console.error('Error listening to auction messages:', error);
        callback({
          success: false,
          error: error.message,
          messages: []
        });
      });

      return unsubscribe;

    } catch (error) {
      console.error('Error setting up auction message listener:', error);
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
      console.error('Error getting auction channel:', error);
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
      console.error('Error adding user to watchers:', error);
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
      console.error('Error removing user from watchers:', error);
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
      console.error('Error creating system message:', error);
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
      console.error('Error marking auction messages as read:', error);
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
      console.error('Error counting unread auction messages:', error);
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
      console.error('Error getting auction channel by auction ID:', error);
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
      console.error('Error adding user to auction channel:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getUserInfo(userId) {
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
      console.error('Error getting user info:', error);
      return {
        uid: userId,
        displayName: 'User',
        avatarURL: null
      };
    }
  },

  async getMultipleUsersInfo(userIds) {
    try {
      const userPromises = userIds.map(id => this.getUserInfo(id));
      return await Promise.all(userPromises);
    } catch (error) {
      console.error('Error getting multiple users info:', error);
      return [];
    }
  }

};
export default auctionChatService;