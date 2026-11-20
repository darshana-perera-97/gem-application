import 'package:intl/intl.dart';

/// Mirrors frontend/src/lib/utils.js formatCurrency (LKR default).
String formatCurrency(dynamic amount, {String currency = 'LKR'}) {
  final number = amount is num ? amount.toDouble() : double.tryParse('$amount') ?? 0;
  if (number >= 1000000) {
    final millions = number / 1000000;
    final symbol = currency == 'LKR' ? 'Rs.' : currency;
    final formatted =
        millions % 1 == 0 ? millions.toStringAsFixed(0) : millions.toStringAsFixed(1);
    return '$symbol ${formatted}M';
  }

  if (currency == 'LKR') {
    return NumberFormat.currency(locale: 'en_LK', symbol: 'Rs.', decimalDigits: 0)
        .format(number);
  }
  return NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(number);
}

String formatCount(dynamic value) {
  if (value == null) return '—';
  final number = value is num ? value : num.tryParse('$value');
  if (number == null) return '—';
  return NumberFormat.decimalPattern('en_US').format(number);
}

String formatWeekChange(dynamic pct) {
  if (pct == null) return '—';
  final value = pct is num ? pct.toDouble() : double.tryParse('$pct');
  if (value == null || value.isNaN) return '—';
  final sign = value > 0 ? '+' : '';
  return '$sign$value%';
}

String formatClock() {
  return DateFormat('HH:mm').format(DateTime.now());
}
