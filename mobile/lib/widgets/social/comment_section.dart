import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';

class CommentSection extends StatefulWidget {
  const CommentSection({super.key, required this.postId});

  final String postId;

  @override
  State<CommentSection> createState() => _CommentSectionState();
}

class _CommentSectionState extends State<CommentSection> {
  final _controller = TextEditingController();
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await apiGet<List<dynamic>>(
        '/api/posts/${Uri.encodeComponent(widget.postId)}/comments',
      );
      if (!mounted) return;
      setState(() {
        _comments = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final activity = context.read<ActivityProvider>();
    if (!activity.ensureUser()) return;
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    try {
      await apiPost(
        '/api/posts/${Uri.encodeComponent(widget.postId)}/comments',
        {
          ...activity.actor(),
          'content': text,
        },
      );
      _controller.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Divider(height: 1, color: SocialUi.hairline),
        const SizedBox(height: 8),
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Center(
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          )
        else
          ..._comments.map(
            (c) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.slate100,
                    child: Text(
                      '${c['authorName'] ?? 'M'}'[0].toUpperCase(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${c['authorName'] ?? 'Member'}',
                            style: SocialUi.nameStyle.copyWith(fontSize: 12),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${c['content'] ?? ''}',
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.4,
                              color: AppColors.slate700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                decoration: InputDecoration(
                  hintText: 'Write a comment…',
                  filled: true,
                  fillColor: AppColors.slate50,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(SocialUi.searchRadius),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            IconButton(
              onPressed: _send,
              icon: const Icon(Icons.send_rounded, color: AppColors.primary),
            ),
          ],
        ),
      ],
    );
  }
}
