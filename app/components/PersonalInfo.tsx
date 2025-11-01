import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../services/Auth/AuthContext";
import { getFollowCounts } from "../../services/User/followService";
import { loadUserProfile } from "../../services/User/userService";

const {width} = Dimensions.get("window");

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

interface UserData {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: {
    fullAddress?: string;
    street?: string;
    province?: string;
    district?: string;
    ward?: string;
  };
  avatarURL?: string;
  bankAccounts?: BankAccount[];
}

export default function PersonalInfo() {   
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] = useState({
    followerCount: 0,
    followingCount: 0
  });

  // Function to load user data
  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await loadUserProfile(user);
      setUserData(data);
      
      // Load follow counts
      const counts = await getFollowCounts(user.uid);
      if (counts.success) {
        setFollowCounts({
          followerCount: counts.followerCount,
          followingCount: counts.followingCount
        });
      }
      
      console.log('🔄 PersonalInfo: Data loaded successfully');
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, [user]);

  // Reload data when screen comes into focus (after back from EditProfile)
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 PersonalInfo: Screen focused, reloading data...');
      loadData();
    }, [user])
  );

  // Function to display value or placeholder
  const displayValue = (value: string | undefined, placeholder: string = "Not added yet") => {
    return value && value.trim() !== "" ? value : placeholder;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading information...</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={styles.container}>
          <View style={{width:width,flexDirection:"column", justifyContent:"space-between",}}>
              <ImageBackground source={require('../assets/images/background_profile.jpg')}>
                {/* Avatar */}
                <View style={{justifyContent:"center", alignItems:"center",paddingVertical:10}}>
                    <Image
                    source={
                      userData?.avatarURL
                        ? { uri: userData.avatarURL }
                        : require("../assets/icons/profile-picture.png")
                    }
                    style={{
                        width: width*0.35,
                        height: width*0.35,
                        borderRadius: 100,
                        borderWidth:5,
                        borderColor:"#D4A017",
                        }}/>
                </View>
                {/*Follow*/}
                <View style={{
                    width:width,
                    flexDirection:"row",
                    justifyContent:"space-around",
                    alignItems:"center",
                    paddingVertical:5,
                    backgroundColor:"#f1aa05d5",
                    }}>
                    <View style={styles.ratingcolumn}>
                      <Image style={styles.ratingicon}source={require('../assets/icons/follower.png')} />
                      <Text style={styles.ratingText}>Followers: {followCounts.followerCount}</Text>
                    </View>
                    <TouchableOpacity onPress={()=>router.push('/screens/Profile/FollowListScreen')}>
                      <View style={styles.ratingcolumn}>
                        <Image style={styles.ratingicon} source={require('../assets/icons/following.png')} />
                        <Text style={styles.ratingText}>Following: {followCounts.followingCount}</Text>
                      </View>
                    </TouchableOpacity>
                </View>
              </ImageBackground>
          </View>
          <View style={{width:width, flexDirection:"column", justifyContent:"center", alignItems:"center",paddingHorizontal:10}}>
              <View style={{width:width, flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:10,padding:5,borderTopWidth:5,borderColor:"white"}} >
                <Text style={styles.title}>Your Information</Text>
                <View style={{flexDirection:"column",justifyContent:"space-between", alignItems:"center"}}>
                    <Image source={require('../assets/icons/edit.png')}
                    style={{
                      width:width*0.03,
                      height:width*0.03,
                      padding:5
                    }}/>
                    <TouchableOpacity onPress={()=>router.push("/screens/Profile/EditProfile")} >
                      <Text style={styles.editText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>
              </View>
              {/* Basic Information Card */}
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>👤 Basic Information</Text>
      
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Full Name:</Text>
                  <Text style={styles.infoValue}>
                    {displayValue(userData?.fullName, "Not added yet")}
                  </Text>
                </View>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>
                    {displayValue(userData?.email, "Not added yet")}
                  </Text>
                </View>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>
                    {displayValue(userData?.phone, "Not added yet")}
                  </Text>
                </View>
              </View>
              {/* Address Information Card - Only show if address exists */}
              {(userData?.address?.street || userData?.address?.province || userData?.address?.district || userData?.address?.ward) && (
                <View style={styles.addressCard}>
                  <Text style={styles.cardTitle}>📍 Address Information</Text>
      
                  {userData.address.street && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Street:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.address.street)}
                      </Text>
                    </View>
                  )}
                  {userData.address.ward && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Ward:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.address.ward)}
                      </Text>
                    </View>
                  )}
                  {userData.address.district && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>District:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.address.district)}
                      </Text>
                    </View>
                  )}
                  {userData.address.province && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Province:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.address.province)}
                      </Text>
                    </View>
                  )}
                  {/* Full Address Summary */}
                  {userData.address.fullAddress && (
                    <View style={styles.fullAddressSection}>
                      <Text style={styles.fullAddressLabel}>📬 Complete Address:</Text>
                      <Text style={styles.fullAddressText}>
                        {userData.address.fullAddress}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {/* Show message if no address data */}
              {!(userData?.address?.street || userData?.address?.province) && (
                <View style={styles.noDataCard}>
                  <Text style={styles.noDataText}>📍 No address information added yet</Text>
                  <Text style={styles.noDataSubtext}>Click "Edit Profile" to add your address</Text>
                </View>
              )}

              {/* Bank Accounts Card */}
              <View style={styles.bankCard}>
                <View style={styles.bankHeader}>
                  <Text style={styles.cardTitle}>💳 Bank Accounts</Text>
                  <TouchableOpacity 
                    style={styles.addBankButton}
                   
                  >
                    <Text style={styles.addBankText}>+ Add Account</Text>
                  </TouchableOpacity>
                </View>

                {userData?.bankAccounts && userData.bankAccounts.length > 0 ? (
                  userData.bankAccounts.map((account, index) => (
                    <View key={index} style={styles.bankAccountItem}>
                      <View style={styles.bankAccountInfo}>
                        <Text style={styles.bankName}>{account.bankName}</Text>
                        <Text style={styles.accountNumber}>Account: {account.accountNumber}</Text>
                        <Text style={styles.accountHolder}>Holder: {account.accountHolder}</Text>
                      </View>
                      {account.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.noBankCard}>
                    <Text style={styles.noBankText}>🏦 You have no bank account yet</Text>
                    <Text style={styles.noBankSubtext}>
                      Add your bank account to receive payments from buyers
                    </Text>
                  </View>
                )}
              </View>
          </View>
      
          {/* Logout Section */}
          <View style={styles.logoutSection}>
              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>🚪 Logout</Text>
              </TouchableOpacity>
          </View>
      
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    width: width,
    flexDirection: "column",
    alignItems: "center",
  },
  title:{
    fontSize:16,
    fontWeight:"bold",
    color:"#333",
  },
  editText: {
    fontSize:12,
    color:"#00A86B",
    fontWeight:"600",
  },
  ratingcolumn: {
    flexDirection: "column",
    marginVertical: 5,
    alignItems:"center",
    justifyContent:"center"
  },
  ratingicon:{
    width: width*0.05,
    height: width*0.05,    
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  // Card Styles
  infoCard: {
    width: "95%",
    marginVertical: 10,
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
  addressCard: {
    width: "95%",
    marginVertical: 10,
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
  bankCard: {
    width: "95%",
    marginVertical: 10,
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
  noDataCard: {
    width: "95%",
    marginVertical: 10,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: '30%',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    width: '68%',
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  fullAddressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fullAddressLabel: {
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
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
  // Bank Account Styles
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addBankButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bankAccountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  accountHolder: {
    fontSize: 12,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noBankCard: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  noBankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  noBankSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  // Logout Section
  logoutSection: {
    marginTop: 20,
    marginBottom: 30,
    padding: 10,
  },
  logoutButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});