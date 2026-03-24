# Church Connect App - Complete Requirements Document

## Project Overview

**App Name:** Church Connect App  
**Platform:** React Native with Expo (Cross-platform: iOS, Android, Web)  
**Architecture:** TypeScript, React Native, Expo Router, Supabase Backend  
**Version:** 1.0.0  

## Core Technologies & Dependencies

### Frontend Stack
- **React Native:** 0.79.1
- **Expo SDK:** 53.0.4
- **TypeScript:** ~5.8.3
- **Expo Router:** File-based routing system
- **React Query (@tanstack/react-query):** Server state management
- **Zustand:** Global state management
- **NativeWind:** Styling (though currently using StyleSheet)

### Backend & Database
- **Supabase:** Backend-as-a-Service
- **PostgreSQL:** Database
- **Supabase Auth:** Authentication system
- **Real-time subscriptions:** For live updates

### Key Libraries
- **@nkzw/create-context-hook:** Context management
- **lucide-react-native:** Icons
- **expo-linear-gradient:** Gradient backgrounds
- **@react-native-community/datetimepicker:** Date/time selection
- **react-native-gesture-handler:** Touch gestures
- **expo-image:** Optimized image handling

## App Structure & Navigation

### File-based Routing (Expo Router)
```
app/
├── _layout.tsx                 # Root layout with providers
├── +not-found.tsx             # 404 page
├── (auth)/                    # Authentication group
│   ├── _layout.tsx           # Auth layout
│   ├── login.tsx             # Login screen
│   └── register.tsx          # Registration screen
├── (tabs)/                   # Main app tabs
│   ├── _layout.tsx           # Tab navigation
│   ├── index.tsx             # Home screen
│   ├── events.tsx            # Events screen
│   ├── prayers.tsx           # Prayer requests screen
│   └── profile.tsx           # User profile screen
├── admin.tsx                 # Admin panel (role-restricted)
└── auth-callback.tsx         # OAuth callback handler
```

### Navigation Features
- **Tab Navigation:** 4 main tabs (Home, Events, Prayers, Profile)
- **Stack Navigation:** Nested navigation within tabs
- **Modal Presentations:** For forms and detailed views
- **Protected Routes:** Authentication-based access control
- **Role-based Access:** Admin-only screens

## User Authentication & Authorization

### Authentication System
- **Supabase Auth:** Email/password authentication
- **Email Verification:** Required for new accounts
- **Session Management:** Persistent login sessions
- **OAuth Support:** Ready for social login integration

### User Roles & Permissions
```typescript
type UserRole = 'admin' | 'pastor' | 'member' | 'visitor';

type Permission = 
  | 'manage_users'
  | 'manage_events' 
  | 'manage_content'
  | 'send_notifications'
  | 'view_donations'
  | 'manage_prayers'
  | 'upload_sermons';
```

### User Profile Data
- **Basic Info:** First name, last name, email, phone
- **Display Name:** Optional custom display name
- **Role Assignment:** Admin-controlled role management
- **Join Date:** Membership tracking
- **Avatar Support:** Profile picture capability

## Core Features

### 1. Home Dashboard

#### Welcome Section
- **Personalized Greeting:** Time-based greeting with user name
- **User Role Display:** Shows current user role
- **Notification Bell:** Real-time notification access

#### Quick Actions Grid
- **Events Overview:** Total and upcoming events count
- **Prayer Requests:** Active prayer requests count
- **Latest Sermon:** Featured sermon access
- **Community Stats:** Member count display

#### Announcements Feed
- **Recent Announcements:** Church-wide announcements
- **Urgent Notifications:** Priority messaging system
- **Time Stamps:** Relative time display

#### Daily Verse
- **Scripture Display:** Daily Bible verse
- **Reference Citation:** Book, chapter, verse
- **Inspirational Design:** Styled presentation

### 2. Events Management

#### Event Display
- **Event Cards:** Rich event information display
- **Event Types:** Sabbath, Prayer Meeting, Bible Study, Youth, Special, Conference
- **Color Coding:** Type-based visual organization
- **Date/Time:** Formatted date and time display
- **Location Information:** Venue details
- **Attendance Tracking:** Current/max attendees

#### Event Creation (Admin/Pastor)
- **Form Fields:**
  - Title (required)
  - Description (required)
  - Start Date & Time
  - End Date & Time
  - Location (required)
  - Event Type selection
  - Max Attendees (optional)
- **Date/Time Pickers:** Platform-specific implementations
- **Validation:** Comprehensive form validation
- **Real-time Updates:** Immediate UI updates

#### Registration System
- **User Registration:** Join/leave events
- **Capacity Management:** Attendance limits
- **Registration Status:** Visual indicators
- **Waitlist Support:** When at capacity

#### Filtering & Search
- **Type Filters:** Filter by event type
- **Status Filters:** Active, upcoming, past events
- **Search Functionality:** Text-based search

### 3. Prayer Requests

#### Prayer Request Display
- **Request Cards:** Detailed prayer information
- **Status Indicators:** Active, Answered, Archived
- **Urgency Markers:** Priority visual indicators
- **Anonymous Support:** Privacy protection
- **Prayer Count:** Community engagement tracking

#### Prayer Request Creation
- **Form Fields:**
  - Title (required)
  - Description (required)
  - Anonymous option
  - Urgent marking
- **Privacy Controls:** Anonymous submission
- **Status Management:** Request lifecycle

#### Prayer Interaction
- **Prayer Tracking:** "I'm praying" functionality
- **Community Engagement:** See who's praying
- **Status Updates:** Mark as answered
- **Permission Controls:** Who can update status

#### Prayer Management
- **Status Filtering:** Active, Answered, All
- **Prayer Statistics:** Engagement metrics
- **Database Tracking:** prayer_prayers join table

### 4. User Profile

#### Profile Information
- **User Details:** Name, email, phone, role
- **Membership Info:** Join date, role badge
- **Activity Stats:** Events attended, prayers shared, community points
- **Permission Display:** User capabilities

#### Settings & Preferences
- **Notification Settings:** Preference management
- **Privacy Controls:** Data privacy options
- **App Settings:** Customization options
- **Admin Panel Access:** Role-based admin tools

#### Account Management
- **Logout Functionality:** Secure session termination
- **Profile Updates:** Edit personal information
- **Role Management:** Admin-controlled role changes

### 5. Admin Panel (Admin Role Only)

#### User Management
- **User List:** All registered users
- **Role Assignment:** Change user roles
- **Permission Management:** Grant/revoke permissions
- **User Statistics:** Membership analytics

#### Content Management
- **Event Oversight:** Manage all events
- **Prayer Moderation:** Oversee prayer requests
- **Announcement System:** Church-wide messaging
- **Notification Management:** Push notification control

## Database Schema

### Core Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'pastor', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  location TEXT,
  event_type TEXT DEFAULT 'sabbath' CHECK (event_type IN ('sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference')),
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  registered_users JSONB DEFAULT '[]'::jsonb,
  is_registration_open BOOLEAN DEFAULT true,
  image_url TEXT,
  group_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### prayers
```sql
CREATE TABLE prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  details TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'group', 'private')),
  group_id UUID,
  is_answered BOOLEAN DEFAULT false,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### prayer_prayers (Join Table)
```sql
CREATE TABLE prayer_prayers (
  prayer_id UUID REFERENCES prayers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (prayer_id, user_id)
);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### groups (Future Feature)
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## UI/UX Design System

### Color Palette
- **Primary:** #1e3a8a (Blue 800)
- **Secondary:** #3b82f6 (Blue 500)
- **Accent:** #ef4444 (Red 500)
- **Success:** #10b981 (Emerald 500)
- **Warning:** #f59e0b (Amber 500)
- **Background:** #f8fafc (Slate 50)
- **Surface:** #ffffff (White)
- **Text Primary:** #1e293b (Slate 800)
- **Text Secondary:** #64748b (Slate 500)

### Typography
- **Headers:** Bold, large sizes (24-32px)
- **Body Text:** Regular, readable sizes (14-16px)
- **Captions:** Small, secondary info (12px)
- **Font Weight:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Component Design
- **Cards:** Rounded corners (12-16px), subtle shadows
- **Buttons:** Rounded (8-12px), color-coded by action type
- **Inputs:** Rounded (12px), light background, clear borders
- **Icons:** Lucide React Native, consistent sizing
- **Spacing:** 8px grid system (8, 16, 24, 32px)

### Responsive Design
- **Mobile First:** Optimized for mobile devices
- **Web Compatibility:** React Native Web support
- **Tablet Support:** Adaptive layouts
- **Safe Area:** Proper inset handling

## State Management

### Global State (@nkzw/create-context-hook)
- **Authentication State:** User session, profile data
- **App State:** Global app configuration
- **Theme State:** UI theme preferences

### Server State (React Query)
- **Events:** Event data caching and synchronization
- **Prayers:** Prayer request management
- **Users:** User profile data
- **Notifications:** Real-time notification handling

### Local State (useState)
- **Form Data:** Input field values
- **UI State:** Modal visibility, loading states
- **Filter State:** Search and filter preferences

## Real-time Features

### Supabase Realtime
- **Event Updates:** Live event changes
- **Prayer Updates:** Real-time prayer status
- **Notification Delivery:** Instant notifications
- **User Presence:** Online status tracking

### Optimistic Updates
- **Event Registration:** Immediate UI feedback
- **Prayer Interactions:** Instant prayer tracking
- **Form Submissions:** Responsive user experience

## Security & Privacy

### Data Protection
- **Row Level Security (RLS):** Database-level access control
- **Role-based Access:** Feature-level permissions
- **Anonymous Prayers:** Privacy-protected submissions
- **Secure Authentication:** Supabase Auth integration

### API Security
- **JWT Tokens:** Secure API authentication
- **HTTPS Only:** Encrypted data transmission
- **Input Validation:** Server-side data validation
- **SQL Injection Protection:** Parameterized queries

## Performance Optimization

### Caching Strategy
- **React Query:** Intelligent data caching
- **Image Caching:** Expo Image optimization
- **Offline Support:** Cached data availability

### Bundle Optimization
- **Code Splitting:** Lazy loading components
- **Tree Shaking:** Unused code elimination
- **Asset Optimization:** Compressed images and fonts

## Testing Strategy

### Test Coverage
- **Unit Tests:** Component and utility testing
- **Integration Tests:** Feature workflow testing
- **E2E Tests:** Complete user journey testing
- **Performance Tests:** Load and stress testing

### Test IDs
- **Accessibility:** Screen reader support
- **Automation:** Test automation support
- **Debug Support:** Development debugging aids

## Deployment & Distribution

### Platform Support
- **iOS:** App Store distribution
- **Android:** Google Play Store distribution
- **Web:** Progressive Web App (PWA)

### Environment Configuration
- **Development:** Local development setup
- **Staging:** Pre-production testing
- **Production:** Live app deployment

### CI/CD Pipeline
- **Automated Testing:** Continuous integration
- **Build Automation:** Automated app builds
- **Deployment Automation:** Streamlined releases

## Future Enhancements

### Planned Features
- **Push Notifications:** Mobile push notification system
- **Offline Mode:** Full offline functionality
- **Multi-language Support:** Internationalization
- **Advanced Search:** Full-text search capabilities
- **File Uploads:** Document and media sharing
- **Calendar Integration:** External calendar sync
- **Donation System:** Online giving platform
- **Live Streaming:** Service broadcast integration
- **Group Management:** Small group organization
- **Sermon Library:** Audio/video sermon archive

### Technical Improvements
- **Performance Monitoring:** App performance tracking
- **Error Tracking:** Crash reporting and analytics
- **A/B Testing:** Feature experimentation
- **Advanced Analytics:** User behavior insights
- **Accessibility Enhancements:** WCAG compliance
- **Dark Mode:** Theme switching capability

## Development Guidelines

### Code Standards
- **TypeScript:** Strict type checking
- **ESLint:** Code quality enforcement
- **Prettier:** Code formatting consistency
- **Component Architecture:** Reusable component design

### Git Workflow
- **Feature Branches:** Isolated feature development
- **Pull Requests:** Code review process
- **Semantic Versioning:** Version management
- **Commit Conventions:** Standardized commit messages

### Documentation
- **Code Comments:** Inline documentation
- **API Documentation:** Endpoint documentation
- **User Guides:** Feature usage guides
- **Developer Onboarding:** Setup instructions

## Support & Maintenance

### Monitoring
- **Error Tracking:** Real-time error monitoring
- **Performance Metrics:** App performance tracking
- **User Analytics:** Usage pattern analysis
- **Database Monitoring:** Query performance tracking

### Backup & Recovery
- **Database Backups:** Regular data backups
- **Disaster Recovery:** Data recovery procedures
- **Version Control:** Code history preservation
- **Configuration Management:** Environment settings backup

This comprehensive requirements document serves as a complete blueprint for recreating the Church Connect App from scratch, including all features, technical specifications, database schema, and implementation details.