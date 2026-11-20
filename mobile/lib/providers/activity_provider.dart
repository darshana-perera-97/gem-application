import 'package:flutter/foundation.dart';

import 'auth_provider.dart';
import '../services/api_client.dart';

class ActivityProvider extends ChangeNotifier {
  ActivityProvider(this._auth);

  final AuthProvider _auth;

  List<dynamic> likes = [];
  List<dynamic> follows = [];
  List<String> saves = [];
  List<String> groups = [];
  List<String> debates = [];
  List<String> rsvps = [];
  List<String> reads = [];

  VoidCallback? onNeedLogin;

  String get userId => _auth.uid ?? '';

  void bindAuth() {
    _auth.addListener(_onAuthChanged);
    _onAuthChanged();
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (userId.isEmpty) {
      likes = [];
      follows = [];
      saves = [];
      groups = [];
      debates = [];
      rsvps = [];
      reads = [];
      notifyListeners();
      return;
    }
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await apiGet<Map<String, dynamic>>(
        '/api/activity',
        query: {'userId': userId},
      );
      likes = List.from(data['likes'] ?? []);
      follows = List.from(data['follows'] ?? []);
      saves = List<String>.from((data['saves'] ?? []).map((e) => '$e'));
      groups = List<String>.from((data['groups'] ?? []).map((e) => '$e'));
      debates = List<String>.from((data['debates'] ?? []).map((e) => '$e'));
      rsvps = List<String>.from((data['rsvps'] ?? []).map((e) => '$e'));
      reads = List<String>.from((data['reads'] ?? []).map((e) => '$e'));
      notifyListeners();
    } catch (_) {
      // keep empty
    }
  }

  bool ensureUser() {
    if (userId.isEmpty) {
      onNeedLogin?.call();
      return false;
    }
    return true;
  }

  Map<String, dynamic> actor() {
    final profile = _auth.userProfile;
    return {
      'userId': userId,
      'authorName': profile?['displayName'] ?? 'Member',
      'authorAvatar': profile?['photoURL'] ?? '',
      'authorType': profile?['role'] == 'VENDOR' ? 'VENDOR' : 'USER',
    };
  }

  Future<Map<String, dynamic>?> toggleLike(String postId) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>(
      '/api/posts/${Uri.encodeComponent(postId)}/like',
      {'userId': userId},
    );
    final liked = result['liked'] == true;
    if (liked) {
      likes = {...likes.map((e) => '$e'), postId}.toList();
    } else {
      likes = likes.where((id) => '$id' != postId).toList();
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleFollow(
    String targetId,
    String targetType,
  ) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>('/api/follows', {
      'userId': userId,
      'targetId': targetId,
      'targetType': targetType,
    });
    final following = result['following'] == true;
    follows = follows
        .where((row) => !(row is Map &&
            '${row['targetId']}' == targetId &&
            '${row['targetType']}' == targetType))
        .toList();
    if (following) {
      follows = [
        ...follows,
        {'targetId': targetId, 'targetType': targetType},
      ];
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleSave(String listingId) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>('/api/saves', {
      'userId': userId,
      'listingId': listingId,
    });
    final saved = result['saved'] == true;
    if (saved) {
      saves = {...saves, listingId}.toList();
    } else {
      saves = saves.where((id) => id != listingId).toList();
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleGroup(String groupId) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>(
      '/api/groups/${Uri.encodeComponent(groupId)}/join',
      {'userId': userId},
    );
    final joined = result['joined'] == true;
    if (joined) {
      groups = {...groups, groupId}.toList();
    } else {
      groups = groups.where((id) => id != groupId).toList();
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleDebate(String discussionId) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>(
      '/api/discussions/${Uri.encodeComponent(discussionId)}/join',
      {'userId': userId},
    );
    final joined = result['joined'] == true;
    if (joined) {
      debates = {...debates, discussionId}.toList();
    } else {
      debates = debates.where((id) => id != discussionId).toList();
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleRsvp(String eventId) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>(
      '/api/events/${Uri.encodeComponent(eventId)}/rsvp',
      {'userId': userId},
    );
    final going = result['going'] == true;
    if (going) {
      rsvps = {...rsvps, eventId}.toList();
    } else {
      rsvps = rsvps.where((id) => id != eventId).toList();
    }
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>?> toggleArticle(String articleKey) async {
    if (!ensureUser()) return null;
    final result = await apiPost<Map<String, dynamic>>('/api/articles/read', {
      'userId': userId,
      'articleKey': articleKey,
    });
    final saved = result['saved'] == true;
    if (saved) {
      reads = {...reads, articleKey}.toList();
    } else {
      reads = reads.where((id) => id != articleKey).toList();
    }
    notifyListeners();
    return result;
  }

  bool isFollowing(String targetId, String targetType) {
    return follows.any((row) =>
        row is Map &&
        '${row['targetId']}' == targetId &&
        '${row['targetType']}' == targetType);
  }

  bool isSaved(String listingId) => saves.contains(listingId);
}
