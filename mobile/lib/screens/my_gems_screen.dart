import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/add_listing_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../services/catalog_events.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/marketplace/listing_card.dart';
import '../widgets/ui/screen_loader.dart';

class MyGemsScreen extends StatefulWidget {
  const MyGemsScreen({super.key});

  @override
  State<MyGemsScreen> createState() => _MyGemsScreenState();
}

class _MyGemsScreenState extends State<MyGemsScreen> {
  List<Map<String, dynamic>> _listings = [];
  String _filter = 'all';
  bool _ready = false;
  bool _statusBusy = false;
  VoidCallback? _unsub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (!auth.isSignedIn) {
        context.go('/login');
        return;
      }
      _load();
      _unsub = CatalogEvents.onCatalogChange(_load);
    });
  }

  @override
  void dispose() {
    _unsub?.call();
    super.dispose();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    try {
      final data = await apiGet<List<dynamic>>('/api/listings');
      if (!mounted) return;
      setState(() {
        _listings = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((l) {
              final vendor = l['vendor'] is Map ? l['vendor'] as Map : {};
              return '${l['ownerId']}' == auth.uid ||
                  '${vendor['userId']}' == auth.uid;
            })
            .toList();
        _ready = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ready = true);
    }
  }

  Future<void> _setStatus(Map<String, dynamic> listing, String status) async {
    setState(() => _statusBusy = true);
    try {
      await apiPost('/api/listings/${listing['id']}/status', {'status': status});
      CatalogEvents.notifyCatalogChanged();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _statusBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isSignedIn) return const SizedBox.shrink();
    if (!_ready) return const ScreenLoader();

    final filtered = _listings.where((l) {
      if (_filter == 'available') return l['status'] != 'SOLD';
      if (_filter == 'sold') return l['status'] == 'SOLD';
      return true;
    }).toList();

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        PageHeader(
          title: 'My Gems',
          subtitle: 'Manage your listings',
          trailing: ElevatedButton.icon(
            onPressed: () =>
                context.read<AddListingProvider>().openAddListing(),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('List'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        Wrap(
          spacing: SocialUi.feedGap,
          children: [
            for (final entry in [
              ('all', 'All'),
              ('available', 'Available'),
              ('sold', 'Sold'),
            ])
              GemFilterChip(
                label: entry.$2,
                selected: _filter == entry.$1,
                onSelected: (_) => setState(() => _filter = entry.$1),
              ),
          ],
        ),
        const SizedBox(height: SocialUi.sectionGap),
        if (filtered.isEmpty)
          const PageEmpty(
            message: 'No gems in this filter yet.',
            icon: Icons.diamond_outlined,
          )
        else
          ...filtered.map(
            (listing) => Padding(
              padding: const EdgeInsets.only(bottom: SocialUi.itemGap),
              child: ListingCard(
                listing: listing,
                ownerMode: true,
                statusBusy: _statusBusy,
                onMarkSold: () => _setStatus(listing, 'SOLD'),
                onMarkAvailable: () => _setStatus(listing, 'ACTIVE'),
              ),
            ),
          ),
      ],
    );
  }
}
