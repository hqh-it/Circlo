import { Platform } from 'react-native';

const CLOUDINARY_CLOUD_NAME = 'dteznwndm';
const CLOUDINARY_UPLOAD_PRESET = 'Circlo';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadToCloudinary = async (
  imageUri: string, 
  folder: string = 'avatars'
): Promise<UploadResult> => {
  try {
    console.log('Starting upload to Cloudinary...');
    console.log('Uploading to folder:', folder);
    
    const formData = new FormData();
    const uri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
    
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg',
      name: `upload_${Date.now()}.jpg`,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    console.log('Sending to Cloudinary...');
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    const data = await response.json();
    console.log('Cloudinary response:', data);
    
    if (data.secure_url) {
      console.log('Upload successful!');
      console.log('Image URL:', data.secure_url);
      return {
        success: true,
        url: data.secure_url
      };
    } else {
      console.log('Upload failed:', data.error?.message);
      return {
        success: false,
        error: data.error?.message || 'Upload failed'
      };
    }
    
  } catch (error: any) {
    console.log('Upload error:', error);
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
};

export const uploadVideoToCloudinary = async (
  videoUri: string, 
  folder: string = 'videos'
): Promise<UploadResult> => {
  try {
    console.log('Starting video upload to Cloudinary...');
    
    const formData = new FormData();
    const uri = Platform.OS === 'ios' ? videoUri.replace('file://', '') : videoUri;
    
    formData.append('file', {
      uri: uri,
      type: 'video/mp4',
      name: `video_${Date.now()}.mp4`,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    const data = await response.json();
    console.log('Cloudinary video upload response:', data);
    
    if (data.secure_url) {
      console.log('Video upload successful! URL:', data.secure_url);
      return {
        success: true,
        url: data.secure_url
      };
    } else {
      console.log('Video upload failed:', data.error?.message);
      return {
        success: false,
        error: data.error?.message || 'Video upload failed'
      };
    }
    
  } catch (error: any) {
    console.log('Video upload error:', error);
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
};

// Helper function for avatar upload
export const uploadAvatar = async (imageUri: string, userId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `avatars/${userId}`);
};

// Helper function for product image upload
export const uploadProductImage = async (imageUri: string, productId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `products/${productId}`);
};

// Helper function for product video upload
export const uploadProductVideo = async (videoUri: string, productId: string): Promise<UploadResult> => {
  return uploadVideoToCloudinary(videoUri, `products/${productId}/videos`);
};

// Helper function for report image upload
export const uploadReportImage = async (imageUri: string, reportId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `reports/${reportId}/images`);
};

// Helper function for report video upload
export const uploadReportVideo = async (videoUri: string, reportId: string): Promise<UploadResult> => {
  return uploadVideoToCloudinary(videoUri, `reports/${reportId}/videos`);
};

// Helper function for chat image upload
export const uploadChatImage = async (imageUri: string, channelId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `chats/${channelId}/images`);
};

// Helper function for chat video upload
export const uploadChatVideo = async (videoUri: string, channelId: string): Promise<UploadResult> => {
  return uploadVideoToCloudinary(videoUri, `chats/${channelId}/videos`);
};