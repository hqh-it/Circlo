import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAgLBu7Eh_THKmwQsAYLLi5D2j9M75l0vs",
  authDomain: "circlo-c6d57.firebaseapp.com",
  projectId: "circlo-c6d57",
  storageBucket: "circlo-c6d57.appspot.com",
  messagingSenderId: "504905484172",
  appId: "1:504905484172:android:7ccf6f8cd18960405938a9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };

