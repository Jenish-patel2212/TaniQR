const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

// Directories
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

// Ensure directories and database files exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(FOLDERS_FILE)) {
  fs.writeFileSync(FOLDERS_FILE, JSON.stringify([
    {
      id: "f_taniq_signature",
      name: "TaniQ Signature Collection",
      description: "Exclusive luxury jewelry and bridal showcase",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: "#d4af37"
    }
  ], null, 2));
}

if (!fs.existsSync(VIDEOS_FILE)) {
  fs.writeFileSync(VIDEOS_FILE, JSON.stringify([], null, 2));
}

// Database helper functions
function getFolders() {
  try {
    const raw = fs.readFileSync(FOLDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading Folders DB:', err);
    return [];
  }
}

function saveFolders(folders) {
  try {
    fs.writeFileSync(FOLDERS_FILE, JSON.stringify(folders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing Folders DB:', err);
  }
}

function getVideos() {
  try {
    const raw = fs.readFileSync(VIDEOS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading Videos DB:', err);
    return [];
  }
}

function saveVideos(videos) {
  try {
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing Videos DB:', err);
  }
}

// Get local network IPv4 address for phone camera QR scanning
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  return addresses.length > 0 ? addresses[0].address : 'localhost';
}

function getAllIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, ip: iface.address });
      }
    }
  }
  return ips;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer Storage for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'taniq-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/') || 
      ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'].includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, WEBM, MOV, etc.) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max limit
});

// Helper for Base URL (Auto-detects Render.com cloud URL, custom domains, or local network IP)
function getBaseUrl(req) {
  // 1. Explicit domain via environment variable
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  // 2. Render automatically provides RENDER_EXTERNAL_URL (e.g. https://taniqr.onrender.com)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }
  // 3. Detect from incoming request headers when accessed via live domain / proxy
  if (req) {
    const fHost = req.headers && (req.headers['x-forwarded-host'] || (typeof req.get === 'function' ? req.get('host') : null));
    if (fHost && !fHost.startsWith('localhost') && !fHost.startsWith('127.0.0.1')) {
      const proto = (req.headers && req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
      return `${proto}://${fHost}`;
    }
  }
  // 4. Fallback for local development: use Wi-Fi IP so phone camera on same Wi-Fi can scan
  const localIp = getLocalNetworkIp();
  return `http://${localIp}:${PORT}`;
}

// ========================================================
// API ROUTES
// ========================================================

// 1. Network Info
app.get('/api/network-info', (req, res) => {
  const primaryIp = getLocalNetworkIp();
  const allIps = getAllIps();
  const suggestedBaseUrl = getBaseUrl(req);
  res.json({
    brand: 'TaniQR',
    primaryIp,
    port: PORT,
    allIps,
    suggestedBaseUrl,
    localhostBaseUrl: `http://localhost:${PORT}`
  });
});

// 2. High Quality QR Code Generator (PNG / SVG with custom colors)
app.get('/api/qr', async (req, res) => {
  try {
    const { text, dark = '#d4af37', light = '#ffffff', width = 400, format = 'png' } = req.query;
    if (!text) {
      return res.status(400).json({ error: 'Text or URL is required to generate QR code.' });
    }

    const options = {
      width: parseInt(width, 10) || 400,
      margin: 2,
      color: {
        dark: dark.startsWith('#') ? dark : `#${dark}`,
        light: light.startsWith('#') ? light : `#${light}`
      }
    };

    if (format === 'svg') {
      const svgString = await QRCode.toString(text, { ...options, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svgString);
    }

    const buffer = await QRCode.toBuffer(text, options);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error('QR Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// 3. FOLDERS - List all folders with video counts and QR details
app.get('/api/folders', (req, res) => {
  const folders = getFolders();
  const videos = getVideos();
  const baseUrl = getBaseUrl(req);

  const result = folders.map(f => {
    const folderVideos = videos
      .filter(v => v.folderId === f.id)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    const qrUrl = `${baseUrl}/watch.html?folder=${f.id}`;
    const cleanColor = (f.color || '#d4af37').replace('#', '');
    const qrCodePath = `/api/qr?text=${encodeURIComponent(qrUrl)}&dark=${cleanColor}&width=400`;

    return {
      ...f,
      videoCount: folderVideos.length,
      firstVideo: folderVideos.length > 0 ? {
        id: folderVideos[0].id,
        title: folderVideos[0].title,
        size: folderVideos[0].size
      } : null,
      qrUrl,
      qrCodePath
    };
  });

  res.json({ folders: result });
});

// 4. FOLDERS - Create new folder
app.post('/api/folders', (req, res) => {
  const { name, description, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required.' });
  }

  const folders = getFolders();
  const folderId = 'f_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
  const newFolder = {
    id: folderId,
    name: name.trim(),
    description: description ? description.trim() : '',
    color: color || '#d4af37',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  folders.unshift(newFolder);
  saveFolders(folders);

  const baseUrl = getBaseUrl(req);
  const qrUrl = `${baseUrl}/watch.html?folder=${newFolder.id}`;

  res.json({
    success: true,
    message: `Folder "${newFolder.name}" created successfully!`,
    folder: {
      ...newFolder,
      videoCount: 0,
      qrUrl,
      qrCodePath: `/api/qr?text=${encodeURIComponent(qrUrl)}&dark=d4af37&width=400`
    }
  });
});

// 5. FOLDERS - Get single folder and its videos in sequence
app.get('/api/folders/:id', (req, res) => {
  const folders = getFolders();
  const folder = folders.find(f => f.id === req.params.id);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  const baseUrl = getBaseUrl(req);
  const qrUrl = `${baseUrl}/watch.html?folder=${folder.id}`;
  const cleanColor = (folder.color || '#d4af37').replace('#', '');
  const qrCodePath = `/api/qr?text=${encodeURIComponent(qrUrl)}&dark=${cleanColor}&width=400`;

  const videos = getVideos();
  const folderVideos = videos
    .filter(v => v.folderId === folder.id)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .map(v => ({ ...v, passwordHash: undefined }));

  res.json({
    folder: {
      ...folder,
      videoCount: folderVideos.length,
      qrUrl,
      qrCodePath
    },
    videos: folderVideos
  });
});

// 6. FOLDERS - Rename / update folder
app.put('/api/folders/:id', (req, res) => {
  const folders = getFolders();
  const folder = folders.find(f => f.id === req.params.id);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  const { name, description, color } = req.body;
  if (name && name.trim()) folder.name = name.trim();
  if (description !== undefined) folder.description = description.trim();
  if (color) folder.color = color;
  folder.updatedAt = new Date().toISOString();

  saveFolders(folders);
  res.json({ success: true, message: 'Folder updated successfully!', folder });
});

// 7. FOLDERS - Delete folder and all videos inside it
app.delete('/api/folders/:id', (req, res) => {
  let folders = getFolders();
  const idx = folders.findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  const [removedFolder] = folders.splice(idx, 1);
  saveFolders(folders);

  // Delete all videos belonging to this folder from disk & DB
  let videos = getVideos();
  const folderVideos = videos.filter(v => v.folderId === req.params.id);
  folderVideos.forEach(v => {
    const filePath = path.join(UPLOADS_DIR, v.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  });

  videos = videos.filter(v => v.folderId !== req.params.id);
  saveVideos(videos);

  res.json({
    success: true,
    message: `Folder "${removedFolder.name}" and all its videos were removed.`
  });
});

// 8. FOLDERS - Upload Videos directly inside a folder (supports multiple videos)
app.post('/api/folders/:id/upload', upload.array('videos', 50), async (req, res) => {
  try {
    const folders = getFolders();
    const folder = folders.find(f => f.id === req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Target folder not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please select one or more video files to upload.' });
    }

    let customTitles = [];
    if (req.body.titles) {
      try { customTitles = JSON.parse(req.body.titles); } catch (e) {}
    }

    const videos = getVideos();
    const currentFolderVideos = videos.filter(v => v.folderId === folder.id);
    let startSeq = currentFolderVideos.length > 0 
      ? Math.max(...currentFolderVideos.map(v => v.sequence || 0)) + 1 
      : 1;

    const uploadedVideos = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const videoId = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const title = (customTitles[i] && customTitles[i].trim()) 
        ? customTitles[i].trim() 
        : file.originalname.replace(/\.[^/.]+$/, "");

      const newVid = {
        id: videoId,
        folderId: folder.id,
        sequence: startSeq + i,
        title: title,
        description: '',
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype || 'video/mp4',
        size: file.size,
        views: 0,
        createdAt: new Date().toISOString()
      };

      videos.push(newVid);
      uploadedVideos.push(newVid);
    }

    saveVideos(videos);
    folder.updatedAt = new Date().toISOString();
    saveFolders(folders);

    res.json({
      success: true,
      message: `${uploadedVideos.length} video(s) uploaded successfully to folder "${folder.name}"!`,
      videos: uploadedVideos
    });
  } catch (err) {
    console.error('Folder Video Upload Error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload videos.' });
  }
});

// 9. FOLDERS - Reorder videos inside a folder (change 1st, 2nd sequence)
app.post('/api/folders/:id/reorder', (req, res) => {
  const { order, videoId, newPosition } = req.body;
  let videos = getVideos();
  let folderVideos = videos.filter(v => v.folderId === req.params.id);

  if (folderVideos.length === 0) {
    return res.status(404).json({ error: 'No videos found in this folder.' });
  }

  if (Array.isArray(order) && order.length > 0) {
    const vMap = new Map(folderVideos.map(v => [v.id, v]));
    const reordered = [];
    order.forEach(id => {
      if (vMap.has(id)) {
        reordered.push(vMap.get(id));
        vMap.delete(id);
      }
    });
    vMap.forEach(v => reordered.push(v));
    folderVideos = reordered;
  } else if (videoId && newPosition !== undefined) {
    const curIdx = folderVideos.findIndex(v => v.id === videoId);
    if (curIdx !== -1) {
      const targetIdx = Math.max(0, Math.min(folderVideos.length - 1, parseInt(newPosition, 10) - 1));
      const [moved] = folderVideos.splice(curIdx, 1);
      folderVideos.splice(targetIdx, 0, moved);
    }
  } else {
    return res.status(400).json({ error: 'Invalid reorder parameters.' });
  }

  // Update sequential order indices (1, 2, 3...)
  folderVideos.forEach((v, idx) => {
    v.sequence = idx + 1;
    v.batchIndex = idx + 1;
  });

  // Re-merge with other folders' videos
  const otherVideos = videos.filter(v => v.folderId !== req.params.id);
  videos = [...otherVideos, ...folderVideos];
  saveVideos(videos);

  res.json({
    success: true,
    message: `Playlist updated! "${folderVideos[0].title}" will now play #1 (First) when the folder QR is scanned.`,
    videos: folderVideos
  });
});

// 10. PUBLIC SCAN ENDPOINT - User scans QR code of a folder
// STRICT ISOLATION: User sees ONLY this folder's video(s) and NOTHING ELSE!
app.get('/api/folders/:id/watch', (req, res) => {
  const folders = getFolders();
  const folder = folders.find(f => f.id === req.params.id);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found or has been removed.' });
  }

  const videos = getVideos();
  const folderVideos = videos
    .filter(v => v.folderId === folder.id)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  if (folderVideos.length === 0) {
    return res.status(404).json({ error: 'This folder is currently empty. No videos available.' });
  }

  // Increment view counter
  folderVideos[0].views = (folderVideos[0].views || 0) + 1;
  saveVideos(videos);

  res.json({
    brand: 'TaniQR',
    folder: {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      color: folder.color || '#d4af37'
    },
    totalVideos: folderVideos.length,
    videos: folderVideos.map(v => ({
      id: v.id,
      title: v.title,
      sequence: v.sequence || 1,
      size: v.size,
      mimeType: v.mimeType,
      streamUrl: `/api/stream/${v.id}`
    }))
  });
});

// 11. Rename Video Title
app.put('/api/videos/:id', (req, res) => {
  const videos = getVideos();
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const { title, description } = req.body;
  if (title && title.trim()) {
    video.title = title.trim();
  }
  if (description !== undefined) {
    video.description = description.trim();
  }
  video.updatedAt = new Date().toISOString();
  saveVideos(videos);

  res.json({
    success: true,
    message: 'Video name updated successfully!',
    video
  });
});

// 12. Delete Single Video
app.delete('/api/videos/:id', (req, res) => {
  const videos = getVideos();
  const idx = videos.findIndex(v => v.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  const [removed] = videos.splice(idx, 1);
  saveVideos(videos);

  const filePath = path.join(UPLOADS_DIR, removed.filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }

  res.json({ success: true, message: 'Video deleted successfully.' });
});

// 13. Video Streaming with HTTP 206 Partial Content
app.get('/api/stream/:id', (req, res) => {
  const videos = getVideos();
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).send('Video not found');
  }

  const filePath = path.join(UPLOADS_DIR, video.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Video file not found on disk');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mimeType || 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': video.mimeType || 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Backward-compatibility: if user navigates with ?id=..., redirect or stream
app.get('/api/videos/:id', (req, res) => {
  const videos = getVideos();
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found.' });
  res.json({ video });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`=======================================================`);
  console.log(`💎 TaniQ Video & QR Platform is running!`);
  console.log(`👑 Admin Portal (Folders & QR): http://localhost:${PORT}`);
  console.log(`📱 Mobile Wi-Fi Scan Base: http://${localIp}:${PORT}`);
  console.log(`✨ Customer Scan Viewer: http://${localIp}:${PORT}/watch.html?folder=<folderId>`);
  console.log(`=======================================================`);
});
