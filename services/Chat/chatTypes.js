export const ChannelType = {
  DIRECT: 'direct',          
  GROUP: 'group',           
  AUCTION: 'auction'         
};


export const MessageType = {
  TEXT: 'text',              
  BID: 'bid',               
  SYSTEM: 'system'            
};


export const MessageStatus = {
  SENT: 'sent',               
  DELIVERED: 'delivered',     
  READ: 'read'               
};


export const AuctionStatus = {
  UPCOMING: 'upcoming',      
  LIVE: 'live',               
  ENDED: 'ended',           
  CANCELLED: 'cancelled'      
};


export const SystemMessageType = {
  HIGHEST_BIDDER: 'highest_bidder',
  TIME_WARNING: 'time_warning',
  AUCTION_STARTED: 'auction_started',
  AUCTION_ENDED: 'auction_ended',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left'
};


export class AuctionOrderResult {
  constructor(
    success = false,
    orderId = '',
    message = '',
    error = ''
  ) {
    this.success = success;
    this.orderId = orderId;
    this.message = message;
    this.error = error;
  }
}


export class ChatChannel {
  constructor(
    id = '',
    participants = [],          
    participantDetails = {},     
    type = ChannelType.DIRECT,  
    lastMessage = '',            
    lastMessageAt = null,        
    productId = '',             
    createdAt = null,         
    updatedAt = null          
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

export class AuctionChannel {
  constructor(
    id = '',
    auctionId = '',              
    participants = [],           
    watchers = [],              
    productInfo = null,          
    type = ChannelType.AUCTION,  
    currentBid = 0,              
    bidCount = 0,                
    highestBidder = '',          
    participantCount = 0,       
    isActive = true,             
    createdBy = '',              
    lastBidAt = null,           
    createdAt = null,           
    updatedAt = null            
  ) {
    this.id = id;
    this.auctionId = auctionId;
    this.participants = participants;
    this.watchers = watchers;
    this.productInfo = productInfo;
    this.type = type;
    this.currentBid = currentBid;
    this.bidCount = bidCount;
    this.highestBidder = highestBidder;
    this.participantCount = participantCount;
    this.isActive = isActive;
    this.createdBy = createdBy;
    this.lastBidAt = lastBidAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export class ChatMessage {
  constructor(
    id = '',
    channelId = '',             
    senderId = '',               
    content = '',              
    type = MessageType.TEXT,     
    timestamp = null,           
    readBy = [],                 
    status = MessageStatus.SENT 
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


export class BidMessage {
  constructor(
    id = '',
    channelId = '',            
    senderId = '',             
    bidAmount = 0,              
    previousBid = 0,             
    type = MessageType.BID,      
    timestamp = null,            
    readBy = [],                
    status = MessageStatus.SENT,
    senderName = ''
  ) {
    this.id = id;
    this.channelId = channelId;
    this.senderId = senderId;
    this.bidAmount = bidAmount;
    this.previousBid = previousBid;
    this.type = type;
    this.timestamp = timestamp;
    this.readBy = readBy;
    this.status = status;
    this.senderName = senderName;
  }
}


export class SystemMessage {
  constructor(
    id = '',
    channelId = '',            
    systemType = '',            
    content = '',               
    relatedData = {},            
    type = MessageType.SYSTEM, 
    timestamp = null,            
    readBy = []                  
  ) {
    this.id = id;
    this.channelId = channelId;
    this.systemType = systemType;
    this.content = content;
    this.relatedData = relatedData;
    this.type = type;
    this.timestamp = timestamp;
    this.readBy = readBy;
  }
}


export class CreateChannelData {
  constructor(
    participants = [],          
    participantDetails = {},    
    productId = '',             
    type = ChannelType.DIRECT  
  ) {
    this.participants = participants;
    this.participantDetails = participantDetails;
    this.productId = productId;
    this.type = type;
  }
}

export class CreateAuctionChannelData {
  constructor(
    auctionId = '',              
    productInfo = null,         
    createdBy = '',            
    participants = [],          
    startPrice = 0,             
    bidIncrement = 0,           
    startTime = null,           
    endTime = null              
  ) {
    this.auctionId = auctionId;
    this.productInfo = productInfo;
    this.createdBy = createdBy;
    this.participants = participants;
    this.startPrice = startPrice;
    this.bidIncrement = bidIncrement;
    this.startTime = startTime;
    this.endTime = endTime;
  }
}


export class PlaceBidData {
  constructor(
    channelId = '',           
    userId = '',               
    bidAmount = 0,              
    currentBid = 0,              
    bidIncrement = 0            
  ) {
    this.channelId = channelId;
    this.userId = userId;
    this.bidAmount = bidAmount;
    this.currentBid = currentBid;
    this.bidIncrement = bidIncrement;
  }
}


export default {
  ChannelType,
  MessageType,
  MessageStatus,
  AuctionStatus,
  SystemMessageType,
  AuctionOrderResult,
  ChatChannel,
  AuctionChannel,
  ChatMessage,
  BidMessage,
  SystemMessage,
  CreateChannelData,
  CreateAuctionChannelData,
  PlaceBidData
};