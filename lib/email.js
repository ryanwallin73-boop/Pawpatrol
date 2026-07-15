import nodemailer from "nodemailer";

// Sends through Yahoo Mail's SMTP servers. YAHOO_USER is the full Yahoo
// address; YAHOO_APP_PASSWORD is an app password generated at
// Yahoo Account Security > Generate app password (a normal password won't work).
const transporter = nodemailer.createTransport({
  host: "smtp.mail.yahoo.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.YAHOO_USER,
    pass: process.env.YAHOO_APP_PASSWORD,
  },
});

export const siteUrl = () =>
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export async function sendEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Paw Patrol Mobile Grooming" <${process.env.YAHOO_USER}>`,
    to,
    subject,
    html,
  });
}
