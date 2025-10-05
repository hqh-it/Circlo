// components/ProductCard.tsx
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
    sellerAvatar?: string;
    sellerName: string;
    condition?: string;
    createdAt?: any;
  };
  onPress?: () => void;
  onLikePress?: () => void;
  isLiked?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onLikePress,
  isLiked = false,
}) => {
  // Format price
  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}TR`;
    }
    if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toString();
  };

  // Format time ago - FIXED VERSION
  const getTimeAgo = (createdAt: any): string => {
    if (!createdAt) return 'Vừa xong';
    
    try {
      const now = new Date();
      const created = createdAt.toDate();
      
      // ✅ FIX: Convert to timestamps before subtraction
      const nowTimestamp = now.getTime();
      const createdTimestamp = created.getTime();
      const diffInMinutes = Math.floor((nowTimestamp - createdTimestamp) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Vừa xong';
      if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
      return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
    } catch (error) {
      return 'Vừa xong';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Seller Info & Time */}
      <View style={styles.header}>
        <View style={styles.sellerInfo}>
          {product.sellerAvatar && (
            <Image 
              source={{ uri: product.sellerAvatar }} 
              style={styles.avatar} 
            />
          )}
          <View style={styles.sellerText}>
            <Text style={styles.sellerName}>{product.sellerName}</Text>
            <Text style={styles.timeAgo}>
              {getTimeAgo(product.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Product Image */}
      <Image
        source={{ uri: product.images[0] }}
        style={styles.productImage}
        resizeMode="cover"
      />

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        
        <View style={styles.priceLocation}>
          <Text style={styles.price}>💰 {formatPrice(product.price)} VND</Text>
          <Text style={styles.location}>
            📍 {product.address.district || product.address.province || 'Unknown'}
          </Text>
        </View>

        {/* Condition & Like */}
        <View style={styles.footer}>
          <Text style={styles.condition}>
            {product.condition === 'like_new' && '🆕 Like New'}
            {product.condition === 'used_good' && '👍 Good Condition'}
            {product.condition === 'used_fair' && '👌 Fair Condition'}
          </Text>
          
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={onLikePress}
          >
            <Text style={[styles.likeText, isLiked && styles.likedText]}>
              ❤️ {product.likeCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  sellerText: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  productInfo: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  priceLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  condition: {
    fontSize: 14,
    color: '#666',
  },
  likeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  likedText: {
    color: '#ff375f',
  },
});

export default ProductCard;