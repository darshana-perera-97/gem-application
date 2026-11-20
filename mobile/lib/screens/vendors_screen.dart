import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../utils/images.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/loading_image.dart';
import '../widgets/ui/screen_loader.dart';

class VendorsScreen extends StatefulWidget {
  const VendorsScreen({super.key});

  @override
  State<VendorsScreen> createState() => _VendorsScreenState();
}

class _VendorsScreenState extends State<VendorsScreen> {
  List<Map<String, dynamic>> _vendors = [];
  String _mode = 'all';
  String _query = '';
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    apiGet<List<dynamic>>('/api/vendors').then((data) {
      if (!mounted) return;
      setState(() {
        _vendors = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _ready = true;
      });
    }).catchError((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();

    final filtered = _vendors.where((vendor) {
      final haystack =
          '${vendor['companyName']} ${vendor['location']} ${vendor['description']}'
              .toLowerCase();
      return haystack.contains(_query.trim().toLowerCase());
    }).toList();

    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final vendor in filtered) {
      final key = '${vendor['location'] ?? 'Other'}';
      grouped.putIfAbsent(key, () => []).add(vendor);
    }

    const cols = 2;

    Widget gridFor(List<Map<String, dynamic>> items) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          mainAxisSpacing: SocialUi.itemGap,
          crossAxisSpacing: SocialUi.itemGap,
          childAspectRatio: 0.72,
        ),
        itemBuilder: (_, i) => _vendorCard(items[i]),
      );
    }

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        const PageHeader(
          title: 'Verified Dealers',
          subtitle: 'Trusted gemstone sellers across Sri Lanka',
        ),
        const SizedBox(height: SocialUi.sectionGap),
        Row(
          children: [
            GemFilterChip(
              label: 'All Dealers',
              selected: _mode == 'all',
              onSelected: (_) => setState(() => _mode = 'all'),
            ),
            const SizedBox(width: SocialUi.feedGap),
            GemFilterChip(
              label: 'By Mining Area',
              selected: _mode == 'area',
              onSelected: (_) => setState(() => _mode = 'area'),
            ),
          ],
        ),
        const SizedBox(height: SocialUi.sectionGap),
        TextField(
          onChanged: (v) => setState(() => _query = v),
          decoration: SocialUi.searchDecoration(hint: 'Search dealers…'),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        if (filtered.isEmpty)
          const PageEmpty(
            message: 'No dealers match this search',
            icon: Icons.storefront_outlined,
          )
        else if (_mode == 'all')
          gridFor(filtered)
        else
          ...grouped.entries.expand((entry) => [
                Padding(
                  padding: const EdgeInsets.only(
                    top: SocialUi.feedGap,
                    bottom: SocialUi.itemGap,
                  ),
                  child: Text(
                    entry.key,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
                gridFor(entry.value),
              ]),
      ],
    );
  }

  Widget _vendorCard(Map<String, dynamic> vendor) {
    final verified = vendor['verified'] == true;
    final rating = (num.tryParse('${vendor['rating']}') ?? 0).toStringAsFixed(1);
    final gems = '${vendor['listingCount'] ?? 0}';
    final reviews = '${vendor['reviewCount'] ?? 0}';

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(SocialUi.cardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/vendors/${vendor['id']}'),
        child: DecoratedBox(
          decoration: SocialUi.elevatedCardDecoration,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 76,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(SocialUi.cardRadius),
                        ),
                        child: ColoredBox(
                          color: AppColors.primarySoft,
                          child: LoadingImage(
                            src: resolveCover(vendor['coverImage']),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: SocialUi.itemGap,
                      bottom: -22,
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: SocialUi.softShadow,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: LoadingImage(
                          src: resolveAvatar(vendor['logo']),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    if (verified)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: SocialUi.softShadow,
                          ),
                          child: const Icon(
                            Icons.verified_rounded,
                            size: 14,
                            color: AppColors.success,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    SocialUi.itemGap,
                    0,
                    SocialUi.itemGap,
                    SocialUi.itemGap,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${vendor['companyName']}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        vendor['location'] != null
                            ? '${vendor['location']}'
                            : 'Sri Lanka',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: SocialUi.mute,
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 14, color: AppColors.warning),
                          const SizedBox(width: 2),
                          Text(
                            rating,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.slate800,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '$reviews',
                            style: const TextStyle(
                              fontSize: 10,
                              color: SocialUi.mute,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '$gems gems',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
