import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/api_config.dart';
import '../services/api_client.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _userProfile;
  bool _loading = true;
  String _authError = '';

  Map<String, dynamic>? get userProfile => _userProfile;
  Map<String, dynamic>? get currentUser => _userProfile;
  bool get loading => _loading;
  String get authError => _authError;
  bool get isSignedIn => _userProfile != null;
  String? get uid => _userProfile?['uid']?.toString();

  Future<void> init() async {
    _loading = true;
    notifyListeners();
    try {
      await refreshSession();
    } catch (error) {
      debugPrint('Auth init failed: $error');
      _userProfile = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> refreshSession() async {
    try {
      final response = await ApiClient.instance.raw('/api/auth/me');
      if (response.statusCode == 200 && response.data is Map) {
        final data = Map<String, dynamic>.from(response.data as Map);
        _userProfile = data['user'] is Map
            ? Map<String, dynamic>.from(data['user'] as Map)
            : null;
      } else {
        _userProfile = null;
      }
    } catch (_) {
      _userProfile = null;
    }
    notifyListeners();
    return _userProfile;
  }

  /// Opens backend Google OAuth in the browser (cookie set on API domain).
  Future<void> loginWithGoogle() async {
    _authError = '';
    notifyListeners();
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/auth/google');
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok) {
      _authError = 'Could not open Google sign-in.';
      notifyListeners();
      throw Exception(_authError);
    }
  }

  Future<void> requestEmailOtp(String email) async {
    await apiPost('/api/auth/email/request', {'email': email.trim()});
  }

  Future<void> verifyEmailOtp(String email, String code) async {
    await apiPost('/api/auth/email/verify', {
      'email': email.trim(),
      'code': code,
    });
    await refreshSession();
  }

  Future<void> loginWithPhone(String phone) async {
    throw Exception(
      'Phone Authentication requires Firebase configuration in the mobile app. '
      'Use email sign-in for now, or enable Firebase Auth on this project.',
    );
  }

  Future<void> logout() async {
    try {
      await ApiClient.instance.raw('/api/auth/logout', method: 'POST');
    } catch (error) {
      debugPrint('Logout failed: $error');
    }
    _userProfile = null;
    notifyListeners();
  }

  Future<void> deleteAccount({
    required String reason,
    required String details,
    required String confirmation,
  }) async {
    if (_userProfile == null) {
      throw Exception('Sign in to delete your account.');
    }
    await apiPost('/api/account/delete', {
      'reason': reason,
      'details': details,
      'confirmation': confirmation,
    });
    _userProfile = null;
    notifyListeners();
  }

  Future<void> updateLocalProfile(Map<String, dynamic> patch) async {
    if (_userProfile == null) return;
    _userProfile = {..._userProfile!, ...patch};
    notifyListeners();
  }
}
