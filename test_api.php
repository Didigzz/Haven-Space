<?php
$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyLCJmaXJzdF9uYW1lIjoiUGFsbWFyZXMiLCJsYXN0X25hbWUiOiJNZWx2aXMiLCJlbWFpbCI6InF3ZW56eTIzMDYyQGdtYWlsLmNvbSIsInJvbGUiOiJsYW5kbG9yZCIsImlzX3ZlcmlmaWVkIjpmYWxzZSwiYWNjb3VudF9zdGF0dXMiOiJwZW5kaW5nX3ZlcmlmaWNhdGlvbiIsInZlcmlmaWNhdGlvbl9zdGF0dXMiOm51bGwsImlhdCI6MTc3NzYwMzQ0MiwiZXhwIjoxNzc3NjA3MDQyfQ.S5_wzYl3qhp4KlgsaAMHdko0nECwy2B29wGheJJpEm8';

$endpoints = [
    'dashboard-stats' => 'http://localhost:8000/api/landlord/dashboard-stats.php',
    'activity'        => 'http://localhost:8000/api/landlord/activity.php',
    'payments'        => 'http://localhost:8000/api/landlord/payments.php',
    'payment-summary' => 'http://localhost:8000/api/landlord/payment-summary.php',
    'verification'    => 'http://localhost:8000/auth/verification-status.php',
    'documents'       => 'http://localhost:8000/api/landlord/documents',
];

foreach ($endpoints as $name => $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $token"]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "[$name] HTTP $code: " . substr($body, 0, 300) . "\n\n";
}
