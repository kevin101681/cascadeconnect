# Square Payment Service Documentation

## Overview
The Square payment service (`lib/services/square.ts`) provides secure payment processing with built-in idempotency to prevent double-charging customers.

---

## 🔒 Security Features

1. **Idempotency**: Every payment operation uses a unique key to prevent duplicate charges
2. **Environment Detection**: Automatically uses Sandbox for development, Production for production
3. **Error Handling**: All errors are caught, logged, and properly formatted
4. **Type Safety**: Full TypeScript support with Square SDK types

---

## 🚀 Quick Start

### 1. Environment Variables

Add to your `.env` file:

```env
# Square Configuration
SQUARE_ACCESS_TOKEN=your_access_token_here
SQUARE_LOCATION_ID=your_location_id_here

# Environment (auto-detected from NODE_ENV)
NODE_ENV=development  # or "production"
```

**Important**: 
- Development uses Square **Sandbox** environment
- Production uses Square **Production** environment
- Never commit `.env` file to version control

### 2. Basic Usage

```typescript
import { createInvoice } from '@/lib/services/square';

// Create an invoice for a customer
const invoice = await createInvoice(
  'customer_123',     // Square Customer ID
  50000,              // $500.00 (amount in cents)
  'Warranty Claim'    // Invoice title
);

console.log('Invoice created:', invoice.id);
console.log('Invoice URL:', invoice.publicUrl);
```

---

## 📚 API Reference

### Client Instance

```typescript
import { square } from '@/lib/services/square';

// Access any Square API (v43+ SDK)
const customer = await square.customers.retrieveCustomer({ customerId: 'customer_123' });
const payment = await square.payments.getPayment({ paymentId: 'payment_xyz' });
```

### `withIdempotency<T>(operation: (key: string) => Promise<T>)`

Wrapper function that adds idempotency to any Square API operation.

**Parameters:**
- `operation`: Function that takes an idempotency key and returns a Promise

**Returns:** Result of the operation

**Example:**
```typescript
import { withIdempotency, square } from '@/lib/services/square';

const payment = await withIdempotency(async (idempotencyKey) => {
  const response = await square.payments.createPayment({
    idempotencyKey,
    sourceId: 'card_nonce_123',
    amountMoney: {
      amount: BigInt(10000),
      currency: 'USD'
    },
    locationId: process.env.SQUARE_LOCATION_ID!,
  });
  return response.payment;
});
```

### `createInvoice(customerId, amountCents, title)`

Create an invoice for a customer.

**Parameters:**
- `customerId` (string): Square customer ID
- `amountCents` (number): Amount in cents (e.g., 10000 = $100.00)
- `title` (string): Invoice title/description

**Returns:** Square Invoice object

**Example:**
```typescript
const invoice = await createInvoice(
  'customer_abc123',
  25000,  // $250.00
  'Emergency Roof Repair - Claim #1234'
);

// Invoice properties
console.log(invoice.id);              // Invoice ID
console.log(invoice.publicUrl);       // Payment URL for customer
console.log(invoice.status);          // 'DRAFT', 'UNPAID', 'PAID', etc.
console.log(invoice.invoiceNumber);   // Human-readable invoice number
```

---

## 🛠️ Common Operations

### 1. Create a Customer

```typescript
import { withIdempotency, square } from '@/lib/services/square';

const customer = await withIdempotency(async (idempotencyKey) => {
  const response = await square.customers.createCustomer({
    idempotencyKey,
    givenName: 'John',
    familyName: 'Doe',
    emailAddress: 'john.doe@example.com',
    phoneNumber: '+1-555-123-4567',
  });
  return response.customer;
});

console.log('Customer ID:', customer.id);
```

### 2. Create and Send Invoice

```typescript
import { createInvoice, square } from '@/lib/services/square';

// Create invoice
const invoice = await createInvoice(
  customerId,
  50000,  // $500
  'Warranty Claim Payment'
);

// Publish invoice (makes it visible to customer)
const published = await square.invoices.publishInvoice({
  invoiceId: invoice.id!,
  version: invoice.version!,
});

console.log('Invoice URL:', published.invoice?.publicUrl);
// Send this URL to customer via email/SMS
```

### 3. Process Card Payment

```typescript
import { withIdempotency, square } from '@/lib/services/square';

const payment = await withIdempotency(async (idempotencyKey) => {
  const response = await square.payments.createPayment({
    idempotencyKey,
    sourceId: cardNonce, // From Square Web Payments SDK
    amountMoney: {
      amount: BigInt(10000), // $100.00
      currency: 'USD'
    },
    locationId: process.env.SQUARE_LOCATION_ID!,
    note: 'Warranty claim payment',
  });
  return response.payment;
});

console.log('Payment ID:', payment.id);
console.log('Status:', payment.status); // 'COMPLETED', 'PENDING', etc.
```

### 4. List Customer Invoices

```typescript
import { square } from '@/lib/services/square';

const response = await square.invoices.searchInvoices({
  query: {
    filter: {
      customerIds: [customerId],
    },
    sort: {
      field: 'INVOICE_SORT_DATE',
      order: 'DESC'
    }
  }
});

const invoices = response.invoices || [];
console.log(`Customer has ${invoices.length} invoices`);
```

### 5. Cancel Invoice

```typescript
import { square } from '@/lib/services/square';

const response = await square.invoices.cancelInvoice({
  invoiceId,
  version: invoiceVersion,
});

console.log('Invoice cancelled:', response.invoice?.status);
```

---

## 💡 Best Practices

### 1. Always Use Idempotency

```typescript
// ❌ BAD: No idempotency protection
const payment = await square.payments.createPayment({ /* ... */ });

// ✅ GOOD: Protected against double-charges
const payment = await withIdempotency(async (key) => {
  const response = await square.payments.createPayment({
    idempotencyKey: key,
    // ...
  });
  return response.payment;
});
```

### 2. Handle Errors Gracefully

```typescript
import { logError } from '@/lib/services/errorTrackingService';

try {
  const invoice = await createInvoice(customerId, amount, title);
  // Success
} catch (error) {
  logError(error, {
    service: 'square',
    operation: 'createInvoice',
    customerId,
    amount,
  });
  
  // Show user-friendly error
  throw new Error('Unable to create invoice. Please try again.');
}
```

### 3. Use BigInt for Money

Square requires BigInt for all monetary amounts:

```typescript
// ❌ BAD: Regular number
amount: 10000

// ✅ GOOD: BigInt
amount: BigInt(10000)
```

### 4. Store Square IDs

Always store Square IDs in your database for reference:

```typescript
await db.insert(payments).values({
  claimId: claim.id,
  squareInvoiceId: invoice.id,
  squareCustomerId: customer.id,
  amount: amountCents,
  status: invoice.status,
});
```

### 5. Validate Environment Variables

```typescript
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
  throw new Error('Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID');
}
```

---

## 🔐 Idempotency Explained

### What is Idempotency?

Idempotency ensures that making the same request multiple times has the same effect as making it once. This prevents:
- Double charging customers
- Creating duplicate invoices
- Processing the same payment twice

### How It Works

```typescript
// Request 1 with key "abc123"
const payment1 = await createPayment({ idempotencyKey: "abc123", amount: 100 });
// ✅ Creates new payment

// Request 2 with SAME key "abc123" (e.g., user clicked "Pay" twice)
const payment2 = await createPayment({ idempotencyKey: "abc123", amount: 100 });
// ✅ Returns the SAME payment, doesn't charge again

console.log(payment1.id === payment2.id); // true
```

### Our Implementation

The `withIdempotency` wrapper automatically generates a unique UUID for each operation:

```typescript
export async function withIdempotency<T>(
  operation: (key: string) => Promise<T>
): Promise<T> {
  const key = uuidv4(); // Generate unique key
  return await operation(key);
}
```

This means every function call gets a new key, but if you retry the same operation (e.g., due to network error), you should pass the same key manually.

---

## 🧪 Testing

### Sandbox Testing

In development, the service automatically uses Square's Sandbox environment:

```typescript
// .env.development
NODE_ENV=development
SQUARE_ACCESS_TOKEN=sandbox_access_token
SQUARE_LOCATION_ID=sandbox_location_id
```

**Test Cards**: Use [Square's test card numbers](https://developer.squareup.com/docs/devtools/sandbox/payments):
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`

### Unit Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createInvoice } from '../square';

describe('Square Payment Service', () => {
  it('should create invoice with idempotency', async () => {
    const invoice = await createInvoice(
      'test_customer_123',
      10000,
      'Test Invoice'
    );
    
    expect(invoice).toBeDefined();
    expect(invoice.id).toBeTruthy();
  });
});
```

---

## 🚨 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `UNAUTHORIZED` | Invalid access token | Check `SQUARE_ACCESS_TOKEN` |
| `NOT_FOUND` | Customer/location doesn't exist | Verify IDs are correct |
| `INVALID_REQUEST_ERROR` | Missing required field | Check all parameters |
| `SERVICE_UNAVAILABLE` | Square API down | Retry with exponential backoff |

### Error Response Format

```typescript
try {
  await createInvoice(customerId, amount, title);
} catch (error) {
  // Error format: "Payment Failed: [Square error message]"
  console.error(error.message);
  
  // Original Square error is logged to console
  // Check server logs for full details
}
```

---

## 📊 Integration Example

Complete workflow for processing a warranty claim payment:

```typescript
import { square, createInvoice, withIdempotency } from '@/lib/services/square';
import { logError, addBreadcrumb } from '@/lib/services/errorTrackingService';
import { sendMessage } from '@/lib/services/messagesService';

async function processClaimPayment(claim: Claim, homeowner: Homeowner) {
  try {
    addBreadcrumb('Starting payment process', { claimId: claim.id });
    
    // 1. Create or get Square customer
    let squareCustomerId = homeowner.squareCustomerId;
    
    if (!squareCustomerId) {
      const customer = await withIdempotency(async (key) => {
        const response = await square.customers.createCustomer({
          idempotencyKey: key,
          givenName: homeowner.firstName,
          familyName: homeowner.lastName,
          emailAddress: homeowner.email,
          phoneNumber: homeowner.phone,
        });
        return response.customer;
      });
      
      squareCustomerId = customer.id!;
      
      // Save to database
      await db.update(homeowners)
        .set({ squareCustomerId })
        .where(eq(homeowners.id, homeowner.id));
    }
    
    // 2. Create invoice
    const invoice = await createInvoice(
      squareCustomerId,
      claim.repairCost * 100, // Convert dollars to cents
      `Warranty Claim #${claim.id} - ${claim.damageType}`
    );
    
    // 3. Publish invoice
    const published = await square.invoices.publishInvoice({
      invoiceId: invoice.id!,
      version: invoice.version!,
    });
    
    const publicUrl = published.invoice?.publicUrl;
    
    // 4. Save to database
    await db.insert(payments).values({
      claimId: claim.id,
      homeownerId: homeowner.id,
      squareInvoiceId: invoice.id,
      squareCustomerId,
      amount: claim.repairCost * 100,
      status: 'pending',
      invoiceUrl: publicUrl,
    });
    
    // 5. Send payment link via SMS
    if (publicUrl) {
      await sendMessage(
        homeowner.id,
        `Your warranty claim invoice is ready. Pay here: ${publicUrl}`,
        null
      );
    }
    
    addBreadcrumb('Payment process completed', { invoiceId: invoice.id });
    
    return { success: true, invoiceUrl: publicUrl };
    
  } catch (error) {
    logError(error, {
      service: 'square',
      operation: 'processClaimPayment',
      claimId: claim.id,
      homeownerId: homeowner.id,
    });
    
    return { success: false, error: 'Payment processing failed' };
  }
}
```

---

## 🔗 Related Documentation

- [Square API Documentation](https://developer.squareup.com/reference/square)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Payment Processing Best Practices](https://developer.squareup.com/docs/payments-api/overview)

---

## ✅ Checklist for Production

- [ ] Environment variables set in Netlify
- [ ] Production Square account verified
- [ ] Production location ID configured
- [ ] Test payments in sandbox successful
- [ ] Error logging configured
- [ ] Database schema includes Square IDs
- [ ] Payment webhooks configured (optional)

---

**Questions? Check the Square developer docs or review the service implementation at `lib/services/square.ts`**

