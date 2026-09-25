/**
 * TaniQ - Admin Video & QR Portal Logic
 * Brand: TaniQ
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let networkInfo = null;
  let allFolders = [];
  let currentFolder = null;
  let currentFolderVideos = [];
  let uploadFilesQueue = [];
  let renameTarget = null; // { type: 'folder' | 'video', item: obj }

  // DOM Elements - Navigation & Header
  const networkPill = document.getElementById('networkPill');
  const hostIpDisplay = document.getElementById('hostIpDisplay');
  const bcHomeLink = document.getElementById('bcHomeLink');
  const bcSep = document.getElementById('bcSep');
  const bcFolderTitle = document.getElementById('bcFolderTitle');
  const btnOpenCreateFolder = document.getElementById('btnOpenCreateFolder');
  const heroCreateFolderBtn = document.getElementById('heroCreateFolderBtn');

  // DOM Elements - Views
  const viewAllFolders = document.getElementById('viewAllFolders');
  const viewFolderDetail = document.getElementById('viewFolderDetail');
  const foldersGrid = document.getElementById('foldersGrid');
  const foldersCountBadge = document.getElementById('foldersCountBadge');
  const btnBackToFolders = document.getElementById('btnBackToFolders');

  // DOM Elements - Inside Folder Spotlight & Sequence
  const spotlightFolderTitle = document.getElementById('spotlightFolderTitle');
  const spotlightFolderDesc = document.getElementById('spotlightFolderDesc');
  const spotlightQrImg = document.getElementById('spotlightQrImg');
  const btnDownloadFolderPng = document.getElementById('btnDownloadFolderPng');
  const btnDownloadFolderSvg = document.getElementById('btnDownloadFolderSvg');
  const btnPrintFolderFlyer = document.getElementById('btnPrintFolderFlyer');
  const btnTestCustomerWatch = document.getElementById('btnTestCustomerWatch');
  const folderVideoCountBadge = document.getElementById('folderVideoCountBadge');
  const folderVideosList = document.getElementById('folderVideosList');
  const btnOpenUploadModal = document.getElementById('btnOpenUploadModal');

  // DOM Elements - Create Folder Modal
  const createFolderModal = document.getElementById('createFolderModal');
  const closeCreateFolderModal = document.getElementById('closeCreateFolderModal');
  const cancelCreateFolder = document.getElementById('cancelCreateFolder');
  const createFolderForm = document.getElementById('createFolderForm');
  const newFolderName = document.getElementById('newFolderName');
  const newFolderDesc = document.getElementById('newFolderDesc');

  // DOM Elements - Upload Modal
  const uploadModal = document.getElementById('uploadModal');
  const closeUploadModal = document.getElementById('closeUploadModal');
  const cancelUpload = document.getElementById('cancelUpload');
  const uploadForm = document.getElementById('uploadForm');
  const videoFileInput = document.getElementById('videoFileInput');
  const modalDropzone = document.getElementById('modalDropzone');
  const uploadQueueContainer = document.getElementById('uploadQueueContainer');
  const queueItemsList = document.getElementById('queueItemsList');
  const queueCount = document.getElementById('queueCount');
  const btnAddMoreVideos = document.getElementById('btnAddMoreVideos');
  const uploadProgressWrapper = document.getElementById('uploadProgressWrapper');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const uploadProgressText = document.getElementById('uploadProgressText');
  const uploadProgressPercent = document.getElementById('uploadProgressPercent');
  const uploadSubmitText = document.getElementById('uploadSubmitText');

  // DOM Elements - QR Modal
  const folderQrModal = document.getElementById('folderQrModal');
  const closeFolderQrModal = document.getElementById('closeFolderQrModal');
  const folderQrModalTitle = document.getElementById('folderQrModalTitle');
  const modalQrImg = document.getElementById('modalQrImg');
  const modalQrNotice = document.getElementById('modalQrNotice');
  const modalQrUrlText = document.getElementById('modalQrUrlText');
  const modalCopyQrLink = document.getElementById('modalCopyQrLink');
  const modalDownloadQrPng = document.getElementById('modalDownloadQrPng');
  const modalPrintQrStandee = document.getElementById('modalPrintQrStandee');

  // DOM Elements - Rename Modal
  const renameModal = document.getElementById('renameModal');
  const closeRenameModal = document.getElementById('closeRenameModal');
  const cancelRename = document.getElementById('cancelRename');
  const renameForm = document.getElementById('renameForm');
  const renameModalHeader = document.getElementById('renameModalHeader');
  const renameLabel = document.getElementById('renameLabel');
  const renameInputTitle = document.getElementById('renameInputTitle');
  const renameDescGroup = document.getElementById('renameDescGroup');
  const renameInputDesc = document.getElementById('renameInputDesc');

  // DOM Elements - Flyer Modal
  const flyerModal = document.getElementById('flyerModal');
  const closeFlyerModal = document.getElementById('closeFlyerModal');
  const cancelFlyerBtn = document.getElementById('cancelFlyerBtn');
  const doPrintFlyerBtn = document.getElementById('doPrintFlyerBtn');
  const flyerFolderTitle = document.getElementById('flyerFolderTitle');
  const flyerQrImage = document.getElementById('flyerQrImage');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // ========================================================
  // 1. Initial Load & Network Info
  // ========================================================
  async function loadNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      networkInfo = await res.json();
      hostIpDisplay.textContent = networkInfo.suggestedBaseUrl || `http://localhost:${networkInfo.port}`;
    } catch (e) {
      console.warn('Network info fetch error:', e);
    }
  }

  networkPill.addEventListener('click', () => {
    if (networkInfo && networkInfo.suggestedBaseUrl) {
      navigator.clipboard.writeText(networkInfo.suggestedBaseUrl).then(() => {
        showToast('Network IP link copied to clipboard!', 'success');
      });
    }
  });

  function getBaseUrl() {
    if (networkInfo && networkInfo.suggestedBaseUrl) {
      return networkInfo.suggestedBaseUrl;
    }
    return window.location.origin;
  }

  // ========================================================
  // 2. Load & Render All Folders
  // ========================================================
  async function loadFolders() {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      allFolders = data.folders || [];
      renderFoldersGrid();
    } catch (err) {
      showToast('Error loading folders', 'error');
    }
  }

  function renderFoldersGrid() {
    foldersCountBadge.textContent = `${allFolders.length} Folder${allFolders.length === 1 ? '' : 's'}`;
    foldersGrid.innerHTML = '';

    if (allFolders.length === 0) {
      foldersGrid.innerHTML = `
        <div class="empty-box" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-folder-open"></i>
          <h3>No Folders Created Yet</h3>
          <p>Create your first folder to organize videos and generate an exclusive QR code.</p>
          <button class="btn-primary-gold" onclick="document.getElementById('btnOpenCreateFolder').click()">
            <i class="fa-solid fa-folder-plus"></i> Create First Folder
          </button>
        </div>
      `;
      return;
    }

    allFolders.forEach(folder => {
      const card = document.createElement('div');
      card.className = 'folder-card';
      card.innerHTML = `
        <div class="folder-top-row">
          <div class="folder-icon-box">
            <i class="fa-solid fa-folder"></i>
          </div>
          <div class="folder-qr-preview-thumb" title="Click to view full QR code">
            <img src="${folder.qrCodePath}" alt="QR">
          </div>
        </div>

        <h3 class="folder-name">${escapeHtml(folder.name)}</h3>
        <p class="folder-desc">${escapeHtml(folder.description || 'Exclusive video collection for customers.')}</p>

        <div class="folder-meta-row">
          <span class="folder-count-badge">
            <i class="fa-solid fa-video"></i> ${folder.videoCount} Video${folder.videoCount === 1 ? '' : 's'}
          </span>
          <span>Created: ${formatDate(folder.createdAt)}</span>
        </div>

        <div class="folder-actions-row">
          <button class="btn-open-folder" data-id="${folder.id}">
            <i class="fa-solid fa-folder-open"></i> Open Folder
          </button>
          <button class="btn-card-icon btn-card-qr" data-id="${folder.id}" title="Get Folder QR Code">
            <i class="fa-solid fa-qrcode"></i>
          </button>
          <button class="btn-card-icon btn-card-rename" data-id="${folder.id}" title="Rename Folder">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-card-icon delete btn-card-del" data-id="${folder.id}" title="Delete Folder">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      // Open Folder click
      card.querySelector('.folder-name').addEventListener('click', () => openFolderDetail(folder.id));
      card.querySelector('.btn-open-folder').addEventListener('click', () => openFolderDetail(folder.id));

      // QR click
      card.querySelector('.folder-qr-preview-thumb').addEventListener('click', () => openFolderQrModal(folder));
      card.querySelector('.btn-card-qr').addEventListener('click', () => openFolderQrModal(folder));

      // Rename click
      card.querySelector('.btn-card-rename').addEventListener('click', (e) => {
        e.stopPropagation();
        openRenameModal('folder', folder);
      });

      // Delete click
      card.querySelector('.btn-card-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFolder(folder);
      });

      foldersGrid.appendChild(card);
    });
  }

  // ========================================================
  // 3. Open Inside Folder View (Videos & Sequence)
  // ========================================================
  async function openFolderDetail(folderId) {
    try {
      const res = await fetch(`/api/folders/${folderId}`);
      if (!res.ok) throw new Error('Folder not found');
      const data = await res.json();
      currentFolder = data.folder;
      currentFolderVideos = data.videos || [];

      // Switch View
      viewAllFolders.style.display = 'none';
      viewFolderDetail.style.display = 'flex';

      // Update Breadcrumbs
      bcSep.style.display = 'inline-block';
      bcFolderTitle.style.display = 'inline-block';
      bcFolderTitle.textContent = currentFolder.name;

      // Populate Spotlight Banner
      spotlightFolderTitle.textContent = currentFolder.name;
      spotlightFolderDesc.textContent = currentFolder.description || 'Exclusive video collection for customers.';
      spotlightQrImg.src = currentFolder.qrCodePath;
      btnTestCustomerWatch.href = currentFolder.qrUrl;

      // Render Videos List
      renderFolderVideosList();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      showToast('Could not open folder: ' + err.message, 'error');
    }
  }

  function showAllFoldersView() {
    viewFolderDetail.style.display = 'none';
    viewAllFolders.style.display = 'block';
    bcSep.style.display = 'none';
    bcFolderTitle.style.display = 'none';
    currentFolder = null;
    loadFolders();
  }

  btnBackToFolders.addEventListener('click', showAllFoldersView);
  bcHomeLink.addEventListener('click', showAllFoldersView);

  // Render Videos List inside current folder
  function renderFolderVideosList() {
    folderVideoCountBadge.textContent = `${currentFolderVideos.length} Video${currentFolderVideos.length === 1 ? '' : 's'}`;
    folderVideosList.innerHTML = '';

    if (currentFolderVideos.length === 0) {
      folderVideosList.innerHTML = `
        <div class="empty-box">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <h3>This Folder is Empty</h3>
          <p>Click below to upload videos into "${escapeHtml(currentFolder.name)}".</p>
          <button class="btn-primary-gold" onclick="document.getElementById('btnOpenUploadModal').click()">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload First Video
          </button>
        </div>
      `;
      return;
    }

    currentFolderVideos.forEach((vid, index) => {
      const isFirst = index === 0;
      const isLast = index === currentFolderVideos.length - 1;

      const item = document.createElement('div');
      item.className = `video-seq-item ${isFirst ? 'is-first' : ''}`;
      item.innerHTML = `
        <div class="seq-num-badge" title="${isFirst ? 'Plays 1st when customer scans QR' : `Video #${index + 1}`}">${index + 1}</div>
        <div class="seq-video-thumb">
          <video src="/api/stream/${vid.id}#t=0.5" preload="metadata" muted playsinline></video>
        </div>
        <div class="seq-info-col">
          <div class="seq-video-title" title="${escapeHtml(vid.title)}">${escapeHtml(vid.title)}</div>
          <div class="seq-video-sub">
            <span>${formatBytes(vid.size)}</span>
            <span>&bull;</span>
            ${isFirst ? '<span class="first-tag"><i class="fa-solid fa-play"></i> Plays First (1st)</span>' : `<span>Position #${index + 1}</span>`}
          </div>
        </div>
        <div class="seq-actions-group">
          <button type="button" class="btn-seq-first" ${isFirst ? 'disabled' : ''} title="Make this video play 1st on QR scan">
            ${isFirst ? '<i class="fa-solid fa-star"></i> 1st Video' : '<i class="fa-regular fa-star"></i> Make 1st'}
          </button>
          <button type="button" class="btn-seq-shift btn-up" ${isFirst ? 'disabled' : ''} title="Move Up in Sequence">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button type="button" class="btn-seq-shift btn-down" ${isLast ? 'disabled' : ''} title="Move Down in Sequence">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button type="button" class="btn-card-icon btn-rename-vid" title="Rename Title">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn-card-icon delete btn-del-vid" title="Delete Video">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      // Up button
      item.querySelector('.btn-up').addEventListener('click', () => {
        if (index > 0) {
          shiftVideoSequence(index, index - 1);
        }
      });

      // Down button
      item.querySelector('.btn-down').addEventListener('click', () => {
        if (index < currentFolderVideos.length - 1) {
          shiftVideoSequence(index, index + 1);
        }
      });

      // Make 1st button
      item.querySelector('.btn-seq-first').addEventListener('click', () => {
        if (index > 0) {
          const [picked] = currentFolderVideos.splice(index, 1);
          currentFolderVideos.unshift(picked);
          renderFolderVideosList();
          saveFolderReorder();
        }
      });

      // Rename button
      item.querySelector('.btn-rename-vid').addEventListener('click', () => {
        openRenameModal('video', vid);
      });

      // Delete button
      item.querySelector('.btn-del-vid').addEventListener('click', () => {
        deleteVideo(vid);
      });

      folderVideosList.appendChild(item);
    });
  }

  // Shift video sequence
  function shiftVideoSequence(fromIdx, toIdx) {
    const temp = currentFolderVideos[fromIdx];
    currentFolderVideos[fromIdx] = currentFolderVideos[toIdx];
    currentFolderVideos[toIdx] = temp;
    renderFolderVideosList();
    saveFolderReorder();
  }

  // Save sequence to server
  async function saveFolderReorder() {
    if (!currentFolder) return;
    try {
      const orderIds = currentFolderVideos.map(v => v.id);
      const res = await fetch(`/api/folders/${currentFolder.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderIds })
      });
      const data = await res.json();
      if (data.success) {
        currentFolderVideos = data.videos;
        renderFolderVideosList();
        showToast(`Playlist saved! "${currentFolderVideos[0].title}" will now play 1st.`, 'success');
      } else {
        showToast(data.error || 'Failed to update order', 'error');
      }
    } catch (err) {
      showToast('Error saving sequence', 'error');
    }
  }

  // ========================================================
  // 4. Create New Folder
  // ========================================================
  function openCreateFolderModal() {
    newFolderName.value = '';
    newFolderDesc.value = '';
    createFolderModal.style.display = 'flex';
    setTimeout(() => newFolderName.focus(), 100);
  }

  btnOpenCreateFolder.addEventListener('click', openCreateFolderModal);
  if (heroCreateFolderBtn) heroCreateFolderBtn.addEventListener('click', openCreateFolderModal);
  closeCreateFolderModal.addEventListener('click', () => createFolderModal.style.display = 'none');
  cancelCreateFolder.addEventListener('click', () => createFolderModal.style.display = 'none');

  createFolderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newFolderName.value.trim();
    if (!name) return;
    const desc = newFolderDesc.value.trim();

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Folder "${data.folder.name}" created!`, 'success');
        createFolderModal.style.display = 'none';
        // Directly open this newly created folder
        openFolderDetail(data.folder.id);
      } else {
        showToast(data.error || 'Failed to create folder', 'error');
      }
    } catch (err) {
      showToast('Error creating folder', 'error');
    }
  });

  // Delete Folder
  async function deleteFolder(folder) {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}" and all its videos? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'info');
        loadFolders();
      } else {
        showToast(data.error || 'Failed to delete folder', 'error');
      }
    } catch (err) {
      showToast('Error deleting folder', 'error');
    }
  }

  // ========================================================
  // 5. Upload Videos to Current Folder
  // ========================================================
  btnOpenUploadModal.addEventListener('click', () => {
    if (!currentFolder) return;
    uploadFilesQueue = [];
    renderUploadQueue();
    uploadProgressWrapper.style.display = 'none';
    uploadModal.style.display = 'flex';
  });

  closeUploadModal.addEventListener('click', () => uploadModal.style.display = 'none');
  cancelUpload.addEventListener('click', () => uploadModal.style.display = 'none');

  modalDropzone.addEventListener('click', () => videoFileInput.click());
  btnAddMoreVideos.addEventListener('click', () => videoFileInput.click());

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(name => {
    modalDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      modalDropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    modalDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      modalDropzone.classList.remove('dragover');
    });
  });

  modalDropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (files.length > 0) addFilesToQueue(files);
  });

  videoFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) addFilesToQueue(files);
    videoFileInput.value = '';
  });

  function addFilesToQueue(files) {
    files.forEach(file => {
      uploadFilesQueue.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, "")
      });
    });
    renderUploadQueue();
  }

  function renderUploadQueue() {
    queueItemsList.innerHTML = '';
    if (uploadFilesQueue.length === 0) {
      uploadQueueContainer.style.display = 'none';
      uploadSubmitText.textContent = 'Upload Videos';
      return;
    }

    uploadQueueContainer.style.display = 'block';
    queueCount.textContent = uploadFilesQueue.length;
    uploadSubmitText.textContent = `Upload ${uploadFilesQueue.length} Video${uploadFilesQueue.length === 1 ? '' : 's'}`;

    uploadFilesQueue.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML = `
        <i class="fa-solid fa-file-video text-gold"></i>
        <input type="text" value="${escapeHtml(item.title)}" placeholder="Video Name" data-idx="${idx}">
        <span style="font-size: 11px; color: var(--text-muted);">${formatBytes(item.file.size)}</span>
        <button type="button" data-idx="${idx}" class="btn-remove-queue" style="background: none; border: none; color: var(--danger); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
      `;

      row.querySelector('input').addEventListener('input', (e) => {
        uploadFilesQueue[idx].title = e.target.value;
      });

      row.querySelector('.btn-remove-queue').addEventListener('click', () => {
        uploadFilesQueue.splice(idx, 1);
        renderUploadQueue();
      });

      queueItemsList.appendChild(row);
    });
  }

  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (uploadFilesQueue.length === 0) {
      showToast('Please select at least one video to upload.', 'error');
      return;
    }
    if (!currentFolder) return;

    uploadProgressWrapper.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    uploadProgressPercent.textContent = '0%';
    uploadProgressText.textContent = 'Uploading videos to folder...';

    const formData = new FormData();
    const titles = uploadFilesQueue.map(item => item.title.trim());

    uploadFilesQueue.forEach(item => {
      formData.append('videos', item.file);
    });
    formData.append('titles', JSON.stringify(titles));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/folders/${currentFolder.id}/upload`, true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        uploadProgressBar.style.width = `${pct}%`;
        uploadProgressPercent.textContent = `${pct}%`;
        if (pct === 100) {
          uploadProgressText.textContent = 'Processing and finalizing...';
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            showToast(`${uploadFilesQueue.length} video(s) added to "${currentFolder.name}"!`, 'success');
            uploadModal.style.display = 'none';
            uploadFilesQueue = [];
            openFolderDetail(currentFolder.id);
          } else {
            showToast(res.error || 'Upload error', 'error');
          }
        } catch (e) {
          showToast('Invalid server response.', 'error');
        }
      } else {
        showToast('Server error during upload.', 'error');
      }
    };

    xhr.onerror = () => showToast('Network error during upload.', 'error');
    xhr.send(formData);
  });

  // Delete Video
  async function deleteVideo(vid) {
    if (!confirm(`Delete video "${vid.title}" from this folder?`)) return;
    try {
      const res = await fetch(`/api/videos/${vid.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Video removed.', 'info');
        openFolderDetail(currentFolder.id);
      } else {
        showToast(data.error || 'Failed to delete video', 'error');
      }
    } catch (e) {
      showToast('Error deleting video', 'error');
    }
  }

  // ========================================================
  // 6. Rename Handler (Folder or Video)
  // ========================================================
  function openRenameModal(type, item) {
    renameTarget = { type, item };
    renameModalHeader.innerHTML = `<i class="fa-solid fa-pen text-gold"></i> Rename ${type === 'folder' ? 'Folder' : 'Video'}`;
    renameLabel.textContent = `New ${type === 'folder' ? 'Folder' : 'Video'} Name *`;
    renameInputTitle.value = item.name || item.title || '';

    if (type === 'folder') {
      renameDescGroup.style.display = 'block';
      renameInputDesc.value = item.description || '';
    } else {
      renameDescGroup.style.display = 'none';
    }

    renameModal.style.display = 'flex';
    setTimeout(() => {
      renameInputTitle.focus();
      renameInputTitle.select();
    }, 100);
  }

  closeRenameModal.addEventListener('click', () => renameModal.style.display = 'none');
  cancelRename.addEventListener('click', () => renameModal.style.display = 'none');

  renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!renameTarget) return;

    const newTitle = renameInputTitle.value.trim();
    if (!newTitle) return;

    if (renameTarget.type === 'folder') {
      const newDesc = renameInputDesc.value.trim();
      try {
        const res = await fetch(`/api/folders/${renameTarget.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newTitle, description: newDesc })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Folder updated!', 'success');
          renameModal.style.display = 'none';
          if (currentFolder && currentFolder.id === renameTarget.item.id) {
            openFolderDetail(currentFolder.id);
          } else {
            loadFolders();
          }
        }
      } catch (err) {
        showToast('Error renaming folder', 'error');
      }
    } else {
      // Rename video
      try {
        const res = await fetch(`/api/videos/${renameTarget.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Video renamed!', 'success');
          renameModal.style.display = 'none';
          if (currentFolder) {
            openFolderDetail(currentFolder.id);
          }
        }
      } catch (err) {
        showToast('Error renaming video', 'error');
      }
    }
  });

  // ========================================================
  // 7. QR Code Modal & Downloads (PNG, SVG, Flyer)
  // ========================================================
  function openFolderQrModal(folder) {
    folderQrModalTitle.innerHTML = `<i class="fa-solid fa-qrcode text-gold"></i> QR Code: ${escapeHtml(folder.name)}`;
    modalQrImg.src = folder.qrCodePath;
    modalQrUrlText.textContent = folder.qrUrl;

    modalCopyQrLink.onclick = () => {
      navigator.clipboard.writeText(folder.qrUrl).then(() => showToast('Folder QR Link copied!', 'success'));
    };

    modalDownloadQrPng.onclick = () => downloadQrImage(folder, 'png');
    modalPrintQrStandee.onclick = () => openPrintFlyerModal(folder);

    folderQrModal.style.display = 'flex';
  }

  closeFolderQrModal.addEventListener('click', () => folderQrModal.style.display = 'none');

  btnDownloadFolderPng.addEventListener('click', () => {
    if (currentFolder) downloadQrImage(currentFolder, 'png');
  });

  btnDownloadFolderSvg.addEventListener('click', () => {
    if (currentFolder) downloadQrImage(currentFolder, 'svg');
  });

  function downloadQrImage(folder, format = 'png') {
    const qrUrl = `/api/qr?text=${encodeURIComponent(folder.qrUrl)}&dark=d4af37&width=800&format=${format}`;
    const filename = `taniq-${sanitizeFilename(folder.name)}-qr.${format}`;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Folder QR (${format.toUpperCase()}) downloaded!`, 'success');
  }

  // Printable Flyer
  btnPrintFolderFlyer.addEventListener('click', () => {
    if (currentFolder) openPrintFlyerModal(currentFolder);
  });

  function openPrintFlyerModal(folder) {
    flyerFolderTitle.textContent = folder.name;
    flyerQrImage.src = `/api/qr?text=${encodeURIComponent(folder.qrUrl)}&dark=12151c&width=400`;
    flyerModal.style.display = 'flex';
  }

  closeFlyerModal.addEventListener('click', () => flyerModal.style.display = 'none');
  cancelFlyerBtn.addEventListener('click', () => flyerModal.style.display = 'none');
  doPrintFlyerBtn.addEventListener('click', () => window.print());

  // ========================================================
  // Helpers
  // ========================================================
  function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatDate(iso) {
    if (!iso) return 'Today';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sanitizeFilename(name) {
    return (name || 'folder').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }

  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // Initialize
  loadNetworkInfo();
  loadFolders();
});
