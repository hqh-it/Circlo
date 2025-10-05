// services/Product/productService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { uploadToCloudinary, uploadVideoToCloudinary } from '../cloudinaryService';

  // Create new product 
  export const createProduct = async (productData, userId, userData) => {
    try {
      console.log('Creating new product...', { productData, userId });

      // Upload images to Cloudinary
      console.log('Uploading images to Cloudinary...');
      const uploadedImages = [];
      for (const imageUri of productData.images) {
        try {
          const uploadResult = await uploadToCloudinary(imageUri, 'products');
          if (uploadResult.success && uploadResult.url) {
            uploadedImages.push(uploadResult.url);
          } else {
            throw new Error(uploadResult.error || 'Image upload failed');
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
      }

      let videoUrl = null;
      if (productData.video) {
        try {
          console.log('Uploading video to Cloudinary...');
          const videoResult = await uploadVideoToCloudinary(productData.video, 'videos');
          if (videoResult.success && videoResult.url) {
            videoUrl = videoResult.url;
          } else {
            throw new Error(videoResult.error || 'Video upload failed');
          }
        } catch (videoError) {
          console.error('Error uploading video:', videoError);
          throw new Error(`Failed to upload video: ${videoError.message}`);
        }
      }

      // Prepare product data for Firestore
      const productDoc = {
        // Basic product info
        title: productData.title.trim(),
        description: productData.description.trim(),
        price: parseFloat(productData.price),
        condition: productData.condition || 'like_new',
        category: productData.category,
        
        // Media
        images: uploadedImages,
        video: videoUrl, 
        
        // Address
        address: productData.address || {},
        
        // Seller info
        sellerId: userId,
        sellerName: userData?.fullName || 'Unknown Seller',
        sellerAvatar: userData?.avatarURL || null,
        
        // Product status and metrics
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0,
        likeCount: 0,
        
        // Search and filter fields
        searchKeywords: [
          productData.title.toLowerCase(),
          productData.category,
          productData.condition
        ]
      };

      console.log('Saving product to Firestore...', productDoc);

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'products'), productDoc);
      
      console.log('Product created successfully with ID:', docRef.id);
      
      return {
        success: true,
        productId: docRef.id,
        message: 'Product created successfully'
      };

    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create product'
      };
    }
  };

// Get all products
export const getProducts = async (filters = {}) => {
  try {
    let productsQuery = collection(db, 'products');
    
    // Apply filters
    const queryConstraints = [];
    
    // Filter by status (default: active products only)
    if (filters.status) {
      queryConstraints.push(where('status', '==', filters.status));
    } else {
      queryConstraints.push(where('status', '==', 'active'));
    }
    
    // Filter by category
    if (filters.category) {
      queryConstraints.push(where('category', '==', filters.category));
    }
    
    // Filter by condition
    if (filters.condition) {
      queryConstraints.push(where('condition', '==', filters.condition));
    }
    
    // Filter by price range
    if (filters.minPrice) {
      queryConstraints.push(where('price', '>=', parseFloat(filters.minPrice)));
    }
    if (filters.maxPrice) {
      queryConstraints.push(where('price', '<=', parseFloat(filters.maxPrice)));
    }
    
    // Filter by location
    if (filters.province) {
      queryConstraints.push(where('location.province', '==', filters.province));
    }
    if (filters.district) {
      queryConstraints.push(where('location.district', '==', filters.district));
    }
    
    // Add ordering (newest first by default)
    queryConstraints.push(orderBy('createdAt', 'desc'));
    
    const q = query(productsQuery, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      products,
      total: products.length
    };
    
  } catch (error) {
    console.error('Error getting products:', error);
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};

// Get product by ID
export const getProductById = async (productId) => {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Increment view count
      await updateDoc(docRef, {
        viewCount: (docSnap.data().viewCount || 0) + 1
      });
      
      return {
        success: true,
        product: {
          id: docSnap.id,
          ...docSnap.data()
        }
      };
    } else {
      return {
        success: false,
        error: 'Product not found'
      };
    }
  } catch (error) {
    console.error('Error getting product:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get products by seller
export const getProductsBySeller = async (sellerId) => {
  try {
    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      products,
      total: products.length
    };
    
  } catch (error) {
    console.error('Error getting seller products:', error);
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};

// Update product
export const updateProduct = async (productId, updateData) => {
  try {
    const docRef = doc(db, 'products', productId);
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Product updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete product
export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
    
    return {
      success: true,
      message: 'Product deleted successfully'
    };
    
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toggle product like
export const toggleProductLike = async (productId, userId) => {
  try {
    // This would typically involve a separate 'likes' collection
    // For now, we'll just update the like count
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const currentLikes = docSnap.data().likeCount || 0;
      
      // In a real app, you'd check if user already liked this product
      // For simplicity, we'll just increment/decrement
      await updateDoc(docRef, {
        likeCount: currentLikes + 1
      });
      
      return {
        success: true,
        liked: true,
        newLikeCount: currentLikes + 1
      };
    }
    
    return {
      success: false,
      error: 'Product not found'
    };
    
  } catch (error) {
    console.error('Error toggling product like:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Search products
export const searchProducts = async (searchTerm, filters = {}) => {
  try {
    // This is a simple implementation
    // For better search, consider using Algolia or Firebase Extensions
    const { products } = await getProducts(filters);
    
    const searchResults = products.filter(product => 
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return {
      success: true,
      products: searchResults,
      total: searchResults.length
    };
    
  } catch (error) {
    console.error('Error searching products:', error);
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};