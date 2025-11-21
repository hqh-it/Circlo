import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { notificationService } from '../Notification/notificationService';

export const banUser = async (userId, reason = "Violation of terms of service") => {
  try {
    await updateDoc(doc(db, "users", userId), {
      isBanned: true,
      banReason: reason,
      bannedAt: new Date(),
      isActive: false,
      updatedAt: new Date()
    });
    return { success: true, message: "User banned successfully" };
  } catch (error) {
    return { success: false, error: "Failed to ban user" };
  }
};

export const unbanUser = async (userId) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      isBanned: false,
      banReason: null,
      bannedAt: null,
      isActive: true,
      updatedAt: new Date()
    });
    return { success: true, message: "User unbanned successfully" };
  } catch (error) {
    return { success: false, error: "Failed to unban user" };
  }
};

export const suspendUser = async (userId, duration, reason) => {
  try {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + duration);
    
    await updateDoc(doc(db, "users", userId), {
      isSuspended: true,
      suspendReason: reason,
      suspendedUntil: suspendUntil,
      isActive: false,
      updatedAt: new Date()
    });
    return { success: true, message: `User suspended for ${duration} days` };
  } catch (error) {
    return { success: false, error: "Failed to suspend user" };
  }
};

export const unsuspendUser = async (userId) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      isSuspended: false,
      suspendReason: null,
      suspendedUntil: null,
      isActive: true,
      updatedAt: new Date()
    });
    return { success: true, message: "User unsuspended successfully" };
  } catch (error) {
    return { success: false, error: "Failed to unsuspend user" };
  }
};

export const activateUser = async (userId) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      isSuspended: false,
      suspendReason: null,
      suspendedUntil: null,
      isActive: true,
      updatedAt: new Date()
    });
    return { success: true, message: "User activated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to activate user" };
  }
};

export const deactivateUser = async (userId, reason, duration) => {
  try {
    if (duration === 0) {
      await updateDoc(doc(db, "users", userId), {
        suspendReason: reason,
        updatedAt: new Date()
      });
      return { success: true, message: "Warning sent to user" };
    } else if (duration === -1) {
      await updateDoc(doc(db, "users", userId), {
        isSuspended: true,
        suspendReason: reason,
        suspendedUntil: null,
        isActive: false,
        updatedAt: new Date()
      });
      return { success: true, message: "User deactivated permanently" };
    } else {
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + duration);
      
      await updateDoc(doc(db, "users", userId), {
        isSuspended: true,
        suspendReason: reason,
        suspendedUntil: suspendUntil,
        isActive: false,
        updatedAt: new Date()
      });
      return { success: true, message: `User deactivated for ${duration} days` };
    }
  } catch (error) {
    return { success: false, error: "Failed to deactivate user" };
  }
};

export const sendSuspensionNotification = async (userId, reason, duration, actionType) => {
  try {
    let title = '';
    let message = '';
    
    if (actionType === 'warning') {
      title = 'Account Warning';
      message = `You have received a warning: ${reason}`;
    } else if (actionType === 'suspend') {
      if (duration === -1) {
        title = 'Account Deactivated';
        message = `Your account has been permanently deactivated. Reason: ${reason}`;
      } else {
        title = 'Account Suspended';
        message = `Your account has been suspended for ${duration} days. Reason: ${reason}`;
      }
    } else if (actionType === 'unsuspend') {
      title = 'Account Reactivated';
      message = 'Your account has been reactivated and you can now access all features.';
    } else if (actionType === 'ban') {
      title = 'Account Banned';
      message = `Your account has been permanently banned. Reason: ${reason}`;
    } else if (actionType === 'unban') {
      title = 'Account Unbanned';
      message = 'Your account has been unbanned and you can now access all features.';
    }
    
    const notificationData = {
      type: 'admin_action',
      userId: userId,
      title: title,
      message: message,
      data: {
        actionType: actionType,
        reason: reason,
        duration: duration,
        timestamp: new Date()
      }
    };
    
    await notificationService.createNotification(notificationData);
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to send notification' };
  }
};