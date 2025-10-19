import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAuctionProduct } from '../../../services/Auction/auctionService';
import { useAuth } from '../../../services/Auth/AuthContext';
import { loadUserData } from '../../../services/User/userService';
import Header from "../../components/header_for_detail";
import AddProduct from '../Products/add_product';

interface ProductData {
  id?: string;
  title: string;
  description: string;
  price: string;
  condition: string;
  category: string;
  images: string[];
  video?: string | null;
  address: any;
}

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  condition: string;
  category: string;
  images: string[];
  video?: string | null;
  address?: any;
}

interface AuctionSettings {
  startDate: Date | null;
  startTime: Date | null;
  durationValue: string;
  durationUnit: string;
  bidIncrement: string;
  buyNowPrice: string;
}

const AddAuctionProduct = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'add_product' | 'auction_settings'>('add_product');
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: '',
    condition: 'like_new',
    category: '',
    images: [],
    video: null,
    address: null
  });

  const [auctionSettings, setAuctionSettings] = useState<AuctionSettings>({
    startDate: null,
    startTime: null,
    durationValue: '',
    durationUnit: 'minutes',
    bidIncrement: '',
    buyNowPrice: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationUnitModal, setShowDurationUnitModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const durationUnits = [
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' }
  ];

  useEffect(() => {
    const loadUser = async () => {
      if (user) {
        const data = await loadUserData(user);
        setUserData(data);
      }
    };
    loadUser();
  }, [user]);

  const handleProductAdded = useCallback((product: ProductData) => {
    setProductData(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price,
      condition: product.condition,
      category: product.category,
      images: product.images,
      video: product.video,
      address: product.address
    });
    setCurrentStep('auction_settings');
  }, []);

  const handleBackToProduct = () => {
    setCurrentStep('add_product');
  };

  const handleNextToAuction = () => {
    if (formData.title && formData.description && formData.price && formData.category && formData.images.length > 0) {
      const productData: ProductData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        condition: formData.condition,
        category: formData.category,
        images: formData.images,
        video: formData.video,
        address: formData.address
      };
      setProductData(productData);
      setCurrentStep('auction_settings');
    } else {
      Alert.alert('Error', 'Please complete all required product fields before proceeding.');
    }
  };

  const handleFormDataChange = useCallback((newFormData: ProductFormData) => {
    setFormData(newFormData);
  }, []);

  const handleAuctionSettingChange = useCallback((field: keyof AuctionSettings, value: any) => {
    setAuctionSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleAuctionSettingChange('startDate', selectedDate);
    }
  }, [handleAuctionSettingChange]);

  const handleTimeChange = useCallback((event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      handleAuctionSettingChange('startTime', selectedTime);
    }
  }, [handleAuctionSettingChange]);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US');
  };

  const formatTime = (time: Date | null) => {
    if (!time) return '';
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getDurationLabel = () => {
    return durationUnits.find(unit => unit.value === auctionSettings.durationUnit)?.label || 'Minutes';
  };

  const calculateEndTime = () => {
    if (!auctionSettings.startDate || !auctionSettings.startTime) return null;
    
    const startDateTime = new Date(auctionSettings.startDate);
    startDateTime.setHours(auctionSettings.startTime.getHours());
    startDateTime.setMinutes(auctionSettings.startTime.getMinutes());
    
    const duration = parseInt(auctionSettings.durationValue);
    const endDateTime = new Date(startDateTime);
    
    switch (auctionSettings.durationUnit) {
      case 'minutes':
        endDateTime.setMinutes(endDateTime.getMinutes() + duration);
        break;
      case 'hours':
        endDateTime.setHours(endDateTime.getHours() + duration);
        break;
      case 'days':
        endDateTime.setDate(endDateTime.getDate() + duration);
        break;
    }
    
    return endDateTime;
  };

  const handleAddProduct = async () => {
    if (!auctionSettings.startDate) {
      Alert.alert('Error', 'Please select start date');
      return;
    }
    if (!auctionSettings.startTime) {
      Alert.alert('Error', 'Please select start time');
      return;
    }
    if (!auctionSettings.durationValue || parseInt(auctionSettings.durationValue) <= 0) {
      Alert.alert('Error', 'Please enter valid duration');
      return;
    }
    if (!auctionSettings.bidIncrement || parseFloat(auctionSettings.bidIncrement) <= 0) {
      Alert.alert('Error', 'Please enter valid bid increment');
      return;
    }
    if (!productData) {
      Alert.alert('Error', 'Product data is missing');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    if (!userData) {
      Alert.alert('Error', 'User data not loaded');
      return;
    }

    setLoading(true);

    try {
      const startDateTime = new Date(auctionSettings.startDate);
      startDateTime.setHours(auctionSettings.startTime.getHours());
      startDateTime.setMinutes(auctionSettings.startTime.getMinutes());

      const duration = parseInt(auctionSettings.durationValue);
      const endDateTime = new Date(startDateTime);
      
      switch (auctionSettings.durationUnit) {
        case 'minutes':
          endDateTime.setMinutes(endDateTime.getMinutes() + duration);
          break;
        case 'hours':
          endDateTime.setHours(endDateTime.getHours() + duration);
          break;
        case 'days':
          endDateTime.setDate(endDateTime.getDate() + duration);
          break;
      }

      const auctionSettingsData = {
        startTime: startDateTime,
        endTime: endDateTime,
        bidIncrement: parseFloat(auctionSettings.bidIncrement),
        buyNowPrice: auctionSettings.buyNowPrice ? parseFloat(auctionSettings.buyNowPrice) : null
      };

      const result = await createAuctionProduct(
        productData,
        auctionSettingsData,
        user.uid,
        userData
      );

      if (result.success) {
        Alert.alert('Success', 'Auction product created successfully!');
        setCurrentStep('add_product');
        setProductData(null);
        setFormData({
          title: '',
          description: '',
          price: '',
          condition: 'like_new',
          category: '',
          images: [],
          video: null,
          address: null
        });
        setAuctionSettings({
          startDate: null,
          startTime: null,
          durationValue: '',
          durationUnit: 'minutes',
          bidIncrement: '',
          buyNowPrice: ''
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to create auction product');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 'add_product') {
      return (
        <View style={styles.stepContent}>
          <View style={styles.addProductWrapper}>
            <AddProduct 
              onProductAdded={handleProductAdded}
              isAuctionFlow={true}
              showHeader={false}
              initialData={formData}
              onFormDataChange={handleFormDataChange}
            />
          </View>
        </View>
      );
    }

    if (currentStep === 'auction_settings') {
      return (
        <ScrollView 
          style={styles.stepContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.stepTitle}>Step 2: Auction Settings</Text>
          <Text style={styles.stepDescription}>
            Configure the auction details for your product
          </Text>
          
          {productData && (
            <View style={styles.productCard}>
              <View style={styles.productImageContainer}>
                {productData.images.length > 0 ? (
                  <Image 
                    source={{ uri: productData.images[0] }} 
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {productData.title}
                </Text>
                <Text style={styles.productPrice}>
                  {parseInt(productData.price).toLocaleString('en-US')} VND
                </Text>
                <Text style={styles.startingPrice}>Starting Price</Text>
              </View>
            </View>
          )}

          <View style={styles.auctionForm}>
            <Text style={styles.formTitle}>Auction Configuration</Text>
            
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={auctionSettings.startDate ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                    {auctionSettings.startDate ? formatDate(auctionSettings.startDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Time *</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={auctionSettings.startTime ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                    {auctionSettings.startTime ? formatTime(auctionSettings.startTime) : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Auction Duration *</Text>
              <View style={styles.durationContainer}>
                <TextInput
                  style={styles.durationInput}
                  value={auctionSettings.durationValue}
                  onChangeText={(value) => handleAuctionSettingChange('durationValue', value)}
                  placeholder="Enter duration"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={styles.durationUnitButton}
                  onPress={() => setShowDurationUnitModal(true)}
                >
                  <Text style={styles.durationUnitText}>{getDurationLabel()}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bid Increment *</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={auctionSettings.bidIncrement}
                  onChangeText={(value) => handleAuctionSettingChange('bidIncrement', value)}
                  placeholder="Minimum bid increase"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <Text style={styles.currency}>VND</Text>
              </View>
              <Text style={styles.helperText}>
                Minimum amount that bids must increase by
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Buy Now Price (Optional)</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={auctionSettings.buyNowPrice}
                  onChangeText={(value) => handleAuctionSettingChange('buyNowPrice', value)}
                  placeholder="Instant purchase price"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <Text style={styles.currency}>VND</Text>
              </View>
              <Text style={styles.helperText}>
                Price for immediate purchase (ends auction)
              </Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Auction Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Start Time:</Text>
                <Text style={styles.summaryValue}>
                  {auctionSettings.startDate && auctionSettings.startTime 
                    ? `${formatDate(auctionSettings.startDate)} ${formatTime(auctionSettings.startTime)}`
                    : 'Not set'
                  }
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Duration:</Text>
                <Text style={styles.summaryValue}>
                  {auctionSettings.durationValue 
                    ? `${auctionSettings.durationValue} ${getDurationLabel().toLowerCase()}`
                    : 'Not set'
                  }
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>End Time:</Text>
                <Text style={styles.summaryValue}>
                  {calculateEndTime() 
                    ? calculateEndTime()!.toLocaleString('en-US')
                    : 'Not set'
                  }
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Bid Increment:</Text>
                <Text style={styles.summaryValue}>
                  {auctionSettings.bidIncrement 
                    ? `${parseInt(auctionSettings.bidIncrement).toLocaleString('en-US')} VND`
                    : 'Not set'
                  }
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      );
    }
  };

  const renderFooterButtons = () => {
    const isStep1 = currentStep === 'add_product';
    const isStep2 = currentStep === 'auction_settings';

    const canProceedToStep2 = formData.title && formData.description && formData.price && formData.category && formData.images.length > 0;

    const isStep2Complete = auctionSettings.startDate && 
                           auctionSettings.startTime && 
                           auctionSettings.durationValue && 
                           auctionSettings.bidIncrement;

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={[
            styles.backButton,
            (isStep1 || loading) && styles.disabledButton
          ]}
          onPress={handleBackToProduct}
          disabled={isStep1 || loading}
        >
          <Text style={[
            styles.backButtonText,
            (isStep1 || loading) && styles.disabledButtonText
          ]}>
            Back
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.nextButton,
            (isStep1 && !canProceedToStep2) && styles.disabledButton,
            (isStep2 && !isStep2Complete) && styles.disabledButton,
            loading && styles.loadingButton
          ]}
          onPress={isStep1 ? handleNextToAuction : handleAddProduct}
          disabled={(isStep1 ? !canProceedToStep2 : !isStep2Complete) || loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.nextButtonText}>Creating Auction...</Text>
            </View>
          ) : (
            <Text style={styles.nextButtonText}>
              {isStep1 ? 'Next' : 'Create Auction'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Add Auction Product" />
      
      <View style={styles.progressContainer}>
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep === 'add_product' && styles.activeStep]}>
            <Text style={[styles.stepText, currentStep === 'add_product' && styles.activeStepText]}>1</Text>
          </View>
          <Text style={styles.stepLabel}>Add Product</Text>
        </View>
        
        <View style={styles.stepLine} />
        
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep === 'auction_settings' && styles.activeStep]}>
            <Text style={[styles.stepText, currentStep === 'auction_settings' && styles.activeStepText]}>2</Text>
          </View>
          <Text style={styles.stepLabel}>Auction Settings</Text>
        </View>
      </View>

      <View style={styles.content}>
        {renderStepContent()}
      </View>

      {renderFooterButtons()}

      {showDatePicker && (
        <DateTimePicker
          value={auctionSettings.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={auctionSettings.startTime || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          is24Hour={true}
        />
      )}

      <Modal
        visible={showDurationUnitModal}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={() => setShowDurationUnitModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Duration Unit</Text>
              {durationUnits.map((unit) => (
                <TouchableOpacity
                  key={unit.value}
                  style={styles.modalOption}
                  onPress={() => {
                    handleAuctionSettingChange('durationUnit', unit.value);
                    setShowDurationUnitModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{unit.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeStep: {
    backgroundColor: '#00A86B',
  },
  stepText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeStepText: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
    marginTop: -15,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  addProductWrapper: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#f8f8f8',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  productInfo: {
    flex: 1,
    padding: 16,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 4,
  },
  startingPrice: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  auctionForm: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 20,
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  durationUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minWidth: 100,
    justifyContent: 'space-between',
  },
  durationUnitText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  priceInputContainer: {
    position: 'relative',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    paddingRight: 60,
  },
  currency: {
    position: 'absolute',
    right: 12,
    top: 12,
    fontSize: 16,
    color: '#00A86B',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  summaryContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A86B',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disabledButton: {
    backgroundColor: '#f8f8f8',
    borderColor: '#e5e5ea',
  },
  backButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButtonText: {
    color: '#999',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#00A86B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingButton: {
    backgroundColor: '#00A86B',
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default AddAuctionProduct;