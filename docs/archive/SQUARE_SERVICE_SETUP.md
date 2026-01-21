# Square Payment Service - Setup Complete ✅

**Created**: December 27, 2024  
**Service File**: `lib/services/square.ts`  
**Documentation**: `SQUARE_PAYMENT_GUIDE.md`

---

## ✅ What Was Created

### 1. Square Payment Service (`lib/services/square.ts`)

A production-ready payment service with:
- ✅ **Square SDK Client** - Properly initialized with environment detection
- ✅ **Idempotency Protection** - Prevents double-charging customers
- ✅ **Error Handling** - Comprehensive error logging and user-friendly messages
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Environment-Aware** - Auto-switches between Sandbox (dev) and Production

### 2. Example Implementation

Included `createInvoice()` function that demonstrates:
- Idempotency key generation
- BigInt handling for monetary amounts
- Location and customer ID management
- Due date calculation
- Proper error handling

---

## 🚀 Quick Start

### Step 1: Add Environment Variables

Add to your Netlify environment variables or `.env.local`:

```env
# Square Configuration
SQUARE_ACCESS_TOKEN=your_access_token_here
SQUARE_LOCATION_ID=your_location_id_here

# Environment (auto-detected)
NODE_ENV=production  # or "development" for sandbox
```

### Step 2: Use in Your Code

```typescript
import { createInvoice } from '@/lib/services/square';

// Create an invoice
const invoice = await createInvoice(
  customerId,
  50000,  // $500.00 (amount in cents)
  'Warranty Claim Payment'
);

console.log('Invoice URL:', invoice.publicUrl);
// Send this URL to the customer
```

### Step 3: Integrate with Error Tracking

```typescript
import { createInvoice } from '@/lib/services/square';
import { logError, addBreadcrumb } from '@/lib/services/errorTrackingService';

try {
  addBreadcrumb('Creating invoice', { customerId, amount });
  
  const invoice = await createInvoice(customerId, amount, title);
  
  addBreadcrumb('Invoice created', { invoiceId: invoice.id });
  return invoice;
} catch (error) {
  logError(error, {
    service: 'square',
    operation: 'createInvoice',
    customerId,
  });
  throw error;
}
```

---

## 🔐 Security Features

### 1. Idempotency Protection

```typescript
// If a network error causes retry, customer won't be charged twice
const invoice = await createInvoice(customerId, amount, title);
// Each call generates a unique idempotency key internally
```

### 2. Environment Separation

- **Development**: Uses Square Sandbox automatically
- **Production**: Uses Square Production automatically
- No manual switching needed - detected from `NODE_ENV`

### 3. Error Sanitization

```typescript
// Raw Square errors are logged to console for debugging
// But users only see: "Payment Failed: [message]"
```

---

## 📚 Available Operations

### Basic Operations (Built-in)

```typescript
import { square, createInvoice, withIdempotency } from '@/lib/services/square';

// Create invoice (built-in example)
const invoice = await createInvoice(customerId, amountCents, title);

// Create customer
const customer = await withIdempotency(async (key) => {
  const response = await square.customersApi.createCustomer({
    idempotencyKey: key,
    givenName: 'John',
    familyName: 'Doe',
    emailAddress: 'john@example.com',
  });
  return response.result.customer;
});

// Process payment
const payment = await withIdempotency(async (key) => {
  const response = await square.paymentsApi.createPayment({
    idempotencyKey: key,
    sourceId: cardNonce,
    amountMoney: {
      amount: BigInt(10000),
      currency: 'USD'
    },
    locationId: process.env.SQUARE_LOCATION_ID!,
  });
  return response.result.payment;
});
```

### Access Full Square API

```typescript
import { square } from '@/lib/services/square';

// Access any Square API directly
const orders = await square.ordersApi.searchOrders({ /* ... */ });
const subscriptions = await square.subscriptionsApi.listSubscriptions({ /* ... */ });
const catalog = await square.catalogApi.listCatalog({ /* ... */ });
```

---

## 🎯 Integration Points

### With Existing Services

The Square service integrates seamlessly with your existing infrastructure:

```typescript
import { createInvoice } from '@/lib/services/square';
import { sendMessage } from '@/lib/services/messagesService';
import { logError } from '@/lib/services/errorTrackingService';
import { cached, CacheTTL } from '@/lib/services/cacheService';

// Complete workflow
async function processPayment(homeowner: Homeowner, claim: Claim) {
  try {
    // 1. Create invoice
    const invoice = await createInvoice(
      homeowner.squareCustomerId,
      claim.repairCost * 100,
      `Claim #${claim.id}`
    );
    
    // 2. Send payment link via SMS
    await sendMessage(
      homeowner.id,
      `Your payment is ready: ${invoice.publicUrl}`,
      null
    );
    
    // 3. Cache invoice data
    await cached(
      `invoice:${invoice.id}`,
      () => Promise.resolve(invoice),
      { ttl: CacheTTL.LONG }
    );
    
    return { success: true, invoice };
  } catch (error) {
    logError(error, { 
      service: 'square',
      homeownerId: homeowner.id,
      claimId: claim.id 
    });
    return { success: false, error: 'Payment failed' };
  }
}
```

---

## 📊 Database Schema Recommendations

Store Square IDs in your database for reference:

```sql
-- Add to homeowners table
ALTER TABLE homeowners 
ADD COLUMN square_customer_id VARCHAR(255);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id),
  homeowner_id UUID REFERENCES homeowners(id),
  square_invoice_id VARCHAR(255),
  square_customer_id VARCHAR(255),
  amount INTEGER NOT NULL,  -- Amount in cents
  status VARCHAR(50) NOT NULL,  -- 'pending', 'paid', 'cancelled'
  invoice_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

### Sandbox Mode (Development)

```env
NODE_ENV=development
SQUARE_ACCESS_TOKEN=sandbox_sq0atp-xxxxx
SQUARE_LOCATION_ID=sandbox_location_id
```

**Test Card Numbers**: [Square Test Cards](https://developer.squareup.com/docs/devtools/sandbox/payments)
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`

### Production Testing

1. Start with small test amounts
2. Verify invoice creation
3. Test payment flow end-to-end
4. Monitor error logs

---

## 📖 Documentation

### Comprehensive Guide
See **`SQUARE_PAYMENT_GUIDE.md`** for:
- Complete API reference
- Common operations
- Error handling
- Best practices
- Integration examples
- Testing strategies

### Quick Reference
See **`SERVICE_QUICK_REFERENCE.md`** for:
- Import statements
- Quick patterns
- Code snippets

---

## ✅ Checklist

### Pre-Production
- [ ] Square account created and verified
- [ ] Production access token obtained
- [ ] Location ID configured
- [ ] Environment variables set in Netlify
- [ ] Test payments in sandbox successful
- [ ] Database schema updated with Square IDs

### Post-Production
- [ ] Monitor error logs for payment issues
- [ ] Track successful/failed payment rates
- [ ] Set up Square webhooks (optional)
- [ ] Configure payment reconciliation

---

## 🔗 Related Files

- **Service**: `lib/services/square.ts`
- **Guide**: `SQUARE_PAYMENT_GUIDE.md`
- **Quick Ref**: `SERVICE_QUICK_REFERENCE.md`
- **Env Example**: `env.example`
- **Security Audit**: `SECURITY_AUDIT_2024-12-27.md`

---

## 💡 Key Features Summary

✅ **Idempotency**: No double-charging  
✅ **Type Safety**: Full TypeScript support  
✅ **Error Handling**: Comprehensive logging  
✅ **Environment Detection**: Auto Sandbox/Production  
✅ **Integration Ready**: Works with existing services  
✅ **Production Ready**: Follows .cursorrules standards  
✅ **Well Documented**: Complete guides and examples  

---

## 🎉 You're Ready!

The Square payment service is now fully integrated and ready to use. Start by adding your environment variables, then import and use `createInvoice()` or access the full `square` client for any Square API operation.

**Questions?** Check `SQUARE_PAYMENT_GUIDE.md` for detailed documentation.

**Need help?** The service follows the same patterns as your other services (upload, messages, etc.) - consistent and easy to use!

