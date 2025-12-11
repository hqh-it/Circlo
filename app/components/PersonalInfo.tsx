import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../../services/Auth/AuthContext";
import { banksData } from "../../services/User/bankData";
import { getFollowCounts } from "../../services/User/followService";
import { deleteBankAccount, loadUserProfile, setDefaultBankAccount } from "../../services/User/userService";
import AddBank from "../components/AddBank";
const { width } = Dimensions.get("window");

interface BankAccount {
  id: string;
  bankName: string;
  bankShortName?: string;
  bankCode?: string;
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
  strustPoint?: number;
}

export default function PersonalInfo() {   
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [followCounts, setFollowCounts] = useState({
    followerCount: 0,
    followingCount: 0
  });

  const getBankLogo = (bankCode?: string) => {
    if (!bankCode) return null;
    const bank = banksData.find(bank => bank.code === bankCode);
    return bank?.logo || null;
  };

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await loadUserProfile(user);
      setUserData(data);
      
      const counts = await getFollowCounts(user.uid);
      if (counts.success) {
        setFollowCounts({
          followerCount: counts.followerCount,
          followingCount: counts.followingCount
        });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const handleBankAdded = () => {
    setEditingBank(null);
    loadData();
  };

  const handleEditBank = (account: BankAccount) => {
    setEditingBank(account);
    setShowAddBankModal(true);
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user) return;

    try {
      const result = await setDefaultBankAccount(user.uid, accountId);
      if (result.success) {
        loadData();
      } else {
        Alert.alert("Error", result.error || "Failed to set default bank account");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to set default bank account");
    }
  };

  const handleDeleteBank = (account: BankAccount) => {
    if (!user) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${account.bankName} account?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteBankAccount(user.uid, account.id);
              if (result.success) {
                loadData();
              } else {
                Alert.alert("Error", result.error || "Failed to delete bank account");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete bank account");
            }
          }
        }
      ]
    );
  };

  const displayValue = (value: string | undefined, placeholder: string = "Not added yet") => {
    return value && value.trim() !== "" ? value : placeholder;
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: logout, style: "destructive" }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground 
          source={require('../assets/images/background_profile.jpg')} 
          style={styles.backgroundImage}
        >
          <View style={styles.headerTop}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require("../assets/icons/profile-picture.png")}
                style={styles.avatar}
              />
              <View style={styles.strustPointContainer}>
                <Image 
                  source={require("../assets/icons/strustpoint.png")} 
                  style={styles.strustPointIcon}
                />
                <Text style={styles.strustPointLabel}>
                  Strust Point: 100
                </Text>
              </View>
            </View>
            
            <View style={styles.followContainer}>
              <View style={styles.followColumn}>
                <Image 
                  style={styles.followIcon} 
                  source={require('../assets/icons/follower.png')} 
                />
                <Text style={styles.followText}>
                  Followers: 0
                </Text>
              </View>
              
              <TouchableOpacity>
                <View style={[styles.followColumn, { 
                  backgroundColor: 'green',
                  borderRadius: 10
                }]}>
                  <Image 
                    style={styles.followIcon} 
                    source={require('../assets/icons/following.png')} 
                  />
                  <Text style={styles.followText}>
                    Following: 0
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.orderBar}>
            <View style={styles.orderColumn}>
              <Image
                style={styles.orderIcon}
                source={require('../assets/icons/order.png')}
              />
              <Text style={styles.orderText}>
                Your Orders
              </Text>
            </View>
            
            <View style={styles.orderColumn}>
              <Image 
                style={styles.orderIcon} 
                source={require('../assets/icons/sell.png')} 
              />
              <Text style={styles.orderText}>
                Your Selling
              </Text>
            </View>
          </View>
        </ImageBackground>
        
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={styles.loadingText}>Loading your information...</Text>
          <Text style={styles.loadingSubtext}>
            We're getting your profile ready
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <ImageBackground 
          source={require('../assets/images/background_profile.jpg')} 
          style={styles.backgroundImage}
        >
          <View style={styles.headerTop}>
            <View style={styles.avatarWrapper}>
              <Image
                source={
                  userData?.avatarURL
                    ? { uri: userData.avatarURL }
                    : require("../assets/icons/profile-picture.png")
                }
                style={styles.avatar}
              />
              <View style={styles.strustPointContainer}>
                <Image 
                  source={require("../assets/icons/strustpoint.png")} 
                  style={styles.strustPointIcon}
                />
                <Text style={styles.strustPointLabel}>
                  Strust Point: {userData?.strustPoint || 100}
                </Text>
              </View>
            </View>
            
            <View style={styles.followContainer}>
              <View style={styles.followColumn}>
                <Image 
                  style={styles.followIcon} 
                  source={require('../assets/icons/follower.png')} 
                />
                <Text style={styles.followText}>
                  Followers: {followCounts.followerCount}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => router.push('/screens/Profile/FollowListScreen')}
              >
                <View style={[styles.followColumn, { 
                  backgroundColor: 'green',
                  borderRadius: 10
                }]}>
                  <Image 
                    style={styles.followIcon} 
                    source={require('../assets/icons/following.png')} 
                  />
                  <Text style={styles.followText}>
                    Following: {followCounts.followingCount}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

        {/* Order Bar */}
        <View style={styles.orderBar}>
          <TouchableOpacity 
            onPress={() => router.push('/screens/Order_Selling/OrderScreen')}
          >
            <View style={styles.orderColumn}>
              <Image
                style={styles.orderIcon}
                source={require('../assets/icons/order.png')}
              />
              <Text style={styles.orderText}>
                Your Orders
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/screens/Order_Selling/SellingScreen')}
          >
            <View style={styles.orderColumn}>
              <Image 
                style={styles.orderIcon} 
                source={require('../assets/icons/sell.png')} 
              />
              <Text style={styles.orderText}>
                Your Selling
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </ImageBackground>
      </View>
      
      <TouchableOpacity 
        style={styles.floatingLogoutButton} 
        onPress={handleLogout}
      >
        <Text style={styles.floatingLogoutText}> Logout</Text>
      </TouchableOpacity>

      <ImageBackground 
        source={require('../assets/images/profile_background.jpg')} 
        style={styles.contentBackground}
        resizeMode="cover"
      >
        <ScrollView 
          style={styles.contentScrollView}
          showsVerticalScrollIndicator={false} 
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>👤 Basic Information</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => router.push("/screens/Profile/EditProfile")}
                >
                  <Image 
                    source={require('../assets/icons/edit.png')}
                    style={styles.editIcon}
                  />
                  <Text style={styles.editText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
    
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Full Name:</Text>
                <Text style={styles.infoValue}>
                  {displayValue(userData?.fullName)}
                </Text>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>
                  {displayValue(userData?.email)}
                </Text>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>
                  {displayValue(userData?.phone)}
                </Text>
              </View>
            </View>

            {(userData?.address?.street || userData?.address?.province || userData?.address?.district || userData?.address?.ward) ? (
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
                
                {userData.address.fullAddress && (
                  <View style={styles.fullAddressSection}>
                    <Text style={styles.fullAddressLabel}>📬 Complete Address:</Text>
                    <Text style={styles.fullAddressText}>
                      {userData.address.fullAddress}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noDataCard}>
                <Text style={styles.noDataText}>📍 No address information added yet</Text>
                <Text style={styles.noDataSubtext}>
                  Click "Edit Profile" to add your address
                </Text>
              </View>
            )}

            <View style={styles.bankCard}>
              <View style={styles.bankHeader}>
                <Text style={styles.cardTitle}>💳 Bank Accounts</Text>
                <TouchableOpacity 
                  style={styles.addBankButton}
                  onPress={() => {
                    setEditingBank(null);
                    setShowAddBankModal(true);
                  }}
                >
                  <Text style={styles.addBankText}>+ Add Bank</Text>
                </TouchableOpacity>
              </View>

              {userData?.bankAccounts && userData.bankAccounts.length > 0 ? (
                userData.bankAccounts.map((account) => {
                  const bankLogo = getBankLogo(account.bankCode);
                  return (
                    <View key={account.id} style={styles.bankAccountItem}>
                      {bankLogo && (
                        <Image 
                          source={{ uri: bankLogo }} 
                          style={styles.bankLogo}
                          resizeMode="contain"
                        />
                      )}
                      
                      <View style={styles.bankAccountInfo}>
                        <Text style={styles.bankName}>{account.bankName}</Text>
                        <Text style={styles.accountNumber}>
                          Account: {account.accountNumber}
                        </Text>
                        <Text style={styles.accountHolder}>
                          Holder: {account.accountHolder}
                        </Text>
                      </View>

                      <View style={styles.bankActions}>
                        <TouchableOpacity 
                          style={[
                            styles.defaultButton, 
                            account.isDefault ? styles.defaultButtonActive : styles.defaultButtonInactive
                          ]}
                          onPress={() => handleSetDefault(account.id)}
                        >
                          <Text style={[
                            styles.defaultButtonText,
                            account.isDefault ? styles.defaultButtonTextActive : styles.defaultButtonTextInactive
                          ]}>
                            Default
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.editBankButton}
                          onPress={() => handleEditBank(account)}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteBank(account)}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
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
        </ScrollView>
      </ImageBackground>

      <AddBank
        visible={showAddBankModal}
        onClose={() => {
          setShowAddBankModal(false);
          setEditingBank(null);
        }}
        onBankAdded={handleBankAdded}
        editingBank={editingBank}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSection: {
    width: width,
  },
  backgroundImage: {
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#D4A017",
  },
  strustPointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: '#D4A017',
  },
  strustPointIcon: {
    width: 15,
    height: 15,
    marginRight: 8,
    tintColor: '#ffffff',
  },
  strustPointLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  followContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  followColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followIcon: {
    width: 15,
    height: 15,
    marginRight: 8,
    tintColor: '#ffffffff'
  },
  followText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffffff',
  },
  orderBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: "#f1aa05d5",
    borderBottomWidth: 3,
    borderColor: "white",
    paddingVertical: 10,
  },
  orderColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderIcon: {
    width: 15,
    height: 15,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  floatingLogoutButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingLogoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  contentBackground: {
    flex: 1,
    width: '100%',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCard: {
    marginVertical: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    marginVertical: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    marginVertical: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    marginVertical: 8,
    padding: 20,
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  editButton: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    width: 10,
    height: 10,
    marginBottom: 4,
  },
  editText: {
    fontSize: 10,
    color: "#00A86B",
    fontWeight: "600",
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
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankLogo: {
    width: 50,
    height: 50,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#e3e3e3ff",
    marginRight: 12
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 12,
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
  bankActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  defaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  defaultButtonActive: {
    backgroundColor: '#00A86B',
  },
  defaultButtonInactive: {
    backgroundColor: '#e0e0e0',
  },
  defaultButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  defaultButtonTextActive: {
    color: '#fff',
  },
  defaultButtonTextInactive: {
    color: '#666',
  },
  editBankButton: {
    backgroundColor: '#c7b000ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ec8277ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noBankCard: {
    padding: 20,
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
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
});