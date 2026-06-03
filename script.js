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

// select a star for rating UI
window.selectStar = (index, value) => {
  const starsEl = document.getElementById(`stars-${index}`);
  if (!starsEl) return;

  // update hidden input
  const input = document.getElementById(`rating-input-${index}`);
  if (input) input.value = value;

  // update visuals
  Array.from(starsEl.querySelectorAll('.star')).forEach(span => {
    const v = Number(span.getAttribute('data-value'));
    if (v <= value) span.classList.add('selected'); else span.classList.remove('selected');
  });
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log('script.js loaded');

let currentUser = null;

// Detect if device supports touch
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp();
    checkAdmin(user);
  } else {
    currentUser = null;
    if (authSection) authSection.style.display = 'block';
    if (appSection) appSection.style.display = 'none';
    const leftPane = document.getElementById('leftPane');
    if (leftPane) leftPane.style.display = 'block';
    // restore layout spacing
    document.body.style.marginLeft = '260px';
  }

/* markActiveThemeTile defined later; avoid duplicate */

// Removed global delegated theme click handler to avoid conflicts.
// Theme tile clicks are handled below in DOMContentLoaded with per-tile listeners.

// mark an item watched by adding it to the user's watched array
async function markWatched(type, index) {
  if (!currentUser) return alert('Not signed in');

  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return console.error('User doc missing');

  const data = userSnap.data() || {};
  const arr = type === 'movie' ? (data.movies || []) : (data.shows || []);
  if (index < 0 || index >= arr.length) return console.error('Index OOB');

  const item = arr[index];
  if (!item) return console.error('Item not found');

  // remove from original array
  const newArr = arr.slice();
  newArr.splice(index, 1);

  const watchedItem = {
    ...item,
    type,
    rating: 0,
    review: ""
  };

  const updatePayload = { watched: arrayUnion(watchedItem) };
  updatePayload[type + 's'] = newArr;

  await updateDoc(userRef, updatePayload);

  console.log('Moved to watched and removed from list');

  // refresh UI where appropriate
  if (typeof loadUserData === 'function') loadUserData();
  if (typeof loadWatched === 'function') loadWatched();
}

// expose markWatched and deleteItem for inline onclick handlers
window.markWatched = markWatched;

// delete function: remove item by index from movies/shows arrays
window.deleteItem = async (type, index) => {
  if (!currentUser) return alert('Not signed in');

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return console.error('User doc missing');
  const data = snap.data() || {};

  const updated =
    type === "movie"
      ? (data.movies || []).filter((_, i) => i !== index)
      : (data.shows || []).filter((_, i) => i !== index);

  await updateDoc(userRef, {
    [type + "s"]: updated
  });

  if (typeof loadUserData === 'function') loadUserData();
};

});

async function searchMovies(query) {
  const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${query}&api_key=608767c8f52970a29bb38126d419116e`
  );

  const data = await res.json();
  return data.results;
}

async function addMedia(item) {
  console.log("ADDING MEDIA:", item);
  console.log("CURRENT USER:", currentUser);
  if (!currentUser) return;
  const userRef = doc(db, "users", currentUser.uid);

  const isMovie = item.media_type === "movie";

  const mediaObject = {
    title: item.title || item.name,
    poster: item.poster_path,
    overview: item.overview || "",
    date: item.release_date || item.first_air_date || "",
    rating: null,
    watched: false,
    review: "",
    type: isMovie ? "movie" : "show"
  };

  if (isMovie) {
    try {
      await updateDoc(userRef, {
        movies: arrayUnion(mediaObject)
      });
      console.log("Saved to Firestore");
    } catch (err) {
      console.error("Firestore error:", err);
    }
  } else {
    try {
      await updateDoc(userRef, {
        shows: arrayUnion(mediaObject)
      });
      console.log("Saved to Firestore");
    } catch (err) {
      console.error("Firestore error:", err);
    }
  }

  // UI cleanup
  const si = document.getElementById("searchInput");
  const rb = document.getElementById("resultsBox");
  if (si) si.value = "";
  if (rb) rb.style.display = "none";

  if (typeof loadUserData === 'function') loadUserData();
}

async function loadWatched() {
  const filterEl = document.getElementById("filterType");
  const filter = filterEl ? filterEl.value : "all";

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data() || {};

  const container = document.getElementById("watchedList");
  if (!container) return;
  container.innerHTML = "";

  // determine watched items depending on filter
  let watched = Array.isArray(data.watched) ? data.watched : [];

  if (filter === "movies") {
    watched = watched.filter(w => w.type === "movie");
  } else if (filter === "shows") {
    watched = watched.filter(w => w.type === "show");
  }

  watched.forEach((w, i) => {
    const li = document.createElement("li");
    // if already reviewed (has rating), show static stars + review text and no inputs
    const hasRating = w && w.rating; // truthy rating indicates submitted
    let starsHtml = '';
    const currentRating = w.rating || 0;

    if (hasRating) {
      for (let s = 1; s <= 5; s++) {
        const filled = s <= currentRating ? 'selected' : '';
        // no onclick for static stars
        starsHtml += `<span class="star ${filled}" data-value="${s}">★</span>`;
      }

      li.innerHTML = `
        <div class="watched-item">
          <div class="watched-title"><strong>${w.title}</strong></div>

          <div class="watched-rating-row">
            <div class="stars" id="stars-${i}">${starsHtml}</div>
          </div>

          <div class="watched-controls">
            <div class="watched-review-display"><span class="review-submitted">Review submitted</span></div>
          </div>
        </div>
      `;
    } else {
      // interactive UI when not yet submitted
      for (let s = 1; s <= 5; s++) {
        starsHtml += `<span class="star" data-value="${s}" onclick="selectStar(${i}, ${s})">★</span>`;
      }

      li.innerHTML = `
        <div class="watched-item">
          <div class="watched-title"><strong>${w.title}</strong></div>

          <div class="watched-rating-row">
            <div class="stars" id="stars-${i}">${starsHtml}</div>
          </div>

          <div class="watched-controls">
            <input id="rating-input-${i}" type="hidden" value="${w.rating || ''}">
            <textarea id="review-input-${i}" class="watched-review-input" placeholder="Review" onchange="setReview(${i}, this.value)">${(w.review||'').replace(/</g,'&lt;')}</textarea>
            <div class="watched-control-row"><button onclick="submitRating(${i})">Submit</button></div>
          </div>
        </div>
      `;
    }

    // preview handlers attached to the title element only (limits hover area)
    const titleEl = li.querySelector('.watched-title');
    if (titleEl) {
      if (isTouchDevice) {
        // Mobile: tap to show, tap to hide
        let previewVisible = false;
        titleEl.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!previewVisible) {
            const previewItem = {
              title: w && (w.title || w.name) || '',
              name: w && (w.name || w.title) || '',
              poster_path: w && (w.poster || w.poster_path) || '',
              release_date: w && (w.date || w.release_date) || '',
              first_air_date: w && (w.date || w.first_air_date) || '',
              overview: w && (w.overview || '') || '',
              media_type: w && (w.type === 'movie' ? 'movie' : (w.type === 'show' ? 'tv' : undefined))
            };
            showPreview(previewItem, e.clientX, e.clientY);
            previewVisible = true;
          } else {
            hidePreview();
            previewVisible = false;
          }
        });
      } else {
        // PC: hover to show
        titleEl.addEventListener('mouseenter', (e) => {
          const previewItem = {
            title: w && (w.title || w.name) || '',
            name: w && (w.name || w.title) || '',
            poster_path: w && (w.poster || w.poster_path) || '',
            release_date: w && (w.date || w.release_date) || '',
            first_air_date: w && (w.date || w.first_air_date) || '',
            overview: w && (w.overview || '') || '',
            media_type: w && (w.type === 'movie' ? 'movie' : (w.type === 'show' ? 'tv' : undefined))
          };
          showPreview(previewItem, e.clientX, e.clientY);
        });

        titleEl.addEventListener('mousemove', (e) => clampPreviewPosition(e.clientX, e.clientY));
        titleEl.addEventListener('mouseleave', hidePreview);
      }
    }

    container.appendChild(li);
  });
}

window.setRating = async (index, value) => {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const watched = data.watched;

  watched[index].rating = Number(value);

  await updateDoc(userRef, { watched });
};

window.setReview = async (index, value) => {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const watched = data.watched;

  watched[index].review = value;

  await updateDoc(userRef, { watched });
};

// submit the rating/review for a watched item and refresh the ratings panel
window.submitRating = async (index) => {
  if (!currentUser) return alert('Not signed in');

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched.slice() : [];

  if (index < 0 || index >= watched.length) return console.error('Index OOB');

  // values should already be set via setRating/setReview handlers, but ensure we read inputs
  const ratingEl = document.getElementById(`rating-input-${index}`);
  const reviewEl = document.getElementById(`review-input-${index}`);
  if (ratingEl) watched[index].rating = Number(ratingEl.value) || 0;
  if (reviewEl) watched[index].review = reviewEl.value || '';

  await updateDoc(userRef, { watched });

  // refresh watched UI and ratings panel
  if (typeof loadWatched === 'function') loadWatched();
  if (typeof loadRatings === 'function') loadRatings();
  if (typeof loadRecentActivity === 'function') loadRecentActivity();
};

// populate the top-right ratings panel with reviewed items (with edit/delete)
async function loadRatings() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data() || {};

  const list = document.getElementById('ratingsList');
  if (!list) return;
  list.innerHTML = '';

  const watched = Array.isArray(data.watched) ? data.watched : [];

  watched.forEach((w, i) => {
    if (!w || !w.rating) return; // only show items with ratings

    const li = document.createElement('li');
    li.id = `rating-item-${i}`;
    li.innerHTML = `
      <strong>${w.title}</strong><br>
      ⭐ ${w.rating} — ${w.review || ''}
      <div style="margin-top:6px;">
        <button onclick="editReview(${i})">Edit</button>
        <button onclick="deleteReview(${i})">Delete</button>
      </div>
    `;

    list.appendChild(li);
  });
}

// delete a review (clears rating and review for the watched item)
window.deleteReview = async (index) => {
  if (!currentUser) return alert('Not signed in');
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return console.error('User doc missing');
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched.slice() : [];
  if (index < 0 || index >= watched.length) return console.error('Index OOB');

  watched[index] = { ...watched[index], rating: null, review: "" };
  await updateDoc(userRef, { watched });

  if (typeof loadRatings === 'function') loadRatings();
  if (typeof loadWatched === 'function') loadWatched();
};

// open inline editor for a review in the ratings panel
window.editReview = async (index) => {
  if (!currentUser) return;
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched : [];
  const item = watched[index] || {};

  const li = document.getElementById(`rating-item-${index}`);
  if (!li) return;

  const currentRating = item.rating || 0;
  const currentReview = item.review || '';

  // build star editor
  let starsHtml = '';
  for (let s = 1; s <= 5; s++) {
    const filled = s <= currentRating ? 'selected' : '';
    starsHtml += `<span class="star ${filled}" data-value="${s}" onclick="selectEditStar(${index}, ${s})">★</span>`;
  }

  li.innerHTML = `
    <strong>${item.title}</strong>
    <div class="stars" id="stars-edit-${index}">${starsHtml}</div>
    <input id="edit-rating-input-${index}" type="hidden" value="${currentRating}">
    <textarea id="edit-review-input-${index}" rows="3">${(currentReview||'').replace(/</g,'&lt;')}</textarea>
    <div style="margin-top:6px;"><button onclick="saveEditedReview(${index})">Save</button> <button onclick="loadRatings()">Cancel</button></div>
  `;
};

// helper for star clicks inside the edit UI
window.selectEditStar = (index, value) => {
  const starsEl = document.getElementById(`stars-edit-${index}`);
  if (!starsEl) return;
  const input = document.getElementById(`edit-rating-input-${index}`);
  if (input) input.value = value;

  Array.from(starsEl.querySelectorAll('.star')).forEach(span => {
    const v = Number(span.getAttribute('data-value'));
    if (v <= value) span.classList.add('selected'); else span.classList.remove('selected');
  });
};

// save edited review back to Firestore
window.saveEditedReview = async (index) => {
  if (!currentUser) return alert('Not signed in');
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return console.error('User doc missing');
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched.slice() : [];
  if (index < 0 || index >= watched.length) return console.error('Index OOB');

  const ratingEl = document.getElementById(`edit-rating-input-${index}`);
  const reviewEl = document.getElementById(`edit-review-input-${index}`);
  const rating = ratingEl ? Number(ratingEl.value) || null : null;
  const review = reviewEl ? reviewEl.value || '' : '';

  watched[index] = { ...watched[index], rating, review };
  await updateDoc(userRef, { watched });

  if (typeof loadRatings === 'function') loadRatings();
  if (typeof loadWatched === 'function') loadWatched();
};


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

const usernameSection = document.getElementById('usernameSection');
const usernameInput = document.getElementById('usernameInput');
const setUsernameBtn = document.getElementById('setUsernameBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const preview = document.getElementById('previewCard');

function showPreview(item, x, y) {
  const preview = document.getElementById("previewCard");

  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date || "No date";
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
    : "";
  const overview = item.overview || "No description available.";

  if (!preview) return;

  preview.innerHTML = `
    <div class="preview-card-body">
      <h3 class="preview-card-title">${title}</h3>
      <div class="preview-card-meta">
        ${date}
        ${item.media_type ? ` • ${item.media_type === "movie" ? "Movie" : "Show"}` : ""}
      </div>
      <div class="preview-card-poster-wrap">
        <img class="preview-card-poster" src="${poster}" alt="">
      </div>
      <div class="preview-card-overview-wrap" id="previewOverviewScroll">
        <div class="preview-card-overview">
          ${overview}
        </div>
      </div>
    </div>
  `;
  // position first, then show and trigger transition
  preview.style.left = x + 15 + "px";
  preview.style.top = y + 15 + "px";

  preview.style.display = "block";
  // force reflow so the CSS transition will animate
  preview.offsetHeight;
  preview.style.opacity = "1";
  preview.style.transform = "translateY(0px)";

  const posterImg = preview.querySelector(".preview-card-poster");
  const kickAutoScroll = () => {
    requestAnimationFrame(() => startPreviewAutoScroll());
  };
  kickAutoScroll();
  if (posterImg && !posterImg.complete) {
    posterImg.addEventListener("load", kickAutoScroll, { once: true });
  }
}

function hidePreview() {
  const preview = document.getElementById("previewCard");

  if (!preview) return;

  stopPreviewAutoScroll();
  preview.style.opacity = "0";
  preview.style.transform = "translateY(10px)";

  setTimeout(() => {
    if (preview) preview.style.display = "none";
  }, 200);
}

function clampPreviewPosition(x, y) {
  const preview = document.getElementById("previewCard");

  if (!preview) return;

  const padding = 10;

  const maxX = window.innerWidth - preview.offsetWidth - padding;
  const maxY = window.innerHeight - preview.offsetHeight - padding;

  preview.style.left = Math.min(x + 15, maxX) + "px";
  preview.style.top = Math.min(y + 15, maxY) + "px";
}

// Auto-scroll preview description up and down while visible
let __previewAutoScrollRaf = null;
let __previewAutoScrollActive = false;

function getPreviewScrollEl() {
  return document.getElementById("previewOverviewScroll");
}

function startPreviewAutoScroll() {
  stopPreviewAutoScroll(false);
  const scrollEl = getPreviewScrollEl();
  if (!scrollEl) return;

  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  if (max <= 4) return;

  let pos = 0;
  let dir = 1;
  let pauseUntil = performance.now() + 800;
  __previewAutoScrollActive = true;
  scrollEl.scrollTop = 0;

  const tick = (now) => {
    if (!__previewAutoScrollActive) return;

    if (now < pauseUntil) {
      __previewAutoScrollRaf = requestAnimationFrame(tick);
      return;
    }

    pos += dir * 0.18;
    if (pos >= max) {
      pos = max;
      dir = -1;
      pauseUntil = now + 1800;
    } else if (pos <= 0) {
      pos = 0;
      dir = 1;
      pauseUntil = now + 1800;
    }
    scrollEl.scrollTop = pos;
    __previewAutoScrollRaf = requestAnimationFrame(tick);
  };

  __previewAutoScrollRaf = requestAnimationFrame(tick);
}

function stopPreviewAutoScroll(resetScroll = true) {
  __previewAutoScrollActive = false;
  if (__previewAutoScrollRaf) {
    cancelAnimationFrame(__previewAutoScrollRaf);
    __previewAutoScrollRaf = null;
  }
  if (resetScroll) {
    const scrollEl = getPreviewScrollEl();
    if (scrollEl) scrollEl.scrollTop = 0;
  }
}

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
        shows: [],
        watched: []
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
  // hide left pane and shift content left
  const leftPane = document.getElementById('leftPane');
  if (leftPane) leftPane.style.display = 'none';
  document.body.style.marginLeft = '0px';

  // set username display, prefer passed user, then auth.currentUser, then currentUser
  const activeUser = user || auth.currentUser || currentUser;
  const nameToShow = (activeUser && (activeUser.displayName || (activeUser.email && activeUser.email.split('@')[0]))) || '';
  if (usernameDisplay) usernameDisplay.textContent = nameToShow;

  // load persisted user data (movies/shows)
  await loadUserData();
  // load watched items into the watched section
  if (typeof loadWatched === 'function') loadWatched();
  // load ratings panel
  if (typeof loadRatings === 'function') loadRatings();

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

    // populate movies (handle objects)
    const movies = Array.isArray(data.movies) ? data.movies : [];
    const moviesList = document.getElementById('moviesList');
    if (moviesList) {
      moviesList.innerHTML = '';
      movies.forEach((m, index) => {
        const title = (m && typeof m === 'object') ? (m.title || m.name || 'Untitled') : m;
        const li = document.createElement('li');

        li.innerHTML = `
          <span class="item-title">🎬 ${title}</span>

          <button onclick="markWatched('movie', ${index})" style="margin-left:8px;">
            Watched
          </button>

          <button onclick="deleteItem('movie', ${index})" style="margin-left:6px;">
            Delete
          </button>
        `;

        // preview only when hovering/tapping the title text
        const movieTitleEl = li.querySelector('.item-title');
        if (movieTitleEl) {
          if (isTouchDevice) {
            // Mobile: tap to show, tap to hide
            let previewVisible = false;
            movieTitleEl.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!previewVisible) {
                const previewItem = {
                  title: m && (m.title || m.name) || title,
                  name: m && (m.name || m.title) || title,
                  poster_path: m && (m.poster || m.poster_path),
                  release_date: m && (m.date || m.release_date),
                  first_air_date: m && (m.date || m.first_air_date),
                  overview: m && (m.overview || ""),
                  media_type: m && (m.type || m.media_type || 'movie')
                };
                showPreview(previewItem, e.clientX, e.clientY);
                previewVisible = true;
              } else {
                hidePreview();
                previewVisible = false;
              }
            });
          } else {
            // PC: hover to show
            movieTitleEl.addEventListener("mouseenter", (e) => {
              const previewItem = {
                title: m && (m.title || m.name) || title,
                name: m && (m.name || m.title) || title,
                poster_path: m && (m.poster || m.poster_path),
                release_date: m && (m.date || m.release_date),
                first_air_date: m && (m.date || m.first_air_date),
                overview: m && (m.overview || ""),
                media_type: m && (m.type || m.media_type || 'movie')
              };
              showPreview(previewItem, e.clientX, e.clientY);
            });

            movieTitleEl.addEventListener("mousemove", (e) => clampPreviewPosition(e.clientX, e.clientY));
            movieTitleEl.addEventListener("mouseleave", hidePreview);
          }
        }

        moviesList.appendChild(li);
      });
    }

    // populate shows (handle objects)
    const shows = Array.isArray(data.shows) ? data.shows : [];
    const showsList = document.getElementById('showsList');
    if (showsList) {
      showsList.innerHTML = "";

      shows.forEach((s, index) => {
        const title = s && s.title ? s.title : s;

        const li = document.createElement("li");

        li.innerHTML = `
          <span class="item-title">📺 ${title}</span>

          <button onclick="markWatched('show', ${index})" style="margin-left:8px;">
            Watched
          </button>

          <button onclick="deleteItem('show', ${index})" style="margin-left:6px;">
            Delete
          </button>
        `;

        // attach preview to show title only
        const showTitleEl = li.querySelector('.item-title');
        if (showTitleEl) {
          if (isTouchDevice) {
            // Mobile: tap to show, tap to hide
            let previewVisible = false;
            showTitleEl.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!previewVisible) {
                const previewItem = {
                  title: s && (s.title || s.name) || title,
                  name: s && (s.name || s.title) || title,
                  poster_path: s && (s.poster || s.poster_path) || '',
                  release_date: s && (s.date || s.release_date) || '',
                  first_air_date: s && (s.date || s.first_air_date) || '',
                  overview: s && (s.overview || '') || '',
                  media_type: s && (s.type === 'show' ? 'tv' : s.media_type || 'tv')
                };
                showPreview(previewItem, e.clientX, e.clientY);
                previewVisible = true;
              } else {
                hidePreview();
                previewVisible = false;
              }
            });
          } else {
            // PC: hover to show
            showTitleEl.addEventListener('mouseenter', (e) => {
              const previewItem = {
                title: s && (s.title || s.name) || title,
                name: s && (s.name || s.title) || title,
                poster_path: s && (s.poster || s.poster_path) || '',
                release_date: s && (s.date || s.release_date) || '',
                first_air_date: s && (s.date || s.first_air_date) || '',
                overview: s && (s.overview || '') || '',
                media_type: s && (s.type === 'show' ? 'tv' : s.media_type || 'tv')
              };
              showPreview(previewItem, e.clientX, e.clientY);
            });

            showTitleEl.addEventListener('mousemove', (e) => clampPreviewPosition(e.clientX, e.clientY));
            showTitleEl.addEventListener('mouseleave', hidePreview);
          }
        }

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
      ${(data.movies || []).map(item => `<li>${(item && typeof item === 'object') ? (item.title || item.name || 'Unknown title') : item}</li>`).join("")}
    </ul>

    <h4>📺 Shows</h4>
    <ul>
      ${(data.shows || []).map(item => `<li>${(item && typeof item === 'object') ? (item.title || item.name || 'Unknown title') : item}</li>`).join("")}
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
// menu for logout / change username
const moreBtn = document.getElementById('moreBtn');
const moreMenu = document.getElementById('moreMenu');
const menuLogout = document.getElementById('menuLogout');
const menuChangeUsername = document.getElementById('menuChangeUsername');

function closeMoreMenu() {
  if (!moreMenu) return;
  moreMenu.style.display = 'none';
  moreMenu.classList.remove('fade-in');
  if (moreBtn) {
    moreBtn.classList.remove('open');
    moreBtn.setAttribute('aria-expanded', 'false');
  }
}

function openMoreMenu() {
  if (!moreBtn || !moreMenu) return;
  moreMenu.style.display = 'block';
  moreMenu.classList.add('fade-in');
  moreBtn.classList.add('open');
  moreBtn.setAttribute('aria-expanded', 'true');
  const rect = moreBtn.getBoundingClientRect();
  moreMenu.style.position = 'fixed';
  moreMenu.style.width = 'max-content';
  moreMenu.style.minWidth = '';
  moreMenu.style.right = 'auto';
  moreMenu.style.left = rect.left + 'px';
  moreMenu.style.top = (rect.bottom + 4) + 'px';
}

if (moreBtn && moreMenu) {
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    const shown = moreMenu.style.display === 'block';
    if (shown) closeMoreMenu();
    else openMoreMenu();
  };

  document.addEventListener('click', (e) => {
    if (moreMenu.style.display !== 'block') return;
    if (moreBtn.contains(e.target) || moreMenu.contains(e.target)) return;
    closeMoreMenu();
  });
}

if (menuLogout) {
  menuLogout.onclick = () => {
    signOut(auth)
      .then(() => alert('Logged out'))
      .catch(err => alert(err.message));
  };
}

if (menuChangeUsername) {
  menuChangeUsername.onclick = () => {
    if (usernameSection) usernameSection.style.display = 'block';
    if (appSection) appSection.style.display = 'none';
    if (moreMenu) moreMenu.style.display = 'none';
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
      .then(async () => {
        // Also update Firestore to persist the username
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { name: uname });
        
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
// Expose addMedia and openReview globally for onclick handlers
window.addMedia = addMedia;
window.openReview = openReview;

// Reviews/Settings overlay helpers
const overlayBackdrop = () => document.getElementById('overlayBackdrop');

function syncOverlayBackdrop() {
  const backdrop = overlayBackdrop();
  if (!backdrop) return;
  const anyOpen = document.querySelector('.overlay-page.is-open');
  backdrop.classList.toggle('visible', !!anyOpen);
  backdrop.setAttribute('aria-hidden', anyOpen ? 'false' : 'true');
}

function openOverlayPage(page) {
  if (!page) return;
  document.querySelectorAll('.overlay-page').forEach((el) => {
    if (el !== page) closeOverlayPage(el, false);
  });
  page.style.display = 'block';
  requestAnimationFrame(() => page.classList.add('is-open'));
  syncOverlayBackdrop();
  if (page.id === 'reviewsPage' && typeof renderAllReviews === 'function') renderAllReviews();
}

function closeOverlayPage(page, syncBackdrop = true) {
  if (!page || !page.classList.contains('is-open')) {
    if (page && page.style.display === 'block' && !page.classList.contains('is-open')) {
      page.style.display = 'none';
    }
    if (syncBackdrop) syncOverlayBackdrop();
    return;
  }
  page.classList.remove('is-open');
  const onEnd = (e) => {
    if (e.target !== page || e.propertyName !== 'opacity') return;
    page.removeEventListener('transitionend', onEnd);
    if (!page.classList.contains('is-open')) page.style.display = 'none';
    if (syncBackdrop) syncOverlayBackdrop();
  };
  page.addEventListener('transitionend', onEnd);
}

function toggleOverlayPage(page) {
  if (!page) return;
  if (page.classList.contains('is-open')) closeOverlayPage(page);
  else openOverlayPage(page);
}

function hideOverlayPages() {
  document.querySelectorAll('.overlay-page').forEach((page) => closeOverlayPage(page, false));
  syncOverlayBackdrop();
}

function showReviewsPage() {
  openOverlayPage(document.getElementById('reviewsPage'));
}

function showSettingsPage() {
  openOverlayPage(document.getElementById('settingsPage'));
}

// Reviews/Settings panel handling
document.addEventListener('DOMContentLoaded', () => {
  const openReviewsBtn = document.getElementById('openReviewsBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const reviewsSort = document.getElementById('reviewsSort');
  const reviewsPage = document.getElementById('reviewsPage');
  const settingsPage = document.getElementById('settingsPage');
  const backdrop = overlayBackdrop();

  if (openReviewsBtn) {
    openReviewsBtn.onclick = () => toggleOverlayPage(reviewsPage);
  }
  if (openSettingsBtn) {
    openSettingsBtn.onclick = () => toggleOverlayPage(settingsPage);
  }
  if (backdrop) {
    backdrop.addEventListener('click', hideOverlayPages);
  }
  if (reviewsSort) reviewsSort.onchange = () => renderAllReviews();

  // Mobile close buttons for overlay pages
  document.querySelectorAll('.mobile-close-btn').forEach(btn => {
    btn.onclick = () => hideOverlayPages();
  });

  // Edit review button
  const editReviewBtn = document.getElementById('editReviewBtn');
  if (editReviewBtn) {
    editReviewBtn.onclick = async () => {
      if (selectedReviews.size !== 1) return;
      const index = Array.from(selectedReviews)[0];
      await editReview(index);
    };
  }

  // Delete reviews button
  const deleteReviewsBtn = document.getElementById('deleteReviewsBtn');
  if (deleteReviewsBtn) {
    deleteReviewsBtn.onclick = async () => {
      if (selectedReviews.size === 0) return;
      if (!confirm(`Delete ${selectedReviews.size} review(s)?`)) return;
      await deleteSelectedReviews();
    };
  }

  // expand labels on hover after 500ms
  document.querySelectorAll('.side-item').forEach(item => {
    let hoverTimer = null;
    item.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => {
        item.classList.add('expanded');
      }, 500);
    });
    item.addEventListener('mouseleave', () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      item.classList.remove('expanded');
    });
  });
});

// THEMES
const hackerTrail = (() => {
  let container = null;
  let enabled = false;
  let lastSpawn = 0;
  const bits = ['0', '1'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'hackerTrail';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
    return container;
  }

  function spawn(x, y) {
    const el = document.createElement('span');
    el.className = 'hacker-trail-bit';
    el.textContent = bits[Math.random() < 0.5 ? 0 : 1];
    el.style.left = `${x + (Math.random() * 12 - 6)}px`;
    el.style.top = `${y + (Math.random() * 8 - 4)}px`;
    ensureContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('fall'));
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  function onMove(e) {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastSpawn < 36) return;
    lastSpawn = now;
    spawn(e.clientX, e.clientY);
    if (Math.random() < 0.55) spawn(e.clientX - 10, e.clientY + 6);
  }

  function setEnabled(on) {
    enabled = on && !reducedMotion;
    const c = ensureContainer();
    c.classList.toggle('active', enabled);
    if (!enabled) c.innerHTML = '';
  }

  document.addEventListener('mousemove', onMove, { passive: true });
  return { setEnabled };
})();

const cuteTrail = (() => {
  let container = null;
  let enabled = false;
  let lastSpawn = 0;
  const charms = ['❤️', '💕', '💖', '🌸', '🌷', '🌺', '💗'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'cuteTrail';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
    return container;
  }

  function spawn(x, y) {
    const el = document.createElement('span');
    el.className = 'cute-trail-bit';
    el.textContent = charms[Math.floor(Math.random() * charms.length)];
    el.style.left = `${x + (Math.random() * 14 - 7)}px`;
    el.style.top = `${y + (Math.random() * 10 - 5)}px`;
    ensureContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('fall'));
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  function onMove(e) {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastSpawn < 42) return;
    lastSpawn = now;
    spawn(e.clientX, e.clientY);
    if (Math.random() < 0.5) spawn(e.clientX + 8, e.clientY + 5);
  }

  function setEnabled(on) {
    enabled = on && !reducedMotion;
    const c = ensureContainer();
    c.classList.toggle('active', enabled);
    if (!enabled) c.innerHTML = '';
  }

  document.addEventListener('mousemove', onMove, { passive: true });
  return { setEnabled };
})();

function applyTheme(name) {
  const themeClass = 'theme-' + name;
  const html = document.documentElement;
  const keep = Array.from(html.classList).filter((c) => !c.startsWith('theme-'));
  keep.push(themeClass);
  html.className = keep.join(' ');
  document.body.classList.forEach((c) => {
    if (c.startsWith('theme-')) document.body.classList.remove(c);
  });
  hackerTrail.setEnabled(name === 'hacker');
  cuteTrail.setEnabled(name === 'cute');
  try { localStorage.setItem('movieapp-theme', name); } catch (e) {}
  // persist user preference
  if (currentUser) {
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, { theme: name }).catch(() => {});
  }
  markActiveThemeTile(name);
}

function loadStoredTheme() {
  const t = localStorage.getItem('movieapp-theme');
  if (t) applyTheme(t);
  else applyTheme('default');
}

function markActiveThemeTile(name) {
  document.querySelectorAll('.theme-tile').forEach(tile => {
    tile.classList.toggle('active', tile.getAttribute('data-theme') === name);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const themesGrid = document.getElementById('themesGrid');
  if (themesGrid) {
    themesGrid.addEventListener('click', (ev) => {
      const tile = ev.target.closest('.theme-tile');
      if (!tile || !themesGrid.contains(tile)) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (tile.blur) tile.blur();
      const name = tile.getAttribute('data-theme');
      if (!name) return;
      applyTheme(name);
    });
  }

  loadStoredTheme();
  // bind explicit handlers after theme grid is present
  bindThemeTileListeners();
});
// Ensure theme tiles have explicit click handlers (some browsers/edge-cases need direct binding)
function bindThemeTileListeners() {
  document.querySelectorAll('.theme-tile').forEach(tile => {
    // remove any previous handler if present (stored on element)
    if (tile._themeHandler) tile.removeEventListener('click', tile._themeHandler);
    const handler = function onTileClick(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (tile.blur) tile.blur();
      const name = tile.getAttribute('data-theme');
      if (!name) return;
      applyTheme(name);
    };
    tile._themeHandler = handler;
    tile.addEventListener('click', handler);
  });
}

// Track selected reviews for bulk operations
let selectedReviews = new Set();

async function renderAllReviews() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched : [];

  const sortEl = document.getElementById('reviewsSort');
  const sort = sortEl ? sortEl.value : 'newest';

  let items = watched.filter(w => w.rating);
  if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'oldest') items = items.slice().reverse().reverse(); // keep as-is for oldest
  else items = items.slice().reverse(); // newest first

  const list = document.getElementById('allReviewsList');
  if (!list) return;
  list.innerHTML = '';

  items.forEach((w, i) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'flex-start';
    li.style.gap = '8px';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'review-checkbox';
    checkbox.dataset.index = i;
    checkbox.dataset.originalIndex = watched.indexOf(w);
    checkbox.style.marginTop = '4px';
    checkbox.checked = selectedReviews.has(watched.indexOf(w));
    checkbox.onchange = (e) => {
      const idx = parseInt(e.target.dataset.originalIndex);
      if (e.target.checked) {
        selectedReviews.add(idx);
      } else {
        selectedReviews.delete(idx);
      }
      updateEditButtonState();
    };
    
    const content = document.createElement('div');
    content.style.flex = '1';
    content.innerHTML = `<strong>${w.title}</strong><br>⭐ ${w.rating} — ${w.review || ''}`;
    
    li.appendChild(checkbox);
    li.appendChild(content);
    list.appendChild(li);
  });
  
  updateEditButtonState();
}

function updateEditButtonState() {
  const editBtn = document.getElementById('editReviewBtn');
  if (editBtn) {
    editBtn.disabled = selectedReviews.size !== 1;
    editBtn.style.opacity = selectedReviews.size !== 1 ? '0.5' : '1';
    editBtn.style.cursor = selectedReviews.size !== 1 ? 'not-allowed' : 'pointer';
  }
}

async function editReview(index) {
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched : [];
  const review = watched[index];
  
  if (!review) return;
  
  const list = document.getElementById('allReviewsList');
  const li = list.children[index];
  
  // Replace content with editable form
  li.innerHTML = '';
  li.style.flexDirection = 'column';
  li.style.gap = '8px';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'review-checkbox';
  checkbox.dataset.originalIndex = index;
  checkbox.checked = selectedReviews.has(index);
  checkbox.onchange = (e) => {
    const idx = parseInt(e.target.dataset.originalIndex);
    if (e.target.checked) {
      selectedReviews.add(idx);
    } else {
      selectedReviews.delete(idx);
    }
    updateEditButtonState();
  };
  
  const form = document.createElement('div');
  form.style.flex = '1';
  form.style.width = '100%';
  
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = review.title || '';
  titleInput.style.width = '100%';
  titleInput.style.padding = '6px';
  titleInput.style.marginBottom = '8px';
  titleInput.style.border = '1px solid var(--border)';
  titleInput.style.borderRadius = '4px';
  titleInput.style.background = 'var(--panel-bg)';
  titleInput.style.color = 'var(--text)';
  titleInput.placeholder = 'Title';
  
  const ratingInput = document.createElement('input');
  ratingInput.type = 'number';
  ratingInput.min = '1';
  ratingInput.max = '5';
  ratingInput.value = review.rating || '';
  ratingInput.style.width = '60px';
  ratingInput.style.padding = '6px';
  ratingInput.style.marginBottom = '8px';
  ratingInput.style.border = '1px solid var(--border)';
  ratingInput.style.borderRadius = '4px';
  ratingInput.style.background = 'var(--panel-bg)';
  ratingInput.style.color = 'var(--text)';
  ratingInput.placeholder = 'Rating';
  
  const reviewInput = document.createElement('textarea');
  reviewInput.value = review.review || '';
  reviewInput.style.width = '100%';
  reviewInput.style.minHeight = '60px';
  reviewInput.style.padding = '6px';
  reviewInput.style.marginBottom = '8px';
  reviewInput.style.border = '1px solid var(--border)';
  reviewInput.style.borderRadius = '4px';
  reviewInput.style.background = 'var(--panel-bg)';
  reviewInput.style.color = 'var(--text)';
  reviewInput.placeholder = 'Review';
  reviewInput.style.resize = 'vertical';
  
  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.gap = '8px';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.padding = '6px 12px';
  saveBtn.style.borderRadius = '6px';
  saveBtn.style.border = '1px solid var(--border)';
  saveBtn.style.background = 'var(--panel-bg)';
  saveBtn.style.color = 'var(--text)';
  saveBtn.style.cursor = 'pointer';
  saveBtn.onclick = async () => {
    const updatedReview = {
      ...review,
      title: titleInput.value,
      rating: parseInt(ratingInput.value),
      review: reviewInput.value
    };
    watched[index] = updatedReview;
    await updateDoc(doc(db, 'users', currentUser.uid), { watched });
    selectedReviews.clear();
    renderAllReviews();
  };
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.padding = '6px 12px';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.border = '1px solid var(--border)';
  cancelBtn.style.background = 'var(--panel-bg)';
  cancelBtn.style.color = 'var(--text)';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => {
    renderAllReviews();
  };
  
  buttonRow.appendChild(saveBtn);
  buttonRow.appendChild(cancelBtn);
  
  form.appendChild(titleInput);
  form.appendChild(ratingInput);
  form.appendChild(reviewInput);
  form.appendChild(buttonRow);
  
  li.appendChild(checkbox);
  li.appendChild(form);
}

async function deleteSelectedReviews() {
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = snap.data() || {};
  const watched = Array.isArray(data.watched) ? data.watched : [];
  
  // Remove selected reviews (filter out selected indices)
  const newWatched = watched.filter((_, i) => !selectedReviews.has(i));
  
  await updateDoc(doc(db, 'users', currentUser.uid), { watched: newWatched });
  selectedReviews.clear();
  renderAllReviews();
}

// render recent activity instead of static ratings
async function loadRecentActivity() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = snap.data() || {};
  // show only items with rating (my reviews style)
  const watched = Array.isArray(data.watched) ? data.watched.filter(w => w.rating) : [];
  const list = document.getElementById('ratingsList');
  if (!list) return; list.innerHTML = '';
  // newest first
  watched.slice().reverse().forEach(w => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${w.title}</strong><br>⭐ ${w.rating} — ${w.review || ''}`;
    list.appendChild(li);
  });
}

const filterEl = document.getElementById("filterType");
if (filterEl) filterEl.onchange = () => { if (typeof loadWatched === 'function') loadWatched(); };

// Search filter functionality
let searchFilter = 'all';
const searchFilterBtn = document.getElementById('searchFilterBtn');
const searchFilterMenu = document.getElementById('searchFilterMenu');
const searchFilterLabel = document.getElementById('searchFilterLabel');

if (searchFilterBtn) {
  searchFilterBtn.onclick = (e) => {
    e.stopPropagation();
    searchFilterMenu.style.display = searchFilterMenu.style.display === 'block' ? 'none' : 'block';
  };
}

// Handle filter option clicks
document.querySelectorAll('.filter-option').forEach(option => {
  option.onclick = (e) => {
    e.stopPropagation();
    searchFilter = option.getAttribute('data-filter');
    searchFilterLabel.textContent = option.textContent;
    searchFilterMenu.style.display = 'none';
    
    // Update active state
    document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    
    // Trigger search if there's a query
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim().length >= 2) {
      searchInput.dispatchEvent(new Event('input'));
    }
  };
});

// Close filter menu when clicking outside
document.addEventListener('click', (e) => {
  if (searchFilterMenu && !searchFilterMenu.contains(e.target) && e.target !== searchFilterBtn) {
    searchFilterMenu.style.display = 'none';
  }
});

document.getElementById("searchInput").addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  const box = document.getElementById("resultsBox");

  if (query.length < 2) {
    box.style.display = "none";
    return;
  }

  let results = [];
  
  if (searchFilter === 'all' || searchFilter === 'movie') {
    const movieRes = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}&api_key=608767c8f52970a29bb38126d419116e`);
    const movieData = await movieRes.json();
    results = [...results, ...(movieData.results || []).map(r => ({ ...r, media_type: "movie" }))];
  }
  
  if (searchFilter === 'all' || searchFilter === 'tv') {
    const tvRes = await fetch(`https://api.themoviedb.org/3/search/tv?query=${query}&api_key=608767c8f52970a29bb38126d419116e`);
    const tvData = await tvRes.json();
    results = [...results, ...(tvData.results || []).map(r => ({ ...r, media_type: "tv" }))];
  }

  results = results.slice(0, 7);

  box.innerHTML = "";

  if (results.length === 0) {
    box.style.display = "none";
    return;
  }

  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";

    const title = item.title || item.name || "Unknown";
    const date = item.release_date || item.first_air_date || "No date";

    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
      : "https://via.placeholder.com/40x60?text=?";

    const typeLabel = item.media_type === "movie" ? "Movie" : "Show";

    div.innerHTML = `
      <div style="
        display:flex;
        gap:10px;
        align-items:center;
      ">

        <!-- Thumbnail -->
        <img
          src="${poster}"
          style="
            width:40px;
            height:60px;
            object-fit:cover;
            border-radius:4px;
          "
        >

        <!-- Text -->
        <div style="flex:1;">
          <div style="font-weight:bold;">
            ${title}
          </div>

          <!-- Date + Type row -->
          <div style="
            font-size:12px;
            color:gray;
            display:flex;
            gap:8px;
            align-items:center;
            margin-top:2px;
          ">
            <span>${date}</span>

            <span style="opacity:0.6;">•</span>

            <span style="
              font-size:11px;
              padding:2px 6px;
              border-radius:4px;
              background:${item.media_type === "movie" ? "#4a90e2" : "#e24a6b"};
              color:white;
            ">
              ${typeLabel}
            </span>
          </div>
        </div>

      </div>
    `;

    div.onclick = (e) => {
      e.stopPropagation(); // 🔥 prevents dropdown closing first
      addMedia(item);
    };

    if (isTouchDevice) {
      // Mobile: tap to show preview (separate from addMedia)
      let previewVisible = false;
      div.addEventListener('click', (e) => {
        if (!previewVisible) {
          e.preventDefault();
          e.stopPropagation();
          showPreview(item, e.clientX, e.clientY);
          previewVisible = true;
        } else {
          hidePreview();
          previewVisible = false;
        }
      });
    } else {
      // PC: hover to show preview
      div.addEventListener("mouseenter", (e) => {
        showPreview(item, e.clientX, e.clientY);
      });

      div.addEventListener("mousemove", (e) => {
        clampPreviewPosition(e.clientX, e.clientY);
      });

      div.addEventListener("mouseleave", hidePreview);
    }

    box.appendChild(div);
  });

  box.style.display = "block";
});

document.addEventListener("click", (e) => {
  const box = document.getElementById("resultsBox");
  const input = document.getElementById("searchInput");

  if (!box || !input) return;

  if (e.target !== input && !box.contains(e.target)) {
    box.style.display = "none";
    if (typeof preview !== 'undefined' && preview) {
      hidePreview();
    }
  }
});

// Make functions accessible to HTML buttons
window.addMovie = addMovie;
window.addShow = addShow;