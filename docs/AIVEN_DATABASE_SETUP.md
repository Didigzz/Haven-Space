# Aiven.io Database Setup Guide for Haven Space

This guide walks you through creating and configuring a MySQL database on Aiven.io for the Haven Space application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Create an Aiven Account](#step-1-create-an-aiven-account)
- [Step 2: Create a New Project](#step-2-create-a-new-project)
- [Step 3: Create a MySQL Service](#step-3-create-a-mysql-service)
- [Step 4: Retrieve Database Credentials](#step-4-retrieve-database-credentials)
- [Step 5: Download SSL Certificate](#step-5-download-ssl-certificate)
- [Step 6: Configure Haven Space](#step-6-configure-haven-space)
- [Step 7: Run Database Migrations](#step-7-run-database-migrations)
- [Step 8: Verify Connection](#step-8-verify-connection)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- An Aiven.io account (free tier available)
- Haven Space project cloned locally
- Access to a terminal or command line
- MySQL client or database GUI tool (optional, for verification)

---

## Step 1: Create an Aiven Account

1. Navigate to [https://aiven.io](https://aiven.io)
2. Click **Sign Up** in the top right corner
3. Choose your preferred sign-up method:
   - Google account
   - GitHub account
   - Email and password
4. Complete the registration process
5. Verify your email address if prompted

> **Note:** Aiven offers a free trial with $300 in credits. No credit card required for initial signup.

---

## Step 2: Create a New Project

1. Log in to your Aiven Console
2. Click **Create Project** on the dashboard
3. Fill in the project details:
   - **Project Name:** `haven-space` (or your preferred name)
   - **Billing Group:** Select `Free trial` or your billing plan
   - **Cloud Provider:** Choose your preferred provider (AWS, Google Cloud, DigitalOcean)
   - **Region:** Select the region closest to your users (e.g., `US East`, `EU West`, `Asia Pacific`)
4. Click **Create Project**

> **Tip:** Choose a region close to your application's deployment region (e.g., if deploying to GitHub Pages, any region works, but US/EU regions are common).

---

## Step 3: Create a MySQL Service

1. Inside your project, click **Create Service**
2. Select **MySQL** from the service options
3. Configure the service:

   **Service Name:**

   ```
   havenspace-db
   ```

   **Plan Selection:**

   - **Free Plan:** Select `Free-1` (suitable for development/testing)
   - **Production Plan:** Select `Business-4` or higher for production workloads

   **Cloud Provider & Region:**

   - Choose the same provider and region as your project (or closest available)

4. Click **Create Service**

> **Note:** Service creation may take 5-15 minutes. You'll see a "Running" status when complete.

---

## Step 4: Retrieve Database Credentials

Once your MySQL service is running:

1. Click on your service name (`havenspace-db`) in the Aiven Console
2. Navigate to the **Overview** tab
3. Look for the **Connection Information** section
4. Copy the following values:

   | Parameter         | Description                         | Example Value                     |
   | ----------------- | ----------------------------------- | --------------------------------- |
   | **Host**          | Database host URL                   | `mysql-xxxxx.aivencloud.com`      |
   | **Port**          | Database port                       | `13306` (Aiven uses custom ports) |
   | **Database Name** | Default database                    | `defaultdb`                       |
   | **Username**      | Database username                   | `avnadmin`                        |
   | **Password**      | Database password (click to reveal) | `<YOUR_AIVEN_PASSWORD>`           |

5. Also note the **Service URI** format:
   ```
   mysql://avnadmin:<YOUR_AIVEN_PASSWORD>@mysql-xxxxx.aivencloud.com:13306/defaultdb?ssl-mode=REQUIRED
   ```

> **Important:** Aiven MySQL services use `defaultdb` as the default database name. You'll create the `havenspace_db` database in the next steps.

---

## Step 5: Download SSL Certificate

Aiven requires SSL connections for security.

1. In your MySQL service page, click on the **Overview** tab
2. Scroll to **Connection Information**
3. Click **Download CA Certificate** (or find it in the **Advanced Settings** tab)
4. Save the certificate file as `ca.pem` in your project:

   ```
   server/config/ca.pem
   ```

   Alternatively, you can download it via command line:

   ```bash
   # Create config directory if it doesn't exist
   mkdir -p server/config

   # Download the CA certificate (replace with your actual certificate URL)
   curl -o server/config/ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

   Or copy the certificate content from Aiven Console and paste it into `server/config/ca.pem`.

> **Security Note:** Never commit the `ca.pem` file to version control. Add it to `.gitignore` if needed.

---

## Step 6: Configure Haven Space

### 6.1 Update Environment Variables

1. Navigate to your project's server directory:

   ```bash
   cd server
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Open `.env` in your editor and update the following values:

   ```env
   # Application Environment
   APP_ENV=production

   # Application Debug Mode
   APP_DEBUG=false

   # Database Configuration (Aiven)
   DB_HOST=mysql-xxxxx.aivencloud.com
   DB_PORT=13306
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASS=<YOUR_AIVEN_PASSWORD>

   # Database SSL Configuration
   DB_SSL_MODE=REQUIRED
   DB_SSL_CA=./config/ca.pem

   # JWT Configuration (generate a secure random key)
   JWT_SECRET=your_secure_random_key_here
   JWT_EXPIRATION=3600
   REFRESH_TOKEN_EXPIRATION=604800

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback.php

   # CORS Configuration
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

4. Generate a secure JWT secret:

   ```bash
   # Linux/Mac
   openssl rand -base64 32

   # Windows (PowerShell)
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

### 6.2 Update Database Configuration

The database configuration file at `server/config/database.php` already supports SSL. Ensure it contains:

```php
return [
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', 3306),
    'database' => env('DB_NAME', 'havenspace_db'),
    'username' => env('DB_USER', 'root'),
    'password' => env('DB_PASS', ''),
    'charset' => 'utf8mb4',
    'ssl_mode' => env('DB_SSL_MODE', null),
    'ssl_ca' => env('DB_SSL_CA', null),
    'options' => [
        PDO::ATTR_ERRMODE => isDebugMode() ? PDO::ERRMODE_EXCEPTION : PDO::ERRMODE_SILENT,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];
```

---

## Step 7: Run Database Migrations

Aiven MySQL uses the `defaultdb` database by default. You have two options:

### Option A: Use `defaultdb` Directly (Recommended)

Simply run migrations against the `defaultdb` database (already configured in Step 6).

### Option B: Create a Dedicated `havenspace_db` Database

1. Connect to your Aiven MySQL instance:

   ```bash
   mysql -h mysql-xxxxx.aivencloud.com -P 13306 -u avnadmin -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem defaultdb
   ```

2. Create the database:

   ```sql
   CREATE DATABASE IF NOT EXISTS havenspace_db;
   USE havenspace_db;
   ```

3. Update your `.env` file:

   ```env
   DB_NAME=havenspace_db
   ```

### Running Migrations

Execute all migration files in order:

```bash
# Navigate to server directory
cd server

# Option 1: Using MySQL CLI (run all migrations manually)
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $DB_NAME < database/schema.sql

# Option 2: Run individual migrations
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $DB_NAME < database/migrations/001_create_users_table.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $DB_NAME < database/migrations/002_add_google_auth_to_users.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $DB_NAME < database/migrations/002_create_properties_table.sql
# ... continue for all migrations
```

Or run all migrations at once:

```bash
# Linux/Mac
for file in database/migrations/*.sql; do
  mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASS" --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $DB_NAME < "$file"
  echo "Applied: $file"
done

# Windows (PowerShell)
Get-ChildItem database/migrations/*.sql | ForEach-Object {
  mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER -p$env:DB_PASS --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem $env:DB_NAME < $_.FullName
  Write-Host "Applied: $($_.Name)"
}
```

> **Note:** If you encounter foreign key constraint errors, you may need to disable foreign key checks temporarily:

```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Run migrations
SET FOREIGN_KEY_CHECKS = 1;
```

---

## Step 8: Verify Connection

### 8.1 Test Database Connection via CLI

```bash
mysql -h mysql-xxxxx.aivencloud.com -P 13306 -u avnadmin -p --ssl-mode=REQUIRED --ssl-ca=./config/ca.pem defaultdb
```

Once connected, verify the database exists:

```sql
SHOW DATABASES;
USE havenspace_db;
SHOW TABLES;
```

### 8.2 Test via API Health Endpoint

1. Start your PHP server:

   ```bash
   cd server
   php -S localhost:8000 -t api
   ```

2. Navigate to the health endpoint in your browser:

   ```
   http://localhost:8000/api/health.php
   ```

3. You should see a JSON response similar to:

   ```json
   {
     "status": "ok",
     "timestamp": "2026-04-10T12:00:00Z",
     "database": {
       "status": "connected",
       "host": "mysql-xxxxx.aivencloud.com",
       "database": "defaultdb"
     }
   }
   ```

### 8.3 Test Application Functionality

1. Start the frontend:

   ```bash
   bun run start
   ```

2. Try creating a new user account via the signup page
3. Verify the user appears in the database:

   ```sql
   SELECT id, first_name, last_name, email, role FROM users;
   ```

---

## Troubleshooting

### Connection Timeout

**Error:** `Connection timed out` or `Can't connect to MySQL server`

**Solutions:**

- Verify your firewall isn't blocking outbound connections on port 13306
- Ensure the host and port are correct (Aiven uses custom ports, not 3306)
- Check if your IP is allowed in Aiven's service settings (if using IP restrictions)

### SSL Certificate Errors

**Error:** `SSL connection error` or `SSL certificate problem`

**Solutions:**

- Ensure `DB_SSL_MODE=REQUIRED` is set in `.env`
- Verify the `ca.pem` file path is correct in `DB_SSL_CA`
- Try downloading the certificate again from Aiven Console
- On Windows, ensure the file uses LF line endings (not CRLF)

### Access Denied

**Error:** `Access denied for user 'avnadmin'@'...'`

**Solutions:**

- Double-check username and password in `.env`
- Ensure password doesn't have extra spaces or quotes
- Reset the password in Aiven Console if needed

### Foreign Key Constraint Errors

**Error:** `Cannot add or update a child row: a foreign key constraint fails`

**Solutions:**

- Run migrations in the correct numerical order
- Disable foreign key checks temporarily (see Step 7)
- Ensure the `users` table is created before tables that reference it

### Database Not Found

**Error:** `Unknown database 'havenspace_db'`

**Solutions:**

- Use `defaultdb` instead (Aiven's default database)
- Create the database manually (see Step 7, Option B)
- Verify `DB_NAME` in `.env` matches your database name

### PDO SSL Options Not Working

If `DB_SSL_MODE` and `DB_SSL_CA` environment variables aren't being picked up, update `server/config/database.php` to explicitly handle SSL:

```php
$options = [
    PDO::ATTR_ERRMODE => isDebugMode() ? PDO::ERRMODE_EXCEPTION : PDO::ERRMODE_SILENT,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

// Add SSL options if configured
if (env('DB_SSL_MODE')) {
    $options[PDO::MYSQL_ATTR_SSL_CA] = env('DB_SSL_CA');
    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = env('DB_SSL_MODE') !== 'REQUIRED';
}

return [
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', 3306),
    'database' => env('DB_NAME', 'havenspace_db'),
    'username' => env('DB_USER', 'root'),
    'password' => env('DB_PASS', ''),
    'charset' => 'utf8mb4',
    'options' => $options,
];
```

---

## Additional Resources

- [Aiven MySQL Documentation](https://aiven.io/docs/products/mysql)
- [Aiven CLI](https://aiven.io/docs/tools/cli)
- [MySQL SSL Configuration](https://dev.mysql.com/doc/refman/8.0/en/encrypted-connections.html)
- [PDO SSL Options](https://www.php.net/manual/en/ref.pdo-mysql.php)

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** - Aiven generates secure passwords by default
3. **Enable IP allowlisting** in Aiven Console for production
4. **Rotate credentials regularly** (every 90 days recommended)
5. **Use principle of least privilege** - create separate read-only users for analytics
6. **Enable automated backups** in Aiven (available on paid plans)
7. **Monitor database metrics** via Aiven Console (CPU, memory, connections)

---

_Last updated: April 10, 2026_
