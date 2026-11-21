import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';

const _updated = '7 November 2026';
const _contact = 'hello@aipulse.com';

const _sections = [
  (
    'Who we are',
    [
      'GemBook is a marketplace and professional community for the Ceylon gem trade. This policy explains what information the GemBook website and its API collect, why we use it, and the choices you have.',
      'GemBook is the controller of the account, listing, and community information stored for the service. Sign-in with Google or a phone number is also processed by Google Firebase, as described below.',
    ],
  ),
  (
    'Information you give us',
    [
      'When you create an account we store the details needed to recognise you. Google sign-in provides your name, email address, profile photo, and Google account identifier. Email sign-in provides the address you enter. Phone sign-in provides the number you enter and is verified by Firebase. We do not ask you to create a password.',
      'Your profile keeps a display name, photo, role (member or vendor), and, when you have linked one, an email address or phone number. If you apply to sell, we record that request and a pending or verified vendor status.',
      'What you publish is stored with your account. That includes gem listings, vendor business details, feed posts, comments, reviews, and direct messages.',
    ],
  ),
  (
    'Information collected automatically',
    [
      'After you sign in, the API sets an HttpOnly cookie named gem_session. It holds a signed session that lasts 14 days so you stay signed in.',
      'Email sign-in sends a 6-digit code to your inbox. We store only a hash of that code. The record expires after 10 minutes.',
    ],
  ),
  (
    'How we use information',
    [
      'We use this information to run GemBook: to create and protect your account, show the feed, marketplace, vendor profiles, and community, deliver messages, and send the sign-in code you requested.',
      'We do not sell personal information, and we do not use it to build advertising profiles.',
    ],
  ),
  (
    'Contact',
    [
      'Questions about this policy can be sent to $_contact.',
    ],
  ),
];

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(SocialUi.cardRadius),
              ),
              child: const Icon(Icons.verified_user_outlined,
                  color: AppColors.primary),
            ),
            const SizedBox(width: SocialUi.sectionGap),
            const Expanded(
              child: PageHeader(
                title: 'Privacy Policy',
                subtitle: 'Updated $_updated',
              ),
            ),
          ],
        ),
        const SizedBox(height: SocialUi.sectionGap),
        ..._sections.map((section) {
          return PageCard(
            margin: const EdgeInsets.only(bottom: SocialUi.sectionGap),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.$1,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: SocialUi.sectionGap),
                ...section.$2.map(
                  (p) => Padding(
                    padding: const EdgeInsets.only(bottom: SocialUi.itemGap),
                    child: Text(
                      p,
                      style: SocialUi.bodyStyle.copyWith(
                        color: AppColors.slate600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
