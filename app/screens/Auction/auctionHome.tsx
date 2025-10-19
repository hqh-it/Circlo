import { useRouter } from 'expo-router'; // Thêm import này
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from "../../components/header_for_detail";

const AuctionHome: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'products' | 'history'>('products');
  const router = useRouter(); // Thêm router

  return (
    <SafeAreaView style={styles.container}>
      <Header title='Auction'/>
      

      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'products' && styles.activeTab]}
          onPress={() => setSelectedTab('products')}
        >
          <Text style={[styles.tabText, selectedTab === 'products' && styles.activeTabText]}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {selectedTab === 'products' && (
          <View style={styles.tabContent}>

            <View style={styles.addButtonContainer}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push('/screens/Auction/add_auction_product')} 
              >
                <Text style={styles.addButtonText}>➕ Add Auction Product</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.placeholderText}>Auction products will appear here</Text>
          
          </View>
        )}
        
        {selectedTab === 'history' && (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Auction history will appear here</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // THÊM STYLE CHO NÚT ADD
  addButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  addButton: {
    backgroundColor: '#00A86B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default AuctionHome;