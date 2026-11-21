import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers/activity_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/format.dart';
import '../../utils/images.dart';
import '../../utils/share_item.dart';
import '../ui/loading_image.dart';

enum ListingCardVariant { grid, list, feed }

/// Marketplace product card — Facebook Marketplace–style density + GemBook accents.
class ListingCard extends StatefulWidget {
  const ListingCard({
    super.key,
    required this.listing,
    this.variant = ListingCardVariant.grid,
    this.ownerMode = false,
    this.statusBusy = false,
    this.onMarkSold,
    this.onMarkAvailable,
  });

  final Map<String, dynamic> listing;
  final ListingCardVariant variant;
  final bool ownerMode;
  final bool statusBusy;
  final VoidCallback? onMarkSold;
  final VoidCallback? onMarkAvailable;

  @override
  State<ListingCard> createState() => _ListingCardState();
}

class _ListingCardState extends State<ListingCard> {
  int _activeIndex = 0;

  Map<String, dynamic> get listing => widget.listing;

  String get _title {
    final raw =
        '${listing['title'] ?? '${listing['variety'] ?? ''} ${listing['type'] ?? ''}'.trim()}';
    return raw.isEmpty ? 'Gem listing' : raw;
  }

  Map<String, dynamic> get _vendor => listing['vendor'] is Map
      ? Map<String, dynamic>.from(listing['vendor'] as Map)
      : <String, dynamic>{};

  String get _dealerName {
    final raw =
        '${_vendor['displayName'] ?? _vendor['companyName'] ?? ''}'.trim();
    return raw.isEmpty ? 'Dealer' : raw;
  }

  String get _dealerAvatar =>
      resolveAvatar(_vendor['photoURL'] ?? _vendor['logo']);

  String get _dealerPhone => '${_vendor['phone'] ?? ''}';

  String get _origin => '${listing['origin'] ?? _vendor['location'] ?? ''}';

  List<String> get _images => (listing['images'] as List? ?? [])
      .map((e) => resolveGem(e))
      .where((e) => e.isNotEmpty)
      .toList();

  bool get _isSold => listing['status'] == 'SOLD';

  bool get _certified {
    final cert = listing['certification'];
    final certificate = listing['certificate'];
    return (cert != null && cert != 'None') ||
        (certificate is Map && certificate['verified'] == true);
  }

  bool get _featured => listing['featured'] == true;

  String get _priceLabel => formatCurrency(
        listing['price'],
        currency: '${listing['currency'] ?? 'LKR'}',
      );

  String get _weightLabel =>
      '${listing['caratWeight'] ?? listing['weight'] ?? '—'} ct';

  Future<void> _toggleSave() async {
    try {
      await context.read<ActivityProvider>().toggleSave('${listing['id']}');
    } catch (e) {
      debugPrint('$e');
    }
  }

  Future<void> _share() async {
    final id = '${listing['id']}';
    await showItemShareSheet(
      context,
      title: _title,
      url: listingShareUrl(id),
      message: 'Check out $_title on GemBook',
    );
  }

  Future<void> _message() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) {
      context.push('/login');
      return;
    }
    final vendorUserId = '${_vendor['userId'] ?? listing['vendorId'] ?? ''}';
    if (vendorUserId.isEmpty) {
      context.push('/listings/${listing['id']}');
      return;
    }
    try {
      await startConversation(
        currentUser: auth.userProfile!,
        otherUser: {
          'uid': vendorUserId,
          'displayName': _dealerName,
          'photoURL': _dealerAvatar,
          'listingId': listing['id'],
          'listingTitle': _title,
        },
      );
      if (mounted) context.push('/messages');
    } catch (_) {
      if (mounted) context.push('/listings/${listing['id']}');
    }
  }

  Future<void> _call() async {
    if (_dealerPhone.isEmpty) return;
    final uri = Uri.parse(
      'tel:${_dealerPhone.replaceAll(RegExp(r'[^\d+]'), '')}',
    );
    await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final saved =
        context.watch<ActivityProvider>().isSaved('${listing['id']}');

    switch (widget.variant) {
      case ListingCardVariant.list:
        return _buildList(saved: saved);
      case ListingCardVariant.feed:
        return _buildFeed(saved: saved);
      case ListingCardVariant.grid:
        return _buildGrid(saved: saved);
    }
  }

  /// Compact marketplace tile (FB Marketplace style).
  Widget _buildGrid({required bool saved}) {
    return Material(
      color: Colors.white,
      elevation: 0,
      shadowColor: Colors.transparent,
      borderRadius: BorderRadius.circular(SocialUi.cardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/listings/${listing['id']}'),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(SocialUi.cardRadius),
            border: Border.all(color: SocialUi.hairline.withValues(alpha: 0.8)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // AspectRatio (not Expanded) so this card also works in ListViews
              // with unbounded height (e.g. seller profile Collection).
              AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(
                      color: SocialUi.feedCanvas,
                      child: _images.isEmpty
                          ? const Center(
                              child: Icon(Icons.diamond_outlined,
                                  color: SocialUi.mute, size: 36),
                            )
                          : PageView.builder(
                              itemCount: _images.length,
                              onPageChanged: (i) =>
                                  setState(() => _activeIndex = i),
                              itemBuilder: (_, i) => ColorFiltered(
                                colorFilter: _isSold
                                    ? const ColorFilter.matrix(<double>[
                                        0.2126, 0.7152, 0.0722, 0, 0,
                                        0.2126, 0.7152, 0.0722, 0, 0,
                                        0.2126, 0.7152, 0.0722, 0, 0,
                                        0, 0, 0, 0.85, 0,
                                      ])
                                    : const ColorFilter.mode(
                                        Colors.transparent,
                                        BlendMode.dst,
                                      ),
                                child: LoadingImage(
                                  src: _images[i],
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                    ),
                    if (_isSold)
                      Center(
                        child: Transform.rotate(
                          angle: -0.18,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              border:
                                  Border.all(color: Colors.white, width: 3),
                            ),
                            child: const Text(
                              'SOLD',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 22,
                                letterSpacing: 2,
                                shadows: [
                                  Shadow(
                                      blurRadius: 8, color: Colors.black54),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_featured && !_isSold)
                            _badge('Premium', const Color(0xFFFBBF24)),
                          if (_certified) ...[
                            if (_featured && !_isSold)
                              const SizedBox(height: 4),
                            _badge('Certified', AppColors.primary,
                                icon: Icons.verified),
                          ],
                        ],
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _circleIcon(
                            onTap: _share,
                            icon: Icons.ios_share_rounded,
                            color: AppColors.slate700,
                          ),
                          if (!_isSold) ...[
                            const SizedBox(width: 6),
                            _circleIcon(
                              onTap: _toggleSave,
                              icon: saved
                                  ? Icons.favorite
                                  : Icons.favorite_border,
                              color: saved
                                  ? const Color(0xFFEF4444)
                                  : AppColors.slate700,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (_images.length > 1)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 8,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            _images.length.clamp(0, 5),
                            (i) => Container(
                              width: i == _activeIndex ? 14 : 5,
                              height: 5,
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 2),
                              decoration: BoxDecoration(
                                color: i == _activeIndex
                                    ? Colors.white
                                    : Colors.white60,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isSold ? 'Sold' : _priceLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: _isSold
                          ? SocialUi.priceStyle.copyWith(color: SocialUi.mute)
                          : SocialUi.priceStyle.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        height: 1.3,
                        letterSpacing: -0.1,
                        color: AppColors.slate800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.place_outlined,
                            size: 12, color: SocialUi.mute),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            _origin.isEmpty ? 'Sri Lanka' : _origin,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              color: SocialUi.mute,
                            ),
                          ),
                        ),
                        Text(
                          _weightLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: SocialUi.mute,
                          ),
                        ),
                      ],
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

  /// Horizontal marketplace row.
  Widget _buildList({required bool saved}) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(SocialUi.cardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/listings/${listing['id']}'),
        child: SizedBox(
          height: 136,
          child: Row(
            children: [
              SizedBox(
                width: 120,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(
                      color: SocialUi.feedCanvas,
                      child: _images.isEmpty
                          ? const Icon(Icons.diamond_outlined,
                              color: SocialUi.mute)
                          : LoadingImage(
                              src: _images[
                                  _activeIndex.clamp(0, _images.length - 1)],
                              fit: BoxFit.cover,
                            ),
                    ),
                    if (_isSold)
                      Container(
                        color: Colors.black45,
                        alignment: Alignment.center,
                        child: const Text(
                          'SOLD',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    if (_certified)
                      const Positioned(
                        top: 6,
                        left: 6,
                        child: Icon(Icons.verified,
                            size: 16, color: AppColors.primary),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isSold ? 'Sold' : _priceLabel,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: _isSold ? SocialUi.mute : AppColors.slate900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$_weightLabel · ${_origin.isEmpty ? 'Sri Lanka' : _origin}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: SocialUi.mute,
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 10,
                            backgroundColor: AppColors.slate100,
                            child: ClipOval(
                              child: _dealerAvatar.isEmpty
                                  ? Text(
                                      _dealerName[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 9),
                                    )
                                  : LoadingImage(
                                      src: _dealerAvatar,
                                      fit: BoxFit.cover,
                                      width: 20,
                                      height: 20,
                                    ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              _dealerName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (widget.ownerMode)
                            _ownerMiniActions()
                          else ...[
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: _share,
                              icon: const Icon(Icons.ios_share_rounded,
                                  size: 18, color: SocialUi.mute),
                            ),
                            if (!_isSold)
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: _toggleSave,
                                icon: Icon(
                                  saved
                                      ? Icons.favorite
                                      : Icons.favorite_border,
                                  size: 18,
                                  color: saved
                                      ? const Color(0xFFEF4444)
                                      : SocialUi.mute,
                                ),
                              ),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: _message,
                              icon: const Icon(Icons.chat_bubble_outline,
                                  size: 18, color: SocialUi.mute),
                            ),
                          ],
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

  /// Full-width social feed listing card.
  Widget _buildFeed({required bool saved}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: SocialUi.pagePad),
      decoration: SocialUi.elevatedCardDecoration,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 8, 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () =>
                      context.push('/vendors/${listing['vendorId']}'),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.slate100,
                    child: ClipOval(
                      child: _dealerAvatar.isEmpty
                          ? Text(_dealerName[0].toUpperCase())
                          : LoadingImage(
                              src: _dealerAvatar,
                              fit: BoxFit.cover,
                              width: 40,
                              height: 40,
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () =>
                        context.push('/vendors/${listing['vendorId']}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_vendor['verified'] == true)
                          const Text(
                            'Verified dealer',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        Text(_dealerName, style: SocialUi.nameStyle),
                        if (_origin.isNotEmpty)
                          Text(_origin, style: SocialUi.metaStyle),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _share,
                  icon: const Icon(
                    Icons.ios_share_rounded,
                    color: SocialUi.mute,
                  ),
                ),
                if (!_isSold)
                  IconButton(
                    onPressed: _toggleSave,
                    icon: Icon(
                      saved ? Icons.favorite : Icons.favorite_border,
                      color: saved
                          ? const Color(0xFFEF4444)
                          : SocialUi.mute,
                    ),
                  ),
              ],
            ),
          ),
          AspectRatio(
            aspectRatio: 1,
            child: Stack(
              fit: StackFit.expand,
              children: [
                GestureDetector(
                  onTap: () => context.push('/listings/${listing['id']}'),
                  child: ColoredBox(
                    color: SocialUi.feedCanvas,
                    child: _images.isEmpty
                        ? const Center(
                            child: Icon(Icons.diamond_outlined, size: 48),
                          )
                        : PageView.builder(
                            itemCount: _images.length,
                            onPageChanged: (i) =>
                                setState(() => _activeIndex = i),
                            itemBuilder: (_, i) => LoadingImage(
                              src: _images[i],
                              fit: BoxFit.cover,
                            ),
                          ),
                  ),
                ),
                if (_isSold)
                  Container(
                    color: Colors.black45,
                    alignment: Alignment.center,
                    child: const Text(
                      'SOLD',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 32,
                        letterSpacing: 3,
                      ),
                    ),
                  ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_featured && !_isSold)
                        _badge('Premium', const Color(0xFFFBBF24)),
                      if (_certified) ...[
                        if (_featured && !_isSold) const SizedBox(height: 6),
                        _badge('Certified', AppColors.primary,
                            icon: Icons.verified),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () =>
                            context.push('/listings/${listing['id']}'),
                        child: Text(_title, style: SocialUi.nameStyle),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _chip(Icons.scale, _weightLabel),
                          if (_origin.isNotEmpty)
                            _chip(Icons.place_outlined, _origin),
                        ],
                      ),
                    ],
                  ),
                ),
                Flexible(
                  child: Text(
                    _isSold ? 'Sold' : _priceLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: _isSold ? SocialUi.mute : AppColors.accent,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 16, color: SocialUi.hairline),
          if (widget.ownerMode)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: _ownerActions(),
            )
          else
            Row(
              children: [
                _feedAction(Icons.chat_bubble_outline, 'Message', _message),
                if (_dealerPhone.isNotEmpty)
                  _feedAction(Icons.phone_outlined, 'Call', _call),
                _feedAction(Icons.share_outlined, 'Share', _share),
              ],
            ),
        ],
      ),
    );
  }

  Widget _ownerMiniActions() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextButton(
          onPressed: () => context.push('/listings/${listing['id']}/edit'),
          child: const Text('Edit', style: TextStyle(fontSize: 11)),
        ),
      ],
    );
  }

  Widget _ownerActions() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.push('/listings/${listing['id']}/edit'),
            icon: const Icon(Icons.edit, size: 14),
            label: const Text('Edit'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: widget.statusBusy
                ? null
                : (_isSold ? widget.onMarkAvailable : widget.onMarkSold),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  _isSold ? AppColors.primary : AppColors.slate900,
            ),
            icon: Icon(_isSold ? Icons.restart_alt : Icons.check, size: 14),
            label: Text(_isSold ? 'Available' : 'Mark sold'),
          ),
        ),
      ],
    );
  }

  Widget _feedAction(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: SocialUi.mute),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: SocialUi.actionLabelStyle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(String label, Color color, {IconData? icon}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: Colors.white),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: SocialUi.mute),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: SocialUi.mute,
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleIcon({
    required VoidCallback onTap,
    required IconData icon,
    required Color color,
  }) {
    return Material(
      color: Colors.white.withValues(alpha: 0.94),
      shape: const CircleBorder(),
      elevation: 0,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}
