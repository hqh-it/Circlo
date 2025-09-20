import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Appfooter from "./components/Appfooter";
import Appheader from "./components/Appheader";

export default function Homepage() {
  return (
    <SafeAreaView style={{
          flex: 1,
          flexDirection:"column",
          alignItems:"center",
          backgroundColor:"#ffffffff"
        }}>   
        <Appheader/>
        <Text>Chưa có sản phẩm nào cả !</Text>
        <Appfooter/>
    </SafeAreaView>
  );
}