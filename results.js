let riskChart = null;
let trendsChart = null;

// Load and display results when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadAndDisplayResults();
    loadMonthlyTrends();
});

function loadAndDisplayResults() {
    // Get assessment data from sessionStorage
    const assessmentDataStr = sessionStorage.getItem('assessmentData');
    
    if (!assessmentDataStr) {
        // No data found, redirect back to main page
        alert('No assessment data found. Please complete an assessment first.');
        window.location.href = 'index.html';
        return;
    }
    
    const assessmentData = JSON.parse(assessmentDataStr);
    
    // Display all results
    displayResults(
        assessmentData.riskScore,
        assessmentData.riskLevel,
        assessmentData.riskMessage,
        assessmentData.riskClass,
        assessmentData.bmi,
        assessmentData.glucose,
        assessmentData.hba1c,
        assessmentData.bpSystolic,
        assessmentData.bpDiastolic,
        assessmentData.riskFactors
    );
    
    // If high risk and location is available, find nearby hospitals
    if (assessmentData.riskScore >= 50 && assessmentData.userLocation) {
        findNearbyHospitals(assessmentData.userLocation.latitude, assessmentData.userLocation.longitude);
    } else if (assessmentData.riskScore >= 50) {
        // Show message to get location for hospital recommendations
        showLocationPrompt();
    }
    
    // Announce risk level with voice
    speakRiskLevel(assessmentData.riskLevel, assessmentData.riskMessage, assessmentData.voiceLanguage);
}

function loadMonthlyTrends() {
    // Try to get current user from localStorage
    const USER_STORAGE_KEY = 'diab_current_user';
    const RECORDS_KEY_PREFIX = 'diab_records_';
    
    try {
        // Get current assessment data
        const assessmentDataStr = sessionStorage.getItem('assessmentData');
        if (!assessmentDataStr) {
            return; // No current assessment
        }
        const assessmentData = JSON.parse(assessmentDataStr);
        
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (!savedUser) {
            // Even without user, we can show current assessment as a single point
            // But for trends, we need multiple points, so return
            return;
        }
        
        const currentUser = JSON.parse(savedUser);
        const recordsKey = `${RECORDS_KEY_PREFIX}${currentUser.email}`;
        const savedRecords = localStorage.getItem(recordsKey);
        
        let records = [];
        if (savedRecords) {
            records = JSON.parse(savedRecords);
        }
        
        // Add current assessment to records if not already there
        const currentRecord = {
            timestamp: Date.now(),
            monthLabel: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            glucose: assessmentData.glucose.toFixed(1) + ' mg/dL',
            bp: `${assessmentData.bpSystolic}/${assessmentData.bpDiastolic} mmHg`
        };
        
        // Check if current record already exists (same timestamp within 1 minute)
        const now = Date.now();
        const existingIndex = records.findIndex(r => Math.abs(r.timestamp - now) < 60000);
        if (existingIndex === -1) {
            records.unshift(currentRecord);
        } else {
            records[existingIndex] = currentRecord;
        }
        
        // Sort records by timestamp (oldest first) and limit to last 12 months
        const sortedRecords = [...records]
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-12); // Keep last 12 records
        
        if (sortedRecords.length < 1) {
            return; // Need at least 1 record
        }
        
        // Extract data for chart
        const months = [];
        const glucoseLevels = [];
        const bloodPressures = [];
        
        sortedRecords.forEach(record => {
            // Get month label
            const date = new Date(record.timestamp);
            const monthLabel = date.toLocaleString('default', { month: 'short' });
            months.push(monthLabel);
            
            // Extract glucose value (remove " mg/dL")
            const glucoseStr = record.glucose || '0 mg/dL';
            const glucoseValue = parseFloat(glucoseStr.replace(' mg/dL', ''));
            glucoseLevels.push(glucoseValue);
            
            // Extract blood pressure (average of systolic and diastolic)
            const bpStr = record.bp || '120/80 mmHg';
            const bpMatch = bpStr.match(/(\d+)\/(\d+)/);
            if (bpMatch) {
                const systolic = parseFloat(bpMatch[1]);
                const diastolic = parseFloat(bpMatch[2]);
                const avgBP = (systolic + diastolic) / 2;
                bloodPressures.push(avgBP);
            } else {
                bloodPressures.push(120); // Default if parsing fails
            }
        });
        
        // Create the trends chart
        createMonthlyTrendsChart(months, glucoseLevels, bloodPressures);
        
    } catch (error) {
        console.error('Error loading monthly trends:', error);
    }
}

function createMonthlyTrendsChart(months, glucoseLevels, bloodPressures) {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    const trendsSection = document.getElementById('trendsSection');
    trendsSection.style.display = 'block';
    
    // Destroy existing chart if it exists
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    // Calculate min/max for better scaling
    const minGlucose = Math.min(...glucoseLevels) - 20;
    const maxGlucose = Math.max(...glucoseLevels) + 20;
    const minBP = Math.min(...bloodPressures) - 10;
    const maxBP = Math.max(...bloodPressures) + 10;
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Average Glucose Level (mg/dL)',
                    data: glucoseLevels,
                    borderColor: 'rgb(220, 53, 69)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgb(220, 53, 69)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Blood Pressure (mmHg)',
                    data: bloodPressures,
                    borderColor: 'rgb(23, 162, 184)',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgb(23, 162, 184)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Diabetes Risk Indicators',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex === 0) {
                                    label += context.parsed.y.toFixed(1) + ' mg/dL';
                                } else {
                                    label += context.parsed.y.toFixed(1) + ' mmHg';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Month',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Glucose Level (mg/dL)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    min: Math.max(0, Math.floor(minGlucose / 10) * 10),
                    max: Math.ceil(maxGlucose / 10) * 10,
                    ticks: {
                        stepSize: 10,
                        callback: function(value) {
                            return value;
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Blood Pressure (mmHg)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    min: Math.max(0, Math.floor(minBP / 5) * 5),
                    max: Math.ceil(maxBP / 5) * 5,
                    ticks: {
                        stepSize: 5,
                        callback: function(value) {
                            return value;
                        }
                    },
                    grid: {
                        display: false // Don't show grid for right axis to avoid clutter
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function displayResults(riskScore, riskLevel, riskMessage, riskClass, bmi, glucose, hba1c, bpSystolic, bpDiastolic, riskFactors) {
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

// Hospital search functions (copied from main script)
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
            <p>📍 To find nearby hospitals, please go back to the assessment page, click "Get My Location" button, and then assess your risk again.</p>
            <p>Or contact emergency services immediately at <strong>911</strong> or your local emergency number.</p>
            <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" class="directions-btn" style="margin-top: 10px; display: inline-block;">Search on Google Maps</a>
        </div>
    `;
}

