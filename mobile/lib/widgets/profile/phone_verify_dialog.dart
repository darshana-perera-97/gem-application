import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/api_client.dart';
import '../../theme/app_colors.dart';

class PhoneVerifyDialog extends StatefulWidget {
  const PhoneVerifyDialog({
    super.key,
    required this.userId,
    required this.onClose,
    required this.onVerified,
    this.initialPhone = '',
    this.title = 'Add phone number',
    this.description = 'Enter a valid mobile number.',
  });

  final String userId;
  final String initialPhone;
  final String title;
  final String description;
  final VoidCallback onClose;
  final Future<void> Function() onVerified;

  @override
  State<PhoneVerifyDialog> createState() => _PhoneVerifyDialogState();
}

class _PhoneVerifyDialogState extends State<PhoneVerifyDialog> {
  late final TextEditingController _phone;
  String _error = '';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    var digits = widget.initialPhone.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('94')) digits = digits.substring(2);
    _phone = TextEditingController(text: digits);
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _error = '';
      _submitting = true;
    });
    try {
      await apiPost('/api/users/phone', {'phone': '+94${_phone.text}'});
      await widget.onVerified();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '$e';
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.phone, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 20),
            Text(
              widget.title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: AppColors.slate900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.description,
              style: const TextStyle(fontSize: 14, color: AppColors.slate500),
            ),
            const SizedBox(height: 20),
            const Text(
              'MOBILE NUMBER',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: AppColors.slate400,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                prefixText: '+94  ',
                prefixStyle: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.slate400,
                ),
                hintText: '77 123 4567',
                filled: true,
                fillColor: AppColors.slate50,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(
                  _error,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFEF4444),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting || _phone.text.length < 9 ? null : _save,
                child: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Save number'),
              ),
            ),
            TextButton(
              onPressed: () {
                widget.onClose();
                Navigator.of(context).pop();
              },
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}
