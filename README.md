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
- Viewer comments and admin comment moderation
- Homework instructions, PDF/TXT attachments, and a flexible number of recording links per session

## Public and admin views

The normal GitHub Pages URL is the live, read-only viewer. Add `?admin` to that URL to open the admin dashboard:

```text
https://mohammednasr51.github.io/progressSessions/admin.html
```

The admin dashboard asks for the backend `ADMIN_KEY` and stores it only in that browser. Session data is shared through the deployed MongoDB API rather than localStorage.

## Publish with GitHub Pages

Upload these files to a GitHub repository, then open **Settings → Pages**, select **Deploy from a branch**, choose the `main` branch and `/ (root)`, and save.

> Session data, comments, homework, and recording links are shared through the deployed MongoDB backend. Only the theme preference and the admin key are stored locally in the current browser.

## Publish with Vercel

1. Import the `MohammedNasr51/progressSessions` repository at `https://vercel.com/new`.
2. Select **Other** as the framework preset.
3. Leave the root directory as `./`.
4. Leave Build Command and Output Directory empty.
5. Deploy. The committed `vercel.json` configures the static site automatically.
6. After deployment, add the exact Vercel origin (for example `https://progress-sessions.vercel.app`) to the backend's `ALLOWED_ORIGINS` environment variable and redeploy the backend.

- Viewer: `/`
- Admin: `/admin`
