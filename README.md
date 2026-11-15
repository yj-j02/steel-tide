# Steel Tide

Browser 3D naval battle game (WWII and modern), three.js r170, plain ES modules with no build step.
Live site: https://steel-tide-naval.higgsfield.app

## Run locally

```
python tools/serve.py 8820
```

Then open http://localhost:8820. The dev server turns caching off and mutes the game; add `?sound` to the URL to hear it.

## Layout (`app/public`)

| File | What it holds |
|---|---|
| `index.html` | All CSS and the DOM panels |
| `client.js` | Menus, battle setup, input, cameras, HUD, modern-mode UI |
| `js/core.js` | Renderer, sky and sea shaders, maps and islands, particles |
| `js/ships.js` | Guns and ballistics, ship catalogue, procedural ship models, AI |
| `js/modern.js` | Missiles, air defence, helicopters, jets |
| `js/air.js` | WWII aircraft |
| `js/infantry.js` | Boarding-party soldiers and first-person weapons |
| `js/interior.js` | Cockpit and gun viewmodels |
| `js/post.js` | Post-processing (bloom, tone mapping) |
| `js/audio.js` | Sound |

Test hooks live on `window.__st` (for example `start`, `frameOnce`, `setMission`, `setNat`).

## Working together (Gemini + Claude)

- Run `git pull` before you start, then commit small and push often.
- Don't make big edits to the same file at the same time; split the work by file.
- Code comments are in English and game text is in Korean.
