/**
 * TaniQ - Customer Video Showcase Logic
 * Strict Isolation: Plays ONLY the scanned folder's videos.
 * When video/playlist ends, gracefully closes the website.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const viewerFolderName = document.getElementById('viewerFolderName');
  const viewerTrackBadge = document.getElementById('viewerTrackBadge');
  const trackBadgeText = document.getElementById('trackBadgeText');
  const btnCloseViewerTop = document.getElementById('btnCloseViewerTop');

  const taniqVideoPlayer = document.getElementById('taniqVideoPlayer');
  const videoSpinner = document.getElementById('videoSpinner');
  const giantPlayBtn = document.getElementById('giantPlayBtn');

  const currentVideoTitle = document.getElementById('currentVideoTitle');
  const playlistNavBtns = document.getElementById('playlistNavBtns');
  const btnPrevVideo = document.getElementById('btnPrevVideo');
  const btnNextVideo = document.getElementById('btnNextVideo');
  const folderPlaylistChips = document.getElementById('folderPlaylistChips');

  const outroOverlay = document.getElementById('outroOverlay');
  const closeCountdownNum = document.getElementById('closeCountdownNum');
  const btnCloseWindowBtn = document.getElementById('btnCloseWindowBtn');
  const btnReplayBtn = document.getElementById('btnReplayBtn');

  // State
  let folderData = null;
  let videoList = [];
  let currentIndex = 0;
  let countdownTimer = null;

  // 1. Parse URL Parameter (?folder=... or ?f=...)
  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('folder') || urlParams.get('f') || urlParams.get('batch');
  const singleVideoId = urlParams.get('id');

  // Load Folder Videos
  async function loadShowcase() {
    try {
      videoSpinner.style.display = 'flex';

      let targetUrl = '';
      if (folderId) {
        targetUrl = `/api/folders/${folderId}/watch`;
      } else if (singleVideoId) {
        // Fallback for single video scan
        targetUrl = `/api/videos/${singleVideoId}`;
      } else {
        // Default to first available folder
        const fRes = await fetch('/api/folders');
        const fData = await fRes.json();
        if (fData.folders && fData.folders.length > 0) {
          targetUrl = `/api/folders/${fData.folders[0].id}/watch`;
        } else {
          showErrorState('No videos or folder found.');
          return;
        }
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error('Showcase not found or has been removed.');
      }

      const data = await res.json();
      videoSpinner.style.display = 'none';

      if (data.folder && data.videos) {
        folderData = data.folder;
        videoList = data.videos;
      } else if (data.video) {
        folderData = { name: 'Exclusive Showcase' };
        videoList = [data.video];
      }

      if (!videoList || videoList.length === 0) {
        showErrorState('This showcase currently has no videos.');
        return;
      }

      // Initialize Player with Video #1 (First video in folder)
      initPlayer();

    } catch (err) {
      videoSpinner.style.display = 'none';
      showErrorState(err.message || 'Unable to load video showcase.');
    }
  }

  function initPlayer() {
    viewerFolderName.textContent = folderData.name || 'TaniQ Collection';
    document.title = `TaniQ - ${folderData.name || 'Video Showcase'}`;

    if (videoList.length > 1) {
      viewerTrackBadge.style.display = 'flex';
      playlistNavBtns.style.display = 'flex';
      folderPlaylistChips.style.display = 'flex';
      renderPlaylistChips();
    } else {
      viewerTrackBadge.style.display = 'none';
      playlistNavBtns.style.display = 'none';
      folderPlaylistChips.style.display = 'none';
    }

    playVideoAtIndex(0);
  }

  function renderPlaylistChips() {
    folderPlaylistChips.innerHTML = '';
    videoList.forEach((v, idx) => {
      const chip = document.createElement('div');
      chip.className = `playlist-chip ${idx === currentIndex ? 'active' : ''}`;
      chip.innerHTML = `
        <span class="chip-num">${idx + 1}</span>
        <span>${escapeHtml(v.title)}</span>
      `;
      chip.addEventListener('click', () => {
        playVideoAtIndex(idx);
      });
      folderPlaylistChips.appendChild(chip);
    });
  }

  function playVideoAtIndex(idx) {
    if (idx < 0 || idx >= videoList.length) return;
    currentIndex = idx;
    const vid = videoList[currentIndex];

    currentVideoTitle.textContent = vid.title || `Video ${currentIndex + 1}`;
    trackBadgeText.textContent = `Video ${currentIndex + 1} of ${videoList.length}`;

    // Update Nav buttons
    btnPrevVideo.disabled = currentIndex === 0;
    btnNextVideo.disabled = currentIndex === videoList.length - 1;

    // Update Chips
    const chips = folderPlaylistChips.querySelectorAll('.playlist-chip');
    chips.forEach((c, i) => {
      c.classList.toggle('active', i === currentIndex);
    });

    // Stream source
    const streamUrl = vid.streamUrl || `/api/stream/${vid.id}`;
    taniqVideoPlayer.src = streamUrl;
    taniqVideoPlayer.load();

    // Attempt autoplay
    const playPromise = taniqVideoPlayer.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          giantPlayBtn.style.display = 'none';
          videoSpinner.style.display = 'none';
        })
        .catch(() => {
          // Autoplay restricted on mobile devices without user gesture
          giantPlayBtn.style.display = 'flex';
          videoSpinner.style.display = 'none';
        });
    }
  }

  // Giant Play Button click
  giantPlayBtn.addEventListener('click', () => {
    giantPlayBtn.style.display = 'none';
    videoSpinner.style.display = 'flex';
    taniqVideoPlayer.play().catch(() => {
      videoSpinner.style.display = 'none';
      giantPlayBtn.style.display = 'flex';
    });
  });

  taniqVideoPlayer.addEventListener('play', () => {
    giantPlayBtn.style.display = 'none';
  });

  taniqVideoPlayer.addEventListener('loadeddata', () => {
    videoSpinner.style.display = 'none';
  });

  taniqVideoPlayer.addEventListener('canplay', () => {
    videoSpinner.style.display = 'none';
  });

  taniqVideoPlayer.addEventListener('playing', () => {
    videoSpinner.style.display = 'none';
    giantPlayBtn.style.display = 'none';
  });

  taniqVideoPlayer.addEventListener('waiting', () => {
    if (!taniqVideoPlayer.paused) {
      videoSpinner.style.display = 'flex';
    }
  });

  // Prev / Next Buttons
  btnPrevVideo.addEventListener('click', () => {
    if (currentIndex > 0) playVideoAtIndex(currentIndex - 1);
  });

  btnNextVideo.addEventListener('click', () => {
    if (currentIndex < videoList.length - 1) playVideoAtIndex(currentIndex + 1);
  });

  // ========================================================
  // VIDEO ENDED HANDLER: Auto-play next or Close Website!
  // Requirement: "khatam hone ke bad website close ho jaye"
  // ========================================================
  taniqVideoPlayer.addEventListener('ended', () => {
    if (currentIndex < videoList.length - 1) {
      // Move to next video in sequence
      playVideoAtIndex(currentIndex + 1);
    } else {
      // All videos in this folder finished!
      showOutroAndClose();
    }
  });

  function showOutroAndClose() {
    outroOverlay.style.display = 'flex';
    let secondsLeft = 5;
    closeCountdownNum.textContent = secondsLeft;

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        closeCountdownNum.textContent = secondsLeft;
      } else {
        clearInterval(countdownTimer);
        closeCountdownNum.textContent = '0';
        attemptCloseWindow();
      }
    }, 1000);
  }

  function attemptCloseWindow() {
    // 1. Try script window.close
    window.close();

    // 2. Try history.back() for mobile in-app browsers
    try {
      if (window.history.length > 1) {
        window.history.back();
      }
    } catch (e) {}

    // 3. For mobile browsers where script close is restricted without direct tap
    const note = document.querySelector('.outro-note');
    if (note) {
      note.innerHTML = '<strong style="color: var(--gold-light);">Session Complete!</strong><br>Aap is tab ko band kar sakte hain. Thank you!';
    }
  }

  // Interactive Close Buttons
  btnCloseWindowBtn.addEventListener('click', () => {
    attemptCloseWindow();
  });

  btnCloseViewerTop.addEventListener('click', () => {
    attemptCloseWindow();
  });

  // Replay from beginning button
  btnReplayBtn.addEventListener('click', () => {
    if (countdownTimer) clearInterval(countdownTimer);
    outroOverlay.style.display = 'none';
    playVideoAtIndex(0);
  });

  function showErrorState(msg) {
    document.querySelector('.cinema-stage').innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
        <h2 style="color: #fff; font-size: 22px; margin-bottom: 8px;">Showcase Unavailable</h2>
        <p style="font-size: 14px; max-width: 400px; margin: 0 auto 20px;">${escapeHtml(msg)}</p>
        <button class="btn-nav-step" onclick="window.close()" style="margin: 0 auto;">Close Window</button>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }

  // Initialize Showcase
  loadShowcase();
});
