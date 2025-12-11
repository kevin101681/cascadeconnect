import { UserRole } from '../types';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromRole: UserRole;
  replyToId?: string; // Thread ID or Claim ID
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  console.log('--- EMAIL SERVICE SIMULATION ---');
  console.log(`To: ${payload.to}`);
  console.log(`From: ${payload.fromName} (${payload.fromRole})`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`Body: ${payload.body}`);
  console.log(`Reply-To Context: ${payload.replyToId}`);
  console.log('--------------------------------');

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  return true;
};

export const generateNotificationBody = (
  authorName: string, 
  content: string, 
  contextType: 'CLAIM' | 'MESSAGE', 
  contextId: string, 
  link: string
) => {
  return `
You have a new message from ${authorName} regarding ${contextType} #${contextId}.

"${content}"

--------------------------------------------------
To reply, simply reply to this email or log in to your portal:
${link}
  `;
};