# CAMELA POS - Installation Guide for XAMPP

## Prerequisites
- XAMPP (Apache + MySQL + PHP)
- Node.js (for build process)
- Git (optional, for version control)

## Installation Steps

### 1. Build the Project
```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Copy to XAMPP
```bash
# Copy the dist folder to XAMPP htdocs
cp -r dist/* C:/xampp/htdocs/camela-pos/
```

### 3. Configure Apache
Make sure Apache is running in XAMPP Control Panel.

### 4. Access the Application
Open your browser and navigate to:
```
http://localhost/camela-pos/
```

## Development Setup

### 1. Clone/Download the Project
```bash
git clone <repository-url>
cd camela-pos
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Access Development Server
```
http://localhost:8080
```

## Build Commands

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Serve built files (for testing)
npm run serve
```

## File Structure After Build
```
dist/
├── index.html
├── assets/
│   ├── index-abc123.js
│   ├── index-def456.css
│   └── images/
└── favicon.ico
```

## XAMPP Configuration Notes

### Apache Configuration
No special configuration needed. The build uses relative paths (`./`) so it works out of the box.

### Database Configuration
This application uses localStorage for data persistence, so no database setup is required.

### PHP Configuration
Not required - this is a pure frontend application.

## Troubleshooting

### 404 Errors
- Make sure Apache is running
- Check that files are in the correct htdocs folder
- Verify .htaccess (if present) is correct

### Blank Page
- Check browser console for errors
- Verify all files were copied correctly
- Check that index.html exists

### CORS Issues
Not applicable for XAMPP deployment as it's served from the same domain.

## Production Deployment

For production deployment:

1. Build the project: `npm run build`
2. Upload the `dist` folder contents to your web server
3. Ensure the server serves static files
4. Access via your domain

## Features

- **Login System**: Dynamic credentials based on store profile
- **Store Profile Management**: Logo upload and store information
- **Inventory Management**: Stock tracking and management
- **Sales Management**: Transaction recording
- **Expense Tracking**: Operational and product expenses
- **Reporting**: Export functionality with filters
- **Responsive Design**: Works on desktop and mobile

## Data Storage

This application uses browser localStorage for data persistence:
- Login state
- Store profile information
- Product inventory
- Sales records
- Expense records

Note: Data is stored locally in the browser and not synchronized between devices.
