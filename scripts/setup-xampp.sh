#!/bin/bash

# XAMPP Setup Script for Haven Space
# This script configures XAMPP for local development

set -e

echo "🔧 Haven Space XAMPP Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    XAMPP_DIR="C:/xampp"
    MYSQL_BIN="$XAMPP_DIR/mysql/bin"
    APACHE_BIN="$XAMPP_DIR/apache/bin"
else
    # Linux/Mac XAMPP
    XAMPP_DIR="/opt/lampp"
    MYSQL_BIN="$XAMPP_DIR/bin"
    APACHE_BIN="$XAMPP_DIR/bin"
fi

echo ""
echo "📁 XAMPP Directory: $XAMPP_DIR"

# Check if XAMPP is installed
if [ ! -d "$XAMPP_DIR" ]; then
    echo -e "${RED}❌ XAMPP not found at $XAMPP_DIR${NC}"
    echo "Please install XAMPP from: https://www.apachefriends.org/"
    exit 1
fi

echo -e "${GREEN}✓ XAMPP installation found${NC}"

# Copy server files to htdocs
HTDOCS_DIR="$XAMPP_DIR/htdocs/haven-space"
echo ""
echo "📦 Copying Haven Space to $HTDOCS_DIR..."

# Create directory if it doesn't exist
mkdir -p "$HTDOCS_DIR"

# Copy server files
cp -r ../server/* "$HTDOCS_DIR/"

echo -e "${GREEN}✓ Files copied to htdocs${NC}"

# Copy .env.xampp to .env
if [ -f "$HTDOCS_DIR/.env.xampp" ]; then
    cp "$HTDOCS_DIR/.env.xampp" "$HTDOCS_DIR/.env"
    echo -e "${GREEN}✓ Environment file configured${NC}"
fi

# Start MySQL if not running
echo ""
echo "🚀 Starting MySQL..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows - check if MySQL is running as service
    if ! sc query MySQL80 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  MySQL service not found. Please start MySQL from XAMPP Control Panel.${NC}"
    else
        net start MySQL80 2>/dev/null || echo -e "${YELLOW}⚠️  MySQL might already be running${NC}"
    fi
else
    # Linux - use lampp
    sudo $XAMPP_DIR/lampp startmysql
fi

# Create database
echo ""
echo "📊 Creating database..."
DB_PASSWORD=""
read -p "Enter MySQL root password (press Enter for empty): " -s DB_PASSWORD
echo ""

$MYSQL_BIN/mysql -u root -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not create database. Please check MySQL is running.${NC}"
    echo "You can create the database manually using phpMyAdmin:"
    echo "  1. Open http://localhost/phpmyadmin"
    echo "  2. Create database 'havenspace_db'"
}

echo -e "${GREEN}✓ Database created (or already exists)${NC}"

# Run migrations
echo ""
echo "🔧 Running database migrations..."
if [ -d "$HTDOCS_DIR/database/migrations" ]; then
    for migration in "$HTDOCS_DIR/database/migrations"/*.sql; do
        if [ -f "$migration" ]; then
            $MYSQL_BIN/mysql -u root -p"$DB_PASSWORD" havenspace_db < "$migration" 2>/dev/null || {
                echo -e "${YELLOW}⚠️  Migration failed: $migration${NC}"
            }
        fi
    done
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${YELLOW}⚠️  No migrations found${NC}"
fi

# Configure Apache
echo ""
echo "⚙️  Configuring Apache..."
if [ -f "$HTDOCS_DIR/api/.htaccess" ]; then
    echo -e "${GREEN}✓ .htaccess already in place${NC}"
fi

# Instructions
echo ""
echo "======================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Start Apache from XAMPP Control Panel (if not already running)"
echo "2. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in $HTDOCS_DIR/.env"
echo "3. Access the API at: http://localhost/haven-space/api/"
echo "4. Access phpMyAdmin at: http://localhost/phpmyadmin"
echo ""
echo "For frontend development, run:"
echo "  npm run client:dev"
echo ""
echo -e "${YELLOW}Note: Make sure to update the Google OAuth redirect URI in Google Cloud Console:${NC}"
echo "  http://localhost/haven-space/api/auth/google/callback.php"
echo ""
