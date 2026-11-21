import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/activity_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/screen_loader.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<Map<String, dynamic>> _events = [];
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    apiGet<Map<String, dynamic>>('/api/feed').then((data) {
      if (!mounted) return;
      setState(() {
        _events = (data['events'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _ready = true;
      });
    }).catchError((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const ScreenLoader();
    final activity = context.watch<ActivityProvider>();

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        const PageHeader(
          title: 'Global Events',
          subtitle: 'Shows, auctions, and trade fairs',
        ),
        const SizedBox(height: SocialUi.sectionGap),
        if (_events.isEmpty)
          const PageEmpty(
            message: 'No upcoming events right now',
            icon: Icons.event_outlined,
          )
        else
          ..._events.map((event) {
            final going = activity.rsvps.contains('${event['id']}');
            return PageCard(
              margin: const EdgeInsets.only(bottom: SocialUi.itemGap),
              child: Row(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_month_rounded,
                            size: 18, color: AppColors.primary),
                        const SizedBox(height: 2),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            '${event['date']}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.slate800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: SocialUi.sectionGap),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${event['title']}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${event['type']}',
                          style: SocialUi.metaStyle,
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => activity.toggleRsvp('${event['id']}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          going ? AppColors.primary : Colors.white,
                      foregroundColor:
                          going ? Colors.white : AppColors.primary,
                      elevation: 0,
                      side: BorderSide(
                        color: going
                            ? AppColors.primary
                            : AppColors.primary.withValues(alpha: 0.35),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(SocialUi.buttonRadius),
                      ),
                    ),
                      child: Text(
                      going ? 'Going' : 'RSVP',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}
