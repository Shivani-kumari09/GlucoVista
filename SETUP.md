# Quick Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server:**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`

3. **Open the application:**
   - Open `index.html` in your web browser
   - Or use a local server like `python -m http.server 8000` and visit `http://localhost:8000`

## Using PDF Upload Feature

1. Click on the PDF upload area in the form
2. Select your diabetes lab report PDF
3. The app will extract health metrics automatically
4. Review the auto-filled form fields
5. Complete any missing fields manually
6. Submit for risk assessment

## Features

- **PDF Upload**: Automatically extracts glucose, HbA1c, blood pressure, and other metrics
- **Risk Assessment**: Calculates diabetes risk based on health metrics
- **Hospital Suggestions**: Automatically shows nearby hospitals for high-risk patients
- **Monthly Tracking**: Saves and tracks your assessments over time

## Troubleshooting

**Backend not running?**
- Make sure you've run `npm install` first
- Then run `npm start`
- Check that port 3000 is not already in use

**PDF upload not working?**
- Ensure the backend server is running
- Check that the PDF is text-based (not just scanned images)
- Try a different PDF or enter data manually

