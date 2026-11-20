import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';

/// Shared side navigation matching the web Layout sidebar.
class AppSideNav extends StatelessWidget {
  const AppSideNav({
    super.key,
    required this.location,
    this.asDrawer = false,
  });

  final String location;
  final bool asDrawer;

  void _go(BuildContext context, String path) {
    if (asDrawer) Navigator.of(context).pop();
    // Profile / messages are full-screen routes; others stay in the shell.
    if (path == '/profile' || path == '/messages' || path == '/login') {
      context.push(path);
    } else {
      context.go(path);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          SocialUi.pagePad,
          SocialUi.pagePad,
          SocialUi.pagePad,
          SocialUi.pagePad,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (asDrawer) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 4, SocialUi.sectionGap),
                child: Row(
                  children: [
                    SvgPicture.asset(
                      kSampleLogoAsset,
                      height: 28,
                      fit: BoxFit.contain,
                      semanticsLabel: 'GemBook',
                    ),
                    const SizedBox(width: 10),
                    Text('GemBook', style: SocialUi.nameStyle),
                    const Spacer(),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close, color: SocialUi.mute),
                    ),
                  ],
                ),
              ),
            ],
            _nav(context, Icons.home_outlined, 'Feed', '/'),
            _nav(context, Icons.shopping_bag_outlined, 'Marketplace',
                '/marketplace'),
            _nav(context, Icons.storefront_outlined, 'Vendors', '/vendors'),
            _nav(context, Icons.groups_outlined, 'Community', '/community'),
            _nav(context, Icons.newspaper_outlined, 'News', '/news'),
            _nav(context, Icons.event_outlined, 'Events', '/events'),
            const SizedBox(height: SocialUi.sectionGap),
            const Divider(height: 1, color: SocialUi.hairline),
            const SizedBox(height: SocialUi.sectionGap),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'PROFESSIONAL',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                  color: AppColors.slate400,
                ),
              ),
            ),
            const SizedBox(height: SocialUi.feedGap),
            _nav(context, Icons.dashboard_outlined, 'Dashboard',
                '/vendor/dashboard'),
            _nav(context, Icons.diamond_outlined, 'My Gems', '/my-gems'),
            _nav(context, Icons.person_outline, 'My Profile', '/profile'),
            _nav(context, Icons.chat_bubble_outline, 'Messages', '/messages'),
          ],
        ),
      ),
    );

    if (!asDrawer) {
      return Container(
        width: 256,
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(right: BorderSide(color: AppColors.slate200)),
        ),
        child: body,
      );
    }

    return Drawer(
      backgroundColor: Colors.white,
      width: 300,
      child: body,
    );
  }

  Widget _nav(
    BuildContext context,
    IconData icon,
    String label,
    String path,
  ) {
    final active = location == path ||
        (path != '/' && location.startsWith(path));
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: active ? AppColors.primarySoft : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: () => _go(context, path),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: active ? AppColors.primary : AppColors.slate600,
                ),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: active ? AppColors.primary : AppColors.slate600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
