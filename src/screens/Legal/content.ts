/**
 * Source text for the in-app legal documents (Privacy Policy & Terms of Use).
 * Kept as structured data — not hard-coded JSX — so the same `LegalScreen`
 * renderer can present either document and copy edits stay in one place.
 *
 * The text mirrors the KJubilee.com website (`/privacy` and `/terms`); keep the
 * two in sync when either is revised.
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

const EFFECTIVE_DATE = 'June 17, 2026';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE_DATE,
  contactEmail: 'privacy@kjubilee.com',
  intro: [
    `KJubilee.com ("KJubilee," "we," "us," or "our"), operated by Jubilee Software, Inc., provides a faith-centered music streaming and discovery experience. This Privacy Policy applies to the KJubilee.com website and the services offered through it (the "Service"). By creating an account or using the Service, you agree to the practices described below.`,
  ],
  sections: [
    {
      heading: '1. Information We Collect',
      blocks: [
        { type: 'subheading', text: 'Information you provide' },
        {
          type: 'bullets',
          items: [
            'Account details. When you sign up we collect your first and last name, date of birth, and email address. Your password is stored only in a securely hashed form — we never keep it in plain text.',
            'Content you create. Comments you post, star ratings you give, award nominations (and the reasons you provide), and the playlists you build are stored and associated with your account.',
            'Communications. If you contact us for support, we keep the messages and contact details you send so we can respond.',
          ],
        },
        { type: 'subheading', text: 'Information collected automatically' },
        {
          type: 'bullets',
          items: [
            `Security & verification. To confirm your email and protect your account we generate one-time, 6-digit verification codes (used at sign-up and, when enabled, for two-step sign-in), and we record your "keep me signed in" preference.`,
            'Technical & usage data. Like most websites, our servers automatically log information such as your IP address, browser type and user-agent, the pages you request, and the date and time of each request. This helps us operate, secure, and improve the Service.',
            'Cookies. We use the cookies described in Section 4 to keep you signed in and to protect requests against forgery.',
          ],
        },
        { type: 'subheading', text: 'Information from sign-in providers' },
        {
          type: 'paragraph',
          text: 'If you choose to continue with JubileeInspire Single Sign-On (SSO), we receive basic profile information (such as your name and email address) from your JubileeInspire account so we can create or link your KJubilee profile. Your KJubilee and JubileeInspire accounts may be kept in sync as part of the Jubilee family of services.',
        },
      ],
    },
    {
      heading: '2. How We Use Your Information',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Create and manage your account, authenticate you, and keep your session secure.',
            'Provide the core experience — streaming the catalog and saving your playlists, ratings, comments, and nominations.',
            'Send you service-related (transactional) email, such as verification codes, password-reset links, and important account or security notices.',
            'Detect, prevent, and respond to fraud, abuse, and security incidents.',
            'Maintain, analyze, and improve the Service.',
            'Comply with legal obligations and enforce our terms.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We do not use your personal information to serve third-party advertising, and we do not sell your personal information.',
        },
      ],
    },
    {
      heading: '3. Email Communications',
      blocks: [
        {
          type: 'paragraph',
          text: 'The emails we send (verification codes, password resets, and security notices) are necessary to operate your account and are delivered on our behalf by a third-party email provider (currently SendGrid). These transactional messages are part of the Service and are not marketing email. If we ever introduce optional newsletters or promotional email, you will be able to opt out at any time.',
        },
      ],
    },
    {
      heading: '4. Cookies and Similar Technologies',
      blocks: [
        {
          type: 'paragraph',
          text: 'We rely on a small number of strictly necessary cookies; we do not use advertising or cross-site tracking cookies.',
        },
        {
          type: 'bullets',
          items: [
            'Session cookies. Secure, HTTP-only cookies that keep you signed in as you move between pages.',
            'CSRF token cookie (jv_csrf). A security cookie used to protect form submissions and other actions against cross-site request forgery.',
            'Bot-protection. Our sign-in page may use Cloudflare Turnstile to tell humans from automated abuse; Cloudflare may set its own cookie for this purpose.',
          ],
        },
        {
          type: 'paragraph',
          text: 'You can block or delete cookies in your browser settings, but disabling the essential cookies above will prevent you from signing in or using account features.',
        },
      ],
    },
    {
      heading: '5. How We Share Information',
      blocks: [
        { type: 'paragraph', text: 'We share personal information only in these limited situations:' },
        {
          type: 'bullets',
          items: [
            'Service providers. Vendors who process data on our behalf and under our instructions — for example our email delivery provider (SendGrid), security and content delivery (Cloudflare), and our hosting infrastructure.',
            'The Jubilee family of services. If you use JubileeInspire SSO, account information is shared with JubileeInspire to provide and synchronize your single sign-on.',
            'Legal and safety. When we reasonably believe disclosure is required by law, legal process, or to protect the rights, property, or safety of our users, the public, or KJubilee.',
            'Business transfers. In connection with a merger, acquisition, or sale of assets, in which case we will continue to protect your information consistent with this policy.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Public content you create (such as comments and ratings) may be visible to other users of the Service.',
        },
      ],
    },
    {
      heading: '6. Data Retention',
      blocks: [
        {
          type: 'paragraph',
          text: 'We keep your personal information for as long as your account is active or as needed to provide the Service, comply with our legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we remove your account and its associated data as described in Section 7, except where we are required or permitted by law to retain certain records.',
        },
      ],
    },
    {
      heading: '7. Your Choices and Rights',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Access and update. You can view your sign-in email and update your password from your account page.',
            `Delete your account. You can permanently delete your account and its associated data at any time from the "Danger zone" on your account page. This action cannot be undone.`,
            'Email. Transactional email is required to operate your account; any optional email will include an unsubscribe link.',
            'Regional rights. Depending on where you live (for example under the GDPR or CCPA/CPRA), you may have rights to access, correct, delete, port, or restrict the processing of your personal information, and to object to certain uses. To exercise these rights, contact us using the details below.',
          ],
        },
      ],
    },
    {
      heading: '8. Data Security',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use technical and organizational safeguards designed to protect your information, including encryption of data in transit (HTTPS/TLS), hashed password storage, CSRF protection, and optional two-step verification. No method of transmission or storage is completely secure, however, so we cannot guarantee absolute security.',
        },
      ],
    },
    {
      heading: "9. Children's Privacy",
      blocks: [
        {
          type: 'paragraph',
          text: "While our catalog includes music made for children and families, the Service itself is intended for users who are old enough to maintain their own account. We do not knowingly collect personal information from children under the age of 13 (or the minimum age required in your jurisdiction). If you believe a child has provided us personal information, please contact us and we will take steps to delete it. Parents and guardians are encouraged to supervise children's use of the Service.",
        },
      ],
    },
    {
      heading: '10. International Users',
      blocks: [
        {
          type: 'paragraph',
          text: 'KJubilee.com is operated from the United States. If you access the Service from outside the United States, you understand that your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate, which may have data protection laws different from those in your country.',
        },
      ],
    },
    {
      heading: '11. Changes to This Policy',
      blocks: [
        {
          type: 'paragraph',
          text: `We may update this Privacy Policy from time to time. When we make material changes, we will revise the "Effective" date above and, where appropriate, provide additional notice. Your continued use of the Service after an update takes effect means you accept the revised policy.`,
        },
      ],
    },
    {
      heading: '12. Contact Us',
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
    `Welcome to KJubilee.com. These Terms of Use ("Terms") are a legal agreement between you and Jubilee Software, Inc. ("KJubilee," "we," "us," or "our") governing your access to and use of the KJubilee.com website and the faith-centered music streaming and discovery services offered through it (the "Service"). Please also review our Privacy Policy, which explains how we handle your information and is incorporated into these Terms by reference.`,
  ],
  sections: [
    {
      heading: '1. Acceptance of These Terms',
      blocks: [
        {
          type: 'paragraph',
          text: 'By creating an account, accessing, or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Service. If you are using the Service on behalf of an organization, you represent that you are authorized to accept these Terms on its behalf.',
        },
      ],
    },
    {
      heading: '2. Eligibility',
      blocks: [
        {
          type: 'paragraph',
          text: 'You must be at least 13 years old (or the minimum age required in your country) to create an account and use the Service. If you are a minor in your jurisdiction, you may use the Service only with the involvement and consent of a parent or legal guardian. By using the Service, you represent that you meet these requirements.',
        },
      ],
    },
    {
      heading: '3. Your Account',
      blocks: [
        {
          type: 'bullets',
          items: [
            'You agree to provide accurate, current, and complete information when you register and to keep it up to date.',
            'You are responsible for safeguarding your password and for all activity that occurs under your account. We recommend enabling two-step verification where available.',
            "You may sign in using JubileeInspire Single Sign-On (SSO); your use of that option is also subject to JubileeInspire's own terms.",
            'Notify us promptly of any unauthorized use of your account or any other breach of security.',
            'You may manage your password and permanently delete your account at any time from your account page.',
          ],
        },
      ],
    },
    {
      heading: '4. License to Use the Service',
      blocks: [
        {
          type: 'paragraph',
          text: 'Subject to your compliance with these Terms, we grant you a limited, personal, non-exclusive, non-transferable, revocable license to access and stream the content made available through the Service for your own personal, non-commercial enjoyment. This license does not transfer any ownership to you.',
        },
      ],
    },
    {
      heading: '5. Content and Intellectual Property',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service and all of its content — including music, recordings, lyrics, artwork, album titles, artist and persona names, text, graphics, logos, and software — are owned by Jubilee Software, Inc., its affiliates, artists, or licensors and are protected by copyright, trademark, and other laws. Except as expressly permitted by these Terms, you may not copy, download, reproduce, distribute, publicly perform, broadcast, sell, rent, modify, create derivative works from, or otherwise exploit any part of the Service or its content without our prior written permission.',
        },
      ],
    },
    {
      heading: '6. Your Content',
      blocks: [
        {
          type: 'paragraph',
          text: `The Service lets you contribute content such as comments, star ratings, award nominations, and playlists ("User Content"). You retain ownership of your User Content, but by submitting it you grant KJubilee a worldwide, royalty-free, non-exclusive license to host, store, display, reproduce, and use that content as needed to operate and improve the Service.`,
        },
        { type: 'paragraph', text: 'You are solely responsible for your User Content, and you represent that:' },
        {
          type: 'bullets',
          items: [
            'you own it or have the rights necessary to submit it; and',
            "it does not infringe anyone's rights or violate any law or these Terms.",
          ],
        },
        {
          type: 'paragraph',
          text: 'We may, but are not obligated to, review, moderate, or remove User Content that we believe violates these Terms or is otherwise objectionable.',
        },
      ],
    },
    {
      heading: '7. Acceptable Use',
      blocks: [
        { type: 'paragraph', text: 'When using the Service, you agree that you will not:' },
        {
          type: 'bullets',
          items: [
            'use the Service for any unlawful purpose or in violation of these Terms;',
            'copy, record, download, scrape, or redistribute the music or other content except where a feature expressly allows it;',
            'circumvent, disable, or interfere with security, authentication, or access-control features (including bot-protection);',
            'attempt to gain unauthorized access to any account, system, or network related to the Service;',
            "upload or transmit viruses, malicious code, or content that is hateful, harassing, obscene, defamatory, or that infringes others' rights;",
            'use bots, scrapers, or automated means to access the Service in a way that burdens our infrastructure; or',
            'impersonate any person or misrepresent your affiliation with anyone.',
          ],
        },
      ],
    },
    {
      heading: '8. Third-Party Services',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service relies on, or may link to, third-party services (for example JubileeInspire SSO, Cloudflare for security, and our email provider). Your use of those services may be governed by their own terms and privacy policies, and we are not responsible for their content or practices.',
        },
      ],
    },
    {
      heading: '9. Suspension and Termination',
      blocks: [
        {
          type: 'paragraph',
          text: 'You may stop using the Service and delete your account at any time. We may suspend or terminate your access to the Service, with or without notice, if we believe you have violated these Terms or to protect the Service or other users. Upon termination, the license granted to you ends, but any provisions that by their nature should survive (such as intellectual-property, disclaimer, liability, and governing-law sections) will continue to apply.',
        },
      ],
    },
    {
      heading: '10. Disclaimers',
      blocks: [
        {
          type: 'paragraph',
          text: `The Service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free, or that any content will always be available.`,
        },
      ],
    },
    {
      heading: '11. Limitation of Liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the fullest extent permitted by law, KJubilee and its affiliates, officers, employees, artists, and licensors will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, use, goodwill, or profits, arising out of or relating to your use of (or inability to use) the Service. Our total liability for any claim relating to the Service will not exceed one hundred U.S. dollars (US $100) or the amount you paid us, if any, in the twelve months before the claim, whichever is greater.',
        },
      ],
    },
    {
      heading: '12. Indemnification',
      blocks: [
        {
          type: 'paragraph',
          text: 'You agree to indemnify and hold harmless KJubilee and its affiliates from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the Service, your User Content, or your violation of these Terms or applicable law.',
        },
      ],
    },
    {
      heading: '13. Changes to the Service and These Terms',
      blocks: [
        {
          type: 'paragraph',
          text: `We may modify, suspend, or discontinue all or part of the Service at any time. We may also update these Terms from time to time; when we make material changes we will revise the "Effective" date above and, where appropriate, provide additional notice. Your continued use of the Service after an update takes effect means you accept the revised Terms.`,
        },
      ],
    },
    {
      heading: '14. Governing Law',
      blocks: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of the United States and the State in which Jubilee Software, Inc. is established, without regard to conflict-of-laws principles. You agree to the exclusive jurisdiction of the courts located there for any dispute not subject to arbitration or small-claims resolution, to the extent permitted by applicable law.',
        },
      ],
    },
    {
      heading: '15. Contact Us',
      blocks: [
        { type: 'paragraph', text: 'If you have any questions about these Terms, please contact us:' },
        { type: 'paragraph', text: 'Jubilee Software, Inc.' },
        { type: 'paragraph', text: 'Legal inquiries: legal@kjubilee.com' },
      ],
    },
  ],
};
