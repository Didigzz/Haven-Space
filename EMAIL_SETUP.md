# Email Setup Guide for Haven Space

This guide provides step-by-step instructions for setting up email functionality in the Haven Space application using PHPMailer.

## Prerequisites

Before you begin, ensure you have the following:

1. **SMTP Server Details**: You need access to an SMTP server to send emails. This could be:
   - A dedicated SMTP service (e.g., SendGrid, Mailgun, Amazon SES)
   - Your hosting provider's SMTP server
   - A Gmail account (for development purposes only)

2. **PHPMailer Library**: This is already installed in the project via Composer.

3. **Composer**: Ensure Composer is installed on your system for managing PHP dependencies.

## SMTP Server Options

### Option 1: Using a Dedicated SMTP Service

Recommended for production environments:

- **SendGrid**: [https://sendgrid.com/](https://sendgrid.com/)
- **Mailgun**: [https://www.mailgun.com/](https://www.mailgun.com/)
- **Amazon SES**: [https://aws.amazon.com/ses/](https://aws.amazon.com/ses/)
- **Postmark**: [https://postmarkapp.com/](https://postmarkapp.com/)

### Option 2: Using Your Hosting Provider's SMTP

Many hosting providers offer SMTP services. Check with your hosting provider for the SMTP details.

### Option 3: Using Gmail (for development only)

You can use a Gmail account for development purposes, but note that Google may block sign-in attempts from apps it considers less secure.

## Configuration Steps

### Step 1: Update Email Configuration

Edit the `haven-space/functions/config/email.php` file with your SMTP server details:

```php
<?php

/**
 * Email Configuration
 * SMTP settings for sending emails
 */

return [
    'smtp' => [
        'host' => 'smtp.example.com', // Replace with your SMTP server
        'username' => 'your_email@example.com', // Replace with your email
        'password' => 'your_password', // Replace with your email password
        'secure' => 'tls', // Use 'ssl' or 'tls'
        'port' => 587, // Use 465 for SSL, 587 for TLS
    ],
    'from' => [
        'email' => 'noreply@haven-space.com',
        'name' => 'Haven Space',
    ],
];
```

### Step 2: Configure SMTP Settings

Replace the placeholder values with your actual SMTP server details:

- **host**: Your SMTP server hostname (e.g., `smtp.gmail.com` for Gmail, `smtp.sendgrid.net` for SendGrid)
- **username**: Your SMTP username (usually your email address)
- **password**: Your SMTP password or API key
- **secure**: Encryption type (`ssl` or `tls`)
- **port**: SMTP port (465 for SSL, 587 for TLS)

#### Example Configurations

**Gmail (for development)**:
```php
'smtp' => [
    'host' => 'smtp.gmail.com',
    'username' => 'floresaybaez574@gmail.com',
    'password' => 'rzmz jpya upcd gpue', // Google App Password
    'secure' => 'tls',
    'port' => 587,
],
```

**Note**: The above configuration uses a Google App Password. To create an App Password:
1. Go to your Google Account settings
2. Navigate to Security > App Passwords
3. Select "Mail" as the app and "Other" as the device
4. Generate the password and use it in the configuration

**SendGrid**:
```php
'smtp' => [
    'host' => 'smtp.sendgrid.net',
    'username' => 'apikey',
    'password' => 'your-sendgrid-api-key',
    'secure' => 'tls',
    'port' => 587,
],
```

**Mailgun**:
```php
'smtp' => [
    'host' => 'smtp.mailgun.org',
    'username' => 'postmaster@your-domain.com',
    'password' => 'your-mailgun-password',
    'secure' => 'tls',
    'port' => 587,
],
```

### Step 3: Install Dependencies

Ensure all dependencies are installed by running:

```bash
composer install --working-dir functions
```

### Step 4: Test Email Functionality

#### Option 1: Using the Test Script

Run the provided test script to verify that the email functionality is working:

```bash
php test_email.php
```

If successful, you should see the message:
```
Test email has been sent successfully!
```

#### Option 2: Using API Endpoints

Test the email functionality by using the following endpoints:

1. **Forgot Password**: Send a POST request to `/auth/forgot-password` with a valid email address.
2. **Resend Reset Code**: Send a POST request to `/auth/resend-reset-code` with a valid email address.
3. **Register**: Create a new user account to test email verification.
4. **Resend Verification**: Send a POST request to `/auth/resend-verification` with a valid email address.

## Troubleshooting

### Common Issues and Solutions

1. **SMTP Connection Errors**:
   - Ensure your SMTP server details are correct.
   - Check if your server allows outbound connections on the SMTP port.
   - If using Gmail, ensure you have enabled "Less secure app access" or created an App Password.

2. **Authentication Errors**:
   - Double-check your SMTP username and password.
   - If using an API key (e.g., SendGrid), ensure it is correct and has the necessary permissions.

3. **Email Not Received**:
   - Check your spam folder.
   - Ensure the "from" email address is a valid email address on your domain.
   - Verify that your SMTP server is not blocking the emails.

4. **Firewall Issues**:
   - Ensure your server's firewall allows outbound connections on the SMTP port.
   - If using a cloud hosting provider, check their firewall rules.

### Debugging Tips

1. **Enable PHPMailer Debugging**:
   Add the following line before sending an email to enable debugging:
   ```php
   $mail->SMTPDebug = SMTP::DEBUG_SERVER;
   ```

2. **Check Error Logs**:
   Review the error logs for any email-related errors:
   ```bash
   tail -f /var/log/apache2/error.log
   # or
   tail -f /var/log/nginx/error.log
   ```

3. **Test SMTP Connection**:
   Use a tool like `telnet` or `openssl` to test the SMTP connection:
   ```bash
   telnet smtp.example.com 587
   # or
   openssl s_client -connect smtp.example.com:465 -crlf
   ```

## Security Considerations

1. **SMTP Credentials**:
   - Never commit your SMTP credentials to version control.
   - Use environment variables or a secure configuration file to store sensitive information.

2. **Email Content**:
   - Ensure email content is properly sanitized to prevent XSS attacks.
   - Use HTTPS links in your emails to prevent man-in-the-middle attacks.

3. **Rate Limiting**:
   - Implement rate limiting to prevent abuse of the email functionality.
   - Monitor email sending to detect and prevent spam.

## Best Practices

1. **Email Templates**:
   - Use consistent email templates for a professional appearance.
   - Include your brand logo and colors in the email design.

2. **Email Delivery**:
   - Monitor email delivery rates and bounce rates.
   - Implement SPF, DKIM, and DMARC records to improve email deliverability.

3. **User Experience**:
   - Provide clear instructions in your emails.
   - Include a link to your website or support page in the email footer.

## Additional Resources

- **PHPMailer Documentation**: [https://github.com/PHPMailer/PHPMailer](https://github.com/PHPMailer/PHPMailer)
- **SendGrid Documentation**: [https://sendgrid.com/docs/](https://sendgrid.com/docs/)
- **Mailgun Documentation**: [https://documentation.mailgun.com/](https://documentation.mailgun.com/)
- **Amazon SES Documentation**: [https://docs.aws.amazon.com/ses/](https://docs.aws.amazon.com/ses/)

## Support

If you encounter any issues or have questions, please contact the Haven Space support team or open an issue on the project repository.