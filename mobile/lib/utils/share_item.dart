import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/api_config.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';

/// Public web URL for a listing (API host also serves the SPA in production).
String listingShareUrl(String listingId) =>
    '${ApiConfig.baseUrl}/listings/$listingId';

String postShareUrl([String? postId]) {
  final base = ApiConfig.baseUrl;
  if (postId == null || postId.isEmpty) return base;
  return '$base/?post=$postId';
}

/// Bottom sheet: Copy link · WhatsApp · More (OS share sheet).
Future<void> showItemShareSheet(
  BuildContext context, {
  required String title,
  required String url,
  String? message,
}) {
  final text = (message ?? 'Check out $title on GemBook').trim();
  final shareBody = '$text\n$url';

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: SocialUi.hairline,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const Text(
                  'Share',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      color: SocialUi.mute,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                _ShareOption(
                  icon: Icons.link_rounded,
                  label: 'Copy link',
                  subtitle: 'Copy item URL to clipboard',
                  onTap: () async {
                    await Clipboard.setData(ClipboardData(text: url));
                    if (sheetContext.mounted) Navigator.pop(sheetContext);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Link copied'),
                          behavior: SnackBarBehavior.floating,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                ),
                _ShareOption(
                  icon: Icons.chat_rounded,
                  iconColor: const Color(0xFF25D366),
                  label: 'WhatsApp',
                  subtitle: 'Share via WhatsApp',
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    final uri = Uri.parse(
                      'https://wa.me/?text=${Uri.encodeComponent(shareBody)}',
                    );
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  },
                ),
                _ShareOption(
                  icon: Icons.ios_share_rounded,
                  label: 'More…',
                  subtitle: 'Messages, Telegram, Mail, and more',
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await Share.share(shareBody, subject: title);
                  },
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _ShareOption extends StatelessWidget {
  const _ShareOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      visualDensity: VisualDensity.compact,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.slate50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 18, color: iconColor ?? AppColors.slate700),
      ),
      title: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 14,
          color: AppColors.slate900,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: SocialUi.mute),
      ),
      onTap: onTap,
    );
  }
}
