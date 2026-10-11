// ===================================================
// AGOLA POLYMER - INQUIRY & REMINDER DESK ENGINE
// Pure, Minimalist, Black & White, English
// With Dedicated Party Folder & Talk History Archive
// ===================================================

const DB_KEY = 'agola_inquiries_store';

// Preload official Agola Polymer logos for instant crystal-clear quotation generation
const agolaWhiteLogoImg = new Image();
agolaWhiteLogoImg.src = 'logo-white.png';

const agolaBlackLogoImg = new Image();
agolaBlackLogoImg.src = 'logo-black.png';

let inquiries = [];
let searchQuery = '';
let currentTab = 'all'; // 'all', 'pending', 'due', 'completed'
let alertedInquiryIds = new Set(); // Prevent alert spamming in the same session
let activeFolderPartyId = null;

// Load inquiries from LocalStorage with automatic schema migration
function loadInquiries() {
  const data = localStorage.getItem(DB_KEY);
  if (data) {
    try {
      inquiries = JSON.parse(data);
      // Ensure all inquiries have a history array and status/micron fields
      inquiries.forEach(item => {
        if (!item.status) item.status = item.completed ? 'completed' : 'new';
        if (!item.micron) item.micron = '';
        if (!Array.isArray(item.history)) {
          item.history = [];
          if (item.discussionNotes) {
            item.history.push({
              id: "talk_init_" + Date.now(),
              timestamp: item.createdAt || new Date().toISOString(),
              talkText: item.discussionNotes
            });
          }
        }
      });
    } catch (e) {
      console.error("Error reading saved data", e);
      inquiries = [];
    }
  } else {
    inquiries = [];
  }

  // Purge any example / sample inquiries (Dhruv, Navrang, or demo IDs)
  if (Array.isArray(inquiries)) {
    const prevCount = inquiries.length;
    inquiries = inquiries.filter(item =>
      item &&
      item.id !== "inq_dhruv_101" &&
      item.id !== "inq_navrang_102" &&
      !(item.partyName === "Dhruv" && item.companyName === "Dhruv Polymers & Packaging") &&
      !(item.partyName === "Vijay Shah" && item.companyName === "Navrang Agro Care")
    );
    if (inquiries.length !== prevCount) {
      localStorage.setItem(DB_KEY, JSON.stringify(inquiries));
    }
  } else {
    inquiries = [];
  }
}

// Save inquiries to LocalStorage & optional Cloud Sync
function saveInquiries() {
  localStorage.setItem(DB_KEY, JSON.stringify(inquiries));
  updateCountsAndBanner();
  renderInquiries();
  if (activeFolderPartyId) {
    renderPartyFolder(activeFolderPartyId);
  }
  // If cloud sync active, trigger background cloud update
  syncToCloudSilent();
}

// Gentle audio chime for reminders
function playGentleChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (err) {
    // Audio handled silently
  }
}

// Browser desktop push notification
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function triggerDesktopNotification(partyName, phone, notes) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🔔 AGOLA POLYMER: Reminder Due!", {
      body: `Time to follow up with ${partyName} (${phone}).\n${notes || ''}`,
      icon: "logo-black.png"
    });
  }
}

// Form Submission (Create or Update from top form)
function handleFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('editEntryId').value;
  const partyName = document.getElementById('partyName').value.trim();
  const companyName = document.getElementById('companyName').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const productMicron = (document.getElementById('productMicron') && document.getElementById('productMicron').value.trim()) || '';
  const cityName = document.getElementById('cityName').value.trim();
  const contactNo = document.getElementById('contactNo').value.trim();
  const inquiryStatus = (document.getElementById('inquiryStatus') && document.getElementById('inquiryStatus').value) || 'new';
  const discussionNotes = document.getElementById('discussionNotes').value.trim();
  const reminderDateTime = document.getElementById('reminderDateTime').value;

  if (editId) {
    // Update existing
    const item = inquiries.find(i => i.id === editId);
    if (item) {
      item.partyName = partyName;
      item.companyName = companyName;
      item.productName = productName;
      item.micron = productMicron;
      item.cityName = cityName;
      item.contactNo = contactNo;
      item.status = inquiryStatus;
      item.reminderDateTime = reminderDateTime;
      item.completed = (inquiryStatus === 'completed');

      // If discussion notes changed, append to history
      if (discussionNotes && discussionNotes !== item.discussionNotes) {
        item.discussionNotes = discussionNotes;
        if (!Array.isArray(item.history)) item.history = [];
        item.history.unshift({
          id: "talk_" + Date.now(),
          timestamp: new Date().toISOString(),
          talkText: discussionNotes
        });
      }
    }
  } else {
    // Add new Party
    const newEntry = {
      id: "inq_" + Date.now(),
      partyName,
      companyName,
      productName,
      micron: productMicron,
      cityName,
      contactNo,
      status: inquiryStatus,
      discussionNotes,
      reminderDateTime,
      completed: (inquiryStatus === 'completed'),
      createdAt: new Date().toISOString(),
      history: discussionNotes ? [
        {
          id: "talk_" + Date.now(),
          timestamp: new Date().toISOString(),
          talkText: discussionNotes
        }
      ] : []
    };
    inquiries.unshift(newEntry);
  }

  saveInquiries();
  resetForm();
  playGentleChime();
}

// Reset form back to New Entry mode
function resetForm() {
  document.getElementById('inquiryForm').reset();
  document.getElementById('editEntryId').value = '';
  document.getElementById('partyName').value = '';
  document.getElementById('companyName').value = '';
  document.getElementById('productName').value = '';
  if (document.getElementById('productMicron')) document.getElementById('productMicron').value = '';
  if (document.getElementById('inquiryStatus')) document.getElementById('inquiryStatus').value = 'new';
  document.getElementById('cityName').value = '';
  document.getElementById('contactNo').value = '';
  document.getElementById('discussionNotes').value = '';
  document.getElementById('reminderDateTime').value = '';
  document.getElementById('formModeTitle').innerText = 'NEW PARTY INQUIRY';
  document.getElementById('submitBtn').innerText = '+ SAVE INQUIRY';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

// Load entry into form for editing
function editEntry(id) {
  const item = inquiries.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editEntryId').value = item.id;
  document.getElementById('partyName').value = item.partyName || '';
  document.getElementById('companyName').value = item.companyName || '';
  document.getElementById('productName').value = item.productName || '';
  if (document.getElementById('productMicron')) document.getElementById('productMicron').value = item.micron || '';
  if (document.getElementById('inquiryStatus')) document.getElementById('inquiryStatus').value = item.status || (item.completed ? 'completed' : 'new');
  document.getElementById('cityName').value = item.cityName || '';
  document.getElementById('contactNo').value = item.contactNo || '';
  document.getElementById('discussionNotes').value = item.discussionNotes || '';
  document.getElementById('reminderDateTime').value = item.reminderDateTime || '';

  document.getElementById('formModeTitle').innerText = 'EDIT INQUIRY';
  document.getElementById('submitBtn').innerText = 'UPDATE INQUIRY';
  document.getElementById('cancelEditBtn').style.display = 'inline';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete entire inquiry
function deleteEntry(id) {
  const item = inquiries.find(i => i.id === id);
  const name = item ? item.partyName : 'this party';
  if (confirm(`Are you sure you want to delete ${name}'s entire inquiry and all conversation history?`)) {
    inquiries = inquiries.filter(i => i.id !== id);
    if (activeFolderPartyId === id) closePartyFolder();
    saveInquiries();
  }
}

// Toggle reminder complete
function toggleCompleted(id) {
  const item = inquiries.find(i => i.id === id);
  if (item) {
    item.completed = !item.completed;
    saveInquiries();
  }
}

// Quick Snooze +1 Hour
function snoozeOneHour(id) {
  const item = inquiries.find(i => i.id === id);
  if (item) {
    const nextDate = new Date(Date.now() + 3600000);
    item.reminderDateTime = nextDate.toISOString().slice(0, 16);
    item.completed = false;
    saveInquiries();
    alert(`Reminder for ${item.partyName} snoozed by 1 hour.`);
  }
}

// Quick Snooze 1 Day (Tomorrow same time)
function snoozeOneDay(id) {
  const item = inquiries.find(i => i.id === id);
  if (item) {
    const nextDate = new Date(Date.now() + 86400000);
    item.reminderDateTime = nextDate.toISOString().slice(0, 16);
    item.completed = false;
    saveInquiries();
    alert(`Reminder for ${item.partyName} rescheduled to tomorrow.`);
  }
}

// Call party
function callParty(phone) {
  window.location.href = `tel:${phone}`;
}

// Open WhatsApp
function openWhatsApp(phone, partyName, product) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const message = `Hello ${partyName || ''},\nGreetings from AGOLA POLYMER.\nRegarding your inquiry for ${product || 'our products'}, please let us know how we can assist you.\nThank you!`;
  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Search input handler
function handleSearch(val) {
  searchQuery = val.toLowerCase().trim();
  renderInquiries();
}

// Filter Tab Switch
function filterByTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));

  if (tab === 'all' && document.getElementById('tabAll')) document.getElementById('tabAll').classList.add('active');
  if (tab === 'pending' && document.getElementById('tabPending')) document.getElementById('tabPending').classList.add('active');
  if (tab === 'sample' && document.getElementById('tabSample')) document.getElementById('tabSample').classList.add('active');
  if (tab === 'order' && document.getElementById('tabOrderWon')) document.getElementById('tabOrderWon').classList.add('active');
  if (tab === 'completed' && document.getElementById('tabCompleted')) document.getElementById('tabCompleted').classList.add('active');

  const titles = {
    all: "ALL INQUIRIES",
    pending: "🔔 PENDING FOLLOW-UPS",
    sample: "📦 SAMPLES SENT (IN PROGRESS)",
    order: "🎉 CONFIRMED ORDERS",
    completed: "✓ COMPLETED / CLOSED"
  };
  const titleEl = document.getElementById('currentSectionTitle');
  if (titleEl) titleEl.innerText = titles[tab] || "INQUIRIES LIST";

  renderInquiries();
  const entriesEl = document.getElementById('entriesSection');
  if (entriesEl) entriesEl.scrollIntoView({ behavior: 'smooth' });
}

// Update Party Status from Card Dropdown
function updatePartyStatus(id, newStatus) {
  const item = inquiries.find(i => i.id === id);
  if (!item) return;

  item.status = newStatus;
  item.completed = (newStatus === 'completed');

  const statusLabels = {
    new: 'New Inquiry',
    sample: 'Sample Sent',
    quoted: 'Quotation Sent',
    order: 'Order Confirmed',
    completed: 'Completed / Closed'
  };

  if (!Array.isArray(item.history)) item.history = [];
  item.history.unshift({
    id: "talk_stat_" + Date.now(),
    timestamp: new Date().toISOString(),
    talkText: `📌 Pipeline Status updated to: ${statusLabels[newStatus] || newStatus}`
  });

  saveInquiries();
}

// Format Date & Time cleanly
// Format Date & Time cleanly with Relative Countdown (e.g. In 2 Days)
function formatDisplayDateTime(datetimeStr) {
  if (!datetimeStr) return "No Reminder Set";
  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) return datetimeStr;

  const now = new Date();
  const formatted = d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Calculate day difference
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfRem = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfRem - startOfToday) / (1000 * 60 * 60 * 24));

  let relativeBadge = "";
  if (d <= now) {
    relativeBadge = "(Due Now)";
  } else if (diffDays === 0) {
    relativeBadge = "(Today)";
  } else if (diffDays === 1) {
    relativeBadge = "(Tomorrow)";
  } else if (diffDays > 1) {
    relativeBadge = `(In ${diffDays} Days)`;
  }

  return `${formatted} ${relativeBadge}`.trim();
}

// Real-time Reminder & Notification Checker
function checkReminders() {
  const now = new Date();
  let dueList = [];

  inquiries.forEach(item => {
    if (item.reminderDateTime && !item.completed) {
      const remDate = new Date(item.reminderDateTime);
      if (remDate <= now) {
        dueList.push(item);
      }
    }
  });

  // Check if any due reminder has not been alerted yet
  dueList.forEach(item => {
    if (!alertedInquiryIds.has(item.id)) {
      alertedInquiryIds.add(item.id);
      playGentleChime();
      triggerDesktopNotification(item.partyName, item.contactNo, item.discussionNotes);
      showFloatingAlert(item);
    }
  });

  updateCountsAndBanner();
}

// Update Top Pill, Banner, and Live Counters
function updateCountsAndBanner() {
  const now = new Date();

  const total = inquiries.length;
  const pending = inquiries.filter(i => !i.completed).length;
  const sampleCount = inquiries.filter(i => i.status === 'sample').length;
  const orderCount = inquiries.filter(i => i.status === 'order').length;
  const completed = inquiries.filter(i => i.completed || i.status === 'completed').length;
  const due = inquiries.filter(i => {
    if (i.completed || !i.reminderDateTime) return false;
    return new Date(i.reminderDateTime) <= now;
  }).length;

  // Update Badges
  if (document.getElementById('topPendingCount')) document.getElementById('topPendingCount').innerText = pending;
  if (document.getElementById('countAll')) document.getElementById('countAll').innerText = total;
  if (document.getElementById('countPending')) document.getElementById('countPending').innerText = pending;
  if (document.getElementById('countSample')) document.getElementById('countSample').innerText = sampleCount;
  if (document.getElementById('countOrderWon')) document.getElementById('countOrderWon').innerText = orderCount;
  if (document.getElementById('countCompleted')) document.getElementById('countCompleted').innerText = completed;

  // Banner
  const banner = document.getElementById('dueBanner');
  const bannerMsg = document.getElementById('dueBannerMessage');

  if (banner && bannerMsg) {
    if (due > 0) {
      banner.style.display = 'flex';
      bannerMsg.innerHTML = `<strong>${due} Inquiry Reminder(s) Due Right Now!</strong> Check and follow up immediately.`;
    } else if (pending > 0) {
      banner.style.display = 'flex';
      bannerMsg.innerHTML = `<strong>${pending} Pending Follow-up(s)</strong> waiting in your desk.`;
    } else {
      banner.style.display = 'none';
    }
  }
}

// Floating Notification Modal
function showFloatingAlert(item) {
  const modal = document.getElementById('floatingAlertModal');
  document.getElementById('floatingAlertPartyName').innerText = `${item.partyName} (📞 ${item.contactNo})`;
  document.getElementById('floatingAlertNotes').innerText = item.discussionNotes || "Reminder time reached for discussion!";

  document.getElementById('floatingAlertCallBtn').onclick = () => callParty(item.contactNo);
  document.getElementById('floatingAlertWaBtn').onclick = () => openWhatsApp(item.contactNo, item.partyName, item.productName);
  document.getElementById('floatingAlertSnoozeBtn').onclick = () => {
    snoozeOneHour(item.id);
    closeFloatingAlert();
  };
  document.getElementById('floatingAlertDoneBtn').onclick = () => {
    toggleCompleted(item.id);
    closeFloatingAlert();
  };

  modal.classList.add('show');
}

function closeFloatingAlert() {
  document.getElementById('floatingAlertModal').classList.remove('show');
}

// ===================================================
// DEDICATED PARTY FOLDER & HISTORY ENGINE
// ===================================================

// Open Party Folder Modal
function openPartyFolder(id) {
  activeFolderPartyId = id;
  const item = inquiries.find(i => i.id === id);
  if (!item) return;

  renderPartyFolder(id);
  document.getElementById('partyFolderModal').classList.add('show');
}

// Close Party Folder Modal
function closePartyFolder() {
  activeFolderPartyId = null;
  document.getElementById('partyFolderModal').classList.remove('show');
}

// Render the contents inside Party Folder Modal
function renderPartyFolder(id) {
  const item = inquiries.find(i => i.id === id);
  if (!item) return;

  const totalTalks = (item.history && item.history.length) || 0;

  document.getElementById('folderActivePartyId').value = item.id;
  document.getElementById('folderPartyName').innerText = `${item.partyName}'s Folder`;
  document.getElementById('folderPartyMeta').innerText = `${item.companyName ? '🏢 ' + item.companyName + ' • ' : ''}📞 ${item.contactNo || '-'} • 📍 ${item.cityName || '-'} • 📦 ${item.productName || '-'} • 📜 TOTAL TALKS: ${totalTalks}`;

  // Call & WA buttons
  document.getElementById('folderCallBtn').onclick = () => callParty(item.contactNo);
  document.getElementById('folderWaBtn').onclick = () => openWhatsApp(item.contactNo, item.partyName, item.productName);

  // Next reminder field inside folder
  document.getElementById('folderNewReminderDateTime').value = item.reminderDateTime || '';

  // Render Timeline
  const timelineEl = document.getElementById('folderTimelineContainer');

  if (!item.history || item.history.length === 0) {
    timelineEl.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No previous talks logged yet. Use the form above to record your first conversation with ${escapeHTML(item.partyName)}.
      </div>
    `;
    return;
  }

  // Render history entries (newest on top)
  timelineEl.innerHTML = item.history.map((h, idx) => {
    const isLatest = idx === 0;
    return `
      <div class="timeline-entry ${isLatest ? 'is-latest' : ''}">
        <div class="timeline-bullet"></div>
        <div class="timeline-card ${isLatest ? 'is-latest-card' : ''}">
          <div class="timeline-card-header">
            <span class="timeline-time-badge">
              🗓️ ${formatDisplayDateTime(h.timestamp)}
            </span>
            ${isLatest ? '<span class="timeline-latest-tag">LATEST LIVE TALK</span>' : ''}
          </div>
          <div class="timeline-talk-text">${escapeHTML(h.talkText)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Add new live talk to party folder
function handleAddNewTalkToFolder(e) {
  e.preventDefault();
  if (!activeFolderPartyId) return;

  const item = inquiries.find(i => i.id === activeFolderPartyId);
  if (!item) return;

  const newTalkText = document.getElementById('folderNewTalkText').value.trim();
  const newReminderDateTime = document.getElementById('folderNewReminderDateTime').value;

  if (!newTalkText) {
    alert("Please enter discussion notes for this conversation.");
    return;
  }

  if (!Array.isArray(item.history)) item.history = [];

  // Add new talk at the beginning of history (newest first)
  const newLog = {
    id: "talk_" + Date.now(),
    timestamp: new Date().toISOString(),
    talkText: newTalkText
  };
  item.history.unshift(newLog);

  // Update party current summary notes
  item.discussionNotes = newTalkText;

  // Update reminder if provided
  if (newReminderDateTime) {
    item.reminderDateTime = newReminderDateTime;
    item.completed = false; // Reset completed status if a new reminder is scheduled
  }

  saveInquiries();

  // Reset input
  document.getElementById('folderNewTalkText').value = '';
  playGentleChime();
}

// Render list of inquiries
function renderInquiries() {
  const container = document.getElementById('inquiriesList');
  const now = new Date();

  // Filter list by Tab and Search
  const filtered = inquiries.filter(item => {
    // Tab filter
    if (currentTab === 'pending' && item.completed) return false;
    if (currentTab === 'sample' && item.status !== 'sample') return false;
    if (currentTab === 'order' && item.status !== 'order') return false;
    if (currentTab === 'completed' && !item.completed && item.status !== 'completed') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery;
      const match = (
        (item.partyName && item.partyName.toLowerCase().includes(q)) ||
        (item.companyName && item.companyName.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.micron && item.micron.toLowerCase().includes(q)) ||
        (item.cityName && item.cityName.toLowerCase().includes(q)) ||
        (item.contactNo && item.contactNo.includes(q)) ||
        (item.discussionNotes && item.discussionNotes.toLowerCase().includes(q)) ||
        (item.history && item.history.some(h => h.talkText && h.talkText.toLowerCase().includes(q)))
      );
      if (!match) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    const isTotallyEmpty = inquiries.length === 0;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">${isTotallyEmpty ? 'NO INQUIRIES YET' : 'NO INQUIRIES IN THIS SECTION'}</div>
        <p style="margin-top: 6px;">${isTotallyEmpty ? 'Fill in the form above to add your first party inquiry.' : 'Try switching filter tabs or check your search term.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    let reminderStatusClass = '';
    let reminderText = formatDisplayDateTime(item.reminderDateTime);
    let isDueNow = false;

    if (item.reminderDateTime) {
      const remDate = new Date(item.reminderDateTime);
      if (item.completed) {
        reminderStatusClass = '';
        reminderText = `✓ Completed`;
      } else if (remDate <= now) {
        reminderStatusClass = 'active-due';
        reminderText = `⚠️ Due Now: ${reminderText}`;
        isDueNow = true;
      } else if (remDate.toDateString() === now.toDateString()) {
        reminderStatusClass = 'active-due';
        reminderText = `⏰ Today: ${reminderText}`;
      }
    }

    const talkCount = (item.history && item.history.length) || 0;

    return `
      <div class="inquiry-card ${isDueNow ? 'is-due-now' : ''} ${item.completed ? 'is-completed' : ''}">
        
        <!-- CARD HEADER -->
        <div class="card-top">
          <div>
            <div class="card-party-name">
              ${escapeHTML(item.partyName)}
            </div>
            ${item.companyName ? `<div class="card-company-name">🏢 ${escapeHTML(item.companyName)}</div>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <select class="status-select-pill ${item.status === 'order' ? 'is-order' : ''}" onchange="updatePartyStatus('${item.id}', this.value)" title="Order pipeline status">
              <option value="new" ${item.status === 'new' ? 'selected' : ''}>🆕 New</option>
              <option value="sample" ${item.status === 'sample' ? 'selected' : ''}>📦 Sample Sent</option>
              <option value="quoted" ${item.status === 'quoted' ? 'selected' : ''}>📄 Quoted</option>
              <option value="order" ${item.status === 'order' ? 'selected' : ''}>🎉 Order Won</option>
              <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>✓ Completed</option>
            </select>
            <span class="reminder-badge ${reminderStatusClass}">
              ${escapeHTML(reminderText)}
            </span>
          </div>
        </div>

        <!-- DETAILS GRID -->
        <div class="card-meta-grid">
          <div class="meta-item">
            <span class="meta-label">PRODUCT</span>
            <span class="meta-value">${escapeHTML(item.productName || '-')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">MICRON / THICKNESS</span>
            <span class="meta-value">${escapeHTML(item.micron || '-')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">CITY</span>
            <span class="meta-value">${escapeHTML(item.cityName || '-')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">CONTACT NO.</span>
            <span class="meta-value">${escapeHTML(item.contactNo || '-')}</span>
          </div>
        </div>

        <!-- LATEST TALK / DISCUSSION -->
        ${item.discussionNotes ? `
          <div class="card-notes-box">
            <div class="notes-header-row">
              <span class="notes-label">DISCUSSION / TALK NOTES</span>
            </div>
            <div class="notes-text">${escapeHTML(item.discussionNotes)}</div>
          </div>
        ` : ''}

        <!-- SINGLE CLEAN ACTION BAR -->
        <div class="card-actions-bar">
          <button class="btn btn-black btn-sm" onclick="openPartyFolder('${item.id}')" title="View party folder & complete talk history">
            📁 FOLDER (${talkCount})
          </button>
          <button class="btn btn-outline btn-sm" onclick="callParty('${escapeHTML(item.contactNo)}')">
            📞 CALL
          </button>
          <button class="btn btn-outline btn-sm" onclick="openWhatsApp('${escapeHTML(item.contactNo)}', '${escapeHTML(item.partyName)}', '${escapeHTML(item.productName)}')">
            💬 WHATSAPP
          </button>
          <button class="btn btn-outline btn-sm" onclick="openQuotationModal('${item.id}')" title="Create and send quotation to party">
            📄 QUOTE
          </button>
          <button class="btn btn-outline btn-sm" onclick="toggleCompleted('${item.id}')">
            ${item.completed ? 'PENDING' : '✓ DONE'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="editEntry('${item.id}')" title="Edit details">
            📝 EDIT
          </button>
          <button class="btn btn-outline btn-sm" onclick="deleteEntry('${item.id}')" title="Delete inquiry">
            ✕ DELETE
          </button>
        </div>

      </div>
    `;
  }).join('');
}

// Safe string escape
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export to CSV
function exportToCSV() {
  if (inquiries.length === 0) {
    alert("No inquiries to export.");
    return;
  }

  let csv = "\uFEFF"; // UTF-8 BOM
  csv += "PARTY NAME,COMPANY NAME,PRODUCT,CITY,CONTACT NO,LATEST DISCUSSION,TOTAL TALKS IN FOLDER,REMINDER DATE & TIME,STATUS,CREATED AT\n";

  inquiries.forEach(i => {
    const talkCount = (i.history && i.history.length) || 0;
    const row = [
      `"${(i.partyName || '').replace(/"/g, '""')}"`,
      `"${(i.companyName || '').replace(/"/g, '""')}"`,
      `"${(i.productName || '').replace(/"/g, '""')}"`,
      `"${(i.cityName || '').replace(/"/g, '""')}"`,
      `"${(i.contactNo || '').replace(/"/g, '""')}"`,
      `"${(i.discussionNotes || '').replace(/"/g, '""')}"`,
      `"${talkCount}"`,
      `"${(i.reminderDateTime || '').replace(/"/g, '""')}"`,
      `"${i.completed ? 'Completed' : 'Pending'}"`,
      `"${(i.createdAt || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Agola_Polymer_Inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ===================================================
// DIRECT QUOTATION SYSTEM
// ===================================================

let activeQuotePartyId = null;
let currentQuotationImageDataUrl = null;
let currentQuotationData = null;

// Open Quotation Modal (with party prefilled or dropdown)
function openQuotationModal(partyId = null) {
  activeQuotePartyId = partyId;
  const selectEl = document.getElementById('quotePartySelect');

  // Populate parties dropdown from inquiries list
  let optionsHtml = `<option value="">-- Select From Added Parties --</option>`;
  inquiries.forEach((item, index) => {
    const isSelected = item.id === partyId ? 'selected' : '';
    optionsHtml += `<option value="${item.id}" ${isSelected}>${escapeHTML(item.partyName)} (${escapeHTML(item.companyName || item.productName || item.cityName || '')}) - 📞 ${escapeHTML(item.contactNo)}</option>`;
  });
  optionsHtml += `<option value="custom">[ + Other / Walk-in Party ]</option>`;
  selectEl.innerHTML = optionsHtml;

  // Prefill if party selected or default to first party
  let targetItem = null;
  if (partyId) {
    targetItem = inquiries.find(i => i.id === partyId);
  } else if (inquiries.length > 0) {
    targetItem = inquiries[0];
    selectEl.value = targetItem.id;
    activeQuotePartyId = targetItem.id;
  }

  if (targetItem) {
    document.getElementById('quotePartyName').value = targetItem.partyName || '';
    document.getElementById('quoteContactNo').value = targetItem.contactNo || '';
    if (document.getElementById('quoteMicron')) document.getElementById('quoteMicron').value = targetItem.micron || '';
  } else {
    document.getElementById('quotePartyName').value = '';
    document.getElementById('quoteContactNo').value = '';
    if (document.getElementById('quoteMicron')) document.getElementById('quoteMicron').value = '';
  }

  // Clear numeric fields / reset
  document.getElementById('quoteWidth').value = '';
  document.getElementById('quoteLength').value = '';
  document.getElementById('quoteGram').value = '';
  document.getElementById('quoteQuantity').value = '';
  if (document.getElementById('quoteUnit')) document.getElementById('quoteUnit').value = 'KG';
  document.getElementById('quoteRate').value = '';
  document.getElementById('quoteGst').value = '₹ 0.00';
  document.getElementById('quoteTotalAmount').value = '₹ 0.00';
  onQuoteUnitChange();

  document.getElementById('quotationModal').classList.add('show');
}

// Open Quotation directly from party folder
function openQuotationFromFolder() {
  if (activeFolderPartyId) {
    const pId = activeFolderPartyId;
    closePartyFolder();
    openQuotationModal(pId);
  }
}

// Close Quotation Modal
function closeQuotationModal() {
  activeQuotePartyId = null;
  document.getElementById('quotationModal').classList.remove('show');
}

// When user changes the Party dropdown in Quotation: Automatic number auto-fill
function onQuotePartySelectChange(selectedId) {
  if (!selectedId || selectedId === 'custom') {
    activeQuotePartyId = null;
    document.getElementById('quotePartyName').value = '';
    document.getElementById('quoteContactNo').value = '';
    if (document.getElementById('quoteMicron')) document.getElementById('quoteMicron').value = '';
    return;
  }
  const item = inquiries.find(i => i.id === selectedId);
  if (item) {
    activeQuotePartyId = item.id;
    document.getElementById('quotePartyName').value = item.partyName || '';
    document.getElementById('quoteContactNo').value = item.contactNo || ''; // Automatic mobile number
    if (document.getElementById('quoteMicron')) document.getElementById('quoteMicron').value = item.micron || '';
  }
}

// When user changes Quotation Unit (KG, TON, PCS, BAGS)
function onQuoteUnitChange() {
  const unitEl = document.getElementById('quoteUnit');
  const unit = unitEl ? unitEl.value : 'KG';
  const labelEl = document.getElementById('quoteRateLabel');
  if (labelEl) labelEl.innerText = `RATE (₹ / ${unit}) :`;
  const rateInput = document.getElementById('quoteRate');
  if (rateInput) rateInput.placeholder = `e.g. 140 per ${unit}`;
  calcQuotationMath();
}

// Calculate Quotation Math (Real-time automatic GST 18% and Total Amount)
function calcQuotationMath() {
  const qty = parseFloat(document.getElementById('quoteQuantity').value) || 0;
  const rate = parseFloat(document.getElementById('quoteRate').value) || 0;

  if (qty > 0 && rate > 0) {
    const subtotal = qty * rate;
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    document.getElementById('quoteGst').value = `₹ ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('quoteTotalAmount').value = `₹ ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    document.getElementById('quoteGst').value = '₹ 0.00';
    document.getElementById('quoteTotalAmount').value = '₹ 0.00';
  }
}

// Helper to collect current quotation data
function getFormDataQuotation() {
  const partyName = document.getElementById('quotePartyName').value.trim();
  const phone = document.getElementById('quoteContactNo').value.trim();
  const width = document.getElementById('quoteWidth').value.trim();
  const length = document.getElementById('quoteLength').value.trim();
  const gram = document.getElementById('quoteGram').value.trim();
  const micron = (document.getElementById('quoteMicron') && document.getElementById('quoteMicron').value.trim()) || '';
  const qty = parseFloat(document.getElementById('quoteQuantity').value) || 0;
  const unit = (document.getElementById('quoteUnit') && document.getElementById('quoteUnit').value) || 'KG';
  const rate = parseFloat(document.getElementById('quoteRate').value) || 0;

  const subtotal = qty * rate;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  // Lookup company name if available
  const partyItem = inquiries.find(i => i.id === activeQuotePartyId || (i.contactNo && phone && i.contactNo.includes(phone)));
  const companyName = partyItem ? (partyItem.companyName || '') : '';
  const cityName = partyItem ? (partyItem.cityName || '') : '';

  const quoteRef = "AG-" + Date.now().toString().slice(-6);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    partyName,
    companyName,
    cityName,
    phone,
    width,
    length,
    gram,
    micron,
    qty,
    unit,
    rate,
    subtotal,
    gst,
    total,
    quoteRef,
    date: dateStr
  };
}

// ===================================================
// OFFICIAL QUOTATION IMAGE GENERATOR (CANVAS -> PNG)
// ===================================================

function generateQuotationPNG(data) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1220;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Luxury Double Borders
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Top Header Banner (Solid Black with white text & logo)
  const bannerH = 175;
  ctx.fillStyle = '#000000';
  ctx.fillRect(36, 36, canvas.width - 72, bannerH);

  // Draw AGOLA POLYMER Official Logo in Header
  const logoWhite = document.getElementById('quoteLogoWhiteEl') || agolaWhiteLogoImg;
  const logoBlack = document.getElementById('appBrandLogo') || agolaBlackLogoImg;
  const logoToDraw = (logoWhite && logoWhite.complete && logoWhite.naturalWidth > 0) ? logoWhite :
                     ((logoBlack && logoBlack.complete && logoBlack.naturalWidth > 0) ? logoBlack : null);

  if (logoToDraw) {
    const logoH = 75;
    const logoW = Math.round(logoH * (logoToDraw.naturalWidth / logoToDraw.naturalHeight));
    const logoX = Math.round((canvas.width - logoW) / 2);
    ctx.drawImage(logoToDraw, logoX, 48, logoW, logoH);
  }

  // Brand Name in Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AGOLA POLYMER', canvas.width / 2, 154);

  ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#D4D4D4';
  ctx.fillText('HIGH QUALITY PLASTIC FILMS, LINER BAGS & PACKAGING SOLUTIONS', canvas.width / 2, 182);

  // Quotation Ribbon
  const ribbonY = 36 + bannerH + 4;
  const ribbonH = 44;
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(36, ribbonY, canvas.width - 72, ribbonH);
  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, ribbonY, canvas.width - 72, ribbonH);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('★ OFFICIAL WHOLESALE QUOTATION ★', canvas.width / 2, ribbonY + 28);

  // Bill To & Quote Info Boxes
  const infoY = ribbonY + ribbonH + 16;
  // Left Box: Bill To
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(50, infoY, 430, 126);
  ctx.strokeStyle = '#E0E0E0';
  ctx.strokeRect(50, infoY, 430, 126);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#737373';
  ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('BILL TO / CLIENT DETAILS:', 65, infoY + 24);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
  ctx.fillText(data.partyName || 'Valued Client', 65, infoY + 52);

  ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#333333';
  if (data.companyName) {
    ctx.fillText('🏢 ' + data.companyName, 65, infoY + 78);
    ctx.fillText('📞 ' + (data.phone || '-') + (data.cityName ? ' • 📍 ' + data.cityName : ''), 65, infoY + 104);
  } else {
    ctx.fillText('📞 Contact: ' + (data.phone || '-'), 65, infoY + 82);
  }

  // Right Box: Quotation Meta
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(520, infoY, 430, 126);
  ctx.strokeStyle = '#E0E0E0';
  ctx.strokeRect(520, infoY, 430, 126);

  ctx.fillStyle = '#737373';
  ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('QUOTATION REFERENCE:', 535, infoY + 24);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillText('#' + data.quoteRef, 535, infoY + 52);

  ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#333333';
  ctx.fillText('📅 Date: ' + data.date, 535, infoY + 78);
  ctx.fillText('⏳ Validity: 7 Days from issue', 535, infoY + 104);

  // Specification Table Header
  const tableY = infoY + 126 + 18;
  ctx.fillStyle = '#000000';
  ctx.fillRect(50, tableY, 900, 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SPECIFICATION / ITEM DESCRIPTION', 70, tableY + 25);
  ctx.textAlign = 'right';
  ctx.fillText('DETAILS / VALUE', 930, tableY + 25);

  // Table Rows
  const rows = [
    { label: 'DIMENSIONS (WIDTH × LENGTH)', val: `${data.width || '-'} × ${data.length || '-'}` },
    { label: 'THICKNESS / MICRON', val: data.micron || 'Standard Micron' },
    { label: 'PER PIECE GRAM', val: data.gram || '-' },
    { label: 'ORDER QUANTITY', val: `${data.qty} ${data.unit}`, bold: true },
    { label: `UNIT RATE (₹ / ${data.unit})`, val: `₹ ${data.rate.toFixed(2)}`, bold: true },
    { label: 'SUBTOTAL (TAXABLE VALUE)', val: `₹ ${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { label: 'GST (18%)', val: `₹ ${data.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
  ];

  let curY = tableY + 40;
  const rowHeight = 44;

  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
    ctx.fillRect(50, curY, 900, rowHeight);
    ctx.strokeStyle = '#EEEEEE';
    ctx.strokeRect(50, curY, 900, rowHeight);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#222222';
    ctx.font = r.bold ? 'bold 14px "Segoe UI", Arial, sans-serif' : '600 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText(r.label, 70, curY + 27);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#000000';
    ctx.font = r.bold ? 'bold 15px "Segoe UI", Arial, sans-serif' : '600 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText(r.val, 930, curY + 27);

    curY += rowHeight;
  });

  // Total Amount Highlight Band (Solid Black with white text)
  curY += 14;
  ctx.fillStyle = '#000000';
  ctx.fillRect(50, curY, 900, 64);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TOTAL AMOUNT (INCL. 18% GST) :', 75, curY + 39);

  ctx.textAlign = 'right';
  ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`₹ ${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 925, curY + 42);

  // Terms & Conditions and Authorized Signatory
  curY += 95;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#444444';
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TERMS & COMMERCIAL CONDITIONS:', 50, curY);

  ctx.font = '11px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText('1. Rates are subject to standard factory wholesale commercial terms.', 50, curY + 22);
  ctx.fillText('2. Dispatch schedule confirmed upon purchase order receipt.', 50, curY + 42);
  ctx.fillText('3. Quotation valid for 7 days from date of issue.', 50, curY + 62);
  ctx.fillText('4. Thank you for choosing AGOLA POLYMER!', 50, curY + 82);

  // Authorized Signatory Box
  const sigX = 730;
  const sigY = curY;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(sigX - 90, sigY, 200, 85);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText('FOR AGOLA POLYMER', sigX + 10, sigY + 28);
  ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('Authorized Signatory', sigX + 10, sigY + 64);

  return canvas.toDataURL('image/png');
}

// Open Quotation Image Preview Modal
function openQuotationImagePreview() {
  const quoteData = getFormDataQuotation();
  if (!quoteData.partyName) {
    alert("Please enter Party Name before generating quotation image.");
    return;
  }
  if (!quoteData.qty || !quoteData.rate) {
    alert("Please enter Quantity and Rate before generating quotation image.");
    return;
  }

  currentQuotationData = quoteData;
  currentQuotationImageDataUrl = generateQuotationPNG(quoteData);

  document.getElementById('quoteGeneratedImg').src = currentQuotationImageDataUrl;
  document.getElementById('quotationImageModal').classList.add('show');
}

function closeQuotationImageModal() {
  document.getElementById('quotationImageModal').classList.remove('show');
}

// Download Generated Quotation Image as PNG
function downloadGeneratedQuotationImage() {
  if (!currentQuotationImageDataUrl) {
    currentQuotationImageDataUrl = generateQuotationPNG(getFormDataQuotation());
  }
  const a = document.createElement('a');
  a.href = currentQuotationImageDataUrl;
  const pName = (currentQuotationData && currentQuotationData.partyName ? currentQuotationData.partyName : 'Party').replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Agola_Quotation_${pName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Share Generated Quotation Image on WhatsApp
async function shareGeneratedQuotationImageWhatsApp() {
  if (!currentQuotationData) currentQuotationData = getFormDataQuotation();
  if (!currentQuotationImageDataUrl) currentQuotationImageDataUrl = generateQuotationPNG(currentQuotationData);

  const cleanPhone = (currentQuotationData.phone || '').replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  // Try Native Share API with image file if supported (mobile browsers)
  if (navigator.canShare) {
    try {
      const res = await fetch(currentQuotationImageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Agola_Quotation_${currentQuotationData.quoteRef}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Agola Polymer Quotation',
          text: `Official Quotation #${currentQuotationData.quoteRef} from AGOLA POLYMER for ${currentQuotationData.partyName}. Total: ₹${currentQuotationData.total.toFixed(2)}`
        });
        return;
      }
    } catch (err) {
      console.log('Native share error, falling back:', err);
    }
  }

  // Fallback: Download image and open WhatsApp with message
  downloadGeneratedQuotationImage();
  alert("Quotation image downloaded! Opening WhatsApp so you can send it to party.");

  const msg = `*OFFICIAL QUOTATION — AGOLA POLYMER*\n` +
    `Party: *${currentQuotationData.partyName}*\n` +
    `Ref: *#${currentQuotationData.quoteRef}*\n` +
    `Quantity: *${currentQuotationData.qty} ${currentQuotationData.unit}*\n` +
    `Rate: *₹${currentQuotationData.rate.toFixed(2)} / ${currentQuotationData.unit}*\n` +
    `*TOTAL AMOUNT:* ₹${currentQuotationData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
    `*Quotation image attached above.*\nThank you! *AGOLA POLYMER*`;

  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Send Quotation on WhatsApp (Full Action)
async function handleSendQuotationWhatsApp(e) {
  e.preventDefault();

  const quoteData = getFormDataQuotation();
  currentQuotationData = quoteData;

  // Format WhatsApp message
  let msg = `*OFFICIAL QUOTATION — AGOLA POLYMER*\n`;
  msg += `--------------------------------------\n`;
  msg += `*Party Name:* ${quoteData.partyName}\n`;
  if (quoteData.companyName) msg += `*Company:* ${quoteData.companyName}\n`;
  msg += `*Date:* ${quoteData.date}\n`;
  msg += `*Quotation Ref:* #${quoteData.quoteRef}\n\n`;
  msg += `*SPECIFICATIONS:*\n`;
  if (quoteData.width) msg += `• *Width:* ${quoteData.width}\n`;
  if (quoteData.length) msg += `• *Length:* ${quoteData.length}\n`;
  if (quoteData.micron) msg += `• *Thickness/Micron:* ${quoteData.micron}\n`;
  if (quoteData.gram) msg += `• *Per Piece Gram:* ${quoteData.gram}\n`;
  msg += `• *Quantity:* ${quoteData.qty} ${quoteData.unit}\n`;
  msg += `• *Rate:* ₹${quoteData.rate.toFixed(2)} / ${quoteData.unit}\n`;
  msg += `--------------------------------------\n`;
  msg += `*Subtotal:* ₹${quoteData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  msg += `*GST (18%):* ₹${quoteData.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  msg += `*TOTAL AMOUNT:* ₹${quoteData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  msg += `--------------------------------------\n`;
  msg += `*Terms & Conditions:*\n`;
  msg += `1. Rates valid for 7 days.\n`;
  msg += `2. Standard factory wholesale dispatch terms apply.\n\n`;
  msg += `Thank you for your business!\n*AGOLA POLYMER*`;

  // Log quotation into party folder history
  const partyItem = inquiries.find(i => i.id === activeQuotePartyId || (i.contactNo && quoteData.phone && i.contactNo.includes(quoteData.phone)));
  if (partyItem) {
    if (!Array.isArray(partyItem.history)) partyItem.history = [];
    partyItem.history.unshift({
      id: "talk_quote_" + Date.now(),
      timestamp: new Date().toISOString(),
      talkText: `📄 Sent Quotation #${quoteData.quoteRef}: ${quoteData.qty} ${quoteData.unit} @ ₹${quoteData.rate}/${quoteData.unit}, GST 18%: ₹${quoteData.gst.toFixed(2)}, Total: ₹${quoteData.total.toFixed(2)}.`
    });
    partyItem.discussionNotes = `Quotation sent: ₹${quoteData.rate}/${quoteData.unit}, Total ₹${quoteData.total.toFixed(2)} (with 18% GST).`;
    partyItem.status = 'quoted';
    saveInquiries();
  }

  // Automatically prompt image download as requested
  currentQuotationImageDataUrl = generateQuotationPNG(quoteData);
  downloadGeneratedQuotationImage();

  // Open WhatsApp
  const cleanPhone = quoteData.phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');

  closeQuotationModal();
  playGentleChime();
}

// Print Quotation Slip
function printQuotationSlip() {
  const quoteData = getFormDataQuotation();

  document.getElementById('printPartyName').innerText = quoteData.partyName || '-';
  document.getElementById('printContactNo').innerText = quoteData.phone || '-';
  document.getElementById('printQuoteDate').innerText = quoteData.date;
  document.getElementById('printQuoteRef').innerText = quoteData.quoteRef;

  document.getElementById('printWidth').innerText = quoteData.width || '-';
  document.getElementById('printLength').innerText = quoteData.length || '-';
  document.getElementById('printGram').innerText = quoteData.gram ? `${quoteData.gram} ${quoteData.micron ? '(' + quoteData.micron + ')' : ''}` : (quoteData.micron || '-');
  document.getElementById('printQuantity').innerText = `${quoteData.qty} ${quoteData.unit}`;
  document.getElementById('printRate').innerText = quoteData.rate ? `₹ ${quoteData.rate.toFixed(2)} / ${quoteData.unit}` : '-';
  document.getElementById('printSubtotal').innerText = `₹ ${quoteData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('printGst').innerText = `₹ ${quoteData.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('printTotal').innerText = `₹ ${quoteData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  window.print();
}

// ===================================================
// DATA BACKUP & RESTORE ENGINE (OPTION 1)
// ===================================================

function backupDataJSON() {
  if (!inquiries || inquiries.length === 0) {
    alert("No inquiries to backup.");
    return;
  }
  const dataStr = JSON.stringify(inquiries, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Agola_Polymer_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerRestoreJSON() {
  const input = document.getElementById('restoreFileInput');
  if (input) input.click();
}

function handleRestoreFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const restored = JSON.parse(evt.target.result);
      if (Array.isArray(restored)) {
        if (confirm(`Found ${restored.length} party inquiries in backup file. Do you want to restore and replace current data?`)) {
          inquiries = restored;
          saveInquiries();
          alert(`Successfully restored ${inquiries.length} party inquiries!`);
        }
      } else {
        alert("Invalid backup file. Expected a list of inquiries.");
      }
    } catch (err) {
      alert("Error reading backup file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ===================================================
// GOOGLE FIREBASE REAL-TIME CLOUD SYNC (OPTION 2)
// ===================================================

const CLOUD_SYNC_KEY = 'agola_firebase_db_url';

function openCloudSyncModal() {
  const savedUrl = localStorage.getItem(CLOUD_SYNC_KEY) || '';
  const input = document.getElementById('firebaseDbUrl');
  if (input) input.value = savedUrl;
  updateCloudSyncStatusText();
  document.getElementById('cloudSyncModal').classList.add('show');
}

function closeCloudSyncModal() {
  document.getElementById('cloudSyncModal').classList.remove('show');
}

function updateCloudSyncStatusText() {
  const savedUrl = localStorage.getItem(CLOUD_SYNC_KEY);
  const statusEl = document.getElementById('cloudSyncStatusText');
  if (statusEl) {
    if (savedUrl) {
      statusEl.innerHTML = `<span style="color:#16a34a; font-weight:700;">● Connected</span>: Syncing with Firebase`;
    } else {
      statusEl.innerHTML = `Local Offline Mode (Data safe in browser)`;
    }
  }
}

async function saveCloudSyncConfig() {
  const input = document.getElementById('firebaseDbUrl');
  let url = input ? input.value.trim() : '';
  if (!url) {
    alert("Please enter your Firebase Realtime Database URL.");
    return;
  }
  if (!url.endsWith('/')) url += '/';

  try {
    const res = await fetch(`${url}agola_crm.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiries)
    });
    if (res.ok) {
      localStorage.setItem(CLOUD_SYNC_KEY, url);
      updateCloudSyncStatusText();
      alert("Cloud Sync connected! Inquiries synced with Google Firebase.");
      closeCloudSyncModal();
    } else {
      alert("Could not connect to Firebase. Please verify database URL and permissions.");
    }
  } catch (err) {
    alert("Network error connecting to Firebase: " + err.message);
  }
}

function disableCloudSync() {
  localStorage.removeItem(CLOUD_SYNC_KEY);
  updateCloudSyncStatusText();
  alert("Cloud Sync disconnected. Switched to local offline mode.");
  closeCloudSyncModal();
}

async function syncToCloudSilent() {
  const url = localStorage.getItem(CLOUD_SYNC_KEY);
  if (!url) return;
  try {
    await fetch(`${url}agola_crm.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiries)
    });
  } catch (e) {
    // Silent background sync
  }
}

async function syncFromCloudOnLoad() {
  const url = localStorage.getItem(CLOUD_SYNC_KEY);
  if (!url) return;
  try {
    const res = await fetch(`${url}agola_crm.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        inquiries = data;
        localStorage.setItem(DB_KEY, JSON.stringify(inquiries));
        updateCountsAndBanner();
        renderInquiries();
      }
    }
  } catch (e) {
    // Silent failover to local data
  }
}

// Auto check reminders every 15 seconds
setInterval(checkReminders, 15000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadInquiries();
  requestNotificationPermission();
  checkReminders();
  syncFromCloudOnLoad();

  // Register Service Worker for Android PWA / Offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration error:', err);
    });
  }
});
