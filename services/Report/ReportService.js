import {
  addDoc,
  collection,
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
import { uploadReportImage, uploadReportVideo } from '../../services/cloudinaryService';
import { notificationService } from '../Notification/notificationService';

// User Report Functions
export const submitReport = async (reportData) => {
  try {
    console.log('Starting report submission with Cloudinary...');
    let imageUrls = [];
    let videoUrl = null;

    // Upload images to Cloudinary
    if (reportData.images && reportData.images.length > 0) {
      console.log(`Uploading ${reportData.images.length} images to Cloudinary...`);
      
      // Generate a unique report ID for folder organization
      const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      imageUrls = await Promise.all(
        reportData.images.map(async (imageUri, index) => {
          try {
            console.log(`Uploading image ${index + 1}: ${imageUri.substring(0, 50)}...`);
            const uploadResult = await uploadReportImage(imageUri, tempReportId);
            
            if (uploadResult.success && uploadResult.url) {
              console.log(`✅ Image ${index + 1} uploaded successfully`);
              return uploadResult.url;
            } else {
              console.error(`❌ Failed to upload image ${index + 1}:`, uploadResult.error);
              // Don't throw error here, just skip this image and continue
              return null;
            }
          } catch (error) {
            console.error(`❌ Error uploading image ${index + 1}:`, error);
            // Skip this image but continue with others
            return null;
          }
        })
      );
      
      // Filter out any failed uploads (null values)
      imageUrls = imageUrls.filter(url => url !== null);
      console.log(`Successfully uploaded ${imageUrls.length} images`);
    }

    // Upload video to Cloudinary
    if (reportData.video) {
      console.log('Uploading video to Cloudinary...');
      
      try {
        const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const videoUploadResult = await uploadReportVideo(reportData.video, tempReportId);
        
        if (videoUploadResult.success && videoUploadResult.url) {
          videoUrl = videoUploadResult.url;
          console.log('✅ Video uploaded successfully');
        } else {
          console.error('❌ Failed to upload video:', videoUploadResult.error);
          // Continue without video if upload fails
        }
      } catch (error) {
        console.error('❌ Error uploading video:', error);
        // Continue without video if upload fails
      }
    }

    // Prepare report document
    const reportDoc = {
      reporterId: reportData.reporterId,
      reportedUserId: reportData.reportedUserId,
      reason: reportData.reason,
      description: reportData.description,
      level: reportData.level,
      images: imageUrls,
      video: videoUrl,
      status: 'pending',
      createdAt: serverTimestamp(),
      customReason: reportData.customReason || '',
      userName: reportData.userName,
      reportedUserName: reportData.reportedUserName
    };

    console.log('Saving report to Firestore...');

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'reports'), reportDoc);
    console.log('✅ Report saved to Firestore with ID:', docRef.id);
    
    // Create notification
    try {
      await notificationService.createReportNotification({
        reportId: docRef.id,
        reporterId: reportData.reporterId,
        reportedUserId: reportData.reportedUserId,
        reporterName: reportData.userName,
        reportedUserName: reportData.reportedUserName,
        reason: reportData.reason,
        level: reportData.level,
        description: reportData.description,
        hasImages: imageUrls.length > 0,
        hasVideo: !!videoUrl
      });
      console.log('✅ Notification created');
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the whole report if notification fails
    }

    console.log('🎉 Report submission completed successfully');
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error submitting report:', error);
    return { success: false, error: error.message };
  }
};

// Admin Report Functions
export const updateReportStatus = async (reportId, status) => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      status: status,
      updatedAt: new Date()
    });

    return { success: true, message: 'Report status updated successfully' };
  } catch (error) {
    console.error('Error updating report status:', error);
    return { success: false, error: error.message };
  }
};

export const getReportById = async (reportId) => {
  try {
    const reportDoc = await getDoc(doc(db, 'reports', reportId));
    if (reportDoc.exists()) {
      return { 
        success: true, 
        data: { 
          id: reportDoc.id, 
          ...reportDoc.data() 
        } 
      };
    } else {
      return { success: false, error: 'Report not found' };
    }
  } catch (error) {
    console.error('Error getting report:', error);
    return { success: false, error: error.message };
  }
};

export const getReportsByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting reports by status:', error);
    return { success: false, error: error.message };
  }
};

export const getAllReports = async () => {
  try {
    const q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting all reports:', error);
    return { success: false, error: error.message };
  }
};

export const getReportsByLevel = async (level) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('level', '==', level),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting reports by level:', error);
    return { success: false, error: error.message };
  }
};

export const getReportsByUserId = async (userId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('reportedUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting reports by user ID:', error);
    return { success: false, error: error.message };
  }
};

// Constants
export const reportReasons = [
  {
    id: 'warning_spam',
    label: 'Minor spam',
    category: 'behavior',
    level: 'WARNING',
    duration: 0
  },
  {
    id: 'warning_late_response',
    label: 'Late response',
    category: 'behavior',
    level: 'WARNING',
    duration: 0
  },
  {
    id: 'low_fake_bidding',
    label: 'Fake bidding',
    category: 'behavior',
    level: 'LOW',
    duration: 1
  },
  {
    id: 'low_minor_spam',
    label: 'Post spam',
    category: 'behavior',
    level: 'LOW',
    duration: 1
  },
  {
    id: 'medium_false_images',
    label: 'Misleading images',
    category: 'product',
    level: 'MEDIUM',
    duration: 3
  },
  {
    id: 'medium_product_misrepresentation',
    label: 'Product not as described',
    category: 'product',
    level: 'MEDIUM',
    duration: 3
  },
  {
    id: 'high_harassment',
    label: 'User harassment',
    category: 'behavior',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'high_fake_contact',
    label: 'Fake contact info',
    category: 'behavior',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'high_no_delivery',
    label: 'No delivery after payment',
    category: 'security',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'permanent_fraud',
    label: 'Organized fraud',
    category: 'security',
    level: 'PERMANENT',
    duration: -1
  },
  {
    id: 'permanent_prohibited_item',
    label: 'Selling prohibited items',
    category: 'product',
    level: 'PERMANENT',
    duration: -1
  },
  {
    id: 'permanent_repeat_offender',
    label: 'Repeat offender',
    category: 'other',
    level: 'PERMANENT',
    duration: -1
  }
];

export const levelConfig = {
  WARNING: { label: 'Warning', color: '#ffa500' },
  LOW: { label: 'Low', color: '#ff6b00' },
  MEDIUM: { label: 'Medium', color: '#dc3545' },
  HIGH: { label: 'High', color: '#8b0000' },
  PERMANENT: { label: 'Permanent', color: '#000000' }
};

export const reportStatusConfig = {
  pending: { label: 'Pending', color: '#FFA500' },
  reviewed: { label: 'Reviewed', color: '#2196F3' },
  resolved: { label: 'Resolved', color: '#00A86B' },
  rejected: { label: 'Rejected', color: '#dc3545' }
};

export const resolveReport = async (reportId, reason, duration) => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    
    await updateDoc(reportRef, {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
      actionTaken: {
        type: 'suspension',
        reason: reason,
        duration: duration
      }
    });

    return { success: true, message: 'Report resolved successfully' };
  } catch (error) {
    console.error('Error resolving report:', error);
    return { success: false, error: error.message };
  }
};