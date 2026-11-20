import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../config/api_config.dart';
import 'dio_adapter_stub.dart'
    if (dart.library.html) 'dio_adapter_web.dart';


typedef ServerStatusListener = void Function(bool down);

class ApiException implements Exception {
  ApiException(this.message, {this.status, this.code});

  final String message;
  final int? status;
  final String? code;

  @override
  String toString() => message;
}

/// Cookie-session API client mirroring frontend/src/lib/api.js
class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  Dio? _dio;
  bool _serverDown = false;
  final Set<ServerStatusListener> _listeners = {};

  bool get isServerDown => _serverDown;

  VoidCallback subscribeServerStatus(ServerStatusListener listener) {
    _listeners.add(listener);
    listener(_serverDown);
    return () => _listeners.remove(listener);
  }

  void _setServerDown(bool next) {
    if (_serverDown == next) return;
    _serverDown = next;
    for (final listener in List.of(_listeners)) {
      listener(_serverDown);
    }
  }

  Future<void> init() async {
    if (_dio != null) return;

    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 20),
        // Feed payload can be large in local/dev.
        receiveTimeout: const Duration(seconds: 60),
        headers: {
          'Accept': 'application/json',
        },
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    if (kIsWeb) {
      // CookieManager asserts on web. Browser owns cookies instead.
      applyWebCredentials(_dio!);
      return;
    }

    try {
      final dir = await getApplicationSupportDirectory();
      final cookiePath = '${dir.path}/.cookies/';
      final jar = PersistCookieJar(storage: FileStorage(cookiePath));
      _dio!.interceptors.add(CookieManager(jar));
    } catch (error) {
      debugPrint('Cookie persistence unavailable, using memory jar: $error');
      _dio!.interceptors.add(CookieManager(CookieJar()));
    }
  }

  Dio get dio {
    final client = _dio;
    if (client == null) {
      throw StateError('ApiClient.init() must be called before use');
    }
    return client;
  }

  Future<Response<dynamic>> raw(
    String path, {
    String method = 'GET',
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: (options ?? Options()).copyWith(
          method: method,
          contentType: data == null ? null : Headers.jsonContentType,
          extra: {
            ...?options?.extra,
            if (kIsWeb) 'withCredentials': true,
          },
        ),
      );
      _setServerDown(false);
      return response;
    } on DioException catch (error) {
      debugPrint(
        'API $method $path failed: type=${error.type} '
        'status=${error.response?.statusCode} message=${error.message}',
      );
      if (_isNetworkFailure(error)) {
        _setServerDown(true);
        throw ApiException(ApiConfig.serverDownMessage, code: 'SERVER_DOWN');
      }
      rethrow;
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    final response = await raw(path, queryParameters: queryParameters);
    return _decode(response);
  }

  Future<dynamic> post(String path, [Object? body]) async {
    final response = await raw(
      path,
      method: 'POST',
      data: body == null ? null : body,
    );
    return _decode(response);
  }

  Future<dynamic> delete(String path) async {
    final response = await raw(path, method: 'DELETE');
    return _decode(response);
  }

  dynamic _decode(Response<dynamic> response) {
    final data = response.data;
    final map = data is Map
        ? Map<String, dynamic>.from(data)
        : (data is String && data.isNotEmpty
            ? (jsonDecode(data) as Object?)
            : data);

    if (response.statusCode != null && response.statusCode! >= 400) {
      final errorMap = map is Map ? map : <String, dynamic>{};
      throw ApiException(
        (errorMap['error'] as String?) ??
            'Request failed (${response.statusCode})',
        status: response.statusCode,
      );
    }
    return map ?? data;
  }

  bool _isNetworkFailure(DioException error) {
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.unknown ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout;
  }
}

Future<T> apiGet<T>(String path, {Map<String, dynamic>? query}) async {
  final data = await ApiClient.instance.get(path, queryParameters: query);
  return data as T;
}

Future<T> apiPost<T>(String path, [Object? body]) async {
  final data = await ApiClient.instance.post(path, body);
  return data as T;
}

Future<T> apiDelete<T>(String path) async {
  final data = await ApiClient.instance.delete(path);
  return data as T;
}
