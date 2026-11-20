import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/add_listing_provider.dart';
import '../services/api_client.dart';
import '../services/catalog_events.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/marketplace/listing_card.dart';
import '../widgets/marketplace/publish_gem_banner.dart';
import '../widgets/ui/screen_loader.dart';

const _gemChips = [
  'All Gems',
  'Sapphires',
  'Rubies',
  'Spinels',
  'Emeralds',
  'Padparadscha',
];

bool _matchesGem(Map<String, dynamic> listing, String gem) {
  if (gem.isEmpty || gem == 'All Gems') return true;
  final haystack =
      '${listing['gemType'] ?? ''} ${listing['variety'] ?? ''} ${listing['title'] ?? ''} ${listing['type'] ?? ''}'
          .toLowerCase();
  final words = gem.toLowerCase().split(' ').where((w) => w.length > 2);
  return words.any((word) {
    final stem = word.replaceAll(RegExp(r'ies$'), 'y').replaceAll(RegExp(r's$'), '');
    return haystack.contains(stem);
  });
}

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({
    super.key,
    this.initialQuery,
    this.initialGem,
  });

  final String? initialQuery;
  final String? initialGem;

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  final _search = TextEditingController();
  String _gemFilter = 'All Gems';
  String _sort = 'newest';
  ListingCardVariant _view = ListingCardVariant.grid;
  int _visibleCount = 8;
  bool _filtersOpen = false;
  String _origin = 'Any';
  bool _certifiedOnly = false;
  String _maxPrice = '';
  List<Map<String, dynamic>> _listings = [];
  bool _ready = false;
  VoidCallback? _unsub;

  @override
  void initState() {
    super.initState();
    // Read route query from widget args (set by GoRouter builder) — never via
    // GoRouterState.of(context) here; that InheritedWidget lookup crashes initState
    // and leaves Flutter web on a blank/white screen.
    final q = widget.initialQuery;
    final gem = widget.initialGem;
    if (q != null && q.isNotEmpty) _search.text = q;
    if (gem != null && gem.isNotEmpty) _gemFilter = gem;
    _load();
    _unsub = CatalogEvents.onCatalogChange(_load);
  }

  @override
  void didUpdateWidget(covariant MarketplaceScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialQuery == oldWidget.initialQuery &&
        widget.initialGem == oldWidget.initialGem) {
      return;
    }
    if (widget.initialQuery != null) _search.text = widget.initialQuery!;
    if (widget.initialGem != null && widget.initialGem!.isNotEmpty) {
      _gemFilter = widget.initialGem!;
    }
    _visibleCount = 8;
  }

  @override
  void dispose() {
    _unsub?.call();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await apiGet<List<dynamic>>('/api/listings');
      if (!mounted) return;
      setState(() {
        _listings = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _ready = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ready = true);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final query = _search.text.trim().toLowerCase();
    final priceCap = double.tryParse(_maxPrice) ?? 0;
    var list = _listings.where((listing) {
      if (query.isNotEmpty) {
        final vendor = listing['vendor'] is Map ? listing['vendor'] as Map : {};
        final haystack =
            '${listing['title'] ?? ''} ${listing['gemType'] ?? ''} ${listing['variety'] ?? ''} ${vendor['displayName'] ?? ''} ${vendor['companyName'] ?? ''}'
                .toLowerCase();
        if (!haystack.contains(query)) return false;
      }
      if (!_matchesGem(listing, _gemFilter)) return false;
      if (_origin != 'Any' && listing['origin'] != _origin) return false;
      if (_certifiedOnly &&
          (listing['certification'] == 'None' ||
              listing['certification'] == null)) {
        return false;
      }
      if (priceCap > 0 && (num.tryParse('${listing['price']}') ?? 0) > priceCap) {
        return false;
      }
      return true;
    }).toList();

    list.sort((a, b) {
      switch (_sort) {
        case 'price-asc':
          return (num.tryParse('${a['price']}') ?? 0)
              .compareTo(num.tryParse('${b['price']}') ?? 0);
        case 'price-desc':
          return (num.tryParse('${b['price']}') ?? 0)
              .compareTo(num.tryParse('${a['price']}') ?? 0);
        case 'weight':
          return (num.tryParse('${b['caratWeight'] ?? b['weight']}') ?? 0)
              .compareTo(num.tryParse('${a['caratWeight'] ?? a['weight']}') ?? 0);
        default:
          return '${b['createdAt'] ?? ''}'.compareTo('${a['createdAt'] ?? ''}');
      }
    });
    return list;
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();

    final filtered = _filtered;
    final origins = _listings
        .map((e) => '${e['origin'] ?? ''}')
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    final chips = _gemChips.contains(_gemFilter)
        ? _gemChips
        : ['All Gems', _gemFilter, ..._gemChips.skip(1)];
    final visible = filtered.take(_visibleCount).toList();

    // Always 2 cards per row in grid view (Marketplace card layout).
    const crossAxisCount = 2;

    final sections = <Widget>[];
    if (_view == ListingCardVariant.list) {
      for (final listing in visible) {
        sections.add(
          Padding(
            padding: const EdgeInsets.only(bottom: SocialUi.itemGap),
            child: ListingCard(
              listing: listing,
              variant: ListingCardVariant.list,
            ),
          ),
        );
      }
    } else {
      // Build the grid in pairs of rows, with an optional promo after every 6 cards.
      for (var start = 0; start < visible.length; start += 6) {
        final chunk = visible.skip(start).take(6).toList();
        sections.add(
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: chunk.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              mainAxisSpacing: SocialUi.itemGap,
              crossAxisSpacing: SocialUi.itemGap,
              // Tall enough for image + price/title/location.
              childAspectRatio: 0.68,
            ),
            itemBuilder: (_, i) => ListingCard(
              listing: chunk[i],
              variant: ListingCardVariant.grid,
            ),
          ),
        );
        if (chunk.length == 6 && start + 6 < visible.length) {
          sections.add(
            Padding(
              padding: const EdgeInsets.fromLTRB(
                0,
                SocialUi.sectionGap,
                0,
                4,
              ),
              child: PublishGemBanner(listings: _listings, height: 148),
            ),
          );
        }
      }
    }

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        PageHeader(
          title: "Today's picks",
          subtitle: 'Verified gems from Sri Lanka dealers',
          trailing: ElevatedButton.icon(
            onPressed: () =>
                context.read<AddListingProvider>().openAddListing(),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('List'),
            style: ElevatedButton.styleFrom(
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(SocialUi.buttonRadius),
              ),
            ),
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() => _visibleCount = 8),
                decoration: SocialUi.searchDecoration(
                  hint: 'Search gems, dealers…',
                ),
              ),
            ),
            const SizedBox(width: SocialUi.feedGap),
            Material(
              color: _filtersOpen ? AppColors.primarySoft : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(SocialUi.searchRadius),
                side: BorderSide(
                  color: _filtersOpen ? AppColors.primary : SocialUi.hairline,
                ),
              ),
              child: IconButton(
                onPressed: () => setState(() => _filtersOpen = !_filtersOpen),
                icon: Icon(
                  Icons.tune_rounded,
                  color: _filtersOpen ? AppColors.primary : SocialUi.mute,
                ),
              ),
            ),
          ],
        ),
        if (_filtersOpen) ...[
          const SizedBox(height: SocialUi.itemGap),
          Container(
            padding: const EdgeInsets.all(SocialUi.pagePad),
            decoration: SocialUi.roundedCardDecoration,
            child: Wrap(
              spacing: SocialUi.sectionGap,
              runSpacing: SocialUi.sectionGap,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                DropdownButton<String>(
                  value: _origin,
                  items: [
                    const DropdownMenuItem(value: 'Any', child: Text('Any origin')),
                    ...origins.map(
                      (o) => DropdownMenuItem(value: o, child: Text(o)),
                    ),
                  ],
                  onChanged: (v) => setState(() {
                    _origin = v ?? 'Any';
                    _visibleCount = 8;
                  }),
                ),
                SizedBox(
                  width: 140,
                  child: TextField(
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'Max price',
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() {
                      _maxPrice = v;
                      _visibleCount = 8;
                    }),
                  ),
                ),
                FilterChip(
                  label: const Text('Certified'),
                  selected: _certifiedOnly,
                  onSelected: (v) => setState(() {
                    _certifiedOnly = v;
                    _visibleCount = 8;
                  }),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: SocialUi.sectionGap),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: chips.map((filter) {
              final active = _gemFilter == filter;
              return Padding(
                padding: const EdgeInsets.only(right: SocialUi.feedGap),
                child: GemFilterChip(
                  label: filter,
                  selected: active,
                  onSelected: (_) => setState(() {
                    _gemFilter = filter;
                    _visibleCount = 8;
                  }),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: SocialUi.itemGap),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _sort,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(SocialUi.cardRadius),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: SocialUi.pagePad,
                    vertical: 8,
                  ),
                ),
                items: const [
                  DropdownMenuItem(value: 'newest', child: Text('Newest')),
                  DropdownMenuItem(value: 'price-asc', child: Text('Price ↑')),
                  DropdownMenuItem(value: 'price-desc', child: Text('Price ↓')),
                  DropdownMenuItem(value: 'weight', child: Text('Weight')),
                ],
                onChanged: (v) => setState(() => _sort = v ?? 'newest'),
              ),
            ),
            const SizedBox(width: SocialUi.feedGap),
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(SocialUi.cardRadius),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () =>
                        setState(() => _view = ListingCardVariant.grid),
                    icon: Icon(
                      Icons.grid_view_rounded,
                      color: _view == ListingCardVariant.grid
                          ? AppColors.primary
                          : SocialUi.mute,
                    ),
                  ),
                  IconButton(
                    onPressed: () =>
                        setState(() => _view = ListingCardVariant.list),
                    icon: Icon(
                      Icons.view_agenda_outlined,
                      color: _view == ListingCardVariant.list
                          ? AppColors.primary
                          : SocialUi.mute,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: SocialUi.sectionGap),
        if (visible.isEmpty)
          const PageEmpty(
            message: 'No gems match these filters',
            icon: Icons.diamond_outlined,
          )
        else
          ...sections,
        if (_visibleCount < filtered.length)
          Padding(
            padding: const EdgeInsets.only(
              top: SocialUi.sectionGap,
              bottom: SocialUi.pagePad,
            ),
            child: OutlinedButton(
              onPressed: () => setState(() => _visibleCount += 8),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                foregroundColor: AppColors.primary,
                side: BorderSide(color: AppColors.primary.withValues(alpha: 0.35)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(SocialUi.buttonRadius),
                ),
              ),
              child: const Text(
                'See more',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }
}
