import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import { getAddressNames, getFullAddress } from "./address";

// Load user data from Firestore
export async function loadUserData(user) {
  if (!user) return null;
  
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error loading user data:", error);
    throw new Error("Cannot load user information");
  }
}

// Upload avatar to Firebase Storage
export async function uploadAvatar(uid, avatarFile) {
  if (!avatarFile) return null;
  
  try {
    const avatarRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(avatarRef, avatarFile);
    const downloadURL = await getDownloadURL(avatarRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw new Error("Failed to upload avatar");
  }
}

// Save user profile to Firestore
export async function saveUserProfile(user, userData, addressData) {
  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const { name, phone, avatar, avatarFile } = userData;
    const { selectedProvince, selectedDistrict, selectedWard, street, provinces, districts, wards } = addressData;

    // Upload avatar if exists
    let avatarURL = avatar;
    if (avatarFile) {
      avatarURL = await uploadAvatar(user.uid, avatarFile);
    }

    // Get address names
    const { provinceName, districtName, wardName } = getAddressNames(
      selectedProvince, selectedDistrict, selectedWard, provinces, districts, wards
    );
    
    const fullAddress = getFullAddress(
      selectedProvince, selectedDistrict, selectedWard, street, provinces, districts, wards
    );

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), {
      fullName: name,
      phone: phone || null,
      avatarURL: avatarURL,
      address: {
        street: street || null,
        province: provinceName,
        district: districtName,
        ward: wardName,
        provinceCode: selectedProvince || null,
        districtCode: selectedDistrict || null,
        wardCode: selectedWard || null,
        fullAddress: fullAddress || null
      },
      updatedAt: new Date()
    });

    return { success: true, message: "Profile updated successfully!" };
  } catch (error) {
    console.error("Error saving user data:", error);
    throw new Error("Failed to update information");
  }

}

  // Load user data for display (for PersonalInfo)
  export async function loadUserProfile(user) {
    if (!user) return null;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error loading user profile:", error);
      throw new Error("Cannot load user information");
    }
  }


  export const initializeUserFollowData = async (user) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        followers: [],
        following: [],
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Error initializing user follow data:", error);
    }
  };

  export const addBankAccount = async (userId, bankAccount) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const currentBankAccounts = userData.bankAccounts || [];
    
    // Set as default if first account
    const isFirstAccount = currentBankAccounts.length === 0;
    const newBankAccount = {
      ...bankAccount,
      id: Date.now().toString(), // Simple ID generation
      isDefault: isFirstAccount
    };

    const updatedBankAccounts = [...currentBankAccounts, newBankAccount];

    await updateDoc(userRef, {
      bankAccounts: updatedBankAccounts,
      updatedAt: new Date()
    });

    return { 
      success: true, 
      message: "Bank account added successfully!",
      bankAccount: newBankAccount
    };
  } catch (error) {
    console.error("Error adding bank account:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Update bank account
export const updateBankAccount = async (userId, bankAccountId, updates) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const bankAccounts = userData.bankAccounts || [];
    
    const updatedBankAccounts = bankAccounts.map(account => 
      account.id === bankAccountId 
        ? { ...account, ...updates, updatedAt: new Date() }
        : account
    );

    await updateDoc(userRef, {
      bankAccounts: updatedBankAccounts,
      updatedAt: new Date()
    });

    return { success: true, message: "Bank account updated successfully!" };
  } catch (error) {
    console.error("Error updating bank account:", error);
    return { success: false, error: error.message };
  }
};

// Delete bank account
export const deleteBankAccount = async (userId, bankAccountId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const bankAccounts = userData.bankAccounts || [];
    
    const updatedBankAccounts = bankAccounts.filter(
      account => account.id !== bankAccountId
    );

    if (updatedBankAccounts.length > 0) {
      const wasDefaultDeleted = bankAccounts.find(
        acc => acc.id === bankAccountId && acc.isDefault
      );
      
      if (wasDefaultDeleted) {
        updatedBankAccounts[0].isDefault = true;
      }
    }

    await updateDoc(userRef, {
      bankAccounts: updatedBankAccounts,
      updatedAt: new Date()
    });

    return { success: true, message: "Bank account deleted successfully!" };
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return { success: false, error: error.message };
  }
};

// Set default bank account
export const setDefaultBankAccount = async (userId, bankAccountId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const bankAccounts = userData.bankAccounts || [];
    
    const updatedBankAccounts = bankAccounts.map(account => ({
      ...account,
      isDefault: account.id === bankAccountId
    }));

    await updateDoc(userRef, {
      bankAccounts: updatedBankAccounts,
      updatedAt: new Date()
    });

    return { success: true, message: "Default bank account updated!" };
  } catch (error) {
    console.error("Error setting default bank account:", error);
    return { success: false, error: error.message };
  }
};