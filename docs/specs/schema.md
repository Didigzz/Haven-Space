# Haven Space Database Schema Documentation

## Overview

This document provides a comprehensive overview of the Haven Space database schema, which supports a boarding house platform connecting landlords with boarders. The system manages user accounts, property listings, room availability, rental applications, payments, messaging, and announcements.

---

## Core Tables

### Users Table

The `users` table serves as the central authentication and identity management table for all platform users. It stores essential user information including first name, last name, email, phone number, and hashed password credentials. The table uses a role-based system with three distinct user types: landlord, boarder, and admin, with a default role of 'boarder'. User accounts can have one of three statuses: active, inactive, or suspended, defaulting to 'active' upon creation. The table also includes an optional avatar URL field for profile pictures and timestamp fields for tracking account creation and updates. This table plays a critical role in the system by providing the foundation for authentication, authorization, and user-specific functionality across the entire platform.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `first_name` (varchar 100, NOT NULL)
- `last_name` (varchar 100, NOT NULL)
- `email` (varchar 255, NOT NULL, UNIQUE)
- `phone` (varchar 20, NOT NULL)
- `password` (varchar 255, NOT NULL)
- `role` (enum: 'landlord', 'boarder', 'admin', DEFAULT 'boarder')
- `status` (enum: 'active', 'inactive', 'suspended', DEFAULT 'active')
- `avatar_url` (varchar 500, NULL)
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Rooms Table

The `rooms` table manages individual room listings within properties on the Haven Space platform. It stores detailed room information including the associated property ID, an optional room number for identification, a descriptive title, comprehensive description text, pricing information with support for two decimal places, and a required deposit amount defaulting to 0.00. Each room has a capacity field indicating the maximum number of occupants (defaulting to 1) and a status field with three possible values: available, occupied, or maintenance, with 'available' as the default state. The table includes standard timestamp fields for tracking when rooms are created and last updated. This table is essential to the system as it represents the core inventory of rentable spaces, enabling landlords to list their offerings and boarders to search for and apply to suitable accommodations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `property_id` (int, NOT NULL, FOREIGN KEY)
- `room_number` (varchar 50, NULL)
- `title` (varchar 255, NOT NULL)
- `description` (text, NOT NULL)
- `price` (decimal 10,2, NOT NULL)
- `deposit` (decimal 10,2, DEFAULT 0.00)
- `capacity` (int, DEFAULT 1)
- `status` (enum: 'available', 'occupied', 'maintenance', DEFAULT 'available')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Property Table

The `property` table manages property listings owned by landlords on the Haven Space platform. It stores the landlord's user ID as a foreign key to establish ownership, along with comprehensive property details including title, description, full address, and city location. Each property has a status field with three possible states: available, occupied, or hidden, defaulting to 'available' to indicate the property is actively listed. The table also includes a gender preference field with options for male, female, or any, defaulting to 'any' to accommodate diverse tenant preferences. Standard timestamp fields track when properties are created and last updated. This table serves as the foundation for the property management system, linking landlords to their listings and providing the organizational structure for associated rooms, enabling the platform to facilitate property discovery and rental management.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `title` (varchar 255, NOT NULL)
- `description` (text, NOT NULL)
- `address` (varchar 500, NOT NULL)
- `city` (varchar 100, NOT NULL)
- `status` (enum: 'available', 'occupied', 'hidden', DEFAULT 'available')
- `gender_pref` (enum: 'male', 'female', 'any', DEFAULT 'any')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Payments Table

The `payments` table tracks all financial transactions between boarders and landlords within the Haven Space platform. It maintains comprehensive payment records by storing foreign key references to the boarder, landlord, room, and property involved in each transaction, along with the payment amount stored as a decimal value with two decimal places. The table includes a due date field to track when payments are expected and an optional paid date field that is populated when payment is received. Payment status is managed through an enum field with four possible states: pending, paid, overdue, or cancelled, defaulting to 'pending' for new payment records. Additional fields capture the payment method used (varchar 50), a reference number for transaction tracking (varchar 100), and optional notes (text) for any additional payment-related information. Standard timestamp fields record when payment records are created and last updated. This table plays a crucial role in the system by providing a complete audit trail of all financial transactions, enabling landlords to track rental income and boarders to manage their payment obligations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `boarder_id` (int, NOT NULL, FOREIGN KEY to users)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `room_id` (int, NOT NULL, FOREIGN KEY to rooms)
- `property_id` (int, NOT NULL, FOREIGN KEY to property)
- `amount` (decimal 10,2, NOT NULL)
- `due_date` (date, NOT NULL)
- `paid_date` (date, NULL)
- `status` (enum: 'pending', 'paid', 'overdue', 'cancelled', DEFAULT 'pending')
- `payment_method` (varchar 50, NOT NULL)
- `reference_number` (varchar 100, NOT NULL)
- `notes` (text, DEFAULT '')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Messages Table

The `messages` table facilitates direct communication between users on the Haven Space platform. It stores message records with sender and receiver user IDs as foreign keys to establish the communication channel, along with the message body stored as text to accommodate messages of varying lengths. The table includes a read status indicator using a tinyint field (defaulting to 0 for unread) to help users track which messages they have viewed. A single timestamp field records when each message was created, providing a chronological record of conversations. This table serves as the backbone of the platform's messaging system, enabling landlords and boarders to communicate directly about property inquiries, application details, payment arrangements, and other rental-related matters, fostering transparent and efficient interactions between users.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `sender_id` (int, NOT NULL, FOREIGN KEY to users)
- `receiver_id` (int, NOT NULL, FOREIGN KEY to users)
- `body` (text, NOT NULL)
- `is_read` (tinyint 1, DEFAULT 0)
- `created_at` (timestamp, DEFAULT current_timestamp)

---

### Application Table

The `application` table manages rental applications submitted by boarders for specific rooms within the Haven Space platform. It maintains comprehensive application records by storing foreign key references to the boarder, landlord, room, and property involved in each application, along with a text field containing the application message or details. The table tracks application lifecycle through a status field with five possible states: pending, accepted, rejected, cancelled, or sending, with 'pending' as the default for new applications. Standard timestamp fields record when applications are created and last updated, providing a complete audit trail of the application process. This table plays a pivotal role in the system by facilitating the rental application workflow, enabling boarders to express interest in available rooms and landlords to review, accept, or reject applications, ultimately connecting tenants with suitable accommodations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `boarder_id` (int, NOT NULL, FOREIGN KEY to users)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `room_id` (int, NOT NULL, FOREIGN KEY to rooms)
- `property_id` (int, NOT NULL, FOREIGN KEY to property)
- `message` (text, NOT NULL)
- `status` (enum: 'pending', 'accepted', 'rejected', 'cancelled', 'sending', DEFAULT 'pending')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Announcement Table

The `announcement` table enables landlords to broadcast important information and updates to their tenants within the Haven Space platform. It stores the landlord's user ID as a foreign key to identify the announcement creator, along with an optional property ID foreign key that can be NULL to support both property-specific announcements and general broadcasts to all properties. Each announcement includes a title (varchar 255), body text for the detailed message content, and a category field with four classification options: general, maintenance, urgent, or reminder, defaulting to 'general'. The table also includes a priority field with three levels: low, medium, or high, defaulting to 'medium' to help users identify the importance of each announcement. Standard timestamp fields track when announcements are created and last updated. This table serves as a critical communication tool in the system, allowing landlords to efficiently disseminate information about property maintenance, policy changes, community events, and urgent matters to their boarders, fostering transparent and timely communication within the rental community.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `property_id` (int, NULL, FOREIGN KEY to property) - NULL = broadcast to all properties
- `title` (varchar 255, NOT NULL)
- `body` (text, NOT NULL)
- `category` (enum: 'general', 'maintenance', 'urgent', 'reminder', DEFAULT 'general')
- `priority` (enum: 'low', 'medium', 'high', DEFAULT 'medium')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

## Relationships

### User Relationships

- **Users → Property**: One-to-Many (A landlord can own multiple properties)
- **Users → Application**: One-to-Many (A boarder can submit multiple applications; a landlord receives multiple applications)
- **Users → Payments**: One-to-Many (A boarder makes multiple payments; a landlord receives multiple payments)
- **Users → Messages**: One-to-Many (A user can send and receive multiple messages)
- **Users → Announcement**: One-to-Many (A landlord can create multiple announcements)

### Property Relationships

- **Property → Rooms**: One-to-Many (A property contains multiple rooms)
- **Property → Application**: One-to-Many (A property can have multiple applications)
- **Property → Payments**: One-to-Many (A property generates multiple payment records)
- **Property → Announcement**: One-to-Many (A property can have multiple announcements)

### Room Relationships

- **Rooms → Application**: One-to-Many (A room can have multiple applications)
- **Rooms → Payments**: One-to-Many (A room generates multiple payment records)

### Application Relationships

- **Application → Payments**: One-to-Many (An accepted application can generate multiple payment records)

---

## Database Design Principles

1. **Normalization**: The schema follows database normalization principles to minimize data redundancy and maintain data integrity.

2. **Foreign Key Constraints**: All relationships are enforced through foreign key constraints to ensure referential integrity.

3. **Enum Types**: Status and category fields use enum types to restrict values to predefined options, ensuring data consistency.

4. **Timestamps**: All tables include `created_at` and `updated_at` (where applicable) fields for audit trails and tracking changes.

5. **Default Values**: Appropriate default values are set for status fields and other columns to ensure data consistency.

6. **Flexible Design**: The schema supports various business scenarios, such as property-specific or broadcast announcements, and multiple payment methods.

---

## Notes

- All monetary values use `decimal(10,2)` to ensure precision in financial calculations.
- The `property_id` in the `announcement` table is nullable to support both targeted and broadcast announcements.
- User roles (landlord, boarder, admin) determine access levels and available features within the platform.
- The messaging system supports bidirectional communication between any users on the platform.
- Payment tracking includes both due dates and paid dates to support overdue payment identification.
