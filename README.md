# Expense Tracker

A fully automated daily expense tracker — just log an expense and everything
else (today/week/month totals, budget dial, category breakdown, ledger list)
updates automatically.

## Files
- `index.html` — page structure
- `style.css` — cinematic dark/light theme, layout, animations
- `script.js` — app logic (categories, totals, budget dial, local storage)


## Data storage
Expenses and your monthly budget are saved to the browser's `localStorage`,
so they persist across refreshes and restarts on the same browser/device.
Clearing that browser's site data will erase them. There is no cloud sync.