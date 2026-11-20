import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

class SavedGemsPanel extends StatefulWidget {
  const SavedGemsPanel({super.key});

  @override
  State<SavedGemsPanel> createState() => _SavedGemsPanelState();
}

class _SavedGemsPanelState extends State<SavedGemsPanel> {
  String _tab = 'gems';
  List<Map<String, dynamic>> _listings = [];
  List<Map<String, dynamic>> _vendors = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final activity = context.read<ActivityProvider>();
    try {
      final listings = await apiGet<List<dynamic>>('/api/listings');
      final vendors = await apiGet<List<dynamic>>('/api/vendors');
      final savedIds = activity.saves.toSet();
      final followedVendorIds = activity.follows
          .whereType<Map>()
          .where((r) => r['targetType'] == 'vendor')
          .map((r) => '${r['targetId']}')
          .toSet();
      if (!mounted) return;
      setState(() {
        _listings = listings
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((l) => savedIds.contains('${l['id']}'))
            .toList();
        _vendors = vendors
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((v) => followedVendorIds.contains('${v['id']}'))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
    // silence unused
    assert(auth.uid != null || auth.uid == null);
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.85;
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.slate200,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
            child: Row(
              children: [
                const Text(
                  'Saved',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppColors.slate900,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _tabChip('gems', 'Gems'),
                const SizedBox(width: 8),
                _tabChip('markets', 'Markets'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _tab == 'gems'
                    ? _buildGems()
                    : _buildVendors(),
          ),
        ],
      ),
    );
  }

  Widget _tabChip(String id, String label) {
    final active = _tab == id;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      onSelected: (_) => setState(() => _tab = id),
      selectedColor: AppColors.slate900,
      labelStyle: TextStyle(
        color: active ? Colors.white : AppColors.slate600,
        fontWeight: FontWeight.w700,
        fontSize: 12,
      ),
      backgroundColor: AppColors.slate50,
    );
  }

  Widget _buildGems() {
    if (_listings.isEmpty) {
      return const Center(
        child: Text('No saved gems yet',
            style: TextStyle(color: AppColors.slate400)),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _listings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) {
        final listing = _listings[i];
        final images = (listing['images'] as List? ?? [])
            .map((e) => resolveGem(e))
            .where((e) => e.isNotEmpty)
            .toList();
        return ListTile(
          onTap: () {
            Navigator.pop(context);
            context.push('/listings/${listing['id']}');
          },
          leading: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 56,
              height: 56,
              child: images.isEmpty
                  ? const ColoredBox(color: AppColors.slate100)
                  : LoadingImage(src: images.first, fit: BoxFit.cover),
            ),
          ),
          title: Text(
            '${listing['title'] ?? listing['variety'] ?? 'Gem'}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text('${listing['origin'] ?? ''}'),
          trailing: IconButton(
            icon: const Icon(Icons.favorite, color: Color(0xFFEF4444)),
            onPressed: () async {
              await context
                  .read<ActivityProvider>()
                  .toggleSave('${listing['id']}');
              setState(() {
                _listings.removeWhere((l) => l['id'] == listing['id']);
              });
            },
          ),
        );
      },
    );
  }

  Widget _buildVendors() {
    if (_vendors.isEmpty) {
      return const Center(
        child: Text('No followed markets yet',
            style: TextStyle(color: AppColors.slate400)),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _vendors.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) {
        final vendor = _vendors[i];
        return ListTile(
          onTap: () {
            Navigator.pop(context);
            context.push('/vendors/${vendor['id']}');
          },
          leading: CircleAvatar(
            backgroundColor: AppColors.slate100,
            child: ClipOval(
              child: LoadingImage(
                src: resolveAvatar(vendor['logo']),
                fit: BoxFit.cover,
                width: 40,
                height: 40,
              ),
            ),
          ),
          title: Text(
            '${vendor['companyName'] ?? 'Vendor'}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text('${vendor['location'] ?? ''}'),
          trailing: IconButton(
            icon: const Icon(Icons.person_remove_outlined),
            onPressed: () async {
              await context
                  .read<ActivityProvider>()
                  .toggleFollow('${vendor['id']}', 'vendor');
              setState(() {
                _vendors.removeWhere((v) => v['id'] == vendor['id']);
              });
            },
          ),
        );
      },
    );
  }
}
