import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../utils/images.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/loading_image.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<Map<String, dynamic>> _conversations = [];
  Map<String, dynamic>? _active;
  List<Map<String, dynamic>> _messages = [];
  final _search = TextEditingController();
  final _composer = TextEditingController();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _search.dispose();
    _composer.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await apiGet<List<dynamic>>(
        '/api/conversations',
        query: {'userId': auth.uid},
      );
      if (!mounted) return;
      setState(() {
        _conversations = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(Map<String, dynamic> conversation) async {
    setState(() {
      _active = conversation;
      _messages = [];
    });
    try {
      final data = await apiGet<List<dynamic>>(
        '/api/conversations/${conversation['id']}/messages',
        query: {'userId': context.read<AuthProvider>().uid},
      );
      if (!mounted) return;
      setState(() {
        _messages = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      });
      await apiPost('/api/conversations/${conversation['id']}/read', {
        'userId': context.read<AuthProvider>().uid,
      });
    } catch (_) {}
  }

  Future<void> _send() async {
    final text = _composer.text.trim();
    final active = _active;
    final auth = context.read<AuthProvider>();
    if (text.isEmpty || active == null || !auth.isSignedIn) return;
    _composer.clear();
    try {
      await apiPost('/api/conversations/${active['id']}/messages', {
        'userId': auth.uid,
        'content': text,
      });
      await _openConversation(active);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isSignedIn) {
      return PageEmpty(
        message: 'Sign in to view messages',
        actionLabel: 'Sign in',
        onAction: () => context.push('/login'),
        icon: Icons.chat_bubble_outline_rounded,
      );
    }

    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final query = _search.text.trim().toLowerCase();
    final filtered = _conversations.where((c) {
      if (query.isEmpty) return true;
      return '${c['title'] ?? c['otherUserName'] ?? ''}'
          .toLowerCase()
          .contains(query);
    }).toList();

    final wide = MediaQuery.sizeOf(context).width >= 800;
    final showList = wide || _active == null;

    final inbox = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            SocialUi.pagePad,
            SocialUi.pagePad,
            SocialUi.pagePad,
            8,
          ),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: SocialUi.searchDecoration(
              hint: 'Search conversations…',
            ),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const PageEmpty(
                  message: 'No conversations yet',
                  icon: Icons.forum_outlined,
                )
              : ListView.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1, color: SocialUi.hairline),
                  itemBuilder: (_, i) {
                    final c = filtered[i];
                    final active = _active?['id'] == c['id'];
                    return ListTile(
                      selected: active,
                      selectedTileColor: AppColors.primarySoft,
                      onTap: () => _openConversation(c),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: SocialUi.pagePad,
                        vertical: 4,
                      ),
                      leading: CircleAvatar(
                        radius: 22,
                        backgroundColor: AppColors.slate100,
                        child: ClipOval(
                          child: LoadingImage(
                            src: resolveAvatar(c['otherUserAvatar']),
                            width: 44,
                            height: 44,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      title: Text(
                        '${c['otherUserName'] ?? c['title'] ?? 'Chat'}',
                        style: SocialUi.nameStyle,
                      ),
                      subtitle: Text(
                        '${c['lastMessage'] ?? ''}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: SocialUi.metaStyle,
                      ),
                    );
                  },
                ),
        ),
      ],
    );

    final thread = _active == null
        ? const Center(
            child: Text(
              'Select a conversation',
              style: TextStyle(color: AppColors.slate400),
            ),
          )
        : Column(
            children: [
              Container(
                padding: const EdgeInsets.all(SocialUi.pagePad),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: AppColors.slate100)),
                ),
                child: Row(
                  children: [
                    if (!wide)
                      IconButton(
                        onPressed: () => setState(() => _active = null),
                        icon: const Icon(Icons.arrow_back),
                      ),
                    Expanded(
                      child: Text(
                        '${_active!['otherUserName'] ?? 'Chat'}',
                        style: SocialUi.nameStyle.copyWith(fontSize: 16),
                      ),
                    ),
                    PopupMenuButton<String>(
                      onSelected: (value) async {
                        if (value == 'report') {
                          await apiPost('/api/reports', {
                            'userId': auth.uid,
                            'targetType': 'conversation',
                            'targetId': _active!['id'],
                          });
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Report submitted')),
                            );
                          }
                        }
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: 'report', child: Text('Report')),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(SocialUi.pagePad),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) {
                    final msg = _messages[i];
                    final mine = '${msg['senderId']}' == auth.uid;
                    return Align(
                      alignment:
                          mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: SocialUi.feedGap),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.sizeOf(context).width * 0.72,
                        ),
                        decoration: BoxDecoration(
                          color: mine ? AppColors.primary : AppColors.slate50,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(18),
                            topRight: const Radius.circular(18),
                            bottomLeft: Radius.circular(mine ? 18 : 6),
                            bottomRight: Radius.circular(mine ? 6 : 18),
                          ),
                        ),
                        child: Text(
                          '${msg['content'] ?? ''}',
                          style: TextStyle(
                            color: mine ? Colors.white : AppColors.slate800,
                            height: 1.4,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: SocialUi.hairline)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _composer,
                        decoration: InputDecoration(
                          hintText: 'Type a message…',
                          filled: true,
                          fillColor: AppColors.slate50,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(SocialUi.searchRadius),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Material(
                      color: AppColors.primary,
                      shape: const CircleBorder(),
                      child: IconButton(
                        onPressed: _send,
                        icon: const Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );

    return Padding(
      padding: SocialUi.pageInsets,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final maxH = constraints.maxHeight.isFinite
              ? constraints.maxHeight
              : MediaQuery.sizeOf(context).height * 0.72;
          final body = !wide
              ? Container(
                  decoration: SocialUi.elevatedCardDecoration,
                  clipBehavior: Clip.antiAlias,
                  child: SizedBox(
                    height: maxH,
                    child: showList && _active == null ? inbox : thread,
                  ),
                )
              : Container(
                  height: maxH,
                  decoration: SocialUi.elevatedCardDecoration,
                  clipBehavior: Clip.antiAlias,
                  child: Row(
                    children: [
                      SizedBox(width: 320, child: inbox),
                      const VerticalDivider(
                          width: 1, color: SocialUi.hairline),
                      Expanded(child: thread),
                    ],
                  ),
                );
          return body;
        },
      ),
    );
  }
}
