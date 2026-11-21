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
  static const Color hairline = Color(0xFFE8ECF1);

  /// Inactive tab / meta text.
  static const Color mute = Color(0xFF6B7280);

  /// Primary action text on cards.
  static const Color action = Color(0xFF0F172A);

  // —— Layout rhythm ——
  static const double pagePad = 20;
  static const double sectionGap = 16;
  static const double itemGap = 12;
  static const double feedGap = 12;
  static const double cardRadius = 20;
  static const double searchRadius = 16;
  static const double chipRadius = 12;
  static const double buttonRadius = 14;
  static const double sheetRadius = 24;

  static const double navHeight = 62;
  static const double avatarSm = 34;
  static const double avatarMd = 40;

  /// Whisper elevation — modern apps favor border over shadow.
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get primaryShadow => [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.22),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  /// Standard page ListView / scroll padding.
  static const EdgeInsets pageInsets =
      EdgeInsets.fromLTRB(pagePad, 12, pagePad, 28);

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
        border: Border.all(color: hairline),
      );

  static BoxDecoration get elevatedCardDecoration => BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(color: hairline),
        boxShadow: softShadow,
      );

  static TextStyle get pageTitleStyle => const TextStyle(
        fontSize: 26,
        fontWeight: FontWeight.w700,
        color: AppColors.slate900,
        height: 1.15,
        letterSpacing: -0.6,
      );

  static TextStyle get pageSubtitleStyle => const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: mute,
        height: 1.4,
        letterSpacing: -0.1,
      );

  static TextStyle get nameStyle => const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: AppColors.slate900,
        height: 1.25,
        letterSpacing: -0.2,
      );

  static TextStyle get metaStyle => const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: mute,
        height: 1.3,
      );

  static TextStyle get bodyStyle => const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: AppColors.slate800,
        height: 1.5,
        letterSpacing: -0.1,
      );

  static TextStyle get actionLabelStyle => const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: mute,
      );

  static TextStyle get priceStyle => const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: AppColors.primary,
        height: 1.2,
        letterSpacing: -0.3,
      );

  static TextStyle get sectionLabelStyle => const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.slate600,
        letterSpacing: 0.2,
      );

  static InputDecoration searchDecoration({
    String hint = 'Search',
    Widget? prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 15, color: mute, fontWeight: FontWeight.w400),
      prefixIcon: prefixIcon ??
          const Icon(Icons.search_rounded, size: 20, color: mute),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppColors.slate50,
      contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(searchRadius),
        borderSide: BorderSide(
          color: AppColors.primary.withValues(alpha: 0.45),
          width: 1.5,
        ),
      ),
    );
  }
}
