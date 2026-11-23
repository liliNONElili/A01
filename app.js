/* ==========================================================================
   논의 AI 사무실 — 13층 단면도 스크립트 (비밀번호 잠금 · v3)
   data/office-state.enc.json (PBKDF2-SHA256 + AES-256-GCM 암호문) 을 읽어,
   입장 비밀번호로 WebCrypto 복호화한 뒤에만 도면·패널·장부를 그립니다.
   한 번 풀면 sessionStorage 에 복호화된 상태를 담아 같은 탭의 새로고침을 건넙니다.
   ========================================================================== */

(function () {
  'use strict';

  var LOCK_KEY = 'office.lock.v1';
  var BUNDLE_URL = 'data/office-state.enc.json';
  var WRAPPER_URL = 'data/office-state.enc.js';
  var AAD_FALLBACK = 'office-state/v1';

  var EMPTY_STATE = {
    meta: {}, chain: [], teams: [], floors: [], team: [],
    categories: [{ id: 'all', label: '전체' }],
    projects: [], timeline: [], restDays: [], principles: []
  };

  var bundlePromise = null;

  var STATUS_CLASS = { '진행 중': 'run', '대기': 'wait', '보류': 'hold' };
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  var state = {
    data: null,
    filter: 'all',
    floor: 'f2',
    noteTimer: null,
    focusTimer: null,
    sheetOpen: false,
    sheetScrollY: 0
  };

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function parts(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value || ''));
    if (!m) return null;
    return {
      y: +m[1], mo: +m[2], d: +m[3],
      hh: m[4] === undefined ? null : +m[4],
      mm: m[5] === undefined ? null : +m[5]
    };
  }

  function todayParts() {
    var n = new Date();
    return { y: n.getFullYear(), mo: n.getMonth() + 1, d: n.getDate() };
  }

  function dayNumber(p) { return Date.UTC(p.y, p.mo - 1, p.d) / 86400000; }

  function dday(value) {
    var p = parts(value);
    if (!p) return null;
    var diff = dayNumber(p) - dayNumber(todayParts());
    if (diff === 0) return { diff: diff, label: '오늘', tone: 'soon' };
    if (diff === 1) return { diff: diff, label: '내일', tone: 'soon' };
    if (diff > 1) return { diff: diff, label: 'D-' + diff, tone: diff <= 7 ? 'soon' : 'later' };
    return { diff: diff, label: (-diff) + '일 지남', tone: 'past' };
  }

  function fmtShort(value) {
    var p = parts(value);
    return p ? pad(p.mo) + '.' + pad(p.d) : '';
  }

  function fmtWeekday(value) {
    var p = parts(value);
    if (!p) return '';
    return WEEK[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
  }

  function fmtTime(value) {
    var p = parts(value);
    return p && p.hh !== null ? pad(p.hh) + ':' + pad(p.mm) : '';
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }

  function statusTag(status) {
    var cls = STATUS_CLASS[status] || 'hold';
    return '<span class="st st-' + cls + '"><i aria-hidden="true"></i>' + esc(status) + '</span>';
  }

  function catLabel(id) {
    var list = (state.data && state.data.categories) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return id;
  }

  function floorById(id) {
    var list = state.data.floors || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function projectById(id) {
    var list = state.data.projects || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function initialOf(name) {
    var m = (state.data.team || []).filter(function (t) { return t.name === name; })[0];
    return m ? (m.initial || name.charAt(0)) : name.charAt(0);
  }

  /* ── 잠금 · 복호화 ───────────────────────────────────────────────────── */

  function subtleCrypto() {
    var c = window.crypto || window.msCrypto;
    return c && (c.subtle || c.webkitSubtle) ? (c.subtle || c.webkitSubtle) : null;
  }

  function decodeB64(value) {
    var bin = window.atob(String(value || ''));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function utf8(value) {
    if (window.TextEncoder) return new TextEncoder().encode(value);
    var esc = unescape(encodeURIComponent(value));
    var out = new Uint8Array(esc.length);
    for (var i = 0; i < esc.length; i++) out[i] = esc.charCodeAt(i);
    return out;
  }

  function decodeUtf8(buffer) {
    var bytes = new Uint8Array(buffer);
    if (window.TextDecoder) return new TextDecoder('utf-8').decode(bytes);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(bin));
  }

  /* PBKDF2 로 키를 만들고 AES-GCM 으로 본문을 풀어 상태 객체를 돌려줍니다. */
  function decryptState(bundle, password) {
    var c = subtleCrypto();
    if (!c) return Promise.reject(new Error('이 브라우저에서는 WebCrypto 를 쓸 수 없습니다.'));
    if (!bundle || !bundle.kdf || !bundle.cipher || !bundle.payload) {
      return Promise.reject(new Error('암호문 형식이 맞지 않습니다.'));
    }
    var kdf = bundle.kdf;
    var iterations = Number(kdf.iterations) || 0;
    var salt = decodeB64(kdf.salt);
    var iv = decodeB64(bundle.cipher.iv);
    var payload = decodeB64(bundle.payload);
    var aad = utf8(bundle.aad || AAD_FALLBACK);

    return c.importKey('raw', utf8(password), { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (base) {
        return c.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: kdf.hash || 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return c.decrypt({ name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: 128 }, key, payload);
      })
      .then(function (buffer) {
        var json = JSON.parse(decodeUtf8(buffer));
        if (!json || !Array.isArray(json.floors) || !Array.isArray(json.projects)) {
          throw new Error('암호를 풀었지만 내용 형식이 맞지 않습니다.');
        }
        return json;
      });
  }

  function loadWrapper() {
    if (window.OFFICE_STATE_ENC) return Promise.resolve(window.OFFICE_STATE_ENC);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = WRAPPER_URL;
      s.async = true;
      s.onload = function () {
        if (window.OFFICE_STATE_ENC) resolve(window.OFFICE_STATE_ENC);
        else reject(new Error('암호문 래퍼가 비어 있습니다.'));
      };
      s.onerror = function () { reject(new Error('암호문 래퍼를 읽지 못했습니다.')); };
      document.head.appendChild(s);
    });
  }

  /* 암호문은 https 에서 fetch 로, file:// 에서는 같이 만든 JS 래퍼로 읽습니다. */
  function loadBundle() {
    if (bundlePromise) return bundlePromise;
    if (window.location.protocol === 'file:') {
      bundlePromise = loadWrapper();
      return bundlePromise;
    }
    bundlePromise = fetch(BUNDLE_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function () { return loadWrapper(); });
    return bundlePromise;
  }

  function readSession() {
    try {
      var raw = window.sessionStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      var json = JSON.parse(raw);
      return json && Array.isArray(json.floors) ? json : null;
    } catch (e) {
      return null;
    }
  }

  function writeSession(data) {
    try { window.sessionStorage.setItem(LOCK_KEY, JSON.stringify(data)); } catch (e) { /* 사생활 보호 모드 등 */ }
  }

  function clearSession() {
    try { window.sessionStorage.removeItem(LOCK_KEY); } catch (e) { /* 무시 */ }
  }

  function gateError(text) {
    var el = document.getElementById('gate-error');
    if (el) el.textContent = text || '';
    var pass = document.getElementById('gate-pass');
    if (pass) pass.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function gateNote(text) {
    var el = document.getElementById('gate-note');
    if (el && text) el.textContent = text;
  }

  function gateBusy(on) {
    var btn = document.getElementById('gate-open');
    if (!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? '여는 중…' : '열기';
    var pass = document.getElementById('gate-pass');
    if (pass) pass.readOnly = !!on;
  }

  function shakeGate() {
    var card = document.getElementById('gate-card');
    if (!card) return;
    card.classList.remove('is-shake');
    void card.offsetWidth;
    card.classList.add('is-shake');
    window.setTimeout(function () { card.classList.remove('is-shake'); }, 520);
  }

  function unlock(data, opts) {
    opts = opts || {};
    state.data = data;
    document.body.classList.remove('is-locked');
    var gate = document.getElementById('gate');
    if (gate) {
      gate.setAttribute('hidden', '');
      gate.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    paint();
    window.setInterval(renderClock, 30000);
    if (!opts.quiet) {
      var main = document.getElementById('main');
      if (main && typeof main.focus === 'function') {
        main.setAttribute('tabindex', '-1');
        try { main.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      }
    }
  }

  function onGateSubmit(ev) {
    if (ev) ev.preventDefault();
    var pass = document.getElementById('gate-pass');
    var value = pass ? pass.value : '';
    if (!value) {
      gateError('비밀번호를 입력해 주세요.');
      if (pass) pass.focus();
      return;
    }
    gateError('');
    gateBusy(true);

    loadBundle()
      .then(function (bundle) {
        return decryptState(bundle, value).then(function (data) {
          return data;
        }, function (err) {
          err.gateKind = 'password';
          throw err;
        });
      })
      .then(function (data) {
        gateBusy(false);
        if (pass) pass.value = '';
        writeSession(data);
        unlock(data);
      })
      .catch(function (err) {
        gateBusy(false);
        var wrong = !!(err && (err.gateKind === 'password' || err.name === 'OperationError'));
        gateError(wrong
          ? '비밀번호가 맞지 않습니다. 다시 확인해 주세요.'
          : '도면 파일을 열지 못했습니다. 인터넷 주소(http·https)에서 열었는지 확인해 주세요.');
        shakeGate();
        if (pass) {
          pass.select();
          pass.focus();
        }
        if (!wrong && window.console && console.warn) {
          console.warn('[AI사무실] 잠금 해제를 준비하지 못했습니다.', err);
        }
      });
  }

  function bindGate() {
    var form = document.getElementById('gate-form');
    if (form) form.addEventListener('submit', onGateSubmit);

    var again = document.getElementById('lock-again');
    if (again) {
      again.addEventListener('click', function () {
        clearSession();
        state.data = null;
        window.location.reload();
      });
    }

    var pass = document.getElementById('gate-pass');
    if (pass) {
      pass.addEventListener('input', function () {
        if (pass.getAttribute('aria-invalid') === 'true') gateError('');
      });
    }
  }

  /* ── 요약 ────────────────────────────────────────────────────────────── */

  function renderSummary() {
    var run = 0, wait = 0, hold = 0, soon = 0;
    state.data.projects.forEach(function (p) {
      if (p.status === '진행 중') run++;
      else if (p.status === '대기') wait++;
      else if (p.status === '보류') hold++;
      var dd = dday(p.due);
      if (dd && dd.diff >= 0 && dd.diff <= 7) soon++;
    });
    setText('sum-floors', (state.data.floors || []).length);
    setText('sum-run', run);
    setText('sum-wait', wait);
    setText('sum-soon', soon);
  }

  /* ── 엘리베이터 ──────────────────────────────────────────────────────── */

  function renderElevator() {
    var host = $('#elev-btns');
    if (!host) return;
    host.innerHTML = state.data.floors.map(function (f) {
      var locked = !f.open;
      return '<button class="fbtn' + (locked ? ' is-locked' : '') + '" type="button" data-floor="' + esc(f.id) + '"' +
        ' aria-pressed="' + (state.floor === f.id ? 'true' : 'false') + '"' +
        (locked ? ' title="접근 제한 — 논님 전용 비밀 공간"' : ' title="' + esc(f.code + ' ' + f.name) + '"') +
        '><span>' + esc(f.code) + (locked ? ' 🔒' : '') + '</span></button>';
    }).join('');
  }

  function moveCab(id) {
    var cab = $('#elev-cab');
    var shaft = cab ? cab.parentNode : null;
    if (!cab || !shaft) return;
    var list = state.data.floors || [];
    var idx = 0, i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) idx = i;
    var h = shaft.clientHeight;
    var y = (idx + 0.5) / 13 * h - cab.offsetHeight / 2;
    cab.style.transform = 'translateY(' + Math.round(y) + 'px)';
  }

  function alignElevator() {
    var elev = $('#elev');
    var tower = $('#tower');
    if (!elev || !tower) return;
    if (isMobile()) { elev.style.height = ''; return; }
    elev.style.height = tower.offsetHeight + 'px';
    moveCab(state.floor);
  }

  /* ── 단면도 ──────────────────────────────────────────────────────────── */

  function renderTower() {
    var art = $('#tower-art');
    var bands = $('#tower-bands');
    if (!art || !bands) return;

    art.innerHTML = window.OFFICE_ART ? window.OFFICE_ART.tower(state.data) : '';

    bands.innerHTML = state.data.floors.map(function (f, i) {
      var locked = !f.open;
      return '<button class="band' + (locked ? ' is-locked' : '') + '" type="button" data-floor="' + esc(f.id) + '"' +
        ' style="top:' + (i * 100 / 13).toFixed(4) + '%"' +
        ' aria-pressed="' + (state.floor === f.id ? 'true' : 'false') + '"' +
        ' aria-label="' + esc(f.code + ' ' + f.name + (locked ? ' — 접근 제한' : '')) + '"' +
        (locked ? ' aria-disabled="true"' : '') + '>' +
        '<span class="band-wash" aria-hidden="true"></span>' +
        '<span class="band-code" aria-hidden="true">' + esc(f.code) + '</span>' +
        (locked ? '<span class="lock-tag" aria-hidden="true">접근 제한</span>' :
          '<span class="band-name" aria-hidden="true">' + esc(f.name) + '</span>') +
      '</button>';
    }).join('');
  }

  function renderStrip() {
    var host = $('#floor-strip');
    if (!host) return;
    host.innerHTML = state.data.floors.map(function (f) {
      return '<button class="fstrip' + (f.open ? '' : ' is-locked') + '" type="button" data-floor="' + esc(f.id) + '"' +
        ' aria-pressed="' + (state.floor === f.id ? 'true' : 'false') + '">' +
        '<b>' + esc(f.code) + '</b>' + esc(f.name) + '</button>';
    }).join('');
  }

  /* ── 층 상세 패널 ────────────────────────────────────────────────────── */

  function roomMarkers(f) {
    return (f.rooms || []).map(function (rm, i) {
      return '<span class="rm" style="left:' + rm.x + '%" aria-hidden="true">' + (i + 1) + '</span>';
    }).join('');
  }

  function panelGroups(f) {
    var html = '';
    if (f.groups && f.groups.length) {
      html += '<div class="panel-block"><h4>이 층의 팀</h4><div class="chipline">' +
        f.groups.map(function (g) {
          return '<span class="chip"><b>' + esc(g.name) + '</b>' + (g.note ? ' ' + esc(g.note) : '') + '</span>';
        }).join('') + '</div></div>';
    }
    if (f.people && f.people.length) {
      html += '<div class="panel-block"><h4>지금 이 층에 있는 사람</h4><div class="chipline">' +
        f.people.map(function (name) {
          return '<span class="chip"><span class="m" aria-hidden="true">' + esc(initialOf(name)) + '</span>' + esc(name) + '</span>';
        }).join('') + '</div></div>';
    }
    return html;
  }

  function panelProjects(f) {
    var ids = f.projects || [];
    var html = '<div class="panel-block"><h4>연결된 일</h4>';
    if (!ids.length) {
      html += '<p class="empty-line">이 층에 아직 붙은 일은 없습니다. 자리는 비워 두었습니다.</p>';
    } else {
      html += ids.map(function (id) {
        var p = projectById(id);
        if (!p) return '';
        var dd = dday(p.due);
        return '<button class="pmini" type="button" data-proj="' + esc(p.id) + '">' +
          '<span class="pmini-t">' + esc(p.title) + '</span>' +
          '<span class="pmini-m">' + statusTag(p.status) +
            (dd ? '<span>' + esc(dd.label) + '</span>' : '<span>일정 없음</span>') + '</span>' +
          '<span class="pmini-n">' + esc(p.next) + '</span>' +
        '</button>';
      }).join('');
    }
    return html + '</div>';
  }

  function renderPanel(id) {
    var panel = $('#panel');
    var f = floorById(id);
    if (!panel || !f || !f.open) return;

    var html = '<div class="panel-head">' +
      '<p class="panel-k"><b>' + esc(f.code) + '</b><span>' + esc(f.en) + '</span></p>' +
      '<h3>' + esc(f.name) + '</h3>' +
      '<p class="panel-sub">' + esc(f.summary) + '</p>' +
      '<button class="panel-close" type="button" id="panel-close" aria-label="층 상세 닫기">✕</button>' +
    '</div>';

    html += '<div class="panel-art">' + (window.OFFICE_ART ? window.OFFICE_ART.detail(f) : '') +
      roomMarkers(f) + '</div>';

    if (f.rooms && f.rooms.length) {
      html += '<ul class="panel-rooms">' + f.rooms.map(function (rm, i) {
        return '<li><span class="rn">' + (i + 1) + '</span><span>' + esc(rm.name) + '</span>' +
          '<span class="rd">' + esc(rm.note) + '</span></li>';
      }).join('') + '</ul>';
    }

    html += panelGroups(f);
    html += panelProjects(f);
    if (f.note) html += '<p class="panel-note">' + esc(f.note) + '</p>';

    panel.innerHTML = html;
    panel.setAttribute('aria-label', f.code + ' ' + f.name + ' 상세');
  }

  function setNote(text) {
    var el = $('#tower-note');
    if (!el) return;
    el.innerHTML = text;
    if (state.noteTimer) window.clearTimeout(state.noteTimer);
    state.noteTimer = window.setTimeout(function () {
      el.innerHTML = defaultNote();
      state.noteTimer = null;
    }, 3600);
  }

  function defaultNote() {
    var f = floorById(state.floor);
    return f ? ('지금 보고 있는 층 — <b>' + esc(f.code + ' ' + f.name) + '</b> · 층을 눌러 바꿉니다.') : '';
  }

  function shade(id, on) {
    $$('[data-floor="' + id + '"]').forEach(function (el) {
      if (el.classList.contains('band') || el.classList.contains('fbtn') || el.classList.contains('fstrip')) {
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
  }

  function selectFloor(id, opts) {
    opts = opts || {};
    var f = floorById(id);
    if (!f) return;
    if (!f.open) {
      lockedFeedback(id);
      return;
    }
    state.floor = id;
    shade(id, true);
    $$('[data-floor]').forEach(function (el) {
      if (el.getAttribute('data-floor') !== id &&
        (el.classList.contains('band') || el.classList.contains('fbtn') || el.classList.contains('fstrip'))) {
        el.setAttribute('aria-pressed', 'false');
      }
    });
    renderPanel(id);
    moveCab(id);
    setText('elev-now', f.code);
    var el = $('#tower-note');
    if (el && !state.noteTimer) el.innerHTML = defaultNote();
    if (isMobile() && !opts.quiet) openSheet();
  }

  function lockedFeedback(id) {
    var f = floorById(id);
    var el = $('#tower-note');
    if (el) {
      setNote('🔒 <b>' + esc(f.code) + '</b> — 접근 제한 · 논님 전용 비밀 공간입니다. 열리지 않습니다.');
    }
    $$('[data-floor="' + id + '"]').forEach(function (b) {
      b.classList.remove('is-shake');
      void b.offsetWidth;
      b.classList.add('is-shake');
      window.setTimeout(function () { b.classList.remove('is-shake'); }, 500);
    });
    if (isMobile()) closeSheet();
  }

  /* ── 모바일 시트 ───────────────────────────────────────────────────────
     시트는 화면 하단에 고정된 오버레이(position:fixed)로 뜬다.
     뒤 페이지는 body 를 position:fixed 로 붙잡아 두어 스크롤이 튀지 않고,
     시트를 닫으면 보던 자리로 그대로 돌아온다. */

  function lockPageScroll() {
    if (state.sheetOpen) return;
    state.sheetScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    state.sheetOpen = true;
    var html = document.documentElement;
    var body = document.body;
    if (html) html.classList.add('is-sheet-open');
    body.style.position = 'fixed';
    body.style.top = (-state.sheetScrollY) + 'px';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  function unlockPageScroll() {
    if (!state.sheetOpen) return;
    state.sheetOpen = false;
    var html = document.documentElement;
    var body = document.body;
    if (html) html.classList.remove('is-sheet-open');
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    // html{scroll-behavior:smooth} 때문에 복원이 미끄러지지 않도록 잠깐 끈다.
    var smooth = html ? html.style.scrollBehavior : '';
    if (html) html.style.scrollBehavior = 'auto';
    window.scrollTo(0, state.sheetScrollY);
    if (html) html.style.scrollBehavior = smooth;
  }

  function openSheet() {
    var p = $('#panel');
    var bd = $('#backdrop');
    if (!p) return;
    lockPageScroll();
    p.classList.add('is-sheet-open');
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    if (bd) bd.hidden = false;
    var close = $('#panel-close');
    if (close) {
      window.setTimeout(function () {
        try { close.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      }, 80);
    }
  }

  function closeSheet() {
    var p = $('#panel');
    var bd = $('#backdrop');
    if (p) {
      p.classList.remove('is-sheet-open');
      p.removeAttribute('role');
      p.removeAttribute('aria-modal');
    }
    if (bd) bd.hidden = true;
    unlockPageScroll();
  }

  /* ── 조직 ────────────────────────────────────────────────────────────── */

  function renderTeams() {
    var host = $('#team-cards');
    if (!host) return;
    host.innerHTML = (state.data.teams || []).map(function (t) {
      var f = floorById(t.floor);
      var members = (t.members || []).map(function (m) {
        return '<span class="chip"><span class="m" aria-hidden="true">' + esc(m.name.charAt(0)) + '</span>' +
          '<b>' + esc(m.name) + '</b> ' + esc(m.role) + '</span>';
      }).join('');
      if (!members) members = '<span class="tcard-empty">전담 자리 비어 있음</span>';
      return '<article class="tcard' + (t.id === 'lead' ? ' is-lead' : '') + '">' +
        '<div class="tcard-head">' +
          '<span class="tcard-name">' + esc(t.name) + '</span>' +
          '<span class="tcard-en">' + esc(t.en) + '</span>' +
          (f ? '<a class="tcard-floor" href="#building" data-floor="' + esc(f.id) + '">' + esc(f.code) + ' 층 보기 →</a>' : '') +
        '</div>' +
        '<p class="tcard-duty">' + esc(t.duty) + '</p>' +
        '<div class="tcard-members">' + members + '</div>' +
        (t.note ? '<p class="tcard-note">' + esc(t.note) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  function renderChain() {
    var host = $('#chain');
    if (!host) return;
    host.innerHTML = state.data.chain.map(function (c) {
      return '<li data-level="' + esc(c.level) + '">' +
        '<div class="chain-head">' +
          '<span class="chain-name">' + esc(c.name) + '</span>' +
          '<span class="chain-role">' + esc(c.role) + '</span>' +
          '<span class="chain-lv">' + esc(c.level) + '</span>' +
        '</div>' +
        '<p class="chain-note">' + esc(c.note) + '</p>' +
      '</li>';
    }).join('');
  }

  function renderLegend() {
    var host = $('#legend');
    if (!host) return;
    var counts = { '진행 중': 0, '대기': 0, '보류': 0 };
    state.data.projects.forEach(function (p) {
      if (counts[p.status] === undefined) counts[p.status] = 0;
      counts[p.status]++;
    });
    var rows = [
      { label: '진행 중', cls: 'run', hint: '지금 움직이는 트랙' },
      { label: '대기', cls: 'wait', hint: '결정·검증을 기다림' },
      { label: '보류', cls: 'hold', hint: '정비 기간' }
    ];
    host.innerHTML = rows.map(function (r) {
      return '<li><i class="sw sw-' + r.cls + '" aria-hidden="true"></i>' +
        '<span>' + esc(r.label) + ' — ' + esc(r.hint) + '</span>' +
        '<span class="cnt">' + counts[r.label] + '</span></li>';
    }).join('');
  }

  function renderRules() {
    var host = $('#rules');
    if (!host) return;
    host.innerHTML = (state.data.principles || []).map(function (text) {
      return '<li>' + esc(text) + '</li>';
    }).join('');
  }

  /* ── 사람 ────────────────────────────────────────────────────────────── */

  function renderTeam() {
    var host = $('#team-grid');
    if (!host) return;
    host.innerHTML = state.data.team.map(function (m) {
      var f = floorById(m.floor);
      return '<article class="profile">' +
        '<div class="profile-head">' +
          '<div class="medal" aria-hidden="true"><span>' + esc(m.initial || m.name.charAt(0)) + '</span></div>' +
          '<div class="profile-name">' +
            '<span class="pname">' + esc(m.name) + '</span>' +
            '<span class="prole">' + esc(m.role) + ' · ' + esc(m.teamName || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="profile-meta">' +
          statusTag(m.status) +
          (f ? '<a class="loc" href="#building" data-floor="' + esc(f.id) + '">' + esc(m.seat) + '</a>'
             : '<span class="loc">' + esc(m.seat) + '</span>') +
        '</div>' +
        '<dl>' +
          '<div class="row"><dt>지금</dt><dd>' + esc(m.current) + '</dd></div>' +
          '<div class="row"><dt>트랙</dt><dd>' + esc((m.tracks || []).join(' · ')) + '</dd></div>' +
          '<div class="row is-next"><dt>다음</dt><dd>' + esc(m.next) + '</dd></div>' +
        '</dl>' +
        (m.note ? '<p class="profile-note">' + esc(m.note) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  /* ── 장부 ────────────────────────────────────────────────────────────── */

  function renderFilters() {
    var host = $('#filters');
    if (!host) return;
    var counts = {};
    state.data.projects.forEach(function (p) {
      counts[p.cat] = (counts[p.cat] || 0) + 1;
    });
    host.innerHTML = state.data.categories.map(function (c) {
      var n = c.id === 'all' ? state.data.projects.length : (counts[c.id] || 0);
      return '<button class="fchip" type="button" data-cat="' + esc(c.id) + '"' +
        ' aria-pressed="' + (state.filter === c.id ? 'true' : 'false') + '">' +
        esc(c.label) + '<span class="n">' + n + '</span></button>';
    }).join('');
  }

  function sortedProjects() {
    var list = state.data.projects.slice();
    if (state.filter !== 'all') {
      list = list.filter(function (p) { return p.cat === state.filter; });
    }
    list.sort(function (a, b) {
      var pa = parts(a.due), pb = parts(b.due);
      var va = pa ? dayNumber(pa) * 1440 + (pa.hh || 0) * 60 + (pa.mm || 0) : Infinity;
      var vb = pb ? dayNumber(pb) * 1440 + (pb.hh || 0) * 60 + (pb.mm || 0) : Infinity;
      if (va !== vb) return va - vb;
      return (a.order || 0) - (b.order || 0);
    });
    return list;
  }

  function renderProjects() {
    var host = $('#project-rows');
    var note = $('#filter-note');
    if (!host) return;

    var list = sortedProjects();
    var total = state.data.projects.length;

    if (!list.length) {
      host.innerHTML = '<p class="empty">이 분류에 올라온 일은 아직 없습니다.</p>';
    } else {
      host.innerHTML = list.map(function (p, i) {
        var dd = dday(p.due);
        var ddCls = 'dd' + (dd ? (dd.tone === 'soon' ? ' is-soon' : dd.tone === 'past' ? ' is-past' : '') : '');
        var when = '';
        if (dd) {
          when = '<span class="' + ddCls + '">' + esc(dd.label) + '</span>' +
            '<span class="row-date">' + esc(fmtShort(p.due) + (fmtTime(p.due) ? ' ' + fmtTime(p.due) : '')) + '</span>';
        } else {
          when = '<span class="row-none">일정 없음</span>';
        }

        return '<article class="row" id="p-' + esc(p.id) + '" data-proj="' + esc(p.id) + '">' +
          '<div class="row-idx" aria-hidden="true">' + pad(i + 1) + '</div>' +
          '<div class="row-main">' +
            '<h3>' + esc(p.title) +
              (p.flag ? ' <span class="flag">' + esc(p.flag) + '</span>' : '') +
            '</h3>' +
            '<p class="row-meta"><span>' + esc(catLabel(p.cat)) + '</span>' +
              '<span class="sep" aria-hidden="true">·</span>' +
              '<span>담당 ' + esc(p.owner) + '</span></p>' +
            '<p class="row-desc">' + esc(p.summary) + '</p>' +
            '<p class="row-next">' + esc(p.next) + '</p>' +
          '</div>' +
          '<div class="row-side">' + statusTag(p.status) + when + '</div>' +
        '</article>';
      }).join('');
    }

    if (note) {
      note.textContent = state.filter === 'all'
        ? '전체 ' + total + '건 · 마감이 가까운 순서'
        : catLabel(state.filter) + ' ' + list.length + '건 · 마감이 가까운 순서';
    }
  }

  function renderTimeline() {
    var host = $('#timeline');
    var note = $('#timeline-note');
    if (!host) return;

    var today = dayNumber(todayParts());
    var all = (state.data.timeline || []).slice().sort(function (a, b) {
      var pa = parts(a.at), pb = parts(b.at);
      if (!pa || !pb) return 0;
      return (dayNumber(pa) * 1440 + (pa.hh || 0) * 60 + (pa.mm || 0)) -
             (dayNumber(pb) * 1440 + (pb.hh || 0) * 60 + (pb.mm || 0));
    });

    var upcoming = all.filter(function (t) {
      var p = parts(t.at);
      return p && dayNumber(p) >= today;
    });
    var past = all.length - upcoming.length;

    if (!upcoming.length) {
      host.innerHTML = '<li class="tl"><div class="tl-date"><b>—</b></div>' +
        '<div class="tl-body"><p class="tl-title">가까운 일정이 없습니다.</p></div></li>';
    } else {
      host.innerHTML = upcoming.map(function (t) {
        var p = parts(t.at);
        var dd = dday(t.at);
        var soon = dd && dd.diff <= 7;
        var time = fmtTime(t.at);
        return '<li class="tl' + (soon ? ' is-soon' : '') + '">' +
          '<div class="tl-date"><b>' + p.d + '</b>' + p.mo + '월 · ' + fmtWeekday(t.at) + '</div>' +
          '<div class="tl-body">' +
            '<p class="tl-title">' + esc(t.title) + '</p>' +
            '<p class="tl-note">' + esc(t.note) + '</p>' +
            '<span class="tl-dd">' + esc(dd ? dd.label : '') + (time ? ' · ' + time : '') + '</span>' +
          '</div>' +
        '</li>';
      }).join('');
    }

    if (note) {
      note.textContent = past > 0
        ? '지난 일정 ' + past + '건은 목록에서 뺐습니다.'
        : '오늘부터의 일정만 모았습니다.';
    }
  }

  function renderRest() {
    var host = $('#rest');
    if (!host) return;
    var today = dayNumber(todayParts());
    host.innerHTML = (state.data.restDays || []).map(function (d) {
      var p = parts(d);
      if (!p) return '';
      var diff = dayNumber(p) - today;
      var cls = 'rest-day';
      if (diff === 0) cls += ' is-today';
      else if (diff > 0 && diff <= 7) cls += ' is-soon';
      return '<span class="' + cls + '">' + esc(fmtShort(d) + ' ' + fmtWeekday(d)) + '</span>';
    }).join('');
  }

  function renderMeta() {
    var meta = state.data.meta || {};
    var basis = parts(meta.updatedAt);
    if (basis) {
      var label = basis.y + '.' + pad(basis.mo) + '.' + pad(basis.d);
      setText('basis-date', label);
      setText('foot-date', label);
      setText('foot-updated', label + (basis.hh !== null ? ' ' + pad(basis.hh) + ':' + pad(basis.mm) : ''));
    }
    setText('foot-version', meta.version || 'v2.0');
    if (meta.title) document.title = meta.title + ' · 13층 단면도';
  }

  function renderClock() {
    var n = new Date();
    setText('clock', '지금 ' + pad(n.getHours()) + ':' + pad(n.getMinutes()));
  }

  /* ── 상호작용 ────────────────────────────────────────────────────────── */

  function focusProject(id) {
    var row = document.getElementById('p-' + id);
    if (!row) return;
    state.filter = 'all';
    renderFilters();
    renderProjects();
    row = document.getElementById('p-' + id);
    if (!row) return;
    if (isMobile()) closeSheet();
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('is-focus');
    if (state.focusTimer) window.clearTimeout(state.focusTimer);
    state.focusTimer = window.setTimeout(function () {
      row.classList.remove('is-focus');
      state.focusTimer = null;
    }, 2800);
  }

  function bind() {
    document.addEventListener('click', function (ev) {
      var floorEl = ev.target.closest ? ev.target.closest('[data-floor]') : null;
      if (floorEl) {
        ev.preventDefault();
        var id = floorEl.getAttribute('data-floor');
        if (!floorEl.classList.contains('is-locked') && !floorEl.getAttribute('aria-disabled')) {
          selectFloor(id);
          if (floorEl.tagName === 'A' && !isMobile()) {
            var host = document.getElementById('building');
            if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          lockedFeedback(id);
        }
        return;
      }

      var projEl = ev.target.closest ? ev.target.closest('[data-proj]') : null;
      if (projEl && !projEl.classList.contains('row')) {
        ev.preventDefault();
        if (state.sheetOpen) closeSheet();
        focusProject(projEl.getAttribute('data-proj'));
        return;
      }

      var chip = ev.target.closest ? ev.target.closest('.fchip') : null;
      if (chip) {
        state.filter = chip.getAttribute('data-cat');
        renderFilters();
        renderProjects();
        return;
      }

      if (ev.target.id === 'panel-close') {
        closeSheet();
        return;
      }
      if (ev.target.id === 'backdrop') {
        closeSheet();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && isMobile()) closeSheet();
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      var el = document.activeElement;
      if (!el || !el.classList || !el.classList.contains('band') && !el.classList.contains('fbtn')) return;
      ev.preventDefault();
      var list = state.data.floors;
      var idx = 0, i;
      for (i = 0; i < list.length; i++) if (list[i].id === el.getAttribute('data-floor')) idx = i;
      var next = idx + (ev.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) next = 0;
      if (next > list.length - 1) next = list.length - 1;
      var target = document.querySelector('.band[data-floor="' + list[next].id + '"]');
      if (target) target.focus();
    });

    window.addEventListener('resize', function () {
      alignElevator();
      if (!isMobile()) closeSheet();
    });

    window.addEventListener('pagehide', function () {
      if (state.sheetOpen) unlockPageScroll();
    });
  }

  function paint() {
    renderSummary();
    renderElevator();
    renderTower();
    renderStrip();
    renderTeams();
    renderChain();
    renderLegend();
    renderRules();
    renderTeam();
    renderFilters();
    renderProjects();
    renderTimeline();
    renderRest();
    renderMeta();
    renderClock();
    selectFloor(state.floor, { quiet: true });
    var el = $('#tower-note');
    if (el) el.innerHTML = defaultNote();
    alignElevator();
    window.setTimeout(alignElevator, 120);
  }

  function init() {
    state.data = EMPTY_STATE;
    bind();
    bindGate();

    var cached = readSession();
    if (cached) {
      unlock(cached, { quiet: true });
      return;
    }

    var pass = document.getElementById('gate-pass');
    if (pass) window.setTimeout(function () { try { pass.focus(); } catch (e) { /* 무시 */ } }, 80);

    loadBundle().then(function (bundle) {
      var k = bundle && bundle.kdf ? bundle.kdf : null;
      var c = bundle && bundle.cipher ? bundle.cipher : null;
      if (k && c) {
        gateNote('AES-' + (c.length || 256) + '-GCM · ' + k.name + '-' + (k.hash || 'SHA-256') + ' ' +
          Number(k.iterations || 0).toLocaleString('ko-KR') + '회 — 암호문만 공개되고, 비밀번호 없이는 내용을 읽을 수 없습니다.');
      }
    }, function () {
      gateNote('암호문을 읽지 못했습니다. 폴더를 그대로 둔 채 인터넷 주소(http·https)로 열어 주세요.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
