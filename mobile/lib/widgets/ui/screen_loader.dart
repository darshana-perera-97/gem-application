import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import 'brand_gem.dart';

/// In-app loading screen used while screens / data fetch.
class ScreenLoader extends StatefulWidget {
  const ScreenLoader({
    super.key,
    this.message = 'Loading',
    this.fullscreen = true,
  });

  final String message;
  final bool fullscreen;

  @override
  State<ScreenLoader> createState() => _ScreenLoaderState();
}

class _ScreenLoaderState extends State<ScreenLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final body = Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 72,
            height: 72,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primarySoft,
                      ),
                    ),
                    Transform.rotate(
                      angle: _controller.value * 2 * math.pi,
                      child: CustomPaint(
                        size: const Size(72, 72),
                        painter: _RingPainter(
                          color: AppColors.primary,
                          stroke: 2.5,
                        ),
                      ),
                    ),
                    Transform.rotate(
                      angle: -_controller.value * 2 * math.pi,
                      child: CustomPaint(
                        size: const Size(50, 50),
                        painter: _RingPainter(
                          color: AppColors.accent,
                          stroke: 2,
                        ),
                      ),
                    ),
                    const BrandGemIcon(size: 24),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 18),
          Text(
            widget.message,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              letterSpacing: -0.1,
              color: AppColors.slate500,
            ),
          ),
        ],
      ),
    );

    if (!widget.fullscreen) return body;

    return ColoredBox(
      color: AppColors.background,
      child: body,
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.color, required this.stroke});

  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    final rect = Offset.zero & size;
    canvas.drawArc(rect.deflate(stroke), -1.2, 4.2, false, paint);
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.stroke != stroke;
}
