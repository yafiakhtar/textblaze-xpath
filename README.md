# XPath Selector Builder

Builds a short, human-readable XPath selector for any element on a page in human readable form (in most cases).

---

## How to Test

You need two files: `xPath.js` (the generator) and `clickListen.js` (a small click listener for testing).

1. Open any webpage in Chrome
2. Open DevTools (`Cmd+Option+I` / `F12`) and go to the **Console** tab
3. Paste the full contents of `xPath.js` and hit Enter
4. Paste the contents of `clickListen.js` and hit Enter
5. Click any element on the page — its XPath will print to the console

---

## Limitations

- **Dynamic content** — pages that re-render heavily (React, Vue SPAs) may shift the DOM after a selector is generated, breaking structural fallbacks in particular
- **Auto-generated attributes** — IDs and classes that look stable (e.g. `btn-1`) but are actually dynamic will produce selectors that break on reload. The generator filters obvious patterns (`css-abc123`, `jsx-456`, long numeric IDs) but can't catch everything
- **Selector length** — the structural fallback always produces a correct selector, but it may be long and fragile. It's a last resort, not a recommendation (capped at 100)

