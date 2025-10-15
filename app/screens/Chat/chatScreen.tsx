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

const { height } = Dimensions.get('window');

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

  // Set status bar for chat screen
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#01332fff');

    return () => {
      // Cleanup when component unmounts
    };
  }, []);

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
      console.error('Error marking messages as read:', error);
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
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    try {
      return getTimeAgo(timestamp);
    } catch (error) {
      return 'Just now';
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
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#01332fff" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!channelId || !currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Failed to load messages</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
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

        {/* Chat Content */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Product Header */}
          {productData && (
            <ProductHeader 
              product={productData}
              onPress={handleProductPress}
              showHideButton={true}
            />
          )}
          
          {/* Messages Area */}
          <View style={[
            styles.chatContent,
            productData && styles.chatContentWithProduct
          ]}>
            {messagesLoading ? (
              <View style={styles.messagesLoadingContainer}>
                <ActivityIndicator size="small" color="#01332fff" />
                <Text style={styles.messagesLoadingText}>Loading messages...</Text>
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
                    <Text style={styles.emptyText}>No messages yet</Text>
                    <Text style={styles.emptySubText}>Start a conversation!</Text>
                  </View>
                }
              />
            )}

            {/* Input Area */}
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
                  placeholder="Type a message..."
                  placeholderTextColor="#6B7280"
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
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  chatContentWithProduct: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: "#01332fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '600',
  },
  messagesLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
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
  inputContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputContainerWithKeyboard: {
    paddingBottom: 40,
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
});

export default ChatScreen;