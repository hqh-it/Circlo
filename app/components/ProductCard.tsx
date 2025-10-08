import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteProduct, formatPrice, getConditionText, getTimeAgo } from '../../services/Product/productService';

interface ProductCardProps {
  product: {
    id: string;
    images: string[];
    title: string;
    price: number;
    address: {
      district?: string;
      province?: string;
    };
    likeCount: number;
    viewCount?: number;
    sellerAvatar?: string;
    sellerName: string;
    condition?: string;
    createdAt?: any;
  };
  onPress?: () => void;
  onLikePress?: () => void;
  isLiked?: boolean;
  mode?: 'default' | 'profile'; 
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onLikePress,
  isLiked = false,
  mode = 'default',
}) => {
  const router = useRouter();
  
  const handleCardPress = () => {
    router.push({
      pathname: '/screens/Products/product_detail',
      params: { id: product.id }
    });
  };

  const handleEdit = () => {
    router.push(`/screens/Products/edit_product?productId=${product.id}`);
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Product',
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
              console.log('🗑️ Deleting product:', product.id);
              
              const result = await deleteProduct(product.id);
              
              if (result.success) {
                console.log('✅ Product deleted successfully');
                Alert.alert('Success', 'Product has been deleted successfully!');
              } else {
                console.error('❌ Failed to delete product:', result.error);
                Alert.alert('Error', result.error || 'Failed to delete product');
              }
            } catch (error) {
              console.error('❌ Error in handleDelete:', error);
              Alert.alert('Error', 'Something went wrong while deleting the product');
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleCardPress} 
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {/* Gradient Shadow Overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(73, 71, 71, 0.1)', 'rgba(35, 34, 34, 0.54)']}
          locations={[0.4, 0.5, 1]}
          style={styles.gradientShadow}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        
        {/* Title with highlight background */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
        </View>
        
        {/* Seller and Time */}
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
        
        {/* Divider line */}
        <View style={styles.divider} />
        
        {/* Price and Location */}
        <View style={styles.priceLocation}>
          <Text style={styles.price}>💰 {formatPrice(product.price)} VND</Text>
          <Text style={styles.location}>
            📍 {product.address.province || product.address.district || 'Unknown'}
          </Text>
        </View>

        {/* Footer - Condition and Engagement */}
        <View style={styles.footer}>
          <Text style={styles.condition}>
            {getConditionText(product.condition)}
          </Text>
          
          <View style={styles.engagement}>
            {/* View Count */}
            <View style={styles.engagementItem}>
              <Text style={styles.engagementIcon}>👁️</Text>
              <Text style={styles.engagementText}>{product.viewCount || 0}</Text>
            </View>
            
            {/* Like Button with Count */}
            <TouchableOpacity 
              style={[styles.likeButton, isLiked && styles.likeButtonActive]}
              onPress={onLikePress}
            >
              <Text style={[styles.likeIcon, isLiked && styles.likeIconActive]}>
                {isLiked ? '❤️' : '🤍'}
              </Text>
              <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
                {product.likeCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons Row - Only show in profile mode */}
        {mode === 'profile' && (
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
  priceLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#00A86B',
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
    gap: 12,
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
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  likeButtonActive: {
    backgroundColor: '#fff0f3',
    borderColor: '#ff375f',
  },
  likeIcon: {
    fontSize: 14,
  },
  likeIconActive: {
    fontSize: 14,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  likeCountActive: {
    color: '#ff375f',
    fontWeight: '700',
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