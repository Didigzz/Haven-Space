<?php

namespace App\Core\Database;

use PDO;

/**
 * Database Manager
 * 
 * Handles database connections
 * - Uses MySQL via PDO
 */
class DatabaseManager
{
    private static $mysqlConnection = null;
    private static $unifiedAdapter = null;

    /**
     * Get MySQL connection
     * @return PDO
     */
    public static function getMySQLConnection(): PDO
    {
        if (self::$mysqlConnection === null) {
            require_once __DIR__ . '/../../../config/app.php';
            
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', 3306);
            $database = env('DB_NAME', 'havenspace_db');
            $username = env('DB_USER', 'root');
            $password = env('DB_PASS', '');
            $charset = 'utf8mb4';
            
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            self::$mysqlConnection = new PDO($dsn, $username, $password, $options);
        }
        
        return self::$mysqlConnection;
    }

    /**
     * Get unified database adapter
     * @return DatabaseInterface
     */
    public static function getAdapter(): DatabaseInterface
    {
        if (self::$unifiedAdapter === null) {
            $mysqlPdo = self::getMySQLConnection();
            self::$unifiedAdapter = new MySQLAdapter($mysqlPdo);
        }
        
        return self::$unifiedAdapter;
    }

    /**
     * Get primary database connection
     * @return PDO
     */
    public static function getPrimaryConnection()
    {
        return self::getMySQLConnection();
    }

    /**
     * Get database type
     * @return string 'mysql'
     */
    public static function getDatabaseType(): string
    {
        return 'mysql';
    }

    /**
     * Check if we're in production environment
     * @return bool
     */
    public static function isProduction(): bool
    {
        require_once __DIR__ . '/../../../config/app.php';
        return env('APP_ENV', 'local') === 'production';
    }
}