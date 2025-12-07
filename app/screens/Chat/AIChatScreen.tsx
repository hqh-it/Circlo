import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '../../../services/Auth/AuthContext';
import { geminiService } from '../../../services/GeminiService';
import { loadUserData } from '../../../services/User/userService';
import ProductHeader from '../../components/ProductHeader';

const { height, width } = Dimensions.get('window');

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
  description?: string;
  category?: string;
  condition?: string;
}

interface SelectedImage {
  uri: string;
  name?: string;
  type?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'analysis' | 'warning' | 'suggestion';
  imageUrl?: string;
  caption?: string;
  isExpanded?: boolean;
}

const AIChatScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const params = useLocalSearchParams();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Hello! I am AI assistant of Circlo. You can ask me about products in Vietnamese or English.',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text',
      isExpanded: true
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string>('');
  const [currentUserData, setCurrentUserData] = useState<{
    uid: string;
    fullName: string;
    avatarURL?: string;
  } | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set(['1']));
  
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#01332fff');

    return () => {};
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!currentUser) return;
      
      try {
        const userData = await loadUserData(currentUser);
        if (userData) {
          setCurrentUserData({
            uid: currentUser.uid,
            fullName: userData.fullName || 'You',
            avatarURL: userData.avatarURL
          });
        } else {
          setCurrentUserData({
            uid: currentUser.uid,
            fullName: 'You',
            avatarURL: undefined
          });
        }
      } catch (error) {
        setCurrentUserData({
          uid: currentUser.uid,
          fullName: 'You',
          avatarURL: undefined
        });
      }
    };

    loadCurrentUser();
  }, [currentUser]);

  useEffect(() => {
    if (params.productData) {
      try {
        const product = JSON.parse(params.productData as string);
        setProductData(product);
        
        if (product) {
          setTimeout(() => {
            analyzeProduct(product);
          }, 1000);
        }
      } catch (error) {
      }
    }
  }, [params.productData]);

  useEffect(() => {
    const keyboardDidShow = () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        if (flatListRef.current && messages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    };

    const keyboardDidHide = () => {
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', keyboardDidShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', keyboardDidHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [messages.length]);

  const analyzeProduct = async (product: ProductInfo) => {
    if (!currentUser || aiThinking) return;
    
    setAiThinking(true);
    
    try {
      const thinkingMessage: Message = {
        id: generateUniqueId(),
        text: '🔍 Analyzing product...',
        sender: 'ai',
        timestamp: new Date(),
        type: 'analysis'
      };
      setMessages(prev => [...prev, thinkingMessage]);
      
      const analysis = await geminiService.analyzeProductForChat(product);
      
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== thinkingMessage.id);
        return [...filtered, {
          id: generateUniqueId(),
          text: analysis,
          sender: 'ai',
          timestamp: new Date(),
          type: 'analysis',
          isExpanded: false
        }];
      });
      
      setExpandedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(generateUniqueId());
        return newSet;
      });
      
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: 'Error analyzing product. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'warning'
      }]);
    } finally {
      setAiThinking(false);
    }
  };

  const pickImages = async () => {
    if (!currentUser) return;

    try {
      const maxSelection = 3;
      const availableSlots = maxSelection - selectedImages.length;
      
      if (availableSlots <= 0) {
        Alert.alert('Limit reached', `You can only select up to ${maxSelection} images at a time`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: availableSlots,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        const newSelectedImages = result.assets.slice(0, availableSlots).map(asset => ({
          uri: asset.uri,
          name: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          type: 'image/jpeg'
        }));
        
        setSelectedImages(prev => [...prev, ...newSelectedImages]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const openImageViewer = (imageUrl: string) => {
    setViewingImage(imageUrl);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setViewingImage('');
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || !currentUser || sending || aiThinking) return;

    const userMessage = inputText.trim();
    setSending(true);
    setUploadingImages(selectedImages.length > 0);
    
    const tempInputText = inputText;
    setInputText('');
    
    try {
      if (selectedImages.length > 0) {
        // Chỉ gửi một tin nhắn ảnh với caption, không gửi thêm tin nhắn text riêng
        const imageMsg: Message = {
          id: generateUniqueId(),
          text: userMessage || '📷 Image',
          sender: 'user',
          timestamp: new Date(),
          imageUrl: selectedImages[0].uri, // Chỉ lấy ảnh đầu tiên nếu có nhiều ảnh
          caption: userMessage || '📷 Image'
        };
        setMessages(prev => [...prev, imageMsg]);
        
        setSelectedImages([]);
      } else {
        // Gửi tin nhắn văn bản thông thường
        const userMsg: Message = {
          id: generateUniqueId(),
          text: userMessage,
          sender: 'user',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
      }
      
      setAiThinking(true);
      
      let aiResponse = '';
      
      if (selectedImages.length > 0) {
        try {
          // Chuyển ảnh sang base64
          const base64Images = await Promise.all(
            selectedImages.slice(0, 3).map(img => geminiService.base64FromURI(img.uri))
          );
          
          // Phân tích ảnh với caption hoặc câu hỏi từ người dùng
          aiResponse = await geminiService.analyzeImagesWithQuery(
            base64Images,
            tempInputText || 'Hãy phân tích sản phẩm trong ảnh này'
          );
        } catch (imageError) {
          aiResponse = 'Tôi đã nhận được ảnh của bạn. Bạn có thể hỏi cụ thể về sản phẩm trong ảnh?';
        }
      } else {
        const recentMessages = messages
          .filter(msg => msg.id !== '1')
          .slice(-3);
        
        if (geminiService.isOutOfScope(userMessage)) {
          aiResponse = geminiService.getOutOfScopeResponse();
        } else if (productData) {
          aiResponse = await geminiService.chatWithProductContext(userMessage, productData);
        } else if (recentMessages.length > 0) {
          aiResponse = await geminiService.handleConversation(recentMessages, userMessage);
        } else {
          aiResponse = await geminiService.chat(userMessage);
        }
      }
      
      const aiMsg: Message = {
        id: generateUniqueId(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        isExpanded: false
      };
      setMessages(prev => [...prev, aiMsg]);
      
      setExpandedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(aiMsg.id);
        return newSet;
      });
      
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: 'Error getting response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'warning'
      }]);
    } finally {
      setSending(false);
      setAiThinking(false);
      setUploadingImages(false);
      setSelectedImages([]);
    }
  };

  const handleFocus = () => {
    setTimeout(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isAI = item.sender === 'ai';
    const isImageMessage = !!item.imageUrl;
    const isExpanded = expandedMessages.has(item.id);
    const isLongMessage = item.text.length > 200;
    
    const showAvatar = index === 0 || 
      messages[index - 1]?.sender !== item.sender ||
      new Date(item.timestamp).getTime() - 
      new Date(messages[index - 1]?.timestamp).getTime() > 300000;

    const showTime = index === messages.length - 1 || 
      messages[index + 1]?.sender !== item.sender ||
      new Date(messages[index + 1]?.timestamp).getTime() - 
      new Date(item.timestamp).getTime() > 300000;

    if (isAI) {
      const displayText = isLongMessage && !isExpanded 
        ? item.text.substring(0, 200) + '...' 
        : item.text;

      return (
        <View style={styles.otherMessageContainer}>
          <View style={styles.otherMessageWrapper}>
            {showAvatar && (
              <Image 
                source={require('../../assets/icons/AI.gif')}
                style={styles.avatar} 
              />
            )}
            {!showAvatar && <View style={styles.avatarSpacer} />}
            
            <View style={styles.otherMessageContent}>
              {showAvatar && (
                <Text style={styles.senderName}>
                  AI Assistant
                </Text>
              )}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => isLongMessage && toggleMessageExpansion(item.id)}
              >
                <View style={[
                  styles.otherBubble,
                  item.type === 'analysis' && styles.analysisBubble,
                  item.type === 'warning' && styles.warningBubble,
                  item.type === 'suggestion' && styles.suggestionBubble
                ]}>
                  <Text style={styles.otherMessageText}>
                    {displayText}
                  </Text>
                  
                  {isLongMessage && (
                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={() => toggleMessageExpansion(item.id)}
                    >
                      <Text style={styles.expandButtonText}>
                        {isExpanded ? '▲ Show Less' : '▼ Show More'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              {showTime && (
                <Text style={styles.otherMessageTime}>
                  {formatMessageTime(item.timestamp)}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    if (isImageMessage) {
      return (
        <View style={styles.myMessageContainer}>
          <View style={styles.myMessageWrapper}>
            <View style={styles.myMessageContent}>
              <TouchableOpacity 
                style={[styles.imageBubble, styles.myImageBubble]}
                onPress={() => openImageViewer(item.imageUrl!)}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {item.caption && item.caption !== '📷 Image' && (
                  <Text style={[styles.imageCaption, styles.myImageCaption]}>
                    {item.caption}
                  </Text>
                )}
              </TouchableOpacity>
              {showTime && (
                <Text style={styles.myMessageTime}>
                  {formatMessageTime(item.timestamp)}
                </Text>
              )}
            </View>
            {showAvatar && currentUserData && (
              <Image 
                source={
                  currentUserData.avatarURL 
                    ? { uri: currentUserData.avatarURL }
                    : require('../../assets/icons/profile-picture.png')
                } 
                style={styles.avatar} 
              />
            )}
            {!showAvatar && <View style={styles.avatarSpacer} />}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.myMessageContainer}>
        <View style={styles.myMessageWrapper}>
          <View style={styles.myMessageContent}>
            <View style={styles.myBubble}>
              <Text style={styles.myMessageText}>
                {item.text}
              </Text>
            </View>
            {showTime && (
              <Text style={styles.myMessageTime}>
                {formatMessageTime(item.timestamp)}
              </Text>
            )}
          </View>
          {showAvatar && currentUserData && (
            <Image 
              source={
                currentUserData.avatarURL 
                  ? { uri: currentUserData.avatarURL }
                  : require('../../assets/icons/profile-picture.png')
              } 
              style={styles.avatar} 
            />
          )}
          {!showAvatar && <View style={styles.avatarSpacer} />}
        </View>
      </View>
    );
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const ImageViewerModal = () => (
    <Modal
      visible={imageViewerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeImageViewer}
    >
      <View style={styles.imageViewerOverlay}>
        <TouchableOpacity 
          style={styles.imageViewerCloseButton}
          onPress={closeImageViewer}
        >
          <Text style={styles.imageViewerCloseText}>✕</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: viewingImage }} 
          style={styles.imageViewerImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );

  const quickActions = [
    { id: 1, text: '💰 Price check', emoji: '💸' },
    { id: 2, text: '✅ Authenticity', emoji: '🔍' },
    { id: 3, text: '⚠️ Risk check', emoji: '🚨' },
    { id: 4, text: '📊 Value estimate', emoji: '📈' },
  ];

  const handleQuickAction = (action: string) => {
    if (productData) {
      setInputText(`${action}: ${productData.title}`);
    } else {
      setInputText(action);
    }
  };

  const handleBackPress = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      router.back();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ImageViewerModal />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Image 
            source={require('../../assets/icons/AI.gif')}
            style={styles.headerAvatar} 
          />
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              AI Assistant
            </Text>
            <Text style={styles.headerStatus}>
              {aiThinking ? 'Thinking...' : 'Online'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {productData && (
            <ProductHeader 
              product={productData}
              showHideButton={false}
            />
          )}

          {productData && !aiThinking && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsContainer}
            >
              {quickActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction(action.text)}
                >
                  <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                  <Text style={styles.quickActionText}>{action.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          <View style={[
            styles.chatContent,
            productData && styles.chatContentWithProduct
          ]}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }
              }}
              onLayout={() => {
                if (messages.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubText}>Start a conversation!</Text>
                </View>
              }
            />

            {aiThinking && (
              <View style={styles.thinkingContainer}>
                <View style={styles.thinkingBubble}>
                  <ActivityIndicator size="small" color="#666" />
                  <Text style={styles.thinkingText}>AI is thinking...</Text>
                </View>
              </View>
            )}

            {selectedImages.length > 0 && (
              <View style={styles.imagesPreviewContainer}>
                <Text style={styles.previewTitle}>
                  Selected Images ({selectedImages.length}/3)
                </Text>
                <ScrollView 
                  horizontal 
                  style={styles.imagesPreviewScroll}
                  showsHorizontalScrollIndicator={false}
                >
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removePreviewButton}
                        onPress={() => removeSelectedImage(index)}
                      >
                        <Text style={styles.removePreviewText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={[
              styles.inputContainer,
              isKeyboardVisible && styles.inputContainerWithKeyboard
            ]}>
              <View style={styles.inputWrapper}>
                <TouchableOpacity 
                  style={[
                    styles.attachButton,
                    selectedImages.length >= 3 && styles.attachButtonDisabled
                  ]}
                  onPress={pickImages}
                  disabled={sending || aiThinking || selectedImages.length >= 3}
                >
                  <Text style={[
                    styles.attachButtonText,
                    selectedImages.length >= 3 && styles.attachButtonTextDisabled
                  ]}>📷</Text>
                </TouchableOpacity>
                
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    selectedImages.length > 0 ? "Add caption or ask about images..." : 
                    "Ask in Vietnamese or English..."
                  }
                  placeholderTextColor="#6B7280"
                  multiline
                  maxLength={500}
                  editable={!aiThinking}
                  onFocus={handleFocus}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    (!inputText.trim() && selectedImages.length === 0) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={(!inputText.trim() && selectedImages.length === 0) || sending || aiThinking}
                >
                  {sending || uploadingImages ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendButtonText}>➤</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#01332fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    height: height * 0.07,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: "#01332fff",
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: '300',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: "#FFFFFF",
  },
  headerStatus: {
    fontSize: 14,
    color: "#FFD700",
    marginTop: 2,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  quickActionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  chatContent: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  chatContentWithProduct: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  thinkingContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  thinkingBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  imagesPreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
    fontWeight: '600',
  },
  imagesPreviewScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
    marginTop: 4,
  },
  imagePreview: {
    width: 85,
    height: 85,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#01332fff",
    backgroundColor: '#FFFFFF',
  },
  removePreviewButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  removePreviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  otherMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 8,
    marginRight: 60,
  },
  myMessageWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginLeft: 60,
    marginRight: 8,
  },
  otherMessageContent: {
    flex: 1,
    marginLeft: 8,
  },
  myMessageContent: {
    flex: 1,
    marginRight: 8,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  avatarSpacer: {
    width: 36,
    height: 36,
  },
  senderName: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  analysisBubble: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  warningBubble: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  suggestionBubble: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  myBubble: {
    backgroundColor: "#01332fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  myMessageText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  myMessageTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: 'right',
  },
  otherMessageTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: 'left',
  },
  imageBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: 250,
  },
  myImageBubble: {
    backgroundColor: '#01332fff',
    borderColor: '#01332fff',
  },
  messageImage: {
    width: 250,
    height: 200,
  },
  imageCaption: {
    padding: 8,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  myImageCaption: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(1, 51, 47, 0.9)',
  },
  inputContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputContainerWithKeyboard: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  attachButtonText: {
    fontSize: 24,
    color: "#01332fff",
  },
  attachButtonTextDisabled: {
    color: "#6B7280",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 100,
    marginRight: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#01332fff",
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: 'center',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageViewerImage: {
    width: width,
    height: height * 0.7,
  },
});

export default AIChatScreen;