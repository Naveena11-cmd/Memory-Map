import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAJatpJcWgnCSdyY1cVf0XhfOSOq_pJiWs",
    authDomain: "framemytrip.firebaseapp.com",
    projectId: "framemytrip",
    storageBucket: "framemytrip.firebasestorage.app",
    messagingSenderId: "357820059298",
    appId: "1:357820059298:web:6d5fefc0dc8c5c7f10d1fb",
    measurementId: "G-FT164GH23B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const container = document.querySelector('.container');

// --- NAVIGATION FUNCTIONS ---
window.loginActive = () => {
    container.classList.remove('active', 'show-details');
};

window.registerActive = () => {
    container.classList.remove('show-details');
    container.classList.add('active');
};

window.showDetails = () => {
    container.classList.remove('active');
    container.classList.add('show-details');
};

// --- REGISTRATION ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                return updateProfile(userCredential.user, { displayName: fullName });
            })
            .then(() => {
                alert("Account created! Please provide your travel details.");
                window.showDetails(); 
            })
            .catch((error) => alert("Registration Error: " + error.message));
    });
}

// --- DETAILS FORM (The fix is here) ---
const detailsForm = document.getElementById('detailsForm'); 
if (detailsForm) {
    detailsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // This is where you'd save data to Firestore in the future
        alert("Details saved! Now please login to access your map.");
        
        // REDIRECT TO LOGIN: This removes the classes hiding the login form
        window.loginActive(); 
        detailsForm.reset();
    });
}

// --- LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("Welcome back, " + (userCredential.user.displayName || "Explorer") + "!");
                window.location.href = "../Map/index.html"; 
            })
            .catch((error) => alert("Login Error: " + error.message));
    });
}