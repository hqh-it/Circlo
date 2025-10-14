import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '../../../services/Auth/AuthContext';
import { chatService } from '../../../services/Chat/chatService';
import { ChatMessage } from '../../../services/Chat/chatTypes';
import { getProductById, getTimeAgo } from '../../../services/Product/productService';
import { loadUserData } from '../../../services/User/userService';
import ProductHeader from '../../components/ProductHeader';
interface User {
  uid: string;
  fullName: string;
  avatarURL?: string;
  email: string;
}

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
}

const COLORS = {
  primary: '#2F4F4F',
  primaryLight: '#3A5F5F',
  accent: '#FFD700',
  accentLight: '#FFF8DC',
  background: '#F8F9FA',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  text: '#1F2937',
  error: '#EF4444',
};

const ChatScreen = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const channelId = params.channelId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [loadingOtherUser, setLoadingOtherUser] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Keyboard listeners
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

  const markMessagesAsRead = async () => {
    if (!channelId || !currentUser) return;
    
    try {
      await chatService.markMessagesAsRead(channelId, currentUser.uid);
    } catch (error) {
      console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error);
    }
  };

  const handleBackPress = () => {
    markMessagesAsRead();
    Keyboard.dismiss();
    setTimeout(() => {
      router.back();
    }, 100);
  };

  const handleFocus = () => {
    setTimeout(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  useEffect(() => {
    if (!channelId) return;

    const loadProductData = async () => {
      try {
        if (params.productData) {
          const dataFromParams = JSON.parse(params.productData as string);
          setProductData(dataFromParams);
          return;
        }

        const channelResult = await chatService.getChannelById(channelId);
        
        if (channelResult.success && channelResult.channel) {
          const channel = channelResult.channel as any;
          
          if (channel.productId) {
            const productResult = await getProductById(channel.productId);
            
            if (productResult.success && productResult.product) {
              const product = productResult.product as any;
              setProductData({
                id: product.id,
                title: product.title,
                price: product.price,
                images: product.images,
                sellerId: product.sellerId
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading product data:', error);
      }
    };

    loadProductData();
  }, [channelId, params.productData]);

  useEffect(() => {
    if (channelId && currentUser && !loadingOtherUser) {
      markMessagesAsRead();
    }
  }, [channelId, currentUser, loadingOtherUser]);

  useEffect(() => {
    if (messages.length > 0 && channelId && currentUser && !loadingOtherUser) {
      markMessagesAsRead();
    }
  }, [messages, channelId, currentUser, loadingOtherUser]);

  useEffect(() => {
    return () => {
      if (channelId && currentUser) {
        markMessagesAsRead();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleProductPress = () => {
    if (productData) {
      router.push({
        pathname: '../../screens/Products/product_detail',
        params: { id: productData.id }
      });
    }
  };

  const loadOtherUserInfo = async () => {
    if (!channelId || !currentUser) return;
    
    try {
      const result = await chatService.getChannelById(channelId);
      
      if (result.success && result.channel) {
        const channelData = result.channel;
        
        const otherUserId = (channelData as any).participants.find(
          (id: string) => id !== currentUser.uid
        );
        
        if (otherUserId) {
          const tempUser = { uid: otherUserId };
          const userData = await loadUserData(tempUser);
          
          if (userData) {
            setOtherUser({
              uid: otherUserId,
              fullName: userData.fullName || 'User',
              avatarURL: userData.avatarURL,
              email: userData.email || ''
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading other user:', error);
    } finally {
      setLoadingOtherUser(false);
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!currentUser) return;
      
      try {
        const userData = await loadUserData(currentUser);
        if (userData) {
          setCurrentUserData({
            uid: currentUser.uid,
            fullName: userData.fullName || 'You',
            avatarURL: userData.avatarURL,
            email: userData.email || currentUser.email || ''
          });
        }
      } catch (error) {
        console.error('Error loading current user data:', error);
      }
    };

    loadCurrentUser();
  }, [currentUser]);

  useEffect(() => {
    if (channelId && currentUser) {
      loadOtherUserInfo();
    }
  }, [channelId, currentUser]);

  useEffect(() => {
    if (!channelId || !currentUser || loadingOtherUser) return;

    let isActive = true;

    const setupMessageListener = async () => {
      setMessagesLoading(true);

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      const unsubscribe = chatService.getChannelMessages(channelId, (result: any) => {
        if (!isActive) return;
        
        if (result.success && result.messages) {
          setMessages(result.messages);
          setMessagesLoading(false);
          
          if (result.messages.length > 0 && channelId && currentUser) {
            markMessagesAsRead();
          }
          
          setTimeout(() => {
            if (flatListRef.current && result.messages.length > 0 && isActive) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }, 200);
        } else {
          setMessagesLoading(false);
        }
      });

      unsubscribeRef.current = unsubscribe;
    };

    setupMessageListener();

    return () => {
      isActive = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channelId, currentUser, loadingOtherUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !channelId || sending) return;

    setSending(true);
    try {
      const result = await chatService.sendTextMessage(
        channelId, 
        currentUser.uid, 
        newMessage.trim()
      );
      
      if (result.success) {
        setNewMessage('');
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return 'Vừa xong';
    
    try {
      return getTimeAgo(timestamp);
    } catch (error) {
      return 'Vừa xong';
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    
    const showAvatar = index === 0 || 
      messages[index - 1]?.senderId !== item.senderId ||
      new Date(item.timestamp?.toDate?.() || 0).getTime() - 
      new Date(messages[index - 1]?.timestamp?.toDate?.() || 0).getTime() > 300000;

    const showTime = index === messages.length - 1 || 
      messages[index + 1]?.senderId !== item.senderId ||
      new Date(messages[index + 1]?.timestamp?.toDate?.() || 0).getTime() - 
      new Date(item.timestamp?.toDate?.() || 0).getTime() > 300000;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && (
          <View style={styles.otherMessageWrapper}>
            {showAvatar && (
              <Image 
                source={
                  otherUser?.avatarURL 
                    ? { uri: otherUser.avatarURL }
                    : require('../../assets/icons/profile-picture.png')
                } 
                style={styles.avatar} 
              />
            )}
            {!showAvatar && <View style={styles.avatarSpacer} />}
            
            <View style={styles.otherMessageContent}>
              {showAvatar && (
                <Text style={styles.senderName}>
                  {otherUser?.fullName || 'User'}
                </Text>
              )}
              <View style={styles.otherBubble}>
                <Text style={styles.otherMessageText}>
                  {item.content}
                </Text>
              </View>
              {showTime && (
                <Text style={styles.otherMessageTime}>
                  {formatMessageTime(item.timestamp)}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {isMyMessage && (
          <View style={styles.myMessageWrapper}>
            <View style={styles.myMessageContent}>
              <View style={styles.myBubble}>
                <Text style={styles.myMessageText}>
                  {item.content}
                </Text>
              </View>
              {showTime && (
                <Text style={styles.myMessageTime}>
                  {formatMessageTime(item.timestamp)}
                </Text>
              )}
            </View>
            {showAvatar && (
              <Image 
                source={
                  currentUserData?.avatarURL 
                    ? { uri: currentUserData.avatarURL }
                    : require('../../assets/icons/profile-picture.png')
                } 
                style={styles.avatar} 
              />
            )}
            {!showAvatar && <View style={styles.avatarSpacer} />}
          </View>
        )}
      </View>
    );
  };

  if (loadingOtherUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!channelId || !currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không thể tải tin nhắn</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Image 
            source={
              otherUser?.avatarURL 
                ? { uri: otherUser.avatarURL } 
                : require('../../assets/icons/profile-picture.png')
            } 
            style={styles.headerAvatar} 
          />
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUser?.fullName || 'User'}
            </Text>
            <Text style={styles.headerStatus}>
              Online
            </Text>
          </View>
          
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>

        {productData && (
          <ProductHeader 
            product={productData}
            onPress={handleProductPress}
            showHideButton={true}
          />
        )}
        
        <View style={[
          styles.chatContainer,
          productData && styles.chatContainerWithProduct
        ]}>
          {messagesLoading ? (
            <View style={styles.messagesLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.messagesLoadingText}>Đang tải tin nhắn...</Text>
            </View>
          ) : (
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
                  <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
                  <Text style={styles.emptySubText}>Hãy bắt đầu cuộc trò chuyện!</Text>
                </View>
              }
            />
          )}

          <View style={[
            styles.inputContainer,
            isKeyboardVisible && styles.inputContainerWithKeyboard
          ]}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={COLORS.gray}
                multiline
                maxLength={500}
                editable={!messagesLoading}
                onFocus={handleFocus}
              />
              
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending || messagesLoading) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending || messagesLoading}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.sendButtonText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLight,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: '300',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerStatus: {
    fontSize: 14,
    color: COLORS.accentLight,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatContainerWithProduct: {
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
  messagesLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
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
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  avatarSpacer: {
    width: 36,
    height: 36,
  },
  senderName: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  otherBubble: {
    backgroundColor: COLORS.white,
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
    borderColor: COLORS.lightGray,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 20,
  },
  myMessageTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'right',
  },
  otherMessageTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'left',
  },
  inputContainer: {
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  inputContainerWithKeyboard: {
    paddingBottom: 40,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.accentLight,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  sendButtonText: {
    color: COLORS.white,
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
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export default ChatScreen;