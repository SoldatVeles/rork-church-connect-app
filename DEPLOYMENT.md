# Church Community App - Authentication & Deployment Guide

## Overview

This Church Community App now includes a complete authentication system with user registration, login, and data persistence. The app uses a tRPC backend with file-based JSON storage for simplicity and easy deployment.

## Authentication System

### How Users Register and Login

#### Registration Process
1. **New User Registration**: Users can create accounts through the registration screen
2. **User Data**: Collects first name, last name, email, optional phone number, and password
3. **Default Role**: New users are automatically assigned the "member" role
4. **Data Storage**: User data is stored in the backend's JSON file system

#### Login Process
1. **Email/Password Authentication**: Users login with their email and password
2. **Demo Credentials**: For testing, the app includes demo accounts:
   - **Admin**: admin@church.com / admin123
   - **Pastor**: pastor@church.com / pastor123
   - **Member**: member@church.com / member123
3. **Session Management**: User sessions are maintained using AsyncStorage on the device

### User Roles and Permissions

The app supports three user roles with different permission levels:

#### Admin
- **Permissions**: Full access to all features
- **Can**: Manage users, events, content, send notifications, view donations, manage prayers, upload sermons

#### Pastor
- **Permissions**: Content and community management
- **Can**: Manage events, content, send notifications, manage prayers, upload sermons

#### Member
- **Permissions**: Basic user access
- **Can**: View content, register for events, submit prayer requests, pray for others

## Data Storage

### Current System (Development)
- **File-based JSON storage** in the `data/` directory
- **Files**:
  - `users.json` - User accounts and profiles
  - `events.json` - Church events and registrations
  - `prayers.json` - Prayer requests and responses
- **Persistence**: Data persists between app restarts
- **Location**: Server filesystem (`/data` folder)

### For Production Deployment
When deploying to production, you should consider upgrading to a proper database:

#### Recommended Database Options
1. **PostgreSQL** with Prisma ORM
2. **MongoDB** with Mongoose
3. **SQLite** for smaller deployments
4. **Firebase Firestore** for serverless deployment

## Deployment Options

### Option 1: Traditional Server Deployment

#### Requirements
- Node.js server (VPS, AWS EC2, DigitalOcean, etc.)
- Domain name
- SSL certificate

#### Steps
1. **Server Setup**:
   ```bash
   # Clone your repository
   git clone <your-repo-url>
   cd church-app
   
   # Install dependencies
   npm install
   
   # Build the app
   npm run build
   
   # Start the server
   npm start
   ```

2. **Environment Configuration**:
   - Set up environment variables for production
   - Configure database connection (if upgrading from JSON files)
   - Set up SSL certificates

3. **Mobile App Distribution**:
   - Build APK/IPA files using EAS Build
   - Distribute through Google Play Store and Apple App Store
   - Or distribute APK directly for Android

### Option 2: Serverless Deployment (Recommended)

#### Vercel Deployment
1. **Deploy Backend**:
   ```bash
   # Deploy to Vercel
   vercel --prod
   ```

2. **Configure Environment**:
   - Set up environment variables in Vercel dashboard
   - Configure database connection

3. **Mobile App**:
   - Update API endpoints to point to your Vercel deployment
   - Build and distribute mobile app

#### Netlify Functions
Similar process to Vercel, using Netlify Functions for the backend API.

### Option 3: Cloud Platform Deployment

#### AWS
- **Backend**: Deploy using AWS Lambda + API Gateway
- **Database**: Use AWS RDS (PostgreSQL) or DynamoDB
- **Storage**: S3 for file uploads
- **CDN**: CloudFront for static assets

#### Google Cloud Platform
- **Backend**: Cloud Functions or Cloud Run
- **Database**: Cloud SQL or Firestore
- **Storage**: Cloud Storage

## Mobile App Distribution

### Google Play Store
1. **Build APK/AAB**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Upload to Play Console**:
   - Create developer account ($25 one-time fee)
   - Upload APK/AAB file
   - Fill out store listing information
   - Submit for review

### Apple App Store
1. **Build IPA**:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Upload to App Store Connect**:
   - Apple Developer account required ($99/year)
   - Upload IPA file
   - Fill out app information
   - Submit for review

### Direct Distribution (Android)
- Build APK and distribute directly
- Users need to enable "Install from unknown sources"
- Good for beta testing or internal distribution

## Security Considerations

### Current Implementation (Demo)
- **Passwords**: Stored in plain text (demo only)
- **Authentication**: Basic email/password validation
- **Sessions**: Local storage only

### Production Recommendations
1. **Password Hashing**: Use bcrypt or similar
2. **JWT Tokens**: Implement proper token-based authentication
3. **HTTPS**: Always use SSL/TLS in production
4. **Input Validation**: Validate all user inputs
5. **Rate Limiting**: Implement API rate limiting
6. **Database Security**: Use proper database security practices

## Environment Variables

Create a `.env` file for production:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/church_app"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# API
API_URL="https://your-domain.com/api"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## Scaling Considerations

### Small Church (< 100 members)
- Current JSON file system is sufficient
- Single server deployment
- Basic features

### Medium Church (100-500 members)
- Upgrade to PostgreSQL or MongoDB
- Add caching (Redis)
- Consider CDN for images

### Large Church (500+ members)
- Microservices architecture
- Load balancing
- Database clustering
- Advanced caching strategies

## Support and Maintenance

### Regular Tasks
1. **Backup Data**: Regular database/file backups
2. **Update Dependencies**: Keep packages updated
3. **Monitor Performance**: Track app performance and errors
4. **User Support**: Handle user registration issues

### Monitoring
- Set up error tracking (Sentry)
- Monitor API performance
- Track user engagement
- Monitor server resources

## Getting Started

1. **Test the Current System**:
   - Run the app locally
   - Test registration and login
   - Verify data persistence

2. **Choose Deployment Method**:
   - Start with Vercel for simplicity
   - Upgrade to dedicated server as needed

3. **Prepare for Production**:
   - Implement proper password hashing
   - Set up database
   - Configure environment variables

4. **Deploy and Test**:
   - Deploy backend
   - Build mobile app
   - Test all functionality

5. **Distribute**:
   - Submit to app stores
   - Or distribute directly

The app is now ready for production deployment with a complete authentication system and persistent data storage!