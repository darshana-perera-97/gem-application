import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/add_listing_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../utils/format.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/screen_loader.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  Map<String, dynamic>? _data;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isSignedIn) {
      setState(() => _ready = true);
      return;
    }
    try {
      final data = await apiGet<Map<String, dynamic>>(
        '/api/dashboard/vendor',
        query: {'userId': auth.uid},
      );
      if (!mounted) return;
      setState(() {
        _data = data;
        _ready = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ready = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!_ready) return const ScreenLoader();

    if (!auth.isSignedIn) {
      return PageEmpty(
        message: 'Sign in to open Business Command',
        actionLabel: 'Sign in',
        onAction: () => context.push('/login'),
        icon: Icons.insights_outlined,
      );
    }

    final stats = _data?['stats'] is Map
        ? Map<String, dynamic>.from(_data!['stats'] as Map)
        : <String, dynamic>{};
    final sales = (_data?['sales'] as List? ?? [])
        .map((e) => num.tryParse('$e')?.toDouble() ?? 0.0)
        .toList();
    final inventory = (_data?['inventory'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        PageHeader(
          title: 'Business Command',
          subtitle: 'Listings, sales, and inquiries',
          trailing: ElevatedButton.icon(
            onPressed: () =>
                context.read<AddListingProvider>().openAddListing(),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('New'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        LayoutBuilder(builder: (context, constraints) {
          final cols = constraints.maxWidth >= 900
              ? 4
              : constraints.maxWidth >= 600
                  ? 2
                  : 1;
          final cards = [
            _stat('Active listings', '${stats['activeListings'] ?? 0}'),
            _stat('Sold this month', '${stats['soldThisMonth'] ?? 0}'),
            _stat('Inquiries', '${stats['inquiries'] ?? 0}'),
            _stat(
              'Revenue',
              formatCurrency(stats['revenue'] ?? 0,
                  currency: '${stats['currency'] ?? 'LKR'}'),
            ),
          ];
          return GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: cols,
            mainAxisSpacing: SocialUi.sectionGap,
            crossAxisSpacing: SocialUi.sectionGap,
            childAspectRatio: 1.6,
            children: cards,
          );
        }),
        const SizedBox(height: SocialUi.sectionGap),
        PageCard(
          child: SizedBox(
            height: 220,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sales',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: SocialUi.sectionGap),
                Expanded(
                  child: sales.isEmpty
                      ? const Center(child: Text('No sales data yet'))
                      : LineChart(
                          LineChartData(
                            gridData: const FlGridData(show: false),
                            titlesData: const FlTitlesData(show: false),
                            borderData: FlBorderData(show: false),
                            lineBarsData: [
                              LineChartBarData(
                                spots: [
                                  for (var i = 0; i < sales.length; i++)
                                    FlSpot(i.toDouble(), sales[i]),
                                ],
                                isCurved: true,
                                color: AppColors.primary,
                                barWidth: 3,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(
                                  show: true,
                                  color: AppColors.primary
                                      .withValues(alpha: 0.12),
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        const Text(
          'Inventory',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: SocialUi.sectionGap),
        ...inventory.map(
          (item) => PageCard(
            margin: const EdgeInsets.only(bottom: SocialUi.itemGap),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${item['title'] ?? item['variety'] ?? 'Gem'}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  '${item['status'] ?? 'ACTIVE'}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _stat(String label, String value) {
    return PageCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: SocialUi.feedGap),
          Text(value, style: SocialUi.pageTitleStyle),
        ],
      ),
    );
  }
}
