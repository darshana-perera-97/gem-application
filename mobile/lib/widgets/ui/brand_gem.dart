import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

/// The brand gem used in the loading animation — shared across all branding.
class BrandGemIcon extends StatelessWidget {
  const BrandGemIcon({
    super.key,
    this.size = 24,
    this.color = AppColors.primary,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Icon(
      Icons.diamond_outlined,
      size: size,
      color: color,
      semanticLabel: 'GemBook',
    );
  }
}

/// Rounded gem mark tile for splash / chrome.
class BrandGem extends StatelessWidget {
  const BrandGem({
    super.key,
    this.size = 48,
    this.iconSize,
    this.backgroundColor,
    this.iconColor = AppColors.primary,
    this.borderRadius,
    this.showShadow = false,
  });

  final double size;
  final double? iconSize;
  final Color? backgroundColor;
  final Color iconColor;
  final double? borderRadius;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? size * 0.28;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.slate200.withValues(alpha: 0.9)),
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.16),
                  blurRadius: size * 0.28,
                  offset: Offset(0, size * 0.1),
                ),
              ]
            : null,
      ),
      alignment: Alignment.center,
      child: BrandGemIcon(
        size: iconSize ?? size * 0.46,
        color: iconColor,
      ),
    );
  }
}
