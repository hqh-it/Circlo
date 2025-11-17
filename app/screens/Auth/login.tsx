import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../../firebaseConfig";

const {height, width} = Dimensions.get("window");

export default function Login() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const isAdmin = userData?.role === 'admin';

      if (isAdmin) {
        router.push("/screens/Admin/Home/AdminHome");
        return;
      }

      if (user.emailVerified) {
        router.push("/screens/Home/homepage");
      } else {      
        await auth.signOut();
        alert("Please verify your email before logging in.");
      }
    } catch (error: any) {
      let errorMessage = "Login failed. Please check your email and password.";
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      alert("Unable to send password reset email. Please check your email address.");
    }
  };

  return (
    <LinearGradient
      colors={["#003B36", "#dafff1ff", "#66f2f0ff", "#f2f266ff"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <Image 
          style={styles.logo} 
          source={require('../../assets/images/logo.png')}
        />
        <Text style={styles.appTitle}>
          Secondhand Buying & Trading App
        </Text>
        
        <View style={styles.loginContainer}>
          <Text style={styles.loginTitle}>LOG IN</Text>
          
          <View style={styles.input}>
            <TextInput 
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor="#666"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Image 
              style={styles.icon}
              source={require('../../assets/icons/user.png')}
            />
          </View>

          <View style={styles.input}>
            <TextInput 
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#666"
              onChangeText={setPassword}
              value={password}
              secureTextEntry={isVisible}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
              <Image
                style={styles.icon}
                source={isVisible ? 
                  require('../../assets/icons/password2.png') : 
                  require('../../assets/icons/password1.png')
                }
              />
            </TouchableOpacity>
          </View>

          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleLogin} 
            disabled={isLoading}
            style={isLoading ? styles.disabledButton : null}
          >
            <LinearGradient
              colors={["#f2f266ff", "#ba9122ff", "#deaf2fff", "#f2f266ff"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "LOGGING IN..." : "LOG IN"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/screens/Auth/signup")}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
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
    width: "100%",
  },
  logo: {
    height: height * 0.2,
    width: height * 0.2,
    borderRadius: 30,
    borderWidth: 10,
    borderColor: "#00A86B",
    marginTop: 20,
    marginBottom: 10,
  },
  appTitle: {
    fontWeight: "900",
    color: "#003B36",
    width: width * 0.7,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 10,
  },
  loginContainer: {
    height: height * 0.5,
    width: width * 0.9,
    backgroundColor: "#003b367c",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-around",
  },
  loginTitle: {
    fontWeight: "900",
    color: "#ffffff",
    width: width * 0.7,
    textAlign: "center",
    fontSize: 30,
    textShadowColor: "#ffbb00ff",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 2,
    borderBottomWidth: 2,
    paddingBottom: 5,
    borderColor: "#ffbb00ff",
  },
  input: {
    height: height * 0.06,
    width: width * 0.75,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 5,
    paddingLeft: 5,
    borderBottomWidth: 4,
    borderColor: "#ffc768ff",
  },
  textInput: {
    flex: 9,
    fontSize: 13,
    fontWeight: "bold",
    color: "#003B36",
  },
  icon: {
    height: height * 0.04,
    width: height * 0.04,
    tintColor: "black",
    resizeMode: "contain",
    margin: 10,
    flex: 1,
    alignItems: "center",
  },
  forgotPasswordContainer: {
    width: width * 0.77,
    alignItems: "flex-end",
    marginTop: -10,
  },
  forgotPasswordText: {
    paddingEnd: 5,
    fontSize: 15,
    textAlign: "left",
    color: "#ffffff",
  },
  loginButton: {
    width: width * 0.75,
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#785c10ff",
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: width * 0.75,
    backgroundColor: "#003b36cf",
    padding: 10,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 10,
  },
  signupText: {
    paddingEnd: 5,
    textAlign: "left",
    color: "white",
  },
  signupLink: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    textShadowColor: "#ffbb00ff",
    textShadowOffset: { width: 1.2, height: 1 },
    textShadowRadius: 1,
  },
});