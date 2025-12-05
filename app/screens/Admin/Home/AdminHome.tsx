import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
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
    router.push("/screens/Admin/User/AdminUserList");
  };

  const handleManageProducts = () => {
    router.push("/screens/Admin/Product/AdminProductFeed");
  };

  const handleManageAuctions = () => {
    router.push("/screens/Admin/Auction/AdminAuctionFeed");
  };

  return (
    <LinearGradient
      colors={["#003B36", "#dafff1ff", "#66f2f0ff", "#f2f266ff"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image 
            style={styles.avatar} 
            source={require('../../../assets/images/logo.png')}
          />
          <Text style={styles.adminTitle}>Administrator Panel</Text>
          <Text style={styles.welcomeText}>Welcome back, {auth.currentUser?.email?.split('@')[0] || 'Admin'}!</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>👥</Text>
            <Text style={styles.statLabel}>User</Text>
            <Text style={styles.statText}>Management</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>📦</Text>
            <Text style={styles.statLabel}>Product</Text>
            <Text style={styles.statText}>Management</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>⚡</Text>
            <Text style={styles.statLabel}>Auction</Text>
            <Text style={styles.statText}>Management</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <TouchableOpacity style={styles.featureCard} onPress={handleManageUsers}>
            <LinearGradient
              colors={["#3B82F6", "#1D4ED8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featureGradient}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>👥</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>User Management</Text>
                <Text style={styles.featureDescription}>Manage all user accounts and permissions</Text>
              </View>
              <View style={styles.featureArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleManageProducts}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featureGradient}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>📦</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Product Management</Text>
                <Text style={styles.featureDescription}>Approve, reject or delete products</Text>
              </View>
              <View style={styles.featureArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleManageAuctions}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featureGradient}
            >
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>⚡</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Auction Management</Text>
                <Text style={styles.featureDescription}>Manage auction listings and bids</Text>
              </View>
              <View style={styles.featureArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={["#EF4444", "#DC2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Admin System v1.0</Text>
          <Text style={styles.footerEmail}>{auth.currentUser?.email}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  avatar: {
    height: 100,
    width: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#00A86B',
    marginBottom: 16,
  },
  adminTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#003B36",
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  welcomeText: {
    fontSize: 16,
    color: "#003B36",
    textAlign: 'center',
    fontWeight: "600",
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 59, 54, 0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003B36',
    marginBottom: 2,
  },
  statText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  featureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "400",
  },
  featureArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#003B36',
    marginBottom: 4,
    fontWeight: '600',
    opacity: 0.7,
  },
  footerEmail: {
    fontSize: 11,
    color: '#003B36',
    fontWeight: '500',
    opacity: 0.6,
  },
});