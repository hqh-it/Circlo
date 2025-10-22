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
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '../../../services/Auth/AuthContext';
import { auctionChatService } from '../../../services/Chat/auctionChatService';
import { BidMessage, SystemMessage } from '../../../services/Chat/chatTypes';

const { height } = Dimensions.get('window');

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
  bidIncrement: number;
  startTime: any;
  endTime: any;
}

type AuctionStatusType = 'upcoming' | 'live' | 'ended' | 'cancelled';

const AuctionChatScreen = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const channelId = params.channelId as string;
  const productData = params.productData ? JSON.parse(params.productData as string) : null;

  const [messages, setMessages] = useState<(BidMessage | SystemMessage)[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [auctionChannel, setAuctionChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auctionStatus, setAuctionStatus] = useState<AuctionStatusType>('upcoming');
  
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#1a365d');

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

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channelId, currentUser]);

  const loadAuctionChannel = async () => {
    try {
      const result = await auctionChatService.getAuctionChannelById(channelId);
      if (result.success) {
        setAuctionChannel(result.channel);
        updateAuctionStatus(result.channel);
      }
    } catch (error) {
      console.error('Error loading auction channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAuctionStatus = (channel: any) => {
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
    return amount.toLocaleString('vi-VN') + ' VND';
  };

  const formatMessageTime = (timestamp: any) => {
    return auctionChatService.getTimeAgo(timestamp);
  };

  const renderBidMessage = (item: BidMessage) => {
    const isMyBid = item.senderId === currentUser?.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyBid ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={isMyBid ? styles.myBubble : styles.otherBubble}>
          <Text style={isMyBid ? styles.myMessageText : styles.otherMessageText}>
            🎯 Bid: {formatCurrency(item.bidAmount)}
          </Text>
          {item.previousBid > 0 && (
            <Text style={styles.previousBidText}>
              Previous: {formatCurrency(item.previousBid)}
            </Text>
          )}
          <Text style={styles.messageTime}>
            {formatMessageTime(item.timestamp)}
          </Text>
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

  const renderAuctionHeader = () => {
    if (!auctionChannel?.productInfo) return null;

    return (
      <View style={styles.auctionHeader}>
        <Image 
          source={{ uri: auctionChannel.productInfo.images[0] }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {auctionChannel.productInfo.title}
          </Text>
          <Text style={styles.currentBid}>
            Current Bid: {formatCurrency(auctionChannel.currentBid)}
          </Text>
          <Text style={styles.bidIncrement}>
            Min Increment: {formatCurrency(auctionChannel.productInfo.bidIncrement)}
          </Text>
        </View>
      </View>
    );
  };

  const renderBidInput = () => {
    if (auctionStatus !== 'live') {
      return (
        <View style={styles.disabledInputContainer}>
          <Text style={styles.disabledText}>
            {auctionStatus === 'upcoming' ? 
              'Auction has not started yet' : 
              'Auction has ended'}
          </Text>
        </View>
      );
    }

    const minBid = auctionChannel ? 
      auctionChannel.currentBid + auctionChannel.productInfo.bidIncrement : 0;

    return (
      <View style={styles.bidInputContainer}>
        <View style={styles.bidInputWrapper}>
          <TextInput
            style={styles.bidInput}
            value={bidAmount}
            onChangeText={setBidAmount}
            placeholder={`Min bid: ${formatCurrency(minBid)}`}
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            editable={!sending}
          />
          <TouchableOpacity 
            style={[
              styles.placeBidButton,
              (!bidAmount || sending) && styles.placeBidButtonDisabled
            ]}
            onPress={handlePlaceBid}
            disabled={!bidAmount || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.placeBidButtonText}>Place Bid</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.bidHint}>
          Enter amount ≥ {formatCurrency(minBid)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a365d" />
          <Text style={styles.loadingText}>Loading auction...</Text>
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
              {auctionChannel.participantCount} participants
            </Text>
          </View>
          <View style={styles.auctionStatus}>
            <Text style={[
              styles.statusText,
              auctionStatus === 'live' && styles.statusLive,
              auctionStatus === 'upcoming' && styles.statusUpcoming,
              auctionStatus === 'ended' && styles.statusEnded
            ]}>
              {auctionStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {renderAuctionHeader()}

          <View style={styles.chatContent}>
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
                  <Text style={styles.emptyText}>No bids yet</Text>
                  <Text style={styles.emptySubText}>Be the first to place a bid!</Text>
                </View>
              }
            />
          </View>

          {renderBidInput()}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a365d",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: "#1a365d",
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
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#cbd5e0",
    marginTop: 2,
  },
  auctionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusLive: {
    color: '#48bb78',
  },
  statusUpcoming: {
    color: '#ed8936',
  },
  statusEnded: {
    color: '#f56565',
  },
  auctionHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f7fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  currentBid: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: 2,
  },
  bidIncrement: {
    fontSize: 12,
    color: '#718096',
  },
  chatContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
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
  myBubble: {
    backgroundColor: "#1a365d",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 8,
    maxWidth: '80%',
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxWidth: '80%',
  },
  myMessageText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: '600',
  },
  otherMessageText: {
    fontSize: 16,
    color: "#2d3748",
    fontWeight: '600',
  },
  previousBidText: {
    fontSize: 12,
    color: "#a0aec0",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: "#a0aec0",
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: "#718096",
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#edf2f7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  systemMessageTime: {
    fontSize: 10,
    color: "#a0aec0",
    marginTop: 2,
  },
  bidInputContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bidInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    backgroundColor: '#f7fafc',
  },
  placeBidButton: {
    backgroundColor: "#1a365d",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  placeBidButtonDisabled: {
    backgroundColor: "#cbd5e0",
  },
  placeBidButtonText: {
    color: "#FFFFFF",
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  bidHint: {
    fontSize: 12,
    color: "#718096",
    marginTop: 8,
    textAlign: 'center',
  },
  disabledInputContainer: {
    padding: 16,
    backgroundColor: "#f7fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 16,
    color: "#a0aec0",
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#718096",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#718096",
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#718096",
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: 'center',
  },
});

export default AuctionChatScreen;