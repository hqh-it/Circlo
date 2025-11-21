import { notificationService } from '../Notification/notificationService';

export const sendWarningToUser = async (userId, reason = "Account warning from administrator") => {
  try {
    const notificationData = {
      type: 'admin_warning',
      userId: userId,
      title: 'Account Warning',
      message: `You have received a warning from administrator: ${reason}`,
      data: {
        actionType: 'warning',
        reason: reason,
        timestamp: new Date()
      }
    };
    
    const result = await notificationService.createNotification(notificationData);
    
    if (result) {
      return { success: true, message: 'Warning sent successfully' };
    } else {
      return { success: false, error: 'Failed to send warning notification' };
    }
  } catch (error) {
    console.error('Error sending warning:', error);
    return { success: false, error: 'Failed to send warning' };
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