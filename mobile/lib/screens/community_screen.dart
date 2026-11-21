import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/activity_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/screen_loader.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  List<Map<String, dynamic>> _groups = [];
  List<Map<String, dynamic>> _discussions = [];
  bool _showAllGroups = false;
  String? _openDiscussion;
  bool _inviteOpen = false;
  final _inviteEmail = TextEditingController();
  String _inviteStatus = '';
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    apiGet<Map<String, dynamic>>('/api/community').then((data) {
      if (!mounted) return;
      setState(() {
        _groups = (data['groups'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _discussions = (data['discussions'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _ready = true;
      });
    }).catchError((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  void dispose() {
    _inviteEmail.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();
    final activity = context.watch<ActivityProvider>();
    final visible = _showAllGroups ? _groups : _groups.take(3).toList();

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        const PageHeader(
          title: 'Community',
          subtitle: 'Groups and discussions for dealers & collectors',
        ),
        const SizedBox(height: SocialUi.sectionGap),
        PageCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.trending_up_rounded, color: AppColors.primary),
                  SizedBox(width: SocialUi.feedGap),
                  Text(
                    'Trending groups',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: SocialUi.sectionGap),
              if (visible.isEmpty)
                const Text(
                  'No groups yet',
                  style: TextStyle(color: SocialUi.mute),
                )
              else
                ...visible.map((group) {
                  final joined = activity.groups.contains('${group['id']}');
                  return Padding(
                    padding: const EdgeInsets.only(bottom: SocialUi.itemGap),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            '${group['name'] ?? '?'}'[0].toUpperCase(),
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: SocialUi.sectionGap),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${group['name']}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700),
                              ),
                              Text(
                                '${group['members']} members',
                                style: SocialUi.metaStyle,
                              ),
                            ],
                          ),
                        ),
                        Flexible(
                          child: joined
                              ? OutlinedButton(
                                  onPressed: () =>
                                      activity.toggleGroup('${group['id']}'),
                                  child: const Text('Joined'),
                                )
                              : ElevatedButton(
                                  onPressed: () =>
                                      activity.toggleGroup('${group['id']}'),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 14, vertical: 10),
                                  ),
                                  child: const Text('Join'),
                                ),
                        ),
                      ],
                    ),
                  );
                }),
              if (_groups.length > 3)
                TextButton(
                  onPressed: () =>
                      setState(() => _showAllGroups = !_showAllGroups),
                  child: Text(
                    _showAllGroups ? 'Show fewer groups' : 'Explore all groups',
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        PageCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.person_add_alt_1_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Build your network',
                style: TextStyle(
                  color: AppColors.slate900,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Invite contacts to join GemBook discussions.',
                style: TextStyle(color: SocialUi.mute, height: 1.4),
              ),
              const SizedBox(height: SocialUi.sectionGap),
              ElevatedButton(
                onPressed: () => setState(() => _inviteOpen = !_inviteOpen),
                child: Text(_inviteOpen ? 'Close' : 'Invite contacts'),
              ),
              if (_inviteOpen) ...[
                const SizedBox(height: SocialUi.sectionGap),
                TextField(
                  controller: _inviteEmail,
                  decoration: SocialUi.searchDecoration(
                    hint: 'email@example.com',
                    prefixIcon: const Icon(
                      Icons.mail_outline_rounded,
                      size: 20,
                      color: SocialUi.mute,
                    ),
                  ),
                ),
                const SizedBox(height: SocialUi.feedGap),
                OutlinedButton(
                  onPressed: () async {
                    if (!activity.ensureUser()) return;
                    try {
                      await apiPost('/api/invites', {
                        'userId': activity.userId,
                        'email': _inviteEmail.text,
                      });
                      setState(() {
                        _inviteStatus = 'Invite saved';
                        _inviteEmail.clear();
                      });
                    } catch (e) {
                      setState(() => _inviteStatus = '$e');
                    }
                  },
                  child: const Text('Send invite'),
                ),
                if (_inviteStatus.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: SocialUi.feedGap),
                    child: Text(
                      _inviteStatus,
                      style: const TextStyle(
                        color: AppColors.slate600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap * 1.2),
        const PageHeader(title: 'Discussions'),
        const SizedBox(height: SocialUi.sectionGap),
        if (_discussions.isEmpty)
          const PageEmpty(
            message: 'No discussions yet',
            icon: Icons.forum_outlined,
          )
        else
          ..._discussions.map((d) {
            final open = _openDiscussion == '${d['id']}';
            final joined = activity.debates.contains('${d['id']}');
            return PageCard(
              margin: const EdgeInsets.only(bottom: SocialUi.sectionGap),
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: SocialUi.pagePad,
                      vertical: 4,
                    ),
                    onTap: () => setState(
                      () => _openDiscussion = open ? null : '${d['id']}',
                    ),
                    title: Text(
                      '${d['title']}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      '${d['summary'] ?? d['body'] ?? ''}',
                      maxLines: open ? null : 2,
                      overflow: open ? null : TextOverflow.ellipsis,
                    ),
                    trailing: Icon(
                      open
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: SocialUi.mute,
                    ),
                  ),
                  if (open)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        SocialUi.pagePad,
                        0,
                        SocialUi.pagePad,
                        SocialUi.pagePad,
                      ),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: ElevatedButton(
                          onPressed: () =>
                              activity.toggleDebate('${d['id']}'),
                          child:
                              Text(joined ? 'Joined debate' : 'Join debate'),
                        ),
                      ),
                    ),
                ],
              ),
            );
          }),
      ],
    );
  }
}
