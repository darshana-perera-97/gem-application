import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import 'brand_gem.dart';

/// Square GemBook gem mark — same diamond used in the loading animation.
class BrandMark extends StatelessWidget {
  const BrandMark({
    super.key,
    this.size = 40,
    this.borderRadius,
    this.showShadow = false,
  });

  final double size;
  final double? borderRadius;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    return BrandGem(
      size: size,
      borderRadius: borderRadius,
      showShadow: showShadow,
      backgroundColor: AppColors.primarySoft,
      iconColor: AppColors.primary,
    );
  }
}

/// Horizontal GemBook wordmark: loading-style gem + text.
class BrandLogo extends StatelessWidget {
  const BrandLogo({
    super.key,
    this.height = 28,
    this.showWordmark = true,
  });

  final double height;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    if (!showWordmark) {
      return BrandGemIcon(size: height, color: AppColors.primary);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandGemIcon(size: height * 0.92, color: AppColors.primary),
        SizedBox(width: height * 0.28),
        Text(
          'GemBook',
          style: TextStyle(
            fontSize: height * 0.72,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
            height: 1,
            color: AppColors.slate900,
          ),
        ),
      ],
    );
  }
}
