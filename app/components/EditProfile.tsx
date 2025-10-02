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
import { useAuth } from "../../services/Auth/AuthContext";
import { uploadAvatar } from '../../services/cloudinaryService';
import { fetchDistricts, fetchProvinces, fetchWards, getFullAddress, loadAddressHierarchy } from "../../services/User/address";
import { loadUserData, saveUserProfile } from "../../services/User/userService"; // NEW IMPORT
import AddressPicker from "../components/AddressPicker";
import Header from "../components/header_for_detail";

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
    // If user is currently typing or has value, show actual value
    if (focused || value) return value;
    // Otherwise show placeholder
    return placeholder;
  };

  // Handle phone input focus
  const handlePhoneFocus = () => {
    setPhoneFocused(true);
    // Clear placeholder text when user starts typing
    if (!phone) {
      setPhone("");
    }
  };

  // Handle street input focus
  const handleStreetFocus = () => {
    setStreetFocused(true);
    // Clear placeholder text when user starts typing
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
      <View style={styles.container}>
        <Header title="Edit Profile" />
        <View style={styles.loadingContainer}>
          <Text>Loading information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom header */}
      <Header title="Edit Profile" />

      {/* Avatar section */}
      <ImageBackground
        source={require('../assets/images/background_profile.jpg')}
        style={styles.headerBackground}
        imageStyle={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}
      >
        <View>
          <Image
            source={
              newAvatar 
                ? { uri: newAvatar } // Hiển thị avatar mới nếu có
                : avatar 
                  ? { uri: avatar } // Hiển thị avatar cũ
                  : require("../assets/icons/profile-picture.png")
            }
            style={styles.avatar}/>
          {/* Change avatar button */}
          <TouchableOpacity style={styles.changeAvatarBtn} onPress={pickImage}>
            <Image
              source={require('../assets/icons/avatar.png')}
              style={styles.changeAvatarIcon}
            />
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Form content */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.formWrapper}>
          <Text style={styles.sectionTitle}>User Information</Text>

          {/* Name */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Full name:</Text>
            <TextInput 
              style={styles.input} 
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
            />
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <TextInput 
              style={styles.input} 
              value={email}
              onChangeText={setEmail}
              placeholder="Your email"
              keyboardType="email-address"
              editable={false}
            />
          </View>

          {/* Phone */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <TextInput 
              style={styles.input} 
              value={getDisplayValue(phone, phoneFocused, "Phone number not set")}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              onFocus={handlePhoneFocus}
              onBlur={handlePhoneBlur}
            />
          </View>

          {/* House Number & Street */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>House & Street:</Text>
            <TextInput 
              style={[styles.input, styles.multilineInput]} 
              value={getDisplayValue(street, streetFocused, "Address not set")}
              onChangeText={setStreet}
              placeholder="Enter house number and street" 
              multiline={true}
              textAlignVertical="top"
              onFocus={handleStreetFocus}
              onBlur={handleStreetBlur}
            />
          </View>

          {/* Province */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Province:</Text>
            <View style={styles.dropdownWrapper}>
              <AddressPicker
                items={provinces}
                selectedValue={selectedProvince}
                onValueChange={setSelectedProvince}
                placeholder={selectedProvince ? "" : "Select Province"}
              />
            </View>
          </View>

          {/* District */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>District:</Text>
            <View style={styles.dropdownWrapper}>
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
          <View style={styles.infoRow}>
            <Text style={styles.label}>Ward:</Text>
            <View style={styles.dropdownWrapper}>
              <AddressPicker
                items={wards}
                selectedValue={selectedWard}
                onValueChange={setSelectedWard}
                placeholder={selectedWard ? "" : "Select Ward"}
                enabled={wards.length > 0}
              />
            </View>
          </View>

          {/* Enhanced Address Preview - Always show when any address field is selected */}
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

              {/* Full address summary */}
              {(selectedProvince && selectedDistrict && selectedWard && street) && (
                <View style={styles.fullAddressSection}>
                  <Text style={styles.fullAddressTitle}>📬 Complete Address:</Text>
                  <Text style={styles.fullAddressText}>
                    {getFullAddress(selectedProvince, selectedDistrict, selectedWard, street, provinces, districts, wards)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity 
          style={[styles.btn, styles.btnCancel]} 
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, styles.btnSave, saving && styles.btnDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  scrollView: {
    flex: 1,
  },
  headerBackground: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#D4A017",
  },
  changeAvatarBtn: {
    position: "absolute",
    bottom: 5,
    right: width * 0.28 / 2,
    backgroundColor: "#D4A017",
    borderRadius: 20,
    padding: 6,
    elevation: 3,
  },
  changeAvatarIcon: {
    width: 20,
    height: 20,
    tintColor: "#ffffffff"
  },
  formWrapper: {
    flex: 1,
    marginTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffb012ff",
    alignSelf: "center",
    marginVertical: 15,
    borderBottomWidth: 3,
    borderColor: "#ffb012ff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    width: "35%",
    fontWeight: "600",
    fontSize: 14,
    color: "#444",
    textAlign: "right",
    paddingRight: 10
  },
  input: {
    flex: 1,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: "#00A86B",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 45,
  },
  multilineInput: {
    minHeight: 45,
    maxHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  dropdownWrapper: {
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  btn: {
    width: "40%",
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  btnSave: {
    backgroundColor: "#00A86B",
  },
  btnCancel: {
    backgroundColor: "#e97575ff",
  },
  btnDisabled: {
    backgroundColor: "#cccccc",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  addressPreview: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00A86B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  fullAddressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fullAddressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 6,
  },
  fullAddressText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});