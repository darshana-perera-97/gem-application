import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen>
    with SingleTickerProviderStateMixin {
  bool _authed = false;
  bool _checking = true;
  final _username = TextEditingController();
  final _password = TextEditingController();
  String _error = '';
  TabController? _tabs;
  Map<String, dynamic>? _analytics;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _posts = [];
  List<Map<String, dynamic>> _events = [];
  List<Map<String, dynamic>> _groups = [];

  @override
  void initState() {
    super.initState();
    _check();
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _tabs?.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    try {
      final response = await ApiClient.instance.raw('/api/admin/me');
      if (response.statusCode == 200) {
        setState(() {
          _authed = true;
          _checking = false;
          _tabs = TabController(length: 5, vsync: this);
        });
        await _loadAll();
        return;
      }
    } catch (_) {}
    if (mounted) setState(() => _checking = false);
  }

  Future<void> _login() async {
    setState(() => _error = '');
    try {
      await apiPost('/api/admin/login', {
        'username': _username.text.trim(),
        'password': _password.text,
      });
      setState(() {
        _authed = true;
        _tabs = TabController(length: 5, vsync: this);
      });
      await _loadAll();
    } catch (e) {
      setState(() => _error = '$e');
    }
  }

  Future<void> _loadAll() async {
    try {
      final analytics = await apiGet<Map<String, dynamic>>('/api/admin/analytics');
      final users = await apiGet<List<dynamic>>('/api/admin/users');
      final posts = await apiGet<List<dynamic>>('/api/admin/posts');
      final events = await apiGet<List<dynamic>>('/api/admin/events');
      final groups = await apiGet<List<dynamic>>('/api/admin/groups');
      if (!mounted) return;
      setState(() {
        _analytics = analytics;
        _users = users.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _posts = posts.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _events = events.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _groups = groups.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_authed) {
      return Padding(
        padding: SocialUi.pageInsets,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              child: PageCard(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Admin', style: SocialUi.pageTitleStyle),
                    const SizedBox(height: SocialUi.sectionGap),
                    TextField(
                      controller: _username,
                      decoration:
                          const InputDecoration(labelText: 'Username'),
                    ),
                    const SizedBox(height: SocialUi.sectionGap),
                    TextField(
                      controller: _password,
                      obscureText: true,
                      decoration:
                          const InputDecoration(labelText: 'Password'),
                    ),
                    if (_error.isNotEmpty) ...[
                      const SizedBox(height: SocialUi.sectionGap),
                      Text(
                        _error,
                        style: const TextStyle(
                          color: Color(0xFFEF4444),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: SocialUi.sectionGap),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _login,
                        child: const Text('Sign in'),
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

    return Padding(
      padding: SocialUi.pageInsets,
      child: Column(
        children: [
          PageHeader(
            title: 'Admin Dashboard',
            trailing: TextButton(
              onPressed: () async {
                await apiPost('/api/admin/logout');
                setState(() => _authed = false);
              },
              child: const Text('Logout'),
            ),
          ),
          TabBar(
            controller: _tabs,
            isScrollable: true,
            labelColor: AppColors.primary,
            tabs: const [
              Tab(text: 'Overview'),
              Tab(text: 'Users'),
              Tab(text: 'Posts'),
              Tab(text: 'Events'),
              Tab(text: 'Groups'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                ListView(
                  padding: const EdgeInsets.only(top: SocialUi.sectionGap),
                  children: [
                    Wrap(
                      spacing: SocialUi.sectionGap,
                      runSpacing: SocialUi.sectionGap,
                      children: [
                        _metric(
                          'Users',
                          '${_analytics?['users'] ?? _users.length}',
                        ),
                        _metric(
                          'Listings',
                          '${_analytics?['listings'] ?? '—'}',
                        ),
                        _metric(
                          'Posts',
                          '${_analytics?['posts'] ?? _posts.length}',
                        ),
                        _metric(
                          'Events',
                          '${_analytics?['events'] ?? _events.length}',
                        ),
                      ],
                    ),
                  ],
                ),
                ListView.builder(
                  itemCount: _users.length,
                  itemBuilder: (_, i) {
                    final user = _users[i];
                    return ListTile(
                      title: Text(
                        '${user['displayName'] ?? user['email'] ?? user['uid']}',
                      ),
                      subtitle: Text('${user['role'] ?? 'USER'}'),
                    );
                  },
                ),
                ListView.builder(
                  itemCount: _posts.length,
                  itemBuilder: (_, i) {
                    final post = _posts[i];
                    return ListTile(
                      title: Text(
                        '${post['content'] ?? post['title'] ?? 'Post'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text('${post['status'] ?? ''}'),
                      trailing: Wrap(
                        children: [
                          IconButton(
                            icon: const Icon(
                              Icons.check,
                              color: AppColors.success,
                            ),
                            onPressed: () async {
                              await apiPost(
                                '/api/admin/posts/${post['id']}/approve',
                              );
                              await _loadAll();
                            },
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.close,
                              color: Color(0xFFEF4444),
                            ),
                            onPressed: () async {
                              await apiPost(
                                '/api/admin/posts/${post['id']}/reject',
                              );
                              await _loadAll();
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
                ListView.builder(
                  itemCount: _events.length,
                  itemBuilder: (_, i) {
                    final event = _events[i];
                    return ListTile(
                      title: Text('${event['title']}'),
                      subtitle: Text('${event['date']} · ${event['type']}'),
                    );
                  },
                ),
                ListView.builder(
                  itemCount: _groups.length,
                  itemBuilder: (_, i) {
                    final group = _groups[i];
                    return ListTile(
                      title: Text('${group['name']}'),
                      subtitle: Text('${group['members']} members'),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _metric(String label, String value) {
    return SizedBox(
      width: 160,
      child: PageCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.slate500),
            ),
            const SizedBox(height: SocialUi.feedGap),
            Text(value, style: SocialUi.pageTitleStyle),
          ],
        ),
      ),
    );
  }
}
