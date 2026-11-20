import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../theme/app_colors.dart';
import '../../utils/images.dart';
import '../ui/loading_image.dart';

class VendorLeaderboardModal extends StatefulWidget {
  const VendorLeaderboardModal({super.key});

  @override
  State<VendorLeaderboardModal> createState() => _VendorLeaderboardModalState();
}

class _VendorLeaderboardModalState extends State<VendorLeaderboardModal> {
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    apiGet<List<dynamic>>('/api/vendors/leaderboard').then((data) {
      if (!mounted) return;
      setState(() {
        _rows = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .take(20)
            .toList();
        _loading = false;
      });
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  Color _rankColor(int index) {
    if (index == 0) return const Color(0xFFFBBF24);
    if (index == 1) return const Color(0xFF94A3B8);
    if (index == 2) return const Color(0xFFB45309);
    return AppColors.slate400;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 560),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Row(
                children: [
                  const Text(
                    'Dealer Leaderboard',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.separated(
                        itemCount: _rows.length,
                        separatorBuilder: (_, __) =>
                            const Divider(height: 1, color: AppColors.slate100),
                        itemBuilder: (_, i) {
                          final vendor = _rows[i];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: _rankColor(i).withValues(alpha: 0.15),
                              child: Text(
                                '${i + 1}',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: _rankColor(i),
                                ),
                              ),
                            ),
                            title: Text(
                              '${vendor['companyName'] ?? vendor['displayName'] ?? 'Dealer'}',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Text('Rating ${vendor['rating'] ?? '—'}'),
                            trailing: SizedBox(
                              width: 36,
                              height: 36,
                              child: ClipOval(
                                child: LoadingImage(
                                  src: resolveAvatar(
                                      vendor['logo'] ?? vendor['photoURL']),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
