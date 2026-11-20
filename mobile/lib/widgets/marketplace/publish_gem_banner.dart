import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/add_listing_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/format.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

class PublishGemBanner extends StatefulWidget {
  const PublishGemBanner({
    super.key,
    required this.listings,
    this.height = 180,
  });

  final List<dynamic> listings;
  final double height;

  @override
  State<PublishGemBanner> createState() => _PublishGemBannerState();
}

class _PublishGemBannerState extends State<PublishGemBanner> {
  int _index = 0;
  Timer? _timer;

  List<Map<String, dynamic>> get _items => widget.listings
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .where((e) => (e['images'] as List?)?.isNotEmpty == true)
      .toList();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (_items.isEmpty || !mounted) return;
      setState(() => _index = (_index + 1) % _items.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    final listing = items.isEmpty ? null : items[_index % items.length];
    final image = listing == null
        ? null
        : resolveGem((listing['images'] as List).first);
    final vendor = listing?['vendor'] is Map
        ? Map<String, dynamic>.from(listing!['vendor'] as Map)
        : <String, dynamic>{};

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF1A0B24), AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (image != null && image.isNotEmpty)
            Opacity(
              opacity: 0.45,
              child: LoadingImage(src: image, fit: BoxFit.cover),
            ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.black.withValues(alpha: 0.55),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.65),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'PUBLISH YOUR GEM',
                        style: TextStyle(
                          color: AppColors.accent,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        listing == null
                            ? 'Reach verified dealers worldwide'
                            : '${listing['title'] ?? listing['variety'] ?? 'Featured gem'}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (listing != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          '${vendor['companyName'] ?? vendor['displayName'] ?? 'Dealer'} · ${formatCurrency(listing['price'], currency: '${listing['currency'] ?? 'LKR'}')}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.75),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () =>
                      context.read<AddListingProvider>().openAddListing(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text('List Gem'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
