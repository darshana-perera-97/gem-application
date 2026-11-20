final RegExp _phonePattern = RegExp(r'^\+\d{8,15}$');

bool isValidPhoneNumber(dynamic value) {
  return _phonePattern.hasMatch('${value ?? ''}'.trim());
}

bool hasVerifiedPhone(Map<String, dynamic>? profile) {
  return profile != null &&
      profile['phoneVerified'] == true &&
      isValidPhoneNumber(profile['phone']);
}
