import Appfooter from "@/app/components/Appfooter";
import Appheader from "@/app/components/Appheader";
import { usePathname, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../firebaseConfig";

function Homepage() {
    const router = useRouter();
    const pathname = usePathname();
    // control back button behavior when on homepage
    // useEffect(() => {
    //     const backAction = () => {
    //     Alert.alert("Exit App!", "Are you sure to exit?", [
    //         { text: "Cancel", style: "cancel" },
    //         { text: "OK", onPress: () => BackHandler.exitApp() }
    //     ]);
    //     return true; 
    //     };

    //     const backHandler = BackHandler.addEventListener(
    //     "hardwareBackPress",
    //     backAction
    //     );

    //     return () => backHandler.remove(); 
    // }, []);

    // // log out function
    // const handleLogout = async () => {
    //     try {
    //     await signOut(auth);
    //     router.replace("/screens/Auth/login"); 
    //     } catch (error) {
    //     console.log("Logout error:", error);
    //     }
    // };
    
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
            <Appfooter/>
        </SafeAreaView>
    );
}

export default Homepage;