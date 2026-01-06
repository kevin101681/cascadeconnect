import * as React from "react";
import { Text, Button, Section } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

export type NotificationScenario = 'CLAIM_CREATED' | 'MATCH_NO_CLAIM' | 'NO_MATCH';

export interface UniversalNotificationData {
  propertyAddress: string | null;
  homeownerName: string | null;
  phoneNumber: string | null;
  issueDescription: string | null;
  callIntent: string | null;
  isUrgent: boolean;
  isVerified: boolean;
  matchedHomeownerId: string | null;
  matchedHomeownerName: string | null;
  claimNumber: string | null;
  claimId: string | null;
  vapiCallId: string;
  similarity: number | null;
}

interface UniversalNotificationEmailProps {
  scenario: NotificationScenario;
  data: UniversalNotificationData;
  callsLink: string;
  homeownerLink?: string;
  claimLink?: string;
}

export const UniversalNotificationEmail = ({
  scenario,
  data,
  callsLink,
  homeownerLink,
  claimLink,
}: UniversalNotificationEmailProps) => {
  
  // Determine content based on scenario
  let previewText = '';
  let heading = '';
  let scenarioDescription = '';
  let statusBadge = { text: '', color: '' };
  let primaryCta = { text: '', link: '', color: '#2563eb' };

  // ====================================
  // SCENARIO A: CLAIM CREATED
  // ====================================
  if (scenario === 'CLAIM_CREATED') {
    previewText = `New warranty claim: ${data.propertyAddress || 'Unknown Address'}`;
    heading = 'New Warranty Claim Created';
    scenarioDescription = `A warranty claim has been automatically created for ${data.matchedHomeownerName || data.homeownerName || 'this homeowner'}.`;
    statusBadge = { text: 'Claim Created', color: '#2563eb' };
    primaryCta = { text: 'View Claim', link: claimLink || callsLink, color: '#2563eb' };
  }
  // ====================================
  // SCENARIO B: MATCH FOUND, NO CLAIM
  // ====================================
  else if (scenario === 'MATCH_NO_CLAIM') {
    previewText = `Homeowner call: ${data.propertyAddress || 'Unknown Address'}`;
    heading = 'Homeowner Call Received';
    scenarioDescription = `${data.matchedHomeownerName || data.homeownerName || 'A homeowner'} called.`;
    statusBadge = { text: 'Matched - No Claim', color: '#2563eb' };
    primaryCta = { text: 'View Homeowner', link: homeownerLink || callsLink, color: '#2563eb' };
  }
  // ====================================
  // SCENARIO C: NO MATCH / UNKNOWN
  // ====================================
  else {
    previewText = `Unknown caller: ${data.phoneNumber || 'No Phone'}`;
    heading = 'Unknown Caller - Manual Review Required';
    scenarioDescription = `A caller could not be matched to a homeowner in the database.`;
    statusBadge = { text: 'Unmatched', color: '#2563eb' };
    primaryCta = { text: 'Review Call', link: callsLink, color: '#2563eb' };
  }

  // Add urgency flag to preview if urgent
  if (data.isUrgent) {
    previewText = `[URGENT] ${previewText}`;
    heading = `🚨 ${heading}`;
  }

  return (
    <EmailLayout previewText={previewText} heading={heading}>
      
      {/* Status Badge */}
      <Section className="mb-5">
        <div className="text-center">
          <span 
            className="inline-block px-5 py-2 rounded-full text-white font-semibold text-sm"
            style={{ backgroundColor: statusBadge.color }}
          >
            {statusBadge.text}
          </span>
        </div>
      </Section>

      {/* Scenario Description */}
      <Text className="text-gray-700 mb-5 text-[14px]">
        {scenarioDescription}
      </Text>

      {/* Call Information Card */}
      <Section className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200">
        <Text className="text-gray-900 font-semibold text-[14px] mt-0 mb-3">
          Call Information
        </Text>
        
        <table className="w-full">
          <tbody>
            {scenario === 'NO_MATCH' && (
              <tr>
                <td className="py-2 text-gray-600 font-semibold text-[13px] align-top" style={{ width: '140px' }}>
                  Phone Number:
                </td>
                <td className="py-2 text-gray-900 text-[13px]">
                  <strong>{data.phoneNumber || 'Not provided'}</strong>
                </td>
              </tr>
            )}
            
            <tr>
              <td className="py-2 text-gray-600 font-semibold text-[13px] align-top" style={{ width: '140px' }}>
                Property Address:
              </td>
              <td className="py-2 text-gray-900 text-[13px]">
                <strong>{data.propertyAddress || 'Not provided'}</strong>
              </td>
            </tr>
            
            {scenario !== 'NO_MATCH' && (
              <>
                <tr>
                  <td className="py-2 text-gray-600 font-semibold text-[13px] align-top">
                    Homeowner:
                  </td>
                  <td className="py-2 text-gray-900 text-[13px]">
                    {data.matchedHomeownerName || data.homeownerName || 'Not provided'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-semibold text-[13px] align-top">
                    Phone:
                  </td>
                  <td className="py-2 text-gray-900 text-[13px]">
                    {data.phoneNumber || 'Not provided'}
                  </td>
                </tr>
              </>
            )}
            
            {scenario === 'NO_MATCH' && (
              <tr>
                <td className="py-2 text-gray-600 font-semibold text-[13px] align-top">
                  Caller Name:
                </td>
                <td className="py-2 text-gray-900 text-[13px]">
                  {data.homeownerName || 'Not provided'}
                </td>
              </tr>
            )}
            
            <tr>
              <td className="py-2 text-gray-600 font-semibold text-[13px] align-top">
                Urgency:
              </td>
              <td className="py-2 text-[13px]">
                {data.isUrgent ? (
                  <span className="text-red-600 font-bold">URGENT</span>
                ) : (
                  <span className="text-gray-900">Normal</span>
                )}
              </td>
            </tr>
            
            {scenario === 'CLAIM_CREATED' && data.claimNumber && (
              <tr>
                <td className="py-2 text-gray-600 font-semibold text-[13px] align-top">
                  Claim Number:
                </td>
                <td className="py-2 text-gray-900 text-[13px]">
                  <strong>#{data.claimNumber}</strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Issue Description */}
      {data.issueDescription && (
        <Section className="bg-blue-50 rounded-lg p-4 mb-5 border-l-4" style={{ borderLeftColor: '#2563eb' }}>
          <Text className="text-gray-900 font-semibold text-[14px] mt-0 mb-2">
            {scenario === 'CLAIM_CREATED' ? 'Issue Description' : 'Caller Message'}
          </Text>
          <Text className="text-gray-700 text-[13px] m-0 whitespace-pre-wrap leading-relaxed">
            {data.issueDescription}
          </Text>
        </Section>
      )}

      {/* CTA Buttons */}
      <Section className="text-center mt-6">
        <Button
          href={primaryCta.link}
          className="inline-block text-white no-underline px-5 py-2 rounded-full font-semibold text-[14px] mx-1 my-1"
          style={{ backgroundColor: primaryCta.color }}
        >
          {primaryCta.text}
        </Button>
        
        <Button
          href={callsLink}
          className="inline-block text-white no-underline px-5 py-2 rounded-full font-semibold text-[14px] mx-1 my-1"
          style={{ backgroundColor: '#2563eb' }}
        >
          View All Calls
        </Button>
      </Section>

    </EmailLayout>
  );
};

export default UniversalNotificationEmail;

