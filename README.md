# Sunday Sevens Fantasy (Wazee v Vijana), Supabase version

Two separate sites that share one Supabase database:

- **player.html**: the player site (News, My team, Players, Sundays, Standings, Rules). Players sign in with Google or an email link.
- **admin.html**: the admin site (Sides, Players, Sundays and results, News). Only accounts listed in the `admins` table can change anything.

## Files

| File | What it is |
|---|---|
| `player.html`, `player.js` | Player site |
| `admin.html`, `admin.js` | Admin site |
| `core.js`, `styles.css` | Code and styles both sites share (scoring, data, sign-in) |
| `config.js` | Where your Supabase URL and key go |
| `supabase/schema.sql` | Creates the tables and the security rules |
| `supabase/seed.sql` | Loads your current league: 2 sides, 21 players, 5 Sundays, 1 news story |
| `backup/` | Copies of your data from the claude.ai site (JSON and CSV) |
| `claude-version/` | The original all-in-one claude.ai site, for reference |

## Setup (about 20 minutes)

### 1. Create the database
1. Make a free project at supabase.com.
2. Open **SQL Editor**, then **New query**. Paste all of `supabase/schema.sql` and click **Run**.
3. Do the same with `supabase/seed.sql`.

### 2. Connect the sites
1. In Supabase, open **Project Settings**, then **API**. Copy the **Project URL** and the **anon public** key.
2. Paste them into `config.js`.

### 3. Put the sites online
Any static host works. The simplest is Netlify Drop: go to app.netlify.com/drop and drag this whole folder in. You'll get an address like `https://wazee-vijana.netlify.app`. The player site is `/player.html` and the admin site is `/admin.html`.

Tip: if you want the player site at the plain address, rename `player.html` to `index.html` and change the "Open player site" link at the top of `admin.html`.

### 4. Switch on sign-in
1. In Supabase, open **Authentication**, then **URL Configuration**. Set **Site URL** to your site's address, and add both pages under **Redirect URLs**, for example `https://wazee-vijana.netlify.app/player.html` and `https://wazee-vijana.netlify.app/admin.html`.
2. Email links work straight away.
3. For **Sign in with Google**: in Google Cloud Console, create an OAuth client ID (type: Web application) and add `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback` as an authorised redirect URI. Then in Supabase open **Authentication**, then **Providers**, then **Google**, switch it on, and paste in the client ID and secret.

### 5. Make yourself an admin
1. Open `admin.html` and sign in.
2. The page shows a ready-made line of SQL with your user id. Copy it, run it in the Supabase SQL Editor, then reload the admin page.

Do the same for anyone else who should help run the league.

## How it works

- League data (sides, players, Sundays, results, news) can be read by anyone. Only admins can change it, and that's enforced by the database, not just the page.
- Each player's profile and fantasy picks belong to their own account. They can only change picks for a gameweek before its first game starts. The database checks the deadline using the `Africa/Nairobi` time zone; change it in `schema.sql` (function `gw_deadline`) if needed.
- New results and news appear on the player site without a reload, through Supabase Realtime.

## Moving off the claude.ai site

The claude.ai site keeps running until you switch. Players will need to sign in on the new site and set up their profile once. Fantasy teams saved on the claude.ai site don't carry over, which is fine because no gameweek has been played yet.
