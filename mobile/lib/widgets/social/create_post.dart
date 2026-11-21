import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

/// Facebook-style feed composer strip + full-screen create-post sheet.
class CreatePost extends StatelessWidget {
  const CreatePost({super.key, this.onCreated});

  final VoidCallback? onCreated;

  void _openComposer(
    BuildContext context, {
    String mode = 'STORY',
  }) {
    final auth = context.read<AuthProvider>();
    final activity = context.read<ActivityProvider>();
    if (!auth.isSignedIn) {
      activity.onNeedLogin?.call();
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      barrierColor: Colors.black54,
      builder: (_) => _CreatePostSheet(
        initialMode: mode,
        onCreated: onCreated,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final firstName = _firstName(auth.userProfile?['displayName']);
    final hint = firstName.isEmpty
        ? "What's on your mind?"
        : "What's on your mind, $firstName?";

    return Container(
      margin: const EdgeInsets.only(top: SocialUi.feedGap),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: SocialUi.hairline, width: 0.5),
          bottom: BorderSide(color: SocialUi.hairline, width: 0.5),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.slate100,
                  child: ClipOval(
                    child: LoadingImage(
                      src: resolveAvatar(auth.userProfile?['photoURL']),
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Material(
                    color: const Color(0xFFF0F2F5),
                    borderRadius: BorderRadius.circular(24),
                    child: InkWell(
                      onTap: () => _openComposer(context),
                      borderRadius: BorderRadius.circular(24),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 11,
                        ),
                        child: Text(
                          hint,
                          style: const TextStyle(
                            color: Color(0xFF65676B),
                            fontSize: 16,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 0.5, color: SocialUi.hairline),
          SizedBox(
            height: 44,
            child: Row(
              children: [
                _FeedAction(
                  icon: Icons.photo_library_rounded,
                  color: const Color(0xFF45BD62),
                  label: 'Photo',
                  onTap: () => _openComposer(context, mode: 'STORY'),
                ),
                _vDivider(),
                _FeedAction(
                  icon: Icons.emoji_emotions_rounded,
                  color: const Color(0xFFF7B928),
                  label: 'Feeling',
                  onTap: () => _openComposer(context, mode: 'STORY'),
                ),
                _vDivider(),
                _FeedAction(
                  icon: Icons.article_rounded,
                  color: AppColors.primary,
                  label: 'Article',
                  onTap: () => _openComposer(context, mode: 'ARTICLE'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Widget _vDivider() {
    return Container(
      width: 0.5,
      height: 28,
      color: SocialUi.hairline,
    );
  }

  static String _firstName(dynamic displayName) {
    final raw = '${displayName ?? ''}'.trim();
    if (raw.isEmpty) return '';
    return raw.split(RegExp(r'\s+')).first;
  }
}

class _FeedAction extends StatelessWidget {
  const _FeedAction({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF65676B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CreatePostSheet extends StatefulWidget {
  const _CreatePostSheet({
    required this.initialMode,
    this.onCreated,
  });

  final String initialMode;
  final VoidCallback? onCreated;

  @override
  State<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends State<_CreatePostSheet> {
  late String _mode = widget.initialMode;
  final _text = TextEditingController();
  bool _busy = false;
  bool _canPost = false;

  @override
  void initState() {
    super.initState();
    _text.addListener(() {
      final next = _text.text.trim().isNotEmpty;
      if (next != _canPost) setState(() => _canPost = next);
    });
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canPost || _busy) return;
    setState(() => _busy = true);
    try {
      final activity = context.read<ActivityProvider>();
      final actor = activity.actor();
      await apiPost('/api/posts', {
        ...actor,
        'content': _text.text.trim(),
        'kind': _mode,
      });
      if (!mounted) return;
      Navigator.pop(context);
      widget.onCreated?.call();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final name =
        '${auth.userProfile?['displayName'] ?? auth.userProfile?['email'] ?? 'Member'}';
    final media = MediaQuery.of(context);
    // useSafeArea already insets the sheet — don't size past available height.
    final height = media.size.height -
        media.padding.top -
        media.padding.bottom -
        media.viewInsets.bottom;

    return SizedBox(
      height: height.clamp(320.0, media.size.height),
      child: Column(
        children: [
          // Facebook-style top bar: close · Create post · Post
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 8, 4),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 26),
                  color: AppColors.slate800,
                ),
                const Expanded(
                  child: Text(
                    'Create post',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate900,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _canPost && !_busy ? _submit : null,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.white,
                    disabledForegroundColor: const Color(0xFFBCC0C4),
                    backgroundColor: _canPost
                        ? AppColors.primary
                        : const Color(0xFFE4E6EB),
                    disabledBackgroundColor: const Color(0xFFE4E6EB),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    minimumSize: const Size(0, 36),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Post'),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 0.5, color: SocialUi.hairline),

          // Author row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.slate100,
                  child: ClipOval(
                    child: LoadingImage(
                      src: resolveAvatar(auth.userProfile?['photoURL']),
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.slate900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _AudienceChip(
                            icon: Icons.public,
                            label: 'Public',
                            selected: true,
                            onTap: () {},
                          ),
                          const SizedBox(width: 6),
                          _AudienceChip(
                            icon: Icons.auto_awesome_outlined,
                            label: _mode == 'ARTICLE' ? 'Article' : 'Story',
                            selected: false,
                            onTap: () {
                              setState(() {
                                _mode =
                                    _mode == 'ARTICLE' ? 'STORY' : 'ARTICLE';
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Large free-form text area
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: TextField(
                controller: _text,
                autofocus: true,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w400,
                  height: 1.35,
                  color: AppColors.slate900,
                ),
                decoration: const InputDecoration(
                  hintText: "What's on your mind?",
                  hintStyle: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF8A8D91),
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
          ),

          // “Add to your post” bar — Facebook style
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFCED0D4)),
              ),
              child: Row(
                children: [
                  const Flexible(
                    child: Text(
                      'Add to your post',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.slate800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      reverse: true,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _SheetIcon(
                            icon: Icons.photo_library_rounded,
                            color: const Color(0xFF45BD62),
                            onTap: () {},
                          ),
                          _SheetIcon(
                            icon: Icons.person_add_alt_1_rounded,
                            color: const Color(0xFF1877F2),
                            onTap: () {},
                          ),
                          _SheetIcon(
                            icon: Icons.emoji_emotions_rounded,
                            color: const Color(0xFFF7B928),
                            onTap: () {},
                          ),
                          _SheetIcon(
                            icon: Icons.location_on_rounded,
                            color: const Color(0xFFF5533D),
                            onTap: () {},
                          ),
                          _SheetIcon(
                            icon: Icons.more_horiz_rounded,
                            color: const Color(0xFF65676B),
                            onTap: () {},
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AudienceChip extends StatelessWidget {
  const _AudienceChip({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary.withValues(alpha: 0.12)
          : const Color(0xFFE4E6EB),
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 12,
                color: selected ? AppColors.primary : AppColors.slate700,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: selected ? AppColors.primary : AppColors.slate700,
                ),
              ),
              const SizedBox(width: 2),
              Icon(
                Icons.arrow_drop_down,
                size: 16,
                color: selected ? AppColors.primary : AppColors.slate700,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetIcon extends StatelessWidget {
  const _SheetIcon({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.all(6),
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      icon: Icon(icon, color: color, size: 24),
    );
  }
}
