import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
  , onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, updateDoc, arrayUnion } 
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

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp();
    checkAdmin(user);
  } else {
    currentUser = null;
  }

async function showUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  const dataDiv = document.getElementById("userData");
  if (dataDiv) dataDiv.innerHTML = "";

  if (snap.exists()) {
    const data = snap.data();

    if (dataDiv) dataDiv.innerHTML = `
      <h4>${data.name}</h4>
      <p><b>Movies:</b> ${data.movies?.join(", ") || "none"}</p>
      <p><b>Shows:</b> ${data.shows?.join(", ") || "none"}</p>
    `;
  }
}
});

function checkAdmin(user) {
  if (user && user.email === "georgebossingto@gmail.com") {
    const adminPanel = document.getElementById("adminPanel");
    if (adminPanel) adminPanel.style.display = "block";
    if (typeof loadUsers === 'function') loadUsers();
  }
}

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
async function showApp(user) {
  // hide auth/username sections
  if (authSection) authSection.style.display = 'none';
  if (usernameSection) usernameSection.style.display = 'none';
  // show app
  if (appSection) appSection.style.display = 'block';

  // set username display, prefer passed user, then auth.currentUser, then currentUser
  const activeUser = user || auth.currentUser || currentUser;
  const nameToShow = (activeUser && (activeUser.displayName || (activeUser.email && activeUser.email.split('@')[0]))) || '';
  if (usernameDisplay) usernameDisplay.textContent = nameToShow;

  // load persisted user data (movies/shows)
  await loadUserData();

  // show admin panel for a specific admin email
  try {
    const activeUser = auth.currentUser || currentUser;
    const adminPanel = document.getElementById('adminPanel');
    if (activeUser && activeUser.email === "your-email@example.com") {
      if (adminPanel) adminPanel.style.display = 'block';
    } else {
      if (adminPanel) adminPanel.style.display = 'none';
    }
  } catch (err) {
    console.error('Error toggling admin panel', err);
  }
}

// Load user data from Firestore and populate UI
async function loadUserData() {
  try {
    const user = auth.currentUser || currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    // set username from Firestore if present
    if (data.name && usernameDisplay) usernameDisplay.textContent = data.name;

    // populate movies
    const movies = Array.isArray(data.movies) ? data.movies : [];
    const moviesList = document.getElementById('moviesList');
    if (moviesList) {
      moviesList.innerHTML = '';
      movies.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = m + ' <button onclick="this.parentElement.remove()">delete</button>';
        moviesList.appendChild(li);
      });
    }

    // populate shows
    const shows = Array.isArray(data.shows) ? data.shows : [];
    const showsList = document.getElementById('showsList');
    if (showsList) {
      showsList.innerHTML = '';
      shows.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = s + ' <button onclick="this.parentElement.remove()">delete</button>';
        showsList.appendChild(li);
      });
    }
  } catch (err) {
    console.error('Failed to load user data', err);
  }
}

async function loadUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  const userList = document.getElementById("userList");
  if (userList) userList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const li = document.createElement("li");

    li.textContent = docSnap.data().name || docSnap.id;

    li.onclick = () => {
      if (typeof showUserData === 'function') showUserData(docSnap.id);
    };

    if (userList) userList.appendChild(li);
  });
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
async function addMovie() {
  const input = document.getElementById("movieInput");
  const list = document.getElementById("moviesList");

  if (input.value === "" || !currentUser) return;

  const movie = input.value;

  // save to Firestore
  const userRef = doc(db, "users", currentUser.uid);

  await updateDoc(userRef, {
    movies: arrayUnion(movie)
  });

  // update UI
  const li = document.createElement("li");
  li.innerHTML = movie + ' <button onclick="this.parentElement.remove()">delete</button>';
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