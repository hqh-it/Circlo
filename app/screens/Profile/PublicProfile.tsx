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
import ProductFeed from '../../components/ProductFeed';

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
  const [selectedTab, setSelectedTab] = useState<'information' | 'products'>('products');
  const [userData, setUserData] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);

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
        <View style={{width: width, flexDirection: "column", justifyContent: "space-between"}}>
          <ImageBackground 
            source={require('../../assets/images/background_profile.jpg')}
            style={styles.headerBackground}
          >
            <TouchableOpacity 
              style={styles.backButtonContainer}
              onPress={() => router.back()}
            >
              <Image style={styles.backIcon} source={require("../../assets/icons/back2.png")}/>
            </TouchableOpacity>
            
            <View style={styles.avatarContainer}>
              <Image
                source={
                  userData.avatarURL
                    ? { uri: userData.avatarURL }
                    : require("../../assets/icons/profile-picture.png")
                }
                style={styles.avatar}
              />
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
  headerBackground: {
    width: width,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    width: 40,
    height: 40,
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
  backIcon: {
    width:20,
    height:20,
    color: '#333',
    marginRight:2
  },
  avatarContainer: {
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: 10,
    paddingTop: 50,
  },
  avatar: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 100,
    borderWidth: 5,
    borderColor: "#D4A017",
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
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  titleContainer: {
    width: width,
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 10, 
    padding: 5, 
    borderTopWidth: 5, 
    borderColor: "white"
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
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
});

export default PublicProfile;