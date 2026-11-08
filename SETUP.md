# IGO Dev Stack: Step-by-Step Setup

| Who | Time | Result |
|---|---|---|
| **Admin** (Vignesh, remote) | ~20 min, once | Claude Code + 26 plugins + security guard + Obsidian second brain + **private team dashboard** |
| **Each team member** (office) | ~15 min per PC | Same stack + activity logging (encrypted, only the admin can read it) |
| **New PC later** | 1 line | Everything installs automatically |

Team folder: **Google Drive → My Drive → IGO-Team-Logs** (owner `igobackend2@gmail.com`)
Folder link: https://drive.google.com/drive/folders/1zE69QTd2KuvIpjWR5xd2xrvdoMRKbdYz
Admin key fingerprint: **42b8-f7aa-d077-44d4**

---

## Part A: Publish the plugin (admin, once)

1. Open `Downloads\igo-dev-stack-v0.4.0`.
2. Double-click **`PUSH-TO-GITHUB.cmd`**.
3. If a GitHub sign-in window opens, sign in as **igogroupofcompanies**.
4. Wait for **DONE**.
5. Check that https://github.com/igogroupofcompanies/igo-dev-stack shows the files.

> After this, any PC can install with one line (Part D).

---

## Part B: Admin PC setup (your PC, once)

The admin key is already created and saved on this PC (`Documents\IGO-Team-Dashboard\.admin-key`). The public key is already in the Drive folder.

**Option 1: double-click**
1. Open `Downloads\igo-dev-stack-v0.4.0\igo-dev-stack`.
2. Double-click **`setup-admin.cmd`**.
3. Type your name (e.g. `Vignesh A`), then press Enter.
4. Wait 10–15 min. It installs Git, Node, uv, Claude Code, 26 audited plugins, the security guard, the Obsidian vault, Google Drive for desktop (if missing), the dashboard schedule (every 30 min), and opens the dashboard.

**Option 2: PowerShell** (if Claude Code and the plugins are already installed)
```powershell
cd "$env:USERPROFILE\Downloads\igo-dev-stack-v0.4.0\igo-dev-stack"
node scripts\igo-sec.js team admin-setup --dir "G:\My Drive\IGO-Team-Logs" --name "Vignesh A"
```

**Then**
5. **Back up** `Documents\IGO-Team-Dashboard\.admin-key` to a USB drive or password manager. If you lose it, the logs can't be read. Never put it in Google Drive or email.
6. Bookmark `Documents\IGO-Team-Dashboard\IGO Team Activity.html`. It refreshes every 30 minutes.

---

## Part C: Share the Drive folder with the team (admin, once)

1. Open the folder link above, then click **Share**.
2. Add each member's Google email as **Editor**, then **Send**.
   (Or give Claude the list of emails and it shares the folder through the Google Drive connector.)

Members can upload logs but cannot read them: every file is encrypted with your key.

---

## Part D: Team member PC setup (each person)

**Before starting:** the member needs their Google account (shared in Part C) and admin rights on the PC.

**Option 1: one line** (after Part A). Open **PowerShell** (normal) and paste, changing the name:
```powershell
$env:IGO_TEAM_LINK="https://drive.google.com/drive/folders/1zE69QTd2KuvIpjWR5xd2xrvdoMRKbdYz"; $env:IGO_NAME="Ravi Kumar"
irm https://raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack/main/install.ps1 | iex
```

**Option 2: double-click** (USB / no GitHub). Copy the `igo-dev-stack` folder to the PC and double-click **`setup-member.cmd`**, then type the member's name.

**During the install the member must:**
1. **Sign in to Google Drive for desktop** when its window opens (or from the tray icon), using the Google account you shared with.
2. In the browser page that opens (IGO-Team-Logs), right-click the folder, choose **Organize → Add shortcut to My Drive**.
3. Wait. The installer detects `G:\My Drive\IGO-Team-Logs` and finishes by itself.
4. Check the printed fingerprint is **42b8-f7aa-d077-44d4**. If it's different, stop and tell the admin.
5. Restart Claude Code.

At every Claude Code start, the member sees: *"IGO activity logging is ON (company policy)…"*

---

## Part E: Daily use

| Who | What |
|---|---|
| Everyone | Open a project, run `claude`, and type what you need. Skills are picked automatically, the security guard runs in the background, and the project blueprint is applied. |
| Admin | Open **IGO Team Activity.html**. You can filter by member, day and project, use Today / 7 days / 30 days, and export CSV. |
| Admin | `node scripts\igo-sec.js team status` shows each member's last sync, so you can spot anyone not sending logs. |
| Admin | `node scripts\igo-sec.js report --days 7` gives the weekly security report. |

---

## Part F: Troubleshooting

| Problem | Fix |
|---|---|
| `claude` is not recognized | Close PowerShell and open a new one. Still failing? Run `irm https://claude.ai/install.ps1 \| iex`, then open a new window. |
| `node: bad option --vault` | The script path was empty. Use the full path to `scripts\igo-brain.js`. |
| Installer waits for `G:\My Drive\IGO-Team-Logs` | Sign in to Google Drive for desktop, then **Add shortcut to My Drive** on the shared folder. Drive letter not G? Run `node scripts\igo-sec.js team setup --dir "<X>:\My Drive\IGO-Team-Logs" --name "Name"`. |
| Fingerprint mismatch | Don't continue. The admin checks `_igo_admin_public_key.pem` in the Drive folder. |
| Dashboard shows "could not be decrypted" | The admin key is missing on this PC. Restore `.admin-key` from your backup. |
| Member not appearing | They need an active Claude Code session. On their PC run `team sync`, then check `team status`. |
| Security notice about unapproved plugins | Shown once. Review it, then run `node scripts\igo-sec.js approve --all-enabled`. |
| A command was blocked | That's the security guard. Read the reason. If it's intended, run the command yourself or change the profile (`igo-sec profile normal`). |

---

*Privacy (DPDP Act 2023): members are told that logging is on, and secrets, Aadhaar and PAN numbers are masked before upload. Use the data for work purposes only, and keep the admin key private.*
