// services/cloudinaryService.ts
import { Platform } from 'react-native';

// THAY THẾ CÁC GIÁ TRỊ NÀY BẰNG THÔNG TIN CỦA BẠN
const CLOUDINARY_CLOUD_NAME = 'dteznwndm'; // Cloud Name của bạn
const CLOUDINARY_UPLOAD_PRESET = 'Circlo'; // Upload Preset của bạn

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
    console.log(' Starting upload to Cloudinary...');
    console.log(' Uploading to folder:', folder);
    
    // Tạo form data
    const formData = new FormData();
    
    // Xử lý URI cho iOS/Android
    const uri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
    
    // Thêm file vào form data
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg',
      name: `upload_${Date.now()}.jpg`,
    } as any);
    
    // Thêm upload preset và folder
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    console.log(' Sending to Cloudinary...');
    
    // Gửi request đến Cloudinary
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
    console.log(' Cloudinary response:', data);
    
    if (data.secure_url) {
      console.log('Upload successful!');
      console.log('Image URL:', data.secure_url);
      return {
        success: true,
        url: data.secure_url
      };
    } else {
      console.log(' Upload failed:', data.error?.message);
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

// Helper function cho avatar upload
export const uploadAvatar = async (imageUri: string, userId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `avatars/${userId}`);
};

// Helper function cho product image upload
export const uploadProductImage = async (imageUri: string, productId: string): Promise<UploadResult> => {
  return uploadToCloudinary(imageUri, `products/${productId}`);
};