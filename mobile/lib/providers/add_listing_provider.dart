import 'package:flutter/foundation.dart';

import '../utils/phone.dart';
import 'auth_provider.dart';

class AddListingProvider extends ChangeNotifier {
  AddListingProvider(this._auth);

  final AuthProvider _auth;

  bool isOpen = false;
  String? listingId;
  bool phoneOpen = false;
  String? pendingListingId;

  VoidCallback? onNeedLogin;

  bool openAddListing([String? id]) {
    if (!_auth.isSignedIn) {
      onNeedLogin?.call();
      return false;
    }
    if (!hasVerifiedPhone(_auth.userProfile)) {
      pendingListingId = id;
      phoneOpen = true;
      notifyListeners();
      return false;
    }
    return openListingForm(id);
  }

  bool openListingForm([String? id]) {
    listingId = id;
    isOpen = true;
    notifyListeners();
    return true;
  }

  void closeAddListing() {
    isOpen = false;
    listingId = null;
    notifyListeners();
  }

  void closePhone() {
    phoneOpen = false;
    pendingListingId = null;
    notifyListeners();
  }

  Future<void> onPhoneVerified() async {
    await _auth.refreshSession();
    phoneOpen = false;
    final nextId = pendingListingId;
    pendingListingId = null;
    notifyListeners();
    openListingForm(nextId);
  }
}
