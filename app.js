/* Vibecamp Survey Stats */
(async function () {
  const [AGG, INSIGHTS, THREADS] = await Promise.all([
    fetch('data/aggregates.json').then(r => r.json()),
    fetch('data/insights.json').then(r => r.json()),
    fetch('data/threads.json').then(r => r.json()),
  ]);

  const EVENTS = AGG.events;                       // includes vc1 (unrated)
  const RATED = EVENTS.filter(e => e.rated);
  const QUESTIONS = AGG.questions;
  const byKey = Object.fromEntries(EVENTS.map(e => [e.key, e]));
  const SHORT = { vc1: 'VC1', vc2: 'VC2', vibeclipse: 'Eclipse', vc3: 'VC3', vc4: 'VC4', vc5: 'VC5' };
  const SMALL_N = 10;

  /* segment palettes — validated categorical slots + ordinal blue ramp */
  const SEG = {
    gender:     { order: ['Man', 'Woman', 'Non-binary'], colors: ['#2a78d6', '#eb6834', '#1baf7a'] },
    sexuality:  { order: ['Straight', 'LGBQ+', 'Other'], colors: ['#2a78d6', '#eb6834', '#1baf7a'] },
    attendance: { order: ['First-timer', 'Returning'],   colors: ['#eb6834', '#2a78d6'] },
    age:        { order: ['18–25', '26–30', '31–35', '36+'], colors: ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'], ordinal: true },
  };
  const AGE_RAMP8 = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#104281'];
  const AGE_ORDER8 = ['18–20', '21–25', '26–30', '31–35', '36–40', '41–45', '46–50', '50+'];

  /* ---------- helpers ---------- */
  const el = (tag, attrs = {}, html) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (html != null) n.innerHTML = html;
    return n;
  };
  const svgNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs = {}) => {
    const n = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const fmt = (v, metric) => metric === 'mean' ? v.toFixed(2) : Math.round(v) + '%';
  const pct = (part, whole) => whole ? (part / whole) * 100 : 0;

  function metricValue(cell, metric) {
    if (!cell || !cell.n) return null;
    if (metric === 'mean') return cell.mean;
    if (metric === 'top') return pct(cell.hist[3] + cell.hist[4], cell.n);
    return pct(cell.hist[0] + cell.hist[1], cell.n);
  }

  /* tooltip */
  const tip = document.getElementById('tooltip');
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('show');
    tip.setAttribute('aria-hidden', 'false');
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + pad, top = y - h - pad;
    if (left + w > innerWidth - 8) left = x - w - pad;
    if (top < 8) top = y + pad;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.classList.remove('show'); tip.setAttribute('aria-hidden', 'true'); }
  function hoverable(node, html) {
    node.addEventListener('mousemove', e => showTip(html, e.clientX, e.clientY));
    node.addEventListener('mouseleave', hideTip);
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', () => {
      const r = node.getBoundingClientRect();
      showTip(html, r.left + r.width / 2, r.top);
    });
    node.addEventListener('blur', hideTip);
  }

  /* stars as SVG (fractional fill) */
  function stars(mean, color) {
    const s = sv('svg', { viewBox: '0 0 100 18', class: 'ev-stars', role: 'img', 'aria-label': mean.toFixed(2) + ' out of 5' });
    const star = 'M9,1.5 L11.2,6.6 16.7,7.1 12.6,10.8 13.8,16.2 9,13.4 4.2,16.2 5.4,10.8 1.3,7.1 6.8,6.6 Z';
    const id = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = sv('defs');
    const clip = sv('clipPath', { id });
    clip.appendChild(sv('rect', { x: 0, y: 0, width: mean / 5 * 100, height: 18 }));
    defs.appendChild(clip); s.appendChild(defs);
    for (const [fill, extra] of [['#eadfcf', {}], [color, { 'clip-path': `url(#${id})` }]]) {
      const g = sv('g', { fill, ...extra });
      for (let i = 0; i < 5; i++) {
        const p = sv('path', { d: star, transform: `translate(${i * 20.5},0)` });
        g.appendChild(p);
      }
      s.appendChild(g);
    }
    return s;
  }

  /* ========== HERO ========== */
  const totalN = RATED.reduce((a, e) => a + e.n, 0);
  document.getElementById('total-n').textContent = totalN.toLocaleString();
  const cardsBox = document.getElementById('event-cards');
  for (const e of EVENTS) {
    const c = el('div', { class: 'event-card', style: `--ev:${e.color}` });
    c.appendChild(el('div', { class: 'ev-name' }, e.name));
    c.appendChild(el('div', { class: 'ev-where' }, `${e.year} · ${e.where}`));
    if (e.rated) {
      const m = e.overall.overall.mean;
      const score = el('div', { class: 'ev-score' }, `${m.toFixed(2)}<small>/ 5</small>`);
      c.appendChild(score);
      c.appendChild(stars(m, e.color));
      c.appendChild(el('div', { class: 'ev-n' }, `${e.n} responses · ${Math.round(pct(e.n, e.attendance))}% of ${e.attendance_approx ? '~' : ''}${e.attendance} campers`));
      if (e.n < 40) c.appendChild(el('span', { class: 'badge' }, 'small sample'));
    } else {
      c.appendChild(el('div', { class: 'ev-score' }, `—`));
      c.appendChild(el('div', { class: 'ev-n' }, `${e.n} responses · ${Math.round(pct(e.n, e.attendance))}% of ${e.attendance_approx ? '~' : ''}${e.attendance} campers`));
      c.appendChild(el('span', { class: 'badge plain' }, 'free-text only'));
    }
    cardsBox.appendChild(c);
  }

  /* ========== TAKEAWAYS ========== */
  const vc5 = byKey.vc5, ecl = byKey.vibeclipse;
  const vc5top = pct(vc5.overall.overall.hist[3] + vc5.overall.overall.hist[4], vc5.overall.overall.n);
  const vc5ft = pct(vc5.demographics.attendance['First-timer'], vc5.n);
  const topBox = (ev, q) => { const c = ev.overall[q]; return Math.round(pct(c.hist[3] + c.hist[4], c.n)); };
  const tk = document.getElementById('takeaways');
  [
    `<span class="num">Vibecamp 5 is the best-rated main-event Vibecamp yet</span> — ${vc5.overall.overall.mean.toFixed(2)}/5 overall, with <span class="num">${Math.round(vc5top)}%</span> of respondents rating it a 4 or 5.`,
    `<span class="num">Would campers send a friend?</span> ${topBox(byKey.vc2, 'recommend')}% said yes at VC2. ${topBox(vc5, 'recommend')}% said yes at VC5.`,
    `Vibeclipse still holds the all-time record (${ecl.overall.overall.mean.toFixed(2)}/5) — but from just ${ecl.n} responses at an event that featured a total solar eclipse, so we hold that crown loosely.`,
    `<span class="num">The programming score has risen every year since VC2,</span> from ${byKey.vc2.overall.programming.mean.toFixed(1)} to ${vc5.overall.programming.mean.toFixed(2)} — all of it made by campers.`,
    `<span class="num">${Math.round(vc5ft)}% of VC5 respondents were first-timers.</span> Helping them land well — the “newcomer gap” — is the most persistent critique in five years of surveys, and “connections” is the one score that hasn't budged since VC2, so it's one of our main focuses for VC6.`,
    `<span class="num">The gender balance is shifting:</span> women went from 17% of VC2 respondents to 32% at VC5.`,
    `The teahouse has been named a highlight every year since Vibecamp 1. We are, apparently, a tea people.`,
  ].forEach(t => tk.appendChild(el('li', {}, t)));

  /* ========== RATINGS ========== */
  const grid = document.getElementById('ratings-grid');
  const metricSel = document.getElementById('metric-select');
  const dimSel = document.getElementById('dim-select');
  const segNote = document.getElementById('segment-note');

  /* collapse 8 age buckets to 4 for comparisons */
  function ageCollapse(ev) {
    const src = ev.segments.age || {};
    const groups = { '18–25': ['18–20', '21–25'], '26–30': ['26–30'], '31–35': ['31–35'], '36+': ['36–40', '41–45', '46–50', '50+'] };
    const out = {};
    for (const [gname, buckets] of Object.entries(groups)) {
      const present = buckets.filter(b => src[b]);
      if (!present.length) continue;
      const n = present.reduce((a, b) => a + src[b].n, 0);
      const q = {};
      for (const qd of QUESTIONS) {
        const hist = [0, 0, 0, 0, 0];
        let qn = 0;
        for (const b of present) {
          const cell = src[b].q[qd.key];
          cell.hist.forEach((v, i) => hist[i] += v);
          qn += cell.n;
        }
        const tot = hist.reduce((a, v, i) => a + v * (i + 1), 0);
        q[qd.key] = { n: qn, hist, mean: qn ? +(tot / qn).toFixed(2) : null };
      }
      out[gname] = { n, q };
    }
    return out;
  }

  function seriesFor(dim) {
    if (dim === 'all') {
      return [{ name: 'Everyone', color: '#2a78d6', get: ev => ({ n: ev.n, q: ev.overall }) }];
    }
    const cfg = SEG[dim];
    return cfg.order.map((name, i) => ({
      name, color: cfg.colors[i],
      get: ev => {
        const segs = dim === 'age' ? ageCollapse(ev) : ev.segments[dim];
        const s = segs && segs[name];
        return s ? { n: s.n, q: s.q } : null;
      },
    })).filter(s => RATED.some(ev => s.get(ev)));
  }

  function lineChart(qd, series, metric) {
    const W = 300, H = 168, L = 34, R = 38, T = 12, B = 26;
    const endLabels = [];
    const iw = W - L - R, ih = H - T - B;
    const isMean = metric === 'mean';
    const y0 = isMean ? 1 : 0, y1 = isMean ? 5 : 100;
    const ticks = isMean ? [1, 2, 3, 4, 5] : [0, 25, 50, 75, 100];
    const xs = i => L + iw * (RATED.length === 1 ? .5 : i / (RATED.length - 1));
    const ys = v => T + ih * (1 - (v - y0) / (y1 - y0));
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': qd.label + ' across events' });

    for (const t of ticks) {
      svg.appendChild(sv('line', { x1: L, x2: W - R, y1: ys(t), y2: ys(t), stroke: t === y0 ? '#d8d2c8' : '#ece7df', 'stroke-width': 1 }));
      const lb = sv('text', { x: L - 6, y: ys(t) + 3.5, 'text-anchor': 'end', class: 'axis-label' });
      lb.textContent = isMean ? t : t + '%'; svg.appendChild(lb);
    }
    RATED.forEach((ev, i) => {
      const lb = sv('text', { x: xs(i), y: H - 8, 'text-anchor': 'middle', class: 'axis-label' });
      lb.textContent = SHORT[ev.key]; svg.appendChild(lb);
    });

    series.forEach(s => {
      const pts = RATED.map((ev, i) => {
        const seg = s.get(ev);
        const cell = seg && seg.q[qd.key];
        const v = cell ? metricValue(cell, metric) : null;
        return v == null ? null : { i, v, n: cell.n, ev };
      }).filter(Boolean);
      if (!pts.length) return;
      const path = pts.map((p, j) => `${j ? 'L' : 'M'}${xs(p.i)},${ys(p.v)}`).join(' ');
      svg.appendChild(sv('path', { d: path, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      pts.forEach(p => {
        const small = p.n < SMALL_N;
        const dot = sv('circle', {
          cx: xs(p.i), cy: ys(p.v), r: 4.5,
          fill: small ? '#fff' : s.color, stroke: small ? s.color : '#fff', 'stroke-width': 2,
        });
        const hit = sv('circle', { cx: xs(p.i), cy: ys(p.v), r: 13, fill: 'transparent' });
        hoverable(hit, `<div class="tt-head">${p.ev.name} · ${s.name}</div>${fmt(p.v, metric)}${isMean ? ' / 5' : ''}<div class="tt-muted">n = ${p.n}${small ? ' · small sample' : ''}</div>`);
        svg.appendChild(dot); svg.appendChild(hit);
      });
      /* candidate direct label at the line's end */
      const last = pts[pts.length - 1];
      endLabels.push({ x: xs(last.i) + 8, y: ys(last.v) + 4, text: fmt(last.v, metric) });
    });
    /* place end labels, dropping ones that would collide (tooltip + table carry them) */
    endLabels.sort((a, b) => a.y - b.y);
    let lastY = -Infinity;
    for (const l of endLabels) {
      if (l.y - lastY < 13) continue;
      lastY = l.y;
      const lb = sv('text', { x: l.x, y: l.y, class: 'val-label' });
      lb.textContent = l.text;
      svg.appendChild(lb);
    }
    return svg;
  }

  function renderRatings() {
    const metric = metricSel.value, dim = dimSel.value;
    const series = seriesFor(dim);
    grid.innerHTML = '';
    segNote.textContent = dim === 'all' ? '' :
      `Groups with fewer than 5 respondents at an event are not shown; hollow dots mark small samples (n < ${SMALL_N}). ` +
      (dim === 'gender' || dim === 'sexuality' ? '“Other” responses are counted in totals but too few to chart per event.' : '');

    if (series.length > 1) {
      const lg = el('div', { class: 'legend', role: 'list' });
      series.forEach(s => {
        lg.appendChild(el('span', { class: 'key', role: 'listitem' }, `<span class="swatch line" style="background:${s.color}"></span>${s.name}`));
      });
      grid.appendChild(lg);
      lg.style.gridColumn = '1 / -1';
    }
    for (const qd of QUESTIONS) {
      const p = el('div', { class: 'panel' });
      p.appendChild(el('h3', {}, qd.label));
      p.appendChild(el('p', { class: 'q' }, qd.desc));
      p.appendChild(lineChart(qd, series, metric));
      grid.appendChild(p);
    }
    renderRatingsTable(metric, dim, series);
  }

  function renderRatingsTable(metric, dim, series) {
    const box = document.getElementById('ratings-table');
    let html = '<table><thead><tr><th>Question</th>';
    for (const ev of RATED) for (const s of series)
      html += `<th>${SHORT[ev.key]}${series.length > 1 ? '<br>' + s.name : ''}</th>`;
    html += '</tr></thead><tbody>';
    for (const qd of QUESTIONS) {
      html += `<tr><td>${qd.label}</td>`;
      for (const ev of RATED) for (const s of series) {
        const seg = s.get(ev), cell = seg && seg.q[qd.key];
        const v = cell ? metricValue(cell, metric) : null;
        html += `<td>${v == null ? '—' : fmt(v, metric)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    html += `<p class="tbl-caption">Respondents per event: ${RATED.map(ev => `${SHORT[ev.key]} n=${ev.n}`).join(' · ')}.</p>`;
    box.innerHTML = html;
  }

  metricSel.addEventListener('change', renderRatings);
  dimSel.addEventListener('change', renderRatings);
  renderRatings();

  /* ========== DISTRIBUTIONS ========== */
  const distGrid = document.getElementById('dist-grid');
  for (const ev of RATED) {
    const cell = ev.overall.overall;
    const p = el('div', { class: 'panel', style: `--ev:${ev.color}` });
    p.appendChild(el('h3', { style: `color:${ev.color}` }, ev.name));
    p.appendChild(el('p', { class: 'q', style: 'min-height:auto' }, `${cell.n} ratings · average ${cell.mean.toFixed(2)}`));
    const W = 220, H = 130, B = 22, T = 16;
    const max = Math.max(...cell.hist);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Distribution of overall ratings for ${ev.name}` });
    const bw = 24, gap = (W - 5 * bw) / 6;
    svg.appendChild(sv('line', { x1: 0, x2: W, y1: H - B, y2: H - B, stroke: '#d8d2c8' }));
    cell.hist.forEach((v, i) => {
      const x = gap + i * (bw + gap);
      const h = max ? (H - B - T - 14) * (v / max) : 0;
      const y = H - B - h;
      const bar = sv('path', {
        d: h > 4
          ? `M${x},${H - B} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${H - B} Z`
          : `M${x},${H - B} V${y} H${x + bw} V${H - B} Z`,
        fill: ev.color,
      });
      hoverable(bar, `<div class="tt-head">${ev.name}</div>${v} camper${v === 1 ? '' : 's'} rated it ${i + 1}<div class="tt-muted">${Math.round(pct(v, cell.n))}% of ${cell.n}</div>`);
      svg.appendChild(bar);
      const vl = sv('text', { x: x + bw / 2, y: y - 4, 'text-anchor': 'middle', class: 'bar-label' });
      vl.textContent = v; svg.appendChild(vl);
      const xl = sv('text', { x: x + bw / 2, y: H - 7, 'text-anchor': 'middle', class: 'axis-label' });
      xl.textContent = i + 1; svg.appendChild(xl);
    });
    p.appendChild(svg);
    distGrid.appendChild(p);
  }
  document.getElementById('dist-table').innerHTML =
    '<table><thead><tr><th>Event</th><th>★1</th><th>★2</th><th>★3</th><th>★4</th><th>★5</th><th>n</th><th>avg</th></tr></thead><tbody>' +
    RATED.map(ev => {
      const c = ev.overall.overall;
      return `<tr><td>${ev.name}</td>${c.hist.map(v => `<td>${v}</td>`).join('')}<td>${c.n}</td><td>${c.mean.toFixed(2)}</td></tr>`;
    }).join('') + '</tbody></table>';

  /* ========== DEMOGRAPHICS ========== */
  const demoGrid = document.getElementById('demo-grid');

  function stackedPanel(title, sub, order, colors, getCounts) {
    const p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, title));
    p.appendChild(el('p', { class: 'q', style: 'min-height:auto' }, sub));
    const lg = el('div', { class: 'legend' });
    order.forEach((name, i) => lg.appendChild(el('span', { class: 'key' }, `<span class="swatch" style="background:${colors[i]}"></span>${name}`)));
    p.appendChild(lg);

    const rows = RATED.map(ev => ({ ev, counts: getCounts(ev) }));
    const W = 420, rowH = 30, gapY = 12, L = 58, R = 6, T = 4;
    const H = T + rows.length * (rowH + gapY);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title + ' by event' });
    rows.forEach((row, ri) => {
      const total = order.reduce((a, name) => a + (row.counts[name] || 0), 0);
      const y = T + ri * (rowH + gapY);
      const lbl = sv('text', { x: L - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'axis-label' });
      lbl.textContent = SHORT[row.ev.key]; svg.appendChild(lbl);
      let x = L;
      order.forEach((name, i) => {
        const v = row.counts[name] || 0;
        if (!v || !total) return;
        const w = (W - L - R) * (v / total);
        const seg = sv('rect', { x: x + 1, y, width: Math.max(w - 2, 0.5), height: rowH, rx: 4, fill: colors[i] });
        const share = pct(v, total);
        hoverable(seg, `<div class="tt-head">${row.ev.name}</div>${name}: ${Math.round(share)}%<div class="tt-muted">${v} of ${total} respondents</div>`);
        svg.appendChild(seg);
        if (share >= 9 && w > 34) {
          const dark = ['#2a78d6', '#184f95', '#1c5cab', '#256abf', '#6250d6', '#eb6834'].includes(colors[i]) || i >= 3 && colors === AGE_RAMP8.slice(0);
          const tl = sv('text', {
            x: x + w / 2, y: y + rowH / 2 + 4, 'text-anchor': 'middle',
            style: `fill:${relLum(colors[i]) < 0.45 ? '#fff' : '#141311'};font-size:11.5px;font-weight:500`,
          });
          tl.textContent = Math.round(share) + '%';
          svg.appendChild(tl);
        }
        x += w;
      });
    });
    p.appendChild(svg);
    return p;
  }
  function relLum(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  demoGrid.appendChild(stackedPanel(
    'Gender', 'Share of respondents at each event',
    ['Man', 'Woman', 'Non-binary'], ['#2a78d6', '#eb6834', '#1baf7a'],
    ev => ev.demographics.gender,
  ));
  demoGrid.appendChild(stackedPanel(
    'Sexuality', 'Share of respondents at each event',
    ['Straight', 'LGBQ+', 'Other'], ['#2a78d6', '#eb6834', '#1baf7a'],
    ev => ev.demographics.sexuality,
  ));
  demoGrid.appendChild(stackedPanel(
    'Age', 'Share of respondents at each event (ordered, light → dark)',
    AGE_ORDER8, AGE_RAMP8,
    ev => ev.demographics.age,
  ));
  demoGrid.appendChild(stackedPanel(
    'First-timers vs returning', 'Share of respondents at each event',
    ['First-timer', 'Returning'], ['#eb6834', '#2a78d6'],
    ev => ev.demographics.attendance,
  ));

  document.getElementById('demo-table').innerHTML = (() => {
    let html = '';
    const dims = [
      ['Gender', 'gender', ['Man', 'Woman', 'Non-binary']],
      ['Sexuality', 'sexuality', ['Straight', 'LGBQ+', 'Other']],
      ['Age', 'age', AGE_ORDER8],
      ['Attendance', 'attendance', ['First-timer', 'Returning']],
    ];
    for (const [title, dim, order] of dims) {
      html += `<p class="tbl-caption"><strong>${title}</strong> (count of respondents)</p><table><thead><tr><th></th>${RATED.map(ev => `<th>${SHORT[ev.key]}</th>`).join('')}</tr></thead><tbody>`;
      for (const name of order) {
        html += `<tr><td>${name}</td>${RATED.map(ev => `<td>${ev.demographics[dim][name] || 0}</td>`).join('')}</tr>`;
      }
      html += '</tbody></table>';
    }
    return html;
  })();

  /* ========== STRUCTURE VS SERENDIPITY ========== */
  (function () {
    const box = document.getElementById('structure-viz');
    const data = byKey.vc5.structured_vs_unstructured;
    if (!data) return;
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const order = ['Both equally valuable', 'Unstructured socializing', 'Structured activities'];
    const colors = ['#2a78d6', '#eb6834', '#1baf7a'];
    const row = el('div', { class: 'stat-row' });
    order.forEach((name, i) => {
      const t = el('div', { class: 'stat-tile' });
      t.appendChild(el('div', { class: 'label' }, name));
      t.appendChild(el('div', { class: 'value' }, Math.round(pct(data[name], total)) + '%'));
      t.appendChild(el('div', { class: 'sub' }, `${data[name]} of ${total} respondents`));
      row.appendChild(t);
    });
    box.appendChild(row);
  })();

  /* ========== WHAT PEOPLE SAID ========== */
  const themeByEventTitle = {};
  for (const [evKey, themes] of Object.entries(INSIGHTS))
    for (const t of themes) themeByEventTitle[evKey + '::' + t.theme] = t;

  /* threads view */
  const threadsBox = document.getElementById('threads-view');
  for (const th of THREADS) {
    const card = el('div', { class: 'thread' });
    card.appendChild(el('h3', {}, `${th.emoji}&nbsp; ${th.title}`));
    card.appendChild(el('p', { class: 'blurb' }, th.blurb));
    for (const [evKey, title] of th.entries) {
      const ev = byKey[evKey];
      const t = themeByEventTitle[evKey + '::' + title];
      const entry = el('div', { class: 'thread-entry', style: `--ev:${ev.color}` });
      entry.appendChild(el('div', { class: 'chip' }, `${SHORT[evKey]} · ${ev.year}`));
      const body = el('div');
      body.appendChild(el('div', { class: 't-title' }, title));
      if (t) body.appendChild(el('div', { class: 't-sum' }, t.summary));
      entry.appendChild(body);
      card.appendChild(entry);
    }
    if (th.response) card.appendChild(el('div', { class: 'thread-response' }, `<span class="tag">From the team</span>${th.response}`));
    threadsBox.appendChild(card);
  }

  /* events view */
  const eventsBox = document.getElementById('events-view');
  for (const ev of EVENTS) {
    const themes = INSIGHTS[ev.key];
    if (!themes) continue;
    const block = el('div', { class: 'event-block', style: `--ev:${ev.color}` });
    block.appendChild(el('h3', {}, ev.name));
    block.appendChild(el('p', { class: 'ev-sub' }, `${ev.year} · ${ev.where}`));
    const gridBox = el('div', { class: 'theme-cards' });
    themes.forEach((t, i) => {
      const card = el('div', { class: 'theme-card' + (t.positive ? '' : ' crit') });
      if (i >= 4) card.hidden = true;
      card.appendChild(el('h4', {}, `<span class="mark">${t.positive ? '✦' : '✧'}</span>${t.theme}`));
      card.appendChild(el('p', { class: 't-sum' }, t.summary));
      t.notes.forEach(n => card.appendChild(el('div', { class: 'note' }, n)));
      gridBox.appendChild(card);
    });
    block.appendChild(gridBox);
    if (themes.length > 4) {
      const btn = el('button', { class: 'show-more' }, `Show all ${themes.length} themes ↓`);
      btn.addEventListener('click', () => {
        const hiddenOnes = gridBox.querySelectorAll('.theme-card[hidden]');
        if (hiddenOnes.length) { hiddenOnes.forEach(c => c.hidden = false); btn.textContent = 'Show fewer ↑'; }
        else { gridBox.querySelectorAll('.theme-card').forEach((c, i) => { if (i >= 4) c.hidden = true; }); btn.textContent = `Show all ${themes.length} themes ↓`; }
      });
      block.appendChild(btn);
    }
    eventsBox.appendChild(block);
  }

  /* toggle */
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      threadsBox.hidden = btn.dataset.view !== 'threads';
      eventsBox.hidden = btn.dataset.view !== 'events';
    });
  });

  /* ========== METHODOLOGY FILLS ========== */
  document.getElementById('min-n').textContent = Math.min(...RATED.map(e => e.n));
  document.getElementById('max-n').textContent = Math.max(...RATED.map(e => e.n));
  document.getElementById('rate-table').innerHTML =
    '<table><thead><tr><th>Event</th><th>Attendees</th><th>Responses</th><th>Response rate</th></tr></thead><tbody>' +
    EVENTS.map(e => {
      const att = (e.attendance_approx ? '~' : '') + e.attendance;
      const resp = e.rated ? e.n : `${e.n} (free-text only)`;
      const rate = Math.round(pct(e.n, e.attendance)) + '%';
      return `<tr><td>${e.name}</td><td>${att}</td><td>${resp}</td><td>${rate}</td></tr>`;
    }).join('') + '</tbody></table>';
})();
