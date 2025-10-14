// THAY THẾ TOÀN BỘ AppFooter.tsx
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../services/Auth/AuthContext";
import { chatService } from "../../services/Chat/chatService";

const { height, width } = Dimensions.get("window");

export default function Appfooter() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      if (!user) return;
      const count = await chatService.getUnreadMessagesCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Load khi component mount
  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  // Load lại khi focus (khi quay lại từ chat screen)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadUnreadCount();
      }
    }, [user])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#003B36", "#00A86B", "#92f266"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Home Button */}
        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/home.png")} />
        </TouchableOpacity>

        {/* Auction Button */}
        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/auction.png")} />
        </TouchableOpacity>

        <View style={{ width: width * 0.01 }} />

        {/* Notification Button */}
        <TouchableOpacity>
          <Image style={styles.icon} source={require("../assets/icons/bell.png")} />
        </TouchableOpacity>

        {/* Chat Button with Badge */}
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
        <TouchableOpacity style={styles.main_button} onPress={() => router.push('/screens/Products/add_product')}>
          <Image style={styles.icon} source={require("../assets/icons/flus.png")} />
        </TouchableOpacity>
      </View>
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
});