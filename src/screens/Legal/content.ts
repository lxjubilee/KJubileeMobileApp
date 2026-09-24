/**
 * Source text for the in-app legal documents (Privacy Policy & Terms of Use).
 * Kept as structured data — not hard-coded JSX — so the same `LegalScreen`
 * renderer can present either document and copy edits stay in one place.
 *
 * DRAFT PENDING LEGAL REVIEW. This text was rewritten on 2026-09-24 to describe
 * what the KJubilee radio app actually does (it previously mirrored the
 * website's music-streaming policy, with playlists, ratings and nominations the
 * app does not have). It must be approved by Jubilee Software's legal owner,
 * and kjubilee.com/privacy and /terms — which App Store Connect links to —
 * updated to match, before release.
 */

/** A single rendered block within a section: a paragraph, sub-heading, or list. */
export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'bullets'; items: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Human-readable effective date shown under the title. */
  effectiveDate: string;
  /** Lead paragraph(s) shown before the numbered sections. */
  intro: string[];
  sections: LegalSection[];
  /** Address used in the closing "Contact us" section. */
  contactEmail: string;
}

const EFFECTIVE_DATE = 'September 24, 2026';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE_DATE,
  contactEmail: 'privacy@kjubilee.com',
  intro: [
    `KJubilee ("KJubilee," "we," "us," or "our"), operated by Jubilee Software, Inc., is a faith-centered internet radio network. This Privacy Policy explains what information the KJubilee mobile app and the KJubilee.com website (together, the "Service") collect, how we use it, and the choices you have.`,
    'You can listen to every station without an account. We only ask for personal information if you choose to sign in or create a Jubilee ID.',
  ],
  sections: [
    {
      heading: '1. Information We Collect',
      blocks: [
        { type: 'subheading', text: 'When you listen' },
        {
          type: 'paragraph',
          text: 'To deliver a station to you, our servers and content delivery network receive standard technical information with each request, such as your IP address, device type and operating system, app version, and the date and time of the request. This happens whether or not you are signed in.',
        },
        { type: 'subheading', text: 'If you create a Jubilee ID or sign in' },
        {
          type: 'bullets',
          items: [
            'Account details. Your first and last name, date of birth, and email address. Your password is sent over an encrypted connection and stored on our servers only in a securely hashed form — we never keep it in plain text.',
            'Favourite stations. The stations you mark with the heart are saved to your account so they appear on your other devices and on KJubilee.com.',
            'Sign-in device information. When you sign in, the app sends your platform (iOS or Android), a generic device label, and a random identifier the app creates, so we can manage your signed-in sessions. It is not your device’s hardware or advertising identifier.',
            'Verification codes. We send one-time codes to your email to confirm your address and, when needed, to verify a sign-in.',
          ],
        },
        { type: 'subheading', text: 'Station likes' },
        {
          type: 'paragraph',
          text: 'When you like or un-like a station (the thumb), we record the station, the action, the time, and a random session identifier that resets each time the app starts. If you are signed in, the event is also linked to your account. Your likes themselves are remembered on your device.',
        },
        { type: 'subheading', text: 'Human verification' },
        {
          type: 'paragraph',
          text: 'The sign-in and password-reset screens use Cloudflare Turnstile to tell people from automated abuse. Cloudflare processes technical signals from your device for this purpose under its own privacy policy.',
        },
        { type: 'subheading', text: 'Support' },
        {
          type: 'paragraph',
          text: 'If you contact us, we keep your messages and contact details so we can respond.',
        },
        { type: 'subheading', text: 'What we do not collect' },
        {
          type: 'paragraph',
          text: 'The app does not access your location, contacts, photos, camera, or microphone. It does not use your device’s advertising identifier, contains no advertising or third-party analytics software, and does not track you across other companies’ apps or websites.',
        },
      ],
    },
    {
      heading: '2. How We Use Your Information',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Stream stations to you and keep the broadcast in sync.',
            'Create and manage your account, sign you in, and keep your session secure.',
            'Save and sync your favourite stations.',
            'Understand which stations listeners like, so we can improve programming.',
            'Send service email, such as verification codes, password-reset links, and important account or security notices.',
            'Detect, prevent, and respond to fraud, abuse, and security incidents.',
            'Comply with legal obligations and enforce our terms.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We do not use your personal information for advertising, and we do not sell your personal information.',
        },
      ],
    },
    {
      heading: '3. Information Stored on Your Device',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Sign-in credentials. When you sign in, the app keeps your session tokens in your device’s secure storage (the iOS Keychain or Android Keystore) so you stay signed in. They are removed when you sign out.',
            'Preferences. Your language, your station likes, and a copy of your favourite stations are kept in the app’s own storage so they appear instantly.',
            'Deleting the app removes this information from your device.',
          ],
        },
      ],
    },
    {
      heading: '4. Email Communications',
      blocks: [
        {
          type: 'paragraph',
          text: 'The emails we send (verification codes, password resets, and security notices) are necessary to operate your account and are delivered on our behalf by a third-party email provider (currently SendGrid). These are not marketing emails. If we ever introduce optional newsletters, you will be able to opt out at any time.',
        },
      ],
    },
    {
      heading: '5. Cookies',
      blocks: [
        {
          type: 'paragraph',
          text: 'On KJubilee.com we use a small number of strictly necessary cookies to keep you signed in and to protect forms against cross-site request forgery; Cloudflare may set its own cookie for bot protection. The app keeps the sign-in cookies our server sets for use within the app only. We do not use advertising or cross-site tracking cookies.',
        },
      ],
    },
    {
      heading: '6. How We Share Information',
      blocks: [
        { type: 'paragraph', text: 'We share personal information only in these limited situations:' },
        {
          type: 'bullets',
          items: [
            'Service providers. Vendors who process data on our behalf and under our instructions — our email provider (SendGrid), security and content delivery (Cloudflare), and our hosting infrastructure.',
            'The Jubilee family of services. A Jubilee ID works across Jubilee services. If you sign in with an existing Jubilee ID, basic account information (such as your name and email address) is shared with JubileeInspire, which provides Jubilee ID sign-in, to create or link your KJubilee account and keep it in sync.',
            'Legal and safety. When we reasonably believe disclosure is required by law, legal process, or to protect the rights, property, or safety of our users, the public, or KJubilee.',
            'Business transfers. In connection with a merger, acquisition, or sale of assets, in which case we will continue to protect your information consistent with this policy.',
          ],
        },
      ],
    },
    {
      heading: '7. Data Retention',
      blocks: [
        {
          type: 'paragraph',
          text: 'We keep your account information for as long as your account is active or as needed to provide the Service, comply with our legal obligations, resolve disputes, and enforce our agreements. Technical request logs and station-like records are kept only as long as needed to operate and improve the Service. When you delete your account, we delete your account and its associated data, except where we are required or permitted by law to retain certain records.',
        },
      ],
    },
    {
      heading: '8. Your Choices and Rights',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Listen without an account. Every station is available without signing in.',
            'Update your details. You can change your name and password from Profile in the app, or from your account page on KJubilee.com.',
            'Delete your account. You can permanently delete your account and its associated data at any time in the app (Profile → Delete account) or on KJubilee.com. This cannot be undone.',
            'Sign out. Signing out removes your sign-in credentials from the device.',
            'Regional rights. Depending on where you live (for example under the GDPR or CCPA/CPRA), you may have rights to access, correct, delete, port, or restrict the processing of your personal information, and to object to certain uses. To exercise these rights, contact us using the details below.',
          ],
        },
      ],
    },
    {
      heading: '9. Data Security',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use technical and organizational safeguards designed to protect your information, including encryption in transit (HTTPS/TLS), hashed password storage, secure on-device storage for sign-in credentials, and bot protection on sign-in. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.',
        },
      ],
    },
    {
      heading: "10. Children's Privacy",
      blocks: [
        {
          type: 'paragraph',
          text: "Our network includes stations made for children and families, and anyone can listen without an account. Creating a Jubilee ID is intended for users who are old enough to maintain their own account. We do not knowingly collect personal information from children under the age of 13 (or the minimum age required in your jurisdiction). If you believe a child has provided us personal information, please contact us and we will delete it. Parents and guardians are encouraged to supervise children's use of the Service.",
        },
      ],
    },
    {
      heading: '11. International Users',
      blocks: [
        {
          type: 'paragraph',
          text: 'KJubilee is operated from the United States. If you use the Service from outside the United States, your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate, which may have data protection laws different from those in your country.',
        },
      ],
    },
    {
      heading: '12. Changes to This Policy',
      blocks: [
        {
          type: 'paragraph',
          text: `We may update this Privacy Policy from time to time. When we make material changes, we will revise the "Effective" date above and, where appropriate, provide additional notice in the app. Your continued use of the Service after an update takes effect means you accept the revised policy.`,
        },
      ],
    },
    {
      heading: '13. Contact Us',
      blocks: [
        {
          type: 'paragraph',
          text: 'If you have questions or requests regarding this Privacy Policy or your personal information, contact us:',
        },
        { type: 'paragraph', text: 'Jubilee Software, Inc.' },
        { type: 'paragraph', text: 'Privacy inquiries: privacy@kjubilee.com' },
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  title: 'Terms of Use',
  effectiveDate: EFFECTIVE_DATE,
  contactEmail: 'legal@kjubilee.com',
  intro: [
    `Welcome to KJubilee. These Terms of Use ("Terms") are a legal agreement between you and Jubilee Software, Inc. ("KJubilee," "we," "us," or "our") governing your use of the KJubilee mobile app, the KJubilee.com website, and the faith-centered internet radio stations offered through them (the "Service"). Please also review our Privacy Policy, which explains how we handle your information and is incorporated into these Terms by reference.`,
  ],
  sections: [
    {
      heading: '1. Acceptance of These Terms',
      blocks: [
        {
          type: 'paragraph',
          text: 'By using the Service or creating an account, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Service.',
        },
      ],
    },
    {
      heading: '2. Eligibility',
      blocks: [
        {
          type: 'paragraph',
          text: 'Anyone may listen to the Service. You must be at least 13 years old (or the minimum age required in your country) to create an account. If you are a minor in your jurisdiction, you may create an account only with the involvement and consent of a parent or legal guardian.',
        },
      ],
    },
    {
      heading: '3. Your Account',
      blocks: [
        {
          type: 'bullets',
          items: [
            'An account is optional. It lets you save favourite stations across your devices.',
            'You agree to provide accurate, current, and complete information when you register and to keep it up to date.',
            'You are responsible for safeguarding your password and for all activity that occurs under your account.',
            'Your Jubilee ID also works across other Jubilee services; your use of those services is subject to their own terms.',
            'Notify us promptly of any unauthorized use of your account.',
            'You may permanently delete your account at any time in the app (Profile → Delete account) or on KJubilee.com.',
          ],
        },
      ],
    },
    {
      heading: '4. License to Use the Service',
      blocks: [
        {
          type: 'paragraph',
          text: 'Subject to your compliance with these Terms, we grant you a limited, personal, non-exclusive, non-transferable, revocable license to use the app and listen to the stations made available through the Service for your own personal, non-commercial enjoyment. This license does not transfer any ownership to you.',
        },
      ],
    },
    {
      heading: '5. Content and Intellectual Property',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service and all of its content — including broadcasts, music, recordings, lyrics, station names and frequencies, host and persona names, artwork, text, graphics, logos, and software — are owned by Jubilee Software, Inc., its affiliates, artists, or licensors and are protected by copyright, trademark, and other laws. Except as expressly permitted by these Terms, you may not copy, record, reproduce, distribute, rebroadcast, publicly perform, sell, modify, create derivative works from, or otherwise exploit any part of the Service or its content without our prior written permission.',
        },
      ],
    },
    {
      heading: '6. Acceptable Use',
      blocks: [
        { type: 'paragraph', text: 'When using the Service, you agree that you will not:' },
        {
          type: 'bullets',
          items: [
            'use the Service for any unlawful purpose or in violation of these Terms;',
            'record, download, scrape, or rebroadcast the stations or other content;',
            'circumvent, disable, or interfere with security, authentication, or access-control features (including bot protection);',
            'attempt to gain unauthorized access to any account, system, or network related to the Service;',
            'use bots, scrapers, or automated means to access the Service in a way that burdens our infrastructure; or',
            'impersonate any person or misrepresent your affiliation with anyone.',
          ],
        },
      ],
    },
    {
      heading: '7. Third-Party Services',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service relies on third-party services (for example Jubilee ID sign-in provided by JubileeInspire, Cloudflare for security and content delivery, and our email provider). Your use of those services may be governed by their own terms and privacy policies, and we are not responsible for their content or practices.',
        },
      ],
    },
    {
      heading: '8. Suspension and Termination',
      blocks: [
        {
          type: 'paragraph',
          text: 'You may stop using the Service and delete your account at any time. We may suspend or terminate your access to the Service, with or without notice, if we believe you have violated these Terms or to protect the Service or other users. Upon termination, the license granted to you ends, but any provisions that by their nature should survive (such as intellectual-property, disclaimer, liability, and governing-law sections) will continue to apply.',
        },
      ],
    },
    {
      heading: '9. Disclaimers',
      blocks: [
        {
          type: 'paragraph',
          text: `The Service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free, or that any station or content will always be available.`,
        },
      ],
    },
    {
      heading: '10. Limitation of Liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the fullest extent permitted by law, KJubilee and its affiliates, officers, employees, artists, and licensors will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, use, goodwill, or profits, arising out of or relating to your use of (or inability to use) the Service. Our total liability for any claim relating to the Service will not exceed one hundred U.S. dollars (US $100) or the amount you paid us, if any, in the twelve months before the claim, whichever is greater.',
        },
      ],
    },
    {
      heading: '11. Indemnification',
      blocks: [
        {
          type: 'paragraph',
          text: 'You agree to indemnify and hold harmless KJubilee and its affiliates from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the Service or your violation of these Terms or applicable law.',
        },
      ],
    },
    {
      heading: '12. Changes to the Service and These Terms',
      blocks: [
        {
          type: 'paragraph',
          text: `We may modify, suspend, or discontinue all or part of the Service, including individual stations, at any time. We may also update these Terms from time to time; when we make material changes we will revise the "Effective" date above and, where appropriate, provide additional notice. Your continued use of the Service after an update takes effect means you accept the revised Terms.`,
        },
      ],
    },
    {
      heading: '13. Governing Law',
      blocks: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of the United States and the State in which Jubilee Software, Inc. is established, without regard to conflict-of-laws principles. You agree to the exclusive jurisdiction of the courts located there for any dispute not subject to arbitration or small-claims resolution, to the extent permitted by applicable law.',
        },
      ],
    },
    {
      heading: '14. Contact Us',
      blocks: [
        { type: 'paragraph', text: 'If you have any questions about these Terms, please contact us:' },
        { type: 'paragraph', text: 'Jubilee Software, Inc.' },
        { type: 'paragraph', text: 'Legal inquiries: legal@kjubilee.com' },
      ],
    },
  ],
};
