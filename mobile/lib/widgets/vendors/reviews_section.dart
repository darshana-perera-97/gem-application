import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../theme/app_colors.dart';

class ReviewsSection extends StatefulWidget {
  const ReviewsSection({
    super.key,
    required this.vendorId,
    this.canReview = true,
  });

  final String vendorId;
  final bool canReview;

  @override
  State<ReviewsSection> createState() => _ReviewsSectionState();
}

class _ReviewsSectionState extends State<ReviewsSection> {
  List<Map<String, dynamic>> _reviews = [];
  int _stars = 5;
  final _text = TextEditingController();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await apiGet<List<dynamic>>(
        '/api/reviews',
        query: {'vendorId': widget.vendorId},
      );
      if (!mounted) return;
      setState(() {
        _reviews = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) return;
    try {
      await apiPost('/api/reviews', {
        'vendorId': widget.vendorId,
        'userId': auth.uid,
        'rating': _stars,
        'comment': _text.text.trim(),
        'authorName': auth.userProfile?['displayName'],
      });
      _text.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.canReview) ...[
          const Text('Leave a review',
              style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Row(
            children: List.generate(5, (i) {
              final active = i < _stars;
              return IconButton(
                onPressed: () => setState(() => _stars = i + 1),
                icon: Icon(
                  Icons.star,
                  color: active
                      ? const Color(0xFFFBBF24)
                      : AppColors.slate200,
                ),
              );
            }),
          ),
          TextField(
            controller: _text,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Share your experience…'),
          ),
          const SizedBox(height: 8),
          ElevatedButton(onPressed: _submit, child: const Text('Submit review')),
          const SizedBox(height: 24),
        ],
        ..._reviews.map((review) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.slate100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        '${review['authorName'] ?? 'Member'}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      Row(
                        children: List.generate(
                          5,
                          (i) => Icon(
                            Icons.star,
                            size: 14,
                            color: i < (num.tryParse('${review['rating']}') ?? 0)
                                ? const Color(0xFFFBBF24)
                                : AppColors.slate200,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('${review['comment'] ?? ''}'),
                ],
              ),
            )),
      ],
    );
  }
}
