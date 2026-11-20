import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';
import 'saved_gems_panel.dart';

/// Top bar: app icon · actions · messages · profile.
class AppNavbar extends StatefulWidget implements PreferredSizeWidget {
  const AppNavbar({super.key, this.onLogoTap});

  /// Opens the side drawer on mobile (web-style nav).
  final VoidCallback? onLogoTap;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  State<AppNavbar> createState() => _AppNavbarState();
}

class _AppNavbarState extends State<AppNavbar> {
  List<dynamic> _notes = [];

  Future<void> _openNotes() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) {
      context.push('/login');
      return;
    }
    try {
      final rows = await apiGet<List<dynamic>>(
        '/api/notifications',
        query: {'userId': auth.uid},
      );
      if (!mounted) return;
      setState(() => _notes = rows);
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        builder: (ctx) => _NotificationsSheet(
          notes: _notes,
          userId: auth.uid ?? '',
          onOpen: (href) {
            Navigator.pop(ctx);
            if (href != null && href.isNotEmpty) context.push(href);
          },
        ),
      );
    } catch (e) {
      debugPrint('$e');
    }
  }

  void _openSaved() {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) {
      context.push('/login');
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SavedGemsPanel(),
    );
  }

  void _openMessages() {
    context.push('/messages');
  }

  void _openProfile() {
    context.push('/profile');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final activity = context.watch<ActivityProvider>();
    final marketplaceFollows = activity.follows
        .where((row) => row is Map && row['targetType'] == 'vendor')
        .length;
    final savedCount = activity.saves.length + marketplaceFollows;
    final avatarSrc = resolveAvatar(auth.userProfile?['photoURL']);
    final initial = (auth.userProfile?['displayName'] ??
            auth.userProfile?['email'] ??
            'U')
        .toString()
        .trim();
    final letter = initial.isNotEmpty ? initial[0].toUpperCase() : 'U';

    return Material(
      color: Colors.white,
      elevation: 0,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(bottom: BorderSide(color: SocialUi.hairline)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: SafeArea(
          bottom: false,
          child: SizedBox(
            height: 56,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  InkWell(
                    onTap: widget.onLogoTap ?? () => context.go('/'),
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 2,
                        vertical: 6,
                      ),
                      child: SvgPicture.asset(
                        kSampleLogoAsset,
                        height: 32,
                        fit: BoxFit.contain,
                        semanticsLabel: 'GemBook menu',
                      ),
                    ),
                  ),
                  const Spacer(),
                  _IconAction(
                    icon: savedCount > 0
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: savedCount > 0 ? AppColors.primary : SocialUi.mute,
                    badge: savedCount > 0
                        ? (savedCount > 99 ? '99+' : '$savedCount')
                        : null,
                    onTap: _openSaved,
                  ),
                  _IconAction(
                    icon: Icons.notifications_none_rounded,
                    color: SocialUi.mute,
                    badge: null,
                    showDot: true,
                    onTap: _openNotes,
                  ),
                  _IconAction(
                    icon: Icons.chat_bubble_outline_rounded,
                    color: SocialUi.mute,
                    onTap: _openMessages,
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, right: 2),
                    child: InkWell(
                      onTap: _openProfile,
                      customBorder: const CircleBorder(),
                      child: Container(
                        width: SocialUi.avatarSm,
                        height: SocialUi.avatarSm,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.slate100,
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            width: 1.5,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: avatarSrc.isNotEmpty
                            ? LoadingImage(src: avatarSrc, fit: BoxFit.cover)
                            : Center(
                                child: Text(
                                  letter,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({
    required this.icon,
    required this.color,
    required this.onTap,
    this.badge,
    this.showDot = false,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String? badge;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(icon, color: color, size: 24),
          if (badge != null)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 16),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  badge!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
            )
          else if (showDot)
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _NotificationsSheet extends StatelessWidget {
  const _NotificationsSheet({
    required this.notes,
    required this.userId,
    required this.onOpen,
  });

  final List<dynamic> notes;
  final String userId;
  final void Function(String? href) onOpen;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.55,
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: SocialUi.hairline,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      apiPost('/api/notifications/read', {'userId': userId});
                    },
                    child: const Text(
                      'Mark all read',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: SocialUi.hairline),
            Expanded(
              child: notes.isEmpty
                  ? const Center(
                      child: Text(
                        'No notifications yet',
                        style: TextStyle(color: SocialUi.mute),
                      ),
                    )
                  : ListView.separated(
                      itemCount: notes.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, color: SocialUi.hairline),
                      itemBuilder: (_, i) {
                        final note =
                            Map<String, dynamic>.from(notes[i] as Map);
                        final read = note['read'] == true;
                        return ListTile(
                          onTap: () async {
                            await apiPost('/api/notifications/read', {
                              'userId': userId,
                              'id': note['id'],
                            });
                            onOpen(note['href']?.toString());
                          },
                          title: Text(
                            '${note['message'] ?? ''}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight:
                                  read ? FontWeight.w400 : FontWeight.w600,
                              color: read
                                  ? SocialUi.mute
                                  : AppColors.slate900,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
