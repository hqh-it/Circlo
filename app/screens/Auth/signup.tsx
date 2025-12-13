import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../../firebaseConfig";

  
const {height,width} = Dimensions.get("window");

export default function Signup({navigation}:any) {
  const router = useRouter();  
  const [isVisible,setIsVisible]= useState(true);
  const[email,setEmail]= useState('');
  const[password,setPassword]= useState('');
  const[name,setName]= useState('');
  const[enterpassword,setenterpassword]= useState('');

  const checkpassword = password === enterpassword;
  // Sign up function
  const handleSignup = async() => {
     try{
     const userCredential = await createUserWithEmailAndPassword(auth,email,password);
     const user = userCredential.user;
     await sendEmailVerification(user);
     await setDoc(doc(db, "users", user.uid), {
     fullName: name,
     email: email,
     createdAt: new Date(),
    });
     
     await auth.signOut();
     router.push("/screens/Auth/login"); 
     alert("Sign up successful!\nA verification email has been sent.\nPlease check your inbox and log in again after verifying.");
    }catch(error:any){
      alert("Can not Sign up!: "+ error.message);
    }
  };

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
          width:width*0.9, 
          backgroundColor:"#003b367c", 
          borderRadius:20, alignItems:"center", 
          justifyContent:"flex-start", 
          
          }}>    
            <View style={{ alignItems: "center"}}>
            <View style={{ position: "relative", width: width * 0.7 }}>
                <Text
                style={{
                    fontWeight: "900",
                    color: "#ffffffff",
                    textAlign: "center",
                    fontSize: 30,
                    textShadowColor: "#ffbb00ff",
                    textShadowOffset: { width: 1.5, height: 1.5 },
                    textShadowRadius: 2,
                    borderBottomWidth: 2,
                    paddingBottom: 5,
                    borderColor: "#ffbb00ff",
                    
                }}
                >
                SIGN UP
                </Text>

                <TouchableOpacity onPress={() => router.push("/screens/Auth/login")} style={{ position: "absolute", left: 0, top: 0 }}>
                    <Image
                    style={{
                        position: "absolute",
                        height: height * 0.06,
                        width: height * 0.04,
                        tintColor: "white",
                        resizeMode: "contain",
                    }}
                    source={require("../../assets/icons/back.png")}
                    />
                </TouchableOpacity>
            </View>
            </View>


          {/* Input Name */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:9, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Enter your full Name...'
              onChangeText={setName}
              value={name}
              />
              <Image style={styles.icon}
              source={require('../../assets/icons/user.png')}/>
          </View>

          {/* Input Email */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:9, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Enter your Email...'
              onChangeText={setEmail}
              value={email}/>
              <Image style={styles.icon}
              source={require('../../assets/icons/email.png')}/>
          </View>

          {/* Input password */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:8, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Enter your Password...'
              onChangeText={setPassword}
              value={password}
              secureTextEntry={isVisible} />
          
              <TouchableOpacity onPress={()=>setIsVisible(!isVisible)}>
                  <Image
                  style={styles.icon}
                  source={ isVisible?require('../../assets/icons/password2.png'):require('../../assets/icons/password1.png')}/>
              </TouchableOpacity>
          </View>
          {/* Input password again */}
          <View style={styles.input}>
              <TextInput 
              style={{flex:8, fontSize:13,fontWeight:"bold",color:"#003B36"}}
              placeholder='Confirm your Password...'
              onChangeText={setenterpassword}
              value={enterpassword}
              secureTextEntry={isVisible} />
          
              <TouchableOpacity onPress={()=>setIsVisible(!isVisible)}>
                  <Image
                  style={styles.icon}
                  source={ isVisible?require('../../assets/icons/password2.png'):require('../../assets/icons/password1.png')}/>
              </TouchableOpacity>
          </View>

          {/* Button Sign-in */}  
            <TouchableOpacity onPress={(checkpassword)?handleSignup:()=>alert("Password does not match!")}>
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
                  marginVertical:20,
                  borderWidth:3, borderColor:"#785c10ff"
                }}
              >
                <Text style={{ color: "#ffffffff", fontWeight: "900", fontSize: 18 }}>
                  Sign up
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
    marginVertical:15,
  },
  signup:{
    flexDirection:"row",
    justifyContent:"center",
    marginBottom:10,
    alignContent:"space-between"
  }
});