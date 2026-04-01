# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for Haven Space.

---

## Table of Contents

1. [Google Cloud Platform Setup](#google-cloud-platform-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Migration](#database-migration)
4. [Installing Dependencies](#installing-dependencies)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Google Cloud Platform Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** dropdown at the top
3. Click **NEW PROJECT**
4. Enter project name: `Haven Space` (or your preferred name)
5. Click **CREATE**

### Step 2: Enable Google+ API

1. In the Google Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for **"Google+ API"** or **"Google People API"**
3. Click on it and press **ENABLE**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace account)
3. Click **CREATE**

**Fill in the required fields:**

| Field                       | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| **App name**                | Haven Space                                             |
| **User support email**      | Your email address                                      |
| **App logo**                | (Optional) Upload Haven Space logo                      |
| **Application home page**   | `https://havenspace.com` (or localhost for development) |
| **Authorized domains**      | `havenspace.com` (skip for localhost development)       |
| **Developer contact email** | Your email address                                      |

4. Click **SAVE AND CONTINUE**

**Scopes:**

5. On the Scopes page, click **ADD OR REMOVE SCOPES**
6. Select these scopes:
   - `../auth/userinfo.email` - View your email address
   - `../auth/userinfo.profile` - View your basic profile info
   - `../auth/openid` - Associate you with your Personal Info visible publicly
7. Click **UPDATE**
8. Click **SAVE AND CONTINUE**

**Test users (for development):**

9. Click **ADD USERS**
10. Add your test email addresses
11. Click **SAVE AND CONTINUE**
12. Click **BACK TO DASHBOARD**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application** as the application type

**Authorized JavaScript origins:**

```
http://localhost:8000
http://localhost:3000
```

**Authorized redirect URIs:**

```
http://localhost:8000/api/auth/google/callback.php
```

For production, add:

```
https://havenspace.com/api/auth/google/callback.php
```

4. Click **CREATE**

### Step 5: Save Your Credentials

A popup will show your **Client ID** and **Client Secret**. Copy both - you'll need them for the next section.

> ⚠️ **Important:** Keep your Client Secret secure! Never commit it to version control.

---

## Environment Configuration

### Create `.env` File

1. Navigate to the `server` directory
2. Copy `.env.example` to `.env`:

```bash
cd server
cp .env.example .env
```

3. Edit `.env` and add your Google credentials:

```env
JWT_SECRET=your_jwt_secret_key_here
DB_HOST=127.0.0.1
DB_NAME=havenspace_db
DB_USER=root
DB_PASS=

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
```

Replace the values with your actual Client ID and Client Secret.

---

## Database Migration

Run the migration to add Google OAuth fields to the users table:

```bash
cd server

# Using MySQL CLI
mysql -u root -p havenspace_db < database/migrations/002_add_google_auth_to_users.sql
```

Or manually run the SQL in your database client:

```sql
-- Add Google OAuth columns
ALTER TABLE users
    ADD COLUMN google_id VARCHAR(255) UNIQUE NULL AFTER email,
    ADD COLUMN google_token TEXT NULL AFTER google_id,
    ADD COLUMN google_refresh_token TEXT NULL AFTER google_token,
    ADD COLUMN avatar_url VARCHAR(500) NULL AFTER google_refresh_token,
    MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Add index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
```

---

## Installing Dependencies

### Install PHP Dependencies

```bash
cd server
composer install
```

This installs:

- `guzzlehttp/guzzle` - HTTP client for Google API requests
- `firebase/php-jwt` - JWT token handling (optional, cURL fallback available)

---

## Testing

### Test the OAuth Flow

1. **Start your servers:**

```bash
# Terminal 1 - Backend (PHP)
cd server
php -S localhost:8000 -t api

# Terminal 2 - Frontend
cd /path/to/Final
bun run start
```

2. **Test Google Login:**

   - Open browser to `http://localhost:3000/client/views/public/auth/login.html`
   - Click **"Log in with Google"**
   - Select a test Google account
   - You should be redirected to the dashboard

3. **Test Google Signup:**

   - Open browser to `http://localhost:3000/client/views/public/auth/signup.html`
   - Select a role (Boarder or Landlord)
   - Click **"Continue with Google"**
   - Select a test Google account
   - Complete the signup form (pre-filled with Google data)
   - You should be redirected to the dashboard

4. **Test Account Linking:**
   - Login with email/password first
   - Go to Profile settings
   - Click **"Link Google Account"**
   - Authorize with Google
   - Account should be linked

---

## Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error

**Problem:** The redirect URI in your request doesn't match what's configured in Google Cloud Console.

**Solution:**

- Verify the `GOOGLE_REDIRECT_URI` in `.env` matches exactly what's in Google Cloud Console
- Ensure no trailing slashes
- Check for http vs https

#### 2. "Access blocked: This app's request is invalid"

**Problem:** OAuth consent screen not configured or app not verified.

**Solution:**

- Complete the OAuth consent screen setup
- Add your test email to test users (for development)
- For production, submit for verification (required for public apps)

#### 3. "Invalid state parameter"

**Problem:** Session not persisting between authorize and callback.

**Solution:**

- Ensure `session_start()` is called in both endpoints
- Check cookie settings in browser
- Verify CORS configuration allows credentials

#### 4. "User already registered" Error

**Problem:** Email exists in database but not linked to Google.

**Solution:**

- This is expected behavior
- User should login with email/password first, then link Google from profile
- Or implement account merging flow

#### 5. cURL Error: SSL Certificate Problem

**Problem:** cURL can't verify Google's SSL certificate.

**Solution:**

```php
// In GoogleOAuth.php, add to cURL options:
curl_setopt($ch, CURLOPT_CAINFO, __DIR__ . '/cacert.pem');
```

Download `cacert.pem` from [https://curl.se/ca/cacert.pem](https://curl.se/ca/cacert.pem)

#### 6. Tokens Not Persisting

**Problem:** User logs in but tokens aren't saved.

**Solution:**

- Check database migration ran successfully
- Verify `google_id` column exists in users table
- Check PHP error logs for SQL errors

---

## File Structure

```
server/
├── api/
│   └── auth/
│       └── google/
│           ├── authorize.php          # Initiates OAuth flow
│           ├── callback.php           # Handles Google callback
│           ├── link.php               # Links Google to existing account
│           ├── finalize-signup.php    # Completes signup with role selection
│           └── get-pending-user.php   # Gets pending user data
├── src/
│   └── Core/
│       └── Auth/
│           └── GoogleOAuth.php        # OAuth handler class
├── config/
│   └── google.php                     # Google OAuth configuration
├── database/
│   └── migrations/
│       └── 002_add_google_auth_to_users.sql
└── .env.example                       # Environment template

client/
├── js/
│   └── auth/
│       ├── login.js                   # Updated with Google login
│       └── signup.js                  # Updated with Google signup
└── views/
    └── public/
        └── auth/
            ├── login.html             # Login page with Google button
            └── signup.html            # Signup page with Google button
```

---

## API Endpoints

| Endpoint                                | Method | Description                       |
| --------------------------------------- | ------ | --------------------------------- |
| `/api/auth/google/authorize.php`        | GET    | Initiates Google OAuth flow       |
| `/api/auth/google/callback.php`         | GET    | Handles callback from Google      |
| `/api/auth/google/link.php`             | GET    | Links Google to existing account  |
| `/api/auth/google/finalize-signup.php`  | POST   | Completes signup for Google users |
| `/api/auth/google/get-pending-user.php` | GET    | Retrieves pending user data       |

---

## Security Considerations

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use HTTPS in production** - Set `secure=true` for cookies
3. **State parameter** - Prevents CSRF attacks
4. **Token validation** - Always validate ID tokens from Google
5. **Rate limiting** - Already implemented via existing RateLimiter
6. **HttpOnly cookies** - JWT tokens stored securely

---

## Production Deployment

### Update Google Cloud Console

1. Add production domain to **Authorized JavaScript origins**:

   ```
   https://havenspace.com
   ```

2. Add production redirect URI:

   ```
   https://havenspace.com/api/auth/google/callback.php
   ```

3. Update OAuth consent screen with production domain

### Update Environment Variables

```env
GOOGLE_REDIRECT_URI=https://havenspace.com/api/auth/google/callback.php
```

### Update Cookie Settings

In production files, set `secure=true` for cookies:

```php
setcookie('access_token', $token, [
    'secure' => true,  // true in production
    'httponly' => true,
    'samesite' => 'Lax',
]);
```

---

## Support

For issues or questions:

- Check the [troubleshooting section](#troubleshooting)
- Review Google's [OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2)
- Check PHP error logs: `error_log()` output
- Enable debug mode in `google.php` for detailed logging

---

**Last Updated:** 2026-04-01
**Version:** 1.0.0
