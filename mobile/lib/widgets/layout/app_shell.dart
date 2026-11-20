import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/format.dart';
import '../profile/phone_verify_dialog.dart';
import '../marketplace/add_listing_sheet.dart';
import '../../providers/add_listing_provider.dart';
import '../../providers/auth_provider.dart';
import 'app_navbar.dart';
import 'app_side_nav.dart';
import 'bottom_nav.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  Map<String, dynamic> _market = {
    'activeListings': null,
    'verifiedDealers': null,
    'volume24hLabel': '—',
    'weekChangePct': null,
    'activity': [40, 60, 55, 90, 75, 85],
    'platformOnline': true,
  };
  String _clock = formatClock();
  Timer? _clockTimer;
  bool _listingSheetShown = false;
  bool _phoneShown = false;

  @override
  void initState() {
    super.initState();
    _loadMarket();
    _clockTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() => _clock = formatClock());
    });
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadMarket() async {
    try {
      final data = await apiGet<Map<String, dynamic>>('/api/market/stats');
      if (!mounted) return;
      setState(() {
        _market = {
          'activeListings': data['activeListings'] ?? 0,
          'verifiedDealers': data['verifiedDealers'] ?? 0,
          'volume24hLabel': data['volume24hLabel'] ?? '\$0 USD',
          'weekChangePct': data['weekChangePct'] ?? 0,
          'activity': (data['activity'] is List && (data['activity'] as List).isNotEmpty)
              ? List<num>.from(data['activity'] as List)
              : [40, 60, 55, 90, 75, 85],
          'platformOnline': data['platformOnline'] != false,
        };
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final wide = MediaQuery.sizeOf(context).width >= 1024;
    final showBottomNav = MediaQuery.sizeOf(context).width < 768;
    final addListing = context.watch<AddListingProvider>();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (addListing.isOpen && !_listingSheetShown) {
        _listingSheetShown = true;
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => AddListingSheet(
            listingId: addListing.listingId,
            onClose: () {
              addListing.closeAddListing();
              _listingSheetShown = false;
            },
          ),
        ).whenComplete(() {
          _listingSheetShown = false;
          if (addListing.isOpen) addListing.closeAddListing();
        });
      }
      if (addListing.phoneOpen && !_phoneShown) {
        _phoneShown = true;
        final auth = context.read<AuthProvider>();
        showDialog(
          context: context,
          builder: (_) => PhoneVerifyDialog(
            initialPhone: '${auth.userProfile?['phone'] ?? ''}',
            userId: auth.uid ?? '',
            title: 'Add a phone number',
            description: 'Enter a valid mobile number before listing a gem.',
            onClose: () {
              addListing.closePhone();
              _phoneShown = false;
            },
            onVerified: () async {
              await addListing.onPhoneVerified();
              _phoneShown = false;
            },
          ),
        ).whenComplete(() {
          _phoneShown = false;
          if (addListing.phoneOpen) addListing.closePhone();
        });
      }
    });

    // Mobile: pages own horizontal padding (SocialUi.pagePad).
    // Desktop: shell provides the outer page pad.
    final shellPad = showBottomNav ? 0.0 : SocialUi.pagePad;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: SocialUi.feedCanvas,
      drawer: showBottomNav
          ? AppSideNav(
              location: location,
              asDrawer: true,
            )
          : null,
      body: Column(
        children: [
          AppNavbar(
            onLogoTap: () {
              if (showBottomNav) {
                _scaffoldKey.currentState?.openDrawer();
              } else {
                context.go('/');
              }
            },
          ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (wide)
                  AppSideNav(location: location),
                Expanded(
                  child: ColoredBox(
                    color: SocialUi.feedCanvas,
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final width = constraints.maxWidth > 1152
                            ? 1152.0
                            : constraints.maxWidth;
                        return Align(
                          alignment: Alignment.topCenter,
                          child: SizedBox(
                            width: width,
                            height: constraints.maxHeight,
                            child: Padding(
                              padding: EdgeInsets.fromLTRB(
                                shellPad,
                                showBottomNav ? 4 : SocialUi.pagePad,
                                shellPad,
                                showBottomNav ? 8 : SocialUi.pagePad,
                              ),
                              child: widget.child,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (showBottomNav) const AppBottomNav(),
          if (!showBottomNav) _StatusBar(market: _market, clock: _clock),
        ],
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  const _StatusBar({required this.market, required this.clock});

  final Map<String, dynamic> market;
  final String clock;

  @override
  Widget build(BuildContext context) {
    final online = market['platformOnline'] != false &&
        !ApiClient.instance.isServerDown;
    final wide = MediaQuery.sizeOf(context).width >= 640;

    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.slate200)),
      ),
      child: Row(
        children: [
          if (wide) ...[
            Text(
              'ACTIVE LISTINGS: ${formatCount(market['activeListings'])}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.2,
                color: AppColors.slate400,
              ),
            ),
            const SizedBox(width: 24),
            Text(
              'VERIFIED DEALERS: ${formatCount(market['verifiedDealers'])}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.slate400,
              ),
            ),
            const SizedBox(width: 24),
            Text(
              '24H VOLUME: ${market['volume24hLabel']}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.slate400,
              ),
            ),
          ],
          const Spacer(),
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(
              color: online ? AppColors.success : const Color(0xFFFBBF24),
              shape: BoxShape.circle,
            ),
          ),
          Text(
            online ? 'PLATFORM ONLINE' : 'PLATFORM OFFLINE',
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: AppColors.slate400,
            ),
          ),
          const SizedBox(width: 16),
          InkWell(
            onTap: () => context.push('/news'),
            child: const Text(
              'NEWS',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.slate400,
              ),
            ),
          ),
          const SizedBox(width: 16),
          InkWell(
            onTap: () => context.push('/privacy'),
            child: const Text(
              'PRIVACY',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.slate400,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Text(
            'SRI LANKA STANDARD TIME: $clock',
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
