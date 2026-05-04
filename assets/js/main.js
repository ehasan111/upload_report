var allData    = [];
var currentCat = 'all';
var editIndex  = null;
var dropIdx    = null;
var lastDotBtn = null;

/* THEME */
(function() {
  var saved = localStorage.getItem('rh-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();
function toggleTheme() {
  var cur  = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rh-theme', next);
}

/* MOBILE SIDEBAR */
function openSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

/* 12-HOUR TIME FORMAT */
function to12h(timeStr) {
  if (!timeStr || timeStr === '-') return '-';
  if (/am|pm/i.test(timeStr)) return timeStr;
  try {
    var d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      var parts = timeStr.split(', ');
      if (parts.length >= 2) {
        var dp = parts[0].split('/');
        if (dp.length === 3) {
          d = new Date(dp[2] + '-' + dp[1] + '-' + dp[0] + 'T' + parts[1]);
        }
      }
    }
    if (!isNaN(d.getTime())) {
      var date = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      var time = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12: true });
      return date + ', ' + time;
    }
  } catch(e) {}
  return timeStr;
}

/* DATA */
function loadData() {
  fetch('data.json?_=' + Date.now())
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(d) { allData = d; updateBadges(); renderAll(); })
    .catch(function()  { allData = []; updateBadges(); renderAll(); });
}
function updateBadges() {
  var counts = {};
  allData.forEach(function(r) { counts[r.category] = (counts[r.category]||0) + 1; });
  document.getElementById('badge-all').textContent = allData.length;
  ['web','api','mobile','security','performance','ui-ux','misc'].forEach(function(c) {
    var el = document.getElementById('badge-' + c);
    if (el) el.textContent = counts[c] || 0;
  });
}

/* FILTER */
function filterCat(cat) {
  currentCat = cat;
  document.querySelectorAll('.sidebar-item').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('onclick') === "filterCat('" + cat + "')");
  });
  document.querySelectorAll('.filter-tab').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('onclick') === "filterCat('" + cat + "')");
  });
  var titles = { all:'All Reports', web:'Web Reports', api:'API Reports', mobile:'Mobile Reports',
    security:'Security Reports', performance:'Performance Reports', 'ui-ux':'UI/UX Reports', misc:'Misc Reports' };
  document.getElementById('page-title').textContent = titles[cat] || 'Reports';
  closeSidebar();
  renderAll();
}

/* RENDER */
var catColors = { web:'cat-web', api:'cat-api', mobile:'cat-mobile', security:'cat-security', performance:'cat-performance', 'ui-ux':'cat-ui-ux', misc:'cat-misc' };
var catLabels = { web:'WEB', api:'API', mobile:'MOB', security:'SEC', performance:'PERF', 'ui-ux':'UI', misc:'MISC' };
var catBC     = { web:'#63b3ed', api:'#68d391', mobile:'#f6ad55', security:'#f87171', performance:'#a78bfa', 'ui-ux':'#ed8936', misc:'#a0aec0' };

function renderAll() {
  var q = document.getElementById('search-input').value.toLowerCase();
  var filtered = allData.filter(function(r) {
    var mc = currentCat === 'all' || r.category === currentCat;
    var mq = !q || r.name.toLowerCase().includes(q)
                || (r.projectName||'').toLowerCase().includes(q)
                || (r.comment||'').toLowerCase().includes(q);
    return mc && mq;
  });
  document.getElementById('total-count').textContent = filtered.length;
  var container = document.getElementById('reports-container');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg><p>No reports found</p></div>';
    return;
  }
  var groups = {};
  filtered.forEach(function(r) {
    var proj = r.projectName || 'Unassigned';
    if (!groups[proj]) groups[proj] = [];
    var entry = {}; Object.assign(entry, r); entry._idx = allData.indexOf(r);
    groups[proj].push(entry);
  });
  var html = '';
  Object.keys(groups).forEach(function(proj) {
    var reports = groups[proj];
    html += '<div class="project-group">'
      + '<div class="project-heading"><h2>' + esc(proj) + '</h2>'
      + '<span class="count">' + reports.length + ' report' + (reports.length !== 1 ? 's' : '') + '</span></div>'
      + '<div class="project-divider"></div>'
      + '<div class="table-wrap"><table>'
      + '<thead><tr><th>Report</th><th>Category</th><th>Date &amp; Time</th><th>Actions</th></tr></thead>'
      + '<tbody>' + reports.map(renderRow).join('') + '</tbody>'
      + '</table></div></div>';
  });
  container.innerHTML = html;
}

function renderRow(r) {
  var clr = catColors[r.category] || 'cat-misc';
  var lbl = catLabels[r.category] || r.category.toUpperCase().slice(0,4);
  var bc  = catBC[r.category]     || '#a0aec0';
  var cmt = r.comment && r.comment !== '-' ? r.comment : '';
  var t   = to12h(r.time || '-');
  return '<tr>'
    + '<td><div class="report-name"><div class="cat-icon ' + clr + '">' + lbl + '</div>'
    + '<div class="report-info"><div class="r-name">' + esc(r.name) + '</div>'
    + (cmt ? '<div class="r-sub">' + esc(cmt) + '</div>' : '')
    + '</div></div></td>'
    + '<td><span class="cat-badge" style="background:' + bc + '22;color:' + bc + ';">' + esc(r.category) + '</span></td>'
    + '<td><div class="datetime">' + esc(t) + '</div></td>'
    + '<td><div class="actions">'
    + '<a class="btn btn-view" href="reports/' + esc(r.filePath) + '" target="_blank">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View</a>'
    + '<button class="btn btn-copy" onclick="copyLink(this,\'reports/' + esc(r.filePath) + '\')">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>'
    + '<div class="dot-wrap"><div class="dot-btn" onclick="openDrop(event,' + r._idx + ')">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>'
    + '</div></div></div></td></tr>';
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* COPY */
function copyLink(btn, path) {
  var url = location.href.replace(/[^\/]*$/, '') + path;
  navigator.clipboard.writeText(url).then(function() {
    btn.classList.add('copied');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied';
    showToast('Link copied!');
    setTimeout(function() {
      btn.classList.remove('copied');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
    }, 2000);
  });
}

/* DROPDOWN PORTAL */
var globalDrop = document.getElementById('global-dropdown');

function openDrop(e, idx) {
  e.stopPropagation();
  var btn  = e.currentTarget;
  var rect = btn.getBoundingClientRect();
  var dropW = 160, dropH = 90;
  var left = rect.right - dropW;
  if (left < 8) left = rect.left;
  var top = rect.bottom + 6;
  if (top + dropH > window.innerHeight - 8) top = rect.top - dropH - 6;

  if (globalDrop.classList.contains('open') && lastDotBtn === btn) {
    closeDropdown(); return;
  }
  dropIdx    = idx;
  lastDotBtn = btn;
  globalDrop.style.top  = top  + 'px';
  globalDrop.style.left = left + 'px';
  globalDrop.classList.add('open');
}
function closeDropdown() {
  globalDrop.classList.remove('open');
  lastDotBtn = null;
}
document.getElementById('drop-edit').addEventListener('click', function() {
  var i = dropIdx; closeDropdown(); openEdit(i);
});
document.getElementById('drop-remove').addEventListener('click', function() {
  var i = dropIdx; closeDropdown(); removeReport(i);
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dot-btn') && !e.target.closest('#global-dropdown')) closeDropdown();
});
document.addEventListener('scroll', closeDropdown, true);
window.addEventListener('resize', closeDropdown);

/* EDIT MODAL */
function openEdit(idx) {
  editIndex = idx;
  var r = allData[idx];
  document.getElementById('edit-name').value    = r.name || '';
  document.getElementById('edit-project').value = r.projectName || '';
  document.getElementById('edit-comment').value = r.comment !== '-' ? (r.comment||'') : '';
  document.getElementById('edit-docs').value    = r.docs    !== '-' ? (r.docs   ||'') : '';
  document.getElementById('edit-modal').classList.add('open');
}
function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editIndex = null;
}
function saveEdit() {
  if (editIndex === null) return;
  allData[editIndex].name        = document.getElementById('edit-name').value.trim()    || allData[editIndex].name;
  allData[editIndex].projectName = document.getElementById('edit-project').value.trim() || allData[editIndex].projectName;
  allData[editIndex].comment     = document.getElementById('edit-comment').value.trim() || '-';
  allData[editIndex].docs        = document.getElementById('edit-docs').value.trim()    || '-';
  closeModal(); updateBadges(); renderAll(); showToast('Report updated!');
}
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* REMOVE */
function removeReport(idx) {
  if (!confirm('Remove this report from the dashboard?')) return;
  allData.splice(idx, 1);
  updateBadges(); renderAll(); showToast('Report removed.');
}

/* TOAST */
var toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2600);
}

loadData();
