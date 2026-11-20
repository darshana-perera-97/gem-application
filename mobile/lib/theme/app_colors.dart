import 'package:flutter/material.dart';

/// Mirrors frontend/tailwind.config.js brand tokens.
abstract final class AppColors {
  static const Color primary = Color(0xFFCC10FE);
  static const Color accent = Color(0xFFE281FF);
  static const Color secondary = Color(0xFF0F172A);
  static const Color success = Color(0xFF34A853);
  static const Color warning = Color(0xFFFBBC05);
  static const Color background = Color(0xFFF5F7FA);

  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);

  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray900 = Color(0xFF111827);

  static Color primarySoft = primary.withValues(alpha: 0.05);
  static Color primaryGlow = primary.withValues(alpha: 0.18);
  static Color primaryBorder = primary.withValues(alpha: 0.10);
}
