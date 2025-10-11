// services/Chat/chatTypes.js

/**
 * THÔNG TIN PHÒNG CHAT (CHANNEL)
 */
export const ChannelType = {
  DIRECT: 'direct',           // Chat 1-1 (người bán - người mua)
  GROUP: 'group',             // Chat nhóm (sau này cho đấu giá)
  AUCTION: 'auction'          // Phòng đấu giá (trong tương lai)
};

/**
 * LOẠI TIN NHẮN (CHỈ CÒN TEXT)
 */
export const MessageType = {
  TEXT: 'text'               // Tin nhắn văn bản
};

/**
 * TRẠNG THÁI TIN NHẮN
 */
export const MessageStatus = {
  SENT: 'sent',               // Đã gửi
  DELIVERED: 'delivered',     // Đã giao
  READ: 'read'                // Đã xem
};

/**
 * CẤU TRÚC PHÒNG CHAT
 */
export class ChatChannel {
  constructor(
    id = '',
    participants = [],           // [userId1, userId2]
    participantDetails = {},     // { userId1: {name, avatar}, userId2: {...} }
    type = ChannelType.DIRECT,   // Loại phòng
    lastMessage = '',            // Tin nhắn cuối cùng
    lastMessageAt = null,        // Thời gian tin cuối
    productId = '',              // ID sản phẩm (nếu có)
    createdAt = null,            // Thời gian tạo phòng
    updatedAt = null             // Thời gian cập nhật
  ) {
    this.id = id;
    this.participants = participants;
    this.participantDetails = participantDetails;
    this.type = type;
    this.lastMessage = lastMessage;
    this.lastMessageAt = lastMessageAt;
    this.productId = productId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

/**
 * CẤU TRÚC TIN NHẮN (CHỈ TEXT)
 */
export class ChatMessage {
  constructor(
    id = '',
    channelId = '',              // ID phòng chat
    senderId = '',               // ID người gửi
    content = '',                // Nội dung tin nhắn
    type = MessageType.TEXT,     // Loại tin nhắn (luôn là text)
    timestamp = null,            // Thời gian gửi
    readBy = [],                 // Danh sách user đã đọc [userId1, userId2]
    status = MessageStatus.SENT  // Trạng thái tin nhắn
  ) {
    this.id = id;
    this.channelId = channelId;
    this.senderId = senderId;
    this.content = content;
    this.type = type;
    this.timestamp = timestamp;
    this.readBy = readBy;
    this.status = status;
  }
}

/**
 * DỮ LIỆU TẠO PHÒNG CHAT MỚI
 */
export class CreateChannelData {
  constructor(
    participants = [],           // [userId1, userId2]
    participantDetails = {},     // { userId1: {name, avatar}, userId2: {...} }
    productId = '',              // ID sản phẩm liên quan
    type = ChannelType.DIRECT    // Loại phòng
  ) {
    this.participants = participants;
    this.participantDetails = participantDetails;
    this.productId = productId;
    this.type = type;
  }
}

// Export tất cả
export default {
  ChannelType,
  MessageType,
  MessageStatus,
  ChatChannel,
  ChatMessage,
  CreateChannelData
};