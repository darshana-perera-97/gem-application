import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/activity_provider.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/layout/page_chrome.dart';
import '../widgets/ui/loading_image.dart';
import '../widgets/ui/screen_loader.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  Map<String, dynamic>? _article;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    apiGet<Map<String, dynamic>>('/api/feed').then((data) {
      if (!mounted) return;
      setState(() {
        _article = data['news'] is Map
            ? Map<String, dynamic>.from(data['news'] as Map)
            : null;
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
    final saved = activity.reads.contains('news');
    final body =
        '${_article?['body'] ?? _article?['summary'] ?? _article?['content'] ?? ''}';

    return ListView(
      padding: SocialUi.pageInsets,
      children: [
        const PageHeader(
          title: 'Industry News',
          subtitle: 'Updates from the gemstone trade',
        ),
        const SizedBox(height: SocialUi.sectionGap),
        if (_article == null)
          const PageEmpty(
            message: 'No industry news yet.',
            icon: Icons.newspaper_outlined,
          )
        else
          Container(
            decoration: SocialUi.elevatedCardDecoration,
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_article!['image'] != null)
                  SizedBox(
                    height: 220,
                    width: double.infinity,
                    child: LoadingImage(
                      src: '${_article!['image']}',
                      fit: BoxFit.cover,
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(SocialUi.pagePad),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_article!['badge'] != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius:
                                BorderRadius.circular(SocialUi.chipRadius),
                          ),
                          child: Text(
                            '${_article!['badge']}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      const SizedBox(height: SocialUi.itemGap),
                      Text(
                        '${_article!['title']}',
                        style: SocialUi.pageTitleStyle.copyWith(fontSize: 22),
                      ),
                      if (body.isNotEmpty) ...[
                        const SizedBox(height: SocialUi.sectionGap),
                        Text(
                          body,
                          style: SocialUi.bodyStyle.copyWith(
                            color: AppColors.slate600,
                            height: 1.6,
                          ),
                        ),
                      ],
                      const SizedBox(height: SocialUi.sectionGap),
                      ElevatedButton.icon(
                        onPressed: () => activity.toggleArticle('news'),
                        icon: Icon(
                          saved
                              ? Icons.bookmark_rounded
                              : Icons.bookmark_border_rounded,
                          size: 18,
                        ),
                        label: Text(
                            saved ? 'Saved to your account' : 'Save article'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
