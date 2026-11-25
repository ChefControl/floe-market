# Uploading the desktop app to Steam

Every merge to `main` builds the Windows and Linux apps (`.github/workflows/deploy.yml`, the `desktop` job). Each
pull request does too, as artifacts to download and try. Once the steps below are done, each merge also uploads both
apps to the game's **beta** branch on Steam (the `steam` job). Builds only reach players when you set them live in
Steamworks.

The app's ids live in GitHub secrets, never in the repo. The upload stops if an id is missing, isn't a number, or is
still Valve's test app (480).

## 1. The build-upload account (#143)

The upload uses a Steam account of its own with as few rights as it needs, so CI never holds your own login.

1. Make a new Steam account at store.steampowered.com/join, with an email address you read. Leave Steam Guard on
   **email**: there's nobody to answer a phone app.
2. In Steamworks: **Users & Permissions → Manage Users → Invite user**, and invite that account to ChefControl.
3. Give it rights only to Floe Market and its demo:
   - **Edit App Metadata**, which lets it upload builds;
   - **Publish App Changes To Steam**, which lets it set a build live on the beta branch.

   Nothing else. Without the second right, uploads still work, and you set each build live on beta yourself.

## 2. Its saved login, for CI

steamcmd, Valve's uploader, keeps a login it has confirmed with Steam Guard in a file called `config.vdf`. CI restores
that file, so it never needs a password or a code. Make it on Linux, like the CI runner:

```bash
docker run -it --name steam-login steamcmd/steamcmd:latest +login <build account name> +quit
```

Type the password, then the code Steam emails. Then copy the file out:

```bash
docker cp steam-login:/root/Steam/config/config.vdf ./config.vdf && base64 -i config.vdf | pbcopy && rm config.vdf && docker rm steam-login
```

The file is now on your clipboard, base64-encoded. Steam drops a saved login now and then. If uploads start failing at
login, repeat this step and replace the secret.

## 3. GitHub

In the repo: **Settings → Environments → New environment**, named `steam`. Under **Deployment branches**, allow only
`main`. Then add the login as **environment secrets**, so only the upload job on main can read it:

| Environment secret | What |
| --- | --- |
| `STEAM_USERNAME` | the build account's name |
| `STEAM_CONFIG_VDF` | the clipboard from step 2 |

Add the ids as **repository secrets** (**Settings → Secrets and variables → Actions → New repository secret**). The
demo's release build needs the game's id too, for its Wishlist button:

| Repository secret | What |
| --- | --- |
| `STEAM_APP_ID` | Floe Market's app id |
| `STEAM_DEPOT_WINDOWS` | its Windows depot's id |
| `STEAM_DEPOT_LINUX` | its Linux depot's id |
| `STEAM_DEMO_APP_ID`, `STEAM_DEMO_DEPOT_WINDOWS`, `STEAM_DEMO_DEPOT_LINUX` | the same for the demo, once it exists: until then the upload skips it |

The demo is an app of its own: in Steamworks, open Floe Market's app and use **Create a demo** (#183). It gets its own
depots, launch options (as step 4) and store page, and its own review.

Release builds put the game's id into the demo, and anyone signed in to GitHub can download a public repo's build
artifacts. That's fine once the store page is public, since its address carries the id; until then, keep
`STEAM_UPLOAD` off.

Turn uploads on last: **Settings → Secrets and variables → Actions → Variables → New repository variable**,
`STEAM_UPLOAD` = `on`. From then on, main's builds are release builds, which stop on a licence that still waits for
approval (step 5).

## 4. Steamworks: depots and launch options

In the app's **SteamPipe → Depots**:

- one depot for Windows (Operating System: Windows, 64-bit);
- one for Linux (Operating System: Linux + SteamOS).

Under **Installation → General**, add two launch options:

| Executable | Operating system | Arguments |
| --- | --- | --- |
| `FloeMarket.exe` | Windows | (none) |
| `floe-market.sh` | Linux + SteamOS | (none) |

`floe-market.sh` starts the game with Chromium's sandbox where the computer allows it, and without it where it doesn't
(`desktop/build.mjs`).

Under **Installation → Linux Runtime** (it may be called **Compatibility**), pick **Steam Linux Runtime 4.0**
(steamrt4) for the Linux launch option. Steamworks defaults to the old "scout" runtime otherwise.

Under **SteamPipe → Builds**, make a branch called `beta`, with a password so only testers get it. Set builds live on
the default branch yourself.

## 5. Valve's OK for FFmpeg (#149)

Chromium plays the game's recordings through FFmpeg, which is LGPL. Steam asks for Valve's agreement before a game
ships GPL or LGPL code. Electron ships FFmpeg as a separate library that a player can swap, as the LGPL asks. Ask Valve
through Steamworks support:

> Floe Market is built on Electron 45, which ships Chromium's FFmpeg build (LGPL-2.1-or-later) unchanged, as a
> separate dynamic library (ffmpeg.dll / libffmpeg.so), with its licence and a link to its source in the game's
> credits. May we ship it?

Once they agree, add FFmpeg to `APPROVED` in `scripts/licences.ts`, with the date and how they agreed. Until then, test
builds warn about it and release builds stop.
