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
`main`. Then add these **environment secrets**:

| Secret | What |
| --- | --- |
| `STEAM_USERNAME` | the build account's name |
| `STEAM_CONFIG_VDF` | the clipboard from step 2 |
| `STEAM_APP_ID` | Floe Market's app id |
| `STEAM_DEPOT_WINDOWS` | its Windows depot's id |
| `STEAM_DEPOT_LINUX` | its Linux depot's id |
| `STEAM_DEMO_APP_ID`, `STEAM_DEMO_DEPOT_WINDOWS`, `STEAM_DEMO_DEPOT_LINUX` | the same for the demo, once it exists |

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

## 5. Valve's OK for Blink and FFmpeg (#149)

Two parts of Chromium are under the LGPL: Blink, its page engine (from WebKit), built into the program, and FFmpeg,
which plays the game's recordings, a library of its own. Steam asks for Valve's agreement before a game ships GPL or
LGPL code. Both ship unchanged, as Electron builds them, and a player can swap either (another `ffmpeg.dll` /
`libffmpeg.so`, or another build of Electron 45, since the game sits apart in `resources/app.asar`), as the LGPL asks.
Ask Valve through Steamworks support:

> Floe Market is built on Electron 45 (Chromium 156). Chromium includes two LGPL-2.1-or-later parts, unchanged: Blink
> (from WebKit), in the program, and FFmpeg, as a separate dynamic library (ffmpeg.dll / libffmpeg.so). Their licences
> and links to their source are in the game's credits, and players can replace either. May we ship them?

Once they agree, add both to `APPROVED` in `scripts/licences.ts`, with the date and how they agreed. Until then, test
builds warn about them and release builds stop.
