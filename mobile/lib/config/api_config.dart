import 'package:flutter/foundation.dart';

/// Single place to set the backend API URL for the Flutter app.
///
/// Change [backendUrl] below, then restart the app.
/// Optional override: `flutter run --dart-define=API_BASE=http://192.168.1.10:1324`
class ApiConfig {
  /// Edit this value to point at your API.
  ///
  /// - Chrome / iOS Simulator / desktop: `http://localhost:1324`
  /// - Android emulator: `localhost` is auto-rewritten to `10.0.2.2`
  /// - Physical device: use your machine's LAN IP, e.g. `http://192.168.1.10:1324`
  static const String backendUrl = 'https://gem-dev.aipulse.lk/';
  // static const String backendUrl = 'http://localhost:1324';

  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE');
    if (fromEnv.isNotEmpty) {
      return fromEnv.replaceAll(RegExp(r'/$'), '');
    }

    // Android emulator cannot reach the host via "localhost".
    final isAndroid = !kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android;
    if (isAndroid &&
        (backendUrl.contains('localhost') ||
            backendUrl.contains('127.0.0.1'))) {
      return backendUrl
          .replaceFirst('localhost', '10.0.2.2')
          .replaceFirst('127.0.0.1', '10.0.2.2');
    }

    return backendUrl.replaceAll(RegExp(r'/$'), '');
  }

  static const serverDownMessage =
      'The server is currently unavailable. Please contact the system administrator.';
}
