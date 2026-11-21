import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/chat_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../marketplace/listing_card.dart';
import '../ui/loading_image.dart';
import '../ui/screen_loader.dart';
import '../vendors/reviews_section.dart';

class SellerProfileView extends StatefulWidget {
  const SellerProfileView({
    super.key,
    required this.vendorId,
    this.isOwnProfile = false,
    this.settingsBuilder,
  });

  final String vendorId;
  final bool isOwnProfile;
  final WidgetBuilder? settingsBuilder;

  @override
  State<SellerProfileView> createState() => _SellerProfileViewState();
}

class _SellerProfileViewState extends State<SellerProfileView>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _vendor;
  List<Map<String, dynamic>> _listings = [];
  late TabController _tabs;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    final tabCount = widget.settingsBuilder != null ? 3 : 2;
    _tabs = TabController(length: tabCount, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final vendor =
          await apiGet<Map<String, dynamic>>('/api/vendors/${widget.vendorId}');
      final listings = await apiGet<List<dynamic>>('/api/listings');
      if (!mounted) return;
      setState(() {
        _vendor = vendor;
        _listings = listings
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((l) => '${l['vendorId']}' == widget.vendorId)
            .toList();
        _ready = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ready = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const ScreenLoader();
    }
    final vendor = _vendor;
    if (vendor == null) {
      return const Center(child: Text('Vendor not found'));
    }

    final auth = context.watch<AuthProvider>();
    final activity = context.watch<ActivityProvider>();
    final following =
        activity.isFollowing(widget.vendorId, 'vendor');
    final isSelf = auth.uid != null &&
        (auth.uid == '${vendor['userId']}' || widget.isOwnProfile);

    return NestedScrollView(
      headerSliverBuilder: (context, _) => [
        SliverToBoxAdapter(
          child: Column(
            children: [
              SizedBox(
                height: 220,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(
                      color: AppColors.slate200,
                      child: LoadingImage(
                        src: resolveCover(vendor['coverImage']),
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      left: 20,
                      bottom: 16,
                      child: Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white, width: 4),
                          color: Colors.white,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: LoadingImage(
                          src: resolveAvatar(
                              vendor['logo'] ?? vendor['photoURL']),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${vendor['companyName'] ?? vendor['displayName'] ?? 'Vendor'}',
                      style: SocialUi.pageTitleStyle.copyWith(fontSize: 24),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${vendor['location'] ?? 'Sri Lanka'}',
                      style: SocialUi.metaStyle.copyWith(fontSize: 13),
                    ),
                    if (vendor['description'] != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        '${vendor['description']}',
                        style: SocialUi.bodyStyle,
                      ),
                    ],
                    const SizedBox(height: 14),
                    if (!isSelf)
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => activity.toggleFollow(
                                  widget.vendorId, 'vendor'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: following
                                    ? AppColors.slate100
                                    : AppColors.primary,
                                foregroundColor: following
                                    ? AppColors.slate700
                                    : Colors.white,
                                elevation: 0,
                              ),
                              child: Text(following ? 'Following' : 'Follow'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () async {
                                if (!auth.isSignedIn) {
                                  context.push('/login');
                                  return;
                                }
                                try {
                                  await startConversation(
                                    currentUser: auth.userProfile!,
                                    otherUser: {
                                      'uid':
                                          vendor['userId'] ?? widget.vendorId,
                                      'displayName': vendor['companyName'] ??
                                          vendor['displayName'],
                                      'photoURL': vendor['logo'] ??
                                          vendor['photoURL'],
                                    },
                                  );
                                  if (context.mounted) {
                                    context.push('/messages');
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('$e')),
                                    );
                                  }
                                }
                              },
                              child: const Text('Message'),
                            ),
                          ),
                        ],
                      ),
                    TabBar(
                      controller: _tabs,
                      labelColor: AppColors.primary,
                      unselectedLabelColor: AppColors.slate500,
                      indicatorColor: AppColors.primary,
                      indicatorSize: TabBarIndicatorSize.label,
                      labelStyle: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      unselectedLabelStyle: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      tabs: [
                        const Tab(text: 'Collection'),
                        const Tab(text: 'Reviews'),
                        if (widget.settingsBuilder != null)
                          const Tab(text: 'Settings'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabs,
        children: [
          ListView(
            padding: SocialUi.pageInsets,
            children: _listings.isEmpty
                ? [
                    const Text(
                      'No gems listed yet.',
                      style: TextStyle(color: SocialUi.mute),
                    ),
                  ]
                : _listings
                    .map((l) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: SocialUi.itemGap),
                          child: ListingCard(
                            listing: l,
                            variant: ListingCardVariant.list,
                          ),
                        ))
                    .toList(),
          ),
          ListView(
            padding: SocialUi.pageInsets,
            children: [
              ReviewsSection(
                vendorId: widget.vendorId,
                canReview: !isSelf && auth.isSignedIn,
              ),
            ],
          ),
          if (widget.settingsBuilder != null)
            ListView(
              padding: SocialUi.pageInsets,
              children: [widget.settingsBuilder!(context)],
            ),
        ],
      ),
    );
  }
}
