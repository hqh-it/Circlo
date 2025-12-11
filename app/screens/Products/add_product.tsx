import { Picker } from '@react-native-picker/picker';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../services/Auth/AuthContext';
import { createProduct } from '../../../services/Product/productService';
import { fetchDistricts, fetchProvinces, fetchWards, getAddressNames, getFullAddress } from '../../../services/User/address';
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

interface AddProductProps {
  onProductAdded?: (product: any) => void;
  isAuctionFlow?: boolean;
  showHeader?: boolean;
  initialData?: any;
  onFormDataChange?: (data: any) => void;
  isEditMode?: boolean;
}

const formatPrice = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted;
};

const formatPriceForDisplay = (priceValue: string | number): string => {
  if (!priceValue) return '';
  const numericString = typeof priceValue === 'number' 
    ? priceValue.toString() 
    : priceValue.toString().replace(/\D/g, '');
  return numericString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedPrice = (formattedPrice: string): number => {
  return parseInt(formattedPrice.replace(/\./g, '')) || 0;
};

const AddProduct = ({ 
  onProductAdded, 
  isAuctionFlow = false, 
  showHeader = true,
  initialData,
  onFormDataChange,
  isEditMode = false
}: AddProductProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [condition, setCondition] = useState<string>(initialData?.condition || 'like_new');
  const [price, setPrice] = useState<string>(initialData?.price ? formatPriceForDisplay(initialData.price) : '');
  const [category, setCategory] = useState<string>(initialData?.category || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [video, setVideo] = useState<string | null>(initialData?.video || null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [districts, setDistricts] = useState<AddressItem[]>([]);
  const [wards, setWards] = useState<AddressItem[]>([]);
  
  const [useDefaultAddress, setUseDefaultAddress] = useState<boolean>(true);
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const [customStreet, setCustomStreet] = useState<string>('');
  const [customProvince, setCustomProvince] = useState<string>('');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [customWard, setCustomWard] = useState<string>('');
  const [customAddressConfirmed, setCustomAddressConfirmed] = useState<boolean>(false);
  const [customAddressFull, setCustomAddressFull] = useState<string>('');

  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const streetInputRef = useRef<TextInput>(null);

  const categories: Category[] = [
    { label: 'Select Category', value: '' },
    { label: '👕 Fashion - Accessories', value: 'fashion' },
    { label: '🏠 Home - Furniture', value: 'home' },
    { label: '📚 Books - Stationery', value: 'books' },
    { label: '🎮 Toys - Entertainment', value: 'toys' },
    { label: '🎁 Others', value: 'other' }
  ];

  const conditions: Condition[] = [
    { label: 'Like New (99%)', value: 'like_new' },
    { label: 'Good Condition (70%-80%)', value: 'used_good' },
    { label: 'Fair Condition (50%)', value: 'used_fair' }
  ];

  const handlePriceChange = (text: string) => {
    const formatted = formatPrice(text);
    setPrice(formatted);
  };

  const scrollToInput = (ref: any) => {
    if (ref.current) {
      ref.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        scrollViewRef.current?.scrollTo({
          y: pageY - 100,
          animated: true
        });
      });
    }
  };

  const handleInputFocus = (ref: any) => {
    setTimeout(() => {
      scrollToInput(ref);
    }, 100);
  };

  useEffect(() => {
    const data = fetchProvinces();
    setProvinces(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (customProvince) {
      const data = fetchDistricts(customProvince);
      setDistricts(Array.isArray(data) ? data : []);
      setCustomDistrict('');
      setCustomWard('');
      setWards([]);
    }
  }, [customProvince]);

  useEffect(() => {
    if (customDistrict) {
      const data = fetchWards(customDistrict);
      setWards(Array.isArray(data) ? data : []);
      setCustomWard('');
    }
  }, [customDistrict]);

  useEffect(() => {
    const loadUserAddress = async () => {
      if (!user) return;
      
      try {
        const userData = await loadUserData(user);
        setUserData(userData);
        
        if (userData?.address) {
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
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load user address');
      }
    };

    loadUserAddress();
  }, [user]);

  useEffect(() => {
    if (initialData?.address && isEditMode) {
      if (initialData.address.isAnotherAddress || initialData.address.useDefault === false) {
        setUseDefaultAddress(false);
        setCustomStreet(initialData.address.street || initialData.address.specificAddress || '');
        setCustomProvince(initialData.address.provinceCode || '');
        setCustomDistrict(initialData.address.districtCode || '');
        setCustomWard(initialData.address.wardCode || '');
        setCustomAddressFull(initialData.address.fullAddress || '');
        setCustomAddressConfirmed(true);
      } else {
        setUseDefaultAddress(true);
      }
    }
  }, [initialData, isEditMode]);

  useEffect(() => {
    if (onFormDataChange) {
      const formData = {
        title,
        description,
        condition,
        price: parseFormattedPrice(price).toString(),
        category,
        images,
        video,
        address: getCurrentAddressData()
      };
      onFormDataChange(formData);
    }
  }, [title, description, condition, price, category, images, video, useDefaultAddress, customAddressConfirmed, onFormDataChange]);

  const getCurrentAddressData = () => {
    if (useDefaultAddress) {
      return userAddress ? {
        useDefault: true,
        isAnotherAddress: false,
        street: userAddress.street || '',
        province: userAddress.province || '',
        district: userAddress.district || '',
        ward: userAddress.ward || '',
        fullAddress: userAddress.fullAddress || '',
        provinceCode: userAddress.provinceCode || '',
        districtCode: userAddress.districtCode || '',
        wardCode: userAddress.wardCode || ''
      } : null;
    } else {
      if (customAddressConfirmed) {
        const { provinceName, districtName, wardName } = getAddressNames(
          customProvince,
          customDistrict,
          customWard,
          provinces,
          districts,
          wards
        );

        return {
          useDefault: false,
          isAnotherAddress: true,
          recipientName: userData?.fullName || '',
          phoneNumber: userData?.phoneNumber || '',
          specificAddress: customStreet,
          street: customStreet,
          province: provinceName,
          district: districtName,
          ward: wardName,
          fullAddress: customAddressFull,
          provinceCode: customProvince,
          districtCode: customDistrict,
          wardCode: customWard
        };
      }
      return null;
    }
  };

  const getDisplayAddress = (): string => {
    if (!userAddress) return "No default address available";
    
    if (userAddress.fullAddress && userAddress.fullAddress.trim() !== "") {
      return userAddress.fullAddress;
    }
    
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

  const removeImage = (index: number): void => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const removeVideo = (): void => {
    setVideo(null);
  };

  const confirmCustomAddress = (): void => {
    if (!customStreet || !customProvince || !customDistrict || !customWard) {
      Alert.alert('Error', 'Please fill in complete address');
      return;
    }

    const fullAddr = getFullAddress(
      customProvince,
      customDistrict,
      customWard,
      customStreet,
      provinces,
      districts,
      wards
    );
    
    setCustomAddressFull(fullAddr);
    setCustomAddressConfirmed(true);
    Alert.alert('Success', 'Address has been confirmed!');
  };

  const editCustomAddress = (): void => {
    setCustomAddressConfirmed(false);
  };

  const handleSwitchToDefaultAddress = (): void => {
    setUseDefaultAddress(true);
    setCustomAddressConfirmed(false);
  };

  const handleSwitchToCustomAddress = (): void => {
    setUseDefaultAddress(false);
  };

  const handleAuctionProduct = async (addressData: any): Promise<void> => {
    const productData = {
      title,
      description,
      price: parseFormattedPrice(price).toString(),
      condition,
      category,
      images,
      video,
      address: addressData
    };

    if (onProductAdded) {
      onProductAdded(productData);
    }
  };

  const handleNormalProduct = async (addressData: any): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const result = await createProduct(
      {
        title,
        description,
        price: parseFormattedPrice(price).toString(),
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
      Alert.alert('Success','Product has been submitted for review! It will be visible after admin approval.');
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setImages([]);
      setVideo(null);
      setCustomAddressConfirmed(false);
      setCustomStreet('');
      setCustomProvince('');
      setCustomDistrict('');
      setCustomWard('');
      setCustomAddressFull('');
    } else {
      Alert.alert('Error', result.error || 'Failed to create product');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter product title');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter product description');
      return;
    }
    
    const numericPrice = parseFormattedPrice(price);
    if (!price.trim() || numericPrice <= 0) {
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

    if (!user) {
      Alert.alert('Error', 'User information not found');
      return;
    }

    setLoading(true);

    try {
      const addressData = getCurrentAddressData();
      
      if (isAuctionFlow) {
        await handleAuctionProduct(addressData);
      } else {
        await handleNormalProduct(addressData);
      }
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = (): boolean => {
    const numericPrice = parseFormattedPrice(price);
    return !!(title.trim() && 
              description.trim() && 
              price.trim() && 
              numericPrice > 0 && 
              category && 
              images.length > 0 && 
              getCurrentAddressData());
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {showHeader && (
          <Header title={isEditMode ? "Edit Product" : "Add Product"} />
        )}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.overlay}>
            <Text style={styles.sectionTitle}>
              {isEditMode ? "Edit Product Information" : "Product Information"}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                ref={titleInputRef}
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter product title"
                maxLength={100}
                placeholderTextColor="#999"
                selectionColor="#1a472a"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                ref={descriptionInputRef}
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detailed description about the product..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
                selectionColor="#1a472a"
                onFocus={() => handleInputFocus(descriptionInputRef)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price *</Text>
              <View style={styles.priceContainer}>
                <TextInput
                  ref={priceInputRef}
                  style={[styles.input, styles.priceInput]}
                  value={price}
                  onChangeText={handlePriceChange}
                  placeholder="Enter price"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                  selectionColor="#1a472a"
                  onFocus={() => handleInputFocus(priceInputRef)}
                />
                <Text style={styles.currency}>VND</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Condition</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={condition}
                  onValueChange={(itemValue: string) => setCondition(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#1a472a"
                  mode="dropdown"
                >
                  {conditions.map((item, index) => (
                    <Picker.Item key={index} label={item.label} value={item.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue: string) => setCategory(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#1a472a"
                  mode="dropdown"
                >
                  {categories.map((item, index) => (
                    <Picker.Item key={index} label={item.label} value={item.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Images * ({images.length}/5)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                <Text style={styles.uploadButtonText}>Select Images</Text>
              </TouchableOpacity>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Demo Video</Text>
              <TouchableOpacity 
                style={[styles.uploadButton, video && styles.uploadButtonSuccess]} 
                onPress={pickVideo}
              >
                <Text style={styles.uploadButtonText}>
                  {video ? 'Video Selected' : 'Select Video (max 1 minute)'}
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
                    <Text style={styles.removeVideoText}>Remove Video</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Address</Text>
              
              <View style={styles.radioGroup}>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={handleSwitchToDefaultAddress}
                >
                  <View style={[styles.radioCircle, useDefaultAddress && styles.radioCircleSelected]}>
                    {useDefaultAddress && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={styles.radioLabel}>Use my default address</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={handleSwitchToCustomAddress}
                >
                  <View style={[styles.radioCircle, !useDefaultAddress && styles.radioCircleSelected]}>
                    {!useDefaultAddress && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={styles.radioLabel}>Select another address</Text>
                </TouchableOpacity>
              </View>

              {useDefaultAddress && (
                <View style={styles.defaultAddressContainer}>
                  <Text style={styles.defaultAddressText}>
                    {getDisplayAddress()}
                  </Text>
                  {!userAddress && (
                    <Text style={styles.noAddressText}>
                      Please update your address in your profile
                    </Text>
                  )}
                </View>
              )}

              {!useDefaultAddress && !customAddressConfirmed && (
                <>
                  <TextInput
                    ref={streetInputRef}
                    style={[styles.input, styles.addressInput]}
                    value={customStreet}
                    onChangeText={setCustomStreet}
                    placeholder="House number, street name..."
                    placeholderTextColor="#999"
                    selectionColor="#1a472a"
                    onFocus={() => handleInputFocus(streetInputRef)}
                  />

                  <View style={styles.addressPicker}>
                    <AddressPicker
                      items={provinces}
                      selectedValue={customProvince}
                      onValueChange={setCustomProvince}
                      placeholder="Select Province/City"
                    />
                  </View>

                  <View style={styles.addressPicker}>
                    <AddressPicker
                      items={districts}
                      selectedValue={customDistrict}
                      onValueChange={setCustomDistrict}
                      placeholder="Select District"
                      enabled={!!customProvince}
                    />
                  </View>

                  <View style={styles.addressPicker}>
                    <AddressPicker
                      items={wards}
                      selectedValue={customWard}
                      onValueChange={setCustomWard}
                      placeholder="Select Ward"
                      enabled={!!customDistrict}
                    />
                  </View>

                  {(customProvince || customDistrict || customWard || customStreet) && (
                    <View style={styles.addressPreview}>
                      <Text style={styles.previewTitle}>Address Preview</Text>
                      
                      <View style={styles.previewSection}>
                        <Text style={styles.previewLabel}>Street:</Text>
                        <Text style={styles.previewValue}>
                          {customStreet || "Not specified"}
                        </Text>
                      </View>

                      <View style={styles.previewSection}>
                        <Text style={styles.previewLabel}>Ward:</Text>
                        <Text style={styles.previewValue}>
                          {customWard ? wards.find(w => w.code === customWard)?.name : "Not selected"}
                        </Text>
                      </View>

                      <View style={styles.previewSection}>
                        <Text style={styles.previewLabel}>District:</Text>
                        <Text style={styles.previewValue}>
                          {customDistrict ? districts.find(d => d.code === customDistrict)?.name : "Not selected"}
                        </Text>
                      </View>

                      <View style={styles.previewSection}>
                        <Text style={styles.previewLabel}>Province:</Text>
                        <Text style={styles.previewValue}>
                          {customProvince ? provinces.find(p => p.code === customProvince)?.name : "Not selected"}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={[
                      styles.confirmButton, 
                      (!customStreet || !customProvince || !customDistrict || !customWard) && styles.confirmButtonDisabled
                    ]} 
                    onPress={confirmCustomAddress}
                    disabled={!customStreet || !customProvince || !customDistrict || !customWard}
                  >
                    <Text style={styles.confirmButtonText}>Confirm This Address</Text>
                  </TouchableOpacity>
                </>
              )}

              {!useDefaultAddress && customAddressConfirmed && (
                <View style={styles.confirmedAddressContainer}>
                  <Text style={styles.confirmedAddressTitle}>Confirmed Address:</Text>
                  <Text style={styles.confirmedAddressText}>{customAddressFull}</Text>
                  <TouchableOpacity style={styles.editAddressButton} onPress={editCustomAddress}>
                    <Text style={styles.editAddressText}>Edit Address</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {!isAuctionFlow && (
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  (!isFormValid() || loading) && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit}
                disabled={!isFormValid() || loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? (isEditMode ? 'Updating Product...' : 'Creating Product...') : (isEditMode ? 'Update Product' : 'Add Product')}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a472a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#1a472a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1a472a',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a472a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
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
    top: 12,
    fontSize: 16,
    color: '#1a472a',
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
    height: 55,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#f0f9f4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a472a',
    borderStyle: 'dashed',
  },
  uploadButtonSuccess: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#1a472a',
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    paddingTop: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a472a',
  },
  removeImageButton: {
    position: 'absolute',
    top: -0,
    right: -4,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoPreviewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a472a',
  },
  videoPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a472a',
    marginBottom: 10,
  },
  videoPlayer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeVideoButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeVideoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  radioGroup: {
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1a472a',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: '#1a472a',
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a472a',
    borderStyle: 'dashed',
  },
  defaultAddressText: {
    fontSize: 16,
    color: '#1a472a',
    fontWeight: '600',
    textAlign: 'center',
  },
  noAddressText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 6,
  },
  addressInput: {
    marginBottom: 12,
  },
  addressPicker: {
    marginBottom: 12,
  },
  addressPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a472a',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  confirmButton: {
    backgroundColor: '#1a472a',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmedAddressContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  confirmedAddressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmedAddressText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  editAddressButton: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editAddressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1a472a',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },  
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 10,
  },
});

export default AddProduct;