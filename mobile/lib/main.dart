import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/activity_provider.dart';
import 'providers/add_listing_provider.dart';
import 'providers/auth_provider.dart';
import 'router/app_router.dart';
import 'services/api_client.dart';
import 'theme/app_theme.dart';
import 'widgets/ui/screen_loader.dart';

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

  @override
  void initState() {
    super.initState();

    void goLogin() {
      _router.go('/login');
    }

    _activity.onNeedLogin = goLogin;
    _addListing.onNeedLogin = goLogin;

    _auth.init().whenComplete(() {
      if (mounted) setState(() => _ready = true);
    });
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
          if (!_ready) return const ScreenLoader();
          return child ?? const SizedBox.shrink();
        },
      ),
    );
  }
}
