import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const UPDATED = '7 November 2026';
const CONTACT_EMAIL = 'hello@aipulse.com';

const SECTIONS = [
  {
    title: 'Who we are',
    body: [
      'GemBook is a marketplace and professional community for the Ceylon gem trade. This policy explains what information the GemBook website and its API collect, why we use it, and the choices you have.',
      'GemBook is the controller of the account, listing, and community information stored for the service. Sign-in with Google or a phone number is also processed by Google Firebase, as described below.',
    ],
  },
  {
    title: 'Information you give us',
    body: [
      'When you create an account we store the details needed to recognise you. Google sign-in provides your name, email address, profile photo, and Google account identifier. Email sign-in provides the address you enter. Phone sign-in provides the number you enter and is verified by Firebase. We do not ask you to create a password.',
      'Your profile keeps a display name, photo, role (member or vendor), and, when you have linked one, an email address or phone number. If you apply to sell, we record that request and a pending or verified vendor status.',
      'What you publish is stored with your account. That includes gem listings (title, stone details, price, photos, and location), vendor business name and description, feed posts, comments, and reviews. Direct messages are stored with the conversation they belong to and are shown to the people in that conversation.',
      'You can also like posts, follow people or vendors, save listings, join community groups, join discussions, and RSVP to events. We store those actions so the product can show them back to you and to others where the feature is public.',
    ],
  },
  {
    title: 'Information collected automatically',
    body: [
      'After you sign in, the API sets an HttpOnly cookie named gem_session. It holds a signed session that lasts 14 days so you stay signed in. During Google sign-in we also set a short-lived cookie named gem_oauth_state so we can confirm the sign-in started on our site. We do not use these cookies for advertising.',
      'Email sign-in sends a 6-digit code to your inbox. We store only a hash of that code, with the address it was sent to. The record expires after 10 minutes and is deleted once you sign in or the code is no longer valid. The code itself is not kept.',
      'The API records when an account was created and when it was last active. Like any web service, the server may log the time of a request and a technical error if something fails. Firebase may set its own cookies or local storage while it completes phone verification.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use this information to run GemBook: to create and protect your account, show the feed, marketplace, vendor profiles, and community, deliver messages, and send the sign-in code you requested.',
      'We use it to tell members from vendors, to show public professional profiles, and to review vendor applications. We also use it to investigate reports of misuse, keep the service reliable, and understand which features are used.',
      'We do not sell personal information, and we do not use it to build advertising profiles.',
    ],
  },
  {
    title: 'Who can see it',
    body: [
      'Your display name, photo, role, listings, vendor profile, posts, comments, and reviews are visible to other people using GemBook. Messages stay with the participants in that conversation.',
      'Email addresses and phone numbers are used to sign you in and are shown on your own account page. They are not published on public vendor or listing pages.',
      'People who operate GemBook can access stored information when they need to run the service, respond to a support or privacy request, or look into a report or a security problem.',
    ],
  },
  {
    title: 'Service providers',
    body: [
      'Google handles Google sign-in and Firebase handles phone verification. When you use those options, Google receives the sign-in details needed to confirm it is you, under Google’s own terms and privacy policy. A sign-in code is sent through the email service configured for GemBook, which receives the address and the message.',
      'Account and marketplace data is stored in our database. These providers process information only so GemBook can function. Some of them, including Google, may process data outside Sri Lanka.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'Account, profile, listing, post, and message records are kept while your account is active and the content remains on GemBook. Sign-in codes are kept only for the short verification window described above. The session cookie expires after 14 days, or sooner if you sign out.',
      'You can delete your account from your profile. We ask why you are leaving and ask you to confirm before anything is removed. That feedback is kept without your name, email, phone number, or account id. We then delete the account and the personal information we no longer need, and we detach your name from posts, comments, and reviews that other people still rely on. We may keep a limited record where we must do so for security, to resolve a dispute, or to meet a legal duty.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'You can browse much of the marketplace without an account. Sign-in is required for actions that are tied to you, such as posting, messaging, and managing a vendor profile.',
      'You can review the name, email, phone number, and photo on your profile page, and you can sign out at any time, which clears the session cookie. From that same page you can delete the account after you tell us why and confirm. You can also ask us for a copy of your account information or ask us to correct it. You can object to a use that is not required to run the service you asked for.',
      'These choices sit alongside rights you may have under Sri Lanka’s Personal Data Protection Act, No. 9 of 2022, and under other laws that apply to you.',
    ],
  },
  {
    title: 'Children',
    body: [
      'GemBook is a professional trade platform. It is not meant for anyone under 16, and we do not knowingly create accounts for children. If you believe a child has given us personal information, contact us and we will delete it.',
    ],
  },
  {
    title: 'Changes',
    body: [
      `We will update this page when our practices change. The date at the top will move with each update. The current version was published on ${UPDATED}.`,
    ],
  },
  {
    title: 'Contact',
    body: [
      `To ask a question about this policy, or to request access, correction, or deletion, email ${CONTACT_EMAIL} with the subject “Privacy request”. Include the email address or phone number on the account so we can find it.`,
    ],
  },
];

export const PrivacyPolicyPage = () => {
  return (
    <article className="max-w-3xl mx-auto pb-8">
      <Seo title={PAGE_SEO.privacy.title} description={PAGE_SEO.privacy.description} />
      <header className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10 mb-6">
        <div className="flex items-center gap-2 text-primary mb-4">
          <ShieldCheck size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">GemBook</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500 font-medium">Last updated {UPDATED}</p>
        <p className="mt-6 text-slate-600 leading-relaxed">
          This policy describes how GemBook handles personal information when you use the marketplace,
          feed, community, and messaging. It is public: you can read it before you create an account.
        </p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-8 md:px-10 py-2">
        {SECTIONS.map((section) => (
          <section key={section.title} className="py-8 border-b border-slate-100 last:border-b-0">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{section.title}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm text-slate-600 leading-relaxed">
                  {paragraph.includes(CONTACT_EMAIL)
                    ? paragraph.split(CONTACT_EMAIL).map((part, index, parts) => (
                        <React.Fragment key={index}>
                          {part}
                          {index < parts.length - 1 && (
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-bold hover:underline">
                              {CONTACT_EMAIL}
                            </a>
                          )}
                        </React.Fragment>
                      ))
                    : paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        <Link to="/login" className="font-bold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </article>
  );
};
