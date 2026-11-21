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

    Widget gridFor(List<Map<String, dynamic>> items) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final cols = width >= 720 ? 3 : 2;
          final gap = SocialUi.itemGap;
          final cardWidth = (width - gap * (cols - 1)) / cols;
          // Fixed height keeps cover + avatar + text stable across devices.
          const cardHeight = 218.0;

          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cols,
              mainAxisSpacing: gap,
              crossAxisSpacing: gap,
              mainAxisExtent: cardHeight,
            ),
            itemBuilder: (_, i) => _VendorCard(
              vendor: items[i],
              width: cardWidth,
            ),
          );
        },
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
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.2,
                      color: AppColors.slate700,
                    ),
                  ),
                ),
                gridFor(entry.value),
              ]),
      ],
    );
  }
}

class _VendorCard extends StatelessWidget {
  const _VendorCard({
    required this.vendor,
    required this.width,
  });

  final Map<String, dynamic> vendor;
  final double width;

  @override
  Widget build(BuildContext context) {
    final verified = vendor['verified'] == true;
    final rating =
        (num.tryParse('${vendor['rating']}') ?? 0).toStringAsFixed(1);
    final gems = int.tryParse('${vendor['listingCount'] ?? 0}') ?? 0;
    final reviews = int.tryParse('${vendor['reviewCount'] ?? 0}') ?? 0;
    final name = '${vendor['companyName'] ?? 'Dealer'}';
    final location = '${vendor['location'] ?? 'Sri Lanka'}';

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
                height: 88,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      child: ColoredBox(
                        color: AppColors.slate100,
                        child: LoadingImage(
                          src: resolveCover(vendor['coverImage']),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 36,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.18),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 12,
                      bottom: -20,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white, width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
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
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.verified_rounded,
                                size: 12,
                                color: AppColors.success,
                              ),
                              SizedBox(width: 3),
                              Text(
                                'Verified',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.slate800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 26),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                        color: AppColors.slate900,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.place_outlined,
                          size: 12,
                          color: SocialUi.mute,
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              color: SocialUi.mute,
                              height: 1.2,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 13,
                            color: Color(0xFFFBBF24),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            rating,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.slate800,
                            ),
                          ),
                          if (reviews > 0) ...[
                            Text(
                              ' ($reviews)',
                              style: const TextStyle(
                                fontSize: 10,
                                color: SocialUi.mute,
                              ),
                            ),
                          ],
                          const Spacer(),
                          Text(
                            gems == 1 ? '1 gem' : '$gems gems',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
