import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../providers/activity_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';
import 'comment_section.dart';

/// Facebook / LinkedIn-style feed post: header → body → media → counts → actions.
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
            padding: const EdgeInsets.fromLTRB(14, 14, 6, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${post['authorName'] ?? 'Member'}',
                        style: SocialUi.nameStyle,
                      ),
                      Text(
                        authorType == 'VENDOR'
                            ? 'Verified vendor · ${_relativeTime(post['createdAt'])}'
                            : '${_relativeTime(post['createdAt'])} · GemBook',
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
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  child: Text(following ? 'Following' : '+ Follow'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
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
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: Row(
              children: [
                const Icon(Icons.thumb_up_alt,
                    size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  '$_likeCount',
                  style: SocialUi.metaStyle,
                ),
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
          const Divider(height: 1, color: SocialUi.hairline),
          Row(
            children: [
              _Action(
                icon: liked ? Icons.thumb_up_alt : Icons.thumb_up_alt_outlined,
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
                icon: Icons.chat_bubble_outline,
                label: 'Comment',
                onTap: () => setState(() => _showComments = !_showComments),
              ),
              _Action(
                icon: Icons.share_outlined,
                label: 'Share',
                onTap: () =>
                    Share.share('${post['content'] ?? 'GemBook post'}'),
              ),
            ],
          ),
          if (_showComments)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
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
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: SocialUi.actionLabelStyle.copyWith(color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
