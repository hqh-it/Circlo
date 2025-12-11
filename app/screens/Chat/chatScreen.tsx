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
import { chatService } from '../../../services/Chat/chatService';
import { ChatMessage, MessageType } from '../../../services/Chat/chatTypes';
import { getProductById, getTimeAgo } from '../../../services/Product/productService';
import { loadUserData } from '../../../services/User/userService';
import ProductHeader from '../../components/ProductHeader';

const { height, width } = Dimensions.get('window');

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

interface SelectedImage {
  uri: string;
  name?: string;
  type?: string;
}

const ChatScreen = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const channelId = params.channelId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [loadingOtherUser, setLoadingOtherUser] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string>('');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#01332fff');

    return () => {};
  }, []);

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
    } catch (error) {}
  };

  const handleBackPress = () => {
    markMessagesAsRead();
    Keyboard.dismiss();
    setTimeout(() => {
      router.back();
    }, 100);
  };

  const handleAvatarPress = (userId: string) => {
    router.push({
      pathname: '../../screens/Profile/PublicProfile',
      params: {
        userId: userId
      }
    });
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
      } catch (error) {}
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

  const handleExitChat = async () => {
    if (!channelId || !currentUser) {
      return;
    }

    Alert.alert(
      'Exit Chat',
      'Are you sure you want to exit this chat? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit Chat',
          style: 'destructive',
          onPress: async () => {
            try {
              const exitResult = await chatService.exitChat(channelId, currentUser.uid);
              
              if (exitResult.success) {
                await chatService.sendSystemMessage(
                  channelId,
                  `${currentUserData?.fullName || 'User'} has left the chat`
                );
                router.back();
              } else {
                Alert.alert('Error', 'Failed to exit chat');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to exit chat');
            }
          }
        }
      ]
    );
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
      } catch (error) {}
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
    if ((!newMessage.trim() && selectedImages.length === 0) || !currentUser || !channelId || sending) return;

    setSending(true);
    
    try {
      if (editingMessage) {
        setUploadingImages(true);
        const result = await chatService.editMessage(editingMessage.id, newMessage.trim());
        
        if (result.success) {
          setNewMessage('');
          setEditingMessage(null);
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        } else {
          Alert.alert('Error', result.error || 'Failed to edit message');
        }
        setUploadingImages(false);
      }
      else if (selectedImages.length > 0) {
        setUploadingImages(true);
        const uploadPromises = selectedImages.map(image => 
          chatService.uploadImage(image.uri, channelId)
        );

        const uploadResults = await Promise.all(uploadPromises);
        const successfulUploads = uploadResults.filter(result => result.success);
        
        if (successfulUploads.length > 0) {
          const sendPromises = successfulUploads.map(result => 
            chatService.sendImageMessage(
              channelId,
              currentUser.uid,
              result.url!,
              newMessage.trim()
            )
          );

          const sendResults = await Promise.all(sendPromises);
          const successfulSends = sendResults.filter(result => result.success);
          
          if (successfulSends.length > 0) {
            setNewMessage('');
            setSelectedImages([]);
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          } else {
            Alert.alert('Error', 'Failed to send some images');
          }
        } else {
          Alert.alert('Upload Failed', 'Failed to upload images');
        }
        setUploadingImages(false);
      }
      else {
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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const pickImages = async () => {
    if (!currentUser || !channelId) return;

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

  const showActionMenu = (message: ChatMessage, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedMessage(message);
    setActionMenuPosition({ x: pageX, y: pageY });
    setActionMenuVisible(true);
  };

  const hideActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleEditMessage = () => {
    if (!selectedMessage) return;
    
    if (selectedMessage.type === MessageType.TEXT) {
      setNewMessage(selectedMessage.content);
      setEditingMessage(selectedMessage);
      textInputRef.current?.focus();
    }
    hideActionMenu();
  };

  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: hideActionMenu
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await chatService.deleteMessage(selectedMessage.id);
              
              if (result.success) {
                Alert.alert('Success', 'Message deleted successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete message');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message');
            } finally {
              hideActionMenu();
            }
          }
        }
      ]
    );
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
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
    const isSystemMessage = item.type === 'system';
    const isImageMessage = item.type === 'image';
    
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const showAvatar = index === 0 || 
      messages[index - 1]?.senderId !== item.senderId ||
      new Date(item.timestamp?.toDate?.() || 0).getTime() - 
      new Date(messages[index - 1]?.timestamp?.toDate?.() || 0).getTime() > 300000;

    const showTime = index === messages.length - 1 || 
      messages[index + 1]?.senderId !== item.senderId ||
      new Date(messages[index + 1]?.timestamp?.toDate?.() || 0).getTime() - 
      new Date(item.timestamp?.toDate?.() || 0).getTime() > 300000;

    if (isImageMessage) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          delayLongPress={500}
          onLongPress={(e) => showActionMenu(item, e)}
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
          ]}
        >
          {!isMyMessage && (
            <View style={styles.otherMessageWrapper}>
              {showAvatar && (
                <TouchableOpacity onPress={() => handleAvatarPress(item.senderId)}>
                  <Image 
                    source={
                      otherUser?.avatarURL 
                        ? { uri: otherUser.avatarURL }
                        : require('../../assets/icons/profile-picture.png')
                    } 
                    style={styles.avatar} 
                  />
                </TouchableOpacity>
              )}
              {!showAvatar && <View style={styles.avatarSpacer} />}
              
              <View style={styles.otherMessageContent}>
                {showAvatar && (
                  <Text style={styles.senderName}>
                    {otherUser?.fullName || 'User'}
                  </Text>
                )}
                <TouchableOpacity 
                  style={styles.imageBubble}
                  onPress={() => openImageViewer(item.imageUrl)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                  onLongPress={(e) => {
                    e.stopPropagation();
                    showActionMenu(item, e);
                  }}
                >
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                  {item.caption && (
                    <Text style={styles.imageCaption}>{item.caption}</Text>
                  )}
                </TouchableOpacity>
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
                <TouchableOpacity 
                  style={[styles.imageBubble, styles.myImageBubble]}
                  onPress={() => openImageViewer(item.imageUrl)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                  onLongPress={(e) => {
                    e.stopPropagation();
                    showActionMenu(item, e);
                  }}
                >
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                  {item.caption && (
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
              {showAvatar && (
                <TouchableOpacity onPress={() => currentUser && handleAvatarPress(currentUser.uid)}>
                  <Image 
                    source={
                      currentUserData?.avatarURL 
                        ? { uri: currentUserData.avatarURL }
                        : require('../../assets/icons/profile-picture.png')
                    } 
                    style={styles.avatar} 
                  />
                </TouchableOpacity>
              )}
              {!showAvatar && <View style={styles.avatarSpacer} />}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        delayLongPress={500}
        onLongPress={(e) => showActionMenu(item, e)}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}
      >
        {!isMyMessage && (
          <View style={styles.otherMessageWrapper}>
            {showAvatar && (
              <TouchableOpacity onPress={() => handleAvatarPress(item.senderId)}>
                <Image 
                  source={
                    otherUser?.avatarURL 
                      ? { uri: otherUser.avatarURL }
                      : require('../../assets/icons/profile-picture.png')
                  } 
                  style={styles.avatar} 
                />
              </TouchableOpacity>
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
              <TouchableOpacity onPress={() => currentUser && handleAvatarPress(currentUser.uid)}>
                <Image 
                  source={
                    currentUserData?.avatarURL 
                      ? { uri: currentUserData.avatarURL }
                      : require('../../assets/icons/profile-picture.png')
                  } 
                  style={styles.avatar} 
                />
              </TouchableOpacity>
            )}
            {!showAvatar && <View style={styles.avatarSpacer} />}
          </View>
        )}
      </TouchableOpacity>
    );
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

  const ActionMenuModal = () => (
    <Modal
      visible={actionMenuVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={hideActionMenu}
    >
      <TouchableOpacity 
        style={styles.actionMenuOverlay}
        activeOpacity={1}
        onPress={hideActionMenu}
      >
        <View style={[styles.actionMenuContent, { top: actionMenuPosition.y - 100, left: actionMenuPosition.x - 120 }]}>
          {selectedMessage?.type === MessageType.TEXT && selectedMessage?.senderId === currentUser?.uid && (
            <TouchableOpacity style={styles.actionMenuItem} onPress={handleEditMessage}>
              <Text style={styles.actionMenuText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
          
          {selectedMessage?.senderId === currentUser?.uid && (
            <TouchableOpacity style={styles.actionMenuItem} onPress={handleDeleteMessage}>
              <Text style={[styles.actionMenuText, styles.deleteText]}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        <ImageViewerModal />
        <ActionMenuModal />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => otherUser && handleAvatarPress(otherUser.uid)}>
            <Image 
              source={
                otherUser?.avatarURL 
                  ? { uri: otherUser.avatarURL } 
                  : require('../../assets/icons/profile-picture.png')
              } 
              style={styles.headerAvatar} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUser?.fullName || 'User'}
            </Text>
            <Text style={styles.headerStatus}>
              Online
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={handleExitChat}
          >
            <Image 
              source={require('../../assets/icons/outchat.png')}
              style={styles.exitIcon}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {productData && (
            <ProductHeader 
              product={productData}
              onPress={handleProductPress}
              showHideButton={true}
              productType="regular"
            />
          )}
          
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

            {editingMessage && (
              <View style={styles.editContainer}>
                <View style={styles.editContent}>
                  <Text style={styles.editLabel}>Editing message</Text>
                  <Text style={styles.editText} numberOfLines={2}>
                    {editingMessage.content}
                  </Text>
                </View>
                <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEdit}>
                  <Text style={styles.cancelEditText}>✕</Text>
                </TouchableOpacity>
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
                  disabled={sending || messagesLoading || selectedImages.length >= 3}
                >
                  <Text style={[
                    styles.attachButtonText,
                    selectedImages.length >= 3 && styles.attachButtonTextDisabled
                  ]}>📷</Text>
                </TouchableOpacity>
                
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder={
                    editingMessage ? "Edit your message..." :
                    selectedImages.length > 0 ? "Add a caption..." : 
                    "Type a message..."
                  }
                  placeholderTextColor="#6B7280"
                  multiline
                  maxLength={500}
                  editable={!messagesLoading}
                  onFocus={handleFocus}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() && selectedImages.length === 0) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={(!newMessage.trim() && selectedImages.length === 0) || sending || messagesLoading}
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
  exitButton: {
    padding: 8,
  },
  exitIcon: {
    width: 24,
    height: 24,
    tintColor:"#f8f8f8"
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
  editContainer: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editContent: {
    flex: 1,
  },
  editLabel: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  editText: {
    fontSize: 14,
    color: '#1F2937',
  },
  cancelEditButton: {
    padding: 8,
    marginLeft: 8,
  },
  cancelEditText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
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
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  actionMenuContent: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
  },
  actionMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionMenuText: {
    fontSize: 16,
    color: '#1F2937',
  },
  deleteText: {
    color: '#ff4444',
  },
});

export default ChatScreen;