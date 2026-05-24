import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
  , onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 PUT YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyDvA-YfC2udaluBsoyzSrrZ-W-yaCW3tks",
  authDomain: "movie-app-6b21f.firebaseapp.com",
  projectId: "movie-app-6b21f",
  storageBucket: "movie-app-6b21f.firebasestorage.app",
  messagingSenderId: "582845569937",
  appId: "1:582845569937:web:19a3ece22db445db6a5830"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log('script.js loaded');

// Do not force sign-out on load; onAuthStateChanged will set the correct UI.

// Get inputs
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const logoutBtn = document.getElementById("logoutBtn");

const usernameSection = document.getElementById('usernameSection');
const usernameInput = document.getElementById('usernameInput');
const setUsernameBtn = document.getElementById('setUsernameBtn');
const usernameDisplay = document.getElementById('usernameDisplay');

console.log('script initialized');

// SIGN UP
document.getElementById("signupBtn").onclick = () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;

      // create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: email.split("@")[0],
        email: email,
        movies: [],
        shows: [],
        role: "user"
      });

      console.log("User saved to Firestore");
      showApp(user);
    })
    .catch(err => {
      console.error(err);
      alert(err.message);
    });
};

// Helper to show app UI and set username display
function showApp(user) {
  // hide auth/username sections
  if (authSection) authSection.style.display = 'none';
  if (usernameSection) usernameSection.style.display = 'none';
  // show app
  if (appSection) appSection.style.display = 'block';

  // set username display
  const nameToShow = (user && (user.displayName || user.email && user.email.split('@')[0])) || '';
  if (usernameDisplay) usernameDisplay.textContent = nameToShow;
}

// LOGIN
document.getElementById("loginBtn").onclick = () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log('Logged in', userCredential);
      // if user has displayName, go straight to app; otherwise ask for username
      const user = userCredential.user;
      if (user && user.displayName) {
        if (authSection) authSection.style.display = 'none';
        if (appSection) appSection.style.display = 'block';
        if (usernameDisplay) usernameDisplay.textContent = user.displayName;
      } else {
        if (authSection) authSection.style.display = 'none';
        if (usernameSection) usernameSection.style.display = 'block';
      }
    })
    .catch(err => {
      console.error(err);
      alert(err.message);
    });
};

// Observe auth state and toggle UI
onAuthStateChanged(auth, (user) => {
  if (user) {
    // show app, hide auth
    if (authSection) authSection.style.display = "none";
    if (usernameSection) usernameSection.style.display = 'none';
    if (user.displayName) {
      if (appSection) appSection.style.display = "block";
      if (usernameDisplay) usernameDisplay.textContent = user.displayName;
    } else {
      if (usernameSection) usernameSection.style.display = 'block';
    }
  } else {
    // show auth, hide app
    if (authSection) authSection.style.display = "block";
    if (appSection) appSection.style.display = "none";
    if (usernameSection) usernameSection.style.display = "none";
  }
});

// Logout
if (logoutBtn) {
  logoutBtn.onclick = () => {
    signOut(auth)
      .then(() => alert('Logged out'))
      .catch(err => alert(err.message));
  };
}

// Set username handler
if (setUsernameBtn) {
  setUsernameBtn.onclick = () => {
    const uname = usernameInput.value && usernameInput.value.trim();
    if (!uname) {
      alert('Please enter a username');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('No authenticated user');
      return;
    }

    updateProfile(user, { displayName: uname })
      .then(() => {
        if (usernameSection) usernameSection.style.display = 'none';
        if (appSection) appSection.style.display = 'block';
        if (usernameDisplay) usernameDisplay.textContent = uname;
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };
}

// MOVIE FUNCTIONS
function addMovie() {
  const input = document.getElementById("movieInput");
  const list = document.getElementById("moviesList");

  if (input.value === "") return;

  const li = document.createElement("li");
  li.innerHTML =
    input.value +
    ' <button onclick="this.parentElement.remove()">delete</button>';

  list.appendChild(li);
  input.value = "";
}

// SHOW FUNCTIONS
function addShow() {
  const input = document.getElementById("showInput");
  const list = document.getElementById("showsList");

  if (input.value === "") return;

  const li = document.createElement("li");
  li.innerHTML =
    input.value +
    ' <button onclick="this.parentElement.remove()">delete</button>';

  list.appendChild(li);
  input.value = "";
}

// Make functions accessible to HTML buttons
window.addMovie = addMovie;
window.addShow = addShow;