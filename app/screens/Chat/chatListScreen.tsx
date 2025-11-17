import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { auctionChatService } from '../../../services/Chat/auctionChatService';
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
  unreadCount: number;
}

interface AuctionChannel {
  id: string;
  auctionId: string;
  participants: string[];
  productInfo: any;
  type: string;
  currentBid: number;
  bidCount: number;
  highestBidder: string;
  lastBidAt: any;
  createdAt: any;
  isActive: boolean;
  unreadCount: number;
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

interface AuctionChannelWithDetails extends AuctionChannel {
  otherUser?: OtherUser;
  productImage?: string;
  timeRemaining?: string;
  auctionStatus?: string;
}

type TabType = 'regular' | 'auction';

type AnyChannel = ChannelWithOtherUser | AuctionChannelWithDetails;

interface MessagesResult {
  success: boolean;
  messages?: any[];
  error?: string;
}

const ChatListScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [regularChannels, setRegularChannels] = useState<ChannelWithOtherUser[]>([]);
  const [auctionChannels, setAuctionChannels] = useState<AuctionChannelWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('regular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProductImage = async (productId: string): Promise<string | undefined> => {
    try {
      const result = await getProductById(productId);
      const product = result.product as any;
      if (result.success && product && Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0];
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  };

  const loadAuctionProductImage = async (productInfo: any): Promise<string | undefined> => {
    try {
      if (productInfo?.images && Array.isArray(productInfo.images) && productInfo.images.length > 0) {
        return productInfo.images[0];
      }
      
      if (productInfo?.productId) {
        return await loadProductImage(productInfo.productId);
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  };

  const loadChannelUnreadCount = async (channelId: string, userId: string): Promise<number> => {
    try {
      let unreadCount = 0;
      
      const messagesResult: MessagesResult = await new Promise((resolve) => {
        const unsubscribe = chatService.getChannelMessages(channelId, (result: MessagesResult) => {
          resolve(result);
          unsubscribe();
        });
      });
      
      if (messagesResult.success && messagesResult.messages) {
        messagesResult.messages.forEach((message: any) => {
          if (message.senderId !== userId && 
              (!message.readBy || !message.readBy.includes(userId))) {
            unreadCount++;
          }
        });
      }
      
      return unreadCount;
    } catch (error) {
      return 0;
    }
  };

  const loadRegularChannels = async () => {
    if (!currentUser) return [];

    try {
      const result = await chatService.getUserChannels(currentUser.uid);
      
      if (result.success && result.channels) {
        const processedChannels: ChannelWithOtherUser[] = [];
        
        for (const channel of result.channels) {
          try {
            const otherUserId = channel.participants.find((id: string) => id !== currentUser.uid);
            
            if (otherUserId) {
              const tempUser = { uid: otherUserId };
              const userData = await loadUserData(tempUser);
              
              let otherUserName = 'Unknown User';
              let otherUserAvatar: string | undefined = undefined;

              if (userData) {
                otherUserName = userData.fullName || 'Unknown User';
                otherUserAvatar = userData.avatarURL;
              } else {
                const fallbackData = channel.participantDetails?.[otherUserId];
                otherUserName = fallbackData?.name || 'Unknown User';
                otherUserAvatar = fallbackData?.avatar;
              }
              
              let productImage: string | undefined;
              if (channel.productId) {
                productImage = await loadProductImage(channel.productId);
              }
              
              const unreadCount = await loadChannelUnreadCount(channel.id, currentUser.uid);
              
              const channelWithOtherUser: ChannelWithOtherUser = {
                ...channel,
                otherUser: {
                  uid: otherUserId,
                  name: otherUserName,
                  avatar: otherUserAvatar
                },
                productImage: productImage,
                unreadCount: unreadCount
              };
              
              processedChannels.push(channelWithOtherUser);
            }
          } catch (error) {
          }
        }
        
        processedChannels.sort((a, b) => {
          const timeA = a.lastMessageAt?.toDate?.() || new Date(0);
          const timeB = b.lastMessageAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        return processedChannels;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  };

  const loadAuctionChannels = async () => {
    if (!currentUser) return [];

    try {
      const result = await auctionChatService.getUserAuctionChannels(currentUser.uid);
      
      if (result.success && result.channels) {
        const processedChannels: AuctionChannelWithDetails[] = [];
        
        for (const channel of result.channels) {
          try {
            let productImage: string | undefined;
            if (channel.productInfo) {
              productImage = await loadAuctionProductImage(channel.productInfo);
            }
            
            let timeRemaining = '';
            let auctionStatus = 'active';
            
            if (channel.productInfo?.endTime) {
              const endTime = channel.productInfo.endTime.toDate ? 
                channel.productInfo.endTime.toDate() : 
                new Date(channel.productInfo.endTime);
              const now = new Date();
              
              if (now > endTime) {
                auctionStatus = 'ended';
                timeRemaining = 'Auction ended';
              } else {
                const diffMs = endTime.getTime() - now.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                if (diffHours > 0) {
                  timeRemaining = `${diffHours}h ${diffMinutes}m left`;
                } else {
                  timeRemaining = `${diffMinutes}m left`;
                }
              }
            }
            
            const unreadCount = await loadChannelUnreadCount(channel.id, currentUser.uid);
            
            const channelWithDetails: AuctionChannelWithDetails = {
              ...channel,
              productImage: productImage,
              timeRemaining: timeRemaining,
              auctionStatus: auctionStatus,
              unreadCount: unreadCount
            };
            
            processedChannels.push(channelWithDetails);
          } catch (error) {
          }
        }
        
        processedChannels.sort((a, b) => {
          const timeA = a.lastBidAt?.toDate?.() || new Date(0);
          const timeB = b.lastBidAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        return processedChannels;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  };

  const loadAllChannels = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    const [regularChannelsData, auctionChannelsData] = await Promise.all([
      loadRegularChannels(),
      loadAuctionChannels()
    ]);
    
    setRegularChannels(regularChannelsData);
    setAuctionChannels(auctionChannelsData);
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllChannels();
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadAllChannels();
    }, [currentUser])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAllChannels();
  };

  const handleRegularChannelPress = (channel: ChannelWithOtherUser) => {
    router.push({
      pathname: '../../screens/Chat/chatScreen',
      params: {
        channelId: channel.id,
      }
    });
  };

  const handleAuctionChannelPress = (channel: AuctionChannelWithDetails) => {
    router.push({
      pathname: '../../screens/Chat/auctionChatScreen',
      params: {
        channelId: channel.id,
        auctionId: channel.auctionId,
      }
    });
  };

  const isRegularChannel = (channel: AnyChannel): channel is ChannelWithOtherUser => {
    return 'lastMessage' in channel && 'participantDetails' in channel;
  };

  const isAuctionChannel = (channel: AnyChannel): channel is AuctionChannelWithDetails => {
    return 'auctionId' in channel && 'currentBid' in channel;
  };

  const renderChannelItem = ({ item }: { item: AnyChannel }) => {
    if (isRegularChannel(item)) {
      return renderRegularChannelItem({ item });
    } else if (isAuctionChannel(item)) {
      return renderAuctionChannelItem({ item });
    }
    return null;
  };

  const renderRegularChannelItem = ({ item }: { item: ChannelWithOtherUser }) => {
    const lastMessageTime = item.lastMessageAt ? getTimeAgo(item.lastMessageAt) : 'No messages';
    const hasUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={styles.channelItem}
        onPress={() => handleRegularChannelPress(item)}
      >
        {item.productImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
        )}
        
        <View style={styles.chatContent}>
          <View style={styles.avatarContainer}>
            <Image 
              source={
                item.otherUser.avatar 
                  ? { uri: item.otherUser.avatar }
                  : require('../../assets/icons/profile-picture.png')
              } 
              style={styles.avatar} 
            />
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.channelInfo}>
            <View style={styles.channelHeader}>
              <View style={styles.nameContainer}>
                <Text style={[styles.userName, hasUnread && styles.unreadUserName]} numberOfLines={1}>
                  {item.otherUser.name}
                </Text>
              </View>
              <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
                {lastMessageTime}
              </Text>
            </View>
            
            <Text style={[styles.lastMessage, hasUnread && styles.unreadLastMessage]} numberOfLines={2}>
              {item.lastMessage || 'Start a conversation...'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAuctionChannelItem = ({ item }: { item: AuctionChannelWithDetails }) => {
    const lastBidTime = item.lastBidAt ? getTimeAgo(item.lastBidAt) : 'No bids yet';
    const hasUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={[styles.channelItem, styles.auctionChannelItem]}
        onPress={() => handleAuctionChannelPress(item)}
      >
        {item.productImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.auctionBadge}>
              <Text style={styles.auctionBadgeText}>AUCTION</Text>
            </View>
          </View>
        )}
        
        <View style={styles.chatContent}>
          <View style={styles.avatarContainer}>
            <Image 
              source={require('../../assets/icons/auction-hammer.gif')}
              style={styles.auctionIcon} 
            />
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.channelInfo}>
            <View style={styles.channelHeader}>
              <View style={styles.nameContainer}>
                <Text style={[styles.userName, hasUnread && styles.unreadUserName]} numberOfLines={1}>
                  Auction Chat
                </Text>
              </View>
              <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
                {lastBidTime}
              </Text>
            </View>
            
            <Text style={[styles.lastMessage, hasUnread && styles.unreadLastMessage]} numberOfLines={1}>
              Current bid: {item.currentBid?.toLocaleString()} VND
            </Text>
            
            <View style={styles.auctionStats}>
              <Text style={styles.bidCount}>
                {item.bidCount} bids
              </Text>
              {item.timeRemaining && (
                <Text style={[
                  styles.timeRemaining,
                  item.auctionStatus === 'ended' && styles.timeEnded
                ]}>
                  {item.timeRemaining}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: 'regular' | 'auction') => (
    <View style={styles.emptyContainer}>
      <Image 
        source={
          type === 'regular' 
            ? require('../../assets/icons/chat-empty.png')
            : require('../../assets/icons/auction-empty.png')
        } 
        style={styles.emptyImage}
      />
      <Text style={styles.emptyTitle}>
        {type === 'regular' ? 'No conversations yet' : 'No auction chats yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === 'regular' 
          ? 'Start a chat by contacting a seller from a product page!'
          : 'Join an auction to start bidding and chatting!'
        }
      </Text>
    </View>
  );

  const getCurrentChannels = (): AnyChannel[] => {
    return activeTab === 'regular' ? regularChannels : auctionChannels;
  };

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
      <View style={styles.header}>
        <Header title='Chat'/>
        <View style={styles.headerDecoration} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'regular' && styles.activeTab]}
          onPress={() => setActiveTab('regular')}
        >
          <Text style={[styles.tabText, activeTab === 'regular' && styles.activeTabText]}>
            Regular Chats
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'auction' && styles.activeTab]}
          onPress={() => setActiveTab('auction')}
        >
          <Text style={[styles.tabText, activeTab === 'auction' && styles.activeTabText]}>
            Auction Chats
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList<AnyChannel>
        data={getCurrentChannels()}
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
        ListEmptyComponent={() => renderEmptyState(activeTab)}
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
  },
  headerDecoration: {
    height: 4,
    backgroundColor: '#00A86B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00A86B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#00A86B',
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
  },
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
  auctionChannelItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#f8f8f8',
  },
  auctionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  auctionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  },
  auctionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF4E6',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4757',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginRight: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  unreadUserName: {
    color: '#000000',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 14,
    color: '#999',
  },
  unreadTimeText: {
    color: '#00A86B',
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadLastMessage: {
    color: '#000000',
    fontWeight: '500',
  },
  auctionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidCount: {
    fontSize: 14,
    color: '#666',
  },
  timeRemaining: {
    fontSize: 14,
    color: '#00A86B',
    fontWeight: '600',
  },
  timeEnded: {
    color: '#FF4757',
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
  },
});

export default ChatListScreen;