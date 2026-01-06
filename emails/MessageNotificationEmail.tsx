import * as React from "react";
import { Text, Button, Section } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

interface MessageNotificationEmailProps {
  authorName: string;
  content: string;
  contextType: 'CLAIM' | 'MESSAGE';
  contextId: string;
  link: string;
}

export const MessageNotificationEmail = ({
  authorName,
  content,
  contextType,
  contextId,
  link,
}: MessageNotificationEmailProps) => {
  
  // Determine if we should show the context ID (exclude UUIDs and 'new')
  const showContextId = contextId && contextId !== 'new' && contextId.length < 20;
  
  const previewText = `New message from ${authorName}`;
  const heading = 'New Message Received';
  
  return (
    <EmailLayout previewText={previewText} heading={heading}>
      
      {/* Context Info */}
      <Text className="text-gray-700 mb-5 text-[14px]">
        You have a new message from <strong>{authorName}</strong>
        {showContextId && (
          <> regarding <strong>{contextType} #{contextId}</strong></>
        )}.
      </Text>

      {/* Message Content */}
      <Section className="bg-blue-50 rounded-lg p-4 mb-5 border-l-4" style={{ borderLeftColor: '#2563eb' }}>
        <Text className="text-gray-900 font-semibold text-[14px] mt-0 mb-2">
          Message
        </Text>
        <Text className="text-gray-700 text-[14px] m-0 italic leading-relaxed">
          "{content}"
        </Text>
      </Section>

      {/* Instructions */}
      <Text className="text-gray-600 text-[13px] mb-5 border-t border-gray-200 pt-4">
        To reply, simply reply to this email or view your messages in Cascade Connect:
      </Text>

      {/* CTA Button */}
      <Section className="text-center mt-5">
        <Button
          href={link}
          className="inline-block text-white no-underline px-6 py-3 rounded-lg font-semibold text-[14px]"
          style={{ backgroundColor: '#2563eb' }}
        >
          View Messages
        </Button>
      </Section>

    </EmailLayout>
  );
};

export default MessageNotificationEmail;

