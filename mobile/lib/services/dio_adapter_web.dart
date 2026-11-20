import 'package:dio/browser.dart';
import 'package:dio/dio.dart';

/// Web-only: enable credentialed CORS so the browser sends session cookies.
void applyWebCredentials(Dio dio) {
  dio.httpClientAdapter = BrowserHttpClientAdapter(withCredentials: true);
}
