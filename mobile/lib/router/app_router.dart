import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../screens/add_listing_route_screen.dart';
import '../screens/admin_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/community_screen.dart';
import '../screens/events_screen.dart';
import '../screens/feed_screen.dart';
import '../screens/login_screen.dart';
import '../screens/marketplace_screen.dart';
import '../screens/my_gems_screen.dart';
import '../screens/news_screen.dart';
import '../screens/privacy_screen.dart';
import '../screens/product_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/seed_screen.dart';
import '../screens/vendor_dashboard_screen.dart';
import '../screens/vendor_profile_screen.dart';
import '../screens/vendors_screen.dart';
import '../widgets/layout/app_shell.dart';
import '../widgets/layout/standalone_page.dart';
import '../widgets/ui/server_down.dart';

GoRouter createAppRouter({required GlobalKey<NavigatorState> navigatorKey}) {
  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/',
    routes: [
      ShellRoute(
        builder: (context, state, child) {
          return ServerDownWatcher(
            child: AppShell(child: child),
          );
        },
        routes: [
          GoRoute(path: '/', builder: (_, __) => const FeedScreen()),
          GoRoute(
            path: '/marketplace',
            builder: (_, state) => MarketplaceScreen(
              initialQuery: state.uri.queryParameters['q'],
              initialGem: state.uri.queryParameters['gem'],
            ),
          ),
          GoRoute(path: '/news', builder: (_, __) => const NewsScreen()),
          GoRoute(path: '/events', builder: (_, __) => const EventsScreen()),
          GoRoute(
            path: '/community',
            builder: (_, __) => const CommunityScreen(),
          ),
          GoRoute(path: '/vendors', builder: (_, __) => const VendorsScreen()),
          GoRoute(
            path: '/vendors/:id',
            builder: (_, state) => VendorProfileScreen(
              vendorId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(path: '/my-gems', builder: (_, __) => const MyGemsScreen()),
          GoRoute(path: '/admin', builder: (_, __) => const AdminScreen()),
          GoRoute(
            path: '/vendor/dashboard',
            builder: (_, __) => const VendorDashboardScreen(),
          ),
          GoRoute(path: '/seed', builder: (_, __) => const SeedScreen()),
          GoRoute(
            path: '/listings/:id/edit',
            builder: (_, state) => AddListingRouteScreen(
              listingId: state.pathParameters['id'],
            ),
          ),
          GoRoute(
            path: '/listings/:id',
            builder: (_, state) => ProductScreen(
              listingId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/add-listing',
            builder: (_, __) => const AddListingRouteScreen(),
          ),
          GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
          GoRoute(
            path: '/auth/callback',
            builder: (_, __) => const _AuthCallbackScreen(),
          ),
          GoRoute(path: '/privacy', builder: (_, __) => const PrivacyScreen()),
        ],
      ),
      // Separate full-screen pages (no bottom nav / main app bar).
      GoRoute(
        path: '/messages',
        builder: (_, __) => const StandalonePage(
          title: 'Messages',
          child: ChatScreen(),
        ),
      ),
      GoRoute(
        path: '/profile',
        builder: (_, __) => const StandalonePage(
          title: 'Profile',
          child: ProfileScreen(),
        ),
      ),
    ],
  );
}

class _AuthCallbackScreen extends StatefulWidget {
  const _AuthCallbackScreen();

  @override
  State<_AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends State<_AuthCallbackScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.go('/profile');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(width: 12),
          Text('Signing you in…',
              style: TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
