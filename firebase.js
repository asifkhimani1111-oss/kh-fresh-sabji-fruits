
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCk_W1D1uTzepxR_5Cg54AHiuJL9pBYwsU",
  authDomain: "kh-fresh-fashion-67304.firebaseapp.com",
  projectId: "kh-fresh-fashion-67304",
  storageBucket: "kh-fresh-fashion-67304.firebasestorage.app",
  messagingSenderId: "735561691396",
  appId: "1:735561691396:web:0e36ffdf7b12a9b82ba051"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
