import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/activity_provider.dart';
import 'providers/add_listing_provider.dart';
import 'providers/auth_provider.dart';
import 'router/app_router.dart';
import 'services/api_client.dart';
import 'theme/app_theme.dart';
import 'widgets/ui/splash_screen.dart';

/// Minimum time the branded splash stays visible so it never flashes away.
const _kSplashMinDuration = Duration(milliseconds: 2400);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiClient.instance.init();
  runApp(const GemBookApp());
}

class GemBookApp extends StatefulWidget {
  const GemBookApp({super.key});

  @override
  State<GemBookApp> createState() => _GemBookAppState();
}

class _GemBookAppState extends State<GemBookApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  late final AuthProvider _auth = AuthProvider();
  late final ActivityProvider _activity = ActivityProvider(_auth)..bindAuth();
  late final AddListingProvider _addListing = AddListingProvider(_auth);
  late final GoRouter _router =
      createAppRouter(navigatorKey: _navigatorKey);
  bool _ready = false;
  bool _showSplash = true;

  @override
  void initState() {
    super.initState();

    void goLogin() {
      _router.go('/login');
    }

    _activity.onNeedLogin = goLogin;
    _addListing.onNeedLogin = goLogin;

    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final started = DateTime.now();
    await _auth.init();
    final elapsed = DateTime.now().difference(started);
    final remaining = _kSplashMinDuration - elapsed;
    if (remaining > Duration.zero) {
      await Future<void>.delayed(remaining);
    }
    if (!mounted) return;
    setState(() => _ready = true);
    // Brief delay so the fade-out of splash feels intentional.
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (!mounted) return;
    setState(() => _showSplash = false);
  }

  @override
  void dispose() {
    _activity.dispose();
    _auth.dispose();
    _addListing.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _activity),
        ChangeNotifierProvider.value(value: _addListing),
      ],
      child: MaterialApp.router(
        title: 'GemBook',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: _router,
        builder: (context, child) {
          final app = child ?? const SizedBox.shrink();
          return Stack(
            fit: StackFit.expand,
            children: [
              if (_ready) app,
              IgnorePointer(
                ignoring: !_showSplash,
                child: AnimatedOpacity(
                  opacity: _showSplash ? 1 : 0,
                  duration: const Duration(milliseconds: 420),
                  curve: Curves.easeOutCubic,
                  child: const SplashScreen(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
