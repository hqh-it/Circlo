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

const convertFirestoreTimestamp = (timestamp) => {
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

export const createAuctionProduct = async (productData, auctionSettings, userId, userData) => {
  try {
    const uploadedImages = [];
    for (const imageUri of productData.images) {
      const uploadResult = await uploadToCloudinary(imageUri, 'auctions');
      if (uploadResult.success && uploadResult.url) {
        uploadedImages.push(uploadResult.url);
      } else {
        throw new Error(uploadResult.error || 'Image upload failed');
      }
    }

    let videoUrl = null;
    if (productData.video) {
      const videoResult = await uploadVideoToCloudinary(productData.video, 'auction_videos');
      if (videoResult.success && videoResult.url) {
        videoUrl = videoResult.url;
      }
    }

    const auctionDoc = {
      title: productData.title.trim(),
      description: productData.description.trim(),
      startPrice: parseFloat(productData.price),
      currentBid: parseFloat(productData.price),
      condition: productData.condition || 'like_new',
      category: productData.category,
      
      images: uploadedImages,
      video: videoUrl,
      
      address: productData.address || {},
      
      sellerId: userId,
      sellerName: userData?.fullName || 'Unknown Seller',
      sellerAvatar: userData?.avatarURL || null,
      
      auctionInfo: {
        startTime: auctionSettings.startTime,
        endTime: auctionSettings.endTime,
        bidIncrement: parseFloat(auctionSettings.bidIncrement),
        buyNowPrice: auctionSettings.buyNowPrice ? parseFloat(auctionSettings.buyNowPrice) : null,
        bidCount: 0,
        highestBidder: null,
        status: 'pending'
      },
      
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      viewCount: 0,
      
      searchKeywords: [
        productData.title.toLowerCase(),
        productData.category,
        productData.condition
      ]
    };

    const docRef = await addDoc(collection(db, 'auction_products'), auctionDoc);
    
    return {
      success: true,
      productId: docRef.id,
      message: 'Auction product created successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to create auction product'
    };
  }
};

export const getAuctionProducts = async (filters = {}) => {
  try {
    let auctionsQuery = collection(db, 'auction_products');
    const queryConstraints = [];
    
    if (filters.status) {
      queryConstraints.push(where('status', '==', filters.status));
    } else {
      queryConstraints.push(where('status', '==', 'active'));
    }
    
    if (filters.auctionStatus) {
      queryConstraints.push(where('auctionInfo.status', '==', filters.auctionStatus));
    }
    
    if (filters.category) {
      queryConstraints.push(where('category', '==', filters.category));
    }
    
    if (filters.condition) {
      queryConstraints.push(where('condition', '==', filters.condition));
    }
    
    if (filters.minPrice) {
      queryConstraints.push(where('currentBid', '>=', parseFloat(filters.minPrice)));
    }
    if (filters.maxPrice) {
      queryConstraints.push(where('currentBid', '<=', parseFloat(filters.maxPrice)));
    }
    
    if (filters.province) {
      queryConstraints.push(where('address.provinceCode', '==', filters.province));
    }
    
    queryConstraints.push(orderBy('createdAt', 'desc'));
    
    const q = query(auctionsQuery, ...queryConstraints);
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
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};

export const getAuctionProductById = async (productId) => {
  try {
    const docRef = doc(db, 'auction_products', productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const now = new Date();
      const endTime = convertFirestoreTimestamp(data.auctionInfo.endTime);
      
      if (endTime < now && data.auctionInfo.status === 'active') {
        await updateDoc(docRef, {
          'auctionInfo.status': 'ended',
          updatedAt: serverTimestamp()
        });
        
        const updatedSnap = await getDoc(docRef);
        await updateDoc(docRef, {
          viewCount: (data.viewCount || 0) + 1
        });
        
        return {
          success: true,
          product: {
            id: docSnap.id,
            ...updatedSnap.data()
          }
        };
      }
      
      await updateDoc(docRef, {
        viewCount: (data.viewCount || 0) + 1
      });
      
      return {
        success: true,
        product: {
          id: docSnap.id,
          ...data
        }
      };
    } else {
      return {
        success: false,
        error: 'Auction product not found'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateAuctionProduct = async (productId, productData, auctionSettings, existingImages) => {
  try {
    const uploadedImages = [];
    
    for (const imageUri of productData.images) {
      if (imageUri.startsWith('http')) {
        uploadedImages.push(imageUri);
      } else {
        const uploadResult = await uploadToCloudinary(imageUri, 'auctions');
        if (uploadResult.success && uploadResult.url) {
          uploadedImages.push(uploadResult.url);
        } else {
          throw new Error(uploadResult.error || 'Image upload failed');
        }
      }
    }

    let videoUrl = productData.video;
    if (productData.video && !productData.video.startsWith('http')) {
      const videoResult = await uploadVideoToCloudinary(productData.video, 'auction_videos');
      if (videoResult.success && videoResult.url) {
        videoUrl = videoResult.url;
      }
    }

    const updateData = {
      title: productData.title.trim(),
      description: productData.description.trim(),
      startPrice: parseFloat(productData.price),
      currentBid: parseFloat(productData.price),
      condition: productData.condition,
      category: productData.category,
      images: uploadedImages,
      video: videoUrl,
      address: productData.address,
      'auctionInfo.startTime': auctionSettings.startTime,
      'auctionInfo.endTime': auctionSettings.endTime,
      'auctionInfo.bidIncrement': parseFloat(auctionSettings.bidIncrement),
      'auctionInfo.buyNowPrice': auctionSettings.buyNowPrice ? parseFloat(auctionSettings.buyNowPrice) : null,
      'auctionInfo.status': 'active',
      updatedAt: serverTimestamp()
    };

    const docRef = doc(db, 'auction_products', productId);
    
    await updateDoc(docRef, updateData);
    
    return {
      success: true,
      message: 'Auction product updated successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const deleteAuctionProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'auction_products', productId));
    
    return {
      success: true,
      message: 'Auction product deleted successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const placeBid = async (productId, bidAmount, userId) => {
  try {
    const productResult = await getAuctionProductById(productId);
    if (!productResult.success) {
      throw new Error('Auction product not found');
    }

    const product = productResult.product;
    const auctionInfo = product.auctionInfo;

    if (bidAmount <= auctionInfo.currentBid) {
      throw new Error('Bid amount must be higher than current bid');
    }

    const updateData = {
      currentBid: bidAmount,
      'auctionInfo.highestBidder': userId,
      'auctionInfo.bidCount': (auctionInfo.bidCount || 0) + 1,
      updatedAt: serverTimestamp()
    };

    const docRef = doc(db, 'auction_products', productId);
    await updateDoc(docRef, updateData);

    return {
      success: true,
      message: 'Bid placed successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const getAuctionProductsByUser = async (userId) => {
  try {
    const auctionsQuery = query(
      collection(db, 'auction_products'),
      where('sellerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(auctionsQuery);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const now = new Date();
      const endTime = convertFirestoreTimestamp(data.auctionInfo.endTime);
      
      if (endTime < now && data.auctionInfo.status === 'active') {
        updateDoc(doc.ref, {
          'auctionInfo.status': 'ended',
          updatedAt: serverTimestamp()
        });
        
        products.push({
          id: doc.id,
          ...data,
          auctionInfo: {
            ...data.auctionInfo,
            status: 'ended'
          }
        });
      } else {
        products.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return {
      success: true,
      products,
      total: products.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};

export const searchAuctionProducts = async (searchTerm, filters = {}) => {
  try {
    const result = await getAuctionProducts(filters);
    
    if (!result.success) {
      return result;
    }
    
    const searchResults = result.products.filter(product => {
      const searchableText = (
        product.title?.toLowerCase() + 
        ' ' + 
        product.description?.toLowerCase() +
        ' ' +
        product.category?.toLowerCase()
      );
      
      return searchableText.includes(searchTerm.toLowerCase());
    });
    
    return {
      success: true,
      products: searchResults,
      total: searchResults.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};

export const getAuctionProductsByFilter = async (filters = {}) => {
  try {
    let auctionsQuery = collection(db, 'auction_products');
    const queryConstraints = [where('status', '==', 'active')];
    
    if (filters.categories && filters.categories.length > 0) {
      queryConstraints.push(where('category', 'in', filters.categories));
    }
    
    if (filters.conditions && filters.conditions.length > 0) {
      queryConstraints.push(where('condition', 'in', filters.conditions));
    }
    
    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      queryConstraints.push(where('currentBid', '>=', parseFloat(filters.minPrice)));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      queryConstraints.push(where('currentBid', '<=', parseFloat(filters.maxPrice)));
    }
    
    if (filters.location) {
      queryConstraints.push(where('address.provinceCode', '==', filters.location));
    }
    
    if (filters.auctionStatus) {
      queryConstraints.push(where('auctionInfo.status', '==', filters.auctionStatus));
    }
    
    if (filters.sort) {
      switch (filters.sort) {
        case 'price_low_high':
          queryConstraints.push(orderBy('currentBid', 'asc'));
          break;
        case 'price_high_low':
          queryConstraints.push(orderBy('currentBid', 'desc'));
          break;
        default:
          queryConstraints.push(orderBy('createdAt', 'desc'));
      }
    } else {
      queryConstraints.push(orderBy('createdAt', 'desc'));
    }
    
    const q = query(auctionsQuery, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      const auctionData = doc.data();
      products.push({
        id: doc.id,
        ...auctionData
      });
    });
    
    return {
      success: true,
      products,
      total: products.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      products: [],
      total: 0
    };
  }
};