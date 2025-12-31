# Import Headers Reference

This document lists all required and optional header titles for each import type in the Cascade Connect data import system.

## Claims

### Required Headers
- `title` - Claim title/name
- `description` - Detailed description of the claim
- `category` - Category of the claim (e.g., "Plumbing", "Electrical", "General")
- `homeownerEmail` - Email address of the homeowner associated with the claim
- `address` - Property address for the claim

### Optional Headers
- `homeownerName` - Name of the homeowner (defaults to "Unknown Homeowner" if not provided)
- `status` - Claim status (must match ClaimStatus enum values, defaults to "SUBMITTED")
- `dateSubmitted` - Date the claim was submitted (ISO date string, defaults to current date)

### Example CSV Row
```csv
title,description,category,homeownerEmail,address,homeownerName,status,dateSubmitted
Kitchen Sink Leak,Water pooling on floor near sink,Plumbing,homeowner@example.com,123 Main St,John Doe,SUBMITTED,2024-01-15
```

---

## Homeowners

### Required Headers
- `name` - Full name of the homeowner
- `email` - Email address
- `phone` - Phone number
- `street` - Street address
- `city` - City
- `state` - State abbreviation
- `zip` - ZIP code
- `jobName` - Project/job name
- `builder` - Builder name (will create builder group if it doesn't exist)
- `closingDate` - Closing date (ISO date string)

### Notes
- The `address` field is automatically generated from `street`, `city`, `state`, and `zip`
- If `phone` is not provided, it defaults to an empty string
- Builder names are case-insensitive when matching existing builder groups

### Example CSV Row
```csv
name,email,phone,street,city,state,zip,jobName,builder,closingDate
John Doe,john@example.com,555-1234,123 Main St,Denver,CO,80202,Oak Street Project,ABC Builders,2024-01-15
```

---

## Contractors (Subs)

### Required Headers
- `companyName` - Company/business name
- `email` - Contact email address
- `specialty` - Trade specialty (e.g., "Plumbing", "Electrical", "HVAC")

### Example CSV Row
```csv
companyName,email,specialty
Smith Plumbing,smith@plumbing.com,Plumbing
Johnson Electric,johnson@electric.com,Electrical
```

---

## Tasks

### Required Headers
- `title` - Task title/name
- `assignedToId` - ID of the employee assigned to complete the task
- `assignedById` - ID of the employee who assigned the task
- `dueDate` - Due date for the task (ISO date string)

### Optional Headers
- `description` - Task description (defaults to empty string)
- `isCompleted` - Completion status ("true" or "false", defaults to false)
- `dateAssigned` - Date the task was assigned (ISO date string, defaults to current date)
- `relatedClaimIds` - Comma-separated list of claim IDs related to this task (optional)

### Example CSV Row
```csv
title,assignedToId,assignedById,dueDate,description,isCompleted,dateAssigned,relatedClaimIds
Follow up on claim,emp-123,emp-456,2024-02-01,Call homeowner about status,false,2024-01-15,claim-789
```

---

## Messages

### Required Headers
- `subject` - Message thread subject line
- `homeownerId` - ID of the homeowner associated with the message thread
- `participants` - Comma-separated list of participant email addresses or IDs

### Optional Headers
- `lastMessageAt` - Timestamp of the last message (ISO date string, defaults to current date)
- `isRead` - Read status ("true" or "false", defaults to false)
- `messages` - JSON array of message objects (optional, can be complex structure)

### Example CSV Row
```csv
subject,homeownerId,participants,lastMessageAt,isRead
Warranty Claim Update,homeowner-123,admin@example.com,homeowner@example.com,2024-01-15T10:30:00Z,false
```

---

## Builders

### Required Headers
- `name` - Builder group/company name
- `email` - Builder group contact email

### Optional Headers (for Builder Users)
- `userName` - Name of the builder user (if creating a user for this builder)
- `userEmail` - Email address of the builder user
- `password` - Password for the builder user (if not provided, a random password is generated)

### Notes
- Each row creates a builder group
- If `userName` and `userEmail` are provided in the same row, a builder user account will also be created
- If `password` is not provided for a builder user, a random 8-character password is generated

### Example CSV Row (Builder Group Only)
```csv
name,email
ABC Builders,contact@abcbuilders.com
XYZ Construction,info@xyzconstruction.com
```

### Example CSV Row (Builder Group with User)
```csv
name,email,userName,userEmail,password
ABC Builders,contact@abcbuilders.com,John Smith,john@abcbuilders.com,SecurePass123
```

---

## General Notes

1. **File Format**: CSV files are expected with headers in the first row
2. **Case Sensitivity**: Header names are case-sensitive and must match exactly as shown above
3. **Date Formats**: Dates should be in ISO format (YYYY-MM-DD) or ISO datetime format (YYYY-MM-DDTHH:mm:ssZ)
4. **Boolean Values**: Use "true" or "false" (case-insensitive) for boolean fields
5. **Arrays**: Comma-separated values are used for array fields (e.g., `participants`, `relatedClaimIds`)
6. **Validation**: The import system validates that all required headers are present before processing
7. **Missing Values**: Optional fields will use default values if not provided (see individual sections above)

---

## Quick Reference Table

| Section | Required Headers Count | Key Required Fields |
|---------|----------------------|-------------------|
| Claims | 5 | title, description, category, homeownerEmail, address |
| Homeowners | 10 | name, email, phone, street, city, state, zip, jobName, builder, closingDate |
| Contractors | 3 | companyName, email, specialty |
| Tasks | 4 | title, assignedToId, assignedById, dueDate |
| Messages | 3 | subject, homeownerId, participants |
| Builders | 2 | name, email |












