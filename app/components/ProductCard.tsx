import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteAuctionProduct } from '../../services/Auction/auctionService';
import { deleteProduct, formatPrice, getConditionText, getTimeAgo } from '../../services/Product/productService';

interface AuctionInfo {
  currentBid: number;
  startPrice: number;
  startTime: any;
  endTime: any;
  bidCount: number;
  status: 'active' | 'ended';
  bidIncrement: number;
  buyNowPrice?: number;
  highestBidder?: string | null;
}

interface ProductCardProps {
  product: {
    id: string;
    type?: 'normal' | 'auction';
    images: string[];
    title: string;
    price: number;
    address: {
      district?: string;
      province?: string;
      street?: string;
      ward?: string;
      fullAddress?: string;
    };
    likeCount: number;
    viewCount?: number;
    sellerAvatar?: string;
    sellerName: string;
    condition?: string;
    createdAt?: any;
    sellerId: string;
    auctionInfo?: AuctionInfo;
  };
  onPress?: () => void;
  mode?: 'default' | 'profile';
  onProductDeleted?: () => void;
  isOwnProfile?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  mode = 'default',
  onProductDeleted,
  isOwnProfile = false,
}) => {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  const isAuction = product.type === 'auction' && product.auctionInfo;
  const isAuctionEnded = isAuction && product.auctionInfo?.status === 'ended';

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
      return new Date();
    }
  };

  useEffect(() => {
    if (!isAuction || !product.auctionInfo) return;

    const updateCountdown = () => {
      try {
        const now = new Date().getTime();
        const startTime = convertFirestoreTimestamp(product.auctionInfo!.startTime).getTime();
        const endTime = convertFirestoreTimestamp(product.auctionInfo!.endTime).getTime();
        
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
          setTimeRemaining('Ended');
          return;
        }

        if (status === 'not_started') {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            setTimeRemaining(`${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${minutes}m`);
          }
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${minutes}m`);
          }
        }
      } catch (error) {
        setTimeRemaining('Time error');
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [isAuction, product.auctionInfo]);

  const handleCardPress = () => {
    if (isAuction) {
      router.push({
        pathname: '/screens/Auction/auction_detail',
        params: { id: product.id }
      });
    } else {
      router.push({
        pathname: '/screens/Products/product_detail',
        params: { id: product.id }
      });
    }
  };

  const handleEdit = () => {
    if (isAuction) {
      router.push(`/screens/Auction/edit_auction_product?id=${product.id}`);
    } else {
      router.push(`/screens/Products/edit_product?productId=${product.id}`);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      `Delete ${isAuction ? 'Auction' : 'Product'}`,
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = isAuction 
                ? await deleteAuctionProduct(product.id)
                : await deleteProduct(product.id);
              
              if (result.success) {
                Alert.alert('Success', `${isAuction ? 'Auction' : 'Product'} has been deleted successfully!`);
                if (onProductDeleted) {
                  onProductDeleted();
                }
              } else {
                Alert.alert('Error', result.error || `Failed to delete ${isAuction ? 'auction' : 'product'}`);
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong while deleting');
            }
          },
        },
      ]
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

  const getLocationText = () => {
    if (product.address.district && product.address.province) {
      return `${product.address.district}, ${product.address.province}`;
    }
    return product.address.province || product.address.district || 'Unknown location';
  };

  const getDisplayPrice = () => {
    let price = 0;

    if (isAuction && product.auctionInfo) {
      price = product.auctionInfo.startPrice || product.price;
    } else {
      price = product.price;
    }
    
    if (typeof formatPrice === 'function') {
      return formatPrice(price) + ' VND';
    } else {
      return price.toLocaleString('vi-VN') + ' VND';
    }
  };

  const getConditionDisplay = () => {
    return getConditionText(product.condition);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isAuction && styles.auctionContainer, isAuctionEnded && styles.endedContainer]} 
      onPress={handleCardPress} 
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(73, 71, 71, 0.1)', 'rgba(35, 34, 34, 0.54)']}
          locations={[0.4, 0.5, 1]}
          style={styles.gradientShadow}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {isAuction && product.auctionInfo && (
          <View style={[styles.countdownSidebar, isAuctionEnded && styles.endedCountdown]}>
            <Text style={styles.countdownText}>
              {timeRemaining}
            </Text>
          </View>
        )}
        
        {isAuctionEnded && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedText}>Auction Ended</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, isAuctionEnded && styles.endedTitle]} numberOfLines={2}>
            {product.title}
          </Text>
        </View>
        
        <View style={styles.sellerRow}>
          <View style={styles.sellerInfo}>
            {product.sellerAvatar && (
              <Image 
                source={{ uri: product.sellerAvatar }} 
                style={styles.avatar} 
              />
            )}
            <Text style={styles.sellerName}>{product.sellerName}</Text>
          </View>
          <Text style={styles.timeAgo}>
            {getTimeAgo(product.createdAt)}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.priceSection}>
          {isAuction && product.auctionInfo ? (
            <View style={styles.auctionPriceSection}>
              <Text style={[styles.startPrice, isAuctionEnded && styles.endedTextColor]}>
                💰 Start Price: {getDisplayPrice()}
              </Text>
              <Text style={[styles.auctionTime, isAuctionEnded && styles.endedTextColor]}>
                ⏰ Start at: {formatAuctionTime(product.auctionInfo.startTime)}
              </Text>
              <Text style={[styles.bidIncrement, isAuctionEnded && styles.endedTextColor]}>
                📈 Min bid: {formatPrice(product.auctionInfo.bidIncrement)} VND
              </Text>
            </View>
          ) : (
            <Text style={styles.price}>💰 {getDisplayPrice()}</Text>
          )}
        </View>

        <View style={styles.locationContainer}>
          <Text style={[styles.location, isAuctionEnded && styles.endedTextColor]}>
            📍 {getLocationText()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.condition, isAuctionEnded && styles.endedTextColor]}>
            {getConditionDisplay()}
          </Text>
          
          <View style={styles.engagement}>
            <View style={styles.engagementItem}>
              <Text style={styles.engagementIcon}>👁️</Text>
              <Text style={styles.engagementText}>{product.viewCount || 0}</Text>
            </View>
          </View>
        </View>

        {mode === 'profile' && isOwnProfile && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Text style={styles.actionButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.actionButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  auctionContainer: {
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  endedContainer: {
    borderColor: '#ccc',
    opacity: 0.9,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f8f8f8',
  },
  gradientShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  countdownSidebar: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  endedCountdown: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  productInfo: {
    padding: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 22,
  },
  endedTitle: {
    color: '#666',
  },
  sellerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  sellerName: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
  timeAgo: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  priceSection: {
    marginBottom: 8,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#00A86B',
  },
  auctionPriceSection: {
    marginBottom: 8,
  },
  startPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00A86B',
    marginBottom: 4,
  },
  auctionTime: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
    marginBottom: 4,
  },
  bidIncrement: {
    fontSize: 13,
    color: '#dbbf0fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  endedTextColor: {
    color: '#666',
  },
  locationContainer: {
    marginBottom: 12,
  },
  location: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  condition: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
    flex: 1,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementIcon: {
    fontSize: 14,
  },
  engagementText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProductCard;