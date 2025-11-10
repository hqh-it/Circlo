import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '../../../services/Auth/AuthContext';
import { auctionChatService } from '../../../services/Chat/auctionChatService';
import { BidMessage, SystemMessage } from '../../../services/Chat/chatTypes';
import AuctionResult from '../../components/AuctionResult';
import BidInput from '../../components/BidInput';
import ProductHeader from '../../components/ProductHeader';

const { height, width } = Dimensions.get('window');

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
  bidIncrement: number;
  startTime: any;
  endTime: any;
  startPrice?: number;
  sellerName?: string;
  sellerAvatar?: string;
  condition?: string;
}

interface AuctionChannel {
  id: string;
  auctionId: string;
  participants: string[];
  productInfo: ProductInfo;
  type: string;
  currentBid: number;
  bidCount: number;
  highestBidder: string;
  lastBidAt: any;
  createdAt: any;
  isActive: boolean;
  participantCount: number;
}

type AuctionStatusType = 'upcoming' | 'live' | 'ended' | 'cancelled';

interface UserData {
  uid: string;
  displayName: string;
  avatarURL?: string;
}

const AuctionChatScreen = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const channelId = params.channelId as string;
  const productData = params.productData ? JSON.parse(params.productData as string) : null;

  const [messages, setMessages] = useState<(BidMessage | SystemMessage)[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [auctionChannel, setAuctionChannel] = useState<AuctionChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [auctionStatus, setAuctionStatus] = useState<AuctionStatusType>('upcoming');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [participantsData, setParticipantsData] = useState<Record<string, UserData>>({});
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [hasShownInitialResult, setHasShownInitialResult] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const updateAuctionStatusRealTime = () => {
    if (!auctionChannel?.productInfo) return;

    const status = auctionChatService.getAuctionStatus(
      auctionChannel.productInfo.startTime,
      auctionChannel.productInfo.endTime
    ) as AuctionStatusType;
    
    setAuctionStatus(status);
    updateTimeRemaining();
  };

  const updateTimeRemaining = () => {
    if (!auctionChannel?.productInfo?.startTime) return;
    
    const now = new Date();
    const startTime = auctionChatService.parseTimestamp(auctionChannel.productInfo.startTime);
    const endTime = auctionChatService.parseTimestamp(auctionChannel.productInfo.endTime);
    
    let diff = 0;
    let status: 'not_started' | 'active' | 'ended';

    if (now < startTime) {
      diff = startTime.getTime() - now.getTime();
      status = 'not_started';
    } else if (now > endTime) {
      status = 'ended';
    } else {
      diff = endTime.getTime() - now.getTime();
      status = 'active';
    }

    if (status === 'ended') {
      setTimeRemaining('Auction Ended');
      return;
    }

    if (status === 'not_started') {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    }
  };

  const formatMessageTime = (timestamp: any) => {
    return auctionChatService.getTimeAgo(timestamp);
  };

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#01332fff');

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!channelId || !currentUser) return;

    loadAuctionChannel();
    setupMessageListener();

    const interval = setInterval(() => {
      refreshAuctionChannel();
    }, 3000);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      clearInterval(interval);
    };
  }, [channelId, currentUser]);

  useEffect(() => {
    if (!auctionChannel?.productInfo) return;

    updateAuctionStatusRealTime();
    const interval = setInterval(updateAuctionStatusRealTime, 1000);

    return () => clearInterval(interval);
  }, [auctionChannel]);

  useEffect(() => {
    if (auctionStatus === 'ended' && !hasShownInitialResult) {
      setShowResult(true);
      setHasShownInitialResult(true);
    }
  }, [auctionStatus, hasShownInitialResult]);

  useEffect(() => {
    const loadAllUsers = async () => {
      if (!auctionChannel?.participants || !currentUser) return;
      
      try {
        setLoadingUsers(true);
        
        const currentUserInfo = await auctionChatService.getUserInfo(currentUser.uid);
        if (currentUserInfo) {
          setCurrentUserData(currentUserInfo);
        }
        
        const participantsMap: Record<string, UserData> = {};
        
        for (const userId of auctionChannel.participants) {
          try {
            const userData = await auctionChatService.getUserInfo(userId);
            if (userData) {
              participantsMap[userId] = userData;
            }
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
            participantsMap[userId] = {
              uid: userId,
              displayName: 'User',
              avatarURL: undefined
            };
          }
        }
        
        setParticipantsData(participantsMap);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (auctionChannel?.participants) {
      loadAllUsers();
    }
  }, [auctionChannel?.participants, currentUser]);

  const loadAuctionChannel = async () => {
    try {
      const result = await auctionChatService.getAuctionChannelById(channelId);
      if (result.success && result.channel) {
        const channelData = result.channel as any;
        
        const auctionChannelData: AuctionChannel = {
          id: channelData.id,
          auctionId: channelData.auctionId || '',
          participants: channelData.participants || [],
          productInfo: channelData.productInfo || {},
          type: channelData.type || 'auction',
          currentBid: channelData.currentBid || 0,
          bidCount: channelData.bidCount || 0,
          highestBidder: channelData.highestBidder || '',
          lastBidAt: channelData.lastBidAt,
          createdAt: channelData.createdAt,
          isActive: channelData.isActive !== false,
          participantCount: channelData.participantCount || 0
        };
        
        setAuctionChannel(auctionChannelData);
        updateAuctionStatus(auctionChannelData);
      } else {
        console.error('Failed to load auction channel:', result.error);
      }
    } catch (error) {
      console.error('Error loading auction channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuctionChannel = async () => {
    if (!channelId) return;
    
    try {
      const result = await auctionChatService.getAuctionChannelById(channelId);
      if (result.success && result.channel) {
        const channelData = result.channel as any;
        
        setAuctionChannel(prevChannel => {
          if (!prevChannel) return null;
          
          return {
            ...prevChannel,
            currentBid: channelData.currentBid || prevChannel.currentBid,
            highestBidder: channelData.highestBidder || prevChannel.highestBidder,
            bidCount: channelData.bidCount || prevChannel.bidCount,
            lastBidAt: channelData.lastBidAt || prevChannel.lastBidAt
          };
        });
      }
    } catch (error) {
      console.error('Error refreshing auction channel:', error);
    }
  };

  const updateAuctionStatus = (channel: AuctionChannel) => {
    if (!channel.productInfo) return;
    
    const status = auctionChatService.getAuctionStatus(
      channel.productInfo.startTime,
      channel.productInfo.endTime
    ) as AuctionStatusType;
    setAuctionStatus(status);
  };

  const setupMessageListener = () => {
    const unsubscribe = auctionChatService.getAuctionMessages(channelId, (result: any) => {
      if (result.success) {
        setMessages(result.messages);
        
        setTimeout(() => {
          if (flatListRef.current && result.messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    });

    unsubscribeRef.current = unsubscribe;
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || !currentUser || !auctionChannel || sending) return;

    const bidValue = parseInt(bidAmount.replace(/\D/g, ''));
    if (isNaN(bidValue)) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount');
      return;
    }

    setSending(true);
    try {
      const placeBidData = {
        channelId,
        userId: currentUser.uid,
        bidAmount: bidValue,
        currentBid: auctionChannel.currentBid,
        bidIncrement: auctionChannel.productInfo.bidIncrement
      };

      const result = await auctionChatService.placeBid(placeBidData);
      
      if (result.success) {
        setBidAmount('');
        
        setAuctionChannel(prevChannel => {
          if (!prevChannel) return null;
          
          return {
            ...prevChannel,
            currentBid: bidValue,
            highestBidder: currentUser.uid,
            bidCount: prevChannel.bidCount + 1,
            lastBidAt: new Date()
          };
        });

        setTimeout(() => {
          refreshAuctionChannel();
        }, 500);
      } else {
        Alert.alert('Bid Failed', result.error || 'Unable to place bid');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to place bid');
    } finally {
      setSending(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const handleShowResult = () => {
    setShowResult(true);
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const renderBidMessage = (item: BidMessage) => {
    const isMyBid = item.senderId === currentUser?.uid;
    const isHighestBidder = auctionChannel?.highestBidder === item.senderId;
    
    const isLatestHighestBid = isHighestBidder && 
      item.bidAmount === auctionChannel?.currentBid;
    
    const senderInfo = participantsData[item.senderId];
    const displayName = senderInfo?.displayName || 'User';
    const avatarURL = senderInfo?.avatarURL;

    return (
      <View style={[
        styles.messageContainer,
        isMyBid ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={styles.messageWrapper}>
          {!isMyBid && (
            <View style={styles.avatarContainer}>
              <Image 
                source={
                  avatarURL 
                    ? { uri: avatarURL }
                    : require('../../assets/icons/profile-picture.png')
                } 
                style={[
                  styles.avatar,
                  isLatestHighestBid && styles.highestBidAvatar
                ]} 
              />
              {isLatestHighestBid && (
                <View style={styles.crownBadge}>
                  <Image 
                    source={require('../../assets/icons/winner.gif')} 
                    style={styles.crownIcon}
                  />
                </View>
              )}
            </View>
          )}
          
          <View style={[
            styles.messageContent,
            isMyBid ? styles.myMessageContent : styles.otherMessageContent
          ]}>
            {!isMyBid && (
              <Text style={styles.senderName}>
                {displayName}
                {isLatestHighestBid && <Text style={styles.leaderText}> • Leading</Text>}
              </Text>
            )}
            
            <View style={[
              styles.bidCard,
              isMyBid ? styles.myBidCard : styles.otherBidCard,
              isLatestHighestBid && styles.highestBidCard
            ]}>
              <Text style={styles.bidLabel}>BID PLACED</Text>
              
              <View style={styles.bidAmountContainer}>
                <View style={styles.bidAmountBorder}>
                  <Text style={styles.bidAmount}>
                    {formatCurrency(item.bidAmount)} VND
                  </Text>
                </View>
              </View>
              
              {item.previousBid > 0 && (
                <View style={styles.previousBidContainer}>
                  <Text style={styles.previousBidLabel}>
                    Previous bid: {formatCurrency(item.previousBid)} VND
                  </Text>
                </View>
              )}

              {isLatestHighestBid && (
                <View style={styles.winningIndicator}>
                  <Text style={styles.winningText}>🔥 Currently Winning!</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.messageTime}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>

          {isMyBid && (
            <View style={styles.avatarContainer}>
              <Image 
                source={
                  currentUserData?.avatarURL 
                    ? { uri: currentUserData.avatarURL }
                    : require('../../assets/icons/profile-picture.png')
                } 
                style={[
                  styles.avatar,
                  isLatestHighestBid && styles.highestBidAvatar
                ]} 
              />
              {isLatestHighestBid && (
                <View style={styles.crownBadge}>
                  <Image 
                    source={require('../../assets/icons/winner.gif')} 
                    style={styles.crownIcon}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSystemMessage = (item: SystemMessage) => {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>
          {item.content}
        </Text>
        <Text style={styles.systemMessageTime}>
          {formatMessageTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: BidMessage | SystemMessage }) => {
    if (item.type === 'bid') {
      return renderBidMessage(item as BidMessage);
    } else if (item.type === 'system') {
      return renderSystemMessage(item as SystemMessage);
    }
    return null;
  };

  const renderAuctionStats = () => {
    if (!auctionChannel?.productInfo) return null;

    const minBid = auctionChannel.currentBid + auctionChannel.productInfo.bidIncrement;

    return (
      <View style={styles.auctionStatsContainer}>
        <View style={styles.auctionStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time Remaining</Text>
            <Text style={[
              styles.timeRemaining,
              auctionStatus === 'live' && styles.timeRemainingLive,
              auctionStatus === 'ended' && styles.timeRemainingEnded
            ]}>
              {timeRemaining}
            </Text>
            <Text style={styles.currencyLabel}></Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Bid</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currentBid}>{formatCurrency(auctionChannel.currentBid)}</Text>
              <Text style={styles.currencyLabel}>VND</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min Bid</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.minBid}>{formatCurrency(minBid)}</Text>
              <Text style={styles.currencyLabel}>VND</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderBidInput = () => {
    const minBid = auctionChannel ? 
      auctionChannel.currentBid + auctionChannel.productInfo.bidIncrement : 0;

    if (auctionStatus !== 'live') {
      return (
        <View>
          <BidInput
            bidAmount={bidAmount}
            setBidAmount={setBidAmount}
            minBid={minBid}
            sending={sending}
            onPlaceBid={handlePlaceBid}
            disabled={true}
            disabledMessage={
              auctionStatus === 'upcoming' ? 
              '⏳ Auction has not started yet' : 
              '❌ Auction has ended'
            }
          />
          {auctionStatus === 'ended' && (
            <TouchableOpacity 
              style={styles.resultButtonBelow} 
              onPress={handleShowResult}
            >
              <Text style={styles.resultButtonText}>🏆 View Auction Results</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <BidInput
        bidAmount={bidAmount}
        setBidAmount={setBidAmount}
        minBid={minBid}
        sending={sending}
        onPlaceBid={handlePlaceBid}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#01332fff" />
          <Text style={styles.loadingText}>Loading auction room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!auctionChannel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Auction not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Auction Room</Text>
            <Text style={styles.headerSubtitle}>
              {auctionChannel.participantCount} participants • {auctionChannel.bidCount} bids
            </Text>
          </View>
          <View style={[
            styles.auctionStatus,
            auctionStatus === 'live' && styles.statusLive,
            auctionStatus === 'upcoming' && styles.statusUpcoming,
            auctionStatus === 'ended' && styles.statusEnded
          ]}>
            <Text style={styles.statusText}>
              {auctionStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {auctionChannel?.productInfo && (
            <ProductHeader 
              product={{
                id: auctionChannel.productInfo.id,
                title: auctionChannel.productInfo.title,
                price: auctionChannel.productInfo.startPrice || 0,
                images: auctionChannel.productInfo.images,
                sellerId: auctionChannel.productInfo.sellerId
              }}
              showHideButton={true}
            />
          )}

          {renderAuctionStats()}
          <View style={styles.chatContent}>
  
            <Image 
              source={require('../../assets/images/auctionChat.gif')}
              style={styles.backgroundGif}
            />
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>🚀 No bids yet</Text>
                  <Text style={styles.emptySubText}>Be the first to place a bid and start the auction!</Text>
                </View>
              }
            />
          </View>

          {renderBidInput()}
        </KeyboardAvoidingView>

        {showResult && auctionChannel && (
          <AuctionResult
            auctionChannel={{
              id: auctionChannel.id,
              currentBid: auctionChannel.currentBid,
              highestBidder: auctionChannel.highestBidder,
              bidCount: auctionChannel.bidCount,
              participantCount: auctionChannel.participantCount,
              productInfo: {
                startPrice: auctionChannel.productInfo.startPrice,
                bidIncrement: auctionChannel.productInfo.bidIncrement,
                title: auctionChannel.productInfo.title,
                id: auctionChannel.productInfo.id,
                sellerId: auctionChannel.productInfo.sellerId,
                images: auctionChannel.productInfo.images,
                condition: auctionChannel.productInfo.condition
              }}
            }
            participantsData={participantsData}
            messages={messages}
            formatCurrency={formatCurrency}
            loadingUsers={loadingUsers}
            onClose={handleCloseResult}
          />
        )}
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
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: "#01332fff",
  },
  backButton: {
    padding: 10,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: '300',
    marginTop: -9,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#F0E68C",
    marginTop: 2,
    fontWeight: '500',
  },
  auctionStatus: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusLive: {
    backgroundColor: '#22C55E',
  },
  statusUpcoming: {
    backgroundColor: '#F59E0B',
  },
  statusEnded: {
    backgroundColor: '#EF4444',
  },

  auctionStatsContainer: {
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  auctionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  timeRemaining: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#01332fff',
  },
  timeRemainingLive: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '800',
  },
  timeRemainingEnded: {
    color: '#EF4444',
    fontSize: 14,
  },
  amountContainer: {
    alignItems: 'center',
  },
  currentBid: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#01332fff',
  },
  minBid: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  currencyLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: '#E8E8E8',
  },

  chatContent: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    position: 'relative',
  },
  backgroundGif: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    zIndex:0,       
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  messageContainer: {
    marginVertical: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  messageContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  myMessageContent: {
    alignItems: 'flex-end',
  },
  otherMessageContent: {
    alignItems: 'flex-start',
  },

  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  highestBidAvatar: {
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  crownBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  crownIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },

  senderName: {
    fontSize: 14,
    color: "#fffce2ff",
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '600',
  },
  leaderText: {
    color: '#22C55E',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },

  bidCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 230,
  },
  myBidCard: {
    backgroundColor: '#ffffffff',
    borderColor: '#000000ff',
  },
  otherBidCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000ff',
  },
  highestBidCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  bidLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 5,
    letterSpacing: 0.5,
  },

  bidAmountContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  bidAmountBorder: {
    borderWidth: 2,
    borderColor: '#01332fff',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: 'rgba(20, 51, 1, 0.05)',
    minWidth: 200,
  },
  bidAmount: {
    fontSize: 18,
    color: '#063301ff',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingVertical:5
  },
  previousBidContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingVertical:5,
  },
  previousBidLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  winningIndicator: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  winningText: {
    fontSize: 11,
    color: '#8B7500',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  messageTime: {
    fontSize: 11,
    color: '#fffde9ff',
    marginTop: 8,
    textAlign: 'center',
  },

  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  systemMessageText: {
    fontSize: 14,
    color: "#666666",
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#F0E68C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    fontWeight: '500',
  },
  systemMessageTime: {
    fontSize: 11,
    color: "#999999",
    marginTop: 4,
    fontWeight: '500',
  },

  resultButtonBelow: {
    paddingVertical: 10,
    backgroundColor: '#01332fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth:2,
    borderColor:"#FFD700"
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffffff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666666",
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    color: "#666666",
    marginBottom: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 20,
    color: "#666666",
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 15,
    color: "#999999",
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});

export default AuctionChatScreen;