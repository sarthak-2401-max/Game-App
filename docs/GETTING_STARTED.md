# Getting started (no prior experience needed)

This guide takes you from an empty computer to the game running on your iPhone, then to your first real builds. Follow the parts in order. Anything in a grey box is a command: copy it, paste it into the Terminal (Mac) or PowerShell (Windows), and press Enter.

## What these tools are

- **Node.js** runs JavaScript on your computer. The game's tooling needs it.
- **npm** comes with Node.js. It downloads the libraries the game uses (into a `node_modules` folder).
- **Git** downloads the game's code from GitHub and uploads your changes.
- **Expo Go** is a free iPhone/Android app that runs the game straight from your computer while you develop. No Apple account needed.
- **EAS** (Expo Application Services) is Expo's cloud service that builds the real app files you upload to the App Store and Play Store. Free tier is enough.

## Part 1: Install the tools (once, about 10 minutes)

1. **Node.js:** go to https://nodejs.org, download the **LTS** version, run the installer with the default options.
2. **Git:**
   - Mac: open Terminal (Cmd+Space, type "Terminal") and run `git --version`. If it offers to install developer tools, click Install.
   - Windows: download from https://git-scm.com and install with the default options.
3. Close and reopen Terminal/PowerShell, then check both worked. Each should print a version number:

   ```bash
   node -v
   npm -v
   git --version
   ```

   `node -v` should print `v20` or higher.

## Part 2: Download the game and install its libraries (once)

```bash
cd ~/Desktop
git clone https://github.com/sarthak-2401-max/Game-App.git
cd Game-App
npm install
```

`npm install` takes a few minutes and prints a lot of text. Warnings are normal; only a line saying `ERR!` at the end is a problem.

From now on, every command in this guide is run **inside the `Game-App` folder**. If you open a new Terminal window, run `cd ~/Desktop/Game-App` first.

## Part 3: Play it in your browser (quickest check)

```bash
npm run web
```

A browser tab opens with the game. Use the arrow keys to move. Press `Ctrl+C` in Terminal to stop it.

## Part 4: Run it on your iPhone with Expo Go (free, no Apple account)

1. On your iPhone, install **Expo Go** from the App Store and open it once.
2. Put your iPhone and computer on the **same Wi-Fi**.
3. On the computer:

   ```bash
   npx expo start
   ```

4. A QR code appears in Terminal. Open the iPhone **Camera** app, point it at the QR code and tap the banner. The game opens in Expo Go.
5. Edit and save any file and the phone reloads by itself. `Ctrl+C` stops it.

If it doesn't connect (office or hotel Wi-Fi often blocks this), run `npx expo start --tunnel` instead and scan the new code.

Things to know about Expo Go:

- Ads show as a clearly labelled **simulator**, not real AdMob ads. Expo Go can't contain the AdMob library, so this is expected. Real test ads appear in the preview build (Part 6).
- If Expo Go says the project uses an **incompatible SDK version**, the App Store version of Expo Go doesn't match this project's Expo SDK yet. Skip to Part 6 and use a preview build instead.

## Part 5: Create your Expo account and link the project (once)

1. Sign up at https://expo.dev (free).
2. Log in and link the project:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   `init` asks to create a project: answer **Yes**. Because this app's config is a code file (`app.config.ts`), it then prints a **project ID** (a long code like `1a2b3c4d-...`) and asks you to add it yourself. **Send that ID to Claude in the project thread** and it will be added to the code for you. It is not a secret.

## Part 6: Preview build on real phones (real test ads)

**Android** (any Android phone, no extra account):

```bash
npx eas-cli@latest build --platform android --profile preview
```

The build runs in Expo's cloud (10 to 30 minutes). When it finishes, Terminal and expo.dev show a link and QR code. Open it on the Android phone to install the APK.

**iPhone** needs your **Apple Developer account** (99 USD/year) because Apple only lets registered devices install test builds:

```bash
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

`device:create` gives you a link to open on your iPhone that registers it. During the build, EAS asks you to log in to Apple and creates the signing certificate for you; answer **Yes** to its questions. When it finishes, open the install link on the iPhone. If iOS asks, enable **Settings → Privacy & Security → Developer Mode**.

## Part 7: Store builds

Once AdMob is set up (see PUBLISHING.md, section 4), follow [PUBLISHING.md](PUBLISHING.md) sections 5 and 6 for production builds and uploading to the stores.

## Common problems

| Message | Fix |
|---|---|
| `command not found: node` / `npm` | Reopen Terminal after installing Node. On Windows, restart the computer. |
| `npm ERR! EACCES` (Mac) | Don't use `sudo`. Reinstall Node from nodejs.org. |
| `Cannot find module ...` | Run `npm install` again inside `Game-App`. |
| QR code doesn't open the game | Same Wi-Fi on both devices, or use `npx expo start --tunnel`. |
| `Project ID is missing` during a build | Part 5 isn't finished yet: send the project ID to Claude. |
| A production build stops with "Production build is missing: ORL_ADMOB_..." | Expected until your real AdMob IDs are set. Use the `preview` profile until then. |
