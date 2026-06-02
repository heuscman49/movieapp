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
    if (authSection) authSection.style.display = 'block';
    if (appSection) appSection.style.display = 'none';
  }

async function searchMovies(query) {
  const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${query}&api_key=608767c8f52970a29bb38126d419116e`
  );

  const data = await res.json();
  return data.results;
}

async function addMedia(item) {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);

    await updateDoc(userRef, {
      movies: arrayUnion({
        title: item.title || item.name,
        poster: item.poster_path || null,
        overview: item.overview || "",
        rating: null,
        watched: false,
        review: ""
      })
    });

    if (typeof loadUserData === 'function') await loadUserData();
  } catch (err) {
    console.error("Failed to add media", err);
  }
}

async function loadWatched() {
  const filter = document.getElementById("filterType").value;

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();

  let items = [];

  if (filter === "all" || filter === "movies") {
    items.push(...(data.movies || []).filter(m => m.watched));
  }

  if (filter === "all" || filter === "shows") {
    items.push(...(data.shows || []).filter(s => s.watched));
  }

  const container = document.getElementById("watchedList");
  container.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h4>${item.title}</h4>
      <p>⭐ ${item.rating || "N/A"}</p>
      <p>${item.review || ""}</p>
    `;

    container.appendChild(div);
  });
}
});

function checkAdmin(user) {
  if (user && user.email === "georgebossingto@gmail.com") {
    document.getElementById("adminPanel").style.display = "block";
    loadUsers();
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

let selectedItem = null;
let selectedType = null;

function openReview(type, title) {
  selectedItem = title;
  selectedType = type;

  const box = document.getElementById("reviewBox");
  if (box) box.style.display = "block";
}

document.getElementById("submitReviewBtn").onclick = async () => {
  const rating = document.getElementById("ratingInput").value;
  const review = document.getElementById("reviewText").value;

  if (!currentUser || !selectedItem) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const data = snap.data();

  const updatedMovies = (data.movies || []).map(m =>
    m.title === selectedItem
      ? { ...m, watched: true, rating, review }
      : m
  );

  await updateDoc(ref, { movies: updatedMovies });

  const box = document.getElementById("reviewBox");
  if (box) box.style.display = "none";

  if (typeof loadUserData === 'function') loadUserData();
  if (typeof loadWatched === 'function') loadWatched();
};

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

      await setDoc(doc(db, "users", user.uid), {
        name: email.split("@")[0],
        email: email,
        movies: [],
        shows: []
      });

      console.log("User added to Firestore");

      showApp();
    })
    .catch(err => alert(err.message));
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
    if (activeUser && activeUser.email === "georgebossingto@gmail.com") {
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
  console.log("🔄 loading users...");

  const snapshot = await getDocs(collection(db, "users"));

  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  if (snapshot.empty) {
    userList.innerHTML = "<li>❌ No users found in Firestore</li>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const li = document.createElement("li");

    li.innerHTML = "👤 " + (data.name || docSnap.id);

    li.style.padding = "8px";
    li.style.marginBottom = "6px";
    li.style.background = "#eee";
    li.style.borderRadius = "6px";
    li.style.cursor = "pointer";

    li.onclick = () => showUserData(docSnap.id);

    userList.appendChild(li);
  });

  console.log("✅ users loaded:", snapshot.size);
}

async function showUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  const box = document.getElementById("userData");

  if (!snap.exists()) {
    if (box) box.innerHTML = "User not found";
    return;
  }

  const data = snap.data();

  if (box) box.innerHTML = `
    <h3>👤 ${data.name}</h3>

    <p><b>Email:</b> ${data.email}</p>

    <h4>🎬 Movies</h4>
    <ul>
      ${(data.movies || []).map(m => `<li>${m}</li>`).join("")}
    </ul>

    <h4>📺 Shows</h4>
    <ul>
      ${(data.shows || []).map(s => `<li>${s}</li>`).join("")}
    </ul>
  `;
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
    movies: arrayUnion({
      title: movie,
      watched: false,
      rating: null,
      review: ""
    })
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

const filterEl = document.getElementById("filterType");
if (filterEl) filterEl.onchange = () => { if (typeof loadWatched === 'function') loadWatched(); };

// Search input handler: call TMDB and render results
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (!query || query.length < 2) return;

    const results = await searchMovies(query);

    const box = document.getElementById('searchResults');
    if (!box) return;
    box.innerHTML = '';

    (results || []).slice(0, 5).forEach(item => {
      const div = document.createElement('div');

      div.innerHTML = `\n      <b>${item.title || item.name}</b>\n      <button>Add</button>\n    `;

      div.onclick = () => { if (typeof addMedia === 'function') addMedia(item); };

      box.appendChild(div);
    });
  });
}

// Make functions accessible to HTML buttons
window.addMovie = addMovie;
window.addShow = addShow;