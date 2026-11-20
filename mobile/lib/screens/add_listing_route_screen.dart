import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/add_listing_provider.dart';

/// Route shim matching React AddListingPage — opens modal then goes to marketplace.
class AddListingRouteScreen extends StatefulWidget {
  const AddListingRouteScreen({super.key, this.listingId});

  final String? listingId;

  @override
  State<AddListingRouteScreen> createState() => _AddListingRouteScreenState();
}

class _AddListingRouteScreenState extends State<AddListingRouteScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AddListingProvider>().openAddListing(widget.listingId);
      context.go('/marketplace');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
