let riskChart = null;
let userLocation = null;
let currentUser = null;
const USER_STORAGE_KEY = 'diab_current_user';
const RECORDS_KEY_PREFIX = 'diab_records_';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Location button event listener (using event delegation)
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'getLocationBtn') {
            e.preventDefault();
            getCurrentLocation();
        }
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }

    initPDFUpload();
    initApp();
});

// PDF Upload functionality
function initPDFUpload() {
    const pdfFileInput = document.getElementById('pdfFileInput');
    const pdfUploadArea = document.getElementById('pdfUploadArea');
    const pdfUploadStatus = document.getElementById('pdfUploadStatus');

    if (!pdfFileInput || !pdfUploadArea) return;

    // Click to upload
    pdfUploadArea.addEventListener('click', () => {
        pdfFileInput.click();
    });

    // File input change
    pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handlePDFUpload(file);
        }
    });

    // Drag and drop
    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadArea.classList.add('dragover');
    });

    pdfUploadArea.addEventListener('dragleave', () => {
        pdfUploadArea.classList.remove('dragover');
    });

    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            handlePDFUpload(file);
        } else {
            showPDFStatus('Please upload a PDF file only.', 'error');
        }
    });
}

async function handlePDFUpload(file) {
    const pdfUploadStatus = document.getElementById('pdfUploadStatus');
    const pdfFileInput = document.getElementById('pdfFileInput');
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showPDFStatus('File size exceeds 10MB limit. Please upload a smaller file.', 'error');
        return;
    }

    // Show processing status
    showPDFStatus('Processing PDF... Please wait.', 'processing');

    try {
        const formData = new FormData();
        formData.append('pdf', file);

        // Try to connect to backend (default to localhost:3000)
        const API_URL = 'http://localhost:3000/api/upload-pdf';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.metrics) {
            // Auto-fill form with extracted metrics
            autoFillForm(data.metrics);
            showPDFStatus('✅ PDF processed successfully! Form fields have been auto-filled. Please review and submit.', 'success');
        } else {
            throw new Error('Failed to extract data from PDF');
        }

    } catch (error) {
        console.error('PDF upload error:', error);
        
        // Check if backend is running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showPDFStatus('⚠️ Backend server not running. Please start the server with "npm start" or manually enter your data.', 'error');
        } else {
            showPDFStatus(`Error: ${error.message}. Please try again or enter data manually.`, 'error');
        }
    } finally {
        // Reset file input
        if (pdfFileInput) {
            pdfFileInput.value = '';
        }
    }
}

function autoFillForm(metrics) {
    // Auto-fill form fields with extracted metrics
    if (metrics.glucose !== null) {
        const glucoseInput = document.getElementById('glucose');
        if (glucoseInput) glucoseInput.value = metrics.glucose;
    }

    if (metrics.hba1c !== null) {
        const hba1cInput = document.getElementById('hba1c');
        if (hba1cInput) hba1cInput.value = metrics.hba1c;
    }

    if (metrics.bpSystolic !== null && metrics.bpDiastolic !== null) {
        const bpSystolicInput = document.getElementById('bpSystolic');
        const bpDiastolicInput = document.getElementById('bpDiastolic');
        if (bpSystolicInput) bpSystolicInput.value = metrics.bpSystolic;
        if (bpDiastolicInput) bpDiastolicInput.value = metrics.bpDiastolic;
    }

    if (metrics.age !== null) {
        const ageInput = document.getElementById('age');
        if (ageInput) ageInput.value = metrics.age;
    }

    if (metrics.gender !== null) {
        const genderSelect = document.getElementById('gender');
        if (genderSelect) {
            genderSelect.value = metrics.gender;
        }
    }

    if (metrics.height !== null) {
        const heightInput = document.getElementById('height');
        if (heightInput) heightInput.value = metrics.height;
    }

    if (metrics.weight !== null) {
        const weightInput = document.getElementById('weight');
        if (weightInput) weightInput.value = metrics.weight;
    }

    // Show which fields were filled
    const filledFields = [];
    if (metrics.glucose !== null) filledFields.push('Glucose');
    if (metrics.hba1c !== null) filledFields.push('HbA1c');
    if (metrics.bpSystolic !== null) filledFields.push('Blood Pressure');
    if (metrics.age !== null) filledFields.push('Age');
    if (metrics.gender !== null) filledFields.push('Gender');
    if (metrics.height !== null) filledFields.push('Height');
    if (metrics.weight !== null) filledFields.push('Weight');

    console.log('Auto-filled fields:', filledFields.join(', '));
}

function showPDFStatus(message, type) {
    const pdfUploadStatus = document.getElementById('pdfUploadStatus');
    if (!pdfUploadStatus) return;

    pdfUploadStatus.textContent = message;
    pdfUploadStatus.className = `pdf-upload-status ${type}`;
    pdfUploadStatus.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            pdfUploadStatus.style.display = 'none';
        }, 5000);
    }
}

function getCurrentLocation() {
    const locationBtn = document.getElementById('getLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
    
    if (!locationBtn || !locationStatus) {
        console.error('Location button or status element not found');
        return;
    }
    
    if (!navigator.geolocation) {
        locationStatus.textContent = 'Geolocation is not supported by your browser';
        locationStatus.className = 'location-status error';
        return;
    }

    locationBtn.disabled = true;
    locationBtn.textContent = '📍 Getting Location...';
    locationStatus.textContent = 'Requesting location permission...';
    locationStatus.className = 'location-status';
    locationStatus.style.display = 'block';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            locationBtn.textContent = '✅ Location Saved';
            locationStatus.textContent = `Location saved: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
            locationStatus.className = 'location-status success';
            locationBtn.disabled = false;
            console.log('Location saved:', userLocation);
        },
        function(error) {
            let errorMessage = 'Unable to retrieve your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings and try again.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable. Please check your device location settings.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred. Error code: ' + error.code;
                    break;
            }
            locationStatus.textContent = errorMessage;
            locationStatus.className = 'location-status error';
            locationBtn.textContent = '📍 Get My Location';
            locationBtn.disabled = false;
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        }
    );
}

document.getElementById('diabetesForm').addEventListener('submit', function(e) {
    e.preventDefault();
    assessDiabetesRisk();
});

function assessDiabetesRisk() {
    // Get form values
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const height = parseFloat(document.getElementById('height').value) / 100; // Convert to meters
    const weight = parseFloat(document.getElementById('weight').value);
    const glucose = parseFloat(document.getElementById('glucose').value);
    const hba1c = parseFloat(document.getElementById('hba1c').value) || null;
    const bpSystolic = parseInt(document.getElementById('bpSystolic').value);
    const bpDiastolic = parseInt(document.getElementById('bpDiastolic').value);
    const familyHistory = document.getElementById('familyHistory').value;
    const activity = document.getElementById('activity').value;

    // Calculate BMI
    const bmi = weight / (height * height);

    // Calculate risk score (0-100)
    let riskScore = 0;
    let riskFactors = [];

    // Age factor
    if (age >= 45) {
        riskScore += 10;
        riskFactors.push('Age (45+)');
    } else if (age >= 35) {
        riskScore += 5;
    }

    // BMI factor
    if (bmi >= 30) {
        riskScore += 20;
        riskFactors.push('Obesity (BMI ≥30)');
    } else if (bmi >= 25) {
        riskScore += 10;
        riskFactors.push('Overweight (BMI 25-30)');
    }

    // Blood Glucose factor
    if (glucose >= 126) {
        riskScore += 30;
        riskFactors.push('High Fasting Glucose (≥126 mg/dL)');
    } else if (glucose >= 100) {
        riskScore += 15;
        riskFactors.push('Prediabetes Glucose (100-125 mg/dL)');
    }

    // HbA1c factor
   if (hba1c) {
     if (hba1c >= 6.5) {
          riskScore += 25;
           riskFactors.push('High HbA1c (≥6.5%)');
        } else if (hba1c >= 5.7) {
           riskScore += 12;
            riskFactors.push('Prediabetes HbA1c (5.7-6.4%)');
       }
   }

    // Blood Pressure factor
    if (bpSystolic >= 140 || bpDiastolic >= 90) {
        riskScore += 10;
        riskFactors.push('High Blood Pressure');
    } else if (bpSystolic >= 130 || bpDiastolic >= 80) {
        riskScore += 5;
    }

    // Family History factor
    if (familyHistory === 'yes') {
        riskScore += 10;
        riskFactors.push('Family History');
    }

    // Physical Activity factor
    if (activity === 'sedentary') {
        riskScore += 10;
        riskFactors.push('Sedentary Lifestyle');
    } else if (activity === 'light') {
        riskScore += 5;
    }

    // Gender factor (women may have slightly higher risk in some cases)
    if (gender === 'female' && age > 45) {
        riskScore += 3;
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    let riskLevel, riskMessage, riskClass;
    if (riskScore >= 50) {
        riskLevel = 'HIGH RISK';
        riskMessage = 'You are at HIGH RISK for diabetes. Please consult a healthcare professional immediately.';
        riskClass = 'risk-high';
    } else if (riskScore >= 30) {
        riskLevel = 'MODERATE RISK';
        riskMessage = 'You are at MODERATE RISK for diabetes. Consider lifestyle changes and regular monitoring.';
        riskClass = 'risk-moderate';
    } else {
        riskLevel = 'LOW RISK';
        riskMessage = 'You are at LOW RISK for diabetes. Maintain a healthy lifestyle.';
        riskClass = 'risk-low';
    }

    // Save all data to sessionStorage for results page
    const assessmentData = {
        riskScore,
        riskLevel,
        riskMessage,
        riskClass,
        bmi,
        glucose,
        hba1c,
        bpSystolic,
        bpDiastolic,
        riskFactors,
        userLocation: userLocation,
        voiceLanguage: document.getElementById('voiceLanguage').value || 'en'
    };
    
    sessionStorage.setItem('assessmentData', JSON.stringify(assessmentData));
    
    // Save record for logged in user
    if (currentUser) {
        const record = {
            timestamp: Date.now(),
            monthLabel: getMonthLabel(Date.now()),
            riskScore,
            riskLevel,
            bmi: bmi.toFixed(1),
            glucose: glucose.toFixed(1) + ' mg/dL',
            hba1c: hba1c ? hba1c.toFixed(1) + '%' : 'N/A',
            bp: `${bpSystolic}/${bpDiastolic} mmHg`
        };
        saveRecordForCurrentUser(record);
    }
    
    // Redirect to results page
    window.location.href = 'results.html';
}

function displayResults(riskScore, riskLevel, riskMessage, riskClass, bmi, glucose, hba1c, bpSystolic, bpDiastolic, riskFactors) {
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });

    // Display risk indicator
    const riskIndicator = document.getElementById('riskIndicator');
    riskIndicator.textContent = riskMessage;
    riskIndicator.className = `risk-indicator ${riskClass}`;

    // Update metrics
    document.getElementById('bmiValue').textContent = bmi.toFixed(1);
    const bmiStatus = document.getElementById('bmiStatus');
    if (bmi < 18.5) {
        bmiStatus.textContent = 'Underweight';
        bmiStatus.className = 'metric-status status-warning';
    } else if (bmi < 25) {
        bmiStatus.textContent = 'Normal';
        bmiStatus.className = 'metric-status status-normal';
    } else if (bmi < 30) {
        bmiStatus.textContent = 'Overweight';
        bmiStatus.className = 'metric-status status-warning';
    } else {
        bmiStatus.textContent = 'Obese';
        bmiStatus.className = 'metric-status status-danger';
    }

    document.getElementById('glucoseValue').textContent = glucose.toFixed(1) + ' mg/dL';
    const glucoseStatus = document.getElementById('glucoseStatus');
    if (glucose < 100) {
        glucoseStatus.textContent = 'Normal';
        glucoseStatus.className = 'metric-status status-normal';
    } else if (glucose < 126) {
        glucoseStatus.textContent = 'Prediabetes';
        glucoseStatus.className = 'metric-status status-warning';
    } else {
        glucoseStatus.textContent = 'Diabetes';
        glucoseStatus.className = 'metric-status status-danger';
    }

    if (hba1c) {
        document.getElementById('hba1cValue').textContent = hba1c.toFixed(1) + '%';
        const hba1cStatus = document.getElementById('hba1cStatus');
        if (hba1c < 5.7) {
            hba1cStatus.textContent = 'Normal';
            hba1cStatus.className = 'metric-status status-normal';
        } else if (hba1c < 6.5) {
            hba1cStatus.textContent = 'Prediabetes';
            hba1cStatus.className = 'metric-status status-warning';
        } else {
            hba1cStatus.textContent = 'Diabetes';
            hba1cStatus.className = 'metric-status status-danger';
        }
    } else {
        document.getElementById('hba1cValue').textContent = 'N/A';
        document.getElementById('hba1cStatus').textContent = 'Not provided';
        document.getElementById('hba1cStatus').className = 'metric-status';
    }

    document.getElementById('bpValue').textContent = `${bpSystolic}/${bpDiastolic} mmHg`;
    const bpStatus = document.getElementById('bpStatus');
    if (bpSystolic < 120 && bpDiastolic < 80) {
        bpStatus.textContent = 'Normal';
        bpStatus.className = 'metric-status status-normal';
    } else if (bpSystolic < 130 && bpDiastolic < 80) {
        bpStatus.textContent = 'Elevated';
        bpStatus.className = 'metric-status status-warning';
    } else if (bpSystolic < 140 && bpDiastolic < 90) {
        bpStatus.textContent = 'High Stage 1';
        bpStatus.className = 'metric-status status-warning';
    } else {
        bpStatus.textContent = 'High Stage 2';
        bpStatus.className = 'metric-status status-danger';
    }

    // Create/Update chart
    createRiskChart(riskScore);

    // Display precautions
    displayPrecautions(riskScore, riskFactors);
}

function createRiskChart(riskScore) {
    const ctx = document.getElementById('riskChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (riskChart) {
        riskChart.destroy();
    }

    // Determine color based on risk
    let backgroundColor, borderColor;
    if (riskScore >= 50) {
        backgroundColor = 'rgba(220, 53, 69, 0.2)';
        borderColor = 'rgba(220, 53, 69, 1)';
    } else if (riskScore >= 30) {
        backgroundColor = 'rgba(255, 193, 7, 0.2)';
        borderColor = 'rgba(255, 193, 7, 1)';
    } else {
        backgroundColor = 'rgba(40, 167, 69, 0.2)';
        borderColor = 'rgba(40, 167, 69, 1)';
    }

    riskChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Your Risk Score'],
            datasets: [{
                label: 'Diabetes Risk Score (0-100)',
                data: [riskScore],
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 10,
                        callback: function(value) {
                            if (value === 0) return 'Low Risk';
                            if (value === 30) return 'Moderate Risk';
                            if (value === 50) return 'High Risk';
                            if (value === 100) return 'Very High Risk';
                            return value;
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 30 || context.tick.value === 50) {
                                return 'rgba(255, 0, 0, 0.3)';
                            }
                            return 'rgba(0, 0, 0, 0.1)';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Risk Score: ${context.parsed.y.toFixed(1)}/100`;
                        }
                    }
                }
            }
        }
    });
}

function displayPrecautions(riskScore, riskFactors) {
    const precautionsList = document.getElementById('precautionsList');
    precautionsList.innerHTML = '';

    let precautions = [];

    if (riskScore >= 50) {
        precautions.push('Consult a healthcare professional immediately for proper diagnosis and treatment plan');
        precautions.push('Monitor blood glucose levels regularly as advised by your doctor');
        precautions.push('Follow a strict diabetes management plan if diagnosed');
        precautions.push('Take prescribed medications as directed');
    } else if (riskScore >= 30) {
        precautions.push('Schedule a consultation with your healthcare provider for further evaluation');
        precautions.push('Get regular blood glucose and HbA1c tests every 3-6 months');
        precautions.push('Consider lifestyle modifications to reduce your risk');
    }

    // General precautions based on risk factors
    if (riskFactors.includes('Obesity (BMI ≥30)') || riskFactors.includes('Overweight (BMI 25-30)')) {
        precautions.push('Aim to lose 5-10% of your body weight through a balanced diet and exercise');
        precautions.push('Focus on portion control and choose nutrient-dense foods');
    }

    if (riskFactors.includes('High Fasting Glucose (≥126 mg/dL)') || riskFactors.includes('Prediabetes Glucose (100-125 mg/dL)')) {
        precautions.push('Limit intake of refined sugars and carbohydrates');
        precautions.push('Choose whole grains over refined grains');
        precautions.push('Eat regular meals and avoid skipping meals');
    }

    if (riskFactors.includes('Sedentary Lifestyle')) {
        precautions.push('Engage in at least 150 minutes of moderate-intensity exercise per week');
        precautions.push('Include both aerobic exercises (walking, swimming) and strength training');
        precautions.push('Take breaks from sitting every 30 minutes');
    }

    if (riskFactors.includes('High Blood Pressure')) {
        precautions.push('Reduce sodium intake to less than 2,300 mg per day');
        precautions.push('Limit alcohol consumption');
        precautions.push('Manage stress through relaxation techniques');
    }

    if (riskFactors.includes('Family History')) {
        precautions.push('Be extra vigilant about maintaining a healthy lifestyle');
        precautions.push('Get regular health screenings');
    }

    // General healthy lifestyle precautions
    precautions.push('Eat a balanced diet rich in vegetables, fruits, lean proteins, and whole grains');
    precautions.push('Stay hydrated by drinking plenty of water');
    precautions.push('Get 7-9 hours of quality sleep each night');
    precautions.push('Avoid smoking and limit alcohol consumption');
    precautions.push('Manage stress through meditation, yoga, or other relaxation techniques');
    precautions.push('Regularly monitor your health metrics and keep track of changes');

    // Remove duplicates and add to list
    const uniquePrecautions = [...new Set(precautions)];
    uniquePrecautions.forEach(precaution => {
        const li = document.createElement('li');
        li.textContent = precaution;
        precautionsList.appendChild(li);
    });
}

function speakRiskLevel(riskLevel, riskMessage, voiceLanguage = 'en') {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance();

        const isHindi = voiceLanguage === 'hi';
        
        // Set the text to speak based on risk level and language
        let speechText = '';
        if (riskLevel === 'HIGH RISK') {
            speechText = isHindi
                ? 'चेतावनी! आपका डायबिटीज़ जोखिम बहुत अधिक है। कृपया तुरंत डॉक्टर से संपर्क करें।'
                : 'Warning! You are at high risk for diabetes. Please consult a healthcare professional immediately.';
        } else if (riskLevel === 'MODERATE RISK') {
            speechText = isHindi
                ? 'आपका डायबिटीज़ जोखिम मध्यम है। जीवनशैली में बदलाव करें और नियमित जांच करवाएं।'
                : 'You are at moderate risk for diabetes. Consider lifestyle changes and regular monitoring.';
        } else {
            speechText = isHindi
                ? 'आपका डायबिटीज़ जोखिम कम है। स्वस्थ जीवनशैली बनाए रखें।'
                : 'You are at low risk for diabetes. Maintain a healthy lifestyle.';
        }
        
        utterance.text = speechText;
        utterance.lang = isHindi ? 'hi-IN' : 'en-US';
        
        // Configure voice settings
        utterance.volume = 1.0; // 0.0 to 1.0
        utterance.rate = 0.9; // 0.1 to 10 (slightly slower for clarity)
        utterance.pitch = 1.0; // 0 to 2
        
        // Try to use a more natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = getPreferredVoice(voices, isHindi);
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Speak the message
        window.speechSynthesis.speak(utterance);
        
        // Handle voices loading (some browsers load voices asynchronously)
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = function() {
                const updatedVoices = window.speechSynthesis.getVoices();
                const voice = getPreferredVoice(updatedVoices, isHindi);
                
                if (voice) {
                    utterance.voice = voice;
                }
                window.speechSynthesis.speak(utterance);
            };
        }
    }
}

// ---------- Auth & Records ----------

function initApp() {
    loadSavedUser();
}

function handleLogin() {
    const nameInput = document.getElementById('userName');
    const emailInput = document.getElementById('userEmail');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!name || !email) {
        alert('Please enter name and email to continue.');
        return;
    }

    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }

    try {
        // Frontend-only login; store locally
        currentUser = { name, email };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
        updateUserBar();
        toggleAuthSections(true);
        renderRecordsForCurrentUser();
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login & Continue';
        }
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem(USER_STORAGE_KEY);
    toggleAuthSections(false);
}

function loadSavedUser() {
    try {
        const saved = localStorage.getItem(USER_STORAGE_KEY);
        if (saved) {
            currentUser = JSON.parse(saved);
            updateUserBar();
            toggleAuthSections(true);
            renderRecordsForCurrentUser();
            return;
        }
    } catch (e) {
        console.error('Error loading saved user', e);
    }
    toggleAuthSections(false);
}

function toggleAuthSections(isLoggedIn) {
    const authSection = document.getElementById('authSection');
    const appContent = document.getElementById('appContent');
    const userBar = document.getElementById('userBar');
    const recordsSection = document.getElementById('recordsSection');

    if (isLoggedIn) {
        authSection.style.display = 'none';
        appContent.style.display = 'block';
        userBar.style.display = 'flex';
        if (recordsSection) recordsSection.style.display = 'block';
    } else {
        authSection.style.display = 'block';
        appContent.style.display = 'none';
        userBar.style.display = 'none';
        if (recordsSection) recordsSection.style.display = 'none';
    }
}

function updateUserBar() {
    if (!currentUser) return;
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
    if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
}

function getRecordsKey() {
    if (!currentUser) return null;
    return `${RECORDS_KEY_PREFIX}${currentUser.email}`;
}

async function saveRecordForCurrentUser(record) {
    if (!currentUser) return;
    const key = getRecordsKey();
    let records = [];
    try {
        const saved = localStorage.getItem(key);
        records = saved ? JSON.parse(saved) : [];
    } catch (e) {
        records = [];
    }
    records.unshift(record);
    records = records.slice(0, 12); // keep latest 12
    localStorage.setItem(key, JSON.stringify(records));
    renderRecords(records);
}

async function renderRecordsForCurrentUser() {
    if (!currentUser) {
        const recordsSection = document.getElementById('recordsSection');
        if (recordsSection) recordsSection.style.display = 'none';
        return;
    }
    const key = getRecordsKey();
    let records = [];
    try {
        const saved = localStorage.getItem(key);
        records = saved ? JSON.parse(saved) : [];
    } catch (e) {
        records = [];
    }
    renderRecords(records);
}

function renderRecords(records) {
    const recordsSection = document.getElementById('recordsSection');
    const recordsList = document.getElementById('recordsList');
    if (!recordsSection || !recordsList) return;

    recordsList.innerHTML = '';

    if (!records || records.length === 0) {
        recordsSection.style.display = currentUser ? 'block' : 'none';
        recordsList.innerHTML = '<div class="records-empty">No records yet. Submit an assessment to save it.</div>';
        return;
    }

    recordsSection.style.display = 'block';

    records.forEach(record => {
        const card = document.createElement('div');
        card.className = 'record-card';

        const riskClass = record.riskLevel === 'HIGH RISK' ? 'high' : record.riskLevel === 'MODERATE RISK' ? 'moderate' : 'low';

        card.innerHTML = `
            <div class="record-month">${record.monthLabel}</div>
            <div class="record-line record-risk ${riskClass}">${record.riskLevel}</div>
            <div class="record-line">Risk Score: ${record.riskScore}</div>
            <div class="record-line">BMI: ${record.bmi}</div>
            <div class="record-line">Glucose: ${record.glucose}</div>
            <div class="record-line">HbA1c: ${record.hba1c}</div>
            <div class="record-line">BP: ${record.bp}</div>
        `;

        recordsList.appendChild(card);
    });
}

function getMonthLabel(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

async function apiLogin(name, email) {
    // Frontend-only stub to keep flow consistent
    return { name, email };
}

function getPreferredVoice(voices, isHindi) {
    if (isHindi) {
        return voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith('hi'))
            || voices.find(voice => voice.lang && voice.lang.toLowerCase().includes('hi'))
            || voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith('en')); // fallback
    }
    return voices.find(voice => 
        voice.lang.includes('en') && (voice.name.includes('Female') || voice.name.includes('Zira') || voice.name.includes('Samantha'))
    ) || voices.find(voice => voice.lang.includes('en'));
}

async function findNearbyHospitals(lat, lon) {
    const hospitalsSection = document.getElementById('hospitalsSection');
    const hospitalsList = document.getElementById('hospitalsList');
    
    hospitalsSection.style.display = 'block';
    hospitalsList.innerHTML = '<div class="loading">🔍 Searching for nearby hospitals...</div>';
    
    // Try multiple methods to find hospitals
    let hospitals = [];
    
    // Method 1: Try Overpass API with comprehensive search
    try {
        const radius = 10000; // 10km radius for better results
        const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="hospital"](around:${radius},${lat},${lon});
  node["healthcare"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
);
out center meta;`;
        
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
        const response = await fetch(overpassUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.elements && data.elements.length > 0) {
                hospitals = data.elements
                    .filter(h => h.tags && (h.tags.name || h.tags['name:en']))
                    .map(hospital => {
                        const hospitalLat = hospital.lat || (hospital.center && hospital.center.lat);
                        const hospitalLon = hospital.lon || (hospital.center && hospital.center.lon);
                        
                        if (!hospitalLat || !hospitalLon) return null;
                        
                        const distance = calculateDistance(lat, lon, hospitalLat, hospitalLon);
                        const name = hospital.tags.name || hospital.tags['name:en'] || hospital.tags['name:local'] || 'Hospital';
                        const address = hospital.tags['addr:full'] || 
                                       (hospital.tags['addr:street'] ? 
                                        `${hospital.tags['addr:street']}, ${hospital.tags['addr:city'] || ''}`.trim() : 
                                        hospital.tags['addr:city'] || 'Address not available');
                        
                        return {
                            name: name.trim(),
                            distance: distance,
                            lat: hospitalLat,
                            lon: hospitalLon,
                            address: address
                        };
                    })
                    .filter(h => h !== null)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 10);
                
                if (hospitals.length > 0) {
                    displayHospitals(hospitals.slice(0, 5));
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Overpass API error:', error);
    }
    
    // Method 2: Try Nominatim API with better query
    await searchHospitalsNominatim(lat, lon);
}

async function searchHospitalsNominatim(lat, lon) {
    const hospitalsList = document.getElementById('hospitalsList');
    
    try {
        // Try multiple search terms for better results
        const searchTerms = ['hospital', 'medical center', 'clinic', 'healthcare'];
        let allHospitals = [];
        
        for (const term of searchTerms) {
            try {
                const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&lat=${lat}&lon=${lon}&radius=10000&limit=10&addressdetails=1`;
                
                const response = await fetch(nominatimUrl, {
                    headers: {
                        'User-Agent': 'DiabetesRiskAssessmentApp/1.0',
                        'Referer': window.location.origin
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data && data.length > 0) {
                        const hospitals = data
                            .filter(h => {
                                const type = (h.type || '').toLowerCase();
                                const category = (h.category || '').toLowerCase();
                                const name = (h.display_name || '').toLowerCase();
                                return type.includes('hospital') || 
                                       type.includes('clinic') || 
                                       category.includes('hospital') ||
                                       category.includes('healthcare') ||
                                       name.includes('hospital') ||
                                       name.includes('medical') ||
                                       name.includes('clinic');
                            })
                            .map(hospital => {
                                const distance = calculateDistance(lat, lon, parseFloat(hospital.lat), parseFloat(hospital.lon));
                                
                                // Extract hospital name better
                                let name = 'Hospital';
                                if (hospital.name) {
                                    name = hospital.name;
                                } else if (hospital.display_name) {
                                    const parts = hospital.display_name.split(',');
                                    name = parts[0].trim();
                                }
                                
                                // Build address
                                let address = hospital.display_name || 'Address not available';
                                if (hospital.address) {
                                    const addr = hospital.address;
                                    const addrParts = [
                                        addr.road,
                                        addr.suburb || addr.neighbourhood,
                                        addr.city || addr.town || addr.village,
                                        addr.state,
                                        addr.country
                                    ].filter(Boolean);
                                    if (addrParts.length > 0) {
                                        address = addrParts.join(', ');
                                    }
                                }
                                
                                return {
                                    name: name,
                                    distance: distance,
                                    lat: parseFloat(hospital.lat),
                                    lon: parseFloat(hospital.lon),
                                    address: address
                                };
                            });
                        
                        allHospitals = allHospitals.concat(hospitals);
                    }
                }
                
                // Small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`Error searching for ${term}:`, err);
            }
        }
        
        // Remove duplicates and sort by distance
        const uniqueHospitals = [];
        const seen = new Set();
        
        allHospitals.forEach(hospital => {
            const key = `${hospital.lat.toFixed(4)}_${hospital.lon.toFixed(4)}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueHospitals.push(hospital);
            }
        });
        
        const sortedHospitals = uniqueHospitals
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
        
        if (sortedHospitals.length > 0) {
            displayHospitals(sortedHospitals);
        } else {
            // Final fallback: Use reverse geocoding to get location name and suggest manual search
            try {
                const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
                const reverseResponse = await fetch(reverseUrl, {
                    headers: {
                        'User-Agent': 'DiabetesRiskAssessmentApp/1.0',
                        'Referer': window.location.origin
                    }
                });
                
                if (reverseResponse.ok) {
                    const locationData = await reverseResponse.json();
                    const locationName = locationData.address ? 
                        `${locationData.address.city || locationData.address.town || locationData.address.village || 'your location'}` : 
                        'your location';
                    
                    hospitalsList.innerHTML = `
                        <div class="no-hospitals">
                            <p>No hospitals found in the immediate area.</p>
                            <p>Please search for hospitals near <strong>${locationName}</strong> manually or contact emergency services.</p>
                            <p><strong>Emergency: 911</strong> (or your local emergency number)</p>
                            <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" class="directions-btn" style="margin-top: 10px; display: inline-block;">Search on Google Maps</a>
                        </div>
                    `;
                } else {
                    throw new Error('Reverse geocoding failed');
                }
            } catch (err) {
                hospitalsList.innerHTML = `
                    <div class="no-hospitals">
                        <p>Unable to fetch hospital data automatically.</p>
                        <p>Please search manually or contact emergency services immediately.</p>
                        <p><strong>Emergency: 911</strong> (or your local emergency number)</p>
                        <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" class="directions-btn" style="margin-top: 10px; display: inline-block;">Search on Google Maps</a>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error fetching hospitals from Nominatim:', error);
        hospitalsList.innerHTML = `
            <div class="no-hospitals">
                <p>Unable to fetch hospital data. Please search manually or contact emergency services.</p>
                <p><strong>Emergency: 911</strong> (or your local emergency number)</p>
                <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" class="directions-btn" style="margin-top: 10px; display: inline-block;">Search on Google Maps</a>
            </div>
        `;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function displayHospitals(hospitals) {
    const hospitalsList = document.getElementById('hospitalsList');
    hospitalsList.innerHTML = '';
    
    if (!hospitals || hospitals.length === 0) {
        hospitalsList.innerHTML = '<div class="no-hospitals">No hospitals found nearby. Please search manually or contact emergency services.</div>';
        return;
    }
    
    hospitals.forEach((hospital, index) => {
        const hospitalCard = document.createElement('div');
        hospitalCard.className = 'hospital-card';
        
        const distanceText = hospital.distance < 1 
            ? `${(hospital.distance * 1000).toFixed(0)} meters away`
            : `${hospital.distance.toFixed(2)} km away`;
        
        // Clean up hospital name - remove extra whitespace and ensure it's not empty
        const hospitalName = (hospital.name || 'Hospital').trim() || 'Hospital';
        
        hospitalCard.innerHTML = `
            <div class="hospital-number">${index + 1}</div>
            <div class="hospital-info">
                <h4>${hospitalName}</h4>
                <p class="hospital-distance">📍 ${distanceText}</p>
                <p class="hospital-address">${hospital.address || 'Address not available'}</p>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}" 
                   target="_blank" class="directions-btn">Get Directions</a>
            </div>
        `;
        
        hospitalsList.appendChild(hospitalCard);
    });
}

function showLocationPrompt() {
    const hospitalsSection = document.getElementById('hospitalsSection');
    const hospitalsList = document.getElementById('hospitalsList');
    
    hospitalsSection.style.display = 'block';
    hospitalsList.innerHTML = `
        <div class="location-prompt">
            <p>📍 To find nearby hospitals, please click "Get My Location" button above and then assess your risk again.</p>
            <p>Or contact emergency services immediately at <strong>911</strong> or your local emergency number.</p>
        </div>
    `;
}

function resetForm() {
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    document.getElementById('diabetesForm').reset();
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('hospitalsSection').style.display = 'none';
    document.getElementById('locationStatus').textContent = '';
    document.getElementById('locationStatus').className = 'location-status';
    document.getElementById('getLocationBtn').textContent = '📍 Get My Location';
    userLocation = null;
    if (riskChart) {
        riskChart.destroy();
        riskChart = null;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

