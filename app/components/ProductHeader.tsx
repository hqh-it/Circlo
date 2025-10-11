// components/ProductHeader.tsx
import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
}

interface ProductHeaderProps {
  product: ProductInfo;
  onPress?: () => void;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ product, onPress }) => {
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {firstImage ? (
          <Image 
            source={{ uri: firstImage }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>📷</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title || 'No Title'}
        </Text>
        <Text style={styles.productPrice}>
          {product.price?.toLocaleString() || '0'} VND
        </Text>
        <Text style={styles.productStatus}>
          💬 Chatting about this product
        </Text>
      </View>

      {/* Arrow Indicator */}
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 20,
    color: '#999',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 4,
  },
  productStatus: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
});

export default ProductHeader;