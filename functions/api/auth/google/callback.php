<?php
/**
 * Google OAuth Callback Endpoint
 *
 * Handles the callback from Google after user authentication.
 * - Validates state parameter (CSRF protection)
 * - Exchanges authorization code for tokens
 * - Fetches user profile from Google
 * - Creates or updates user account
 * - Generates JWT tokens
 * - Redirects to appropriate dashboard
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\GoogleOAuth;
use App\Core\Auth\JWT;
use App\Core\Database\Connection;

/**
 * Determine boarder status based on applications
 *
 * @param \PDO $pdo Database connection
 * @param int $boarderId Boarder user ID
 * @return string Boarder status
 */
function determineBoarderStatus($pdo, $boarderId) {
    // Check for accepted applications
    $acceptedStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
    $acceptedStmt->execute([$boarderId, 'accepted']);
    $acceptedCount = $acceptedStmt->fetchColumn();

    if ($acceptedCount > 0) {
        return 'accepted';
    }

    // Check for pending applications
    $pendingStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
    $pendingStmt->execute([$boarderId, 'pending']);
    $pendingCount = $pendingStmt->fetchColumn();

    if ($pendingCount > 0) {
        return 'applied_pending';
    }

    // Check for any applications (rejected/cancelled)
    $anyStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND deleted_at IS NULL');
    $anyStmt->execute([$boarderId]);
    $anyCount = $anyStmt->fetchColumn();

    if ($anyCount > 0) {
        // Has applications but none are pending or accepted (likely rejected)
        return 'rejected';
    }

    // No applications at all
    return 'new';
}

// Dynamically determine the base URL for redirects
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$port = $_SERVER['SERVER_PORT'] ?? '80';

// Detect server environment
$isBuiltInServer = ($port === '8000');

// Load APP_BASE_URL from environment if available
$config = require __DIR__ . '/../../../config/app.php';
$appBaseUrl = $config['app_base_url'] ?? null;

if ($appBaseUrl) {
    // Use configured base URL from .env
    $baseUrl = rtrim($appBaseUrl, '/');
} else if ($isBuiltInServer) {
    // PHP built-in server on port 8000 serves both API and frontend via router.php
    $cleanHost = strpos($host, ':') !== false ? explode(':', $host)[0] : $host;
    $baseUrl = $protocol . '://' . $cleanHost . ':8000';
} else {
    // Apache or other servers - use current host
    $cleanHost = $host;
    if (strpos($host, ':') !== false) {
        $parts = explode(':', $host);
        $portNum = $parts[1];
        if (($protocol === 'http' && $portNum !== '80') ||
            ($protocol === 'https' && $portNum !== '443')) {
            $cleanHost = $host;
        } else {
            $cleanHost = $parts[0];
        }
    }
    $baseUrl = $protocol . '://' . $cleanHost;
}

// Helper function to build redirect URLs
function buildRedirectUrl($baseUrl, $path)
{
    if (strpos($path, '/') !== 0) {
        $path = '/' . $path;
    }
    return $baseUrl . $path;
}

// Check for OAuth error from Google
if (isset($_GET['error'])) {
    $errorMessage = $_GET['error_description'] ?? $_GET['error'] ?? 'Google authentication failed';
    error_log('Google OAuth error: ' . $errorMessage);

    $redirectUrl = buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . urlencode($errorMessage));
    header('Location: ' . $redirectUrl);
    exit;
}

// Verify authorization code is present
$code = $_GET['code'] ?? null;
if (!$code) {
    error_log('Google OAuth callback: No authorization code received');
    header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=No%20authorization%20code%20received'));
    exit;
}

// Verify state parameter (CSRF protection)
$state = $_GET['state'] ?? null;
$storedState = $_SESSION['oauth_state'] ?? null;

if (!$state || !$storedState || $state !== $storedState) {
    error_log('Google OAuth callback: Invalid state parameter');
    header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=Invalid%20state%20parameter'));
    exit;
}

// Clear used state
unset($_SESSION['oauth_state']);

// Get action and role preference from session
$action = $_SESSION['oauth_action'] ?? 'login';
$rolePreference = $_SESSION['oauth_role_preference'] ?? null;

try {
    // Exchange authorization code for tokens
    $tokenData = GoogleOAuth::exchangeCodeForToken($code);

    $accessToken = $tokenData['access_token'];
    $refreshToken = $tokenData['refresh_token'] ?? null;

    // Fetch user profile from Google
    $googleUser = GoogleOAuth::getUserInfo($accessToken);

    $googleId = $googleUser['sub'] ?? null;
    $email = $googleUser['email'] ?? null;
    $firstName = $googleUser['given_name'] ?? '';
    $lastName = $googleUser['family_name'] ?? '';
    $avatarUrl = $googleUser['picture'] ?? null;
    $emailVerified = $googleUser['email_verified'] ?? false;

    if (!$googleId || !$email) {
        throw new \Exception('Invalid user data from Google');
    }

    // Connect to database
    $pdo = Connection::getInstance()->getPdo();

    // Check if user exists by Google ID
    $stmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name, u.email,
               ur.role_name as role, u.is_verified, acs.status_name as account_status
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.google_id = ? AND u.deleted_at IS NULL
    ');
    $stmt->execute([$googleId]);
    $user = $stmt->fetch();

    if (!$user) {
        $stmt = $pdo->prepare('
            SELECT u.id, u.first_name, u.last_name, u.email,
                   ur.role_name as role, u.password_hash, u.is_verified, acs.status_name as account_status
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            JOIN account_statuses acs ON u.account_status_id = acs.id
            WHERE u.email = ? AND u.deleted_at IS NULL
        ');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // Link Google account to existing user
            $avatarFileId = null;
            if ($avatarUrl) {
                $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', $user['id']]);
                $avatarFileId = $pdo->lastInsertId();
            }

            $stmt = $pdo->prepare('UPDATE users SET google_id = ?, google_token = ?, google_refresh_token = ?, avatar_file_id = ?, is_verified = ? WHERE id = ?');
            $stmt->execute([$googleId, $accessToken, $refreshToken, $avatarFileId, $emailVerified ? true : $user['is_verified'], $user['id']]);

            $userId = $user['id'];
            $userRole = $user['role'];
        } else {
            // New user - need to choose role
            if (!$rolePreference) {
                $pendingToken = bin2hex(random_bytes(32));
                $expiresAt = gmdate('Y-m-d H:i:s', time() + 600);

                $pdo->exec("DELETE FROM oauth_pending_registrations WHERE expires_at < UTC_TIMESTAMP()");

                $pendingStmt = $pdo->prepare(
                    'INSERT INTO oauth_pending_registrations
                    (token, google_id, email, first_name, last_name, access_token, refresh_token, email_verified, came_from_login, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $pendingStmt->execute([
                    $pendingToken,
                    $googleId,
                    $email,
                    $firstName,
                    $lastName,
                    $accessToken,
                    $refreshToken,
                    $emailVerified ? 1 : 0,
                    $action === 'login' ? 1 : 0,
                    $expiresAt,
                ]);

                header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/choose.html?oauth=google&token=' . $pendingToken));
                exit;
            }

            // Create new user account
            $stmt = $pdo->prepare('SELECT id FROM user_roles WHERE role_name = ?');
            $stmt->execute([$rolePreference]);
            $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC);
            $roleId = $roleRow ? $roleRow['id'] : 1;

            $accountStatusName = ($rolePreference === 'landlord') ? 'pending_verification' : 'active';

            $stmt = $pdo->prepare('SELECT id FROM account_statuses WHERE status_name = ?');
            $stmt->execute([$accountStatusName]);
            $statusRow = $stmt->fetch(\PDO::FETCH_ASSOC);
            $accountStatusId = $statusRow ? $statusRow['id'] : 1;

            $avatarFileId = null;
            if ($avatarUrl) {
                $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', 1]);
                $avatarFileId = $pdo->lastInsertId();
            }

            $stmt = $pdo->prepare('
                INSERT INTO users (first_name, last_name, email, google_id, google_token, google_refresh_token, avatar_file_id, role_id, is_verified, account_status_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([
                $firstName,
                $lastName,
                $email,
                $googleId,
                $accessToken,
                $refreshToken,
                $avatarFileId,
                $roleId,
                $emailVerified ? 1 : 0,
                $accountStatusId
            ]);

            $userId = $pdo->lastInsertId();

            if ($avatarFileId) {
                $stmt = $pdo->prepare('UPDATE files SET uploaded_by = ? WHERE id = ?');
                $stmt->execute([$userId, $avatarFileId]);
            }

            if ($rolePreference === 'landlord') {
                $stmt = $pdo->prepare('
                    INSERT INTO landlord_profiles
                    (user_id, boarding_house_name, boarding_house_description, property_type, total_rooms, available_rooms)
                    VALUES (?, ?, ?, ?, ?, ?)
                ');
                $stmt->execute([$userId, 'My Boarding House', 'Boarding house managed via Haven Space', 'Single unit', 1, 1]);
            }

            $userRole = $rolePreference;
        }
    } else {
        // Existing user
        $avatarFileId = null;
        if ($avatarUrl) {
            $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', $user['id']]);
            $avatarFileId = $pdo->lastInsertId();
        }

        $stmt = $pdo->prepare('UPDATE users SET google_token = ?, google_refresh_token = ?, avatar_file_id = ?, first_name = ?, last_name = ? WHERE id = ?');
        $stmt->execute([$accessToken, $refreshToken, $avatarFileId, $firstName, $lastName, $user['id']]);

        $userId = $user['id'];
        $userRole = $user['role'];
    }

    $stmtVerified = $pdo->prepare('
        SELECT u.is_verified, acs.status_name as account_status
        FROM users u
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.id = ?
    ');
    $stmtVerified->execute([$userId]);
    $verifiedRow = $stmtVerified->fetch();
    $isVerified = $verifiedRow ? (bool) $verifiedRow['is_verified'] : false;
    $accountStatus = $verifiedRow['account_status'] ?? 'active';

    $verificationStatus = null;
    if ($userRole === 'landlord') {
        $verificationStatus = $isVerified ? 'approved' : 'pending';
    }

    if ($accountStatus !== 'active' && !($accountStatus === 'pending_verification' && $userRole === 'landlord')) {
        header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . urlencode('Your account is not active.')));
        exit;
    }

    // Generate tokens
    $payload = [
        'user_id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
        'is_verified' => $isVerified,
        'account_status' => $accountStatus,
        'verification_status' => $verificationStatus,
        'google_id' => $googleId,
    ];

    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

    JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);

    $_SESSION['user'] = [
        'id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
    ];

    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);

    if ($userRole === 'admin') {
        $redirectPath = '/views/admin/index.html';
    } else if ($userRole === 'landlord') {
        $redirectPath = '/views/landlord/index.html';
    } else {
        $boarderStatus = determineBoarderStatus($pdo, $userId);
        $payload['boarder_status'] = $boarderStatus;
        $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
        $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);
        JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);

        switch ($boarderStatus) {
            case 'new':
            case 'browsing':
                $redirectPath = '/views/boarder/find-a-room/index.html';
                break;
            case 'applied_pending':
            case 'rejected':
                $redirectPath = '/views/boarder/applications-dashboard/index.html';
                break;
            case 'pending_confirmation':
                $redirectPath = '/views/boarder/confirm-booking/index.html';
                break;
            case 'accepted':
            default:
                $redirectPath = '/views/boarder/index.html';
                break;
        }
    }

    $finalRedirectUrl = buildRedirectUrl($baseUrl, $redirectPath);

    $userData = [
        'id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
        'access_token' => $jwtAccessToken,
        'refresh_token' => $jwtRefreshToken,
    ];

    if (isset($boarderStatus)) {
        $userData['boarder_status'] = $boarderStatus;
        $userData['boarderStatus'] = $boarderStatus;
    }

    $finalRedirectUrl .= '#auth=' . urlencode(json_encode($userData));
    header('Location: ' . $finalRedirectUrl);
    exit;

} catch (\Exception $e) {
    error_log('Google OAuth callback error: ' . $e->getMessage());
    header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . urlencode('Google authentication failed.')));
    exit;
}
