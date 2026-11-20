import 'package:flutter/material.dart';

import '../widgets/profile/seller_profile_view.dart';

class VendorProfileScreen extends StatelessWidget {
  const VendorProfileScreen({super.key, required this.vendorId});

  final String vendorId;

  @override
  Widget build(BuildContext context) {
    return SellerProfileView(vendorId: vendorId);
  }
}
