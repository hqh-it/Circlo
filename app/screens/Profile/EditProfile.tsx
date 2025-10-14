import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../../services/Auth/AuthContext";
import { uploadAvatar } from '../../../services/cloudinaryService';
import { fetchDistricts, fetchProvinces, fetchWards, getFullAddress, loadAddressHierarchy } from "../../../services/User/address";
import { loadUserData, saveUserProfile } from "../../../services/User/userService";
import AddressPicker from "../../components/AddressPicker";
import Header from "../../components/header_for_detail";

const { width } = Dimensions.get("window");

interface AddressItem {
  code: string;
  name: string;
  parent_code?: string;
}

export default function EditProfile() {
  const { user } = useAuth();
  const router = useRouter();
  
  // UI State
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [streetFocused, setStreetFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Address State
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [districts, setDistricts] = useState<AddressItem[]>([]);
  const [wards, setWards] = useState<AddressItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");

  // Load user data
  useEffect(() => {
    const initializeUserData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load user data from service
        const userData = await loadUserData(user);
        if (userData) {
          setName(userData.fullName || "");
          setEmail(userData.email || "");
          setPhone(userData.phone || "");
          setStreet(userData.address?.street || "");
          setAvatar(userData.avatarURL || null);
          
          // Load address data
          const addressData = await loadAddressHierarchy(
            userData.address?.provinceCode,
            userData.address?.districtCode, 
            userData.address?.wardCode
          );
          
          setProvinces(addressData.provinces);
          setDistricts(addressData.districts);
          setWards(addressData.wards);
          setSelectedProvince(addressData.selectedProvince);
          setSelectedDistrict(addressData.selectedDistrict);
          setSelectedWard(addressData.selectedWard);
        }
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeUserData();
  }, [user]);

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
    }
  }, [selectedProvince]);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const data = fetchWards(selectedDistrict);
      setWards(Array.isArray(data) ? data : []);
    }
  }, [selectedDistrict]);

  // Avatar change function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  // Handle save 
  const handleSave = async () => {
    try {
      setSaving(true);
      
      let finalAvatarURL = avatar;

      // Upload new avatar if exists
      if (newAvatar) {
        console.log('Uploading new avatar to Cloudinary...');
        const uploadResult = await uploadAvatar(newAvatar, user!.uid);
        
        if (uploadResult.success && uploadResult.url) {
          finalAvatarURL = uploadResult.url;
          console.log('Avatar uploaded successfully:', finalAvatarURL);
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload avatar');
          return;
        }
      }

      const userData = { 
        name, 
        phone, 
        avatar: finalAvatarURL,
      };
      
      const addressData = { 
        selectedProvince, 
        selectedDistrict, 
        selectedWard, 
        street, 
        provinces, 
        districts, 
        wards 
      };
      
      const result = await saveUserProfile(user!, userData, addressData);
      
      // Update state
      if (finalAvatarURL !== avatar) {
        setAvatar(finalAvatarURL);
      }
      setNewAvatar(null);
      
      Alert.alert("Success", "Profile updated successfully!", [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]);   
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Get display value for inputs
  const getDisplayValue = (value: string, focused: boolean, placeholder: string) => {
    if (focused || value) return value;
    return placeholder;
  };

  // Handle phone input focus
  const handlePhoneFocus = () => {
    setPhoneFocused(true);
    if (!phone) {
      setPhone("");
    }
  };

  // Handle street input focus
  const handleStreetFocus = () => {
    setStreetFocused(true);
    if (!street) {
      setStreet("");
    }
  };

  // Handle phone input blur
  const handlePhoneBlur = () => {
    setPhoneFocused(false);
  };

  // Handle street input blur
  const handleStreetBlur = () => {
    setStreetFocused(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Edit Profile" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Edit Profile" />
      
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <ImageBackground
          source={require('../../assets/images/background_profile.jpg')}
          style={styles.avatarBackground}
          imageStyle={styles.avatarBackgroundImage}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={
                newAvatar 
                  ? { uri: newAvatar }
                  : avatar 
                    ? { uri: avatar }
                    : require("../../assets/icons/profile-picture.png")
              }
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.changeAvatarBtn} onPress={pickImage}>
              <Image
                source={require('../../assets/icons/avatar.png')}
                style={styles.changeAvatarIcon}
              />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>

      {/* Form Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>User Information</Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={email}
              onChangeText={setEmail}
              placeholder="Your email"
              keyboardType="email-address"
              editable={false}
              placeholderTextColor="#999"
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              value={getDisplayValue(phone, phoneFocused, "Phone number not set")}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              onFocus={handlePhoneFocus}
              onBlur={handlePhoneBlur}
              placeholderTextColor="#999"
            />
          </View>

          {/* House Number & Street */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>House & Street</Text>
            <TextInput 
              style={[styles.input, styles.multilineInput]} 
              value={getDisplayValue(street, streetFocused, "Address not set")}
              onChangeText={setStreet}
              placeholder="Enter house number and street" 
              multiline={true}
              textAlignVertical="top"
              onFocus={handleStreetFocus}
              onBlur={handleStreetBlur}
              placeholderTextColor="#999"
            />
          </View>

          {/* Province */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Province/City</Text>
            <View style={styles.dropdownContainer}>
              <AddressPicker
                items={provinces}
                selectedValue={selectedProvince}
                onValueChange={setSelectedProvince}
                placeholder={selectedProvince ? "" : "Select Province"}
              />
            </View>
          </View>

          {/* District */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>District</Text>
            <View style={styles.dropdownContainer}>
              <AddressPicker
                items={districts}
                selectedValue={selectedDistrict}
                onValueChange={setSelectedDistrict}
                placeholder={selectedDistrict ? "" : "Select District"}
                enabled={districts.length > 0}
              />
            </View>
          </View>

          {/* Ward */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ward</Text>
            <View style={styles.dropdownContainer}>
              <AddressPicker
                items={wards}
                selectedValue={selectedWard}
                onValueChange={setSelectedWard}
                placeholder={selectedWard ? "" : "Select Ward"}
                enabled={wards.length > 0}
              />
            </View>
          </View>

          {/* Address Preview */}
          {(selectedProvince || selectedDistrict || selectedWard || street) && (
            <View style={styles.addressPreview}>
              <Text style={styles.previewTitle}>📍 Address Preview</Text>
              
              <View style={styles.previewGrid}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Street:</Text>
                  <Text style={styles.previewValue}>
                    {street || "Not specified"}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Ward:</Text>
                  <Text style={styles.previewValue}>
                    {selectedWard ? wards.find(w => w.code === selectedWard)?.name : "Not selected"}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>District:</Text>
                  <Text style={styles.previewValue}>
                    {selectedDistrict ? districts.find(d => d.code === selectedDistrict)?.name : "Not selected"}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Province:</Text>
                  <Text style={styles.previewValue}>
                    {selectedProvince ? provinces.find(p => p.code === selectedProvince)?.name : "Not selected"}
                  </Text>
                </View>
              </View>

              {/* Full Address Summary */}
              {(selectedProvince && selectedDistrict && selectedWard && street) && (
                <View style={styles.fullAddressSection}>
                  <Text style={styles.fullAddressTitle}>📬 Complete Address</Text>
                  <Text style={styles.fullAddressText}>
                    {getFullAddress(selectedProvince, selectedDistrict, selectedWard, street, provinces, districts, wards)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.cancelButton]} 
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  
  // Avatar Section
  avatarSection: {
    backgroundColor: '#ffffff',
  },
  avatarBackground: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBackgroundImage: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  changeAvatarBtn: {
    position: 'absolute',
    bottom: 5,
    right: -5,
    backgroundColor: '#00A86B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  changeAvatarIcon: {
    width: 18,
    height: 18,
    tintColor: '#ffffff',
  },

  // Scroll View
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Form Container
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledInput: {
    backgroundColor: '#f7fafc',
    borderColor: '#e2e8f0',
    color: '#a0aec0',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Dropdown
  dropdownContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Address Preview
  addressPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#00A86B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewGrid: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    flex: 1,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3748',
    flex: 2,
    textAlign: 'right',
  },
  fullAddressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  fullAddressTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 8,
  },
  fullAddressText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e53e3e',
  },
  saveButton: {
    backgroundColor: '#00A86B',
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e53e3e',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});