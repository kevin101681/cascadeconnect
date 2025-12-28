import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
            Terms of Service
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
              Agreement to Terms
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Welcome to Cascade Connect. By accessing or using our warranty management platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Description of Service
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Cascade Connect provides a warranty management platform that connects homeowners, builders, and contractors to streamline the warranty claim process. Our Service includes tools for submitting claims, tracking claim status, scheduling appointments, managing documents, and communicating about warranty issues.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              User Accounts
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              To use certain features of our Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access or security breach</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Acceptable Use
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes. You may not:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others, including intellectual property rights</li>
              <li>Upload or transmit viruses, malware, or other malicious code</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Impersonate any person or entity</li>
              <li>Submit false or misleading information</li>
            </ul>
          </section>

          {/* CRITICAL: SMS/MMS Mobile Message Marketing Program Terms - REQUIRED FOR A2P 10DLC */}
          <section className="bg-primary-container/20 dark:bg-primary/10 border border-primary/30 dark:border-primary/20 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-6">
              SMS/MMS Mobile Message Marketing Program Terms and Conditions
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Program Description
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  Cascade Connect offers an opt-in SMS/MMS mobile messaging program (the "Program"). Users may opt-in to receive automated text messages regarding warranty claims, appointments, claim status updates, and important account notifications.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Consent and Opt-In
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-3">
                  By opting in to the Program during account registration or through your account settings, you expressly consent to receive automated text messages from Cascade Connect. Consent is not required as a condition of purchasing any goods or services.
                </p>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  <strong>Message frequency varies</strong> based on your warranty claim activity and scheduled appointments. You may receive multiple messages per week during active claim periods.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Message Types
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-3">
                  Messages may include:
                </p>
                <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
                  <li>Warranty claim status updates</li>
                  <li>Appointment confirmations and reminders</li>
                  <li>Document upload notifications</li>
                  <li>Urgent warranty-related alerts</li>
                  <li>Account security notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Costs
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  <strong>Message and data rates may apply.</strong> Standard messaging rates from your mobile carrier will apply to all SMS messages sent and received. Please check with your mobile carrier for details about your messaging plan. Cascade Connect is not responsible for any charges from your mobile carrier.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  How to Opt Out
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-3">
                  You may opt out of the Program at any time by:
                </p>
                <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
                  <li>Replying <strong>STOP</strong> to any text message from Cascade Connect</li>
                  <li>Updating your notification preferences in your account settings</li>
                  <li>Contacting our support team</li>
                </ul>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed mt-3">
                  After opting out, you will receive one final confirmation message, and then no further messages will be sent unless you opt back in.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Help and Support
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  For help with the Program, reply <strong>HELP</strong> to any text message or contact our support team at <a href="mailto:info@cascadebuilderservices.com" className="text-primary hover:underline">info@cascadebuilderservices.com</a>.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Supported Carriers
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-3">
                  The Program is available on the following carriers:
                </p>
                <p className="text-surface-on dark:text-gray-300 text-sm leading-relaxed">
                  AT&T, T-Mobile, Verizon, Sprint, Boost, Cricket, MetroPCS, U.S. Cellular, Virgin Mobile, and other major carriers. Check with your carrier for compatibility.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Carrier Disclaimer
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  <strong>Carriers are not liable for delayed or undelivered messages.</strong> Message delivery is subject to network availability and may be affected by factors outside of Cascade Connect's control, including carrier outages, signal strength, and device compatibility.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Privacy
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  Your mobile phone number and SMS opt-in status are stored securely and will not be shared with third parties for marketing purposes. For more information about how we handle your data, please review our <button onClick={onBack} className="text-primary hover:underline">Privacy Policy</button>.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                  Program Changes and Termination
                </h3>
                <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                  Cascade Connect reserves the right to modify or terminate the Program at any time without prior notice. We will provide reasonable notice of material changes when possible.
                </p>
              </div>
            </div>
          </section>

          {/* Warranty Claims */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Warranty Claims
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              The Service facilitates the submission and management of warranty claims. Please note:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>Cascade Connect is a platform provider and does not provide warranties on homes or construction work</li>
              <li>All warranty claims are subject to the terms of your builder's warranty agreement</li>
              <li>Builders and contractors are responsible for evaluating and addressing warranty claims</li>
              <li>Cascade Connect does not guarantee claim approval or resolution timelines</li>
              <li>You are responsible for providing accurate and complete information in your claims</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Intellectual Property
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              The Service and its content, features, and functionality are owned by Cascade Connect and are protected by copyright, trademark, and other intellectual property laws. You may not:
            </p>
            <ul className="list-disc list-inside text-surface-on dark:text-gray-300 space-y-2 ml-4">
              <li>Copy, modify, distribute, or create derivative works from the Service</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Remove or alter any copyright, trademark, or proprietary notices</li>
              <li>Use our trademarks or branding without written permission</li>
            </ul>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              User Content
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              You retain ownership of content you submit to the Service (photos, descriptions, messages, etc.). By submitting content, you grant Cascade Connect a worldwide, non-exclusive, royalty-free license to use, store, display, and transmit your content as necessary to provide the Service.
            </p>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              You represent that you have the right to submit all content you upload and that your content does not violate any third-party rights or applicable laws.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Third-Party Services
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services. Cascade Connect is not responsible for the content, privacy practices, or terms of service of any third-party sites or services. Your use of third-party services is at your own risk.
            </p>
          </section>

          {/* Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Disclaimer of Warranties
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. CASCADE CONNECT DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              TO THE FULLEST EXTENT PERMITTED BY LAW, CASCADE CONNECT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Indemnification
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Cascade Connect and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or related to your use of the Service, your violation of these Terms, or your violation of any rights of another.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Termination
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              Cascade Connect may suspend or terminate your access to the Service at any time, with or without cause or notice. You may terminate your account at any time by contacting us. Upon termination, your right to use the Service will immediately cease, but certain provisions of these Terms will survive.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Governing Law and Dispute Resolution
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the State of Washington, without regard to its conflict of law principles. Any disputes arising out of or related to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Changes to These Terms
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed">
              We may update these Terms from time to time. When we make changes, we will update the "Last Updated" date at the top of this page and notify you through the Service or by email. Your continued use of the Service after changes become effective constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100 mb-4">
              Contact Us
            </h2>
            <p className="text-surface-on dark:text-gray-300 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-surface-container dark:bg-gray-800 rounded-lg p-6 border border-surface-outline-variant dark:border-gray-700">
              <p className="text-surface-on dark:text-gray-300 leading-relaxed">
                <strong>Cascade Connect</strong><br />
                Email: <a href="mailto:info@cascadebuilderservices.com" className="text-primary hover:underline">info@cascadebuilderservices.com</a><br />
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

export default TermsOfService;

