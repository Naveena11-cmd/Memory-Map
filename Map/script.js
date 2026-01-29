import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === Firebase Configuration ===
const firebaseConfig = {
    apiKey: "AIzaSyAJatpJcWgnCSdyY1cVf0XhfOSOq_pJiWs",
    authDomain: "framemytrip.firebaseapp.com",
    projectId: "framemytrip",
    storageBucket: "framemytrip.firebasestorage.app",
    messagingSenderId: "357820059298",
    appId: "1:357820059298:web:6d5fefc0dc8c5c7f10d1fb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 1. Initialize the new modal
const addMemoryModal = new bootstrap.Modal(document.getElementById('addMemoryModal'));

document.getElementById('navAddMemoryBtn').onclick = () => {
    
    document.getElementById('latInput').value = selectedPosition ? selectedPosition.lat.toFixed(6) : "";
    document.getElementById('lngInput').value = selectedPosition ? selectedPosition.lng.toFixed(6) : "";
    
    document.getElementById('newTitle').value = "";
    document.getElementById('newDescription').value = "";
    
    document.getElementById('displayCoords').innerText = selectedPosition 
        ? `${selectedPosition.lat.toFixed(4)}, ${selectedPosition.lng.toFixed(4)}` 
        : "Enter Coordinates Manually";
    
    addMemoryModal.show();
};

document.getElementById('newMemoryForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);

    if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid numeric coordinates.");
        return;
    }

    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const geoData = await geoRes.json();

        const memory = {
            userId: currentUser.uid,
            title: document.getElementById('newTitle').value,
            description: document.getElementById('newDescription').value,
            lat: lat,
            lng: lng,
            state: geoData.address ? (geoData.address.state || "") : "",
            city: geoData.address ? (geoData.address.city || geoData.address.town || "") : "",
            createdAt: new Date().toISOString(),
            photoUrl: await fileToBase64(document.getElementById('newPhotoInput').files[0])
        };

        await addDoc(collection(db, "memories"), memory);
        
        alert("Memory Saved! 📸");
        
        loadUserMemories(); 
        
        map.flyTo([lat, lng], 14); 
        
        addMemoryModal.hide();
        e.target.reset();
    } catch (error) {
        console.error("Save error:", error);
        alert("Error saving memory. Please check your connection.");
    }
};


// === State Management ===
let map;
let locations = [];
let currentUser = null;
let selectedPosition = null;
let activeCircle = null;
let currentMarkers = [];
const memoryModal = new bootstrap.Modal(document.getElementById('memoryModal'));

// === Accordion Data ===
const stateData = [
    { state: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada"] },
    { state: "Arunachal Pradesh", cities: ["Itanagar", "Tawang"] },
    { state: "Assam", cities: ["Guwahati", "Dibrugarh"] },
    { state: "Bihar", cities: ["Patna", "Gaya"] },
    { state: "Chhattisgarh", cities: ["Raipur", "Bhilai"] },
    { state: "Goa", cities: ["Panaji", "Margao"] },
    { state: "Gujarat", cities: ["Ahmedabad", "Surat"] },
    { state: "Haryana", cities: ["Gurugram", "Faridabad"] },
    { state: "Himachal Pradesh", cities: ["Shimla", "Manali"] },
    { state: "Jharkhand", cities: ["Ranchi", "Jamshedpur"] },
    { state: "Karnataka", cities: ["Bengaluru", "Mysuru"] },
    { state: "Kerala", cities: ["Kochi", "Thiruvananthapuram"] },
    { state: "Madhya Pradesh", cities: ["Indore", "Bhopal"] },
    { state: "Maharashtra", cities: ["Mumbai", "Pune"] },
    { state: "Manipur", cities: ["Imphal", "Bishnupur"] },
    { state: "Meghalaya", cities: ["Shillong", "Cherrapunji"] },
    { state: "Mizoram", cities: ["Aizawl", "Lunglei"] },
    { state: "Nagaland", cities: ["Kohima", "Dimapur"] },
    { state: "Odisha", cities: ["Bhubaneswar", "Puri"] },
    { state: "Punjab", cities: ["Amritsar", "Ludhiana"] },
    { state: "Rajasthan", cities: ["Jaipur", "Udaipur"] },
    { state: "Sikkim", cities: ["Gangtok", "Namchi"] },
    { state: "Tamil Nadu", cities: ["Chennai", "Coimbatore"] },
    { state: "Telangana", cities: ["Hyderabad", "Warangal"] },
    { state: "Tripura", cities: ["Agartala", "Udaipur"] },
    { state: "Uttar Pradesh", cities: ["Lucknow", "Varanasi"] },
    { state: "Uttarakhand", cities: ["Dehradun", "Rishikesh"] },
    { state: "West Bengal", cities: ["Kolkata", "Darjeeling"] }
];

// === Map Initialization ===
function initMap() {
    navigator.geolocation.getCurrentPosition(
        (pos) => setupMap(pos.coords.latitude, pos.coords.longitude),
        () => setupMap(20.5937, 78.9629) // Default: Center of India
    );
}

function setupMap(lat, lng) {
    if (map) return;
    map = L.map('map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (e) => handleInteraction(e.latlng.lat, e.latlng.lng));
    renderAccordion();
    lucide.createIcons();
}

// === Distance ===
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// === Map Interaction ===
function handleInteraction(lat, lng) {
    selectedPosition = { lat, lng };
    
    if (activeCircle) activeCircle.remove();
    activeCircle = L.circle([lat, lng], {
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        radius: 5000, // 5km radius
        dashArray: '5, 10'
    }).addTo(map);

    
    const nearbyMemories = locations.filter(loc => getDistance(lat, lng, loc.lat, loc.lng) <= 5);

    document.getElementById('locationCoords').innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    document.getElementById('memoryCountBadge').innerText = nearbyMemories.length;
    
    resetModalView();
    memoryModal.show();
}

function renderAccordion() {
    const accordionContainer = document.getElementById('stateAccordion');
    accordionContainer.innerHTML = '';
    
    stateData.forEach((item, index) => {
        const stateId = `state-${item.state.replace(/\s+/g, '')}`;
        const html = `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" 
                            id="header-${stateId}" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#collapse${index}">
                        ${item.state}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#stateAccordion">
                    <div class="accordion-body">
                        <ul>
                            ${item.cities.map(city => `
                                <li data-city="${city}" data-state="${item.state}">${city}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>`;
        accordionContainer.innerHTML += html;
    });
}

function highlightVisitedLocations() {
    document.querySelectorAll('.visited-item').forEach(el => el.classList.remove('visited-item'));
    document.querySelectorAll('.visited-header').forEach(el => el.classList.remove('visited-header'));

    locations.forEach(loc => {
        const cityElement = document.querySelector(`li[data-city="${loc.city}"]`);
        if (cityElement) {
            cityElement.classList.add('visited-item');
            const stateId = `state-${loc.state.replace(/\s+/g, '')}`;
            const header = document.getElementById(`header-${stateId}`);
            if (header) header.classList.add('visited-header');
        }
    });
}

function renderPins() {
    currentMarkers.forEach(m => m.remove());
    currentMarkers = [];

    locations.forEach(loc => {
        const marker = L.marker([loc.lat, loc.lng]).addTo(map);
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            handleInteraction(loc.lat, loc.lng);
        });
        currentMarkers.push(marker);
    });
}

// === Firebase===
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserMemories();
    } else {
        window.location.href = "../Login/login.html";
    }
});

async function loadUserMemories() {
    const q = query(collection(db, "memories"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    locations = [];
    querySnapshot.forEach((doc) => {
        locations.push(doc.data());
    });
    
    renderPins();
    highlightVisitedLocations();
}

// === Event Handlers ===
document.getElementById('showAddForm').onclick = () => {
    document.getElementById('optionsView').classList.add('d-none');
    document.getElementById('addMemoryForm').classList.remove('d-none');
    document.getElementById('backBtn').classList.remove('d-none');
    document.getElementById('modalTitle').innerText = "Add New Memory";
};

document.getElementById('showNearbyMemories').onclick = () => {
    const nearbyMemories = locations.filter(loc => 
        getDistance(selectedPosition.lat, selectedPosition.lng, loc.lat, loc.lng) <= 5
    );

    const container = document.getElementById('memoriesContainer');
    container.innerHTML = nearbyMemories.length ? '' : '<p class="text-center text-muted py-5">No memories found within 5km.</p>';
    
    nearbyMemories.forEach(mem => {
        const card = `
            <div class="memory-card p-3 mb-3 shadow-sm bg-white border">
                ${mem.photoUrl ? `<img src="${mem.photoUrl}" class="memory-media rounded mb-2 w-100" style="height: 200px; object-fit: cover;">` : ''}
                <h5 class="fw-bold mb-1" style="color: black;">${mem.title}</h5>
                <p class="text-muted small">${mem.description || ''}</p>
                <div class="border-top pt-2 mt-2 small text-secondary">
                    ${new Date(mem.createdAt).toLocaleDateString()}
                </div>
            </div>`;
        container.innerHTML += card;
    });

    document.getElementById('optionsView').classList.add('d-none');
    document.getElementById('memoriesListView').classList.remove('d-none');
    document.getElementById('backBtn').classList.remove('d-none');
    document.getElementById('modalTitle').innerText = "Nearby Memories";
};

document.getElementById('addMemoryForm').onsubmit = async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('photoInput').files[0];

    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedPosition.lat}&lon=${selectedPosition.lng}`);
        const geoData = await geoRes.json();
        const memoryState = geoData.address.state || "";
        const memoryCity = geoData.address.city || geoData.address.town || geoData.address.village || "";

        const memory = {
            userId: currentUser.uid,
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            lat: selectedPosition.lat,
            lng: selectedPosition.lng,
            state: memoryState,
            city: memoryCity,
            createdAt: new Date().toISOString(),
            photoUrl: await fileToBase64(photoFile)
        };

        await addDoc(collection(db, "memories"), memory);
        alert("Memory Saved! 📸");
        loadUserMemories();
        memoryModal.hide();
        e.target.reset();
    } catch (error) {
        console.error("Save error:", error);
    }
};

function fileToBase64(file) {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}   

function resetModalView() {
    document.getElementById('optionsView').classList.remove('d-none');
    document.getElementById('addMemoryForm').classList.add('d-none');
    document.getElementById('memoriesListView').classList.add('d-none');
    document.getElementById('backBtn').classList.add('d-none');
    document.getElementById('modalTitle').innerText = "Location Details";
}

document.getElementById('backBtn').onclick = resetModalView;
document.getElementById('centerBtn').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    });
};

initMap();
