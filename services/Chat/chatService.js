import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  ChannelType,
  MessageStatus,
  MessageType
} from './chatTypes';

export const chatService = {

  createOrGetChannel: async (createData) => {
    try {
      const channelsRef = collection(db, 'channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', createData.participants[0]),
        where('type', '==', ChannelType.DIRECT)
      );
      
      const snapshot = await getDocs(q);

      let existingChannel = null;
      snapshot.forEach(doc => {
        const channelData = doc.data();
        
        const hasBothParticipants = createData.participants.every(participant => 
          channelData.participants.includes(participant)
        );
        
        const hasSameProduct = channelData.productId === createData.productId;
        
        if (hasBothParticipants && 
            channelData.participants.length === 2 && 
            hasSameProduct) {
          existingChannel = { id: doc.id, ...channelData };
        }
      });

      if (existingChannel) {
        return {
          success: true,
          channelId: existingChannel.id,
          isNew: false,
          channel: existingChannel
        };
      }

      const docRef = await addDoc(collection(db, 'channels'), {
        participants: createData.participants,
        participantDetails: createData.participantDetails,
        type: createData.type || ChannelType.DIRECT,
        productId: createData.productId || '',
        productInfo: createData.productInfo || null,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        channelId: docRef.id,
        isNew: true,
        channel: {
          id: docRef.id,
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Error creating channel:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  sendTextMessage: async (channelId, senderId, content) => {
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        channelId: channelId,
        senderId: senderId,
        content: content,
        type: MessageType.TEXT,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        status: MessageStatus.SENT
      });

      const channelRef = doc(db, 'channels', channelId);
      await updateDoc(channelRef, {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        messageId: messageRef.id
      };

    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  getUserChannels: async (userId) => {
    try {
      const channelsRef = collection(db, 'channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', userId),
        orderBy('lastMessageAt', 'desc')
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
      console.error('Error getting user channels:', error);
      return {
        success: false,
        error: error.message,
        channels: []
      };
    }
  },

  subscribeToUserChannels(userId, callback) {
    try {
      const channelsRef = collection(db, 'channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', userId),
        orderBy('lastMessageAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const channels = [];
        snapshot.forEach(doc => {
          channels.push({
            id: doc.id,
            ...doc.data()
          });
        });
        callback({
          success: true,
          channels: channels
        });
      }, (error) => {
        console.error('Error in channels subscription:', error);
        callback({
          success: false,
          error: error.message,
          channels: []
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up channels subscription:', error);
      return () => {};
    }
  },

  getChannelMessages: (channelId, callback) => {
    try {
      const messagesRef = collection(db, 'messages');
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
        console.error('Error in messages listener:', error);
        callback({
          success: false,
          error: error.message,
          messages: []
        });
      });

      return unsubscribe;

    } catch (error) {
      console.error('Error setting up messages listener:', error);
      callback({
        success: false,
        error: error.message,
        messages: []
      });
      return () => {};
    }
  },

  markMessagesAsRead: async (channelId, userId) => {
    try {
      const messagesRef = collection(db, 'messages');
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
          
          const messageRef = doc(db, 'messages', messageId);
          const updatedReadBy = messageData.readBy ? 
            [...messageData.readBy, userId] : [userId];
          
          updatePromises.push(
            updateDoc(messageRef, {
              readBy: updatedReadBy,
              status: MessageStatus.READ
            })
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      
      return { success: true };

    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  getUnreadMessagesCount: async (userId) => {
    try {
      const channelsResult = await chatService.getUserChannels(userId);
      let totalUnread = 0;

      for (const channel of channelsResult.channels) {
        const messagesRef = collection(db, 'messages');
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
      console.error('Error getting unread messages count:', error);
      return 0;
    }
  },

  subscribeToUnreadMessagesCount(userId, callback) {
    try {
      const channelsRef = collection(db, 'channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        let totalUnread = 0;
        
        for (const doc of snapshot.docs) {
          const channel = doc.data();
          const messagesRef = collection(db, 'messages');
          const messagesQuery = query(
            messagesRef,
            where('channelId', '==', doc.id),
            orderBy('timestamp', 'desc')
          );
          
          const messagesSnapshot = await getDocs(messagesQuery);
          
          let channelUnread = 0;
          messagesSnapshot.forEach(messageDoc => {
            const messageData = messageDoc.data();
            if (messageData.senderId !== userId && 
                (!messageData.readBy || !messageData.readBy.includes(userId))) {
              channelUnread++;
            }
          });
          
          totalUnread += channelUnread;
        }
        
        callback(totalUnread);
      }, (error) => {
        console.error('Error in unread messages count subscription:', error);
        callback(0);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up unread messages count subscription:', error);
      return () => {};
    }
  },

  getChannelById: async (channelId) => {
    try {
      const channelDoc = await getDoc(doc(db, 'channels', channelId));
      if (channelDoc.exists()) {
        return {
          success: true,
          channel: { id: channelDoc.id, ...channelDoc.data() }
        };
      } else {
        return { success: false, error: 'Channel not found' };
      }
    } catch (error) {
      console.error('Error getting channel:', error);
      return { success: false, error: error.message };
    }
  }
  
};