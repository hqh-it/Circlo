import Appfooter from "@/app/components/Appfooter";
import Appheader from "@/app/components/Appheader";
import { usePathname, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductFeed from "../../../app/components/ProductFeed";
import { auth, db } from "../../../firebaseConfig";
function Homepage() {
    const router = useRouter();
    const pathname = usePathname();
    
    // fetch user data to display on homepage
    const [fullname, setfullname]= useState<string>("");
    useEffect(()=>{
        const fetchUserData = async() =>{
            const user = auth.currentUser;
            if(user){
                try{
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if(docSnap.exists()){
                    const userData = docSnap.data();
                    setfullname(userData.fullName);
                }else{
                    console.log("No such document!");
                }
                }catch(error){
                    console.log("Error getting document:", error);
                }
            }
        };
        fetchUserData();
        },[]);

    return (

        <SafeAreaView
        style={{
          flex: 1,
          flexDirection:"column",
          alignItems:"center",
          backgroundColor:"#ffffffff"
        }}> 
            <Appheader/>
            <View style={{ flex: 1 }}>
                <ProductFeed />
            </View>
            <Appfooter/>
        </SafeAreaView>
    );
}

export default Homepage;