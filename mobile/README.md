# GemBook Mobile (Flutter)

Flutter port of the React frontend in `../frontend`. UI tokens, routes, and API flows match the web app.

## Run

1. Start MongoDB and the API (`../setup.md`) on port `1324`.
2. From this folder:

```bash
flutter pub get
flutter run
```

Set the backend URL in one place: `lib/config/api_config.dart` → `ApiConfig.backendUrl`.

```dart
static const String backendUrl = 'http://localhost:1324';
```

Android emulator auto-rewrites `localhost` to `10.0.2.2`. Optional CLI override:

```bash
flutter run --dart-define=API_BASE=http://192.168.1.10:1324
```

## Auth

- **Email OTP** — fully supported via cookie session (`gem_session`) through Dio.
- **Google** — opens the backend OAuth URL in the browser.
- **Phone login** — requires Firebase Auth configuration on the mobile project (same as web). Listing phone verify uses `POST /api/users/phone` after sign-in.

## Structure

```
lib/
  theme/          # Colors & theme (primary #CC10FE, Inter, #F5F7FA)
  providers/      # Auth, activity, add-listing
  services/       # API client + catalog events
  screens/        # All routes mirrored from React App.jsx
  widgets/        # Layout, marketplace, social, profile, vendors, ui
  router/         # go_router shell + routes
```
