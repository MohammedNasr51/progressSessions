# BrightPath Session Progress

A standalone, responsive session progress tracker designed for GitHub Pages.

## Features

- Eight sessions are created automatically for each month
- Previous/next month navigation
- Session title, date, status, and detailed notes
- Completed and “great session” summaries
- Browser `localStorage` persistence
- JSON backup export/import
- Printable monthly report
- Responsive mobile and desktop layout
- Separate editor and read-only viewer modes

## Public and admin views

The normal GitHub Pages URL is the live, read-only viewer. Add `?admin` to that URL to open the admin dashboard:

```text
https://mohammednasr51.github.io/progressSessions/admin.html
```

The admin dashboard asks for the backend `ADMIN_KEY` and stores it only in that browser. Session data is shared through the deployed MongoDB API rather than localStorage.

## Publish with GitHub Pages

Upload these files to a GitHub repository, then open **Settings → Pages**, select **Deploy from a branch**, choose the `main` branch and `/ (root)`, and save.

> Data is stored in the current browser only. A static GitHub Pages site does not sync localStorage between the tutor, parents, and manager. Use Export/Import to move a backup, or connect a hosted database such as Firebase/Supabase in a future version for live shared data.
