# TaniQ - Exclusive Video & QR Management Platform 💎✨

**Admin Folder Manager, Custom Folder QR Codes & Strict Customer Video Showcase**

TaniQ is a luxury web platform designed for luxury brands and studios. Admin can create dedicated folders (e.g. Collections, Product Launches), upload videos inside each folder, arrange their sequence (1st, 2nd, etc.), and generate an isolated, high-resolution QR code for each folder.

When a customer scans a folder's QR code, **ONLY that folder's videos are shown** (complete isolation from admin options and other collections). When playback finishes, the session gracefully closes.

---

## 🌟 How the TaniQ Workflow Works

### 1. 👑 Admin Portal (`index.html`)
- **Folder Management**:
  - Click **"+ Create Folder"** to create a new collection (e.g. *"Bridal Collection 2026"*, *"Diamond Necklace Launch"*).
  - Open any folder to manage its contents.
  - Delete or rename any folder.
- **Videos inside Folder**:
  - Drag-and-drop or upload multiple video files directly into that specific folder.
  - Rename any video title.
- **Sequence (Which video plays 1st, 2nd, etc.)**:
  - Click **"Make 1st (`⭐`)"** to promote any video to position #1.
  - Use **`▲ Move Up`** and **`▼ Move Down`** to set the exact order.
  - The video at position **#1 (Plays First)** will always play first when the folder's QR code is scanned!
- **Folder QR Code**:
  - Every folder has its own unique, scannable QR Code.
  - Download high-res **PNG QR**, vector **SVG QR**, or print an elegant **TaniQ Scan Standee**.

### 2. 📱 Customer QR Scan Experience (`watch.html`)
- **Direct Isolated Access**:
  - Scanning the folder QR code opens `watch.html?folder=<folderId>`.
  - The user sees **ONLY this folder's video(s)**.
  - No access to other folders, no admin controls, no distractions.
- **Seamless Playback**:
  - Video #1 starts playing automatically in high definition.
  - If multiple videos exist, they auto-play in the order set by the admin (1st, then 2nd, 3rd, etc.).
- **Auto-Close on Completion ("khatam hone ke bad close ho jaye")**:
  - Once the video(s) finish playing, an exquisite TaniQ Outro Screen appears:
    - *"Thank You for Watching - TaniQ"*
    - Automatically closes the session with a 5-second countdown and `window.close()`.
    - Features a one-tap **"Exit / Close Player"** button for mobile browser tabs.

---

## 🚀 How to Run

1. Start the server:
   ```bash
   npm start
   ```
   *(or double-click `start.bat`)*

2. Open in your browser:
   - **TaniQ Admin Portal**: [http://localhost:5000](http://localhost:5000)
   - **TaniQ Customer Viewer**: [http://localhost:5000/watch.html](http://localhost:5000/watch.html)

3. **To test scanning from your phone**:
   - Connect your phone and PC to the same Wi-Fi.
   - Point your phone camera at any Folder's QR Code.
   - It will stream that folder's videos instantly!
