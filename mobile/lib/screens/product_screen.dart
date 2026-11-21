import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/activity_provider.dart';
import '../providers/add_listing_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../services/chat_service.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../utils/format.dart';
import '../utils/images.dart';
import '../utils/share_item.dart';
import '../widgets/ui/loading_image.dart';
import '../widgets/ui/screen_loader.dart';

class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.listingId});

  final String listingId;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  Map<String, dynamic>? _listing;
  bool _ready = false;
  int _imageIndex = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data =
          await apiGet<Map<String, dynamic>>('/api/listings/${widget.listingId}');
      if (!mounted) return;
      setState(() {
        _listing = data;
        _ready = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ready = true);
    }
  }

  Future<void> _messageSeller(
    AuthProvider auth,
    Map<String, dynamic> vendor,
    Map<String, dynamic> listing,
    String title,
  ) async {
    if (!auth.isSignedIn) {
      context.push('/login');
      return;
    }
    final vendorUserId = '${vendor['userId'] ?? listing['vendorId']}';
    try {
      await startConversation(
        currentUser: auth.userProfile!,
        otherUser: {
          'uid': vendorUserId,
          'displayName':
              vendor['displayName'] ?? vendor['companyName'] ?? 'Member',
          'photoURL': vendor['photoURL'] ?? vendor['logo'] ?? '',
          'listingId': listing['id'],
          'listingTitle': title,
        },
      );
      if (mounted) context.push('/messages');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();
    final listing = _listing;
    if (listing == null) {
      return const Center(child: Text('Listing not found'));
    }

    final vendor = listing['vendor'] is Map
        ? Map<String, dynamic>.from(listing['vendor'] as Map)
        : <String, dynamic>{};
    final images = (listing['images'] as List? ?? [])
        .map((e) => resolveGem(e))
        .where((e) => e.isNotEmpty)
        .toList();
    final title =
        '${listing['title'] ?? '${listing['variety'] ?? ''} ${listing['type'] ?? ''}'.trim()}';
    final auth = context.watch<AuthProvider>();
    final activity = context.watch<ActivityProvider>();
    final saved = activity.isSaved('${listing['id']}');
    final isOwner = auth.uid != null &&
        (auth.uid == '${vendor['userId']}' ||
            auth.uid == '${listing['ownerId']}');
    final price = formatCurrency(
      listing['price'],
      currency: '${listing['currency'] ?? 'LKR'}',
    );

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: SocialUi.pageInsets,
            children: [
              Text(
                'Marketplace · $title',
                style: const TextStyle(fontSize: 12, color: SocialUi.mute),
              ),
              const SizedBox(height: SocialUi.sectionGap),
              AspectRatio(
                aspectRatio: 4 / 3,
                child: Container(
                  decoration: SocialUi.elevatedCardDecoration,
                  clipBehavior: Clip.antiAlias,
                  child: images.isEmpty
                      ? ColoredBox(
                          color: AppColors.slate100,
                          child: Icon(Icons.diamond_outlined,
                              size: 48, color: AppColors.primary.withValues(alpha: 0.5)),
                        )
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            PageView.builder(
                              itemCount: images.length,
                              onPageChanged: (i) =>
                                  setState(() => _imageIndex = i),
                              itemBuilder: (_, i) => LoadingImage(
                                  src: images[i], fit: BoxFit.cover),
                            ),
                            if (images.length > 1)
                              Positioned(
                                left: 0,
                                right: 0,
                                bottom: 12,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(
                                    images.length,
                                    (i) => AnimatedContainer(
                                      duration: const Duration(milliseconds: 180),
                                      width: i == _imageIndex ? 18 : 6,
                                      height: 6,
                                      margin: const EdgeInsets.symmetric(
                                          horizontal: 2),
                                      decoration: BoxDecoration(
                                        color: i == _imageIndex
                                            ? Colors.white
                                            : Colors.white60,
                                        borderRadius: BorderRadius.circular(
                                            SocialUi.chipRadius),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                ),
              ),
              if (listing['certification'] != null &&
                  listing['certification'] != 'None')
                Container(
                  margin: const EdgeInsets.only(top: SocialUi.sectionGap),
                  padding: const EdgeInsets.all(14),
                  decoration: SocialUi.elevatedCardDecoration,
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.verified_rounded,
                            color: AppColors.primary),
                      ),
                      const SizedBox(width: SocialUi.itemGap),
                      Expanded(
                        child: Text(
                          'Certified · ${listing['certification']}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: SocialUi.sectionGap),
              Container(
                padding: const EdgeInsets.all(SocialUi.pagePad),
                decoration: SocialUi.elevatedCardDecoration,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: SocialUi.pageTitleStyle),
                    const SizedBox(height: 8),
                    Text(price, style: SocialUi.priceStyle.copyWith(fontSize: 28)),
                    const SizedBox(height: SocialUi.sectionGap),
                    InkWell(
                      onTap: () =>
                          context.push('/vendors/${listing['vendorId']}'),
                      borderRadius:
                          BorderRadius.circular(SocialUi.cardRadius),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: SocialUi.feedCanvas,
                          borderRadius:
                              BorderRadius.circular(SocialUi.cardRadius),
                          border: Border.all(color: SocialUi.hairline),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.white,
                              child: ClipOval(
                                child: LoadingImage(
                                  src: resolveAvatar(
                                      vendor['photoURL'] ?? vendor['logo']),
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            const SizedBox(width: SocialUi.itemGap),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${vendor['displayName'] ?? vendor['companyName'] ?? 'Vendor'}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    '${vendor['location'] ?? listing['origin'] ?? ''}',
                                    style: SocialUi.metaStyle,
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded,
                                color: SocialUi.mute),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: SocialUi.sectionGap),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () =>
                              activity.toggleSave('${listing['id']}'),
                          style: IconButton.styleFrom(
                            backgroundColor: SocialUi.feedCanvas,
                          ),
                          icon: Icon(
                            saved
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color: saved
                                ? const Color(0xFFEF4444)
                                : AppColors.slate500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: () => showItemShareSheet(
                            context,
                            title: title,
                            url: listingShareUrl('${listing['id']}'),
                            message: 'Check out $title on GemBook',
                          ),
                          style: IconButton.styleFrom(
                            backgroundColor: SocialUi.feedCanvas,
                          ),
                          icon: const Icon(Icons.ios_share_rounded),
                        ),
                      ],
                    ),
                    const Divider(height: 28),
                    _spec('Weight',
                        '${listing['caratWeight'] ?? listing['weight'] ?? '—'} ct'),
                    _spec('Cut', '${listing['cut'] ?? '—'}'),
                    _spec('Clarity', '${listing['clarity'] ?? '—'}'),
                    _spec('Treatment', '${listing['treatment'] ?? '—'}'),
                    _spec('Origin', '${listing['origin'] ?? '—'}'),
                    _spec(
                        'Certification', '${listing['certification'] ?? '—'}'),
                  ],
                ),
              ),
              const SizedBox(height: 88),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(
            SocialUi.pagePad,
            14,
            SocialUi.pagePad,
            14,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: SocialUi.hairline)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Price',
                        style: TextStyle(fontSize: 12, color: SocialUi.mute),
                      ),
                      Text(
                        price,
                        style: SocialUi.priceStyle.copyWith(fontSize: 18),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: isOwner
                        ? () => context
                            .read<AddListingProvider>()
                            .openAddListing('${listing['id']}')
                        : () => _messageSeller(auth, vendor, listing, title),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                    child: Text(isOwner ? 'Edit listing' : 'Send inquiry'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _spec(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: SocialUi.mute,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
