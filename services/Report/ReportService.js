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

const rejectionReasons = [
  "Insufficient evidence",
  "False report",
  "Duplicate report",
  "Report does not violate policies",
  "Personal dispute",
  "Other"
];

export const submitReport = async (reportData) => {
  try {
    let imageUrls = [];
    let videoUrl = null;

    if (reportData.images && reportData.images.length > 0) {
      const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      imageUrls = await Promise.all(
        reportData.images.map(async (imageUri, index) => {
          try {
            const uploadResult = await uploadReportImage(imageUri, tempReportId);
            return uploadResult.success && uploadResult.url ? uploadResult.url : null;
          } catch (error) {
            return null;
          }
        })
      );
      
      imageUrls = imageUrls.filter(url => url !== null);
    }

    if (reportData.video) {
      try {
        const tempReportId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const videoUploadResult = await uploadReportVideo(reportData.video, tempReportId);
        
        if (videoUploadResult.success && videoUploadResult.url) {
          videoUrl = videoUploadResult.url;
        }
      } catch (error) {
      }
    }

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

    const docRef = await addDoc(collection(db, 'reports'), reportDoc);
    
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
    } catch (notificationError) {
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateReportStatus = async (reportId, status, rejectReason, customRejectReason) => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    const updateData = {
      status: status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'rejected') {
      updateData.rejectReason = rejectReason;
      updateData.customRejectReason = customRejectReason || '';
      updateData.rejectedAt = serverTimestamp();
    }
    
    await updateDoc(reportRef, updateData);

    return { success: true, message: 'Report status updated successfully' };
  } catch (error) {
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
    return { success: false, error: error.message };
  }
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

    await notificationService.createReportResolvedNotification(reportId, reason, duration);

    return { success: true, message: 'Report resolved successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const rejectReport = async (reportId, rejectReason, customRejectReason) => {
  try {
    const result = await updateReportStatus(reportId, 'rejected', rejectReason, customRejectReason);
    
    if (result.success) {
      await notificationService.createReportRejectedNotification(reportId, rejectReason, customRejectReason);
    }
    
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getRejectionReasons = () => {
  return rejectionReasons;
};

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