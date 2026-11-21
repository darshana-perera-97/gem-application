import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/add_listing_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';

/// Minimal bottom tabs with a solid center “List” action.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final path = Uri.tryParse(location)?.path ?? location;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    final feedActive = path == '/' || path.isEmpty;
    final shopActive = path.startsWith('/marketplace');
    final vendorsActive = path.startsWith('/vendors');
    final communityActive = path.startsWith('/community');

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: SocialUi.hairline)),
        ),
        padding: EdgeInsets.only(bottom: bottomInset),
        child: SizedBox(
          height: SocialUi.navHeight,
          child: Row(
            children: [
              _TabItem(
                label: 'Feed',
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                active: feedActive,
                onTap: () => context.go('/'),
              ),
              _TabItem(
                label: 'Shop',
                icon: Icons.storefront_outlined,
                activeIcon: Icons.storefront_rounded,
                active: shopActive,
                onTap: () => context.go('/marketplace'),
              ),
              _ListFab(
                onTap: () {
                  final auth = context.read<AuthProvider>();
                  if (!auth.isSignedIn) {
                    context.push('/login');
                    return;
                  }
                  context.read<AddListingProvider>().openAddListing();
                },
              ),
              _TabItem(
                label: 'Vendors',
                icon: Icons.badge_outlined,
                activeIcon: Icons.badge_rounded,
                active: vendorsActive,
                onTap: () => context.go('/vendors'),
              ),
              _TabItem(
                label: 'Community',
                icon: Icons.groups_outlined,
                activeIcon: Icons.groups_rounded,
                active: communityActive,
                onTap: () => context.go('/community'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ListFab extends StatelessWidget {
  const _ListFab({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(14),
                boxShadow: SocialUi.primaryShadow,
              ),
              child: const Icon(Icons.add_rounded, color: Colors.white, size: 26),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : SocialUi.mute;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: active ? 1.05 : 1.0,
              duration: const Duration(milliseconds: 160),
              curve: Curves.easeOut,
              child: Icon(
                active ? activeIcon : icon,
                size: 24,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                height: 1.1,
                letterSpacing: -0.1,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
