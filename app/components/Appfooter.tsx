import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../services/Auth/AuthContext";
import { chatService } from "../../services/Chat/chatService";

const { height, width } = Dimensions.get("window");

interface AppFooterProps {
  onTabChange?: (tab: 'normal' | 'auction') => void;
  currentTab?: 'normal' | 'auction';
}

export default function Appfooter({ onTabChange, currentTab = 'normal' }: AppFooterProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const loadUnreadCount = async () => {
    try {
      if (!user) return;
      const count = await chatService.getUnreadMessagesCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadUnreadCount();
      }
    }, [user])
  );

  const handleHomePress = () => {
    if (onTabChange) {
      onTabChange('normal');
    }
  };

  const handleAuctionPress = () => {
    if (onTabChange) {
      onTabChange('auction');
    }
  };

  const handleAddPress = () => {
    setShowAddOptions(true);
  };

  const handleNormalProduct = () => {
    setShowAddOptions(false);
    router.push('/screens/Products/add_product');
  };

  const handleAuctionProduct = () => {
    setShowAddOptions(false);
    router.push('/screens/Auction/add_auction_product');
  };

  const closeModal = () => {
    setShowAddOptions(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#003B36", "#00A86B", "#92f266"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <TouchableOpacity onPress={handleHomePress}>
          <Image 
            style={[
              styles.icon, 
              currentTab === 'normal' && styles.activeIcon
            ]} 
            source={require("../assets/icons/home.png")} 
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAuctionPress}>
          <Image 
            style={[
              styles.icon, 
              currentTab === 'auction' && styles.activeIcon
            ]} 
            source={require("../assets/icons/auction.png")} 
          />
        </TouchableOpacity>

        <View style={{ width: width * 0.01 }} />

        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/bell.png")} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/screens/Chat/chatListScreen")}>
          <View style={styles.chatIconContainer}>
            <Image style={styles.icon} source={require("../assets/icons/chat.png")} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
      
      <View style={styles.under_main_button}>
        <TouchableOpacity 
          style={styles.main_button} 
          onPress={handleAddPress}
        >
          <Image style={styles.icon} source={require("../assets/icons/flus.png")} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={handleNormalProduct}
            >
              <Text style={styles.optionText}>Normal Product</Text>
            </TouchableOpacity>
            
            <View style={styles.separator} />
            
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={handleAuctionProduct}
            >
              <Text style={styles.optionText}>Auction Product</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.085,
    alignItems: "center",
    width: width
  },
  gradient: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  icon: {
    height: height * 0.04,
    width: height * 0.04,
    margin: height * 0.01,
    tintColor: "white",
  },
  activeIcon: {
    tintColor: '#FFD700',
    transform: [{ scale: 1.1 }],
  },
  chatIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: height * 0.005,
    right: height * 0.005,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  main_button: {
    height: height * 0.1,
    width: height * 0.1,
    backgroundColor: "#D4A017",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  under_main_button: {
    height: height * 0.12,
    width: height * 0.12,
    backgroundColor: "#ffffffff",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: height * 0.035,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    width: width * 0.7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionButton: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
  },
});