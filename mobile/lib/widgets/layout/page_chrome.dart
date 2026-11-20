import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';

/// Consistent page title + optional subtitle / trailing action.
class PageHeader extends StatelessWidget {
  const PageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: SocialUi.pageTitleStyle),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(subtitle!, style: SocialUi.pageSubtitleStyle),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: SocialUi.itemGap),
          trailing!,
        ],
      ],
    );
  }
}

/// White rounded surface used for content blocks on the gray canvas.
class PageCard extends StatelessWidget {
  const PageCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(SocialUi.pagePad),
    this.margin,
    this.onTap,
    this.elevated = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      margin: margin,
      padding: padding,
      decoration: elevated
          ? SocialUi.elevatedCardDecoration
          : SocialUi.roundedCardDecoration,
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(SocialUi.cardRadius),
        child: body,
      ),
    );
  }
}

/// Empty / soft-auth placeholder with icon + clearer hierarchy.
class PageEmpty extends StatelessWidget {
  const PageEmpty({
    super.key,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: SocialUi.pageSubtitleStyle.copyWith(
                fontSize: 15,
                color: AppColors.slate600,
              ),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: SocialUi.sectionGap),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(160, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(SocialUi.buttonRadius),
                  ),
                ),
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Soft pill filter chip — primary when selected.
class GemFilterChip extends StatelessWidget {
  const GemFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
      selectedColor: AppColors.primary,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: selected ? Colors.white : AppColors.slate700,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SocialUi.chipRadius),
        side: BorderSide(
          color: selected ? AppColors.primary : SocialUi.hairline,
        ),
      ),
    );
  }
}

/// Choice chip styling matched across filters (primary selected).
ChipThemeData pageChipTheme(BuildContext context) {
  return ChipTheme.of(context).copyWith(
    backgroundColor: Colors.white,
    selectedColor: AppColors.primary,
    secondarySelectedColor: AppColors.primary,
    labelStyle: const TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: AppColors.slate700,
    ),
    secondaryLabelStyle: const TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: Colors.white,
    ),
    padding: const EdgeInsets.symmetric(horizontal: 4),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(SocialUi.chipRadius),
      side: const BorderSide(color: SocialUi.hairline),
    ),
  );
}
