import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { loadUserProfile } from '../User/userService';

const COMMENTS_COLLECTION = 'comments';

export const addComment = async (productId, user, text) => {
  try {
    if (!productId || !user || !user.uid || !text) {
      throw new Error('Missing required fields');
    }

    if (text.trim().length === 0) {
      throw new Error('Comment text cannot be empty');
    }

    if (text.length > 500) {
      throw new Error('Comment text cannot exceed 500 characters');
    }

    // Get user data from userService
    const userData = await loadUserProfile(user);

    // Use fullName and avatarURL from Firestore
    const userName = userData?.fullName || user.displayName || user.email?.split('@')[0] || 'User';
    const userAvatar = userData?.avatarURL || user.photoURL || null;

    const commentData = {
      productId: productId,
      userId: user.uid,
      userName: userName,
      userAvatar: userAvatar,
      text: text.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), commentData);
    
    return {
      success: true,
      commentId: docRef.id,
      message: 'Comment added successfully'
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getCommentsByProductId = async (productId) => {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('productId', '==', productId)
    );

    const querySnapshot = await getDocs(q);
    const comments = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      
      // Get user data for each comment
      const userData = await loadUserProfile({ uid: data.userId });
      
      const comment = {
        id: doc.id,
        productId: data.productId,
        userId: data.userId,
        userName: userData?.fullName || data.userName || 'Unknown User',
        userAvatar: userData?.avatarURL || data.userAvatar || null,
        text: data.text || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      
      comments.push(comment);
    }

    // Sort by creation date (newest first)
    comments.sort((a, b) => b.createdAt - a.createdAt);

    return {
      success: true,
      comments: comments
    };
  } catch (error) {
    console.error('Error getting comments:', error);
    return {
      success: false,
      error: error.message,
      comments: []
    };
  }
};

export const deleteComment = async (commentId, userId) => {
  try {
    if (!commentId || !userId) {
      throw new Error('Comment ID and User ID are required');
    }

    const commentDoc = await getDoc(doc(db, COMMENTS_COLLECTION, commentId));
    
    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentDoc.data();
    
    if (commentData.userId !== userId) {
      throw new Error('You can only delete your own comments');
    }

    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    
    return {
      success: true,
      message: 'Comment deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateComment = async (commentId, userId, newText) => {
  try {
    if (!commentId || !userId || !newText) {
      throw new Error('Comment ID, User ID, and text are required');
    }

    if (newText.trim().length === 0) {
      throw new Error('Comment text cannot be empty');
    }

    if (newText.length > 500) {
      throw new Error('Comment text cannot exceed 500 characters');
    }

    const commentDoc = await getDoc(doc(db, COMMENTS_COLLECTION, commentId));
    
    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentDoc.data();
    
    if (commentData.userId !== userId) {
      throw new Error('You can only edit your own comments');
    }

    await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
      text: newText.trim(),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Comment updated successfully'
    };
  } catch (error) {
    console.error('Error updating comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getCommentCount = async (productId) => {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const result = await getCommentsByProductId(productId);
    
    return {
      success: result.success,
      count: result.comments.length,
      error: result.error
    };
  } catch (error) {
    console.error('Error getting comment count:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
};

export const getCommentsByUserId = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const comments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        userName: data.userName || 'Unknown User',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    comments.sort((a, b) => b.createdAt - a.createdAt);

    return {
      success: true,
      comments: comments
    };
  } catch (error) {
    console.error('Error getting user comments:', error);
    return {
      success: false,
      error: error.message,
      comments: []
    };
  }
};

export const hasUserCommented = async (productId, userId) => {
  try {
    if (!productId || !userId) {
      throw new Error('Product ID and User ID are required');
    }

    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('productId', '==', productId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    
    return {
      success: true,
      hasCommented: !querySnapshot.empty,
      commentCount: querySnapshot.size
    };
  } catch (error) {
    console.error('Error checking user comment:', error);
    return {
      success: false,
      error: error.message,
      hasCommented: false
    };
  }
};