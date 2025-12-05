import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { uploadChatImage } from '../cloudinaryService';
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
        if (existingChannel.hiddenForUsers && 
            existingChannel.hiddenForUsers.includes(createData.participants[0])) {
          
          const channelRef = doc(db, 'channels', existingChannel.id);
          await updateDoc(channelRef, {
            hiddenForUsers: arrayRemove(createData.participants[0])
          });
        
          existingChannel.hiddenForUsers = existingChannel.hiddenForUsers.filter(
            uid => uid !== createData.participants[0]
          );
        }

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
        updatedAt: serverTimestamp(),
        hiddenForUsers: []
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

  editMessage: async (messageId, newContent) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
      });

      const messageDoc = await getDoc(messageRef);
      const messageData = messageDoc.data();
      
      if (messageData) {
        const channelRef = doc(db, 'channels', messageData.channelId);
        await updateDoc(channelRef, {
          lastMessage: newContent,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Error editing message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      const messageData = messageDoc.data();
      
      await deleteDoc(messageRef);

      if (messageData) {
        const channelRef = doc(db, 'channels', messageData.channelId);
        
        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('channelId', '==', messageData.channelId),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        let lastMessage = '';
        
        if (!snapshot.empty) {
          const lastMessageData = snapshot.docs[0].data();
          lastMessage = lastMessageData.type === MessageType.IMAGE 
            ? (lastMessageData.caption || '📷 Sent an image') 
            : lastMessageData.content;
        }

        await updateDoc(channelRef, {
          lastMessage: lastMessage,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  sendImageMessage: async (channelId, senderId, imageUrl, caption = '') => {
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        channelId: channelId,
        senderId: senderId,
        imageUrl: imageUrl,
        caption: caption,
        type: MessageType.IMAGE,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        status: MessageStatus.SENT
      });

      const channelRef = doc(db, 'channels', channelId);
      await updateDoc(channelRef, {
        lastMessage: caption || '📷 Sent an image',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        messageId: messageRef.id
      };

    } catch (error) {
      console.error('Error sending image message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  uploadImage: async (imageUri, channelId) => {
    try {
      const uploadResult = await uploadChatImage(imageUri, channelId);
      
      if (uploadResult.success && uploadResult.url) {
        return {
          success: true,
          url: uploadResult.url
        };
      } else {
        return {
          success: false,
          error: uploadResult.error || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  sendSystemMessage: async (channelId, content) => {
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        channelId: channelId,
        senderId: 'system',
        content: content,
        type: MessageType.SYSTEM,
        timestamp: serverTimestamp(),
        readBy: [],
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
      console.error('Error sending system message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  exitChat: async (channelId, userId) => {
    try {
      const channelRef = doc(db, 'channels', channelId);
      
      await updateDoc(channelRef, {
        hiddenForUsers: arrayUnion(userId)
      });

      return {
        success: true
      };

    } catch (error) {
      console.error('Error exiting chat:', error);
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
        const channelData = doc.data();
        if (!channelData.hiddenForUsers || !channelData.hiddenForUsers.includes(userId)) {
          channels.push({
            id: doc.id,
            ...channelData
          });
        }
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
          const channelData = doc.data();
          if (!channelData.hiddenForUsers || !channelData.hiddenForUsers.includes(userId)) {
            channels.push({
              id: doc.id,
              ...channelData
            });
          }
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
          if (channel.hiddenForUsers && channel.hiddenForUsers.includes(userId)) {
            continue;
          }
          
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