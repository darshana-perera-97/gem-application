import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import '../theme/social_ui.dart';
import '../widgets/ui/loading_image.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _step = 'options';
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  bool _loading = false;
  String _error = '';
  String _googleError = '';

  @override
  void dispose() {
    _email.dispose();
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isSignedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/profile');
      });
    }

    IconData icon;
    String title;
    String subtitle;
    switch (_step) {
      case 'email':
        icon = Icons.mail_outline;
        title = 'Enter Email Address';
        subtitle = "We'll email you a one-time verification code";
        break;
      case 'phone':
        icon = Icons.phone_outlined;
        title = 'Enter Mobile Number';
        subtitle = "We'll send a one-time verification code";
        break;
      case 'otp':
      case 'emailOtp':
        icon = Icons.verified_user_outlined;
        title = 'Verify Code';
        subtitle = _step == 'otp'
            ? 'Sent to ${_phone.text}'
            : 'Sent to ${_email.text}';
        break;
      default:
        icon = Icons.public;
        title = 'Welcome to GemBook';
        subtitle = "The world's premier digital gemstone exchange";
    }

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          padding: SocialUi.pageInsets.copyWith(top: 28, bottom: 28),
          child: Container(
            decoration: SocialUi.elevatedCardDecoration.copyWith(
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  blurRadius: 28,
                  offset: const Offset(0, 12),
                ),
                ...SocialUi.softShadow,
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primary.withValues(alpha: 0.08),
                        AppColors.accent.withValues(alpha: 0.12),
                        AppColors.slate50,
                      ],
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius:
                              BorderRadius.circular(SocialUi.cardRadius),
                          boxShadow: SocialUi.softShadow,
                        ),
                        child: Icon(icon, size: 36, color: AppColors.primary),
                      ),
                      const SizedBox(height: SocialUi.sectionGap),
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: SocialUi.pageTitleStyle,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        style: SocialUi.pageSubtitleStyle,
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      if (_step == 'options') ..._options(auth),
                      if (_step == 'email') ..._emailStep(),
                      if (_step == 'emailOtp') ..._emailOtpStep(auth),
                      if (_step == 'phone') ..._phoneStep(auth),
                      if (_step == 'otp') ..._otpStep(auth),
                      const SizedBox(height: SocialUi.sectionGap * 2),
                      const Divider(color: SocialUi.hairline),
                      const SizedBox(height: SocialUi.sectionGap),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.verified_user_outlined,
                              size: 16, color: AppColors.primary.withValues(alpha: 0.7)),
                          const SizedBox(width: 8),
                          const Text(
                            'Secure sign-in',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: SocialUi.mute,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.slate400,
                            height: 1.5,
                          ),
                          children: [
                            const TextSpan(
                              text:
                                  "By continuing, you agree to GemBook's Terms of Service and ",
                            ),
                            WidgetSpan(
                              child: GestureDetector(
                                onTap: () => context.push('/privacy'),
                                child: const Text(
                                  'Privacy Policy',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                            const TextSpan(
                              text: '. All accounts undergo professional verification.',
                            ),
                          ],
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _options(AuthProvider auth) {
    return [
      _outlineButton(
        onPressed: () async {
          setState(() => _googleError = '');
          try {
            await auth.loginWithGoogle();
          } catch (e) {
            setState(() => _googleError = '$e');
          }
        },
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: LoadingImage(
                src:
                    'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                fit: BoxFit.contain,
              ),
            ),
            SizedBox(width: 12),
            Text('Sign in with Google'),
          ],
        ),
      ),
      if (_googleError.isNotEmpty || auth.authError.isNotEmpty) ...[
        const SizedBox(height: 12),
        _errorBox(_googleError.isNotEmpty ? _googleError : auth.authError),
      ],
      const SizedBox(height: 16),
      _outlineButton(
        onPressed: () => setState(() {
          _error = '';
          _step = 'email';
        }),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.mail_outline),
            SizedBox(width: 12),
            Text('Sign in with Email'),
          ],
        ),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(SocialUi.buttonRadius),
            ),
          ),
          onPressed: () => setState(() {
            _error = '';
            _step = 'phone';
          }),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.phone_outlined),
              SizedBox(width: 12),
              Text('Sign in with phone'),
            ],
          ),
        ),
      ),
    ];
  }

  List<Widget> _emailStep() {
    return [
      const Align(
        alignment: Alignment.centerLeft,
        child: Text(
          'Email address',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.slate600,
          ),
        ),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: _email,
        keyboardType: TextInputType.emailAddress,
        decoration: _fieldDecoration('you@email.com'),
      ),
      if (_error.isNotEmpty) ...[const SizedBox(height: 12), _errorBox(_error)],
      const SizedBox(height: 20),
      _darkButton(
        enabled: !_loading && _email.text.contains('@'),
        label: 'Email OTP Code',
        onPressed: () async {
          setState(() {
            _loading = true;
            _error = '';
          });
          try {
            await context.read<AuthProvider>().requestEmailOtp(_email.text);
            setState(() {
              _otp.clear();
              _step = 'emailOtp';
              _loading = false;
            });
          } catch (e) {
            setState(() {
              _error = '$e';
              _loading = false;
            });
          }
        },
      ),
      _backLink(() => setState(() {
            _error = '';
            _step = 'options';
          })),
    ];
  }

  List<Widget> _emailOtpStep(AuthProvider auth) {
    return [
      const Align(
        alignment: Alignment.centerLeft,
        child: Text(
          '6-digit verification code',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.slate600,
          ),
        ),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: _otp,
        keyboardType: TextInputType.number,
        maxLength: 6,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w900,
          letterSpacing: 12,
        ),
        decoration: _fieldDecoration('······').copyWith(counterText: ''),
      ),
      if (_error.isNotEmpty) ...[const SizedBox(height: 12), _errorBox(_error)],
      const SizedBox(height: 20),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _loading || _otp.text.length != 6
              ? null
              : () async {
                  setState(() {
                    _loading = true;
                    _error = '';
                  });
                  try {
                    await auth.verifyEmailOtp(_email.text, _otp.text);
                    if (mounted) context.go('/profile');
                  } catch (e) {
                    setState(() {
                      _error = '$e';
                      _loading = false;
                    });
                  }
                },
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _loading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Verify & Continue'),
        ),
      ),
      _backLink(() => setState(() {
            _error = '';
            _otp.clear();
            _step = 'email';
          }),
          label: 'Use a different email'),
    ];
  }

  List<Widget> _phoneStep(AuthProvider auth) {
    return [
      const Align(
        alignment: Alignment.centerLeft,
        child: Text(
          'Mobile number',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.slate600,
          ),
        ),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: _phone,
        keyboardType: TextInputType.phone,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: _fieldDecoration('77 123 4567').copyWith(
          prefixText: '+94  ',
          prefixStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            color: AppColors.slate400,
          ),
        ),
      ),
      if (_error.isNotEmpty) ...[const SizedBox(height: 12), _errorBox(_error)],
      const SizedBox(height: 20),
      _darkButton(
        enabled: !_loading && _phone.text.length >= 9,
        label: 'Get OTP Code',
        onPressed: () async {
          setState(() {
            _loading = true;
            _error = '';
          });
          try {
            await auth.loginWithPhone('+94${_phone.text}');
            setState(() {
              _step = 'otp';
              _loading = false;
            });
          } catch (e) {
            setState(() {
              _error = '$e';
              _loading = false;
            });
          }
        },
      ),
      _backLink(() => setState(() {
            _error = '';
            _step = 'options';
          })),
    ];
  }

  List<Widget> _otpStep(AuthProvider auth) {
    return [
      const Text(
        'Phone OTP requires Firebase Auth in the mobile build. Use email sign-in for now.',
        style: TextStyle(color: AppColors.slate500, fontSize: 13),
      ),
      _backLink(() => setState(() => _step = 'phone'),
          label: 'Use different number'),
    ];
  }

  InputDecoration _fieldDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.slate50,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.slate100, width: 2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.slate100, width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    );
  }

  Widget _outlineButton({required VoidCallback onPressed, required Widget child}) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          side: const BorderSide(color: AppColors.slate200),
          foregroundColor: AppColors.slate900,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
        child: child,
      ),
    );
  }

  Widget _darkButton({
    required bool enabled,
    required String label,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: enabled ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SocialUi.buttonRadius),
          ),
        ),
        child: _loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : Text(label),
      ),
    );
  }

  Widget _backLink(VoidCallback onTap, {String label = 'Back to Sign in'}) {
    return TextButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.arrow_back, size: 14),
      label: Text(label),
      style: TextButton.styleFrom(
        foregroundColor: AppColors.slate500,
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _errorBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(
        message,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Color(0xFFEF4444),
        ),
      ),
    );
  }
}
