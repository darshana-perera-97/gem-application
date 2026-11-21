import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/profile/phone_verify_dialog.dart';
import '../widgets/profile/seller_profile_view.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.isSignedIn) {
      return Padding(
        padding: SocialUi.pageInsets,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: PageCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.person_outline_rounded,
                        size: 32, color: AppColors.primary),
                  ),
                  const SizedBox(height: SocialUi.sectionGap),
                  Text('Your account', style: SocialUi.pageTitleStyle),
                  const SizedBox(height: SocialUi.feedGap),
                  const Text(
                    'Sign in to manage your profile, listings, and Business Portal.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.slate500, height: 1.4),
                  ),
                  const SizedBox(height: SocialUi.sectionGap),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/login'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: const Text('Sign in'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final vendorId =
        '${auth.userProfile?['vendorId'] ?? auth.uid}';

    return SellerProfileView(
      vendorId: vendorId,
      isOwnProfile: true,
      settingsBuilder: (context) => const _SettingsPanel(),
    );
  }
}

class _SettingsPanel extends StatefulWidget {
  const _SettingsPanel();

  @override
  State<_SettingsPanel> createState() => _SettingsPanelState();
}

class _SettingsPanelState extends State<_SettingsPanel> {
  late final TextEditingController _name;
  late final TextEditingController _about;
  late final TextEditingController _location;
  late final TextEditingController _website;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final profile = context.read<AuthProvider>().userProfile ?? {};
    _name = TextEditingController(text: '${profile['displayName'] ?? ''}');
    _about = TextEditingController(text: '${profile['about'] ?? ''}');
    _location = TextEditingController(text: '${profile['location'] ?? ''}');
    _website = TextEditingController(text: '${profile['website'] ?? ''}');
  }

  @override
  void dispose() {
    _name.dispose();
    _about.dispose();
    _location.dispose();
    _website.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await apiPost('/api/users/profile', {
        'userId': context.read<AuthProvider>().uid,
        'displayName': _name.text.trim(),
        'about': _about.text.trim(),
        'location': _location.text.trim(),
        'website': _website.text.trim(),
      });
      await context.read<AuthProvider>().refreshSession();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Settings', style: SocialUi.pageTitleStyle),
        const SizedBox(height: SocialUi.sectionGap),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Display name'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        TextField(
          controller: _about,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'About'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        TextField(
          controller: _location,
          decoration: const InputDecoration(labelText: 'Location'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        TextField(
          controller: _website,
          decoration: const InputDecoration(labelText: 'Website'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text('${auth.userProfile?['email'] ?? 'No email'}'),
          subtitle: const Text('Email'),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text('${auth.userProfile?['phone'] ?? 'No phone'}'),
          subtitle: const Text('Phone'),
          trailing: TextButton(
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => PhoneVerifyDialog(
                  userId: auth.uid ?? '',
                  initialPhone: '${auth.userProfile?['phone'] ?? ''}',
                  onClose: () {},
                  onVerified: () async {
                    await auth.refreshSession();
                  },
                ),
              );
            },
            child: const Text('Update'),
          ),
        ),
        const SizedBox(height: SocialUi.feedGap),
        ElevatedButton(
          onPressed: _busy ? null : _save,
          child: _busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Save changes'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        OutlinedButton(
          onPressed: () async {
            await apiPost('/api/users/vendor', {'userId': auth.uid});
            await auth.refreshSession();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Vendor application submitted')),
              );
            }
          },
          child: const Text('Apply as vendor'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        TextButton(
          onPressed: () async {
            await auth.logout();
            if (context.mounted) context.go('/login');
          },
          child: const Text('Sign out',
              style: TextStyle(color: Color(0xFFEF4444))),
        ),
        TextButton(
          onPressed: () async {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) {
                final controller = TextEditingController();
                return AlertDialog(
                  title: const Text('Delete account'),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Type DELETE to confirm.'),
                        TextField(controller: controller),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(
                          ctx, controller.text.trim() == 'DELETE'),
                      child: const Text('Delete'),
                    ),
                  ],
                );
              },
            );
            if (confirm == true) {
              await auth.deleteAccount(
                reason: 'user_request',
                details: '',
                confirmation: 'DELETE',
              );
              if (context.mounted) context.go('/login');
            }
          },
          child: const Text('Delete account',
              style: TextStyle(color: Color(0xFFEF4444))),
        ),
      ],
    );
  }
}
