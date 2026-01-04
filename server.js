const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Function to extract health metrics from PDF text
function extractHealthMetrics(text) {
    const metrics = {
        glucose: null,
        hba1c: null,
        bpSystolic: null,
        bpDiastolic: null,
        age: null,
        gender: null,
        height: null,
        weight: null
    };

    // Normalize text for better matching
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

    // Extract Blood Glucose (Fasting)
    const glucosePatterns = [
        /(?:fasting|fbg|blood glucose|glucose|sugar)[\s:]*(\d+\.?\d*)\s*(?:mg\/dl|mg\/dL|mgdl)/gi,
        /(\d+\.?\d*)\s*(?:mg\/dl|mg\/dL)\s*(?:fasting|blood glucose|glucose)/gi,
        /glucose[\s:]*(\d+\.?\d*)/gi
    ];
    
    for (const pattern of glucosePatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const value = parseFloat(match[0].match(/\d+\.?\d*/)[0]);
            if (value >= 50 && value <= 500) {
                metrics.glucose = value;
                break;
            }
        }
    }

    // Extract HbA1c
    const hba1cPatterns = [
        /(?:hba1c|hba-1c|glycated hemoglobin|a1c)[\s:]*(\d+\.?\d*)\s*%/gi,
        /(\d+\.?\d*)\s*%\s*(?:hba1c|hba-1c|a1c)/gi
    ];
    
    for (const pattern of hba1cPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const value = parseFloat(match[0].match(/\d+\.?\d*/)[0]);
            if (value >= 3 && value <= 15) {
                metrics.hba1c = value;
                break;
            }
        }
    }

    // Extract Blood Pressure
    const bpPatterns = [
        /(?:blood pressure|bp|pressure)[\s:]*(\d+)\s*\/\s*(\d+)\s*(?:mmhg|mm hg)/gi,
        /(\d+)\s*\/\s*(\d+)\s*(?:mmhg|mm hg)\s*(?:blood pressure|bp)/gi,
        /(\d+)\/(\d+)\s*(?:mmhg|mm hg)/gi
    ];
    
    for (const pattern of bpPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const systolic = parseInt(match[1]);
            const diastolic = parseInt(match[2]);
            if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
                metrics.bpSystolic = systolic;
                metrics.bpDiastolic = diastolic;
                break;
            }
        }
    }

    // Extract Age
    const agePatterns = [
        /(?:age|aged)[\s:]*(\d+)\s*(?:years|yrs|yr)/gi,
        /(\d+)\s*(?:years|yrs|yr)\s*(?:old|of age)/gi
    ];
    
    for (const pattern of agePatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const value = parseInt(match[1]);
            if (value >= 1 && value <= 120) {
                metrics.age = value;
                break;
            }
        }
    }

    // Extract Gender
    if (normalizedText.match(/\b(male|m)\b/)) {
        metrics.gender = 'male';
    } else if (normalizedText.match(/\b(female|f|woman|women)\b/)) {
        metrics.gender = 'female';
    }

    // Extract Height (in cm)
    const heightPatterns = [
        /(?:height|ht)[\s:]*(\d+\.?\d*)\s*(?:cm|centimeter)/gi,
        /(\d+\.?\d*)\s*(?:cm|centimeter)\s*(?:height|tall)/gi
    ];
    
    for (const pattern of heightPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            if (value >= 50 && value <= 250) {
                metrics.height = value;
                break;
            }
        }
    }

    // Extract Weight (in kg)
    const weightPatterns = [
        /(?:weight|wt|body weight)[\s:]*(\d+\.?\d*)\s*(?:kg|kilogram)/gi,
        /(\d+\.?\d*)\s*(?:kg|kilogram)\s*(?:weight|wt)/gi
    ];
    
    for (const pattern of weightPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            if (value >= 20 && value <= 300) {
                metrics.weight = value;
                break;
            }
        }
    }

    return metrics;
}

// PDF upload and processing endpoint
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
        const filePath = req.file.path;
        const dataBuffer = fs.readFileSync(filePath);
        
        // Parse PDF
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;

        // Extract health metrics
        const metrics = extractHealthMetrics(text);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        // Return extracted metrics
        res.json({
            success: true,
            metrics: metrics,
            extractedText: text.substring(0, 500) // First 500 chars for debugging
        });

    } catch (error) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('PDF processing error:', error);
        res.status(500).json({ 
            error: 'Failed to process PDF', 
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'GlucoVista API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`GlucoVista server running on http://localhost:${PORT}`);
});

