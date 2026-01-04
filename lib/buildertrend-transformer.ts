/**
 * Buildertrend CSV Transformer
 * 
 * Transforms raw Buildertrend CSV rows into our homeowners schema format.
 * Handles address parsing, date logic, phone cleaning, and name splitting.
 */

export interface BuildertrendRow {
  'Clients': string;
  'Client Email': string;
  'Client Phone': string;
  'Job Address': string;
  'Job Name': string;
  'Groups': string; // Builder name
  'Actual Start': string;
  'Proj. Start': string;
  [key: string]: string | undefined;
}

export interface TransformedHomeowner {
  full_name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  job_name: string;
  builder_name: string;
  closing_date: Date | null;
}

/**
 * Parses a combined address string into separate components.
 * Format: "14201 56th Ave Ct E, Puyallup, WA 98373"
 */
function parseAddress(rawAddress: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!rawAddress || !rawAddress.trim()) {
    return { street: '', city: '', state: '', zip: '' };
  }

  // Split by comma first
  const parts = rawAddress.split(',').map((s: string) => s.trim());
  
  // Safe extraction (Handle edge cases where address is incomplete)
  const street = parts[0] || '';
  const city = parts[1] || '';
  const stateZip = parts[2] || ''; // "WA 98373"
  
  // Split State/Zip by the last space
  const lastSpaceIndex = stateZip.lastIndexOf(' ');
  const state = lastSpaceIndex > -1 ? stateZip.substring(0, lastSpaceIndex) : stateZip;
  const zip = lastSpaceIndex > -1 ? stateZip.substring(lastSpaceIndex + 1) : '';

  return { street, city, state, zip };
}

/**
 * Cleans phone number to digits only
 */
function cleanPhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Parses date string, returns Date or null
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Splits full name into first and last name
 */
function splitName(fullName: string): { firstName?: string; lastName?: string } {
  if (!fullName || !fullName.trim()) {
    return {};
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Transforms a Buildertrend CSV row into our homeowner schema format
 */
export function transformRow(row: BuildertrendRow): TransformedHomeowner {
  // 1. Address Parser
  const rawAddress = row['Job Address'] || '';
  const { street, city, state, zip } = parseAddress(rawAddress);

  // 2. Date Logic: Prioritize Actual, Fallback to Projected
  const closingDate = parseDate(row['Actual Start']) || parseDate(row['Proj. Start']);

  // 3. Phone Logic: Strip to numbers only
  const cleanPhoneNumber = cleanPhone(row['Client Phone']);

  // 4. Name handling
  const fullName = row['Clients'] || '';
  const { firstName, lastName } = splitName(fullName);

  return {
    full_name: fullName,
    firstName,
    lastName,
    email: row['Client Email'] || '',
    phone: cleanPhoneNumber,
    street_address: street,
    city: city,
    state: state,
    zip_code: zip,
    job_name: row['Job Name'] || '',
    builder_name: row['Groups'] || '',
    closing_date: closingDate,
  };
}

