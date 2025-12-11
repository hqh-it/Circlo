import React, { useState } from 'react';
import {
  Image,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
  productType?: 'regular' | 'auction'; // Thêm trường này để phân biệt
}

interface ProductHeaderProps {
  product: ProductInfo;
  onPress?: () => void;
  showHideButton?: boolean; 
  productType?: 'regular' | 'auction'; // Thêm prop này
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ 
  product, 
  onPress, 
  showHideButton = false,
  productType = 'regular' // Giá trị mặc định
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

  const toggleVisibility = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsVisible(!isVisible);
  };

  const handleContainerPress = () => {
    if (onPress && isVisible) {
      onPress();
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.hiddenContainer}
        onPress={toggleVisibility}
        activeOpacity={0.7}
      >
        <View style={styles.hiddenContent}>
          <Text style={styles.hiddenIcon}>
            {productType === 'auction' ? '🏷️' : '📦'}
          </Text>
          <Text style={styles.hiddenText}>
            {productType === 'auction' ? 'Show Auction' : 'Show Product'}
          </Text>
          <Text style={styles.showButton}>▼</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.contentContainer}
        onPress={handleContainerPress}
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
            {productType === 'auction' ? '🏷️ Auction in progress' : '💬 Chatting about this product'}
          </Text>
        </View>

        {/* Arrow Indicator */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Hide Button */}
      {showHideButton && (
        <TouchableOpacity 
          style={styles.hideButton}
          onPress={toggleVisibility}
          activeOpacity={0.6}
        >
          <Text style={styles.hideButtonText}>▲ Hide</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
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
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    padding: 12,
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
    color: '#e8c444ff',
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
  hideButton: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  hideButtonText: {
    fontSize: 12,
    color: '#009a03ff',
    fontWeight: '500',
  },
  hiddenContainer: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    height: 50, 
  },
  hiddenContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hiddenText: {
    fontSize: 14,
    color: '#009a03ff',
    fontWeight: '500',
    marginRight: 8,
  },
  showButton: {
    fontSize: 14,
    color: '#009a03ff',
    fontWeight: 'bold',
  },
});

export default ProductHeader;