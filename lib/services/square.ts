import { SquareClient, SquareEnvironment } from "square";
import { v4 as uuidv4 } from "uuid";

// 1. Initialize Client safely
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || "",
  environment: process.env.NODE_ENV === "production" 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
});

export const square = squareClient;

// 2. Helper to prevent double-charges (Idempotency)
// We use this wrapper for EVERY write operation
export async function withIdempotency<T>(
  operation: (key: string) => Promise<T>
): Promise<T> {
  const key = uuidv4(); // Generate unique key for this specific request
  try {
    return await operation(key);
  } catch (error: any) {
    console.error("❌ Square API Error:", JSON.stringify(error.result || error, null, 2));
    throw new Error(`Payment Failed: ${error.message || "Unknown Square error"}`);
  }
}

// 3. Example: Create Invoice Function
// NOTE: Temporarily disabled due to Square SDK v43 API changes
// The SDK's invoice API surface has changed. Will need to update implementation
// based on the latest Square SDK documentation.
export async function createInvoice(
  customerId: string, 
  amountCents: number, 
  title: string
): Promise<any> {
  throw new Error('createInvoice is temporarily disabled. Please update to use the latest Square SDK API.');
  
  /* Original implementation - needs update for v43+
  return withIdempotency(async (idempotencyKey) => {
    const response = await square.invoices.createInvoice({
      idempotencyKey,
      invoice: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        primaryRecipient: { customerId },
        paymentRequests: [{
          requestType: "BALANCE",
          computedAmountMoney: {
            amount: BigInt(amountCents),
            currency: "USD"
          },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        }],
        title,
      }
    });
    return response.result.invoice;
  });
  */
}


