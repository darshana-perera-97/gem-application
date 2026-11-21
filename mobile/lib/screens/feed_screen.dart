import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/api_client.dart';
import '../services/catalog_events.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../utils/images.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/marketplace/listing_card.dart';
import '../widgets/social/create_post.dart';
import '../widgets/social/post_card.dart';
import '../widgets/social/reels_strip.dart';
import '../widgets/ui/loading_image.dart';
import '../widgets/ui/screen_loader.dart';
import '../widgets/vendors/vendor_leaderboard_modal.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  Map<String, dynamic>? _catalog;
  String _error = '';
  bool _ready = false;
  VoidCallback? _unsub;

  @override
  void initState() {
    super.initState();
    _load();
    _unsub = CatalogEvents.onCatalogChange(_load);
  }

  @override
  void dispose() {
    _unsub?.call();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final raw = await apiGet<dynamic>('/api/feed');
      final data = raw is Map
          ? Map<String, dynamic>.from(raw)
          : <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        _catalog = data;
        _error = '';
        _ready = true;
      });
    } catch (e) {
      debugPrint('Feed load failed: $e');
      if (!mounted) return;
      setState(() {
        _error = e is ApiException && e.code == 'SERVER_DOWN'
            ? 'Cannot reach the API at the configured backend URL.'
            : '$e';
        _ready = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();

    final posts = (_catalog?['posts'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final listings = (_catalog?['listings'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final vendors = (_catalog?['vendors'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final events = (_catalog?['events'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final news = _catalog?['news'] is Map
        ? Map<String, dynamic>.from(_catalog!['news'] as Map)
        : null;
    final categories = (_catalog?['categories'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final shorts = (_catalog?['shorts'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final items = <Map<String, dynamic>>[
      ...posts.map((p) => {'type': 'post', 'data': p}),
      ...listings.map((l) => {'type': 'listing', 'data': l}),
    ];

    final wide = MediaQuery.sizeOf(context).width >= 1024;

    final center = ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [
        if (_error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              SocialUi.pagePad,
              SocialUi.feedGap,
              SocialUi.pagePad,
              0,
            ),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(SocialUi.cardRadius),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(_error,
                  style: const TextStyle(
                      color: Color(0xFFDC2626), fontWeight: FontWeight.w600)),
            ),
          ),
        CreatePost(onCreated: _load),
        if (shorts.isNotEmpty) ReelsStrip(shorts: shorts),
        const SizedBox(height: SocialUi.feedGap),
        if (items.isEmpty)
          const PageEmpty(
            message: 'Your feed is quiet — follow dealers or list a gem',
            icon: Icons.dynamic_feed_outlined,
          )
        else
          ...items.map((item) {
            if (item['type'] == 'post') {
              return Padding(
                padding: const EdgeInsets.only(bottom: SocialUi.feedGap),
                child: PostCard(post: item['data'] as Map<String, dynamic>),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: SocialUi.feedGap),
              child: ListingCard(
                listing: item['data'] as Map<String, dynamic>,
                variant: ListingCardVariant.feed,
              ),
            );
          }),
      ],
    );

    if (!wide) return center;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          width: 260,
          child: ListView(
            children: [
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.trending_up, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text('Trending Categories',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (categories.isEmpty)
                      const Text('No marketplace gems yet.',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.slate400))
                    else
                      ...categories.map((cat) => ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text('${cat['name']}'),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.gray100,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${cat['badge'] ?? cat['count'] ?? ''}',
                                style: const TextStyle(fontSize: 10),
                              ),
                            ),
                            onTap: () => context.go(
                              '/marketplace?gem=${Uri.encodeComponent('${cat['name']}')}',
                            ),
                          )),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _card(
                color: AppColors.primarySoft,
                borderColor: AppColors.primaryBorder,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.emoji_events_outlined,
                            color: AppColors.primary),
                        SizedBox(width: 8),
                        Text('Verified Dealers',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Top rated and verified businesses this week.',
                      style:
                          TextStyle(fontSize: 12, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 12),
                    ...vendors.map((vendor) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 16,
                                backgroundColor: Colors.white,
                                child: ClipOval(
                                  child: LoadingImage(
                                    src: resolveAvatar(vendor['logo']),
                                    width: 32,
                                    height: 32,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${vendor['companyName']}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      'Rating: ${vendor['rating']} ★',
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.gray500),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )),
                    TextButton(
                      onPressed: () => showDialog(
                        context: context,
                        builder: (_) => const VendorLeaderboardModal(),
                      ),
                      child: const Text('View Leaderboard',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 24),
        Expanded(child: center),
        const SizedBox(width: 24),
        SizedBox(
          width: 260,
          child: ListView(
            children: [
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.calendar_month_outlined,
                            color: AppColors.primary),
                        SizedBox(width: 8),
                        Text('Upcoming Events',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...events.take(4).map((event) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          title: Text('${event['title']}',
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w700)),
                          subtitle: Text('${event['date']} · ${event['type']}',
                              style: const TextStyle(fontSize: 11)),
                          onTap: () => context.push('/events'),
                        )),
                    TextButton(
                      onPressed: () => context.push('/events'),
                      child: const Text('View all',
                          style: TextStyle(color: AppColors.primary)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _card(
                child: news == null
                    ? Column(
                        children: [
                          const Text('No industry news yet.',
                              style: TextStyle(color: AppColors.slate400)),
                          TextButton(
                            onPressed: () {},
                            child: const Text('Write Article'),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (news['image'] != null)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: AspectRatio(
                                aspectRatio: 16 / 9,
                                child: LoadingImage(
                                  src: '${news['image']}',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          const SizedBox(height: 12),
                          Text(
                            '${news['title']}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          TextButton(
                            onPressed: () => context.push('/news'),
                            child: const Text('Read more',
                                style: TextStyle(color: AppColors.primary)),
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _card({
    required Widget child,
    Color? color,
    Color? borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(SocialUi.pagePad),
      decoration: BoxDecoration(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(SocialUi.cardRadius),
        border: Border.all(color: borderColor ?? SocialUi.hairline),
        boxShadow: SocialUi.softShadow,
      ),
      child: child,
    );
  }
}
