import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/add_listing_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';

/// Modern bottom tabs with a raised center “List” action.
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
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: SocialUi.hairline)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
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
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.accent],
                ),
                shape: BoxShape.circle,
                boxShadow: SocialUi.primaryShadow,
              ),
              child: const Icon(Icons.add_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 2),
            const Text(
              'List',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                height: 1.1,
                color: AppColors.primary,
              ),
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
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              width: active ? 22 : 0,
              height: 3,
              margin: const EdgeInsets.only(bottom: 4),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Icon(
              active ? activeIcon : icon,
              size: 22,
              color: color,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                height: 1.1,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
