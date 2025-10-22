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
import {
    AuctionStatus,
    ChannelType,
    MessageStatus,
    MessageType
} from './chatTypes';

// Reuse necessary functions from chatService

/**
 * AUCTION CHAT SERVICE
 */
export const auctionChatService = {

  /**
   * CREATE AUCTION CHANNEL
   */
  createAuctionChannel: async (createData) => {
    try {
      console.log('Creating auction channel...');
      
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

      console.log('Auction channel created:', docRef.id);
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

  /**
   * PLACE BID
   */
  placeBid: async (placeBidData) => {
    try {
      const { channelId, userId, bidAmount, currentBid, bidIncrement } = placeBidData;

      console.log('Placing bid...', { channelId, userId, bidAmount });

      // Validate bid amount
      const validation = auctionChatService.validateBidAmount(bidAmount, currentBid, bidIncrement);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Use transaction for data consistency
      const result = await runTransaction(db, async (transaction) => {
        const channelRef = doc(db, 'auction_channels', channelId);
        const channelDoc = await transaction.get(channelRef);
        
        if (!channelDoc.exists()) {
          throw new Error('Auction channel not found');
        }

        const channelData = channelDoc.data();
        
        // Double-check bid validation with current channel data
        const currentValidation = auctionChatService.validateBidAmount(
          bidAmount, 
          channelData.currentBid, 
          bidIncrement
        );
        if (!currentValidation.isValid) {
          throw new Error(currentValidation.error);
        }

        // Add bid message
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

        // Update auction channel
        const updateData = {
          currentBid: bidAmount,
          highestBidder: userId,
          bidCount: increment(1),
          lastBidAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Add user to participants if not already there
        if (!channelData.participants.includes(userId)) {
          updateData.participants = arrayUnion(userId);
          updateData.participantCount = increment(1);
        }

        transaction.update(channelRef, updateData);

        return { bidMessage, updateData };
      });

      console.log('Bid placed successfully');
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

  /**
   * GET USER AUCTION CHANNELS
   */
  getUserAuctionChannels: async (userId) => {
    try {
      console.log('Getting user auction channels...', userId);
      
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

      console.log(`Found ${channels.length} auction channels`);
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

  /**
   * GET AUCTION MESSAGES (REALTIME)
   */
  getAuctionMessages: (channelId, callback) => {
    try {
      console.log('Listening to auction messages...', channelId);
      
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
        
        console.log(`Received ${messages.length} auction messages`);
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

  /**
   * GET AUCTION CHANNEL BY ID
   */
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

  /**
   * ADD USER TO WATCHERS
   */
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

  /**
   * REMOVE USER FROM WATCHERS
   */
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

  /**
   * CREATE SYSTEM MESSAGE
   */
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

  /**
   * VALIDATE BID AMOUNT
   */
  validateBidAmount: (bidAmount, currentBid, bidIncrement) => {
    const minValidBid = currentBid + bidIncrement;
    return {
      isValid: bidAmount >= minValidBid,
      minValidBid: minValidBid,
      error: bidAmount < minValidBid ? 
        `Bid must be at least ${minValidBid.toLocaleString()} VND` : null
    };
  },

  /**
   * GET AUCTION STATUS
   */
  getAuctionStatus: (startTime, endTime) => {
    const now = new Date();
    const start = startTime?.toDate?.() || new Date(startTime);
    const end = endTime?.toDate?.() || new Date(endTime);

    if (now < start) return AuctionStatus.UPCOMING;
    if (now > end) return AuctionStatus.ENDED;
    return AuctionStatus.LIVE;
  },

  /**
   * GET TIME UNTIL START
   */
  getTimeUntilStart: (startTime) => {
    const now = new Date();
    const start = startTime?.toDate?.() || new Date(startTime);
    return Math.max(0, start.getTime() - now.getTime());
  },

  /**
   * GET TIME REMAINING
   */
  getTimeRemaining: (endTime) => {
    const now = new Date();
    const end = endTime?.toDate?.() || new Date(endTime);
    return Math.max(0, end.getTime() - now.getTime());
  },

  /**
   * REUSE FUNCTIONS FROM CHAT SERVICE
   */
  
  /**
   * Mark messages as read (reuse from chatService)
   */
  markMessagesAsRead: async (channelId, userId) => {
    try {
      console.log('Marking auction messages as read...');
      
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
        
        // Only mark messages from others as read
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
        console.log(`Marked ${updatePromises.length} auction messages as read`);
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

  /**
   * Get unread messages count (adapted from chatService)
   */
  getUnreadAuctionMessagesCount: async (userId) => {
    try {
      console.log('Counting unread auction messages for user:', userId);
      
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
      
      console.log(`Total unread auction messages: ${totalUnread}`);
      return totalUnread;
      
    } catch (error) {
      console.error('Error counting unread auction messages:', error);
      return 0;
    }
  },

  /**
   * Format time ago (reuse logic from productService)
   */
  getTimeAgo: (timestamp) => {
    // This function would typically be imported from productService
    // For now, implementing basic version
    if (!timestamp) return 'Just now';
    
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

};

export default auctionChatService;