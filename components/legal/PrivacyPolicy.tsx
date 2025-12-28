import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-surface-on dark:text-gray-100 mb-2">
            Privacy Policy
          </h1>
          <p className="text-surface-on-variant dark:text-gray-400">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Introduction
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Cascade Connect ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our warranty management platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Information We Collect
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and mailing address.</li>
              <li><strong>Property Information:</strong> Property address, builder information, closing date, and project details.</li>
              <li><strong>Warranty Claims:</strong> Descriptions, photos, status updates, and related communications.</li>
              <li><strong>Account Information:</strong> Login credentials, user preferences, and account settings.</li>
              <li><strong>Communications:</strong> Messages, emails, and other communications you send through our platform.</li>
              <li><strong>Usage Information:</strong> Information about how you access and use our platform, including device information, IP address, browser type, and pages visited.</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>Provide, maintain, and improve our warranty management services</li>
              <li>Process and manage warranty claims</li>
              <li>Communicate with you about your account, claims, and appointments</li>
              <li>Send you notifications, updates, and support messages</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Protect against fraudulent, unauthorized, or illegal activity</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          {/* Information Sharing - REQUIRED TWILIO/A2P 10DLC LANGUAGE */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Information Sharing
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li><strong>Builders and Contractors:</strong> We share relevant claim information with the builders and contractors responsible for addressing your warranty issues.</li>
              <li><strong>Service Providers:</strong> We use third-party service providers to help us operate our platform, including hosting, analytics, email delivery, and SMS messaging services.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, subpoena, or other legal process.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
            </ul>
            
            {/* CRITICAL: TCPA-compliant SMS opt-in language for A2P 10DLC registration */}
            <div className="bg-primary-container/20 dark:bg-primary/10 border border-primary/30 dark:border-primary/20 rounded-lg p-6 mt-6">
              <p className="text-surface-on dark:text-gray-300 leading-relaxed font-medium">
                <strong>SMS Messaging:</strong> No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
              </p>
            </div>
          </section>

          {/* SMS Communications */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              SMS Communications
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              If you opt-in to receive SMS notifications:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>We will only send you text messages related to your warranty claims, appointments, and important account updates.</li>
              <li>You may receive automated messages based on claim activity and scheduled appointments.</li>
              <li>Message and data rates may apply based on your mobile carrier's plan.</li>
              <li>You can opt out at any time by replying <strong>STOP</strong> to any message or updating your preferences in your account settings.</li>
              <li>For help, reply <strong>HELP</strong> or contact our support team.</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Data Security
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Data Retention
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When your information is no longer needed, we will securely delete or anonymize it.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Your Rights
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> Request that we delete your personal information, subject to legal obligations.</li>
              <li><strong>Objection:</strong> Object to our processing of your personal information.</li>
              <li><strong>Data Portability:</strong> Request a copy of your information in a portable format.</li>
              <li><strong>Withdraw Consent:</strong> Withdraw your consent for SMS notifications or other communications at any time.</li>
            </ul>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Children's Privacy
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Changes to This Privacy Policy
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. When we make changes, we will update the "Last Updated" date at the top of this page. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Contact Us
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-surface-container dark:bg-gray-800 rounded-lg p-6 border border-surface-outline-variant dark:border-gray-700">
              <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                <strong>Cascade Connect</strong><br />
                Email: <a href="mailto:privacy@cascadeconnect.app" className="text-primary hover:underline">privacy@cascadeconnect.app</a><br />
                Website: <a href="https://cascadeconnect.app" className="text-primary hover:underline">cascadeconnect.app</a>
              </p>
            </div>
          </section>

        </div>

        {/* Back to Top */}
        <div className="mt-12 text-center">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-on dark:text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;

