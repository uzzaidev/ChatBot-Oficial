# iOS/Android Asset Sources

Place source assets here before running icon/splash generation tools.

Required files:

- `icon.png` -> `1024x1024`, no transparency, solid background
- `splash.png` -> `2732x2732`

Suggested flow:

1. Generate base icon in design tool.
2. Export to `resources/icon.png`.
3. Create splash using same visual identity.
4. Export to `resources/splash.png`.
5. On Mac, run `npx capacitor-assets generate --ios`.

