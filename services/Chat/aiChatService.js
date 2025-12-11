import { chatService } from './chatService';

const AI_CHANNEL_PREFIX = 'AI_CHANNEL_';

export const aiChatService = {
  async getOrCreateAIChannel(userId) {
    const aiChannelId = `${AI_CHANNEL_PREFIX}${userId}`;
    
    try {
      const existingChannel = await chatService.getChannelById(aiChannelId);
      
      if (existingChannel.success) {
        return aiChannelId;
      }
      
      const createResult = await chatService.createAIChannel(
        aiChannelId,
        userId
      );
      
      if (createResult.success) {
        await this.sendAIWelcomeMessage(aiChannelId);
        return aiChannelId;
      }
      
      throw new Error('Failed to create AI channel');
      
    } catch (error) {
      throw error;
    }
  },

  async sendAIWelcomeMessage(channelId) {
    const welcomeMessage = `👋 Xin chào! Tôi là trợ lý AI của Circlo. Tôi có thể giúp bạn:
    
✅ Kiểm tra thông tin sản phẩm
💰 Phân tích giá cả hợp lý 
⚠️ Cảnh báo rủi ro khi mua bán
📊 Tư vấn định giá sản phẩm

Hãy chia sẻ sản phẩm bạn muốn tư vấn hoặc đặt câu hỏi!`;
    
    await chatService.sendSystemMessage(channelId, welcomeMessage);
  },

  async sendAIMessage(channelId, content) {
    await chatService.sendSystemMessage(channelId, content);
  },

  async getUserAIChannels(userId) {
    const aiChannelId = `${AI_CHANNEL_PREFIX}${userId}`;
    const result = await chatService.getChannelById(aiChannelId);
    
    if (result.success && result.channel) {
      return {
        success: true,
        channels: [result.channel]
      };
    }
    
    return {
      success: false,
      channels: [],
      error: 'No AI channel found'
    };
  },

  isAIChannel(channelId) {
    return channelId.startsWith(AI_CHANNEL_PREFIX);
  },

  getUserIdFromAIChannel(channelId) {
    if (channelId.startsWith(AI_CHANNEL_PREFIX)) {
      return channelId.replace(AI_CHANNEL_PREFIX, '');
    }
    return null;
  }
};