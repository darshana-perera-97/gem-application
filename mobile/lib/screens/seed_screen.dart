import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/catalog_events.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';

class SeedScreen extends StatefulWidget {
  const SeedScreen({super.key});

  @override
  State<SeedScreen> createState() => _SeedScreenState();
}

class _SeedScreenState extends State<SeedScreen> {
  String _status = '';
  bool _busy = false;

  Future<void> _seed() async {
    setState(() {
      _busy = true;
      _status = '';
    });
    try {
      final result = await apiPost<Map<String, dynamic>>('/api/seed');
      CatalogEvents.notifyCatalogChanged();
      setState(() => _status = '${result['message'] ?? result}');
    } catch (e) {
      setState(() => _status = '$e');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: SocialUi.pageInsets,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: PageCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Seed catalog', style: SocialUi.pageTitleStyle),
                const SizedBox(height: SocialUi.feedGap),
                const Text(
                  'Development helper to populate listings, vendors, and feed content when the database is empty.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.slate500),
                ),
                const SizedBox(height: SocialUi.sectionGap),
                ElevatedButton(
                  onPressed: _busy ? null : _seed,
                  child: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Run seed'),
                ),
                if (_status.isNotEmpty) ...[
                  const SizedBox(height: SocialUi.sectionGap),
                  Text(_status, textAlign: TextAlign.center),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
