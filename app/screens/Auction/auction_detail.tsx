// screens/Products/auction_detail.tsx
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuctionProductById } from '../../../services/Auction/auctionService';
import { useAuth } from '../../../services/Auth/AuthContext';
import { auctionChatService } from '../../../services/Chat/auctionChatService';
import { formatPrice } from '../../../services/Product/productService';
import CommentSection from '../../components/CommentSection';
import FollowButton from '../../components/FollowButton';
import Header from '../../components/header_for_detail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AuctionDetail {
  id: string;
  title: string;
  description: string;
  startPrice: number;
  currentBid: number;
  images: string[];
  video?: string;
  condition: string;
  category: string;
  address: {
    district?: string;
    province?: string;
    street?: string;
    ward?: string;
    fullAddress?: string;
  };
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  viewCount: number;
  likeCount: number;
  createdAt: any;
  status: string;
  likedBy?: string[];
  auctionInfo: {
    startTime: any;
    endTime: any;
    bidCount: number;
    status: 'active' | 'ended';
    bidIncrement: number;
    buyNowPrice?: number;
    highestBidder?: string | null;
  };
}

const AuctionDetailScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isCountdownVisible, setIsCountdownVisible] = useState(true);

  const auctionId = params.id as string;

  const convertFirestoreTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    
    if (timestamp.seconds && timestamp.nanoseconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    try {
      return new Date(timestamp);
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return new Date();
    }
  };

  useEffect(() => {
    if (!auction || !auction.auctionInfo) return;

    const updateCountdown = () => {
      try {
        const now = new Date().getTime();
        const startTime = convertFirestoreTimestamp(auction.auctionInfo.startTime).getTime();
        const endTime = convertFirestoreTimestamp(auction.auctionInfo.endTime).getTime();
        
        let diff = 0;
        let status: 'not_started' | 'active' | 'ended';

        if (now < startTime) {
          diff = startTime - now;
          status = 'not_started';
        } else if (now > endTime) {
          status = 'ended';
        } else {
          diff = endTime - now;
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
      } catch (error) {
        console.error('Error updating countdown:', error);
        setTimeRemaining('Time error');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const loadAuctionDetail = async () => {
      try {
        if (!auctionId) {
          Alert.alert('Error', 'Auction ID is missing');
          router.back();
          return;
        }
        
        const result = await getAuctionProductById(auctionId);
        if (result.success && result.product) {
          setAuction(result.product as AuctionDetail);
        } else {
          Alert.alert('Error', result.error || 'Failed to load auction');
          router.back();
        }
      } catch (error) {
        console.error('Error loading auction detail:', error);
        Alert.alert('Error', 'Failed to load auction details');
      } finally {
        setLoading(false);
      }
    };

    loadAuctionDetail();
  }, [auctionId, router]);

  const imageItems = auction?.images || [];

  const handleBuyNow = () => {
    if (!auction || !auction.auctionInfo.buyNowPrice) return;
    
    Alert.alert(
      'Buy Now',
      `Buy "${auction.title}" for ${formatPrice(auction.auctionInfo.buyNowPrice)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy Now', onPress: () => console.log('Buy now:', auction.id) }
      ]
    );
  };

  const handleJoinAuction = async () => {
    if (!auction || !user) {
      Alert.alert('Notification', 'Please log in to join the auction');
      return;
    }

    try {
      const channelResult = await auctionChatService.getAuctionChannelByAuctionId(auction.id);
      
      let channelId;
      
      if (channelResult.success && channelResult.channel) {
        channelId = channelResult.channel.id;
        const joinResult = await auctionChatService.addUserToAuctionChannel(channelId, user.uid);
        
        if (!joinResult.success) {
          Alert.alert('Error', 'Failed to join auction: ' + joinResult.error);
          return;
        }
      } else {
        const createData = {
          auctionId: auction.id,
          createdBy: user.uid,
          participants: [user.uid, auction.sellerId],
          productInfo: {
            id: auction.id,
            title: auction.title,
            price: auction.currentBid,
            images: auction.images,
            sellerId: auction.sellerId,
            bidIncrement: auction.auctionInfo.bidIncrement,
            startTime: auction.auctionInfo.startTime,
            endTime: auction.auctionInfo.endTime
          },
          startPrice: auction.startPrice
        };

        const createResult = await auctionChatService.createAuctionChannel(createData);
        
        if (!createResult.success) {
          Alert.alert('Error', 'Failed to create auction room: ' + createResult.error);
          return;
        }
        
        channelId = createResult.channelId;
      }

      const productInfo = {
        id: auction.id,
        title: auction.title,
        price: auction.currentBid,
        images: auction.images,
        sellerId: auction.sellerId,
        bidIncrement: auction.auctionInfo.bidIncrement,
        startTime: auction.auctionInfo.startTime,
        endTime: auction.auctionInfo.endTime
      };

      router.push({
        pathname: '../../screens/Chat/auctionChatScreen',
        params: {
          channelId: channelId,
          productData: JSON.stringify(productInfo)
        }
      });

    } catch (error) {
      console.error('Error joining auction:', error);
      Alert.alert('Error', 'Cannot join auction room');
    }
  };

  const renderMediaContent = () => {
    const currentImage = imageItems[mediaIndex];
    
    if (!currentImage) {
      return (
        <View style={styles.mediaPlaceholder}>
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: currentImage }}
        style={styles.mainImage}
        resizeMode="contain"
      />
    );
  };

  const renderVideoSection = () => {
    if (!auction?.video) {
      return (
        <View style={styles.noVideoSection}>
          <Text style={styles.noVideoText}>🎥 This auction has no demo video</Text>
        </View>
      );
    }

    return (
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>🎥 Product Demo Video</Text>
        <View style={styles.videoContainer}>
          <Video
            ref={setVideoRef}
            source={{ uri: auction.video }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            isLooping={false}
          />
        </View>
        <Text style={styles.videoDescription}>
          Watch the product demonstration to see it in action
        </Text>
      </View>
    );
  };

  const formatAuctionTime = (date: any) => {
    try {
      const convertedDate = convertFirestoreTimestamp(date);
      return convertedDate.toLocaleString('en-US', {
        day: 'numeric',
        month: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getConditionDisplay = () => {
    const conditionMap = {
      'like_new': '🆕 Like New (99%)',
      'used_good': '👍 Good Condition (70%-80%)', 
      'used_fair': '👌 Fair Condition (50%)'
    };
    return conditionMap[auction?.condition as keyof typeof conditionMap] || '';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading auction...</Text>
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Auction not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAuctionActive = auction.auctionInfo.status === 'active';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Auction Detail"/>
      
      {isCountdownVisible && (
        <View style={[styles.floatingCountdown, !isAuctionActive && styles.endedBanner]}>
          <Text style={styles.countdownText}>
            ⏰ {timeRemaining}
          </Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setIsCountdownVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isCountdownVisible && (
        <TouchableOpacity 
          style={styles.showCountdownButton}
          onPress={() => setIsCountdownVisible(true)}
        >
          <Text style={styles.showCountdownText}>⏰ Show Countdown</Text>
        </TouchableOpacity>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.mediaSection}>
          <View style={styles.mediaContainer}>
            {renderMediaContent()}
            
            {imageItems.length > 0 && (
              <View style={styles.mediaCounter}>
                <Text style={styles.mediaCounterText}>
                  {mediaIndex + 1} / {imageItems.length}
                </Text>
              </View>
            )}
          </View>
          {imageItems.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailContainer}
            >
              {imageItems.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setMediaIndex(index)}
                  style={[
                    styles.thumbnail,
                    index === mediaIndex && styles.thumbnailActive
                  ]}
                >
                  <Image
                    source={{ uri: image }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {renderVideoSection()}

        <View style={styles.mainInfoSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{auction.title || 'No Title'}</Text>
          </View>

          <View style={styles.tagsSection}>
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{getConditionDisplay()}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>📁 {auction.category || 'Uncategorized'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.auctionStats}>
            <View style={styles.priceRow}>
              <Text style={styles.startPriceLabel}>Start Price:</Text>
              <Text style={styles.startPrice}>{formatPrice(auction.startPrice)}</Text>
            </View>
            
            {auction.auctionInfo.buyNowPrice && (
              <View style={styles.priceRow}>
                <Text style={styles.buyNowLabel}>Buy Now Price:</Text>
                <Text style={styles.buyNowPrice}>{formatPrice(auction.auctionInfo.buyNowPrice)}</Text>
              </View>
            )}
          </View>

          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>⏰ Auction Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Start Time:</Text>
                <Text style={styles.timelineValue}>{formatAuctionTime(auction.auctionInfo.startTime)}</Text>
              </View>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>End Time:</Text>
                <Text style={styles.timelineValue}>{formatAuctionTime(auction.auctionInfo.endTime)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.description}>{auction.description || 'No description available'}</Text>
          </View>
        </View>

        <View style={styles.sellerSection}>
          <Text style={styles.sectionTitle}>👤 Seller Information</Text>
          <View style={styles.sellerBox}>
            <View style={styles.sellerInfo}>
              {auction.sellerAvatar && (
                <Image 
                  source={{ uri: auction.sellerAvatar }} 
                  style={styles.sellerAvatar} 
                />
              )}
              <View style={styles.sellerText}>
                <Text style={styles.sellerName}>{auction.sellerName || 'Unknown Seller'}</Text>
              </View> 
              <View style={styles.verticalDivider}></View>            
              <View style={styles.followButtonWrapper}>
                <FollowButton 
                  targetUserId={auction.sellerId}
                  targetUserName={auction.sellerName}
                  onFollowChange={(isFollowing) => {
                    console.log(`Follow status changed: ${isFollowing}`);
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          <View style={styles.locationBox}>
            <Text style={styles.location}>
              {auction.address?.fullAddress || 
                `${auction.address?.street || ''}, ${auction.address?.ward || ''}, ${auction.address?.district || ''}, ${auction.address?.province || 'Unknown'}`}
            </Text>
          </View>
        </View>

        <CommentSection productId={auctionId}/>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.joinAuctionButton}
          onPress={handleJoinAuction}
        >
          <Text style={styles.joinAuctionButtonText}>
            🏷️ Join Auction
          </Text>
        </TouchableOpacity>
        
        {isAuctionActive && auction.auctionInfo.buyNowPrice && (
          <TouchableOpacity 
            style={styles.buyNowButton}
            onPress={handleBuyNow}
          >
            <Text style={styles.buyNowButtonText}>⚡ Buy Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  floatingCountdown: {
    position: 'absolute',
    top: 105,
    left: 5,
    right: '55%',
    backgroundColor: '#ffbe46ff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  endedBanner: {
    backgroundColor: '#FF6B6B',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  showCountdownButton: {
    position: 'absolute',
    top: 105,
    left: 5,
    backgroundColor: '#ffbe46ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  showCountdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  mediaSection: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  mediaContainer: {
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  mediaPlaceholder: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  mediaCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mediaCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#00A86B',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  noVideoSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  mainInfoSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleContainer: {
    backgroundColor: '#fafafaff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c0c0c0ff',
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    lineHeight: 28,
    textAlign: 'center',
  },
  tagsSection: {
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  tag: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A86B',
  },
  auctionStats: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  startPriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  startPrice: {
    fontSize: 18,
    color: '#00A86B',
    fontWeight: 'bold',
  },
  buyNowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buyNowPrice: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  timelineSection: {
    marginBottom: 8,
  },
  timeline: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  timelineValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  descriptionSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  sellerSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sellerBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  sellerText: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  verticalDivider: {
    width: 1,
    height: 60, 
    backgroundColor: '#d5d5d5ff',
  },
  followButtonWrapper: {
    width: SCREEN_WIDTH * 0.15, 
    alignItems: 'center',
  },
  locationSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  location: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  joinAuctionButton: {
    flex: 1,
    backgroundColor: '#1a365d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinAuctionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buyNowButton: {
    flex: 1,
    backgroundColor: '#00A86B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AuctionDetailScreen;