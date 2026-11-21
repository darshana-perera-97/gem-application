import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/add_listing_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/format.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

class PublishGemBanner extends StatefulWidget {
  const PublishGemBanner({
    super.key,
    required this.listings,
    this.height = 168,
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
        borderRadius: BorderRadius.circular(SocialUi.cardRadius),
        color: AppColors.slate900,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (image != null && image.isNotEmpty)
            Opacity(
              opacity: 0.4,
              child: LoadingImage(src: image, fit: BoxFit.cover),
            ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.slate900.withValues(alpha: 0.75),
                  AppColors.primary.withValues(alpha: 0.35),
                  AppColors.slate900.withValues(alpha: 0.85),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'List a gem',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.accent.withValues(alpha: 0.95),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        listing == null
                            ? 'Reach verified dealers worldwide'
                            : '${listing['title'] ?? listing['variety'] ?? 'Featured gem'}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          height: 1.2,
                        ),
                      ),
                      if (listing != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          '${vendor['companyName'] ?? vendor['displayName'] ?? 'Dealer'} · ${formatCurrency(listing['price'], currency: '${listing['currency'] ?? 'LKR'}')}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: () =>
                      context.read<AddListingProvider>().openAddListing(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.slate900,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(SocialUi.buttonRadius),
                    ),
                  ),
                  child: const Text(
                    'List Gem',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
