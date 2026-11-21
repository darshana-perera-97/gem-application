import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

/// Facebook-style Reels tray for the Feed page.
class ReelsStrip extends StatelessWidget {
  const ReelsStrip({
    super.key,
    required this.shorts,
  });

  final List<Map<String, dynamic>> shorts;

  Future<void> _openReel(
    BuildContext context, {
    required int index,
  }) async {
    if (shorts.isEmpty) return;
    final auth = context.read<AuthProvider>();
    final short = shorts[index];
    try {
      await apiPost('/api/shorts/${short['id']}/view', {
        if (auth.uid != null) 'userId': auth.uid,
      });
    } catch (_) {}
    if (!context.mounted) return;
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Close reels',
      barrierColor: Colors.black,
      pageBuilder: (_, __, ___) => _ReelsViewer(
        shorts: shorts,
        initialIndex: index,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (shorts.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: SocialUi.feedGap),
      padding: const EdgeInsets.only(bottom: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: SocialUi.hairline, width: 0.5),
          bottom: BorderSide(color: SocialUi.hairline, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 8, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.movie_filter_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Reels',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                    color: AppColors.slate900,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => _openReel(context, index: 0),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    textStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  child: const Text('See all'),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: shorts.length + 1,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _CreateReelCard(
                    onTap: () {
                      final auth = context.read<AuthProvider>();
                      if (!auth.isSignedIn) {
                        context.push('/login');
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Reel upload is coming soon'),
                        ),
                      );
                    },
                  );
                }
                final short = shorts[index - 1];
                return _ReelCard(
                  short: short,
                  onTap: () => _openReel(context, index: index - 1),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CreateReelCard extends StatelessWidget {
  const _CreateReelCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF0F2F5),
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 124,
          height: 220,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: SocialUi.hairline),
                ),
                child: const Icon(
                  Icons.videocam_rounded,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Create reel',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.slate800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReelCard extends StatelessWidget {
  const _ReelCard({
    required this.short,
    required this.onTap,
  });

  final Map<String, dynamic> short;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final thumb = resolveImage(short['thumbnail']);
    final title = '${short['title'] ?? 'Reel'}';
    final dealer = '${short['dealerName'] ?? short['authorName'] ?? 'Dealer'}';
    final avatar = resolveAvatar(
      short['avatar'] ?? short['dealerAvatar'] ?? short['authorAvatar'],
    );

    return Material(
      color: AppColors.slate900,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 124,
          height: 220,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (thumb.isNotEmpty)
                LoadingImage(src: thumb, fit: BoxFit.cover)
              else
                const ColoredBox(color: AppColors.slate800),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0x33000000),
                      Color(0x00000000),
                      Color(0xCC000000),
                    ],
                    stops: [0, 0.45, 1],
                  ),
                ),
              ),
              const Positioned(
                top: 10,
                right: 10,
                child: Icon(
                  Icons.play_circle_fill_rounded,
                  color: Colors.white70,
                  size: 22,
                ),
              ),
              Positioned(
                left: 8,
                right: 8,
                bottom: 10,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 10,
                          backgroundColor: Colors.white24,
                          child: ClipOval(
                            child: LoadingImage(
                              src: avatar,
                              width: 20,
                              height: 20,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            dealer,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        height: 1.25,
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

class _ReelsViewer extends StatefulWidget {
  const _ReelsViewer({
    required this.shorts,
    required this.initialIndex,
  });

  final List<Map<String, dynamic>> shorts;
  final int initialIndex;

  @override
  State<_ReelsViewer> createState() => _ReelsViewerState();
}

class _ReelsViewerState extends State<_ReelsViewer> {
  late final PageController _pageController;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, widget.shorts.length - 1);
    _pageController = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final short = widget.shorts[_index];
    final title = '${short['title'] ?? ''}';
    final dealer = '${short['dealerName'] ?? short['authorName'] ?? ''}';

    return Material(
      color: Colors.black,
      child: SafeArea(
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              scrollDirection: Axis.vertical,
              itemCount: widget.shorts.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => _ReelPlayer(short: widget.shorts[i]),
            ),
            Positioned(
              top: 4,
              left: 4,
              right: 4,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: Colors.white),
                  ),
                  const Spacer(),
                  const Text(
                    'Reels',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const Spacer(),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Positioned(
              left: 16,
              right: 72,
              bottom: 28,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (dealer.isNotEmpty)
                    Text(
                      dealer,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  if (title.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.92),
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                        height: 1.35,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReelPlayer extends StatefulWidget {
  const _ReelPlayer({required this.short});

  final Map<String, dynamic> short;

  @override
  State<_ReelPlayer> createState() => _ReelPlayerState();
}

class _ReelPlayerState extends State<_ReelPlayer> {
  VideoPlayerController? _controller;
  bool _ready = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final raw = '${widget.short['video'] ?? ''}'.trim();
    if (raw.isEmpty) {
      setState(() => _failed = true);
      return;
    }
    final uri = Uri.tryParse(raw);
    if (uri == null || !(uri.isScheme('http') || uri.isScheme('https'))) {
      setState(() => _failed = true);
      return;
    }
    final controller = VideoPlayerController.networkUrl(uri);
    _controller = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      await controller.play();
      if (mounted) setState(() => _ready = true);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final thumb = resolveImage(widget.short['thumbnail']);

    if (_failed) {
      return Stack(
        fit: StackFit.expand,
        children: [
          if (thumb.isNotEmpty)
            LoadingImage(src: thumb, fit: BoxFit.cover)
          else
            const ColoredBox(color: Colors.black),
          const Center(
            child: Text(
              'Video unavailable',
              style: TextStyle(color: Colors.white70),
            ),
          ),
        ],
      );
    }

    if (!_ready || _controller == null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          if (thumb.isNotEmpty)
            LoadingImage(src: thumb, fit: BoxFit.cover)
          else
            const ColoredBox(color: Colors.black),
          const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
        ],
      );
    }

    return GestureDetector(
      onTap: () {
        final c = _controller!;
        if (c.value.isPlaying) {
          c.pause();
        } else {
          c.play();
        }
        setState(() {});
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller!.value.size.width,
              height: _controller!.value.size.height,
              child: VideoPlayer(_controller!),
            ),
          ),
          if (!_controller!.value.isPlaying)
            const Center(
              child: Icon(
                Icons.play_circle_fill_rounded,
                color: Colors.white70,
                size: 64,
              ),
            ),
        ],
      ),
    );
  }
}
