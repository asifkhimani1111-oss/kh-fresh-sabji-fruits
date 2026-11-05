
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCk_W1D1uTzepxR_5Cg54AHiuJL9pBYwsU",
  authDomain: "kh-fresh-fashion-67304.firebaseapp.com",
  projectId: "kh-fresh-fashion-67304",
  storageBucket: "kh-fresh-fashion-67304.firebasestorage.app",
  messagingSenderId: "735561691396",
  appId: "1:735561691396:web:0e36ffdf7b12a9b82ba051"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
