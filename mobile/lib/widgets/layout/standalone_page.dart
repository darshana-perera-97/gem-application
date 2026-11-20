import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';
import '../ui/server_down.dart';

/// Full-screen page outside the main tab shell (own app bar + back).
class StandalonePage extends StatelessWidget {
  const StandalonePage({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ServerDownWatcher(
      child: Scaffold(
        backgroundColor: SocialUi.feedCanvas,
        appBar: AppBar(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.slate900,
          elevation: 0,
          surfaceTintColor: Colors.white,
          scrolledUnderElevation: 0.5,
          leading: IconButton(
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SocialUi.hairline),
              ),
              child: const Icon(Icons.arrow_back_rounded, size: 20),
            ),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/');
              }
            },
          ),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
              color: AppColors.slate900,
            ),
          ),
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(1),
            child: Divider(height: 1, color: SocialUi.hairline),
          ),
        ),
        body: child,
      ),
    );
  }
}
