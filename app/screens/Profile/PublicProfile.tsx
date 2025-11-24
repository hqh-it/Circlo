import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import { getFollowCounts } from '../../../services/User/followService';
import ProductFeed from '../../components/ProductFeed';
import ReportButton from '../../components/Report/ReportButton';
const { width, height } = Dimensions.get("window");

interface PublicUserData {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatarURL?: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    province?: string;
    fullAddress?: string;
  };
}

const PublicProfile: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedTab, setSelectedTab] = useState<'information' | 'products'>('information');
  const [userData, setUserData] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] = useState({
    followerCount: 0,
    followingCount: 0
  });

  const userId = params.userId as string;

  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) {
        console.error('No user ID provided');
        router.back();
        return;
      }

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            id: userId,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            avatarURL: data.avatarURL,
            address: data.address || {},
          });

          const counts = await getFollowCounts(userId);
          if (counts.success) {
            setFollowCounts({
              followerCount: counts.followerCount,
              followingCount: counts.followingCount
            });
          }
        } else {
          console.error('User not found');
          router.back();
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, router]);

  const displayValue = (value: string | undefined, placeholder: string = "Not added yet") => {
    return value && value.trim() !== "" ? value : placeholder;
  };

  const getCompleteAddress = () => {
    if (!userData?.address) return 'No address provided';
    
    const { street, ward, district, province } = userData.address;
    const addressParts = [street, ward, district, province].filter(Boolean);
    return addressParts.join(', ') || 'No address provided';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading user profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centerContainer}>
        <Text>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <ImageBackground 
            source={require('../../assets/images/background_profile.jpg')}
            style={styles.backgroundImage}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.backButtonContainer}
                onPress={() => router.back()}
              >
                <Image style={styles.backIcon} source={require("../../assets/icons/back2.png")}/>
              </TouchableOpacity>
              
              <View style={styles.avatarStatsContainer}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={
                      userData.avatarURL
                        ? { uri: userData.avatarURL }
                        : require("../../assets/icons/profile-picture.png")
                    }
                    style={styles.avatar}
                  />
                  <View style={styles.strustPointContainer}>
                    <Image 
                      source={require("../../assets/icons/strustpoint.png")} 
                      style={styles.strustPointIcon}
                    />
                    <Text style={styles.strustPointLabel}>Strust Point: 100</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.reportButtonContainer}>
                <ReportButton 
                  reportedUserId={userId}
                  reportedUserName={userData?.fullName || 'User'}
                  size={40}
                />
                <Text style={styles.reportLabel}>Report</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.followBottomRight}>
              <View style={styles.followStatItem}>
                <Image 
                  style={styles.followerIcon} 
                  source={require('../../assets/icons/follower.png')} 
                />
                <Text style={styles.followStatLabel}>Follower: {followCounts.followerCount}</Text>
              </View>
              
              <View style={styles.followStatItem}>
                <Image 
                  style={styles.followingIcon} 
                  source={require('../../assets/icons/following.png')} 
                />
                <Text style={styles.followStatLabel}>Following: {followCounts.followingCount}</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'information' && styles.activeTab]}
            onPress={() => setSelectedTab('information')}
          >
            <Text style={[styles.tabText, selectedTab === 'information' && styles.activeTabText]}>
              Information
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'products' && styles.activeTab]}
            onPress={() => setSelectedTab('products')}
          >
            <Text style={[styles.tabText, selectedTab === 'products' && styles.activeTabText]}>
              Products
            </Text>
          </TouchableOpacity>
        </View>

        <ImageBackground 
          source={require('../../assets/images/profile_background.jpg')} 
          style={styles.contentBackground}
          resizeMode="cover"
        >
          <View style={styles.content}>
            {selectedTab === 'information' && (
              <ScrollView 
                style={styles.infoContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.infoContainer}>
                  <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>👤 Basic Information</Text>
          
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Full Name:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.fullName)}
                      </Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.email)}
                      </Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>
                        {displayValue(userData.phone)}
                      </Text>
                    </View>
                  </View>

                  {(userData.address?.street || userData.address?.province || userData.address?.district || userData.address?.ward) && (
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
                      
                      <View style={styles.fullAddressSection}>
                        <Text style={styles.fullAddressLabel}>📬 Complete Address:</Text>
                        <Text style={styles.fullAddressText}>
                          {getCompleteAddress()}
                        </Text>
                      </View>
                    </View>
                  )}

                  {!(userData.address?.street || userData.address?.province) && (
                    <View style={styles.noDataCard}>
                      <Text style={styles.noDataText}>📍 No address information added yet</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            
            {selectedTab === 'products' && (
              <View style={styles.productsContent}>
                <ProductFeed 
                  mode="user"
                  userId={userId}
                  isOwnProfile={false}
                />
              </View>
            )}
          </View>
        </ImageBackground>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff"
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
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
  backButtonContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarStatsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  avatarWrapper: {
    marginRight: 15,
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
    marginRight: 25,
  },
  strustPointIcon: {
    width: 15,
    height: 15,
    marginRight: 8,
    tintColor: '#D4A017',
  },
  strustPointLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffffff',
    backgroundColor: '#D4A017',
    padding:5,
    borderRadius: 5,
  },
  followBottomRight: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  followStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  followerIcon: {
    width: 15,
    height: 15,
    marginRight: 8,
    tintColor: '#4CAF50',
  },
  followingIcon: {
    width: 15,
    height: 15,
    marginRight: 8,
    tintColor: '#2196F3',
  },
  followStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffffff',
  },
  reportButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  reportIcon: {
    width: 20,
    height: 20,
    tintColor: '#ffffff',
  },
  reportLabel: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  backButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00A86B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#00A86B',
  },
  contentBackground: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
  },
  infoContent: {
    flex: 1,
  },
  productsContent: {
    flex: 1,
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  infoCard: {
    width: "100%",
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
    width: "100%",
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
    width: "100%",
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
});

export default PublicProfile;