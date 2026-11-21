import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import 'brand_gem.dart';

/// Professional branded splash — atmosphere, mark, wordmark, and progress.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _intro;
  late final AnimationController _pulse;
  late final AnimationController _progress;

  late final Animation<double> _logoFade;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoLift;
  late final Animation<double> _titleFade;
  late final Animation<double> _titleSlide;
  late final Animation<double> _tagFade;
  late final Animation<double> _footerFade;
  late final Animation<double> _glow;

  @override
  void initState() {
    super.initState();

    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);
    _progress = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..forward();

    _logoFade = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.0, 0.45, curve: Curves.easeOut),
    );
    _logoScale = Tween<double>(begin: 0.84, end: 1).animate(
      CurvedAnimation(
        parent: _intro,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic),
      ),
    );
    _logoLift = Tween<double>(begin: 18, end: 0).animate(
      CurvedAnimation(
        parent: _intro,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic),
      ),
    );
    _titleFade = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.28, 0.7, curve: Curves.easeOut),
    );
    _titleSlide = Tween<double>(begin: 14, end: 0).animate(
      CurvedAnimation(
        parent: _intro,
        curve: const Interval(0.28, 0.7, curve: Curves.easeOutCubic),
      ),
    );
    _tagFade = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.42, 0.85, curve: Curves.easeOut),
    );
    _footerFade = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.55, 1.0, curve: Curves.easeOut),
    );
    _glow = CurvedAnimation(
      parent: _pulse,
      curve: Curves.easeInOut,
    );

    _intro.forward();
  }

  @override
  void dispose() {
    _intro.dispose();
    _pulse.dispose();
    _progress.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return AnimatedBuilder(
      animation: Listenable.merge([_intro, _pulse, _progress]),
      builder: (context, _) {
        final glowT = 0.55 + (_glow.value * 0.45);
        return Scaffold(
          backgroundColor: AppColors.background,
          body: Stack(
            fit: StackFit.expand,
            children: [
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white,
                      AppColors.background,
                      AppColors.slate50,
                    ],
                  ),
                ),
              ),
              Positioned(
                top: -120,
                right: -80,
                child: _GlowOrb(
                  size: 280,
                  color: AppColors.primary.withValues(alpha: 0.10 * glowT),
                ),
              ),
              Positioned(
                bottom: 80,
                left: -100,
                child: _GlowOrb(
                  size: 260,
                  color: AppColors.accent.withValues(alpha: 0.08 * glowT),
                ),
              ),
              Positioned(
                top: MediaQuery.sizeOf(context).height * 0.28,
                left: 0,
                right: 0,
                child: Center(
                  child: _GlowOrb(
                    size: 220,
                    color: AppColors.primary.withValues(alpha: 0.06 * glowT),
                  ),
                ),
              ),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Transform.translate(
                        offset: Offset(0, _logoLift.value),
                        child: FadeTransition(
                          opacity: _logoFade,
                          child: ScaleTransition(
                            scale: _logoScale,
                            child: _LogoMark(glow: glowT),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      Transform.translate(
                        offset: Offset(0, _titleSlide.value),
                        child: FadeTransition(
                          opacity: _titleFade,
                          child: const Text(
                            'GemBook',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -1.0,
                              height: 1.05,
                              color: AppColors.slate900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      FadeTransition(
                        opacity: _tagFade,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AppColors.slate200),
                          ),
                          child: const Text(
                            'PREMIER GEMSTONE EXCHANGE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.6,
                              color: AppColors.slate500,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      FadeTransition(
                        opacity: _tagFade,
                        child: const Text(
                          'Verified dealers · Certified stones · Global trade',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            height: 1.45,
                            letterSpacing: -0.1,
                            color: AppColors.slate500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: 40,
                right: 40,
                bottom: 28 + bottomInset,
                child: FadeTransition(
                  opacity: _footerFade,
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: SizedBox(
                          height: 3,
                          child: LinearProgressIndicator(
                            value: Curves.easeInOut.transform(_progress.value),
                            backgroundColor: AppColors.slate200,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.verified_outlined,
                            size: 14,
                            color: AppColors.slate400,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Securing your session',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              letterSpacing: -0.1,
                              color: AppColors.slate400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LogoMark extends StatelessWidget {
  const _LogoMark({required this.glow});

  final double glow;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 112,
      height: 112,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            AppColors.slate50,
          ],
        ),
        border: Border.all(color: Colors.white, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.16 * glow),
            blurRadius: 36,
            spreadRadius: 2,
            offset: const Offset(0, 14),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.primary.withValues(alpha: 0.10),
                  AppColors.primary.withValues(alpha: 0.0),
                ],
              ),
            ),
          ),
          // Same gem icon as the loading animation.
          BrandGemIcon(
            size: 48,
            color: AppColors.primary.withValues(alpha: 0.92 + 0.08 * glow),
          ),
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              color,
              color.withValues(alpha: 0),
            ],
          ),
        ),
      ),
    );
  }
}
