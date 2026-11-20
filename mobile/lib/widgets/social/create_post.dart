import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

/// LinkedIn-style “Start a post” composer strip.
class CreatePost extends StatefulWidget {
  const CreatePost({super.key, this.onCreated});

  final VoidCallback? onCreated;

  @override
  State<CreatePost> createState() => _CreatePostState();
}

class _CreatePostState extends State<CreatePost> {
  bool _expanded = false;
  String _mode = 'STORY';
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    final activity = context.read<ActivityProvider>();
    if (!auth.isSignedIn) {
      activity.onNeedLogin?.call();
      return;
    }
    if (_text.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final actor = activity.actor();
      await apiPost('/api/posts', {
        ...actor,
        'content': _text.text.trim(),
        'kind': _mode,
      });
      _text.clear();
      setState(() {
        _expanded = false;
        _busy = false;
      });
      widget.onCreated?.call();
    } catch (e) {
      setState(() => _busy = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Container(
      margin: const EdgeInsets.fromLTRB(
        SocialUi.pagePad,
        SocialUi.feedGap,
        SocialUi.pagePad,
        0,
      ),
      decoration: SocialUi.elevatedCardDecoration,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: SocialUi.avatarMd / 2,
                backgroundColor: AppColors.slate100,
                child: ClipOval(
                  child: LoadingImage(
                    src: resolveAvatar(auth.userProfile?['photoURL']),
                    width: SocialUi.avatarMd,
                    height: SocialUi.avatarMd,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _expanded = true),
                  borderRadius: BorderRadius.circular(SocialUi.searchRadius),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: SocialUi.feedCanvas,
                      borderRadius: BorderRadius.circular(SocialUi.searchRadius),
                      border: Border.all(color: SocialUi.hairline),
                    ),
                    child: const Text(
                      'Start a post',
                      style: TextStyle(
                        color: SocialUi.mute,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (!_expanded) ...[
            const SizedBox(height: 8),
            const Divider(height: 1, color: SocialUi.hairline),
            Row(
              children: [
                _ComposerAction(
                  icon: Icons.photo_outlined,
                  label: 'Media',
                  color: const Color(0xFF378FE9),
                  onTap: () => setState(() => _expanded = true),
                ),
                _ComposerAction(
                  icon: Icons.article_outlined,
                  label: 'Article',
                  color: const Color(0xFFE06847),
                  onTap: () => setState(() {
                    _mode = 'ARTICLE';
                    _expanded = true;
                  }),
                ),
                _ComposerAction(
                  icon: Icons.auto_awesome_outlined,
                  label: 'Story',
                  color: AppColors.primary,
                  onTap: () => setState(() {
                    _mode = 'STORY';
                    _expanded = true;
                  }),
                ),
              ],
            ),
          ],
          if (_expanded) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                ChoiceChip(
                  label: const Text('Story'),
                  selected: _mode == 'STORY',
                  onSelected: (_) => setState(() => _mode = 'STORY'),
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                  labelStyle: TextStyle(
                    color: _mode == 'STORY'
                        ? AppColors.primary
                        : SocialUi.mute,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Article'),
                  selected: _mode == 'ARTICLE',
                  onSelected: (_) => setState(() => _mode = 'ARTICLE'),
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                  labelStyle: TextStyle(
                    color: _mode == 'ARTICLE'
                        ? AppColors.primary
                        : SocialUi.mute,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _text,
              maxLines: 4,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'What do you want to talk about?',
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                TextButton(
                  onPressed: () => setState(() => _expanded = false),
                  child: const Text('Cancel'),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: _busy ? null : _submit,
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
          ],
        ],
      ),
    );
  }
}

class _ComposerAction extends StatelessWidget {
  const _ComposerAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: TextButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 20, color: color),
        label: Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: SocialUi.mute,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 8),
        ),
      ),
    );
  }
}
