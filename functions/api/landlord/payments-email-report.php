<?php

/**
 * Landlord Payment Email Report API
 * POST /api/landlord/payments/email-report
 * 
 * Sends payment statement report via email
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

try {
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        json_response(400, ['error' => 'Invalid request body']);
    }

    // Validate required fields
    $recipient = $input['recipient'] ?? null;
    $subject = $input['subject'] ?? 'Payment Statement Report';
    $message = $input['message'] ?? '';
    $summary = $input['summary'] ?? [];
    $payments = $input['payments'] ?? [];

    if (!$recipient) {
        json_response(400, ['error' => 'Recipient email is required']);
    }

    // Validate email format
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        json_response(400, ['error' => 'Invalid email address']);
    }

    // Get landlord info
    $db = Connection::getInstance()->getPdo();
    $stmt = $db->prepare("
        SELECT first_name, last_name, email 
        FROM users 
        WHERE id = :landlord_id
    ");
    $stmt->execute(['landlord_id' => $landlordId]);
    $landlord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$landlord) {
        json_response(404, ['error' => 'Landlord not found']);
    }

    $landlordName = "{$landlord['first_name']} {$landlord['last_name']}";

    // Build email HTML
    $emailHtml = buildEmailHtml([
        'landlordName' => $landlordName,
        'recipient' => $recipient,
        'subject' => $subject,
        'customMessage' => $message,
        'reportType' => $input['reportType'] ?? 'all',
        'timeRange' => $input['timeRange'] ?? 'monthly',
        'summary' => $summary,
        'payments' => $payments,
    ]);

    // Send email using PHP mail() or your email service
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=utf-8',
        'From: Haven Space <noreply@havenspace.com>',
        'Reply-To: ' . $landlord['email'],
        'X-Mailer: PHP/' . phpversion(),
    ];

    $success = mail(
        $recipient,
        $subject,
        $emailHtml,
        implode("\r\n", $headers)
    );

    if (!$success) {
        error_log('Failed to send email to: ' . $recipient);
        json_response(500, ['error' => 'Failed to send email. Please try again later.']);
    }

    // Log the email send
    $stmt = $db->prepare("
        INSERT INTO activity_logs (user_id, action, description, created_at)
        VALUES (:user_id, 'email_report', :description, NOW())
    ");
    $stmt->execute([
        'user_id' => $landlordId,
        'description' => "Sent payment report to {$recipient}",
    ]);

    json_response(200, [
        'message' => 'Email sent successfully',
        'recipient' => $recipient,
    ]);

} catch (Exception $e) {
    error_log('Error sending email report: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to send email report']);
}

/**
 * Build HTML email template
 * 
 * @param array $data
 * @return string
 */
function buildEmailHtml(array $data): string
{
    $landlordName = htmlspecialchars($data['landlordName']);
    $customMessage = htmlspecialchars($data['customMessage']);
    $reportType = htmlspecialchars($data['reportType']);
    $timeRange = htmlspecialchars($data['timeRange']);
    $summary = $data['summary'];
    $payments = $data['payments'];

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Statement Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .message {
            background-color: #f9f9f9;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 4px;
        }
        .summary {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        .summary h2 {
            margin-top: 0;
            color: #4CAF50;
            font-size: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        .summary-item {
            background-color: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        .summary-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 24px;
            font-weight: 600;
            color: #333;
        }
        .summary-value.green {
            color: #4CAF50;
        }
        .summary-value.orange {
            color: #ff9800;
        }
        .summary-value.red {
            color: #f44336;
        }
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background-color: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
        }
        tr:hover {
            background-color: #f9f9f9;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-paid {
            background-color: #e8f5e9;
            color: #4CAF50;
        }
        .status-pending {
            background-color: #fff3e0;
            color: #ff9800;
        }
        .status-overdue {
            background-color: #ffebee;
            color: #f44336;
        }
        .footer {
            background-color: #f5f5f5;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .footer a {
            color: #4CAF50;
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .summary-grid {
                grid-template-columns: 1fr;
            }
            table {
                font-size: 12px;
            }
            th, td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Haven Space</h1>
            <p>Payment Statement Report</p>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>This is your payment statement report from <strong>{$landlordName}</strong>.</p>
HTML;

    if ($customMessage) {
        $html .= <<<HTML
            
            <div class="message">
                <p style="margin: 0;"><strong>Message:</strong></p>
                <p style="margin: 10px 0 0 0;">{$customMessage}</p>
            </div>
HTML;
    }

    $html .= <<<HTML
            
            <div class="summary">
                <h2>Summary Statistics</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">Total Payments</div>
                        <div class="summary-value">{$summary['totalCount']}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Amount</div>
                        <div class="summary-value">₱{$summary['totalAmount']}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Paid</div>
                        <div class="summary-value green">{$summary['paidCount']} (₱{$summary['paidAmount']})</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Pending</div>
                        <div class="summary-value orange">{$summary['pendingCount']} (₱{$summary['pendingAmount']})</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Overdue</div>
                        <div class="summary-value red">{$summary['overdueCount']} (₱{$summary['overdueAmount']})</div>
                    </div>
                </div>
            </div>
            
            <h3>Payment Details</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Property</th>
                            <th>Room</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
HTML;

    foreach ($payments as $payment) {
        $tenant = htmlspecialchars($payment['tenant']);
        $property = htmlspecialchars($payment['property']);
        $room = htmlspecialchars($payment['room']);
        $amount = number_format($payment['amount'], 2);
        $dueDate = date('M d, Y', strtotime($payment['dueDate']));
        $status = ucfirst($payment['status']);
        $statusClass = 'status-' . $payment['status'];

        $html .= <<<HTML
                        <tr>
                            <td>{$tenant}</td>
                            <td>{$property}</td>
                            <td>{$room}</td>
                            <td>₱{$amount}</td>
                            <td>{$dueDate}</td>
                            <td><span class="status-badge {$statusClass}">{$status}</span></td>
                        </tr>
HTML;
    }

    $generatedDate = date('F d, Y \a\t g:i A');

    $html .= <<<HTML
                    </tbody>
                </table>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
                <strong>Report Generated:</strong> {$generatedDate}
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated email from Haven Space.</p>
            <p>© 2026 Haven Space. All rights reserved.</p>
            <p><a href="https://havenspace.com">Visit our website</a></p>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}
