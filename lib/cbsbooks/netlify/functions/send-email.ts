
import { Handler } from '@netlify/functions';
import nodemailer from 'nodemailer';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // check for SMTP credentials
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('Missing SMTP credentials in environment variables.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Server Email Configuration Missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in Netlify settings." 
      })
    };
  }

  try {
    const { to, subject, text, html, attachment } = JSON.parse(event.body || '{}');

    if (!to || !attachment) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'to' address or attachment data." })
      };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // attachment.data is expected to be the base64 string (without data URI prefix ideally, or we strip it)
    const base64Content = attachment.data.replace(/^data:application\/pdf;base64,/, "");

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Cascade Builder Services'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject || "Invoice from Cascade Builder Services",
      text: text || "Please find the attached invoice.",
      html: html, // Allow HTML content for buttons/styling
      attachments: [
        {
          filename: attachment.filename || 'invoice.pdf',
          content: base64Content,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Email sent successfully", messageId: info.messageId }),
    };

  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to send email" }),
    };
  }
};
