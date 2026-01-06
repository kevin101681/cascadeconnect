import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Link,
  Hr,
} from "@react-email/components";

interface EmailLayoutProps {
  previewText: string;
  heading?: string;
  children: React.ReactNode;
}

export const EmailLayout = ({
  previewText,
  heading,
  children,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: "#2563eb", // Dashboard Blue
                gray: "#64748b",
              },
            },
          },
        }}
      >
        <Body className="bg-gray-50 my-auto mx-auto font-sans text-gray-700">
          <Container className="border border-gray-200 rounded-lg my-[40px] mx-auto p-[20px] max-w-[465px] bg-white shadow-sm">
            
            {/* 1. LOGO PLACEHOLDER */}
            <Section className="mt-[10px] mb-[20px]">
              <div className="flex items-center justify-center">
                 <span className="text-brand font-bold text-xl tracking-tight">Cascade Connect</span>
              </div>
            </Section>

            {/* 2. HEADER */}
            {heading && (
              <Section>
                 <Text className="text-gray-900 text-[20px] font-semibold text-center p-0 my-[10px] mx-0">
                  {heading}
                </Text>
                <Hr className="border-gray-100 my-[20px] mx-0 w-full" />
              </Section>
            )}
            
            {/* 3. MAIN CONTENT */}
            <Section className="px-[5px]">
              <div className="text-[14px] leading-[24px]">
                {children}
              </div>
            </Section>

            {/* 4. FOOTER */}
            <Section className="text-center mt-[30px] border-t border-gray-100 pt-[20px]">
              <Text className="text-[12px] text-gray-400 leading-[18px]">
                © 2026 Cascade Connect. All rights reserved. <br />
                <Link href="https://cascadeconnect.com" className="text-gray-400 underline">
                  Visit Dashboard
                </Link>
              </Text>
            </Section>
            
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailLayout;

