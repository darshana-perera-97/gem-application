import 'package:flutter/material.dart';

import '../../config/api_config.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';

class ServerDownWatcher extends StatefulWidget {
  const ServerDownWatcher({super.key, required this.child});

  final Widget child;

  @override
  State<ServerDownWatcher> createState() => _ServerDownWatcherState();
}

class _ServerDownWatcherState extends State<ServerDownWatcher> {
  bool _down = false;
  VoidCallback? _unsubscribe;

  @override
  void initState() {
    super.initState();
    _unsubscribe = ApiClient.instance.subscribeServerStatus((down) {
      if (mounted) setState(() => _down = down);
    });
  }

  @override
  void dispose() {
    _unsubscribe?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_down) const ServerDownOverlay(),
      ],
    );
  }
}

class ServerDownOverlay extends StatelessWidget {
  const ServerDownOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Material(
        color: AppColors.background,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: AppColors.slate200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 24,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFEF2F2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.cloud_off_outlined,
                        color: Color(0xFFEF4444), size: 30),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'GEMBOOK',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 4,
                      color: AppColors.slate400,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Server is down',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppColors.slate900,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    ApiConfig.serverDownMessage,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ApiClient.instance.raw('/api/health').ignore();
                      },
                      child: const Text('Try again'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
