# Haven Space — Setup Manual

## Prerequisites

Make sure the following are installed on your machine before proceeding.

| Requirement  | Version       | Notes                                             |
| ------------ | ------------- | ------------------------------------------------- |
| **Node.js**  | v18 or higher | Required for Bun and build scripts                |
| **Bun**      | Latest        | Used for package management and running scripts   |
| **PHP**      | 8.3 or higher | Required for the backend API server               |
| **XAMPP**    | Latest        | Provides Apache (web server) and MySQL (database) |
| **Composer** | Latest        | PHP dependency manager                            |

### Install Links

- Node.js: https://nodejs.org
- Bun: https://bun.sh
- PHP 8.3+: https://www.php.net/downloads (or bundled with XAMPP)
- XAMPP: https://www.apachefriends.org
- Composer: https://getcomposer.org

> **Note:** XAMPP bundles PHP, Apache, and MySQL together. If you install XAMPP, make sure the PHP version it includes is 8.3 or higher. You can verify with `php -v` in your terminal.

---

## Step 1 — Start Apache and MySQL in XAMPP

Before running any setup commands, you need MySQL running so the database can be created.

1. Open the **XAMPP Control Panel**
2. Click **Start** next to **Apache**
3. Click **Start** next to **MySQL**

Both services should show a green status. Keep the XAMPP Control Panel open.

---

## Step 2 — Install JavaScript Dependencies

In the project root, run:

```bash
bun install
```

This installs all frontend and tooling dependencies listed in `package.json`.

---

## Step 3 — Install PHP Backend Dependencies

Install the main backend dependencies:

```bash
composer install --working-dir functions
```

---

## Step 4 — Configure Environment Variables

Copy the example environment file and fill in your local values:

```bash
cp functions/.env.example functions/.env
```

Open `functions/.env` and set your database credentials. The defaults match a standard XAMPP install:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=havenspace_db
DB_USER=root
DB_PASS=
```

> If you set a MySQL root password in XAMPP, update `DB_PASS` accordingly.

---

## Step 5 — Set Up the Database

Run the database setup script. This creates the database, imports the schema, and runs all migrations automatically:

```bash
bun run db:setup
```

You should see a series of success messages ending with **"Setup Complete!"**. If you see a connection error, double-check that MySQL is running in XAMPP and your `.env` credentials are correct.

---

## Step 6 — Run the Application

The app requires **two processes running at the same time** — the PHP API server and the Apache web server. Open two separate terminals.

### Terminal 1 — PHP API Server

```bash
bun run server
```

This starts the PHP development server at `http://localhost:8000`. Keep this terminal open.

### Terminal 2 — Apache Web Server

```bash
bun run apache:start
```

This starts Apache via XAMPP and automatically opens the app in your browser at `http://localhost/views/public/index.html`.

> If the browser opens before the API server is ready, you'll see a warning in the terminal. Make sure Terminal 1 is running first.

---

## Verification

Once both processes are running:

- Frontend: `http://localhost`
- API: `http://localhost:8000`

The `apache:start` script will warn you if the API server is not detected on port 8000. If you see that warning, check that Terminal 1 is still running.

---

## Common Issues

**MySQL connection refused during `db:setup`**
→ Make sure MySQL is started in the XAMPP Control Panel.

**`php` command not found**
→ Add XAMPP's PHP to your system PATH. On Windows, add `C:\xampp\php` to your environment variables.

**`composer` command not found**
→ Make sure Composer is installed globally and available in your PATH.

**Port 8000 already in use**
→ Another process is using that port. Stop it or change the port in `package.json` under the `server` script.

**Port 80 already in use**
→ Another web server (IIS, another Apache instance) may be running. Stop it or change Apache's port in the XAMPP Control Panel.

---

## Useful Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `bun run server`       | Start the PHP API server on port 8000          |
| `bun run apache:start` | Start Apache and open the browser              |
| `bun run db:setup`     | Create database, import schema, run migrations |
| `bun run db:reset`     | Reset the database (destructive)               |
| `bun run format`       | Format all files with Prettier                 |
| `bun run lint`         | Lint frontend JavaScript                       |
| `bun run build`        | Build the deployable frontend                  |
