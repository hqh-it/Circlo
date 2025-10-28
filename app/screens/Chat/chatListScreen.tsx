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

// Union type for both channel types
type AnyChannel = ChannelWithOtherUser | AuctionChannelWithDetails;

const ChatListScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [regularChannels, setRegularChannels] = useState<ChannelWithOtherUser[]>([]);
  const [auctionChannels, setAuctionChannels] = useState<AuctionChannelWithDetails[]>([]);
  const [regularUnreadCount, setRegularUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('regular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load product image for channels
  const loadProductImage = async (productId: string): Promise<string | undefined> => {
    try {
      const result = await getProductById(productId);
      
      const product = result.product as any;
      if (result.success && product && Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0];
      }
      return undefined;
    } catch (error) {
      console.error('Error loading product image:', error);
      return undefined;
    }
  };

  // Load auction product image
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
      console.error('Error loading auction product image:', error);
      return undefined;
    }
  };

  // Load unread messages count for regular chats
  const loadUnreadCounts = async () => {
    if (!currentUser) return;

    try {
      const regularUnread = await chatService.getUnreadMessagesCount(currentUser.uid);
      setRegularUnreadCount(regularUnread);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  // Load regular channels
  const loadRegularChannels = async () => {
    if (!currentUser) return [];

    try {
      console.log('📂 Loading regular channels...');
      const result = await chatService.getUserChannels(currentUser.uid);
      
      if (result.success && result.channels) {
        console.log(`✅ Found ${result.channels.length} regular channels`);
        
        const processedChannels: ChannelWithOtherUser[] = [];
        
        for (const channel of result.channels) {
          try {
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
            console.error('Error processing regular channel:', error);
          }
        }
        
        processedChannels.sort((a, b) => {
          const timeA = a.lastMessageAt?.toDate?.() || new Date(0);
          const timeB = b.lastMessageAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        return processedChannels;
      } else {
        console.error('Failed to load regular channels:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading regular channels:', error);
      return [];
    }
  };

  // Load auction channels
  const loadAuctionChannels = async () => {
    if (!currentUser) return [];

    try {
      console.log('🏷️ Loading auction channels...');
      const result = await auctionChatService.getUserAuctionChannels(currentUser.uid);
      
      if (result.success && result.channels) {
        console.log(`✅ Found ${result.channels.length} auction channels`);
        
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
            
            const channelWithDetails: AuctionChannelWithDetails = {
              ...channel,
              productImage: productImage,
              timeRemaining: timeRemaining,
              auctionStatus: auctionStatus
            };
            
            processedChannels.push(channelWithDetails);
          } catch (error) {
            console.error('Error processing auction channel:', error);
          }
        }
        
        processedChannels.sort((a, b) => {
          const timeA = a.lastBidAt?.toDate?.() || new Date(0);
          const timeB = b.lastBidAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        return processedChannels;
      } else {
        console.error('Failed to load auction channels:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading auction channels:', error);
      return [];
    }
  };

  // Load all channels and unread counts
  const loadAllChannels = async () => {
    setLoading(true);
    
    const [regularChannelsData, auctionChannelsData] = await Promise.all([
      loadRegularChannels(),
      loadAuctionChannels()
    ]);
    
    setRegularChannels(regularChannelsData);
    setAuctionChannels(auctionChannelsData);
    
    // Load unread counts after channels are loaded
    await loadUnreadCounts();
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllChannels();
  }, [currentUser]);

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

  // Type guard to check if channel is regular channel
  const isRegularChannel = (channel: AnyChannel): channel is ChannelWithOtherUser => {
    return 'lastMessage' in channel && 'participantDetails' in channel;
  };

  // Type guard to check if channel is auction channel
  const isAuctionChannel = (channel: AnyChannel): channel is AuctionChannelWithDetails => {
    return 'auctionId' in channel && 'currentBid' in channel;
  };

  // Render channel item with type checking
  const renderChannelItem = ({ item }: { item: AnyChannel }) => {
    if (isRegularChannel(item)) {
      return renderRegularChannelItem({ item });
    } else if (isAuctionChannel(item)) {
      return renderAuctionChannelItem({ item });
    }
    return null;
  };

  // Render regular channel item
  const renderRegularChannelItem = ({ item }: { item: ChannelWithOtherUser }) => {
    const lastMessageTime = item.lastMessageAt ? getTimeAgo(item.lastMessageAt) : 'No messages';
    const hasUnread = false; // You can implement unread logic per channel here
    
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
            <View style={styles.onlineIndicator} />
          </View>
          
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
          
          {hasUnread && (
            <View style={styles.messageIndicator}>
              <View style={styles.unreadBadge} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render auction channel item
  const renderAuctionChannelItem = ({ item }: { item: AuctionChannelWithDetails }) => {
    const lastBidTime = item.lastBidAt ? getTimeAgo(item.lastBidAt) : 'No bids yet';
    
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
          </View>
          
          <View style={styles.channelInfo}>
            <View style={styles.channelHeader}>
              <View style={styles.nameContainer}>
                <Text style={styles.userName} numberOfLines={1}>
                  Auction Chat
                </Text>
                {item.auctionStatus === 'ended' && (
                  <View style={styles.endedBadge}>
                    <Text style={styles.endedBadgeText}>ENDED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timeText}>
                {lastBidTime}
              </Text>
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={1}>
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
      {/* Header */}
      <View style={styles.header}>
        <Header title='Chat'/>
        <View style={styles.headerDecoration} />
      </View>

      {/* Tab Bar - Full width */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'regular' && styles.activeTab]}
          onPress={() => setActiveTab('regular')}
        >
          <Text style={[styles.tabText, activeTab === 'regular' && styles.activeTabText]}>
            Regular Chats
          </Text>
          {/* Only show badge for regular chats with unread messages */}
          {regularUnreadCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{regularUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'auction' && styles.activeTab]}
          onPress={() => setActiveTab('auction')}
        >
          <Text style={[styles.tabText, activeTab === 'auction' && styles.activeTabText]}>
            Auction Chats
          </Text>
          {/* No badge for auction chats */}
        </TouchableOpacity>
      </View>

      {/* Channels List */}
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  // Tab Styles - Full width
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0, // Remove horizontal margin for full width
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00A86B',
    backgroundColor: '#F8F9FA',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#00A86B',
  },
  tabBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  auctionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF4E6',
    borderWidth: 2,
    borderColor: '#FFE8CC',
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
  endedBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  endedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  // Auction specific styles
  auctionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeRemaining: {
    fontSize: 14,
    color: '#00A86B',
    fontWeight: '600',
  },
  timeEnded: {
    color: '#FF4757',
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