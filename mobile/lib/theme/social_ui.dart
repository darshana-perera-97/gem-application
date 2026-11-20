import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Shared mobile UI tokens — spacing, surfaces, and type for every page.
/// Brand colors stay locked to AppColors (primary #CC10FE, accent #E281FF).
abstract final class SocialUi {
  /// Soft app canvas — matches web `background` (#F5F7FA).
  static const Color feedCanvas = AppColors.background;

  /// Card surface.
  static const Color card = Colors.white;

  /// Hairline separators between feed units.
  static const Color hairline = Color(0xFFE4E6EB);

  /// Inactive tab / meta text.
  static const Color mute = Color(0xFF65676B);

  /// Primary action text on cards.
  static const Color action = Color(0xFF050505);

  // —— Layout rhythm ——
  static const double pagePad = 16;
  static const double sectionGap = 14;
  static const double itemGap = 12;
  static const double feedGap = 10;
  static const double cardRadius = 16;
  static const double searchRadius = 14;
  static const double chipRadius = 999;
  static const double buttonRadius = 14;

  static const double navHeight = 64;
  static const double avatarSm = 36;
  static const double avatarMd = 42;

  /// Soft elevation used on interactive cards.
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.02),
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get primaryShadow => [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.28),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];

  /// Standard page ListView / scroll padding.
  static const EdgeInsets pageInsets =
      EdgeInsets.fromLTRB(pagePad, 8, pagePad, 24);

  /// Compact horizontal-only inset.
  static const EdgeInsets pageInsetsH =
      EdgeInsets.symmetric(horizontal: pagePad);

  static BoxDecoration get cardDecoration => BoxDecoration(
        color: card,
        border: const Border(
          top: BorderSide(color: hairline, width: 0.5),
          bottom: BorderSide(color: hairline, width: 0.5),
        ),
      );

  static BoxDecoration get roundedCardDecoration => BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(color: hairline.withValues(alpha: 0.8)),
        boxShadow: softShadow,
      );

  static BoxDecoration get elevatedCardDecoration => BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(cardRadius),
        boxShadow: softShadow,
      );

  static TextStyle get pageTitleStyle => const TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: AppColors.slate900,
        height: 1.2,
        letterSpacing: -0.4,
      );

  static TextStyle get pageSubtitleStyle => const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: mute,
        height: 1.35,
      );

  static TextStyle get nameStyle => const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppColors.slate900,
        height: 1.2,
      );

  static TextStyle get metaStyle => const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: mute,
        height: 1.2,
      );

  static TextStyle get bodyStyle => const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: AppColors.slate800,
        height: 1.45,
      );

  static TextStyle get actionLabelStyle => const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: mute,
      );

  static TextStyle get priceStyle => const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: AppColors.accent,
        height: 1.2,
      );

  static InputDecoration searchDecoration({
    String hint = 'Search',
    Widget? prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 14, color: mute),
      prefixIcon: prefixIcon ?? const Icon(Icons.search_rounded, size: 22, color: mute),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: card,
      contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: const BorderSide(color: hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }
}
