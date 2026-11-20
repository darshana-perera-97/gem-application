import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../config/api_config.dart';
import '../../theme/app_colors.dart';
import '../../utils/images.dart';

class LoadingImage extends StatefulWidget {
  const LoadingImage({
    super.key,
    this.src,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
  });

  final String? src;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  @override
  State<LoadingImage> createState() => _LoadingImageState();
}

class _LoadingImageState extends State<LoadingImage> {
  bool _loaded = false;
  bool _failed = false;

  @override
  void didUpdateWidget(covariant LoadingImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.src != widget.src) {
      _loaded = false;
      _failed = false;
    }
  }

  void _markLoaded() {
    if (_loaded || !mounted) return;
    setState(() => _loaded = true);
  }

  void _markFailed() {
    if (!mounted) return;
    setState(() {
      _failed = true;
      _loaded = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final source = toFlutterImageSource(widget.src);

    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.zero,
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: source == null || source.isEmpty
            ? const _ImagePlaceholder(failed: true)
            : Stack(
                fit: StackFit.expand,
                children: [
                  // Shimmer stays visible until the image is ready.
                  if (!_loaded) const _ImageShimmer(),
                  AnimatedOpacity(
                    opacity: _loaded ? 1 : 0,
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOut,
                    child: _failed
                        ? const _ImagePlaceholder(failed: true)
                        : _buildImage(source),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildImage(String source) {
    if (source.endsWith('.svg') && isAssetImage(source)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _markLoaded());
      return SvgPicture.asset(source, fit: widget.fit);
    }

    if (isAssetImage(source)) {
      return Image.asset(
        source,
        fit: widget.fit,
        width: widget.width,
        height: widget.height,
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
          if (wasSynchronouslyLoaded || frame != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _markLoaded());
          }
          return child;
        },
        errorBuilder: (_, __, ___) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _markFailed());
          return const SizedBox.shrink();
        },
      );
    }

    var url = source;
    if (url.startsWith('/') && !url.startsWith('//')) {
      url = '${ApiConfig.baseUrl}$url';
    }

    return CachedNetworkImage(
      imageUrl: url,
      fit: widget.fit,
      width: widget.width,
      height: widget.height,
      fadeInDuration: Duration.zero,
      fadeOutDuration: Duration.zero,
      placeholder: (_, __) => const SizedBox.shrink(),
      errorWidget: (_, __, ___) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _markFailed());
        return const SizedBox.shrink();
      },
      imageBuilder: (context, provider) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _markLoaded());
        return Image(image: provider, fit: widget.fit);
      },
    );
  }
}

/// Soft pulsing shimmer shown while an image is loading.
class _ImageShimmer extends StatefulWidget {
  const _ImageShimmer();

  @override
  State<_ImageShimmer> createState() => _ImageShimmerState();
}

class _ImageShimmerState extends State<_ImageShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value;
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1.0 - t * 2, -0.3),
              end: Alignment(1.0 - t * 2, 0.3),
              colors: const [
                Color(0xFFE8EEF4),
                Color(0xFFF5F7FA),
                Color(0xFFE8EEF4),
              ],
              stops: const [0.15, 0.45, 0.75],
            ),
          ),
          alignment: Alignment.center,
          child: Icon(
            Icons.image_outlined,
            size: 28,
            color: AppColors.slate400.withValues(alpha: 0.7),
          ),
        );
      },
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder({this.failed = false});

  final bool failed;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFE7EDF4),
      child: Center(
        child: Icon(
          failed ? Icons.broken_image_outlined : Icons.image_outlined,
          size: 28,
          color: AppColors.slate400,
        ),
      ),
    );
  }
}
