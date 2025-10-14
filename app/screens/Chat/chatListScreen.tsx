// screens/Chat/chatListScreen.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../services/Auth/AuthContext';
import { chatService } from '../../../services/Chat/chatService';
import { getProductById, getTimeAgo } from '../../../services/Product/productService';
import { loadUserData } from '../../../services/User/userService';
import Header from "../../components/header_for_detail";

interface ParticipantDetails {
  [key: string]: {
    name: string;
    avatar?: string;
  };
}

interface Channel {
  id: string;
  participants: string[];
  participantDetails: ParticipantDetails;
  productId: string;
  lastMessage: string;
  lastMessageAt: any;
  createdAt: any;
  type: string;
}

interface OtherUser {
  uid: string;
  name: string;
  avatar?: string;
}

interface ChannelWithOtherUser extends Channel {
  otherUser: OtherUser;
  productImage?: string;
}

const ChatListScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [channels, setChannels] = useState<ChannelWithOtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load product image for channels
  const loadProductImage = async (productId: string): Promise<string | undefined> => {
    try {
      const result = await getProductById(productId);
      
      // Kiểm tra an toàn với type any
      const product = result.product as any;
      if (result.success && product && Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0]; // Chỉ lấy hình ảnh đầu tiên
      }
      return undefined;
    } catch (error) {
      console.error('Error loading product image:', error);
      return undefined;
    }
  };

  // Load user channels
  const loadChannels = async () => {
    if (!currentUser) return;

    try {
      console.log('📂 Loading user channels...');
      const result = await chatService.getUserChannels(currentUser.uid);
      
      if (result.success && result.channels) {
        console.log(`✅ Found ${result.channels.length} channels`);
        
        // Process channels to add otherUser info and product image
        const processedChannels: ChannelWithOtherUser[] = [];
        
        for (const channel of result.channels) {
          try {
            // Find other user in participants
            const otherUserId = channel.participants.find((id: string) => id !== currentUser.uid);
            
            if (otherUserId) {
              console.log('👤 Loading other user data from userService...');
              const tempUser = { uid: otherUserId };
              const userData = await loadUserData(tempUser);
              
              let otherUserName = 'Unknown User';
              let otherUserAvatar: string | undefined = undefined;

              if (userData) {
                otherUserName = userData.fullName || 
                               userData.displayName || 
                               userData.email?.split('@')[0] || 
                               'Unknown User';
                otherUserAvatar = userData.avatarURL;
              } else {
                const fallbackData = channel.participantDetails?.[otherUserId];
                otherUserName = fallbackData?.name || 'Unknown User';
                otherUserAvatar = fallbackData?.avatar;
              }
              
              // Load product image if productId exists
              let productImage: string | undefined;
              if (channel.productId) {
                productImage = await loadProductImage(channel.productId);
              }
              
              const channelWithOtherUser: ChannelWithOtherUser = {
                ...channel,
                otherUser: {
                  uid: otherUserId,
                  name: otherUserName,
                  avatar: otherUserAvatar
                },
                productImage: productImage
              };
              
              processedChannels.push(channelWithOtherUser);
            }
          } catch (error) {
            console.error('Error processing channel:', error);
          }
        }
        
        // Sort by lastMessageAt (newest first)
        processedChannels.sort((a, b) => {
          const timeA = a.lastMessageAt?.toDate?.() || new Date(0);
          const timeB = b.lastMessageAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        setChannels(processedChannels);
      } else {
        console.error('Failed to load channels:', result.error);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChannels();
  };

  const handleChannelPress = (channel: ChannelWithOtherUser) => {
    router.push({
      pathname: '../../screens/Chat/chatScreen',
      params: {
        channelId: channel.id,
      }
    });
  };

  const renderChannelItem = ({ item }: { item: ChannelWithOtherUser }) => {
    const lastMessageTime = item.lastMessageAt ? getTimeAgo(item.lastMessageAt) : 'No messages';
    const hasUnread = false; 
    
    return (
      <TouchableOpacity 
        style={styles.channelItem}
        onPress={() => handleChannelPress(item)}
      >
        {/* Product Image - Hiển thị như ProductCard */}
        {item.productImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
        )}
        
        {/* Chat Content */}
        <View style={styles.chatContent}>
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            <Image 
              source={
                item.otherUser.avatar 
                  ? { uri: item.otherUser.avatar }
                  : require('../../assets/icons/profile-picture.png')
              } 
              style={styles.avatar} 
            />
            <View style={styles.onlineIndicator} />
          </View>
          
          {/* Channel Info */}
          <View style={styles.channelInfo}>
            <View style={styles.channelHeader}>
              <View style={styles.nameContainer}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.otherUser.name}
                </Text>
                {hasUnread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.timeText}>
                {lastMessageTime}
              </Text>
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={2}>
              {item.lastMessage || 'Start a conversation...'}
            </Text>
          </View>
          
          {/* Message Indicator */}
          {hasUnread && (
            <View style={styles.messageIndicator}>
              <View style={styles.unreadBadge} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image 
        source={require('../../assets/icons/chat-empty.png')} 
        style={styles.emptyImage}
      />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a chat by contacting a seller from a product page!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Header title='Chat'/>
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>
            {channels.length} conversation{channels.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerDecoration} />
      </View>

      {/* Channels List */}
      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00A86B']}
            tintColor="#00A86B"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  headerContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems:"center"
  },
  headerDecoration: {
    height: 4,
    backgroundColor: '#00A86B',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  // Channel Item
  channelItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },

  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 80, 
    backgroundColor: '#f8f8f8',
  },
  chatContent: {
    flexDirection: 'row',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00A86B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
  },
  timeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    fontWeight: '400',
  },
  productTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  productTagText: {
    fontSize: 12,
    color: '#00A86B',
    fontWeight: '600',
  },
  messageIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
});

export default ChatListScreen;