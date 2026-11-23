/* ==========================================================================
   논의 AI 사무실 — 13층 건물 단면도 · 스케치 도판
   종이 위에 연필로 그린 단면도처럼, 층마다 다른 가구 실루엣을 SVG 로 그립니다.
   외부 라이브러리 없이 문자열로 조립합니다(ES5).
   ========================================================================== */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* ── 좌표 ──────────────────────────────────────────────────────────────
     단면도 캔버스 760 × 1102. 층 띠 13개 × 84.
     건물 x 60..740, 안쪽 68..732, 층 바닥선 y = 84*(i+1)-6
     라벨 기둥 x 0..52 (층 코드는 HTML 이 얹습니다)
     ──────────────────────────────────────────────────────────────────── */
  var H = 84;          /* 층 높이 */
  var BOT = 1092;      /* 건물 바닥 */
  var W = 760;

  function n(v) {
    var r = Math.round(v * 10) / 10;
    return String(r);
  }

  function r(x, y, w, h, cls, extra) {
    return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' +
      (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  }

  function l(x1, y1, x2, y2, cls) {
    return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '"' +
      (cls ? ' class="' + cls + '"' : '') + '/>';
  }

  function ci(cx, cy, rr, cls) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(rr) + '"' +
      (cls ? ' class="' + cls + '"' : '') + '/>';
  }

  function el(cx, cy, rx, ry, cls) {
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '"' +
      (cls ? ' class="' + cls + '"' : '') + '/>';
  }

  function path(d, cls) {
    return '<path d="' + d + '"' + (cls ? ' class="' + cls + '"' : '') + '/>';
  }

  function g(inner, cls) {
    return '<g' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</g>';
  }

  /* ── 작은 가구·사물 ────────────────────────────────────────────────────
     모든 y 는 바닥선(가구가 놓이는 선)입니다.
     ──────────────────────────────────────────────────────────────────── */

  function desk(x, y, w, k) {
    k = k || 1;
    var h = 22 * k;
    return r(x, y - h, w, 2.4 * k, 'ln fl') +
      l(x + 0.5, y - h + 2.4 * k, x + w - 0.5, y - h + 2.4 * k, 'ln2') +
      l(x + 2 * k, y - h, x + 2 * k, y, 'ln') +
      l(x + w - 2 * k, y - h, x + w - 2 * k, y, 'ln') +
      r(x + w - 17 * k, y - h, 14 * k, 10 * k, 'ln2 fl');
  }

  function monitor(x, y, w, h, k, kind) {
    k = k || 1;
    var s = r(x, y - h, w, h, 'ln fl') +
      l(x + 2 * k, y - h + 2 * k, x + w - 2 * k, y - h + 2 * k, 'ln2') +
      l(x + w / 2, y - h + h, x + w / 2, y - 1.5 * k, 'ln') +
      l(x + w / 2 - 5 * k, y - 1.5 * k, x + w / 2 + 5 * k, y - 1.5 * k, 'ln');
    if (kind === 'wave') {
      var mid = y - h / 2;
      s += path('M' + n(x + 3 * k) + ' ' + n(mid) +
        ' l' + n(3 * k) + ' 0 l' + n(2 * k) + ' ' + n(-4 * k) + ' l' + n(2 * k) + ' ' + n(8 * k) +
        ' l' + n(2.5 * k) + ' ' + n(-11 * k) + ' l' + n(2 * k) + ' ' + n(9 * k) + ' l' + n(2 * k) + ' ' + n(-6 * k) +
        ' l' + n(2.5 * k) + ' ' + n(4 * k) + ' l' + n(3 * k) + ' 0', 'ln2');
    } else if (kind === 'bars') {
      var i, bx, bh;
      for (i = 0; i < 5; i++) {
        bx = x + 4 * k + i * (w - 8 * k) / 5;
        bh = (3 + (i * 7) % 9) * k;
        s += l(bx, y - h + h - 3 * k, bx, y - h + h - 3 * k - bh, 'ln2');
        s += l(bx + (w - 8 * k) / 10, y - h + h - 3 * k, bx + (w - 8 * k) / 10, y - h + h - 3 * k - bh * 0.7, 'ln3');
      }
    } else if (kind === 'text') {
      s += l(x + 4 * k, y - h + 5 * k, x + w - 4 * k, y - h + 5 * k, 'ln3') +
        l(x + 4 * k, y - h + 8 * k, x + w - 8 * k, y - h + 8 * k, 'ln3') +
        l(x + 4 * k, y - h + 11 * k, x + w - 6 * k, y - h + 11 * k, 'ln3');
    }
    return s;
  }

  function chair(x, y, k, flip) {
    k = k || 1;
    var dir = flip ? -1 : 1;
    var s = r(x - 4.4 * k, y - 9 * k, 8.8 * k, 2 * k, 'ln fl') +
      l(x - 4.4 * k * dir, y - 9 * k, x - 5.4 * k * dir, y - 22 * k, 'ln') +
      l(x - 4.4 * k * dir, y - 9 * k, x - 3.2 * k * dir, y, 'ln') +
      l(x + 3.2 * k, y - 9 * k, x + 3.2 * k, y, 'ln');
    return s;
  }

  function person(x, y, k, pose) {
    k = k || 1;
    var s = ci(x, y - 25 * k, 3.1 * k, 'ln fl');
    if (pose === 'stand') {
      s += path('M' + n(x - 3.4 * k) + ' ' + n(y - 20 * k) +
        ' l0 ' + n(11 * k) + ' l' + n(-1.6 * k) + ' ' + n(9 * k) +
        ' M' + n(x + 3.4 * k) + ' ' + n(y - 20 * k) + ' l0 ' + n(11 * k) + ' l' + n(1.6 * k) + ' ' + n(9 * k), 'ln') +
        l(x - 3.4 * k, y - 20 * k, x + 3.4 * k, y - 20 * k, 'ln') +
        l(x - 3.4 * k, y - 9 * k, x + 3.4 * k, y - 9 * k, 'ln');
    } else {
      s += path('M' + n(x - 3.6 * k) + ' ' + n(y - 21 * k) +
        ' c0 ' + n(5 * k) + ' 0 ' + n(8 * k) + ' 0 ' + n(11 * k) +
        ' l' + n(6 * k) + ' 0 l' + n(1 * k) + ' ' + n(10 * k) +
        ' M' + n(x + 3.6 * k) + ' ' + n(y - 10 * k) + ' l0 ' + n(10 * k), 'ln') +
        l(x + 2 * k, y - 21 * k, x + 2 * k, y - 13 * k, 'ln2');
    }
    return s;
  }

  function plant(x, y, k, tall) {
    k = k || 1;
    var h = tall ? 9 * k : 6 * k;
    var s = path('M' + n(x - 4.4 * k) + ' ' + n(y) + ' L' + n(x + 4.4 * k) + ' ' + n(y) +
      ' L' + n(x + 3.2 * k) + ' ' + n(y - h) + ' L' + n(x - 3.2 * k) + ' ' + n(y - h) + ' Z', 'ln fl');
    s += path('M' + n(x) + ' ' + n(y - h) + ' c' + n(-1 * k) + ' ' + n(-4 * k) + ' ' + n(-1 * k) + ' ' + n(-7 * k) + ' ' + n(0.4 * k) + ' ' + n(-11 * k), 'ln');
    s += path('M' + n(x) + ' ' + n(y - h - 1 * k) + ' c' + n(-6 * k) + ' ' + n(-1 * k) + ' ' + n(-8 * k) + ' ' + n(-5 * k) + ' ' + n(-6 * k) + ' ' + n(-7 * k) +
      ' c' + n(4 * k) + ' ' + n(-1 * k) + ' ' + n(5 * k) + ' ' + n(2 * k) + ' ' + n(6 * k) + ' ' + n(7 * k), 'ln');
    s += path('M' + n(x) + ' ' + n(y - h - 2 * k) + ' c' + n(5 * k) + ' ' + n(-2 * k) + ' ' + n(9 * k) + ' ' + n(-5 * k) + ' ' + n(7 * k) + ' ' + n(-9 * k) +
      ' c' + n(-4 * k) + ' ' + n(0) + ' ' + n(-6 * k) + ' ' + n(3 * k) + ' ' + n(-7 * k) + ' ' + n(9 * k), 'ln');
    s += path('M' + n(x) + ' ' + n(y - h - 3 * k) + ' c' + n(-1 * k) + ' ' + n(-3 * k) + ' ' + n(0.5 * k) + ' ' + n(-6 * k) + ' ' + n(3 * k) + ' ' + n(-8 * k), 'ln2');
    return s;
  }

  function shelf(x, y, w, h, rows) {
    var s = r(x, y - h, w, h, 'ln fl') +
      l(x, y - h, x + w, y - h, 'ln') +
      l(x + w, y - h, x + w, y, 'ln');
    var i, ry, bx, bw;
    for (i = 1; i < rows; i++) {
      ry = y - h + (h / rows) * i;
      s += l(x, ry, x + w, ry, 'ln2');
    }
    for (i = 0; i < rows; i++) {
      ry = y - h + (h / rows) * (i + 1);
      bx = x + 2.5;
      var seed = Math.round(x + h + i * 11);
      var rowH = h / rows;
      var tall;
      while (bx < x + w - 4) {
        bw = 4.5 + (seed + bx) % 3;
        if (bx + bw > x + w - 4) break;
        tall = rowH * (0.55 + ((seed + bx * 3) % 3) * 0.12);
        if ((seed + i + bx) % 5 === 0) {
          /* 가로로 눕힌 책 한 권 */
          s += r(bx, ry - 2.6, bw + 4, 2.6, 'ln2');
          bx += bw + 7;
        } else {
          s += l(bx, ry - 0.5, bx, ry - tall, 'ln2');
          if (bw > 6) s += l(bx + bw * 0.45, ry - 1, bx + bw * 0.45, ry - tall * 0.82, 'ln3');
          bx += bw + 2.2;
        }
      }
    }
    s += l(x, y - h, x + w, y - h, 'ln') + l(x, y, x + w, y, 'ln') +
      l(x, y - h, x, y, 'ln') + l(x + w, y - h, x + w, y, 'ln');
    return s;
  }

  function table(x, y, w, k) {
    k = k || 1;
    var h = 13 * k;
    return r(x, y - h, w, 2.2 * k, 'ln fl') +
      l(x + 2 * k, y - h + 2.2 * k, x + 2 * k, y, 'ln') +
      l(x + w - 2 * k, y - h + 2.2 * k, x + w - 2 * k, y, 'ln');
  }

  function cup(x, y, k) {
    k = k || 1;
    return path('M' + n(x - 2 * k) + ' ' + n(y - 4 * k) + ' l' + n(4 * k) + ' 0 l' + n(-0.6 * k) + ' ' + n(4 * k) + ' l' + n(-2.8 * k) + ' 0 Z', 'ln2') +
      path('M' + n(x + 2 * k) + ' ' + n(y - 3 * k) + ' c' + n(1.6 * k) + ' 0 ' + n(1.6 * k) + ' ' + n(2 * k) + ' 0 ' + n(2 * k), 'ln3');
  }

  function papers(x, y, k) {
    k = k || 1;
    return r(x, y - 1.2 * k, 8 * k, 1.2 * k, 'ln fl') + r(x + 1 * k, y - 2.4 * k, 7 * k, 1.2 * k, 'ln fl');
  }

  function sofa(x, y, w, k, flip) {
    k = k || 1;
    var h = 14 * k;
    var s = r(x, y - h, w, h, 'ln fl') +
      l(x, y - h + 3 * k, x + w, y - h + 3 * k, 'ln2');
    if (flip) s += r(x + w - 5 * k, y - h, 5 * k, h, 'ln fl');
    else s += r(x, y - h, 5 * k, h, 'ln fl');
    s += l(x + w / 2, y - h + 3 * k, x + w / 2, y, 'ln2');
    s += l(x + 3 * k, y, x + 3 * k, y + 3 * k, 'ln2') + l(x + w - 3 * k, y, x + w - 3 * k, y + 3 * k, 'ln2');
    return s;
  }

  function lamp(x, y, k) {
    k = k || 1;
    return l(x, y, x, y - 24 * k, 'ln') + path('M' + n(x - 5 * k) + ' ' + n(y - 24 * k) + ' l' + n(10 * k) + ' 0 l' + n(-2 * k) + ' ' + n(-6 * k) + ' l' + n(-6 * k) + ' 0 Z', 'ln fl') +
      el(x, y, 5 * k, 1.2 * k, 'ln2');
  }

  function pendant(x, ceiling, len, k) {
    k = k || 1;
    return l(x, ceiling, x, ceiling + len, 'ln2') +
      path('M' + n(x - 5 * k) + ' ' + n(ceiling + len) + ' l' + n(10 * k) + ' 0 l' + n(-2.4 * k) + ' ' + n(5 * k) + ' l' + n(-5.2 * k) + ' 0 Z', 'ln fl');
  }

  function windowPane(x, y, w, h, k) {
    k = k || 1;
    return r(x, y, w, h, 'ln fl') + l(x + w / 2, y, x + w / 2, y + h, 'ln2') + l(x, y + h / 2, x + w, y + h / 2, 'ln2') +
      l(x - 1.5 * k, y + h, x + w + 1.5 * k, y + h, 'ln');
  }

  function easel(x, y, k) {
    k = k || 1;
    var s = l(x, y, x - 6 * k, y - 40 * k, 'ln') + l(x, y, x + 6 * k, y - 40 * k, 'ln') +
      l(x, y, x, y - 34 * k, 'ln');
    s += path('M' + n(x - 13 * k) + ' ' + n(y - 28 * k) + ' L' + n(x + 13 * k) + ' ' + n(y - 31 * k) +
      ' L' + n(x + 13 * k) + ' ' + n(y - 53 * k) + ' L' + n(x - 13 * k) + ' ' + n(y - 50 * k) + ' Z', 'ln fl');
    s += l(x - 11 * k, y - 31 * k, x + 11 * k, y - 34 * k, 'ln2');
    return s;
  }

  function piano(x, y, k) {
    k = k || 1;
    var s = r(x, y - 38 * k, 60 * k, 38 * k, 'ln fl') +
      l(x - 1.5 * k, y - 38 * k, x + 61.5 * k, y - 38 * k, 'ln') +
      r(x + 1 * k, y - 30 * k, 58 * k, 6 * k, 'ln fl') +
      l(x + 1 * k, y - 24 * k, x + 59 * k, y - 24 * k, 'ln2');
    var i;
    for (i = 0; i < 12; i++) {
      s += l(x + 5 * k + i * 4.3 * k, y - 24 * k, x + 5 * k + i * 4.3 * k, y - 21 * k, 'ln3');
    }
    s += path('M' + n(x + 16 * k) + ' ' + n(y - 38 * k) + ' l3 ' + n(-8 * k) + ' l22 0 l-1.5 ' + n(8 * k) + ' Z', 'ln fl');
    s += l(x + 5 * k, y - 8 * k, x + 5 * k, y, 'ln2') + l(x + 55 * k, y - 8 * k, x + 55 * k, y, 'ln2');
    s += l(x + 28 * k, y - 5 * k, x + 32 * k, y - 1 * k, 'ln3');
    return s;
  }

  function cameraRig(x, y, k) {
    k = k || 1;
    return l(x, y, x, y - 22 * k, 'ln') + r(x - 7 * k, y - 30 * k, 15 * k, 8 * k, 'ln fl') +
      ci(x + 9 * k, y - 26 * k, 3.4 * k, 'ln fl') + l(x - 7 * k, y - 22 * k, x + 8 * k, y - 22 * k, 'ln2') +
      l(x, y - 22 * k, x - 10 * k, y, 'ln2') + l(x, y - 22 * k, x + 10 * k, y, 'ln2') +
      l(x, y - 22 * k, x, y, 'ln2');
  }

  function ringLight(x, y, k) {
    k = k || 1;
    return ci(x, y - 26 * k, 9 * k, 'ln fl') + ci(x, y - 26 * k, 5.5 * k, 'ln3') + l(x, y - 17 * k, x, y, 'ln2');
  }

  function mic(x, y, k) {
    k = k || 1;
    return l(x, y, x, y - 12 * k, 'ln2') + ci(x, y - 14 * k, 2.6 * k, 'ln fl') + l(x - 4 * k, y, x + 4 * k, y, 'ln2');
  }

  function vending(x, y, k) {
    k = k || 1;
    var s = r(x, y - 40 * k, 22 * k, 40 * k, 'ln fl') +
      r(x + 2 * k, y - 38 * k, 12 * k, 22 * k, 'ln2 fl') +
      r(x + 2 * k, y - 12 * k, 12 * k, 4 * k, 'ln2') +
      l(x + 4 * k, y - 16 * k, x + 12 * k, y - 16 * k, 'ln3');
    var i, j;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 2; j++) {
        s += r(x + 3.5 * k + i * 3.6 * k, y - 36 * k + j * 9 * k, 2.4 * k, 5 * k, 'ln3');
      }
    }
    return s;
  }

  function whiteboard(x, top, w, h, k) {
    k = k || 1;
    var s = r(x, top, w, h, 'ln fl');
    s += r(x + 6 * k, top + 6 * k, 14 * k, 8 * k, 'ln2');
    s += r(x + 30 * k, top + 4 * k, 12 * k, 8 * k, 'ln2');
    s += r(x + 50 * k, top + 12 * k, 14 * k, 8 * k, 'ln2');
    s += l(x + 20 * k, top + 10 * k, x + 30 * k, top + 8 * k, 'ln3');
    s += l(x + 42 * k, top + 8 * k, x + 50 * k, top + 16 * k, 'ln3');
    s += l(x + 8 * k, top + h - 8 * k, x + w - 10 * k, top + h - 8 * k, 'ln3');
    return s;
  }

  function board(x, top, w, h, cards) {
    var s = r(x, top, w, h, 'ln fl');
    var i, cw = w / cards;
    for (i = 0; i < cards; i++) {
      s += r(x + 3 + i * cw + 2, top + 4, cw - 7, h - 12, 'ln2 fl');
      s += ci(x + 3 + i * cw + cw / 2 - 1, top + h * 0.45, Math.max(2, h * 0.13), 'ln3');
      s += l(x + 5 + i * cw, top + h - 8, x + cw + i * cw - 4, top + h - 8, 'ln3');
    }
    return s;
  }

  function car(x, y, k) {
    k = k || 1;
    return path('M' + n(x + 2 * k) + ' ' + n(y - 2 * k) + ' l' + n(2 * k) + ' ' + n(-10 * k) +
      ' l' + n(7 * k) + ' ' + n(-8 * k) + ' l' + n(18 * k) + ' 0 l' + n(7 * k) + ' ' + n(8 * k) +
      ' l' + n(3 * k) + ' ' + n(0) + ' l0 ' + n(10 * k) + ' l' + n(-37 * k) + ' 0 Z', 'ln fl') +
      ci(x + 10 * k, y - 2 * k, 3.4 * k, 'ln fl') + ci(x + 32 * k, y - 2 * k, 3.4 * k, 'ln fl') +
      l(x + 11 * k, y - 20 * k, x + 30 * k, y - 20 * k, 'ln2') +
      l(x + 20 * k, y - 20 * k, x + 20 * k, y - 2 * k, 'ln2') +
      l(x + 2 * k, y - 12 * k, x + 7 * k, y - 12 * k, 'ln3');
  }

  function stairs(x, y0, y1) {
    var s = '';
    var cnt = 7;
    var step = (y1 - y0) / cnt;
    var w = 22;
    var i;
    s += l(x, y0 + 2, x, y1, 'ln3') + l(x + w, y0 + 2, x + w, y1, 'ln3');
    var d = 'M' + n(x) + ' ' + n(y1);
    for (i = 0; i < cnt; i++) {
      d += ' L' + n(x + w) + ' ' + n(y1 - step * i) + ' L' + n(x + w) + ' ' + n(y1 - step * (i + 1)) +
        ' L' + n(x) + ' ' + n(y1 - step * (i + 1));
    }
    s += path(d, 'ln2');
    s += l(x + 2, y1 - 8, x + w - 2, y0 + 12, 'ln3');
    return s;
  }

  function elevDoors(y, dark) {
    /* 벽면에 난 문 — 두 짝과 층 표시 */
    return r(59, y - 44, 10, 26, dark ? 'fl2 ln2' : 'fl ln2') +
      l(64, y - 44, 64, y - 18, 'ln3') +
      l(56, y - 46, 72, y - 46, 'ln2') +
      ci(64, y - 50, 1.1, 'fd');
  }

  function stool(x, y, k) {
    k = k || 1;
    return el(x, y - 12 * k, 4.6 * k, 1.6 * k, 'ln fl') +
      l(x - 3 * k, y - 11 * k, x - 4 * k, y, 'ln2') + l(x + 3 * k, y - 11 * k, x + 4 * k, y, 'ln2');
  }

  function fridgeCase(x, y, k) {
    k = k || 1;
    return r(x, y - 44 * k, 30 * k, 44 * k, 'ln fl') + l(x + 1 * k, y - 26 * k, x + 29 * k, y - 26 * k, 'ln2') +
      l(x + 4 * k, y - 40 * k, x + 26 * k, y - 40 * k, 'ln3') + l(x + 4 * k, y - 22 * k, x + 26 * k, y - 22 * k, 'ln3');
  }

  function mapWall(x, top, w, h) {
    var s = r(x, top, w, h, 'ln fl');
    s += path('M' + n(x + 6) + ' ' + n(top + h * 0.6) + ' c' + n(w * 0.18) + ' ' + n(-h * 0.2) + ' ' + n(w * 0.28) + ' ' + n(h * 0.16) + ' ' + n(w * 0.42) + ' ' + n(-h * 0.05) +
      ' c' + n(w * 0.18) + ' ' + n(-h * 0.18) + ' ' + n(w * 0.3) + ' ' + n(h * 0.1) + ' ' + n(w * 0.45) + ' ' + n(-h * 0.12), 'ln2');
    s += ci(x + w * 0.24, top + h * 0.4, 1.6, 'fd') + ci(x + w * 0.46, top + h * 0.62, 1.6, 'fd') + ci(x + w * 0.7, top + h * 0.34, 1.6, 'fd');
    return s;
  }

  function cabinet(x, y, w, h) {
    var s = r(x, y - h, w, h, 'ln fl');
    var i;
    for (i = 1; i < 3; i++) s += l(x, y - h + (h / 3) * i, x + w, y - h + (h / 3) * i, 'ln2');
    for (i = 0; i < 3; i++) s += l(x + w / 2 - 3, y - h + (h / 3) * i + h / 6, x + w / 2 + 3, y - h + (h / 3) * i + h / 6, 'ln3');
    return s;
  }

  function beanbag(x, y, k) {
    k = k || 1;
    return path('M' + n(x - 9 * k) + ' ' + n(y) + ' c' + n(2 * k) + ' ' + n(-12 * k) + ' ' + n(16 * k) + ' ' + n(-12 * k) + ' ' + n(18 * k) + ' 0 Z', 'ln fl') +
      path('M' + n(x - 6 * k) + ' ' + n(y - 8 * k) + ' c' + n(4 * k) + ' ' + n(3 * k) + ' ' + n(8 * k) + ' ' + n(3 * k) + ' ' + n(12 * k) + ' 0', 'ln3');
  }

  function divider(x, top, base, gapTop, gapBot) {
    return l(x, top, x, gapTop, 'ln') + l(x, gapBot, x, base, 'ln') +
      path('M' + n(x) + ' ' + n(top) + ' l-3 0 l0 ' + n(gapTop - top) + ' l6 0 l0 ' + n(gapTop - top) + ' Z', 'ln3');
  }

  function rug(x, y, w, k) {
    k = k || 1;
    return r(x, y - 1 * k, w, 1.2 * k, 'ln3') + l(x + 3 * k, y + 2.4 * k, x + w - 3 * k, y + 2.4 * k, 'ln3');
  }

  function box(x, y, w, h) {
    return r(x, y - h, w, h, 'ln fl') + l(x, y - h, x + w, y, 'ln3');
  }

  function wallWin(x, top, w, h, panes) {
    panes = panes || 3;
    var s = r(x, top, w, h, 'fl ln');
    var i;
    for (i = 1; i < panes; i++) s += l(x + (w / panes) * i, top, x + (w / panes) * i, top + h, 'ln2');
    s += l(x, top + h / 2, x + w, top + h / 2, 'ln2');
    s += l(x - 2, top + h, x + w + 2, top + h, 'ln');
    s += l(x + 3, top + 6, x + 8, top + 2, 'ln3');
    return s;
  }

  function wallClock(x, top, r) {
    r = r || 5;
    return ci(x, top + r, r, 'ln fl') + ci(x, top + r, 0.9, 'fd') +
      l(x, top + r, x, top + r - r * 0.7, 'ln2') + l(x, top + r, x + r * 0.6, top + r, 'ln2');
  }

  function shelfDeco(x, top, w) {
    return r(x, top, w, 2, 'ln2') + plant(x + 4, top, 0.55) + box(x + 14, top, 8, 7) + box(x + 24, top, 6, 5);
  }

  /* ── 층별 단면 장면 ────────────────────────────────────────────────────
     y = 층 띠의 윗선. 바닥선 b = y + 78, 천장 c = y + 7.
     안쪽 x 100..684 (왼쪽 70..96 엘리베이터 문, 오른쪽 690..728 계단)
     ──────────────────────────────────────────────────────────────────── */

  var SCENES = {};

  SCENES.rf = function (y) {
    var b = y + 78, s = '';
    /* 밤하늘 */
    s += r(68, 6, 664, 72, 'fl');
    var stars = [[96, 20], [140, 32], [186, 15], [232, 38], [268, 22], [318, 30], [366, 16],
      [404, 36], [452, 24], [498, 14], [546, 32], [592, 20], [640, 34], [676, 18], [712, 28]];
    var i;
    for (i = 0; i < stars.length; i++) {
      s += ci(stars[i][0], stars[i][1], i % 2 ? 1.1 : 1.7, 'star');
    }
    s += path('M704 22 a10 10 0 1 0 8 16 a8 8 0 1 1 -8 -16 Z', 'ln2');
    /* 멀리 보이는 도시 */
    s += path('M92 44 l18 0 l0 -6 l10 0 l0 6 l14 0 l0 -10 l9 0 l0 10 l20 0 l0 -5 l13 0 l0 5 l16 0 l0 -8 l11 0 l0 8 l22 0 l0 -4 l14 0 l0 4 l18 0 l0 -7 l12 0 l0 7 l24 0 l0 -5 l15 0 l0 5 l20 0 l0 -9 l10 0 l0 9 l26 0 l0 -6 l13 0 l0 6 l22 0 l0 -4 l16 0 l0 4 l20 0 l0 -7 l12 0 l0 7 l24 0 l0 -5 l14 0 l0 5 l20 0 l0 -8 l11 0 l0 8 l22 0 l0 -4 l16 0 l0 4 l18 0', 'ln3');
    /* 난간 */
    s += l(100, 46, 684, 46, 'ln') + l(100, 49, 684, 49, 'ln2');
    var x;
    for (x = 104; x < 684; x += 46) s += l(x, 49, x, b, 'ln2');
    /* 전구 줄 */
    s += path('M100 34 Q 230 52 360 34 T 620 36', 'ln3');
    for (i = 0; i < 6; i++) {
      x = 132 + i * 88;
      s += ci(x, 42 + (i % 2) * 3, 1.8, 'fl ln2');
    }
    /* 야외 테이블 둘 */
    s += el(176, b - 14, 16, 4.2, 'ln fl') + l(176, b - 14, 176, b, 'ln2') + l(168, b, 184, b, 'ln2');
    s += stool(146, b, 1) + stool(206, b, 1);
    s += el(244, b - 14, 13, 3.6, 'ln fl') + l(244, b - 14, 244, b, 'ln2') + l(237, b, 251, b, 'ln2');
    s += stool(220, b, 1);
    /* 화분 */
    s += plant(300, b, 1.2, true) + plant(330, b, 0.9) + plant(360, b, 1.1);
    s += r(286, b - 8, 88, 8, 'ln fl');
    /* 별 보는 사람 */
    s += g(person(520, b, 1, 'stand'), 'bob');
    s += l(520, b - 18, 512, 49, 'ln3');
    /* 물탱크 */
    s += path('M562 26 l6 -8 l20 0 l6 8 Z', 'ln fl') + r(560, 26, 36, 16, 'ln fl') +
      l(560, 34, 596, 34, 'ln2') + l(566, 42, 566, b, 'ln2') + l(590, 42, 590, b, 'ln2') +
      l(566, 46, 590, 46, 'ln3');
    /* 작은 화분 몇 개 */
    s += plant(640, b, 1.15, true) + plant(664, b, 0.85);
    return s;
  };

  SCENES.f10 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    s += divider(318, c, b, b - 26, b);
    s += divider(498, c, b, b - 26, b);
    /* 도서실 */
    s += shelf(108, b, 82, 54, 4);
    s += desk(206, b, 74, 1) + chair(224, b, 1) + person(226, b, 1) + papers(246, b - 19, 1);
    s += pendant(206, c, 10, 0.8);
    /* 음악실 */
    s += piano(340, b, 1);
    s += stool(322, b, 1) + person(322, b, 1);
    s += l(430, b, 430, b - 18, 'ln2') + r(424, b - 26, 13, 8, 'ln fl');
    s += pendant(410, c, 12, 0.8);
    /* 그림·체험실 */
    s += easel(556, b, 1.15);
    s += stool(600, b, 1) + person(600, b, 1);
    s += r(618, b - 14, 40, 5, 'ln2 fl') + cup(628, b - 14, 1) + cup(640, b - 14, 1);
    s += shelf(660, b, 22, 30, 2);
    /* 창 */
    s += windowPane(214, c + 12, 34, 22, 1);
    s += r(118, c + 10, 30, 20, 'ln fl') + l(126, c + 24, 142, c + 16, 'ln3') + ci(134, c + 18, 2, 'ln3');
    s += shelfDeco(330, c + 13, 42);
    s += board(600, c + 8, 66, 26, 2);
    s += person(300, b, 1, 'stand') + pendant(540, c, 12, 0.8);
    return s;
  };

  SCENES.f9 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 캐릭터 데스크 */
    s += desk(106, b, 124, 1);
    s += monitor(114, b - 19, 40, 24, 1, 'text') + monitor(160, b - 19, 40, 24, 1, 'text');
    s += person(196, b, 1) + chair(196, b, 1);
    s += papers(112, b - 19, 1) + cup(220, b - 19, 1);
    /* 마이크 */
    s += l(246, b, 246, b - 34, 'ln2') + l(246, b - 34, 258, b - 30, 'ln2') + ci(260, b - 29, 3, 'ln fl');
    s += l(246, b, 238, b, 'ln2') + l(246, b, 254, b, 'ln2');
    /* 세계관 보드 */
    s += board(300, c + 10, 148, 46, 4);
    /* 사운드 데스크 */
    s += desk(482, b, 118, 1);
    s += monitor(490, b - 19, 52, 26, 1, 'wave') + monitor(548, b - 19, 30, 20, 1, 'bars');
    s += person(508, b, 1) + chair(508, b, 1);
    s += r(560, b - 34, 20, 15, 'ln2 fl') + ci(570, b - 26, 3, 'ln3');
    /* 선반과 화분 */
    s += shelf(616, b, 60, 40, 3);
    s += plant(600, b, 0.9);
    s += shelfDeco(112, c + 11, 48);
    s += wallClock(292, c + 8, 5);
    s += r(552, c + 10, 30, 22, 'ln fl') + ci(567, c + 19, 4, 'ln3');
    s += pendant(200, c, 14, 0.9) + pendant(520, c, 16, 0.9);
    return s;
  };

  SCENES.f8 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 드로잉 데스크 — 기울인 판 */
    s += l(108, b, 108, b - 30, 'ln') + l(208, b, 208, b - 26, 'ln') +
      path('M104 ' + n(b - 30) + ' L212 ' + n(b - 24) + ' L212 ' + n(b - 32) + ' L104 ' + n(b - 38) + ' Z', 'ln fl') +
      l(120, b - 36, 118, b, 'ln2') + l(196, b - 30, 198, b, 'ln2');
    s += r(138, b - 42, 26, 8, 'ln fl') + l(140, b - 40, 162, b - 37, 'ln3');
    s += stool(232, b, 1) + person(232, b, 1);
    /* 핀보드 */
    s += board(266, c + 8, 108, 44, 3);
    /* 액정 타블렛 */
    s += l(398, b, 398, b - 24, 'ln2') +
      path('M386 ' + n(b - 24) + ' L436 ' + n(b - 21) + ' L438 ' + n(b - 30) + ' L388 ' + n(b - 33) + ' Z', 'ln fl') +
      l(400, b - 32, 404, b - 25, 'ln3');
    s += chair(420, b, 0.9);
    /* 프린터 */
    s += r(456, b - 26, 54, 26, 'ln fl') + l(456, b - 20, 510, b - 20, 'ln2') +
      r(464, b - 34, 34, 8, 'ln fl') + l(466, b - 26, 496, b - 26, 'ln3');
    /* 색 견본 */
    var i;
    for (i = 0; i < 5; i++) s += r(526 + i * 7, c + 16, 4, 22, 'ln2');
    /* 롤 종이와 화분 */
    s += l(590, b, 590, b - 38, 'ln2') + l(600, b, 600, b - 34, 'ln2') + l(574, b, 574, b - 30, 'ln2') +
      l(590, b - 38, 600, b - 34, 'ln3') + l(574, b - 30, 590, b - 38, 'ln3');
    s += plant(640, b, 1.15, true);
    s += wallClock(238, c + 8, 5);
    s += wallWin(430, c + 10, 48, 26, 2);
    s += r(596, c + 8, 40, 26, 'ln fl') + l(602, c + 18, 630, c + 18, 'ln3');
    s += person(544, b, 1, 'stand') + pendant(250, c, 14, 0.8) + pendant(474, c, 14, 0.8);
    return s;
  };

  SCENES.f7 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 배식 카운터 */
    s += r(104, b - 26, 150, 26, 'ln fl') + l(104, b - 26, 254, b - 26, 'ln') +
      l(104, b - 14, 254, b - 14, 'ln2');
    s += r(118, b - 32, 20, 6, 'ln2 fl') + r(146, b - 32, 20, 6, 'ln2 fl') + r(174, b - 32, 20, 6, 'ln2 fl');
    s += l(210, b - 32, 210, b - 58, 'ln2') + l(210, b - 58, 246, b - 52, 'ln3');
    /* 메뉴판 */
    s += r(112, c + 8, 92, 26, 'ln fl') + l(120, c + 15, 190, c + 15, 'ln3') + l(120, c + 21, 176, c + 21, 'ln3') + l(120, c + 27, 184, c + 27, 'ln3');
    /* 긴 식탁 */
    s += table(300, b, 226, 1.12);
    s += l(300, b - 15, 526, b - 15, 'ln2');
    var i, x;
    for (i = 0; i < 4; i++) {
      x = 318 + i * 54;
      s += chair(x, b, 1.15, true) + chair(x + 18, b - 15, 1.05);
    }
    s += cup(352, b - 19, 1.1) + cup(408, b - 19, 1.1) + cup(462, b - 19, 1.1);
    s += r(380, b - 21, 26, 3, 'ln2 fl');
    /* 펜던트 조명 */
    s += pendant(330, c, 14, 1) + pendant(424, c, 16, 1) + pendant(512, c, 13, 1);
    /* 간식 선반 */
    s += shelf(576, b, 86, 44, 3);
    s += plant(560, b, 0.9);
    s += wallClock(286, c + 8, 5);
    s += r(556, c + 10, 30, 20, 'ln fl') + l(560, c + 20, 582, c + 20, 'ln3');
    s += ci(360, b - 14, 2.8, 'ln fl') + ci(452, b - 14, 2.8, 'ln fl');
    s += person(282, b, 1, 'stand') + pendant(300, c, 18, 0.8);
    return s;
  };

  SCENES.f6 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 세 개의 데스크 */
    s += desk(104, b, 88, 1) + monitor(112, b - 19, 44, 26, 1, 'text') + chair(142, b, 1);
    s += desk(216, b, 88, 1) + monitor(224, b - 19, 40, 25, 1, 'bars') + person(258, b, 1) + chair(258, b, 1);
    s += desk(328, b, 88, 1) + monitor(336, b - 19, 34, 22, 1, 'text') + chair(356, b, 1);
    s += r(356, b - 26, 8, 22, 'ln2 fl');
    /* 서버 랙 */
    s += r(436, b - 50, 34, 50, 'ln fl');
    var i;
    for (i = 0; i < 5; i++) s += l(440, b - 44 + i * 9, 466, b - 44 + i * 9, 'ln3') + ci(464, b - 44 + i * 9, 1, 'fd');
    /* 화이트보드 */
    s += whiteboard(492, c + 10, 172, 44, 1);
    /* 화분과 공기청정기 */
    s += plant(680, b, 0.9);
    s += r(616, b - 30, 22, 30, 'ln fl') + l(620, b - 24, 634, b - 24, 'ln3');
    s += wallClock(476, c + 8, 5);
    s += shelfDeco(112, c + 12, 46);
    s += r(556, c + 8, 26, 20, 'ln fl');
    s += person(560, b, 1, 'stand') + pendant(200, c, 12, 0.8);
    return s;
  };

  SCENES.f5 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 촬영 */
    s += cameraRig(130, b, 1.1);
    s += ringLight(176, b, 1);
    /* 편집 데스크 */
    s += desk(226, b, 150, 1);
    s += monitor(234, b - 19, 58, 28, 1, 'bars') + monitor(300, b - 19, 58, 28, 1, 'text');
    s += person(266, b, 1) + chair(266, b, 1);
    s += mic(330, b - 19, 1);
    /* 원고 선반 */
    s += shelf(408, b, 92, 48, 3);
    /* REC 사인 */
    s += r(516, c + 10, 30, 14, 'ln fl') + ci(523, c + 17, 2.4, 'fd') + l(530, c + 17, 540, c + 17, 'ln3');
    /* 독서 의자와 화분 */
    s += sofa(566, b, 66, 1.1, true);
    s += lamp(648, b, 1);
    s += plant(674, b, 0.8);
    s += wallWin(96, c + 10, 48, 26, 2);
    s += wallClock(392, c + 8, 5);
    s += r(344, c + 10, 40, 26, 'ln fl') + l(350, c + 20, 378, c + 20, 'ln3') + l(350, c + 27, 370, c + 27, 'ln3');
    s += person(200, b, 1, 'stand') + pendant(300, c, 16, 0.8);
    return s;
  };

  SCENES.f4 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    s += rug(120, b, 320, 1);
    /* 마주 보는 소파 */
    s += sofa(118, b, 104, 1, false);
    s += sofa(300, b, 104, 1, true);
    s += table(228, b - 4, 62, 1) + cup(240, b - 17, 1) + cup(262, b - 17, 1) + r(248, b - 20, 18, 3, 'ln2 fl');
    /* 낮잠 포드 */
    s += path('M430 ' + n(b) + ' c0 ' + n(-34) + ' 18 ' + n(-40) + ' 40 ' + n(-40) + ' c22 0 40 6 40 ' + n(40), 'ln fl');
    s += path('M438 ' + n(b - 6) + ' c4 ' + n(-18) + ' 20 ' + n(-22) + ' 30 ' + n(-20), 'ln2');
    s += l(430, b - 40, 430, b, 'ln') + l(510, b - 40, 510, b, 'ln');
    /* 놀이 코너 */
    s += r(540, b - 20, 54, 6, 'ln fl') + l(544, b - 20, 544, b, 'ln2') + l(590, b - 20, 590, b, 'ln2');
    s += r(548, b - 24, 14, 4, 'ln2 fl') + r(566, b - 24, 14, 4, 'ln2 fl');
    s += shelf(608, b, 60, 34, 2);
    /* 조명과 화분 */
    s += lamp(402, b, 1.05);
    s += plant(670, b, 1.1, true);
    s += pendant(270, c, 14, 0.9);
    s += r(544, c + 10, 58, 26, 'ln fl') + l(548, c + 22, 598, c + 22, 'ln3');
    s += wallClock(486, c + 8, 5);
    s += person(168, b - 6, 1, 'sit') + pendant(470, c, 16, 0.8);
    return s;
  };

  SCENES.f3 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 조사 테이블 */
    s += desk(104, b, 156, 1);
    s += papers(112, b - 19, 1.3) + papers(132, b - 19, 1.1);
    s += ci(160, b - 30, 6, 'ln fl') + l(166, b - 26, 174, b - 21, 'ln2');
    s += chair(140, b, 1) + person(140, b, 1);
    s += pendant(150, c, 12, 0.8) + pendant(220, c, 10, 0.7);
    /* 기록 서가 */
    s += shelf(280, b, 108, 58, 5);
    /* 벽면 지도 */
    s += mapWall(414, c + 8, 118, 40);
    /* 문서·데이터 자리 */
    s += r(548, b - 24, 52, 24, 'ln fl') + cabinet(608, b, 52, 40);
    s += desk(556, b - 24, 44, 0.8) + r(560, b - 34, 14, 10, 'ln2 fl');
    s += chair(560, b - 24, 0.8);
    s += plant(676, b, 0.8);
    s += wallClock(390, c + 8, 5);
    s += shelfDeco(110, c + 12, 50);
    s += person(404, b, 1, 'stand') + pendant(330, c, 10, 0.8);
    return s;
  };

  SCENES.f2 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 팀장석 */
    s += desk(104, b, 112, 1.05);
    s += monitor(112, b - 20, 40, 24, 1.05, 'text') + papers(160, b - 20, 1);
    s += r(128, b - 3, 34, 3, 'ln2 fl');
    s += g(person(190, b, 1.05), 'bob') + chair(190, b, 1.05);
    s += chair(120, b, 1, true);
    /* 운영지원 데스크 */
    s += desk(246, b, 76, 1) + monitor(252, b - 19, 32, 20, 1, 'text');
    s += r(300, b - 25, 16, 6, 'ln2 fl') + r(300, b - 31, 16, 5, 'ln2 fl');
    s += person(272, b, 1) + chair(272, b, 1);
    s += desk(330, b, 76, 1) + monitor(336, b - 19, 30, 19, 1, 'text') + chair(356, b, 1);
    /* 회의실 — 유리 칸막이 */
    s += l(432, c, 432, b, 'ln') + path('M432 ' + n(c) + ' l6 0 l0 ' + n(b - c) + ' l-6 0 Z', 'ln3');
    s += r(444, b - 26, 120, 26, 'ln fl') + l(444, b - 26, 564, b - 26, 'ln');
    s += chair(466, b, 0.9) + chair(506, b, 0.9) + chair(544, b, 0.9);
    s += r(470, b - 22, 18, 3, 'ln2 fl') + r(510, b - 22, 18, 3, 'ln2 fl');
    s += whiteboard(580, c + 10, 88, 34, 0.9);
    /* 시계 */
    s += ci(400, c + 16, 7, 'ln fl') + l(400, c + 16, 400, c + 11, 'ln2') + l(400, c + 16, 404, c + 18, 'ln2');
    s += plant(672, b, 1, true);
    s += shelfDeco(112, c + 12, 44);
    s += r(302, c + 12, 38, 20, 'ln fl') + l(306, c + 22, 332, c + 22, 'ln3');
    s += person(440, b, 1, 'stand');
    return s;
  };

  SCENES.f1 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 안내 데스크 */
    s += r(104, b - 24, 92, 24, 'ln fl') + l(104, b - 24, 196, b - 24, 'ln') +
      r(104, b - 38, 20, 38, 'ln fl') + l(104, b - 32, 124, b - 32, 'ln2');
    s += person(150, b - 24, 1) + chair(150, b - 24, 1);
    s += r(130, b - 34, 26, 10, 'ln2 fl');
    /* 안내판 */
    s += r(216, c + 12, 54, 34, 'ln fl') + l(222, c + 19, 262, c + 19, 'ln3') + l(222, c + 25, 254, c + 25, 'ln3') + l(222, c + 31, 258, c + 31, 'ln3');
    /* 기다리는 자리 */
    s += chair(300, b, 1.1, true) + chair(326, b, 1.1, true) + chair(352, b, 1.1, true);
    s += table(372, b, 46, 1) + cup(384, b - 15, 1) + papers(398, b - 15, 1);
    /* 자판기 */
    s += vending(560, b, 1.1);
    s += r(548, b - 46, 12, 6, 'ln2 fl');
    /* 출입문 */
    s += r(626, b - 40, 50, 40, 'ln fl') + l(651, b - 40, 651, b, 'ln') + ci(646, b - 20, 1.4, 'ln2') + ci(656, b - 20, 1.4, 'ln2');
    s += l(620, b, 682, b, 'ln2') + l(624, b + 2, 678, b + 2, 'ln3');
    /* 바닥 타일 */
    var i;
    for (i = 0; i < 8; i++) s += l(110 + i * 26, b, 118 + i * 26, b - 3, 'ln3');
    s += plant(520, b, 1.15, true);
    s += wallClock(300, c + 8, 5);
    s += r(474, c + 10, 34, 22, 'ln fl') + l(478, c + 20, 502, c + 20, 'ln3');
    s += cup(168, b - 24, 1) + papers(180, b - 24, 0.9);
    s += person(600, b, 1, 'stand');
    return s;
  };

  SCENES.b1 = function (y) {
    var b = y + 78, s = '';
    /* 잠긴 층 — 안이 보이지 않게 빗금 */
    s += r(68, y + 7, 664, 71, 'lockveil');
    /* 희미하게 보이는 가구 실루엣 */
    s += g(desk(140, b - 6, 80, 1) + chair(180, b - 6, 1) + shelf(300, b - 6, 60, 40, 3) +
      plant(420, b - 6, 1.1) + r(480, b - 30, 60, 24, 'ln2'), 'lockghost');
    /* 문 */
    s += r(360, b - 52, 50, 52, 'ln fl2') + l(385, b - 52, 385, b, 'ln2');
    s += ci(376, b - 26, 1.6, 'fa') + ci(394, b - 26, 1.6, 'fa');
    /* 자물쇠 */
    s += r(376, b - 44, 18, 14, 'fa fl') + path('M380 ' + n(b - 44) + ' c0 -8 10 -8 10 0', 'fa');
    s += ci(385, b - 37, 1.6, 'fa');
    /* 매달린 전구 */
    s += l(560, y + 7, 560, y + 30, 'ln2') + ci(560, y + 33, 4, 'fl ln2') +
      path('M560 ' + n(y + 37) + ' l-6 6 M560 ' + n(y + 37) + ' l6 6 M560 ' + n(y + 37) + ' l0 8', 'ln3');
    /* 출입 제한 테이프 */
    s += path('M300 ' + n(b - 10) + ' L470 ' + n(b - 34) + ' L474 ' + n(b - 26) + ' L304 ' + n(b - 2) + ' Z', 'fa fl');
    s += path('M304 ' + n(b - 34) + ' L474 ' + n(b - 10) + ' L470 ' + n(b - 2) + ' L300 ' + n(b - 26) + ' Z', 'fa');
    return s;
  };

  SCENES.b2 = function (y) {
    var b = y + 78, c = y + 7, s = '';
    /* 천장 배관 */
    s += l(100, c + 6, 684, c + 6, 'ln2') + l(100, c + 11, 684, c + 11, 'ln3');
    var i;
    for (i = 0; i < 5; i++) s += l(140 + i * 110, c + 6, 140 + i * 110, c + 12, 'ln3');
    /* 주차선 */
    s += l(100, b - 1, 684, b - 1, 'ln');
    for (i = 0; i < 3; i++) s += l(160 + i * 130, b - 1, 160 + i * 130, b - 8, 'ln2');
    /* 차 */
    s += car(180, b - 1, 1.5);
    /* 기둥 */
    s += r(430, b - 58, 16, 58, 'ln fl2') + l(438, b - 50, 438, b - 10, 'ln3');
    /* 충전기 */
    s += r(580, b - 40, 18, 40, 'ln fl') + l(584, b - 34, 594, b - 34, 'ln2') +
      path('M598 ' + n(b - 30) + ' c8 0 8 10 0 10', 'ln2');
    /* 진입로 화살표 */
    s += path('M630 ' + n(b - 12) + ' l24 0 m-8 -6 l8 6 l-8 6', 'ln2');
    s += r(650, b - 6, 30, 4, 'ln3');
    /* 화분 대신 박스 */
    s += box(320, b - 1, 18, 14);
    s += pendant(250, c, 10, 1) + pendant(420, c, 10, 1) + pendant(540, c, 10, 1);
    s += r(430, 1040, 16, 9, 'ln2 fl') + l(433, 1044, 443, 1044, 'ln3');
    return s;
  };

  /* ── 확대 도면 ──────────────────────────────────────────────────────────
     상세 캔버스 700 × 300. 바닥 258, 천장 24, 벽 28..672.
     가구는 k ≈ 2.0 으로 크게 그립니다.
     ──────────────────────────────────────────────────────────────────── */

  var BASE = 258;
  var CEIL = 24;
  var L = 30;
  var R = 670;

  function wallTop() {
    return l(L, CEIL, R, CEIL, 'ln') + l(L, CEIL + 6, R, CEIL + 6, 'ln2');
  }

  function wallSide(x) {
    return l(x, CEIL, x, BASE, 'ln') + l(x + 6, CEIL, x + 6, BASE, 'ln2');
  }

  function floorLine() {
    return r(L - 6, BASE, R - L + 12, 8, 'slab');
  }

  function partition(x, gapA, gapB) {
    return l(x, CEIL + 6, x, gapA, 'ln') + l(x, gapB, x, BASE, 'ln') +
      l(x + 3, CEIL + 6, x + 3, gapA, 'ln2') + l(x + 3, gapB, x + 3, BASE, 'ln2');
  }

  function detailShell(parts) {
    return wallTop() + wallSide(L) + wallSide(R) + floorLine() + parts +
      l(L - 6, BASE + 14, R + 6, BASE + 14, 'ln3') +
      l(L - 6, BASE + 10, L - 6, BASE + 18, 'ln2') + l(R + 6, BASE + 10, R + 6, BASE + 18, 'ln2');
  }

  var DETAIL = {};

  function detailBase(body) {
    return wallTop() + wallSide(L) + wallSide(R) + floorLine() + body +
      l(L - 6, BASE + 16, R + 6, BASE + 16, 'ln3') +
      l(L - 6, BASE + 12, L - 6, BASE + 20, 'ln2') +
      l(R + 6, BASE + 12, R + 6, BASE + 20, 'ln2');
  }

  DETAIL.rf = function () {
    var s = '', i;
    var stars = [[60, 60], [110, 96], [160, 50], [210, 84], [270, 58], [330, 100], [390, 54],
      [450, 88], [510, 60], [570, 96], [620, 52], [650, 110]];
    for (i = 0; i < stars.length; i++) s += ci(stars[i][0], stars[i][1], i % 3 ? 1.6 : 2.4, 'star');
    s += path('M600 60 a22 22 0 1 0 16 34 a18 18 0 1 1 -16 -34 Z', 'ln2');
    s += path('M40 150 l40 0 l0 -18 l22 0 l0 18 l30 0 l0 -26 l18 0 l0 26 l44 0 l0 -14 l26 0 l0 14 l36 0 l0 -22 l20 0 l0 22 l52 0 l0 -10 l30 0 l0 10 l46 0 l0 -18 l22 0 l0 18 l40 0 l0 -12 l34 0 l0 12 l44 0 l0 -20 l26 0 l0 20 l40 0', 'ln3');
    s += l(40, 158, 660, 158, 'ln') + l(40, 163, 660, 163, 'ln2');
    for (i = 0; i < 12; i++) s += l(44 + i * 52, 163, 44 + i * 52, BASE, 'ln2');
    /* 야외 테이블 */
    s += el(170, 218, 42, 11, 'ln fl') + l(170, 218, 170, BASE, 'ln2') + l(138, BASE, 202, BASE, 'ln2');
    s += stool(112, BASE, 2) + stool(228, BASE, 2) + cup(170, 214, 2);
    /* 텃밭 화분 */
    s += r(300, 240, 120, 18, 'ln fl');
    s += plant(322, 240, 2.4, true) + plant(366, 240, 1.9) + plant(402, 240, 2.1);
    /* 별 보는 난간 */
    s += l(470, 196, 640, 196, 'ln') + l(470, 201, 640, 201, 'ln2');
    for (i = 0; i < 4; i++) s += l(480 + i * 44, 201, 480 + i * 44, BASE, 'ln2');
    s += person(552, BASE, 2, 'stand');
    s += l(552, 216, 546, 198, 'ln3');
    s += plant(624, BASE, 1.7, true);
    s += pendant(250, CEIL + 6, 26, 2) + pendant(420, CEIL + 6, 34, 2);
    return detailBase(s);
  };

  DETAIL.f10 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 도서실 */
    s += shelf(44, BASE, 96, 150, 5);
    s += desk(168, BASE, 88, 2) + chair(188, BASE, 2) + person(188, BASE, 2) + papers(206, BASE - 38, 1.6);
    s += windowPane(176, 54, 62, 44, 1.6);
    /* 음악실 */
    s += piano(320, BASE, 1.7) + stool(310, BASE, 1.8) + person(310, BASE, 1.8);
    s += l(430, BASE, 430, 200, 'ln2') + r(418, 186, 26, 16, 'ln fl');
    /* 그림·체험실 */
    s += easel(536, BASE, 2.1) + stool(600, BASE, 1.8) + person(600, BASE, 1.8);
    s += r(618, 240, 44, 8, 'ln2 fl') + cup(628, 240, 1.6);
    return detailBase(s);
  };

  DETAIL.f9 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 캐릭터 데스크 */
    s += desk(44, BASE, 190, 2) + monitor(56, BASE - 38, 62, 40, 2, 'text') + monitor(130, BASE - 38, 62, 40, 2, 'text');
    s += person(210, BASE, 1.9) + chair(210, BASE, 1.9) + cup(60, BASE - 38, 1.6);
    /* 사운드 부스 */
    s += l(320, BASE, 320, 186, 'ln2') + path('M320 186 l22 8', 'ln2') + ci(344, 196, 5, 'ln fl');
    s += desk(360, BASE, 100, 1.8) + monitor(368, BASE - 34, 84, 40, 1.8, 'wave');
    s += r(310, 196, 26, 20, 'ln2 fl') + ci(323, 206, 4, 'ln3');
    /* 플레이리스트 보드 */
    s += board(500, 56, 150, 80, 3);
    s += shelf(500, BASE, 68, 84, 3) + plant(600, BASE, 1.7, true);
    return detailBase(s);
  };

  DETAIL.f8 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 드로잉 데스크 */
    s += l(52, BASE, 52, 190, 'ln') + l(244, BASE, 244, 198, 'ln') +
      path('M44 190 L250 200 L250 184 L44 174 Z', 'ln fl');
    s += r(104, 166, 54, 18, 'ln fl') + l(108, 178, 152, 170, 'ln3');
    s += stool(160, BASE, 1.9) + person(160, BASE, 1.9);
    /* 굿즈·스톡 선반 */
    s += board(300, 56, 130, 76, 3);
    s += shelf(300, BASE, 110, 96, 4) + box(430, BASE, 26, 22);
    /* 프린트 코너 */
    s += r(500, 200, 100, 58, 'ln fl') + l(500, 216, 600, 216, 'ln2') + r(514, 178, 60, 18, 'ln fl');
    s += r(620, 56, 30, 44, 'ln2');
    var i;
    for (i = 0; i < 5; i++) s += r(624 + (i % 2) * 0, 60 + i * 8, 22, 4, 'ln3');
    s += plant(640, BASE, 1.6, true);
    return detailBase(s);
  };

  DETAIL.f7 = function () {
    var s = '', i;
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 긴 식탁 */
    s += table(46, BASE, 198, 2);
    for (i = 0; i < 2; i++) {
      s += chair(86 + i * 62, BASE, 1.9, true) + chair(102 + i * 62, BASE - 26, 1.7);
    }
    s += cup(90, BASE - 26, 1.7) + cup(156, BASE - 26, 1.7);
    s += pendant(140, CEIL + 6, 34, 2);
    /* 배식 카운터 */
    s += r(300, 208, 150, 50, 'ln fl') + l(300, 208, 450, 208, 'ln') + l(300, 232, 450, 232, 'ln2');
    s += r(316, 194, 34, 14, 'ln2 fl') + r(360, 194, 34, 14, 'ln2 fl') + r(404, 194, 34, 14, 'ln2 fl');
    s += r(330, 56, 96, 34, 'ln fl') + l(338, 66, 418, 66, 'ln3') + l(338, 78, 402, 78, 'ln3');
    /* 간식 코너 */
    s += shelf(496, BASE, 84, 96, 3);
    s += r(594, 214, 46, 44, 'ln fl') + l(594, 228, 640, 228, 'ln2');
    s += plant(486, BASE, 1.4);
    return detailBase(s);
  };

  DETAIL.f6 = function () {
    var s = '', i;
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 게임 데스크 */
    s += desk(44, BASE, 176, 2) + monitor(56, BASE - 38, 74, 44, 2, 'text') + monitor(140, BASE - 38, 56, 34, 2, 'text');
    s += person(196, BASE, 1.9) + chair(196, BASE, 1.9) + papers(56, BASE - 38, 1.6);
    /* 앱 테스트 베드 */
    s += desk(300, BASE, 150, 1.9) + monitor(310, BASE - 36, 56, 34, 1.9, 'bars');
    s += r(380, 208, 16, 50, 'ln2 fl') + r(404, 214, 26, 44, 'ln fl');
    for (i = 0; i < 4; i++) s += l(408, 224 + i * 9, 426, 224 + i * 9, 'ln3');
    s += chair(330, BASE, 1.7);
    /* 화이트보드 */
    s += whiteboard(498, 56, 150, 86, 1.7);
    s += plant(600, BASE, 1.7, true);
    return detailBase(s);
  };

  DETAIL.f5 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 편집 데스크 */
    s += desk(44, BASE, 190, 2) + monitor(56, BASE - 38, 76, 40, 2, 'bars') + monitor(138, BASE - 38, 76, 40, 2, 'text');
    s += person(196, BASE, 1.9) + chair(196, BASE, 1.9) + mic(60, BASE - 38, 1.6);
    /* 촬영 스튜디오 */
    s += cameraRig(330, BASE, 2.2) + ringLight(404, BASE, 2);
    s += r(316, 56, 40, 20, 'ln fl') + ci(326, 66, 4, 'fd') + l(336, 66, 350, 66, 'ln3');
    /* 원고 선반 */
    s += shelf(496, BASE, 88, 128, 4);
    s += sofa(596, BASE, 70, 1.6, true) + lamp(492, BASE, 1.7);
    return detailBase(s);
  };

  DETAIL.f4 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 소파 자리 */
    s += rug(44, BASE, 210, 1.5);
    s += sofa(48, BASE, 92, 1.7, false) + sofa(150, BASE, 92, 1.7, true);
    s += table(110, BASE - 6, 64, 1.7) + cup(122, BASE - 26, 1.6) + cup(144, BASE - 26, 1.6);
    s += pendant(140, CEIL + 6, 34, 1.8);
    /* 낮잠 포드 */
    s += path('M300 ' + n(BASE) + ' c0 ' + n(-62) + ' 32 ' + n(-74) + ' 74 ' + n(-74) + ' c42 0 74 12 74 ' + n(74), 'ln fl');
    s += path('M316 ' + n(222) + ' c8 ' + n(-28) + ' 38 ' + n(-36) + ' 54 ' + n(-32), 'ln2');
    s += l(300, 194, 300, BASE, 'ln') + l(448, 194, 448, BASE, 'ln');
    s += lamp(464, BASE, 1.7);
    /* 놀이 코너 */
    s += shelf(496, BASE, 90, 92, 3);
    s += r(596, 224, 60, 8, 'ln fl') + l(600, 224, 600, BASE, 'ln2') + l(652, 224, 652, BASE, 'ln2');
    s += r(604, 214, 18, 6, 'ln2 fl') + r(628, 214, 18, 6, 'ln2 fl');
    s += plant(590, BASE, 1.4);
    return detailBase(s);
  };

  DETAIL.f3 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 조사 테이블 */
    s += desk(44, BASE, 196, 2) + papers(56, BASE - 38, 2.2) + papers(104, BASE - 38, 1.8);
    s += ci(180, 196, 14, 'ln fl') + l(194, 206, 220, 226, 'ln2');
    s += chair(120, BASE, 1.9) + person(120, BASE, 1.9);
    s += pendant(150, CEIL + 6, 34, 1.8);
    /* 문서·데이터 자리 */
    s += mapWall(300, 56, 150, 66);
    s += desk(310, BASE, 110, 1.8) + monitor(320, BASE - 34, 50, 30, 1.8, 'text') + chair(350, BASE, 1.7);
    s += cabinet(430, BASE, 34, 90);
    /* 기록 서가 */
    s += shelf(500, BASE, 140, 170, 6);
    return detailBase(s);
  };

  DETAIL.f2 = function () {
    var s = '';
    s += l(476, CEIL + 6, 476, BASE, 'ln') + l(482, CEIL + 6, 482, BASE, 'ln3');
    /* 팀장석 */
    s += desk(44, BASE, 160, 2.1) + monitor(56, BASE - 40, 54, 32, 2.1, 'text') + papers(118, 218, 1.8);
    s += r(70, BASE - 8, 52, 8, 'ln2 fl') + l(78, BASE - 12, 112, BASE - 12, 'ln3');
    s += person(238, BASE, 2) + chair(238, BASE, 2) + chair(58, BASE, 1.8, true);
    /* 운영지원 데스크 */
    s += desk(300, BASE, 130, 1.9) + monitor(310, BASE - 36, 46, 28, 1.9, 'text');
    s += r(388, 206, 26, 12, 'ln2 fl') + r(388, 192, 26, 10, 'ln2 fl');
    s += person(330, BASE, 1.8) + chair(330, BASE, 1.8);
    s += r(296, 56, 60, 34, 'ln fl') + l(302, 64, 348, 64, 'ln3') + l(302, 74, 340, 74, 'ln3');
    /* 회의실 */
    s += r(500, 226, 150, 32, 'ln fl') + l(500, 226, 650, 226, 'ln');
    s += chair(522, BASE, 1.6) + chair(566, BASE, 1.6) + chair(610, BASE, 1.6);
    s += r(528, 216, 24, 6, 'ln2 fl') + r(584, 216, 24, 6, 'ln2 fl');
    s += whiteboard(514, 56, 130, 60, 1.4);
    s += ci(466, 80, 12, 'ln fl') + l(466, 80, 466, 69, 'ln2') + l(466, 80, 472, 85, 'ln2');
    return detailBase(s);
  };

  DETAIL.f1 = function () {
    var s = '';
    s += partition(280, 206, 246) + partition(476, 202, 242);
    /* 안내 데스크 */
    s += r(44, 214, 160, 44, 'ln fl') + l(44, 214, 204, 214, 'ln') + r(44, 184, 36, 74, 'ln fl') +
      l(44, 196, 80, 196, 'ln2');
    s += person(120, 214, 2) + chair(120, 214, 2) + r(76, 198, 48, 14, 'ln2 fl');
    /* 기다리는 자리 */
    s += r(300, 56, 100, 58, 'ln fl') + l(310, 68, 390, 68, 'ln3') + l(310, 82, 376, 82, 'ln3') + l(310, 96, 386, 96, 'ln3');
    s += chair(330, BASE, 1.8, true) + chair(364, BASE, 1.8, true) + chair(398, BASE, 1.8, true);
    s += table(424, BASE, 66, 1.7) + cup(440, BASE - 24, 1.6) + papers(458, BASE - 24, 1.5);
    /* 자판기 */
    s += vending(510, BASE, 2.3);
    s += r(496, 190, 16, 8, 'ln2 fl');
    s += r(596, 210, 56, 48, 'ln fl') + l(624, 210, 624, BASE, 'ln2');
    s += l(586, BASE, 670, BASE, 'ln2');
    var i;
    for (i = 0; i < 4; i++) s += l(52 + i * 30, BASE, 60 + i * 30, BASE - 4, 'ln3');
    return detailBase(s);
  };

  DETAIL.b2 = function () {
    var s = '', i;
    s += l(40, 46, 660, 46, 'ln2') + l(40, 54, 660, 54, 'ln3');
    for (i = 0; i < 6; i++) s += l(90 + i * 100, 46, 90 + i * 100, 56, 'ln3');
    s += car(100, BASE - 2, 3.6);
    s += r(430, 140, 36, 118, 'ln fl2') + l(448, 152, 448, 250, 'ln3');
    s += r(590, 168, 36, 90, 'ln fl') + l(596, 184, 620, 184, 'ln2') + path('M626 194 c18 0 18 24 0 24', 'ln2');
    s += path('M530 ' + n(224) + ' l64 0 m-20 -14 l20 14 l-20 14', 'ln2');
    return detailBase(s);
  };

  /* ── 건물 전체 조립 ──────────────────────────────────────────────────── */

  function tower(state) {
    var floors = (state && state.floors) || [];
    var out = '';
    var i, y, b, f;

    /* 땅 */
    out += r(0, 924, 56, 180, 'earth');
    out += r(744, 924, 16, 180, 'earth');
    out += l(0, 924, 760, 924, 'ln bold');
    out += path('M8 924 l0 -5 M13 924 l3 -7 M18 924 l0 -4 M46 924 l2 -6 M51 924 l0 -4', 'ln2');
    out += path('M748 924 l0 -5 M754 924 l2 -6', 'ln2');

    /* 기초 */
    out += r(56, 1092, 688, 10, 'slab');
    /* 외벽 */
    out += l(60, 6, 60, 1092, 'ln shell') + l(68, 6, 68, 1092, 'ln2');
    out += l(740, 6, 740, 1092, 'ln shell') + l(732, 6, 732, 1092, 'ln2');
    /* 옥상 난간 */
    out += r(60, 0, 680, 6, 'fl2 ln');

    /* 층별 */
    for (i = 0; i < 13; i++) {
      y = i * H;
      b = y + 78;
      f = floors[i] || { id: 'floor' + i, kind: 'floor' };
      if (i > 0) {
        out += r(60, b, 680, 6, 'slab');
        out += l(68, y, 732, y, 'ln3');
      }
      if (i === 0) {
        out += r(60, 78, 680, 6, 'slab');
      }
      if (i > 0) out += l(68, y + 5, 732, y + 5, 'ln3');
      out += SCENES[f.id] ? SCENES[f.id](y) : '';
      /* 엘리베이터 문 */
      if (i > 0) out += elevDoors(b, f.kind === 'locked');
      /* 계단 */
      if (i > 0 && i < 11) out += stairs(694, y, b);
    }

    /* 층 코드 — 종이 여백의 표시 */
    var labels = '';
    for (i = 0; i < 13; i++) {
      y = i * H;
      labels += l(30, y + 78, 46, y + 78, 'ln3');
      labels += l(6, y + 44, 18, y + 44, 'ln3');
    }
    out += labels;
    out += l(52, 6, 52, 1092, 'ln3');

    return '<svg class="art art-tower" viewBox="0 0 760 1102" role="img" aria-label="지하 2층부터 옥상까지 열세 개 층으로 된 AI 사무실 건물 단면도">' +
      out + '</svg>';
  }

  function detail(floor) {
    var body = DETAIL[floor.id] ? DETAIL[floor.id]() : '';
    return '<svg class="art art-detail" viewBox="0 0 700 300" role="img" aria-label="' +
      floor.name + ' 확대 도면">' + body + '</svg>';
  }

  window.OFFICE_ART = { tower: tower, detail: detail, codes: function (state) { return state.floors; } };
})();
