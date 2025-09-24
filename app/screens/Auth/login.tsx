import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

const {height,width} = Dimensions.get("window");

export default function Login({navigation}:any) {
  const router = useRouter();
  const [isVisible,setIsVisible]= useState(true);
  
  const[email,setEmail]= useState('');
  const[password,setPassword]= useState('');
  const[user,setUser]= useState<any>(null);

  useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, (user)=>{
      setUser(user);
    });
    return unsubscribe;
  },[]);

  // Handle login
  const handleLogin = async() => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // checck if email is verified
      if (user.emailVerified) {
      console.log("Logged in with:", user.email);
      router.push("/screens/Home/homepage");
    } else {      
      await auth.signOut();
      alert("Please verify your email before logging in.");
      }
    } catch (error) {
      console.log('Login error:', error);
      alert('Login failed. Please check your email and password.');
    }
  }


  const handleForgotPassword = async() => {
    try{
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    }catch(error:any){
      alert("Can't reset password!"+ error.message);
    }

  }

  return (
    <LinearGradient
        colors={["#003B36", "#dafff1ff", "#66f2f0ff","#f2f266ff"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
        >
    <SafeAreaView style={styles.container}>
        {/* logo */}
        <Image style={ {height: height*0.2, width:height*0.2, borderRadius:30, borderWidth:10, borderColor:"#00A86B", marginTop:20, marginBottom:10}} source={require('../../assets/images/logo.png')}/>
        <Text style={ {fontWeight:"900", color:"#003B36", width:width*0.7,textAlign:"center", fontSize:16, marginBottom:10}}>Secondhand Buying & Trading App</Text>
        
        <View style={{
          height:height*0.5,
          width:width*0.9, 
          backgroundColor:"#003b367c", 
          borderRadius:20, alignItems:"center", 
          justifyContent:"space-around", 
          }}>    

          <Text style={ {fontWeight:"900",
            color:"#ffffffff", 
            width:width*0.7,textAlign:"center", 
            fontSize:30, textShadowColor:"#ffbb00ff",
            textShadowOffset:{width:1.5, height:1.5},
            textShadowRadius:2,
            borderBottomWidth:2,
            paddingBottom:5,
            borderColor:"#ffbb00ff",
          }}>LOG IN</Text>
          {/* Input Email */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:9, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Email...'
              onChangeText={setEmail}
              value={email}/>
              
              <Image style={styles.icon}
              source={require('../../assets/icons/user.png')}/>
          </View>

          {/* Input password */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:8, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Password...'
              onChangeText={setPassword}
              value={password}
              secureTextEntry={isVisible} />
          
              <TouchableOpacity onPress={()=>setIsVisible(!isVisible)}>
                  <Image
                  style={styles.icon}
                  source={ isVisible?require('../../assets/icons/password2.png'):require('../../assets/icons/password1.png')}/>
              </TouchableOpacity>
          </View>

          {/* forget password */}
          <View style={{width:width*0.77, alignItems:"flex-end", marginTop:-10}}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={{paddingEnd:5,fontSize:15, textAlign:"left",color:"#ffffffff"}}>Forgot password?</Text>
            </TouchableOpacity></View>
                    {/* Button Sign-in */}  
            <TouchableOpacity onPress={handleLogin}>
              <LinearGradient
                colors={["#f2f266ff","#ba9122ff","#deaf2fff","#f2f266ff",]}
                start={{ x: 1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width:width*0.75,
                  paddingVertical: 15,
                  paddingHorizontal: 35,
                  borderRadius: 10,
                  alignItems: "center",
                  marginBottom:10,
                  borderWidth:3, borderColor:"#785c10ff",
                }}
              >
                <Text style={{ color: "#ffffffff", fontWeight: "900", fontSize: 18 }}>
                  Log in
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          <View style={[styles.signup, 
            { flexDirection: "row", 
            justifyContent:'center', 
            alignItems:"center",
            width:width*0.75,
            backgroundColor:"#003b36cf",
            padding:10, borderWidth:2, borderColor:"#ffffffff", borderRadius:10
            }]} >
              <Text style={{paddingEnd:5, textAlign:"left",color:"white"}}>You don't have an account?</Text>
              <TouchableOpacity onPress={()=>router.push("/screens/Auth/signup")}>
                  <Text style={{ color: "#ffffffff", 
                    fontWeight: "bold",
                    fontSize:16,
                    textShadowColor:"#ffbb00ff",
                    textShadowOffset:{width:1.2, height:1},
                    textShadowRadius:1,
                    }}>Sign up</Text>
              </TouchableOpacity>
          </View>  
        </View>
        </SafeAreaView> 
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    alignItems: "center",
    width: "100%",
  },
    gradient: {
    flex: 1,
    width: "100%",
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
  },
    icon: {
    height:height*0.04,
    width:height*0.04, 
    tintColor: "black",
    resizeMode: "contain",
    margin:10,
    flex:1,
    alignItems:"center",
  },
  input:{
    height:height* 0.06,
    width: width* 0.75,
    flexDirection:"row",
    justifyContent:"flex-start",
    alignItems: "center",
    backgroundColor:"#ffffffff",
    borderRadius:5,
    paddingLeft:5,
    borderBottomWidth:4,
    borderColor:"#ffc768ff",
  },
  signup:{
    flexDirection:"row",
    justifyContent:"center",
    marginBottom:10,
    alignContent:"space-between"
  }
});