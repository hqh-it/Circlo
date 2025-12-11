// screens/Products/product_detail.tsx
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canUserBuy } from '../../../services/Admin/StrustPointService';
import { useAuth } from '../../../services/Auth/AuthContext';
import { chatService } from '../../../services/Chat/chatService';
import { getProductById } from '../../../services/Product/productService';
import BuyButton from '../../components/BuyButton';
import BuyNow from '../../components/BuyNow';
import CommentSection from '../../components/CommentSection';
import FollowButton from '../../components/FollowButton';
import Header from '../../components/header_for_detail';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  price: number;
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
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
  };
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  viewCount: number;
  likeCount: number;
  createdAt: any;
  status: string;
}

const ProductDetailScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<any>(null);
  const [showBuyNowPopup, setShowBuyNowPopup] = useState(false);
  const [orderUpdated, setOrderUpdated] = useState(0);
  
  const footerAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');
  const footerVisible = useRef(true);

  const productId = params.id as string;

  useEffect(() => {
    const loadProductDetail = async () => {
      try {
        if (!productId) {
          Alert.alert('Error', 'Product ID is missing');
          router.back();
          return;
        }
        
        const result = await getProductById(productId);
        if (result.success && result.product) {
          setProduct(result.product as ProductDetail);
        } else {
          Alert.alert('Error', result.error || 'Failed to load product');
          router.back();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    loadProductDetail();
  }, [productId, router, orderUpdated]);

  const imageItems = product?.images || [];

  const handleAskAI = () => {
    if (!product) return;
    
    const productInfoForAI = {
      id: product.id,
      title: product.title,
      price: product.price,
      images: product.images,
      sellerId: product.sellerId,
      description: product.description,
      category: product.category,      
      condition: product.condition,  
      address: product.address,      
      sellerName: product.sellerName,   
    };
    
    router.push({
      pathname: '../../screens/Chat/AIChatScreen',
      params: {
        productData: JSON.stringify(productInfoForAI)
      }
    });
  };

  const handleContactSeller = async () => {
    if (!product) return;
    
    if (!user) {
      Alert.alert('Notification', 'Please log in to your account to chat with seller');
      return;
    }

    const result = await canUserBuy(user.uid);
    
    if (!result.canBuy) {
      Alert.alert(
        "Cannot Contact Seller",
        `You need more than 40 trust points to contact sellers.\nYour current points: ${result.points}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      const createData = {
        participants: [user.uid, product.sellerId],
        participantDetails: {
          [user.uid]: {
            name: user.displayName || 'You', 
            avatar: user.photoURL || ''
          },
          [product.sellerId]: {
            name: product.sellerName, 
            avatar: product.sellerAvatar || ''
          }
        },
        productId: product.id,
        productInfo: {
          id: product.id,
          title: product.title,
          price: product.price,
          images: product.images,
          sellerId: product.sellerId
        },
        type: 'direct'
      };

      const result = await chatService.createOrGetChannel(createData);
      
      if (result.success) {
        const productInfo = {
          id: product.id,
          title: product.title,
          price: product.price,
          images: product.images,
          sellerId: product.sellerId
        };

        router.push({
          pathname: '../../screens/Chat/chatScreen',
          params: {
            channelId: result.channelId,
            productData: JSON.stringify(productInfo) 
          }
        });
      } else {
        Alert.alert('Error', 'Could not create chat room: ' + result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not start chat with seller');
    }
  };

  const handleSellerPress = () => {
    if (!product) return;
    
    router.push({
      pathname: '../../screens/Profile/PublicProfile',
      params: {
        userId: product.sellerId
      }
    });
  };

  const handleBuyNowPress = async () => {
    if (!user) {
      Alert.alert('Notification', 'Please log in to your account to purchase');
      return;
    }
    
    const result = await canUserBuy(user.uid);
    
    if (!result.canBuy) {
      Alert.alert(
        "Cannot Purchase",
        `You need more than 40 trust points to purchase products.\nYour current points: ${result.points}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    setShowBuyNowPopup(true);
  };

  const handleBuyNowConfirm = (addressData: any, shippingFee: number, totalAmount: number) => {
    setShowBuyNowPopup(false);
    setOrderUpdated(prev => prev + 1);
    Alert.alert('Success', 'Purchase request sent successfully!');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const scrollThreshold = 50;
        
        if (currentY > lastScrollY.current + 5) {
          scrollDirection.current = 'down';
        } else if (currentY < lastScrollY.current - 5) {
          scrollDirection.current = 'up';
        }
        
        lastScrollY.current = currentY;
        
        if (scrollDirection.current === 'down' && currentY > scrollThreshold && footerVisible.current) {
          hideFooter();
        } else if (scrollDirection.current === 'up' && !footerVisible.current) {
          showFooter();
        }
      },
      useNativeDriver: false,
    }
  );

  const hideFooter = () => {
    footerVisible.current = false;
    Animated.timing(footerAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showFooter = () => {
    footerVisible.current = true;
    Animated.timing(footerAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const footerTranslateY = footerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 170],
  });

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
    if (!product?.video) {
      return (
        <View style={styles.noVideoSection}>
          <Text style={styles.noVideoText}>🎥 This product has no demo video</Text>
        </View>
      );
    }

    return (
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>🎥 Product Demo Video</Text>
        <View style={styles.videoContainer}>
          <Video
            ref={setVideoRef}
            source={{ uri: product.video }}
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSeller = user?.uid === product.sellerId;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Product's Detail"/>
      
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
            <Text style={styles.title}>{product.title || 'No Title'}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>💰 {product.price?.toLocaleString() || '0'} VND</Text>
          </View>

          <View style={styles.tagsSection}>
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {product.condition === 'like_new' && '🆕 Like New (99%)'}
                  {product.condition === 'used_good' && '👍 Good Condition (70%-80%)'}
                  {product.condition === 'used_fair' && '👌 Fair Condition (50%)'}
                  {!product.condition && 'No Condition'}
                </Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>📁 {product.category || 'Uncategorized'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.description}>{product.description || 'No description available'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.sellerSection}
          onPress={handleSellerPress}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>👤 Seller Information</Text>
          <View style={styles.sellerBox}>
            <View style={styles.sellerInfo}>
              {product.sellerAvatar && (
                <Image 
                  source={{ uri: product.sellerAvatar }} 
                  style={styles.sellerAvatar} 
                />
              )}
              <View style={styles.sellerText}>
                <Text style={styles.sellerName}>{product.sellerName || 'Unknown Seller'}</Text>
              </View> 
              <View style={styles.divider}></View>            
              <View style={styles.followButtonWrapper}>
                <FollowButton 
                  targetUserId={product.sellerId}
                  targetUserName={product.sellerName}
                  onFollowChange={(isFollowing) => {}}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          <View style={styles.locationBox}>
            <Text style={styles.location}>
              {product.address?.fullAddress || 
                `${product.address?.street || ''}, ${product.address?.ward || ''}, ${product.address?.district || ''}, ${product.address?.province || 'Unknown'}`}
            </Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Product Stats</Text>
          <View style={styles.statsBox}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Posted Date:</Text>
              <Text style={styles.statValue}>
                {product.createdAt ? new Date(product.createdAt?.toDate()).toLocaleDateString() : 'Unknown date'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Status:</Text>
              <Text style={styles.statValue}>{product.status || 'Unknown'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Media:</Text>
              <Text style={styles.statValue}>
                {product.images?.length || 0} photos
                {product.video && ' + 1 video'}
              </Text>
            </View>
          </View>
        </View>
        <CommentSection productId={productId}/>
      </Animated.ScrollView>

      <Animated.View style={[
        styles.footer,
        {
          transform: [{ translateY: footerTranslateY }],
        }
      ]}>
        <TouchableOpacity 
          onPress={handleAskAI}
          activeOpacity={0.8}
          style={styles.aiButtonTouchable}
        >
          <LinearGradient
            colors={[ "#effff9ff","#dafff1ff", "#66f2f0ff", "#f2f266ff"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiButtonGradient}
          >
            <Image 
              source={require('../../assets/icons/AI3.gif')} 
              style={styles.aiButtonImage}
            />
            <View style={styles.aiButtonTextContainer}>
              <Text style={styles.aiButtonMainText}>Ask Circlo AI</Text>
              <Text style={styles.aiButtonSubText}>Get instant help & info</Text>
            </View>
            <View style={styles.aiButtonImage}></View>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactSeller}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>💬 Contact Seller</Text>
          </TouchableOpacity>
          
          <BuyButton
            productId={product.id}
            sellerId={product.sellerId}
            onPress={handleBuyNowPress}
            disabled={product.status !== 'active' || isSeller}
            refreshTrigger={orderUpdated}
          />

        </View>
      </Animated.View>

      <BuyNow
        visible={showBuyNowPopup}
        product={product ? {
          id: product.id,
          title: product.title,
          price: product.price,
          images: product.images,
          sellerId: product.sellerId,
          sellerAddress: product.address,
          productType: 'normal'
        } : null}
        onClose={() => setShowBuyNowPopup(false)}
        onConfirm={handleBuyNowConfirm}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom:0,
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
  priceRow: {
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00A86B',
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
  },
  tagsSection: {
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  divider: {
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
  statsSection: {
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
  statsBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  aiButtonTouchable: {
    marginBottom: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#00A86B',
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  aiButtonImage: {
    width: 45,
    height: 45,
    borderRadius: 10,
  },
  aiButtonTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  aiButtonMainText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: '#003b369e',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    textAlign: 'center',
  },
  aiButtonSubText: {
    fontSize: 14,
    color: '#003b36ff',
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00A86B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00A86B',
    paddingHorizontal: 8,
  },
});

export default ProductDetailScreen;