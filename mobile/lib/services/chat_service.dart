import 'api_client.dart';

Future<String> startConversation({
  required Map<String, dynamic> currentUser,
  required Map<String, dynamic> otherUser,
}) async {
  final currentUid = '${currentUser['uid'] ?? ''}';
  final otherUid = '${otherUser['uid'] ?? ''}';
  if (currentUid == otherUid) {
    throw Exception('You cannot message yourself');
  }

  final conversation = await apiPost<Map<String, dynamic>>('/api/conversations', {
    'userId': currentUid,
    'userName': currentUser['displayName'],
    'userAvatar': currentUser['photoURL'] ?? '',
    'otherUserId': otherUid,
    'otherUserName': otherUser['displayName'],
    'otherUserAvatar': otherUser['photoURL'] ?? '',
    'listingId': otherUser['listingId'],
    'listingTitle': otherUser['listingTitle'],
  });

  return '${conversation['id']}';
}
