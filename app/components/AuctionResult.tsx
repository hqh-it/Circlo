import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { auctionChatService } from '../../services/Chat/auctionChatService';
import { BidMessage as ChatBidMessage, SystemMessage as ChatSystemMessage } from '../../services/Chat/chatTypes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface UserData {
  uid: string;
  displayName: string;
  avatarURL?: string;
}

type BidMessage = ChatBidMessage;
type SystemMessage = ChatSystemMessage;

interface AuctionResultProps {
  auctionChannel: {
    id: string;
    currentBid: number;
    highestBidder: string;
    bidCount: number;
    participantCount: number;
    productInfo: {
      startPrice?: number;
      bidIncrement: number;
      title: string;
      id: string;
      sellerId: string;
      images: string[];
      condition?: string;
    };
    orderCreated?: boolean;
  };
  participantsData: Record<string, UserData>;
  messages: (BidMessage | SystemMessage)[];
  formatCurrency: (amount: number) => string;
  loadingUsers?: boolean;
  onClose?: () => void;
  auctionStatus?: 'upcoming' | 'live' | 'ended' | 'cancelled';
}

const AuctionResult: React.FC<AuctionResultProps> = ({ 
  auctionChannel, 
  participantsData, 
  messages,
  formatCurrency,
  loadingUsers = false,
  onClose,
  auctionStatus = 'ended'
}) => {
  const { user } = useAuth();

  if (!auctionChannel) return null;

  const winnerInfo = participantsData[auctionChannel.highestBidder];
  const startPrice = auctionChannel.productInfo.startPrice || 0;
  
  const bidMessages = messages
    .filter((msg): msg is BidMessage => msg.type === 'bid')
    .sort((a, b) => new Date(a.timestamp?.toDate?.() || a.timestamp).getTime() - 
                    new Date(b.timestamp?.toDate?.() || b.timestamp).getTime());

  useEffect(() => {
    const createOrderAutomatically = async () => {
      // Điều kiện chặt chẽ: chỉ tạo khi auction ended VÀ chưa có order VÀ có highestBidder
      if (auctionChannel.highestBidder && 
          auctionStatus === 'ended' && 
          !auctionChannel.orderCreated) {
        
        console.log('🔄 Attempting to create auction order...');
        
        try {
          const result = await auctionChatService.endAuctionAndCreateOrderAutomatically(auctionChannel);
          
          if (result.success) {
            console.log('✅ Auction order created automatically:', result.orderId);
          } else {
            console.log('ℹ️ Order creation result:', result.message);
          }
        } catch (error) {
          console.error('❌ Error creating auction order:', error);
        }
      } else {
        console.log('⏸️ Skipping order creation - conditions not met:', {
          hasHighestBidder: !!auctionChannel.highestBidder,
          auctionStatus,
          orderCreated: auctionChannel.orderCreated
        });
      }
    };

    createOrderAutomatically();
  }, [auctionChannel, auctionStatus]);

  const isWinner = user?.uid === auctionChannel.highestBidder;
  const isSeller = user?.uid === auctionChannel.productInfo.sellerId;

  if (loadingUsers) {
    return (
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading results...</Text>
          </View>
        </View>
      </View>
    );
  }

  const renderBidItem = ({ item, index }: { item: BidMessage; index: number }) => {
    const bidderInfo = participantsData[item.senderId];
    const isWinner = item.senderId === auctionChannel.highestBidder && 
                    item.bidAmount === auctionChannel.currentBid;
    
    return (
      <View style={[
        styles.bidItem,
        isWinner && styles.winnerBidItem
      ]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidderInfo}>
            <Image 
              source={
                bidderInfo?.avatarURL 
                  ? { uri: bidderInfo.avatarURL }
                  : require('../assets/icons/profile-picture.png')
              } 
              style={[
                styles.bidderAvatar,
                isWinner && styles.winnerBidderAvatar
              ]} 
            />
            <View style={styles.bidderText}>
              <Text style={styles.bidderName}>
                {bidderInfo?.displayName || 'Unknown User'}
                {isWinner && <Text style={styles.crownIcon}> 👑</Text>}
              </Text>
              <Text style={styles.bidTime}>
                Bid #{index + 1}
              </Text>
            </View>
          </View>
          
          <View style={styles.bidAmountContainer}>
            <Text style={[
              styles.bidAmount,
              isWinner && styles.winnerBidAmount
            ]}>
              {formatCurrency(item.bidAmount)}
            </Text>
            <Text style={styles.currencyText}>VND</Text>
          </View>
        </View>
        
        {item.previousBid > 0 && (
          <View style={styles.previousBidInfo}>
            <Text style={styles.previousBidText}>
              Previous: {formatCurrency(item.previousBid)} VND
            </Text>
          </View>
        )}
        
        {isWinner && (
          <View style={styles.winningBadge}>
            <Text style={styles.winningText}>🏆 WINNING BID</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.overlayBackground}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🏆 Auction Finished</Text>
            <Text style={styles.subtitle}>The auction has ended</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.winnerSection}>
          <Text style={styles.sectionTitle}>Winner</Text>
          <View style={styles.winnerCard}>
            <View style={styles.winnerAvatarContainer}>
              <Image 
                source={
                  winnerInfo?.avatarURL 
                    ? { uri: winnerInfo.avatarURL }
                    : require('../assets/icons/profile-picture.png')
                } 
                style={styles.winnerAvatar} 
              />
              <View style={styles.crownBadge}>
                <Image style={{
                  width:15,
                  height:15
                }} source={require('../assets/icons/winner.gif')}/>
              </View>
            </View>
            
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>
                {winnerInfo?.displayName || 'Unknown User'}
              </Text>
              <Text style={styles.winnerLabel}>Auction Winner</Text>
            </View>
            
            <View style={styles.winningBid}>
              <Text style={styles.winningBidAmount}>
                {formatCurrency(auctionChannel.currentBid)}
              </Text>
              <Text style={styles.winningBidCurrency}>VND</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{auctionChannel.bidCount}</Text>
              <Text style={styles.statLabel}>Total Bids</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{auctionChannel.participantCount}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(startPrice)}
              </Text>
              <Text style={styles.statLabel}>Start Price</Text>
            </View>
          </View>
        </View>

        <View style={styles.bidsSection}>
          <View style={styles.bidsHeader}>
            <Text style={styles.sectionTitle}>Bid History</Text>
            <Text style={styles.bidsCount}>({bidMessages.length} bids)</Text>
          </View>
          
          {bidMessages.length > 0 ? (
            <View style={styles.scrollableBidList}>
              <FlatList
                data={bidMessages}
                renderItem={renderBidItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.bidListContent}
              />
            </View>
          ) : (
            <View style={styles.noBids}>
              <Text style={styles.noBidsText}>No bids were placed</Text>
            </View>
          )}
        </View>

        <View style={styles.orderSection}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <Text style={styles.orderInfo}>
            {isWinner 
              ? "🎉 Congratulations! You won this auction!"
              : isSeller
              ? "📦 The auction has ended successfully."
              : "ℹ️ The auction has ended. Thank you for participating!"
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    height: screenHeight * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666666',
    lineHeight: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  winnerSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    height: '20%',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  winnerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  crownBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownText: {
    fontSize: 10,
  },
  winnerInfo: {
    flex: 1,
    marginRight: 12,
  },
  winnerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  winnerLabel: {
    fontSize: 12,
    color: '#666666',
  },
  winningBid: {
    alignItems: 'flex-end',
  },
  winningBidAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22C55E',
    textAlign: 'right',
  },
  winningBidCurrency: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    textAlign: 'right',
  },
  statsSection: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    height: '15%',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    height: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8E8',
  },
  bidsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  scrollableBidList: {
    flex: 1,
  },
  bidListContent: {
    paddingBottom: 10,
  },
  bidsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  bidsCount: {
    fontSize: 12,
    color: '#666666',
  },
  bidItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  winnerBidItem: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#FFFDF0',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bidderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bidderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  winnerBidderAvatar: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  bidderText: {
    flex: 1,
  },
  bidderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  crownIcon: {
    fontSize: 14,
  },
  bidTime: {
    fontSize: 11,
    color: '#999999',
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  bidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'right',
  },
  winnerBidAmount: {
    color: '#22C55E',
    fontSize: 15,
  },
  currencyText: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    textAlign: 'right',
  },
  previousBidInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 6,
    marginTop: 6,
  },
  previousBidText: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  winningBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  winningText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  noBids: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noBidsText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  orderSection: {
    padding: 16,
    backgroundColor: '#f8fff8',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  orderInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});

export default AuctionResult;