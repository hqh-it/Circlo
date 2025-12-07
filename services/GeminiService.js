// services/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.apiKey = 'AIzaSyBT0gtRotKcdsFsvawRlAtQAyvq7wPoizI';
    this.modelName = 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
    
    this.conversationHistory = new Map();
  }

  // =========== CÁC PHƯƠNG THỨC CẦN THIẾT ===========

  // 1. Phương thức chat chính (không tham số userId)
  async chat(message) {
    try {
      console.log(`💬 Chat: ${message.substring(0, 50)}...`);
      
      if (this.isOutOfScope(message)) {
        return this.getOutOfScopeResponse();
      }
      
      const prompt = `Bạn là AI assistant của Circlo - ứng dụng mua bán.
      
Câu hỏi: "${message}"

Trả lời bằng ${this.isVietnamese(message) ? 'tiếng Việt' : 'tiếng Anh'}. Tư vấn về mọi sản phẩm, cả mới lẫn cũ.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text || "Xin lỗi, tôi không có câu trả lời.";
      
    } catch (error) {
      console.error('❌ Lỗi Gemini:', error.message);
      return this.getErrorMessage();
    }
  }

  // 2. Phương thức chat với product context
  async chatWithProductContext(userMessage, product) {
    const prompt = `Người dùng đang xem sản phẩm trên Circlo:

SẢN PHẨM:
- Tên: ${product.title}
- Giá: ${product.price ? product.price.toLocaleString() + ' VND' : 'Không có giá'}
- Danh mục: ${product.category || 'Không rõ'}
- Tình trạng: ${product.condition || 'Không rõ'}

CÂU HỎI: "${userMessage}"

Hãy tư vấn cụ thể về sản phẩm này:`;

    return await this.chat(prompt);
  }

  // 3. Phương thức handle conversation (cần cho AIChatScreen)
  async handleConversation(messages, newMessage) {
    try {
      // Xây dựng context từ tin nhắn cũ
      let context = '';
      messages.forEach(msg => {
        const role = msg.sender === 'user' ? 'Người dùng' : 'AI';
        context += `${role}: ${msg.text}\n`;
      });
      
      const prompt = `Cuộc trò chuyện trước đó:

${context}

Người dùng: ${newMessage}

Hãy trả lời câu hỏi cuối cùng, giữ context của cuộc trò chuyện.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text || "Xin lỗi, tôi không hiểu câu hỏi.";
      
    } catch (error) {
      console.error('Lỗi conversation:', error);
      return this.getErrorMessage();
    }
  }

  // 4. Phân tích sản phẩm
  async analyzeProductForChat(product) {
    const prompt = `Phân tích sản phẩm này trên Circlo:

Tên: ${product.title || 'Không có tên'}
Giá: ${product.price ? product.price.toLocaleString() + ' VND' : 'Chưa có giá'}
Mô tả: ${product.description || 'Không có mô tả'}
Danh mục: ${product.category || 'Không rõ'}
Tình trạng: ${product.condition || 'Không rõ'}

Hãy đánh giá và đưa ra lời khuyên cho người mua:`;

    return await this.chat(prompt);
  }

  // 5. Phân tích ảnh
  async analyzeImagesWithQuery(imagesBase64, userQuery) {
    try {
      const imageParts = imagesBase64.map(base64 => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64
        }
      }));

      const prompt = `Phân tích ${imagesBase64.length} ảnh và trả lời: "${userQuery}"

Hãy mô tả sản phẩm trong ảnh và đưa ra lời khuyên về mua bán:`;

      const result = await this.model.generateContent([
        { text: prompt },
        ...imageParts
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      return text || "Không thể phân tích ảnh.";
      
    } catch (error) {
      console.error('Lỗi phân tích ảnh:', error);
      return "Lỗi phân tích ảnh.";
    }
  }

  // 6. Phân tích giá
  async analyzePrice(product) {
    const prompt = `Phân tích giá cho: ${product.title}
Giá: ${product.price ? product.price.toLocaleString() + ' VND' : '???'}
Tình trạng: ${product.condition || 'Không rõ'}

Đánh giá giá cả có hợp lý không?`;

    return await this.chat(prompt);
  }

  // 7. Kiểm tra câu hỏi không phù hợp
  isOutOfScope(message) {
    if (!message) return false;
    
    const lowerMsg = message.toLowerCase();
    const blocked = [
      'chính trị', 'tôn giáo', 'y tế', 'pháp luật',
      'ma túy', 'khiêu dâm', 'bạo lực',
      'politics', 'religion', 'medical', 'legal',
      'drugs', 'porn', 'violence'
    ];
    
    return blocked.some(topic => lowerMsg.includes(topic));
  }

  // 8. Kiểm tra ngôn ngữ
  isVietnamese(text) {
    if (!text) return true;
    
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnameseChars.test(text)) return true;
    
    const lowerText = text.toLowerCase();
    const viWords = ['không', 'có', 'bao nhiêu', 'tôi', 'bạn', 'mua', 'bán'];
    const enWords = ['the', 'and', 'for', 'you', 'how', 'much', 'price'];
    
    let viCount = viWords.filter(word => lowerText.includes(word)).length;
    let enCount = enWords.filter(word => lowerText.includes(word)).length;
    
    return viCount >= enCount;
  }

  // 9. Convert ảnh
  async base64FromURI(uri) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Không thể chuyển đổi ảnh');
    }
  }

  // 10. Thông báo lỗi
  getErrorMessage() {
    return "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.";
  }

  // 11. Trả lời khi ngoài phạm vi
  getOutOfScopeResponse() {
    return "Tôi chỉ có thể tư vấn về mua bán sản phẩm. Bạn có câu hỏi về sản phẩm nào không?";
  }
}

export const geminiService = new GeminiService();
export default geminiService;