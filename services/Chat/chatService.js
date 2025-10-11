// services/Chat/chatService.js
import {
  addDoc,
  collection,
  doc,
  getDoc, // THÊM DÒNG NÀY
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

/**
 * SERVICE CHÍNH CHO CHAT (CHỈ TEXT)
 */
export const chatService = {

  /**
   * TẠO PHÒNG CHAT MỚI (hoặc lấy phòng đã tồn tại)
   */
  createOrGetChannel: async (createData) => {
    try {
      console.log('🔍 Tìm phòng chat đã tồn tại...');
      
      // Tìm phòng chat đã tồn tại giữa 2 người
      const channelsRef = collection(db, 'channels');
      const q = query(
        channelsRef,
        where('participants', 'array-contains', createData.participants[0]),
        where('type', '==', ChannelType.DIRECT)
      );
      
      const snapshot = await getDocs(q);
      
      // Kiểm tra xem có phòng chat nào có cả 2 người không
      let existingChannel = null;
      snapshot.forEach(doc => {
        const channelData = doc.data();
        const hasBothParticipants = createData.participants.every(participant => 
          channelData.participants.includes(participant)
        );
        if (hasBothParticipants && channelData.participants.length === 2) {
          existingChannel = { id: doc.id, ...channelData };
        }
      });

      if (existingChannel) {
        console.log('✅ Phòng chat đã tồn tại:', existingChannel.id);
        return {
          success: true,
          channelId: existingChannel.id,
          isNew: false,
          channel: existingChannel
        };
      }

      console.log('🆕 Tạo phòng chat mới...');
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

      console.log('✅ Phòng chat mới tạo:', docRef.id);
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
      console.error('❌ Lỗi tạo phòng chat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * GỬI TIN NHẮN TEXT
   */
  sendTextMessage: async (channelId, senderId, content) => {
    try {
      console.log('📤 Gửi tin nhắn...');
      
      // Thêm tin nhắn vào collection messages
      const messageRef = await addDoc(collection(db, 'messages'), {
        channelId: channelId,
        senderId: senderId,
        content: content,
        type: MessageType.TEXT,
        timestamp: serverTimestamp(),
        readBy: [senderId], // Người gửi đã đọc
        status: MessageStatus.SENT
      });

      // Cập nhật last message trong channel
      const channelRef = doc(db, 'channels', channelId);
      await updateDoc(channelRef, {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Tin nhắn đã gửi:', messageRef.id);
      return {
        success: true,
        messageId: messageRef.id
      };

    } catch (error) {
      console.error('❌ Lỗi gửi tin nhắn:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * LẤY DANH SÁCH PHÒNG CHAT CỦA USER
   */
  getUserChannels: async (userId) => {
    try {
      console.log('📂 Lấy danh sách phòng chat của user:', userId);
      
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

      console.log(`✅ Tìm thấy ${channels.length} phòng chat`);
      return {
        success: true,
        channels: channels
      };

    } catch (error) {
      console.error('❌ Lỗi lấy danh sách phòng chat:', error);
      return {
        success: false,
        error: error.message,
        channels: []
      };
    }
  },

  /**
   * LẤY TIN NHẮN THEO CHANNEL (Realtime)
   */
  getChannelMessages: (channelId, callback) => {
    try {
      console.log('🔄 Lắng nghe tin nhắn từ channel:', channelId);
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('channelId', '==', channelId),
        orderBy('timestamp', 'asc')
      );

      // Realtime listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`📨 Nhận ${messages.length} tin nhắn`);
        callback({
          success: true,
          messages: messages
        });
      }, (error) => {
        console.error('❌ Lỗi lắng nghe tin nhắn:', error);
        callback({
          success: false,
          error: error.message,
          messages: []
        });
      });

      return unsubscribe;

    } catch (error) {
      console.error('❌ Lỗi setup listener:', error);
      callback({
        success: false,
        error: error.message,
        messages: []
      });
      return () => {}; // Return empty function
    }
  },

  /**
   * ĐÁNH DẤU TIN NHẮN ĐÃ ĐỌC 
   */
  markMessagesAsRead: async (channelId, userId) => {
    try {
      console.log('👀 Đánh dấu tin nhắn đã đọc...');
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('channelId', '==', channelId)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      snapshot.forEach(doc => {
        const messageData = doc.data();
        const messageId = doc.id;
        
        if (!messageData.readBy || !messageData.readBy.includes(userId)) {
          const messageRef = doc(db, 'messages', messageId);
          const updatedReadBy = messageData.readBy ? 
            [...messageData.readBy, userId] : [userId];
          
          batch.push(updateDoc(messageRef, {
            readBy: updatedReadBy,
            status: MessageStatus.READ
          }));
        }
      });

      if (batch.length > 0) {
        await Promise.all(batch);
        console.log(`✅ Đã đánh dấu ${batch.length} tin nhắn đã đọc`);
      } else {
        console.log('ℹ️ Không có tin nhắn nào cần đánh dấu đã đọc');
      }
      
      return { success: true };

    } catch (error) {
      console.error('❌ Lỗi đánh dấu tin nhắn đã đọc:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * LẤY THÔNG TIN CHANNEL THEO ID
   */
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

export default chatService;