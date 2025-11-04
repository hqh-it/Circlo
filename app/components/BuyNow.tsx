import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { DeliveryService } from '../../services/Delivery/deliveryService';
import { checkExistingOrder, createOrder } from '../../services/Order/orderService';
import { fetchDistricts, fetchProvinces, fetchWards, getAddressNames, getFullAddress } from '../../services/User/address';
import { loadUserData } from '../../services/User/userService';
import AddressPicker from './AddressPicker';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerId: string;
  sellerAddress: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    province?: string;
    district?: string;
    ward?: string;
    street?: string;
    fullAddress?: string;
  };
  productType?: 'normal' | 'auction'; 
}

interface AddressItem {
  code: string;
  name: string;
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

interface BuyNowProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (addressData: any, shippingFee: number, totalAmount: number) => void;
}

const BuyNow: React.FC<BuyNowProps> = ({
  visible,
  product,
  onClose,
  onConfirm,
}) => {
  const { user } = useAuth();
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [useDefaultAddress, setUseDefaultAddress] = useState<boolean>(true);
  
  const [customStreet, setCustomStreet] = useState<string>('');
  const [customProvince, setCustomProvince] = useState<string>('');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [customWard, setCustomWard] = useState<string>('');
  const [customAddressConfirmed, setCustomAddressConfirmed] = useState<boolean>(false);
  const [customAddressFull, setCustomAddressFull] = useState<string>('');
  
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [districts, setDistricts] = useState<AddressItem[]>([]);
  const [wards, setWards] = useState<AddressItem[]>([]);

  const [shippingFee, setShippingFee] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);

  useEffect(() => {
    const loadProvinces = async () => {
      const data = fetchProvinces();
      setProvinces(Array.isArray(data) ? data : []);
    };
    loadProvinces();
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
    const loadUserAddressData = async () => {
      if (!user) return;
      
      try {
        const userData = await loadUserData(user);
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
        console.error('Error loading user address:', error);
      }
    };

    if (visible) {
      loadUserAddressData();
      resetCustomAddress();
    }
  }, [user, visible]);

  useEffect(() => {
    if (product && userAddress) {
      calculateShipping();
    }
  }, [product, userAddress, useDefaultAddress, customAddressConfirmed]);

  const resetCustomAddress = () => {
    setCustomStreet('');
    setCustomProvince('');
    setCustomDistrict('');
    setCustomWard('');
    setCustomAddressConfirmed(false);
    setCustomAddressFull('');
    setUseDefaultAddress(true);
  };

  const calculateShipping = () => {
    if (!product || !product.sellerAddress) return;

    let buyerAddress;
    
    if (useDefaultAddress && userAddress) {
      buyerAddress = {
        provinceCode: userAddress.provinceCode || '',
        districtCode: userAddress.districtCode || '',
        wardCode: userAddress.wardCode || ''
      };
    } else if (customAddressConfirmed) {
      buyerAddress = {
        provinceCode: customProvince,
        districtCode: customDistrict,
        wardCode: customWard
      };
    } else {
      return;
    }

    const sellerAddress = {
      provinceCode: product.sellerAddress.provinceCode || '',
      districtCode: product.sellerAddress.districtCode || '',
      wardCode: product.sellerAddress.wardCode || ''
    };

    try {
      const shippingResult = DeliveryService.calculateShippingFee(sellerAddress, buyerAddress);
      if (shippingResult.success) {
        const fee = shippingResult.shippingFee || 35000;
        setShippingFee(fee);
        setTotalAmount(product.price + fee);
      }
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setShippingFee(35000);
      setTotalAmount(product.price + 35000);
    }
  };

  const confirmCustomAddress = () => {
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

  const editCustomAddress = () => {
    setCustomAddressConfirmed(false);
  };

  const handleSwitchToDefaultAddress = () => {
    setUseDefaultAddress(true);
    setCustomAddressConfirmed(false);
  };

  const handleSwitchToCustomAddress = () => {
    setUseDefaultAddress(false);
  };

  const handleSendRequest = async () => {
    if (!product || !user) return;

    let addressData;
    
    if (useDefaultAddress && userAddress) {
      addressData = {
        street: userAddress.street || '',
        province: userAddress.province || '',
        district: userAddress.district || '',
        ward: userAddress.ward || '',
        fullAddress: userAddress.fullAddress || '',
      };
    } else if (customAddressConfirmed) {
      const { provinceName, districtName, wardName } = getAddressNames(
        customProvince, customDistrict, customWard, provinces, districts, wards
      );

      addressData = {
        street: customStreet,
        province: provinceName,
        district: districtName,
        ward: wardName,
        fullAddress: customAddressFull,
      };
    } else {
      Alert.alert('Error', 'Please confirm your address');
      return;
    }

    try {
      setSendingRequest(true);

      const existingOrder = await checkExistingOrder(product.id, user.uid);
      if (existingOrder.exists) {
        Alert.alert('Order Exists', `You already have a ${existingOrder.status} order for this product.`);
        return;
      }

      const orderData = {
        productId: product.id,
        sellerId: product.sellerId,
        buyerId: user.uid,
        productSnapshot: {
          title: product.title,
          price: product.price,
          images: product.images,
          condition: 'like_new',
          category: product.productType || 'normal'
        },
        buyerAddress: addressData,
        shippingFee: shippingFee,
        totalAmount: totalAmount,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        Alert.alert('Success', 'Purchase request sent successfully!');
        onConfirm(addressData, shippingFee, totalAmount);
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to send purchase request');
      }
    } catch (error) {
      console.error('Error sending purchase request:', error);
      Alert.alert('Error', 'Failed to send purchase request');
    } finally {
      setSendingRequest(false);
    }
  };


  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🛒 Buy Now</Text>
          
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Information</Text>
              <View style={styles.productInfo}>
                <Image 
                  source={{ uri: product.images[0] }} 
                  style={styles.productImage}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productPrice}>{product.price.toLocaleString()} VND</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              
              {userAddress && (
                <TouchableOpacity 
                  style={[
                    styles.addressOption,
                    useDefaultAddress && styles.addressOptionSelected
                  ]}
                  onPress={handleSwitchToDefaultAddress}
                >
                  <View style={styles.radioContainer}>
                    <View style={[
                      styles.radio,
                      useDefaultAddress && styles.radioSelected
                    ]} />
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressOptionTitle}>Use Default Address</Text>
                    <Text style={styles.addressText}>
                      {userAddress.fullAddress || 
                        `${userAddress.street || ''}, ${userAddress.ward || ''}, ${userAddress.district || ''}, ${userAddress.province || ''}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[
                  styles.addressOption,
                  !useDefaultAddress && styles.addressOptionSelected
                ]}
                onPress={handleSwitchToCustomAddress}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    !useDefaultAddress && styles.radioSelected
                  ]} />
                </View>
                <View style={styles.addressTextContainer}>
                  <Text style={styles.addressOptionTitle}>Use Another Address</Text>
                  <Text style={styles.addressText}>
                    {customAddressConfirmed ? customAddressFull : 'Enter new delivery address'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {!useDefaultAddress && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enter New Address</Text>
                
                {!customAddressConfirmed ? (
                  <View style={styles.addressForm}>
                    <Text style={styles.inputLabel}>Street Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Street address, house number..."
                      value={customStreet}
                      onChangeText={setCustomStreet}
                      multiline
                    />
                    
                    <Text style={styles.inputLabel}>Province/City</Text>
                    <AddressPicker
                      selectedValue={customProvince}
                      items={provinces}
                      onValueChange={setCustomProvince}
                      placeholder="Select Province/City"
                    />
                    
                    <Text style={styles.inputLabel}>District</Text>
                    <AddressPicker
                      selectedValue={customDistrict}
                      items={districts}
                      onValueChange={setCustomDistrict}
                      placeholder="Select District"
                      enabled={!!customProvince}
                    />
                    
                    <Text style={styles.inputLabel}>Ward/Commune</Text>
                    <AddressPicker
                      selectedValue={customWard}
                      items={wards}
                      onValueChange={setCustomWard}
                      placeholder="Select Ward/Commune"
                      enabled={!!customDistrict}
                    />
                    
                    <TouchableOpacity 
                      style={[
                        styles.confirmButton,
                        (!customStreet || !customProvince || !customDistrict || !customWard) && 
                        styles.confirmButtonDisabled
                      ]}
                      onPress={confirmCustomAddress}
                      disabled={!customStreet || !customProvince || !customDistrict || !customWard}
                    >
                      <Text style={styles.confirmButtonText}>Confirm Address</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.confirmedAddress}>
                    <Text style={styles.confirmedAddressText}>{customAddressFull}</Text>
                    <TouchableOpacity 
                      style={styles.editAddressButton}
                      onPress={editCustomAddress}
                    >
                      <Text style={styles.editAddressButtonText}>Edit Address</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Product Price:</Text>
                <Text style={styles.summaryValue}>{product.price.toLocaleString()} VND</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee:</Text>
                <Text style={styles.summaryValue}>
                  {shippingFee > 0 ? `${shippingFee.toLocaleString()} VND` : 'Calculating...'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  {totalAmount > 0 ? `${totalAmount.toLocaleString()} VND` : 'Calculating...'}
                </Text>
              </View>
            </View>

            <View style={styles.noteSection}>
              <Text style={styles.noteTitle}>📝 Note:</Text>
              <Text style={styles.noteText}>
                • The seller will contact you to confirm the order within 24 hours{'\n'}
                • You can chat with the seller for more details{'\n'}
                • Payment will be made after order confirmation
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sendRequestButton,
                (shippingFee === 0 || sendingRequest) && styles.sendRequestButtonDisabled
              ]}
              onPress={handleSendRequest}
              disabled={shippingFee === 0 || sendingRequest}
            >
              <Text style={styles.sendRequestButtonText}>
                {sendingRequest ? 'Sending...' : 'Send Purchase Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  productInfo: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  addressOption: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 12,
  },
  addressOptionSelected: {
    borderColor: '#00A86B',
    backgroundColor: '#e8f5e8',
  },
  radioContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  radioSelected: {
    borderColor: '#00A86B',
    backgroundColor: '#00A86B',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  addressForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: '#00A86B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmedAddress: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  confirmedAddressText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
    marginBottom: 12,
  },
  editAddressButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#00A86B',
    borderRadius: 6,
  },
  editAddressButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  noteSection: {
    backgroundColor: '#fff8e1',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd54f',
    marginBottom: 20,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendRequestButton: {
    flex: 2,
    backgroundColor: '#00A86B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendRequestButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default BuyNow;