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

// === State Management ===
let map;
let locations = [];
let currentUser = null;
let selectedPosition = null;
let activeCircle = null;
let currentMarkers = [];

// Initialize Modals
const memoryModal = new bootstrap.Modal(document.getElementById('memoryModal'));
const addMemoryModal = new bootstrap.Modal(document.getElementById('addMemoryModal'));

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

    // Capture coordinates on map click
    map.on('click', (e) => handleInteraction(e.latlng.lat, e.latlng.lng));
    renderAccordion();
    lucide.createIcons();
    

    // --- ADD SEARCH BAR ---
    L.Control.geocoder({
        defaultMarkGeocode: false, // Prevents the plugin from adding its own marker
        position: 'topleft',       // You can change this to 'topright'
        placeholder: 'Search cities or addresses...'
    })
    .on('markgeocode', function(e) {
        var bbox = e.geocode.bbox;
        var center = e.geocode.center;

        // Option 1: Zoom to the exact boundary of the city (recommended)
        map.fitBounds(bbox);

        // Option 2: Alternatively, zoom to a specific coordinate and level
        // map.setView(center, 14);

        // Trigger your existing logic to show the selection circle
        handleInteraction(center.lat, center.lng);
    })
    .addTo(map);

    map.on('click', (e) => handleInteraction(e.latlng.lat, e.latlng.lng));
    renderAccordion();
    lucide.createIcons();
}

// === Distance Calculation ===
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// === Map Interaction: Click Logic ===
function handleInteraction(lat, lng) {
    selectedPosition = { lat, lng };
    
    // Create visual feedback (5km radius circle)
    if (activeCircle) activeCircle.remove();
    activeCircle = L.circle([lat, lng], {
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        radius: 5000,
        dashArray: '5, 10'
    }).addTo(map);

    // Pre-fill coordinate displays in both modals
    const coordString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    document.getElementById('locationCoords').innerText = coordString;
    document.getElementById('displayCoords').innerText = coordString;
    
    // Pre-fill numeric inputs for the form
    document.getElementById('latInput').value = lat.toFixed(6);
    document.getElementById('lngInput').value = lng.toFixed(6);

    const nearbyMemories = locations.filter(loc => getDistance(lat, lng, loc.lat, loc.lng) <= 5);
    document.getElementById('memoryCountBadge').innerText = nearbyMemories.length;
    
    resetModalView();
    memoryModal.show();
}

// === Render Pins for Stored Memories ===
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

// === Firebase Data Loading ===
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

// === Submission Logic for Map-Click Modal ===
document.getElementById('addMemoryForm').onsubmit = async (e) => {
    e.preventDefault();
    await saveMemory(
        document.getElementById('title').value,
        document.getElementById('description').value,
        selectedPosition.lat,
        selectedPosition.lng,
        document.getElementById('photoInput').files[0],
        memoryModal
    );
    e.target.reset();
};

// === Submission Logic for Navbar/Manual Modal ===
document.getElementById('newMemoryForm').onsubmit = async (e) => {
    e.preventDefault();
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);

    await saveMemory(
        document.getElementById('newTitle').value,
        document.getElementById('newDescription').value,
        lat,
        lng,
        document.getElementById('newPhotoInput').files[0],
        addMemoryModal
    );
    e.target.reset();
};

// === Shared Save Function ===
async function saveMemory(title, description, lat, lng, file, modalToHide) {
    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const geoData = await geoRes.json();
        
        const memory = {
            userId: currentUser.uid,
            title: title,
            description: description,
            lat: lat,
            lng: lng,
            state: geoData.address?.state || "",
            city: geoData.address?.city || geoData.address?.town || "",
            createdAt: new Date().toISOString(),
            photoUrl: await fileToBase64(file)
        };

        await addDoc(collection(db, "memories"), memory);
        alert("Memory Saved! 📸");
        
        loadUserMemories(); // Refresh pins
        map.flyTo([lat, lng], 14); 
        modalToHide.hide();
    } catch (error) {
        console.error("Save error:", error);
        alert("Error saving memory.");
    }
}

// === Utility Functions ===
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

// Sidebar/Accordion UI logic
function renderAccordion() {
    const accordionContainer = document.getElementById('stateAccordion');
    accordionContainer.innerHTML = '';
    
    stateData.forEach((item, index) => {
        const stateId = `state-${item.state.replace(/\s+/g, '')}`;
        const html = `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed state-click" type="button" 
                            id="header-${stateId}" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#collapse${index}"
                            data-state-name="${item.state}">
                        ${item.state}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#stateAccordion">
                    <div class="accordion-body">
                        <ul>
                            ${item.cities.map(city => `
                                <li class="city-click" data-city="${city}" data-state="${item.state}">${city}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>`;
        accordionContainer.innerHTML += html;
    });

    // 1. Add click listeners for States
    document.querySelectorAll('.state-click').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Only search if the accordion is being opened
            if (!btn.classList.contains('collapsed')) {
                const stateName = btn.getAttribute('data-state-name');
                zoomToLocation(stateName);
            }
        });
    });

    // 2. Add click listeners for Cities
    document.querySelectorAll('.city-click').forEach(li => {
        li.addEventListener('click', () => {
            const cityName = li.getAttribute('data-city');
            const stateName = li.getAttribute('data-state');
            zoomToLocation(`${cityName}, ${stateName}`);
            
            // Optional: Close the offcanvas after clicking a city
            const offcanvasElement = document.getElementById('stateOffcanvas');
            const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
            if (offcanvas) offcanvas.hide();
        });
    });
}

async function zoomToLocation(locationName) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName + ", India")}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            // Zoom into the location
            map.flyTo([lat, lng], 12);

            // Automatically trigger the interaction logic (circle + modal)
            handleInteraction(lat, lng);
        }
    } catch (error) {
        console.error("Geocoding error:", error);
    }
}

function highlightVisitedLocations() {
    document.querySelectorAll('.visited-item').forEach(el => el.classList.remove('visited-item'));
    locations.forEach(loc => {
        const cityElement = document.querySelector(`li[data-city="${loc.city}"]`);
        if (cityElement) cityElement.classList.add('visited-item');
    });
}

// Global Event Listeners
document.getElementById('navAddMemoryBtn').onclick = () => addMemoryModal.show();
document.getElementById('showAddForm').onclick = () => {
    document.getElementById('optionsView').classList.add('d-none');
    document.getElementById('addMemoryForm').classList.remove('d-none');
    document.getElementById('backBtn').classList.remove('d-none');
    document.getElementById('modalTitle').innerText = "Add New Memory";
};
document.getElementById('backBtn').onclick = resetModalView;
document.getElementById('centerBtn').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13));
};

initMap();
