import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../../utils/share_item.dart';
import '../ui/loading_image.dart';
import 'comment_section.dart';

/// Minimal feed post card.
class PostCard extends StatefulWidget {
  const PostCard({super.key, required this.post});

  final Map<String, dynamic> post;

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool _showComments = false;
  late int _likeCount;

  @override
  void initState() {
    super.initState();
    _likeCount = int.tryParse('${widget.post['likeCount'] ?? 0}') ?? 0;
  }

  String _relativeTime(dynamic raw) {
    final value = '$raw';
    if (value.isEmpty) return 'Just now';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    final diff = DateTime.now().difference(parsed);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${parsed.month}/${parsed.day}';
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final activity = context.watch<ActivityProvider>();
    final liked = activity.likes.map((e) => '$e').contains('${post['id']}');
    final media = resolvePostMedia(post['media']);
    final following = activity.isFollowing('${post['authorId']}', 'user');
    final authorType = '${post['authorType'] ?? 'USER'}';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: SocialUi.pagePad),
      decoration: SocialUi.elevatedCardDecoration,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 8, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: SocialUi.avatarMd / 2,
                  backgroundColor: AppColors.slate100,
                  child: ClipOval(
                    child: LoadingImage(
                      src: resolveAvatar(post['authorAvatar']),
                      width: SocialUi.avatarMd,
                      height: SocialUi.avatarMd,
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
                        '${post['authorName'] ?? 'Member'}',
                        style: SocialUi.nameStyle,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        authorType == 'VENDOR'
                            ? 'Verified vendor · ${_relativeTime(post['createdAt'])}'
                            : _relativeTime(post['createdAt']),
                        style: SocialUi.metaStyle,
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => activity.toggleFollow(
                    '${post['authorId']}',
                    'user',
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor:
                        following ? SocialUi.mute : AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(0, 36),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      letterSpacing: -0.1,
                    ),
                  ),
                  child: Text(following ? 'Following' : 'Follow'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              '${post['content'] ?? post['body'] ?? ''}',
              style: SocialUi.bodyStyle,
            ),
          ),
          if (media.isNotEmpty)
            AspectRatio(
              aspectRatio: 16 / 10,
              child: LoadingImage(src: media.first, fit: BoxFit.cover),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                if (_likeCount > 0) ...[
                  Icon(
                    Icons.favorite_rounded,
                    size: 14,
                    color: AppColors.primary.withValues(alpha: 0.85),
                  ),
                  const SizedBox(width: 5),
                  Text('$_likeCount', style: SocialUi.metaStyle),
                  const Spacer(),
                ] else
                  const Spacer(),
                InkWell(
                  onTap: () => setState(() => _showComments = !_showComments),
                  child: Text(
                    _showComments ? 'Hide comments' : 'Comments',
                    style: SocialUi.metaStyle,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
            child: Row(
              children: [
                _Action(
                  icon: liked
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  label: liked ? 'Liked' : 'Like',
                  active: liked,
                  onTap: () async {
                    final result = await activity.toggleLike('${post['id']}');
                    if (result != null && mounted) {
                      setState(() {
                        _likeCount = int.tryParse(
                              '${result['likeCount'] ?? _likeCount}',
                            ) ??
                            (liked ? _likeCount - 1 : _likeCount + 1);
                      });
                    }
                  },
                ),
                _Action(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Comment',
                  onTap: () => setState(() => _showComments = !_showComments),
                ),
                _Action(
                  icon: Icons.ios_share_rounded,
                  label: 'Share',
                  onTap: () {
                    final content =
                        '${post['content'] ?? 'GemBook post'}'.trim();
                    final preview = content.length > 120
                        ? '${content.substring(0, 117)}…'
                        : content;
                    showItemShareSheet(
                      context,
                      title: preview.isEmpty ? 'GemBook post' : preview,
                      url: postShareUrl('${post['id']}'),
                      message: preview.isEmpty
                          ? 'Check out this post on GemBook'
                          : preview,
                    );
                  },
                ),
              ],
            ),
          ),
          if (_showComments)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: CommentSection(postId: '${post['id']}'),
            ),
        ],
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : SocialUi.mute;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: SocialUi.actionLabelStyle.copyWith(
                    color: color,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
