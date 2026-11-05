
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// K.H Fresh & Fashion Firebase Configuration

const firebaseConfig = {
  apiKey: "AIzaSyCGSZ7QcASC_sUV6f7NDJrMbn0Ae-f9pR8",
  authDomain: "kh-fresh-sabji-fruits.firebaseapp.com",
  projectId: "kh-fresh-sabji-fruits",
  storageBucket: "kh-fresh-sabji-fruits.firebasestorage.app",
  messagingSenderId: "815611229461",
  appId: "1:815611229461:web:ca713dc978e0997930251c",
  measurementId: "G-HBL4EVF1MN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);

// Firestore Database
const db = getFirestore(app);

// Export for all pages
export { app, auth, db };