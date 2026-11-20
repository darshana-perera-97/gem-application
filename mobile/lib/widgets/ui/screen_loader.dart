import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class ScreenLoader extends StatefulWidget {
  const ScreenLoader({super.key});

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
    return ColoredBox(
      color: AppColors.background,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryGlow,
                              blurRadius: 28,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      Transform.rotate(
                        angle: _controller.value * 2 * math.pi,
                        child: CustomPaint(
                          size: const Size(80, 80),
                          painter: _RingPainter(
                            color: AppColors.primary,
                            stroke: 3,
                          ),
                        ),
                      ),
                      Transform.rotate(
                        angle: -_controller.value * 2 * math.pi,
                        child: CustomPaint(
                          size: const Size(56, 56),
                          painter: _RingPainter(
                            color: AppColors.accent,
                            stroke: 2.5,
                          ),
                        ),
                      ),
                      const Icon(Icons.diamond_outlined,
                          color: AppColors.primary, size: 28),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'LOADING',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 6.5,
                color: AppColors.slate500,
              ),
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: SizedBox(
                width: 72,
                height: 3,
                child: LinearProgressIndicator(
                  backgroundColor: AppColors.slate200,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
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
