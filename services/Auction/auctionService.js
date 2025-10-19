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

export const createAuctionProduct = async (productData, auctionSettings, userId, userData) => {
  try {
    console.log('Creating auction product with user data:', { userId, userData });

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
        status: 'active'
      },
      
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      viewCount: 0,
      
      searchKeywords: [
        productData.title.toLowerCase(),
        productData.category,
        productData.condition
      ]
    };

    console.log('Auction document to save:', auctionDoc);

    const docRef = await addDoc(collection(db, 'auction_products'), auctionDoc);
    
    console.log('Auction product created successfully with ID:', docRef.id);
    
    return {
      success: true,
      productId: docRef.id,
      message: 'Auction product created successfully'
    };

  } catch (error) {
    console.error('Error creating auction product:', error);
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

export const updateAuctionProduct = async (productId, updateData) => {
  try {
    const docRef = doc(db, 'auction_products', productId);
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
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
      auctionInfo: {
        ...auctionInfo,
        currentBid: bidAmount,
        bidCount: auctionInfo.bidCount + 1,
        highestBidder: userId
      }
    };

    const result = await updateAuctionProduct(productId, updateData);
    return result;
  } catch (error) {
    throw new Error(`Failed to place bid: ${error.message}`);
  }
};

export const updateAuctionStatus = async (productId, status) => {
  try {
    const updateData = {
      'auctionInfo.status': status
    };

    const result = await updateAuctionProduct(productId, updateData);
    return result;
  } catch (error) {
    throw new Error(`Failed to update auction status: ${error.message}`);
  }
};

export const getActiveAuctions = async () => {
  try {
    const filters = {
      status: 'active'
    };
    
    const result = await getAuctionProducts(filters);
    return result;
  } catch (error) {
    throw new Error(`Failed to get active auctions: ${error.message}`);
  }
};

export const getExpiredAuctions = async () => {
  try {
    const now = new Date();
    const allAuctions = await getAuctionProducts();
    
    if (!allAuctions.success) {
      return allAuctions;
    }

    const expiredAuctions = allAuctions.products.filter(product => 
      new Date(product.auctionInfo.endTime) < now
    );

    return {
      success: true,
      products: expiredAuctions,
      total: expiredAuctions.length
    };
  } catch (error) {
    throw new Error(`Failed to get expired auctions: ${error.message}`);
  }
};