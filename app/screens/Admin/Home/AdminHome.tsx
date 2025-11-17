import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from "../../../../firebaseConfig";

const {height, width} = Dimensions.get("window");

export default function AdminHome() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/screens/Auth/login");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleManageUsers = () => {
    // Sau này sẽ điều hướng đến trang quản lý users
    alert("Tính năng quản lý users sẽ được phát triển sau!");
  };

  const handleManageProducts = () => {
    // Sau này sẽ điều hướng đến trang quản lý sản phẩm
    alert("Tính năng quản lý sản phẩm sẽ được phát triển sau!");
  };

  return (
    <LinearGradient
      colors={["#003B36", "#dafff1ff", "#66f2f0ff", "#f2f266ff"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            style={styles.logo} 
            source={require('../../../assets/images/logo.png')}
          />
          <Text style={styles.adminTitle}>👑 ADMIN DASHBOARD</Text>
          <Text style={styles.welcomeText}>Chào mừng Admin!</Text>
        </View>

        {/* Admin Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>QUẢN LÝ HỆ THỐNG</Text>
          
          {/* Feature Buttons */}
          <TouchableOpacity style={styles.featureButton} onPress={handleManageUsers}>
            <LinearGradient
              colors={["#4CAF50", "#45a049"]}
              style={styles.gradientButton}
            >
              <Text style={styles.featureText}>👥 Quản lý Người dùng</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureButton} onPress={handleManageProducts}>
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              style={styles.gradientButton}
            >
              <Text style={styles.featureText}>📦 Quản lý Sản phẩm</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureButton}>
            <LinearGradient
              colors={["#FF9800", "#F57C00"]}
              style={styles.gradientButton}
            >
              <Text style={styles.featureText}>⚡ Quản lý Đấu giá</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureButton}>
            <LinearGradient
              colors={["#9C27B0", "#7B1FA2"]}
              style={styles.gradientButton}
            >
              <Text style={styles.featureText}>📊 Thống kê & Báo cáo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={["#ff4444", "#cc0000"]}
            style={styles.gradientButton}
          >
            <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Quyền hạn: Administrator</Text>
          <Text style={styles.footerText}>Email: {auth.currentUser?.email}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: "100%",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    height: height * 0.12,
    width: height * 0.12,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: "#00A86B",
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#003B36",
    marginTop: 10,
    textShadowColor: "#ffbb00",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  welcomeText: {
    fontSize: 16,
    color: "#003B36",
    marginTop: 5,
    fontWeight: "600",
  },
  featuresContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003B36",
    marginBottom: 20,
    textAlign: "center",
  },
  featureButton: {
    width: "90%",
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gradientButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  featureText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    width: "80%",
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#003B36",
    marginBottom: 5,
  },
});