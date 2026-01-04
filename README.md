# GlucoVista - Diabetes Risk Assessment App

A web application for assessing diabetes risk with login functionality, monthly record tracking, and PDF report upload support.

## Features

- User login system
- Diabetes risk assessment based on health metrics
- **PDF Report Upload** - Upload your lab report PDF to automatically extract health data
- Monthly record tracking
- Nearby hospital recommendations for high-risk patients
- Hindi and English voice support
- Live location tracking

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 3. Open the Application

Open `index.html` in your web browser. The frontend will automatically connect to the backend server for PDF processing.

**Note:** For PDF upload functionality, make sure the backend server is running. If the server is not running, you can still use the app by manually entering your health data.

## Project Structure

```
GlucoVista/
├── index.html          # Main HTML file
├── results.html        # Results page
├── script.js           # Frontend JavaScript
├── results.js          # Results page JavaScript
├── style.css           # Styles
├── server.js           # Backend server (Node.js/Express)
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## PDF Upload Feature

The app can automatically extract health metrics from your diabetes lab report PDF:

- **Blood Glucose** (Fasting)
- **HbA1c** (Glycated Hemoglobin)
- **Blood Pressure** (Systolic/Diastolic)
- **Age, Gender, Height, Weight** (if available in PDF)

### How to Use PDF Upload:

1. Click on the PDF upload area or drag and drop your PDF file
2. The app will process the PDF and extract health metrics
3. Form fields will be automatically filled with extracted data
4. Review the data and submit for risk assessment

### Supported PDF Formats:

- Standard lab report PDFs
- Text-based PDFs (scanned PDFs may not work)
- Maximum file size: 10MB

## Data Storage

All data is stored locally in your browser (localStorage). Login is browser-only and records are saved per email on this device.

## API Endpoints

- `POST /api/upload-pdf` - Upload and process PDF file
- `GET /api/health` - Health check endpoint

## Troubleshooting

### PDF Upload Issues

- Make sure the backend server is running (`npm start`)
- Check that the PDF is text-based (not just scanned images)
- Verify the PDF contains readable health metrics
- If extraction fails, manually enter your data

### Login or Records Issues

- Make sure you are using the same browser/device to see previously saved records.
- If you clear browser data or use incognito mode, records will be gone.
- Check the browser console (F12) for any errors.

## Notes

- The app uses localStorage for session management and record storage.
- Records are organized by user email in localStorage on this device.
- PDF processing requires the backend server to be running.
- Hospital suggestions are shown automatically for high-risk patients if location is provided.
