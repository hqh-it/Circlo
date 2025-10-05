import { Picker } from '@react-native-picker/picker';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../../services/Auth/AuthContext';
import { createProduct } from '../../../services/Product/productService';
import { fetchDistricts, fetchProvinces, fetchWards, getFullAddress } from '../../../services/User/address';
import { loadUserData } from '../../../services/User/userService';
import AddressPicker from '../../components/AddressPicker';
import Header from "../../components/header_for_detail";

interface Category {
  label: string;
  value: string;
}

interface Condition {
  label: string;
  value: string;
}

interface AddressItem {
  code: string;
  name: string;
  parent_code?: string;
}

interface UserAddress {
  street?: string;
  province?: string;
  district?: string;
  ward?: string;
  fullAddress?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
}

const AddProduct = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [condition, setCondition] = useState<string>('like_new');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [images, setImages] = useState<string[]>([]); 
  const [video, setVideo] = useState<string | null>(null); 
  const [loading, setLoading] = useState<boolean>(false); // ✅ THÊM LOADING STATE
  
  // State for address
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [districts, setDistricts] = useState<AddressItem[]>([]);
  const [wards, setWards] = useState<AddressItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  
  // State for radio buttons and new address
  const [useDefaultAddress, setUseDefaultAddress] = useState<boolean>(true);
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [customAddressConfirmed, setCustomAddressConfirmed] = useState<boolean>(false);
  const [customAddressFull, setCustomAddressFull] = useState<string>('');
  const [userData, setUserData] = useState<any>(null); // ✅ THÊM USER DATA

  // Product categories
  const categories: Category[] = [
    { label: 'Select Category', value: '' },
    { label: '👕 Fashion - Accessories', value: 'fashion' },
    { label: '🏠 Home - Furniture', value: 'home' },
    { label: '📚 Books - Stationery', value: 'books' },
    { label: '🎮 Toys - Entertainment', value: 'toys' },
    { label: '🎁 Others', value: 'other' }
  ];

  // Product conditions
  const conditions: Condition[] = [
    { label: 'Like New (99%)', value: 'like_new' },
    { label: 'Good Condition (70%-80%)', value: 'used_good' },
    { label: 'Fair Condition (50%)', value: 'used_fair' }
  ];

  // Load provinces on mount
  useEffect(() => {
    const data = fetchProvinces();
    setProvinces(Array.isArray(data) ? data : []);
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const data = fetchDistricts(selectedProvince);
      setDistricts(Array.isArray(data) ? data : []);
      // Reset district and ward when province changes
      setSelectedDistrict('');
      setSelectedWard('');
      setWards([]);
    }
  }, [selectedProvince]);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const data = fetchWards(selectedDistrict);
      setWards(Array.isArray(data) ? data : []);
      setSelectedWard('');
    }
  }, [selectedDistrict]);

  // Load user address and user data when component mounts
  useEffect(() => {
    const loadUserAddress = async () => {
      if (!user) {
        console.log('No user found');
        return;
      }
      
      try {
        console.log('Loading user data for address...');
        const userData = await loadUserData(user);
        setUserData(userData); // ✅ LƯU USER DATA
        
        if (userData?.address) {
          // Store the complete address object like in PersonalInfo
          const addressData: UserAddress = {
            street: userData.address.street || '',
            province: userData.address.province || '',
            district: userData.address.district || '',
            ward: userData.address.ward || '',
            fullAddress: userData.address.fullAddress || '',
            provinceCode: userData.address.provinceCode || '',
            districtCode: userData.address.districtCode || '',
            wardCode: userData.address.wardCode || ''
          };
          
          setUserAddress(addressData);
          console.log('User address loaded:', addressData);
        } else {
          console.log('No address found in user data');
        }
      } catch (error) {
        console.error('Error loading user address:', error);
      }
    };

    loadUserAddress();
  }, [user]);

  // Function to display full address like in PersonalInfo
  const getDisplayAddress = (): string => {
    if (!userAddress) return "No default address available";
    
    // Use fullAddress if available (like in PersonalInfo)
    if (userAddress.fullAddress && userAddress.fullAddress.trim() !== "") {
      return userAddress.fullAddress;
    }
    
    // Otherwise build from components like PersonalInfo does
    const addressParts = [];
    if (userAddress.street && userAddress.street.trim() !== "") {
      addressParts.push(userAddress.street);
    }
    if (userAddress.ward && userAddress.ward.trim() !== "") {
      addressParts.push(userAddress.ward);
    }
    if (userAddress.district && userAddress.district.trim() !== "") {
      addressParts.push(userAddress.district);
    }
    if (userAddress.province && userAddress.province.trim() !== "") {
      addressParts.push(userAddress.province);
    }
    
    return addressParts.length > 0 ? addressParts.join(", ") : "No address information added yet";
  };

  // Select images from library
  const pickImages = async (): Promise<void> => {
    if (images.length >= 5) {
      Alert.alert('Notice', 'You can only upload up to 5 images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5 - images.length
    });

    if (!result.canceled && result.assets) {
      const newImages: string[] = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  // Select video
  const pickVideo = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: 60
    });

    if (!result.canceled && result.assets[0]) {
      setVideo(result.assets[0].uri);
    }
  };

  // Remove image
  const removeImage = (index: number): void => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  // Remove video
  const removeVideo = (): void => {
    setVideo(null);
  };

  // Confirm new address
  const confirmCustomAddress = (): void => {
    if (!street || !selectedProvince || !selectedDistrict || !selectedWard) {
      Alert.alert('Error', 'Please fill in complete address');
      return;
    }

    const fullAddr = getFullAddress(
      selectedProvince,
      selectedDistrict,
      selectedWard,
      street,
      provinces,
      districts,
      wards
    );
    
    setCustomAddressFull(fullAddr);
    setCustomAddressConfirmed(true);
    Alert.alert('Success', 'Address has been confirmed!');
  };

  // Edit custom address
  const editCustomAddress = (): void => {
    setCustomAddressConfirmed(false);
  };

  // Reset to default address when switching back
  const resetToDefaultAddress = (): void => {
    if (userAddress) {
      setStreet(userAddress.street || '');
      setSelectedProvince(userAddress.provinceCode || '');
      setSelectedDistrict(userAddress.districtCode || '');
      setSelectedWard(userAddress.wardCode || '');
      console.log('Reset to default address');
    }
  };

  // ✅ CẬP NHẬT HANDLE SUBMIT
  const handleSubmit = async (): Promise<void> => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter product title');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter product description');
      return;
    }
    
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter valid price');
      return;
    }
    
    if (!category) {
      Alert.alert('Error', 'Please select category');
      return;
    }
    
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least 1 image');
      return;
    }
    
    if (!useDefaultAddress && !customAddressConfirmed) {
      Alert.alert('Error', 'Please confirm your address');
      return;
    }

    if (!user || !userData) {
      Alert.alert('Error', 'User information not found');
      return;
    }

    setLoading(true);

    try {
      // ✅ CHUẨN BỊ ADDRESS DATA
      const addressData = useDefaultAddress ? 
        { 
          useDefault: true,
          street: userAddress?.street || '',
          province: userAddress?.province || '',
          district: userAddress?.district || '',
          ward: userAddress?.ward || '',
          fullAddress: userAddress?.fullAddress || ''
        } : 
        {
          useDefault: false,
          street,
          province: selectedProvince,
          district: selectedDistrict,
          ward: selectedWard,
          fullAddress: customAddressFull
        };

      console.log('Creating product with data:', {
        title,
        description,
        condition,
        price,
        category,
        images: images.length,
        video: video ? 'Yes' : 'No',
        address: addressData
      });

      // ✅ GỌI HÀM CREATE PRODUCT
      const result = await createProduct(
        {
          title,
          description,
          price,
          condition,
          category,
          images,
          video,
          address: addressData
        },
        user.uid,
        userData
      );

      if (result.success) {
        Alert.alert('Success', 'Product has been listed successfully!');
        // Reset form
        setTitle('');
        setDescription('');
        setPrice('');
        setCategory('');
        setImages([]);
        setVideo(null);
        setCustomAddressConfirmed(false);
        console.log('Product created with ID:', result.productId);
      } else {
        Alert.alert('Error', result.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when switching between options
  useEffect(() => {
    if (useDefaultAddress) {
      setCustomAddressConfirmed(false);
      setCustomAddressFull('');
      resetToDefaultAddress();
    }
  }, [useDefaultAddress]);

  return (
    <View style={styles.container}>
      <Header title="Add Product" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Product Information</Text>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter product title"
            maxLength={100}
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detailed description about the product..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price *</Text>
          <View style={styles.priceContainer}>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.currency}>VND</Text>
          </View>
        </View>

        {/* Condition */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={condition}
              onValueChange={(itemValue: string) => setCondition(itemValue)}
              style={styles.picker}
            >
              {conditions.map((item, index) => (
                <Picker.Item key={index} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue: string) => setCategory(itemValue)}
              style={styles.picker}
            >
              {categories.map((item, index) => (
                <Picker.Item key={index} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Upload Images */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Images * ({images.length}/5)
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
            <Text style={styles.uploadButtonText}>📷 Select Images</Text>
          </TouchableOpacity>

          {/* Display selected images */}
          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
              {images.map((image: string, index: number) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Upload Video */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Demo Video</Text>
          <TouchableOpacity 
            style={[styles.uploadButton, video && styles.uploadButtonSuccess]} 
            onPress={pickVideo}
          >
            <Text style={styles.uploadButtonText}>
              🎥 {video ? 'Video Selected' : 'Select Video (max 1 minute)'}
            </Text>
          </TouchableOpacity>

          {video && (
            <View style={styles.videoPreviewContainer}>
              <Text style={styles.videoPreviewTitle}>Video Preview:</Text>
              <Video
                source={{ uri: video }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
              />
              <TouchableOpacity style={styles.removeVideoButton} onPress={removeVideo}>
                <Text style={styles.removeVideoText}>🗑️ Remove Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Delivery Address</Text>
          
          {/* Radio buttons */}
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => {
                setUseDefaultAddress(true);
                resetToDefaultAddress();
              }}
            >
              <View style={[styles.radioCircle, useDefaultAddress && styles.radioCircleSelected]}>
                {useDefaultAddress && <View style={styles.radioInnerCircle} />}
              </View>
              <Text style={styles.radioLabel}>Use my default address</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setUseDefaultAddress(false)}
            >
              <View style={[styles.radioCircle, !useDefaultAddress && styles.radioCircleSelected]}>
                {!useDefaultAddress && <View style={styles.radioInnerCircle} />}
              </View>
              <Text style={styles.radioLabel}>Select another address</Text>
            </TouchableOpacity>
          </View>

          {/* Display default address - Using the same approach as PersonalInfo */}
          {useDefaultAddress && (
            <View style={styles.defaultAddressContainer}>
              <Text style={styles.defaultAddressText}>
                📍 {getDisplayAddress()}
              </Text>
              {!userAddress && (
                <Text style={styles.noAddressText}>
                  Please update your address in your profile
                </Text>
              )}
            </View>
          )}

          {/* Display form for selecting another address */}
          {!useDefaultAddress && !customAddressConfirmed && (
            <>
              {/* Street address */}
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={street}
                onChangeText={setStreet}
                placeholder="House number, street name..."
                placeholderTextColor="#999"
              />

              {/* Province Picker */}
              <View style={styles.addressPicker}>
                <AddressPicker
                  items={provinces}
                  selectedValue={selectedProvince}
                  onValueChange={setSelectedProvince}
                  placeholder="Select Province/City"
                />
              </View>

              {/* District Picker */}
              <View style={styles.addressPicker}>
                <AddressPicker
                  items={districts}
                  selectedValue={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                  placeholder="Select District"
                  enabled={!!selectedProvince}
                />
              </View>

              {/* Ward Picker */}
              <View style={styles.addressPicker}>
                <AddressPicker
                  items={wards}
                  selectedValue={selectedWard}
                  onValueChange={setSelectedWard}
                  placeholder="Select Ward"
                  enabled={!!selectedDistrict}
                />
              </View>

              {/* Address Preview */}
              {(selectedProvince || selectedDistrict || selectedWard || street) && (
                <View style={styles.addressPreview}>
                  <Text style={styles.previewTitle}>📍 Address Preview</Text>
                  
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Street:</Text>
                    <Text style={styles.previewValue}>
                      {street || "Not specified"}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Ward:</Text>
                    <Text style={styles.previewValue}>
                      {selectedWard ? wards.find(w => w.code === selectedWard)?.name : "Not selected"}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>District:</Text>
                    <Text style={styles.previewValue}>
                      {selectedDistrict ? districts.find(d => d.code === selectedDistrict)?.name : "Not selected"}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Province:</Text>
                    <Text style={styles.previewValue}>
                      {selectedProvince ? provinces.find(p => p.code === selectedProvince)?.name : "Not selected"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Confirm address button */}
              <TouchableOpacity 
                style={[
                  styles.confirmButton, 
                  (!street || !selectedProvince || !selectedDistrict || !selectedWard) && styles.confirmButtonDisabled
                ]} 
                onPress={confirmCustomAddress}
                disabled={!street || !selectedProvince || !selectedDistrict || !selectedWard}
              >
                <Text style={styles.confirmButtonText}>✅ Confirm This Address</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Display confirmed address */}
          {!useDefaultAddress && customAddressConfirmed && (
            <View style={styles.confirmedAddressContainer}>
              <Text style={styles.confirmedAddressTitle}>📍 Confirmed Address:</Text>
              <Text style={styles.confirmedAddressText}>{customAddressFull}</Text>
              <TouchableOpacity style={styles.editAddressButton} onPress={editCustomAddress}>
                <Text style={styles.editAddressText}>✏️ Edit Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ✅ CẬP NHẬT SUBMIT BUTTON */}
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            ((!useDefaultAddress && !customAddressConfirmed) || loading) && styles.submitButtonDisabled
          ]} 
          onPress={handleSubmit}
          disabled={(!useDefaultAddress && !customAddressConfirmed) || loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating Product...' : 
             (!useDefaultAddress && !customAddressConfirmed) ? 'Please confirm address' : 'Add Product'}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#00A86B',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00A86B',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  priceContainer: {
    position: 'relative',
  },
  priceInput: {
    paddingRight: 70,
  },
  currency: {
    position: 'absolute',
    right: 16,
    top: 14,
    fontSize: 16,
    color: '#00A86B',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 52,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#f0f9f4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00A86B',
    borderStyle: 'dashed',
  },
  uploadButtonSuccess: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#00A86B',
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00A86B',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoPreviewContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00A86B',
  },
  videoPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00A86B',
    marginBottom: 12,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  removeVideoButton: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeVideoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00A86B',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: '#00A86B',
  },
  radioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  defaultAddressContainer: {
    backgroundColor: '#f0f9f4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00A86B',
    borderStyle: 'dashed',
  },
  defaultAddressText: {
    fontSize: 16,
    color: '#00A86B',
    fontWeight: '600',
    textAlign: 'center',
  },
  noAddressText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  addressInput: {
    marginBottom: 16,
  },
  addressPicker: {
    marginBottom: 16,
  },
  // Address Preview
  addressPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00A86B',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: '30%',
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    width: '68%',
    textAlign: 'right',
  },
  // Confirm Button
  confirmButton: {
    backgroundColor: '#00A86B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Confirmed Address
  confirmedAddressContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  confirmedAddressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmedAddressText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  editAddressButton: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editAddressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Submit Button
  submitButton: {
    backgroundColor: '#00A86B',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  spacer: {
    height: 30,
  },
});

export default AddProduct;