const FIELD_SLOTS = [
  { pos:'LF', col:'1/3', row:1 },
  { pos:'CF', col:'3/5', row:1 },
  { pos:'RF', col:'5/7', row:1 },
  { pos:'SS', col:'2/4', row:2 },
  { pos:'2B', col:'4/6', row:2 },
  { pos:'3B', col:'1/3', row:3 },
  { pos:'1B', col:'5/7', row:3 },
  { pos:'C',  col:'3/5', row:4 },
  { pos:'DH', col:'4/6', row:4 },
];

const HitterTab = {
  currentFilter: '전체',
  lineup: [
    {pos:'C',  pid:null, order:null},
    {pos:'1B', pid:null, order:null},
    {pos:'2B', pid:null, order:null},
    {pos:'3B', pid:null, order:null},
    {pos:'SS', pid:null, order:null},
    {pos:'LF', pid:null, order:null},
    {pos:'CF', pid:null, order:null},
    {pos:'RF', pid:null, order:null},
    {pos:'DH', pid:null, order:null},
  ],
  activePos: null,
  orderDragSrc: null,

  switchSub(view, btn) {
    document.querySelectorAll('#tab-hitter .sub-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('hitter-lineup-view').style.display = view === 'lineup' ? 'block' : 'none';
    document.getElementById('hitter-storage-view').style.display = view === 'storage' ? 'block' : 'none';
    if (view === 'storage') requestAnimationFrame(() => applyFilterBarScale('hitter-filter-bar'));
  },

  renderLineup() {
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    POS_ORDER.forEach((pos, i) => {
      const slot = this.lineup.find(s => s.pos === pos);
      const sr = sheetRows[i] || [];
      const name = sr[6] || '';
      if (name) {
        const found = State.hitters.find(h => h[HITTER_COL.NAME] === name);
        slot.pid = found ? found[HITTER_COL.KEY] : null;
      } else {
        slot.pid = null;
      }
      slot.order = sr[1] || null;
    });
    this.renderFieldGrid();
    this.renderRightList();
    this.renderOrderBar();
  },

  onFieldSlotClick(pos) {
    this.setActivePos(pos);
    SwapModal.open(true, pos);
  },

  renderFieldGrid() {
    const grid = document.getElementById('hl-field-grid');
    if (!grid) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    const cards = FIELD_SLOTS.map(fs => {
      const slot = this.lineup.find(s => s.pos === fs.pos);
      const p = slot?.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === slot.pid) : null;
      const isActive = this.activePos === fs.pos;
      const posIdx = POS_ORDER.indexOf(fs.pos);
      const sr = sheetRows[posIdx] || [];
      const bojOverride = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, true, bojOverride, fs.pos === 'DH' ? 'DH' : null) : makeEmptyCard(fs.pos, 50);
      return `<div class="hl-field-slot${isActive ? ' hl-active' : ''}"
        style="grid-column:${fs.col};grid-row:${fs.row};"
        data-pos="${fs.pos}">
        <span class="hl-pos-lbl">${fs.pos}</span>
        <div class="hl-field-card-hit" onclick="HitterTab.onFieldSlotClick('${fs.pos}')">${card}</div>
      </div>`;
    }).join('');
    const diamond = `<svg class="hl-diamond-svg" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 22 Q 50 -8 100 22" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
      <polygon points="50,90 82,65 50,40 18,65" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
      <circle cx="50" cy="65" r="3.5" fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="0.5"/>
    </svg>`;
    grid.innerHTML = cards + diamond;
  },

  renderRightList() {
    const list = document.getElementById('hitter-lineup-table');
    if (!list) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    list.innerHTML = '';

    POS_ORDER.forEach((pos, i) => {
      const slot = this.lineup.find(s => s.pos === pos);
      const sr = sheetRows[i] || [];
      const p = slot?.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === slot.pid) : null;
      const isActive = this.activePos === pos;
      const col = p ? TYPE_COLOR[p[HITTER_COL.TYPE]] || 'sig' : '';

      const row = document.createElement('div');
      row.className = `hl-row${isActive ? ' hl-active' : ''}${!p ? ' hl-row-empty' : ''}`;
      row.dataset.pos = pos;
      row.style.borderLeft = p ? `3px solid ${CARD_BD[col]}` : '3px solid transparent';

      if (p) {
        const boj    = fmt1((sr[7]  !== '' && sr[7]  != null) ? sr[7]  : (p[HITTER_COL.BOJ]   ?? ''));
        const intStat = v => {
          if (v === '' || v == null || v === '-') return '-';
          const n = Number(v);
          return Number.isFinite(n) ? String(Math.round(n)) : String(v);
        };
        const s_pow  = intStat((sr[8]  !== '' && sr[8]  != null) ? sr[8]  : (p[HITTER_COL.S_POW] ?? ''));
        const s_acc  = intStat((sr[9]  !== '' && sr[9]  != null) ? sr[9]  : (p[HITTER_COL.S_ACC] ?? ''));
        const s_sel  = intStat((sr[10] !== '' && sr[10] != null) ? sr[10] : (p[HITTER_COL.S_SEL] ?? ''));
        const s_pat  = intStat((sr[11] !== '' && sr[11] != null) ? sr[11] : (p[HITTER_COL.S_PAT] ?? ''));
        const pot1 = sr[13] || p[HITTER_COL.POT_FS] || '-';
        const pot2 = sr[14] || p[HITTER_COL.POT_CL] || '-';
        const pot3 = sr[15] || p[HITTER_COL.POT_SO] || '-';
        const pot4 = sr[16] || p[HITTER_COL.POT_AW] || '-';
        const sk1n = sr[18] || p[HITTER_COL.SK1N] || '-';
        const sk1l = sr[19] || p[HITTER_COL.SK1L];
        const sk2n = sr[20] || p[HITTER_COL.SK2N] || '-';
        const sk2l = sr[21] || p[HITTER_COL.SK2L];
        const sk3n = sr[22] || p[HITTER_COL.SK3N] || '-';
        const sk3l = sr[23] || p[HITTER_COL.SK3L];
        const score     = fmt2((sr[12] !== '' && sr[12] != null) ? sr[12] : (p[HITTER_COL.LINEUP_SCORE] ?? ''));
        const scoreProb = fmtPct((sr[25] !== '' && sr[25] != null) ? sr[25] : (p[HITTER_COL.SCORE_PROB] ?? ''));

        row.innerHTML = `
          <span class="hl-slot">${pos}</span>
          <span class="row-sep"></span>
          <div class="hl-info">
            <div class="hl-name">${p[HITTER_COL.YEAR]} ${p[HITTER_COL.NAME]}</div>
            <div class="hl-sub">${TYPE_MAP[p[HITTER_COL.TYPE]] || p[HITTER_COL.TYPE]} · ${p[HITTER_COL.AWAKEN]}</div>
          </div>
          <div class="hl-right-group">
            <span class="row-sep"></span>
            <div class="hl-boj"><span class="ovr-lbl">OVR</span>${boj}</div>
            <span class="row-sep"></span>
            <div class="hl-stats">
              <div class="hl-sr"><span class="hl-sl">파워</span><span class="hl-sv">${s_pow}</span></div>
              <div class="hl-sr"><span class="hl-sl">정확</span><span class="hl-sv">${s_acc}</span></div>
              <div class="hl-sr"><span class="hl-sl">선구</span><span class="hl-sv">${s_sel}</span></div>
              <div class="hl-sr"><span class="hl-sl">인내</span><span class="hl-sv">${s_pat}</span></div>
            </div>
            <span class="row-sep"></span>
            <div class="hl-pot">
              <div class="hl-sr"><span class="hl-sl" style="width:28px;">풀스윙</span><span class="hl-sv ${POT_CLASS(pot1)}" style="flex:1;text-align:center;">${pot1}</span></div>
              <div class="hl-sr"><span class="hl-sl" style="width:28px;">클러치</span><span class="hl-sv ${POT_CLASS(pot2)}" style="flex:1;text-align:center;">${pot2}</span></div>
              <div class="hl-sr"><span class="hl-sl" style="width:28px;">송구</span><span class="hl-sv ${POT_CLASS(pot3)}" style="flex:1;text-align:center;">${pot3}</span></div>
              <div class="hl-sr"><span class="hl-sl" style="width:28px;">각잠</span><span class="hl-sv ${POT_CLASS(pot4)}" style="flex:1;text-align:center;">${pot4}</span></div>
            </div>
            <span class="row-sep"></span>
            <div class="hl-skills">
              <div class="hl-sk">${sk1n} <span class="hl-skl">${sk1l && sk1l !== '-' ? sk1l + '렙' : '-'}</span></div>
              <div class="hl-sk">${sk2n} <span class="hl-skl">${sk2l && sk2l !== '-' ? sk2l + '렙' : '-'}</span></div>
              <div class="hl-sk">${sk3n} <span class="hl-skl">${sk3l && sk3l !== '-' ? sk3l + '렙' : '-'}</span></div>
              <div class="hl-sk-score">점수 <b>${score}</b></div>
            </div>
          </div>`;
        row.onclick = () => { HitterTab.setActivePos(pos); SwapModal.open(true, pos); };
      } else {
        row.innerHTML = `
          <span class="hl-slot">${pos}</span>
          <span class="hl-empty-hint">${pos} 선수를 추가해주세요</span>`;
        row.onclick = () => SwapModal.open(true, pos);
      }

      list.appendChild(row);
    });
  },

  renderOrderBar() {
    const bar = document.getElementById('hl-order-bar');
    if (!bar) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    const ordered   = [...this.lineup].filter(s => s.order != null).sort((a, b) => a.order - b.order);
    const unordered = this.lineup.filter(s => s.order == null);
    const all = [...ordered, ...unordered];

    bar.innerHTML = '';
    const titleSlot = document.createElement('div');
    titleSlot.className = 'hl-order-title';
    titleSlot.textContent = '타순\n변경';
    bar.appendChild(titleSlot);

    all.forEach((slot, idx) => {
      const p = slot.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === slot.pid) : null;
      const posIdx = POS_ORDER.indexOf(slot.pos);
      const sr = sheetRows[posIdx] || [];
      const bojOverride = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const wrap = document.createElement('div');
      wrap.className = 'hl-ob-wrap';
      wrap.draggable = true;
      wrap.dataset.pos = slot.pos;
      wrap.innerHTML = (p ? makeCardLineup(p, 48, true, bojOverride, slot.pos === 'DH' ? 'DH' : null) : makeEmptyCard(slot.order || slot.pos, 48)) +
        `<span class="hl-ob-num">${slot.order ? slot.order + '번타자' : '-'}</span>`;

      wrap.addEventListener('dragstart', e => {
        this.orderDragSrc = slot.pos;
        e.dataTransfer.setData('text', slot.pos);
        setTimeout(() => wrap.style.opacity = '0.4', 0);
      });
      wrap.addEventListener('dragend', () => { wrap.style.opacity = '1'; });
      wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.style.outline = '2px solid var(--text-primary)'; });
      wrap.addEventListener('dragleave', () => { wrap.style.outline = ''; });
      wrap.addEventListener('drop', e => {
        e.preventDefault();
        wrap.style.outline = '';
        const fromPos = this.orderDragSrc;
        const toPos = slot.pos;
        this.orderDragSrc = null;
        if (!fromPos || fromPos === toPos) return;
        DragConfirmModal.openHitterOrder(fromPos, toPos);
      });

      wrap.addEventListener('touchstart', () => {
        this.orderDragSrc = slot.pos;
        wrap.style.opacity = '0.4';
      }, { passive: true });
      wrap.addEventListener('touchend', e => {
        wrap.style.opacity = '1';
        document.querySelectorAll('.hl-ob-wrap').forEach(w => w.style.outline = '');
        const touch = e.changedTouches[0];
        const tgt = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.hl-ob-wrap');
        const toPos   = tgt?.dataset?.pos;
        const fromPos = this.orderDragSrc;
        this.orderDragSrc = null;
        if (!fromPos || !toPos || fromPos === toPos) return;
        DragConfirmModal.openHitterOrder(fromPos, toPos);
      });

      bar.appendChild(wrap);
    });
    applyOrderBarScale();
  },

  confirmOrderSwap(fromPos, toPos) {
    const fromSlot = this.lineup.find(s => s.pos === fromPos);
    const toSlot   = this.lineup.find(s => s.pos === toPos);
    if (!fromSlot || !toSlot) return;
    const tmp = fromSlot.order; fromSlot.order = toSlot.order; toSlot.order = tmp;
    this.renderFieldGrid();
    this.renderRightList();
    this.renderOrderBar();
    let savedCount = 0;
    const onSaved = () => {
      if (++savedCount < 2) return;
      showRefreshing('동기화 중...');
      Api.call('getHitterLineup', [State.clubId]).then(res => {
          if (res.success) State.hitterLineup = res.data;
          HitterTab.renderFieldGrid();
          HitterTab.renderRightList();
          HitterTab.renderOrderBar();
          loadShortcutData();
          hideRefreshing();
        }).catch(() => { hideRefreshing(); });
    };
    this._saveOrder(fromSlot, onSaved);
    this._saveOrder(toSlot, onSaved);
  },

  _saveOrder(slot, callback) {
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const idx = POS_ORDER.indexOf(slot.pos) + 1;
    if (!slot.order || idx <= 0) { if (callback) callback(); return; }
    Api.call('setHitterOrder', [State.clubId, idx, slot.order]).then(() => { if (callback) callback(); }).catch(e => { alert('타순 저장 실패: ' + e.message); if (callback) callback(); });
  },

  setActivePos(pos) {
    this.activePos = this.activePos === pos ? null : pos;
    // 그리드 하이라이트
    document.querySelectorAll('.hl-field-slot').forEach(el => {
      el.classList.toggle('hl-active', el.dataset.pos === this.activePos);
    });
    // 우측 행 하이라이트
    document.querySelectorAll('.hl-row[data-pos]').forEach(row => {
      row.classList.toggle('hl-active', row.dataset.pos === this.activePos);
    });
  },

  renderStorage() {
    renderStorageTable('hitter-storage-list', 'hitter-scroll-hd', State.hitters, true, this.currentFilter);
    requestAnimationFrame(() => applyFilterBarScale('hitter-filter-bar'));
  },

  filterPos(pos, btn) {
    document.querySelectorAll('#hitter-storage-view .filter-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    this.currentFilter = pos;
    this.renderStorage();
  }
};

const HitterStorageModal = {
  open(key) {
    const p = State.hitters.find(h => h[HITTER_COL.KEY] === key);
    if (!p) return;

    const col = TYPE_COLOR[p[HITTER_COL.TYPE]] || 'sig';
    const bg  = CARD_BG[col];
    const bd  = CARD_BD[col];
    const pos  = p[HITTER_COL.POS];
    const type = p[HITTER_COL.TYPE];
    const nick = p[HITTER_COL.NICK];
    const nm   = p[HITTER_COL.NAME];
    const yr   = p[HITTER_COL.YEAR];
    const aw   = p[HITTER_COL.AWAKEN];
    const boj  = fmt1(p[HITTER_COL.BOJ]);
    const pot1 = p[HITTER_COL.POT_FS] || '-';
    const pot2 = p[HITTER_COL.POT_CL] || '-';
    const pot3 = p[HITTER_COL.POT_SO] || '-';
    const pot4 = p[HITTER_COL.POT_AW] || '-';
    const sk1n = p[HITTER_COL.SK1N] || '-';
    const sk1l = p[HITTER_COL.SK1L];
    const sk2n = p[HITTER_COL.SK2N] || '-';
    const sk2l = p[HITTER_COL.SK2L];
    const sk3n = p[HITTER_COL.SK3N] || '-';
    const sk3l = p[HITTER_COL.SK3L];
    const score      = (p[HITTER_COL.SCORE] != null && p[HITTER_COL.SCORE] !== '') ? String(p[HITTER_COL.SCORE]) : '-';
    const scoreProb  = fmtPct(p[HITTER_COL.SCORE_PROB]);
    const trainRedist = (p[HITTER_COL.TRAIN] != null && p[HITTER_COL.TRAIN] !== '') ? String(p[HITTER_COL.TRAIN]) : '-';
    const trainProb   = fmtPct(p[HITTER_COL.TRAIN_PROB]);
    const spRedist    = (p[HITTER_COL.SP] != null && p[HITTER_COL.SP] !== '') ? String(p[HITTER_COL.SP]) : '-';
    const spProb      = fmtPct(p[HITTER_COL.SP_PROB]);
    const potm  = p[HITTER_COL.POTM];
    const toChk = v => v === true || v === 'TRUE' || v === 'true';
    const sp75  = toChk(p[HITTER_COL.SETPO75]);
    const sp180 = toChk(p[HITTER_COL.SETPO180]);
    const sp185 = toChk(p[HITTER_COL.SETPO185]);
    const stat1 = fmt1(p[HITTER_COL.S_POW]);
    const stat2 = fmt1(p[HITTER_COL.S_ACC]);
    const stat3 = fmt1(p[HITTER_COL.S_SEL]);
    const stat4 = fmt1(p[HITTER_COL.S_PAT]);

    document.getElementById('hsd-card').innerHTML =
      `<div onclick="PhotoModal.open('${key}',true);event.stopPropagation();">${makeCard(p, 60, true)}</div>`;

    document.getElementById('hsd-info').innerHTML = `
      <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px;">
        <span class="type-badge" style="background:${bd}22;color:${bg};">${pos}</span>
        <span class="type-badge" style="background:${bd}22;color:${bg};font-size:8px;">${TYPE_MAP[type]||type}</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:1px;">${nick}</div>
      <div style="font-size:11px;color:var(--text-secondary);">${yr} ${nm}</div>
      <div style="font-size:10px;color:var(--text-tertiary);">${aw}</div>
      <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:6px;line-height:1;">${boj}</div>`;

    document.getElementById('hsd-body').innerHTML = `
      <div class="hsd-section hsd-two-col">
        <div class="hsd-col">
          <div class="hsd-sec-title">스탯</div>
          <div class="hsd-row">
            ${[['파워',stat1],['정확',stat2],['선구',stat3],['인내',stat4]].map(([l,v])=>`
              <div class="hsd-stat-item"><span class="hsd-lbl">${l}</span><span class="hsd-val">${v}</span></div>`).join('')}
          </div>
        </div>
        <div class="hsd-col-div"></div>
        <div class="hsd-col">
          <div class="hsd-sec-title">잠재력</div>
          <div class="hsd-row">
            ${[['풀스윙',pot1],['클러치',pot2],['송구',pot3],['각잠',pot4]].map(([l,v])=>`
              <div class="hsd-stat-item"><span class="hsd-lbl">${l}</span><span class="hsd-val ${POT_CLASS(v)}">${v}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="hsd-section hsd-two-col">
        <div class="hsd-col">
          <div class="hsd-sec-title">스킬</div>
          <div style="display:flex;gap:4px;margin-bottom:5px;">
            ${[[sk1n,sk1l],[sk2n,sk2l],[sk3n,sk3l]].map(([n,l])=>`
              <div class="hsd-skill-item">
                <div style="font-size:10px;color:var(--text-primary);white-space:nowrap;">${n}</div>
                <div style="font-size:9px;color:var(--text-tertiary);">${l&&l!=='-'?l+'렙':'-'}</div>
              </div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text-secondary);">스킬점수 <b>${score}</b> · 확률 <b>${scoreProb}</b></div>
        </div>
        <div class="hsd-col-div"></div>
        <div class="hsd-col">
          <div class="hsd-sec-title">재분배</div>
          <div class="hsd-row">
            <div class="hsd-stat-item"><span class="hsd-lbl">훈련</span><span class="hsd-val">${trainRedist}</span><span style="font-size:9px;color:var(--text-tertiary);">${trainProb}</span></div>
            <div class="hsd-stat-item"><span class="hsd-lbl">특훈</span><span class="hsd-val">${spRedist}</span><span style="font-size:9px;color:var(--text-tertiary);">${spProb}</span></div>
          </div>
        </div>
      </div>`;

    document.getElementById('hsd-checks').innerHTML = `
      <label class="hsd-chk-label">셋포75<input type="checkbox" class="setpo-chk" ${sp75?'checked':''} data-key="${key}" data-idx="0" data-ishitter="true" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">셋포180<input type="checkbox" class="setpo-chk" ${sp180?'checked':''} data-key="${key}" data-idx="1" data-ishitter="true" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">셋포185<input type="checkbox" class="setpo-chk" ${sp185?'checked':''} data-key="${key}" data-idx="2" data-ishitter="true" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">POTM<input type="checkbox" ${potm?'checked':''} onchange="onPotmChange('${key}',this.checked,true)"></label>`;

    document.getElementById('hsd-edit-btn').onclick = () => { HitterStorageModal.close(); EditModal.open(key, true); };
    document.getElementById('hsd-del-btn').onclick  = () => { HitterStorageModal.close(); onDeletePlayer(key, true); };

    document.getElementById('hsd-modal').style.display = 'flex';
    requestAnimationFrame(() => HitterStorageModal._applyBodyScale());
  },

  _applyBodyScale() {
    const body = document.getElementById('hsd-body');
    if (!body) return;
    const NAT_W = 440; // 2열 레이아웃이 편안하게 들어가는 최소 너비 (스탯 4개+gap = 200px × 2 + 구분선 ≈ 420px)
    const availW = window.innerWidth - 32; // sheet 패딩 양쪽 16px
    const z = Math.min(1, availW / NAT_W);
    body.style.zoom = z < 1 ? String(z) : '';
  },

  close() {
    document.getElementById('hsd-modal').style.display = 'none';
  }
};

const PITCHER_SLOT_INDEX = {
  '1SP':1,'2SP':2,'3SP':3,'4SP':4,'5SP':5,
  '1RP':6,'2RP':7,'3RP':8,'4RP':9,'5RP':10,'6RP':11,'CP':12
};
const SP_SLOTS = ['1SP','2SP','3SP','4SP','5SP','CP'];
const RP_SLOTS = ['1RP','2RP','3RP','4RP','5RP','6RP'];
const SLOT_ORDER_ALL = ['1SP','2SP','3SP','4SP','5SP','1RP','2RP','3RP','4RP','5RP','6RP','CP'];

const PitcherTab = {
  currentFilter: '전체',
  lineup: [
    {slot:'1SP', pos:'SP', pid:null},
    {slot:'2SP', pos:'SP', pid:null},
    {slot:'3SP', pos:'SP', pid:null},
    {slot:'4SP', pos:'SP', pid:null},
    {slot:'5SP', pos:'SP', pid:null},
    {slot:'1RP', pos:'RP', pid:null, role:null},
    {slot:'2RP', pos:'RP', pid:null, role:null},
    {slot:'3RP', pos:'RP', pid:null, role:null},
    {slot:'4RP', pos:'RP', pid:null, role:null},
    {slot:'5RP', pos:'RP', pid:null, role:null},
    {slot:'6RP', pos:'RP', pid:null, role:null},
    {slot:'CP',  pos:'CP', pid:null},
  ],
  activeSlot: null,
  gridDragSrc: null,

  switchSub(view, btn) {
    document.querySelectorAll('#tab-pitcher .sub-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('pitcher-lineup-view').style.display = view === 'lineup' ? 'block' : 'none';
    document.getElementById('pitcher-storage-view').style.display = view === 'storage' ? 'block' : 'none';
    if (view === 'storage') requestAnimationFrame(() => applyFilterBarScale('pitcher-filter-bar'));
  },

  renderLineup() {
    const sheetRows = State.pitcherLineup || [];
    SLOT_ORDER_ALL.forEach((slotKey, i) => {
      const slot = this.lineup.find(s => s.slot === slotKey);
      const sr = sheetRows[i] || [];
      const name = sr[6] || '';
      if (name) {
        const found = State.pitchers.find(p => p[PITCHER_COL.NAME] === name);
        slot.pid = found ? found[PITCHER_COL.KEY] : null;
      } else {
        slot.pid = null;
      }
      if (slot.pos === 'RP') slot.role = sr[0] || slot.role || null;
    });
    this.renderGrid();
    this.renderLower();
  },

  renderGrid() {
    this._renderGridRow('pl-sp-row', ['1SP','2SP','3SP','4SP','5SP'], false);
    this._renderTacticBanner();
    this._renderGridRow('pl-rp-row', ['1RP','2RP','3RP','4RP','5RP'], true);
    this._renderRow4();
  },

  _renderRow4() {
    const rowEl = document.getElementById('pl-row4');
    if (!rowEl) return;
    const slots = ['6RP', null, null, null, 'CP'];
    rowEl.innerHTML = slots.map(slotKey => {
      if (!slotKey) return `<div class="pl-grid-slot" style="cursor:default;pointer-events:none;"></div>`;
      const slot = this.lineup.find(s => s.slot === slotKey);
      const p = slot?.pid ? State.pitchers.find(pt => pt[PITCHER_COL.KEY] === slot.pid) : null;
      const isActive = this.activeSlot === slotKey;
      const slotIdx = SLOT_ORDER_ALL.indexOf(slotKey);
      const sr = (State.pitcherLineup || [])[slotIdx] || [];
      const bojOverride = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, false, bojOverride) : makeEmptyCard(slotKey, 50);
      return `<div class="pl-grid-slot${isActive ? ' pl-active' : ''}"
        data-slot="${slotKey}">
        <div class="pl-grid-card-hit" onclick="PitcherTab.onGridSlotClick('${slotKey}')">${card}</div>
        <span class="pl-slot-lbl">${slotKey}</span>
      </div>`;
    }).join('');
  },

  _renderGridRow(rowId, slots, isRP) {
    const rowEl = document.getElementById(rowId);
    if (!rowEl) return;
    rowEl.innerHTML = slots.map(slotKey => {
      const slot = this.lineup.find(s => s.slot === slotKey);
      const p = slot?.pid ? State.pitchers.find(pt => pt[PITCHER_COL.KEY] === slot.pid) : null;
      const isActive = this.activeSlot === slotKey;
      const canDrag = slotKey !== 'CP';
      const slotIdx = SLOT_ORDER_ALL.indexOf(slotKey);
      const sr = (State.pitcherLineup || [])[slotIdx] || [];
      const bojOverride = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, false, bojOverride) : makeEmptyCard(slotKey, 50);
      const roleBadge = isRP
        ? `<span class="pl-role-badge" id="pl-rb-${slotKey}">${slot?.role || ''}</span>`
        : '';
      return `<div class="pl-grid-slot${isActive ? ' pl-active' : ''}"
        data-slot="${slotKey}">
        <div class="pl-grid-card-hit"
          data-slot="${slotKey}"
          ${canDrag ? 'draggable="true"' : ''}
          onclick="PitcherTab.onGridSlotClick('${slotKey}')">${card}</div>
        <span class="pl-slot-lbl">${slotKey}</span>
        ${roleBadge}
      </div>`;
    }).join('');

    this._attachGridDrag(rowEl);
  },

  _attachGridDrag(rowEl) {
    rowEl.querySelectorAll('.pl-grid-card-hit[draggable="true"]').forEach(el => {
      el.addEventListener('dragstart', e => {
        this.gridDragSrc = el.dataset.slot;
        e.dataTransfer.setData('text', el.dataset.slot);
        setTimeout(() => el.style.opacity = '0.4', 0);
      });
      el.addEventListener('dragend', () => { el.style.opacity = '1'; });
      el.addEventListener('dragover', e => { e.preventDefault(); el.style.outline = '2px solid var(--text-primary)'; });
      el.addEventListener('dragleave', () => { el.style.outline = ''; });
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.style.outline = '';
        const fromKey = this.gridDragSrc;
        const toKey   = el.dataset.slot;
        this.gridDragSrc = null;
        if (!fromKey || fromKey === toKey || toKey === 'CP') return;
        this.confirmGridSwap(fromKey, toKey);
      });

      el.addEventListener('touchstart', () => {
        this.gridDragSrc = el.dataset.slot;
        el.style.opacity = '0.4';
      }, { passive: true });
      el.addEventListener('touchend', e => {
        el.style.opacity = '1';
        const touch = e.changedTouches[0];
        const tgt = document.elementFromPoint(touch.clientX, touch.clientY)
          ?.closest('.pl-grid-card-hit[draggable]');
        const toKey   = tgt?.dataset?.slot;
        const fromKey = this.gridDragSrc;
        this.gridDragSrc = null;
        if (!fromKey || !toKey || fromKey === toKey || toKey === 'CP') return;
        const isSPfrom = fromKey.includes('SP');
        const isSPto   = toKey.includes('SP');
        if (isSPfrom !== isSPto) return;
        this.confirmGridSwap(fromKey, toKey);
      });
    });
  },

  confirmGridSwap(fromKey, toKey) {
    const isSPfrom = fromKey.includes('SP');
    const isSPto   = toKey.includes('SP');
    if (isSPfrom !== isSPto) return;
    DragConfirmModal.openPitcherSlot(fromKey, toKey);
  },

  _swapSlots(fromKey, toKey) {
    const isSPfrom = fromKey.includes('SP');
    const isSPto   = toKey.includes('SP');
    if (isSPfrom !== isSPto) return;

    const fromSlot = this.lineup.find(s => s.slot === fromKey);
    const toSlot   = this.lineup.find(s => s.slot === toKey);
    if (!fromSlot || !toSlot) return;

    const fromP = fromSlot.pid ? State.pitchers.find(p => p[PITCHER_COL.KEY] === fromSlot.pid) : null;
    const toP   = toSlot.pid   ? State.pitchers.find(p => p[PITCHER_COL.KEY] === toSlot.pid)   : null;

    const tmpPid = fromSlot.pid; fromSlot.pid = toSlot.pid; toSlot.pid = tmpPid;

    // 보정 스탯 즉시 갱신을 위해 pitcherLineup 행도 교환
    const fromIdx = SLOT_ORDER_ALL.indexOf(fromKey);
    const toIdx   = SLOT_ORDER_ALL.indexOf(toKey);
    if (State.pitcherLineup && fromIdx >= 0 && toIdx >= 0) {
      const tmp = State.pitcherLineup[fromIdx];
      State.pitcherLineup[fromIdx] = State.pitcherLineup[toIdx];
      State.pitcherLineup[toIdx] = tmp;
    }

    const fromName = fromP ? fromP[PITCHER_COL.NAME] : '';
    const toName   = toP   ? toP[PITCHER_COL.NAME]   : '';

    this.renderGrid();
    this.renderLower();

    let savedCount = 0;
    const onSaved = () => {
      if (++savedCount < 2) return;
      showRefreshing('동기화 중...');
      Api.call('getPitcherLineup', [State.clubId]).then(res => {
          if (res.success) State.pitcherLineup = res.data;
          PitcherTab.renderGrid();
          PitcherTab.renderLower();
          loadShortcutData();
          hideRefreshing();
        }).catch(() => { hideRefreshing(); });
    };
    Api.call('setPitcherLineupSlot', [State.clubId, PITCHER_SLOT_INDEX[toKey], fromName]).then(onSaved).catch(e => { alert('저장 실패: ' + e.message); onSaved(); });
    Api.call('setPitcherLineupSlot', [State.clubId, PITCHER_SLOT_INDEX[fromKey], toName]).then(onSaved).catch(e => { alert('저장 실패: ' + e.message); onSaved(); });
  },

  onGridSlotClick(slotKey) {
    this.setActiveSlot(slotKey);
    SwapModal.open(false, slotKey);
  },

  setActiveSlot(slotKey) {
    this.activeSlot = this.activeSlot === slotKey ? null : slotKey;
    document.querySelectorAll('.pl-grid-slot').forEach(el => {
      el.classList.toggle('pl-active', el.dataset.slot === this.activeSlot);
    });
    document.querySelectorAll('.pl-lower-row[data-slot]').forEach(row => {
      row.classList.toggle('pl-active', row.dataset.slot === this.activeSlot);
    });
  },

  _renderTacticBanner() {
    const wrap = document.getElementById('pl-tactic-banner-wrap');
    if (!wrap) return;
    const tacticStatus = State.teamInfo?.tacticStatus || '';
    const isOk = String(tacticStatus).includes('정상');
    const cls = tacticStatus ? (isOk ? 'ok' : 'warn') : 'neutral';
    wrap.innerHTML = `<div class="pl-tactic-banner ${cls}">
      <span>${tacticStatus || '—'}</span>
      ${!isOk && tacticStatus ? '<span style="font-size:9px;margin-top:1px;">중계투수의 역할과 투수전술을 확인하세요</span>' : ''}
    </div>`;
  },

  renderLower() {
    const container = document.getElementById('pl-lower-grid');
    if (!container) return;
    container.innerHTML = '';

    const addHd = text => {
      const hd = document.createElement('div');
      hd.className = 'pl-group-hd';
      hd.textContent = text;
      container.appendChild(hd);
    };

    addHd('SP 선발');
    ['1SP','2SP','3SP','4SP','5SP'].forEach(k => container.appendChild(this._makeLowerRow(k)));
    addHd('RP 중계');
    ['1RP','2RP','3RP','4RP','5RP','6RP'].forEach(k => container.appendChild(this._makeLowerRow(k)));
    addHd('CP 마무리');
    container.appendChild(this._makeLowerRow('CP'));
  },

  _makeLowerRow(slotKey) {
    const slotIdx = SLOT_ORDER_ALL.indexOf(slotKey);
    const sr   = (State.pitcherLineup || [])[slotIdx] || [];
    const slot = this.lineup.find(s => s.slot === slotKey);
    const p    = slot?.pid ? State.pitchers.find(pt => pt[PITCHER_COL.KEY] === slot.pid) : null;
    const isActive = this.activeSlot === slotKey;
    const col  = p ? TYPE_COLOR[p[PITCHER_COL.TYPE]] || 'sig' : '';
    const isRP = slotKey.includes('RP');

    const row = document.createElement('div');
    row.className  = `pl-lower-row${isActive ? ' pl-active' : ''}${!p ? ' pl-lower-empty' : ''}`;
    row.dataset.slot = slotKey;
    row.style.borderLeft = p ? `3px solid ${CARD_BD[col]}` : '3px solid transparent';

    if (p) {
      const boj   = fmt1((sr[7]  !== '' && sr[7]  != null) ? sr[7]  : (p[PITCHER_COL.BOJ]  ?? ''));
      const intStat = v => {
        if (v === '' || v == null || v === '-') return '-';
        const n = Number(v);
        return Number.isFinite(n) ? String(Math.round(n)) : String(v);
      };
      const s_ch  = intStat((sr[8]  !== '' && sr[8]  != null) ? sr[8]  : (p[PITCHER_COL.S_CH] ?? ''));
      const s_gw  = intStat((sr[10] !== '' && sr[10] != null) ? sr[10] : (p[PITCHER_COL.S_GW] ?? ''));
      const pot1  = sr[13] || p[PITCHER_COL.POT_JS] || '-';
      const pot2  = sr[14] || p[PITCHER_COL.POT_CM] || '-';
      const pot3  = sr[15] || p[PITCHER_COL.POT_CG] || '-';
      const pot4  = sr[16] || p[PITCHER_COL.POT_AW] || '-';
      const sk1n  = sr[18] || p[PITCHER_COL.SK1N] || '-';
      const sk1l  = sr[19] || p[PITCHER_COL.SK1L];
      const sk2n  = sr[20] || p[PITCHER_COL.SK2N] || '-';
      const sk2l  = sr[21] || p[PITCHER_COL.SK2L];
      const sk3n  = sr[22] || p[PITCHER_COL.SK3N] || '-';
      const sk3l  = sr[23] || p[PITCHER_COL.SK3L];
      const score     = fmt2((sr[12] !== '' && sr[12] != null) ? sr[12] : (p[PITCHER_COL.LINEUP_SCORE] ?? ''));
      const scoreProb = fmtPct((sr[25] !== '' && sr[25] != null) ? sr[25] : (p[PITCHER_COL.SCORE_PROB] ?? ''));

      const rpRoleHtml = isRP
        ? `<select class="rp-role-select" onclick="event.stopPropagation()" onchange="PitcherTab.saveRole('${slotKey}',this.value)">
            ${(RP_ROLES[slotKey] || []).map(r => `<option value="${r}" ${slot.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>`
        : '';

      row.innerHTML = `
        <div class="pl-slot-wrap">
          <span class="pl-slot-lbl">${slotKey}</span>
          ${rpRoleHtml}
        </div>
        <span class="row-sep"></span>
        <div class="pl-row-info">
          <div class="pl-name">${p[PITCHER_COL.YEAR]} ${p[PITCHER_COL.NAME]}</div>
          <div class="pl-sub">${TYPE_MAP[p[PITCHER_COL.TYPE]] || p[PITCHER_COL.TYPE]} · ${p[PITCHER_COL.AWAKEN]} · ${p[PITCHER_COL.PITCH] || '?'}</div>
        </div>
        <span class="row-sep"></span>
        <div class="pl-boj"><span class="ovr-lbl">OVR</span>${boj}</div>
        <span class="row-sep"></span>
        <div class="pl-stats">
          <div class="hl-sr"><span class="hl-sl">변화</span><span class="hl-sv">${s_ch}</span></div>
          <div class="hl-sr"><span class="hl-sl">구위</span><span class="hl-sv">${s_gw}</span></div>
        </div>
        <span class="row-sep"></span>
        <div class="pl-pot">
          <div class="hl-sr"><span class="hl-sl" style="width:28px;">장억</span><span class="hl-sv ${POT_CLASS(pot1)}" style="flex:1;text-align:center;">${pot1}</span></div>
          <div class="hl-sr"><span class="hl-sl" style="width:28px;">침착</span><span class="hl-sv ${POT_CLASS(pot2)}" style="flex:1;text-align:center;">${pot2}</span></div>
          <div class="hl-sr"><span class="hl-sl" style="width:28px;">변화구</span><span class="hl-sv ${POT_CLASS(pot3)}" style="flex:1;text-align:center;">${pot3}</span></div>
          <div class="hl-sr"><span class="hl-sl" style="width:28px;">각잠</span><span class="hl-sv ${POT_CLASS(pot4)}" style="flex:1;text-align:center;">${pot4}</span></div>
        </div>
        <span class="row-sep"></span>
        <div class="pl-skills">
          <div class="hl-sk">${sk1n} <span class="hl-skl">${sk1l && sk1l !== '-' ? sk1l + '렙' : '-'}</span></div>
          <div class="hl-sk">${sk2n} <span class="hl-skl">${sk2l && sk2l !== '-' ? sk2l + '렙' : '-'}</span></div>
          <div class="hl-sk">${sk3n} <span class="hl-skl">${sk3l && sk3l !== '-' ? sk3l + '렙' : '-'}</span></div>
          <div class="hl-sk-score">점수 <b>${score}</b></div>
        </div>`;
      row.onclick = () => { PitcherTab.setActiveSlot(slotKey); SwapModal.open(false, slotKey); };
    } else {
      row.innerHTML = `
        <span class="pl-slot-lbl">${slotKey}</span>
        <span class="pl-empty-hint">${slotKey} 선수를 추가해주세요</span>`;
      row.onclick = () => SwapModal.open(false, slotKey);
    }

    return row;
  },

  saveRole(slotKey, role) {
    const slot = this.lineup.find(s => s.slot === slotKey);
    if (slot) slot.role = role;
    const badge = document.getElementById(`pl-rb-${slotKey}`);
    if (badge) badge.textContent = role;
    const rpIndex = parseInt(slotKey.replace('RP', ''));
    Api.call('setRpRole', [State.clubId, rpIndex, role]).then(res => {
        if (res.tacticStatus !== undefined) {
          if (!State.teamInfo) State.teamInfo = {};
          State.teamInfo.tacticStatus = res.tacticStatus;
        }
        PitcherTab._renderTacticBanner();
      }).catch(e => alert('저장 실패: ' + e.message));
  },

  renderStorage() {
    renderStorageTable('pitcher-storage-list', 'pitcher-scroll-hd', State.pitchers, false, this.currentFilter);
    if (typeof PitcherStorageModal !== 'undefined') PitcherStorageModal._applyBodyScale();
    requestAnimationFrame(() => applyFilterBarScale('pitcher-filter-bar'));
  },

  filterPos(pos, btn) {
    document.querySelectorAll('#pitcher-storage-view .filter-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    this.currentFilter = pos;
    this.renderStorage();
  }
};

const PitcherStorageModal = {
  open(key) {
    const p = State.pitchers.find(h => h[PITCHER_COL.KEY] === key);
    if (!p) return;

    const col = TYPE_COLOR[p[PITCHER_COL.TYPE]] || 'sig';
    const bg  = CARD_BG[col];
    const bd  = CARD_BD[col];
    const pos  = p[PITCHER_COL.POS];
    const type = p[PITCHER_COL.TYPE];
    const nick = p[PITCHER_COL.NICK];
    const nm   = p[PITCHER_COL.NAME];
    const yr   = p[PITCHER_COL.YEAR];
    const aw   = p[PITCHER_COL.AWAKEN];
    const pitch = p[PITCHER_COL.PITCH] || '?';
    const boj  = fmt1(p[PITCHER_COL.BOJ]);
    const pot1 = p[PITCHER_COL.POT_JS] || '-';
    const pot2 = p[PITCHER_COL.POT_CM] || '-';
    const pot3 = p[PITCHER_COL.POT_CG] || '-';
    const pot4 = p[PITCHER_COL.POT_AW] || '-';
    const sk1n = p[PITCHER_COL.SK1N] || '-'; const sk1l = p[PITCHER_COL.SK1L];
    const sk2n = p[PITCHER_COL.SK2N] || '-'; const sk2l = p[PITCHER_COL.SK2L];
    const sk3n = p[PITCHER_COL.SK3N] || '-'; const sk3l = p[PITCHER_COL.SK3L];
    const score      = (p[PITCHER_COL.SCORE] != null && p[PITCHER_COL.SCORE] !== '') ? String(p[PITCHER_COL.SCORE]) : '-';
    const scoreProb  = fmtPct(p[PITCHER_COL.SCORE_PROB]);
    const trainRedist = (p[PITCHER_COL.TRAIN] != null && p[PITCHER_COL.TRAIN] !== '') ? String(p[PITCHER_COL.TRAIN]) : '-';
    const trainProb   = fmtPct(p[PITCHER_COL.TRAIN_PROB]);
    const spRedist    = (p[PITCHER_COL.SP] != null && p[PITCHER_COL.SP] !== '') ? String(p[PITCHER_COL.SP]) : '-';
    const spProb      = fmtPct(p[PITCHER_COL.SP_PROB]);
    const potm  = p[PITCHER_COL.POTM];
    const toChk = v => v === true || v === 'TRUE' || v === 'true';
    const sp75  = toChk(p[PITCHER_COL.SETPO75]);
    const sp180 = toChk(p[PITCHER_COL.SETPO180]);
    const sp190 = toChk(p[PITCHER_COL.SETPO190]);
    const stat1 = fmt1(p[PITCHER_COL.S_CH]);
    const stat2 = fmt1(p[PITCHER_COL.S_GW]);

    document.getElementById('psd-card').innerHTML =
      `<div onclick="PhotoModal.open('${key}',false);event.stopPropagation();">${makeCard(p, 60, false)}</div>`;

    document.getElementById('psd-info').innerHTML = `
      <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px;">
        <span class="type-badge" style="background:${bd}22;color:${bg};">${pos}</span>
        <span class="type-badge" style="background:${bd}22;color:${bg};font-size:8px;">${TYPE_MAP[type]||type}</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:1px;">${nick}</div>
      <div style="font-size:11px;color:var(--text-secondary);">${yr} ${nm}</div>
      <div style="font-size:10px;color:var(--text-tertiary);">${aw} · ${pitch}</div>
      <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:6px;line-height:1;">${boj}</div>`;

    document.getElementById('psd-body').innerHTML = `
      <div class="hsd-section hsd-two-col">
        <div class="hsd-col">
          <div class="hsd-sec-title">스탯</div>
          <div class="hsd-row">
            ${[['변화',stat1],['구위',stat2]].map(([l,v])=>`
              <div class="hsd-stat-item"><span class="hsd-lbl">${l}</span><span class="hsd-val">${v}</span></div>`).join('')}
          </div>
        </div>
        <div class="hsd-col-div"></div>
        <div class="hsd-col">
          <div class="hsd-sec-title">잠재력</div>
          <div class="hsd-row">
            ${[['장억',pot1],['침착',pot2],['변화구',pot3],['각잠',pot4]].map(([l,v])=>`
              <div class="hsd-stat-item"><span class="hsd-lbl">${l}</span><span class="hsd-val ${POT_CLASS(v)}">${v}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="hsd-section hsd-two-col">
        <div class="hsd-col">
          <div class="hsd-sec-title">스킬</div>
          <div style="display:flex;gap:4px;margin-bottom:5px;">
            ${[[sk1n,sk1l],[sk2n,sk2l],[sk3n,sk3l]].map(([n,l])=>`
              <div class="hsd-skill-item">
                <div style="font-size:10px;color:var(--text-primary);white-space:nowrap;">${n}</div>
                <div style="font-size:9px;color:var(--text-tertiary);">${l&&l!=='-'?l+'렙':'-'}</div>
              </div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text-secondary);">스킬점수 <b>${score}</b> · 확률 <b>${scoreProb}</b></div>
        </div>
        <div class="hsd-col-div"></div>
        <div class="hsd-col">
          <div class="hsd-sec-title">재분배</div>
          <div class="hsd-row">
            <div class="hsd-stat-item"><span class="hsd-lbl">훈련</span><span class="hsd-val">${trainRedist}</span><span style="font-size:9px;color:var(--text-tertiary);">${trainProb}</span></div>
            <div class="hsd-stat-item"><span class="hsd-lbl">특훈</span><span class="hsd-val">${spRedist}</span><span style="font-size:9px;color:var(--text-tertiary);">${spProb}</span></div>
          </div>
        </div>
      </div>`;

    document.getElementById('psd-checks').innerHTML = `
      <label class="hsd-chk-label">셋포75<input type="checkbox" class="setpo-chk" ${sp75?'checked':''} data-key="${key}" data-idx="0" data-ishitter="false" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">셋포180<input type="checkbox" class="setpo-chk" ${sp180?'checked':''} data-key="${key}" data-idx="1" data-ishitter="false" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">셋포190<input type="checkbox" class="setpo-chk" ${sp190?'checked':''} data-key="${key}" data-idx="2" data-ishitter="false" onchange="onSetpoChange(this)"></label>
      <label class="hsd-chk-label">POTM<input type="checkbox" ${potm?'checked':''} onchange="onPotmChange('${key}',this.checked,false)"></label>`;

    document.getElementById('psd-edit-btn').onclick = () => { PitcherStorageModal.close(); EditModal.open(key, false); };
    document.getElementById('psd-del-btn').onclick  = () => { PitcherStorageModal.close(); onDeletePlayer(key, false); };

    document.getElementById('psd-modal').style.display = 'flex';
    requestAnimationFrame(() => PitcherStorageModal._applyBodyScale());
  },

  _applyBodyScale() {
    const body = document.getElementById('psd-body');
    if (!body) return;
    const NAT_W = 440;
    const availW = window.innerWidth - 32;
    const z = Math.min(1, availW / NAT_W);
    body.style.zoom = z < 1 ? String(z) : '';
  },

  close() {
    document.getElementById('psd-modal').style.display = 'none';
  }
};

const SETDECK_ITEMS = [
  { key:'d40',  cell:'V5',  desc:'[40] 타자+1 vs 투수+1' },
  { key:'d60',  cell:'V6',  desc:'[60] 타자+1 vs 투수+1' },
  { key:'d70',  cell:'V7',  desc:'[70] 선발+1 vs 불펜+2' },
  { key:'d75',  cell:'V8',  desc:'[75] 연도 파정+3 vs 연도 구+3' },
  { key:'d80',  cell:'V9',  desc:'[80] 타자+1 vs 투수+1' },
  { key:'d90',  cell:'V10', desc:'[90] 내포 인+2 vs 외지 선+2' },
  { key:'d100', cell:'X5',  desc:'[100] 타자+1 vs 투수+1' },
  { key:'d115', cell:'X6',  desc:'[115] 하위 정+2 vs 불펜 구+2' },
  { key:'d120', cell:'X7',  desc:'[120] 중심+2 vs 선발+1' },
  { key:'d135', cell:'X8',  desc:'[135] 중심 정+2 vs 선발 구+1' },
  { key:'d140', cell:'X9',  desc:'[140] 하위+1 vs 불펜+1' },
  { key:'d145', cell:'X10', desc:'[145] 상위 정선+2 vs 선발 구+1' },
  { key:'d155', cell:'Z5',  desc:'[155] 상위 파선인+2 vs 선발 변+1' },
  { key:'d160', cell:'Z6',  desc:'[160] 타자+1 vs 투수+1' },
  { key:'d165', cell:'Z7',  desc:'[165] 타자 정+1 vs 투수 변+1' },
  { key:'d175', cell:'Z8',  desc:'[175] 타자 파선인+1 vs 투수 구+1' },
  { key:'d180', cell:'Z9',  desc:'[180] 연도+1 (타자:좌 / 투수:우)' },
  { key:'d200', cell:'Z10', desc:'[200] 타자+2 vs 투수+2' },
];

const BASIC_FIELDS = [
  { key:'hitterNational',  label:'타자국에',    options:['X','5렙','6렙'] },
  { key:'pitcherNational', label:'투수국에',    options:['X','5렙','6렙'] },
  { key:'catcherLead',     label:'포수리드',    options:['X','5렙','6렙','7렙','8렙','9렙','10렙'] },
  { key:'tacticLayout',    label:'투수전술 배치', options:['114','240','141','330'] },
  { key:'winTactic',       label:'승리조 전술',  options:['기본','적극','분업'] },
  { key:'chaseTactic',     label:'추격조 전술',  options:['기본','적극'] },
  // captain, pitchCaptain → renderCaptainArea()로 이동
];

const HITTER_POSITIONS = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const PITCHER_POSITIONS = ['SP1','SP2','SP3','SP4','SP5','RP1','RP2','RP3','RP4','RP5','RP6','CP'];

const TeamTab = {
  data: null,
  postrainType: null,
  postrainIdx: null,

  load() {
    Api.call('getTeamInfo', [State.clubId]).then(res => {
        if (res.success) {
          this.data = res;
          State.teamInfo = { tacticStatus: res.tacticStatus };
          this.render();
        }
      }).catch(e => console.error(e));
  },

  render() {
    this.renderBasic();
    this.renderLockerRow();
    this.renderCaptainArea();
    this.renderSetdeck();
    this.renderPostrain();
    this.renderTacticStatus();
  },

  renderTacticStatus() {
    const status = this.data?.tacticStatus || '';
    const isOk = String(status).includes('정상');
    const badge = `<div class="tactic-status ${isOk ? 'ok' : 'warn'}">
      <span>${status || '—'}</span>
      ${!isOk && status ? '<span style="font-size:12px;margin-top:2px;">중계투수의 역할과 투수전술을 확인하세요</span>' : ''}
    </div>`;
    document.querySelectorAll('.tactic-status-slot').forEach(el => { el.innerHTML = badge; });
  },

  renderBasic() {
    const container = document.getElementById('team-basic-info');
    if (!container || !this.data) return;
    const basic = this.data.basic;

    container.innerHTML = BASIC_FIELDS.map(f => {
      const val = basic[f.key] || '';
      return `<div>
        <div style="font-size:9px;color:var(--text-tertiary);margin-bottom:2px;">${f.label}</div>
        <select class="kv-edit" id="basic-${f.key}" style="width:100%;font-size:11px;">
          ${f.options.map(o => `<option value="${o}" ${val==o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>`;
    }).join('');
  },

  renderLockerRow() {
    const container = document.getElementById('team-locker-row');
    if (!container || !this.data) return;
    const basic = this.data.basic;
    const lockerLabels = ['파워','정확','선구','인내','변화','구위'];

    container.innerHTML = lockerLabels.map((lbl, i) =>
      `<div class="locker-item">
        <label>${lbl}</label>
        <input class="kv-edit" id="locker-${i}" type="number" min="0" max="9" value="${basic.lockerStats?.[i]||0}">
      </div>`
    ).join('');
  },

  renderCaptainArea() {
    if (!this.data) return;
    const basic = this.data.basic;
    const hitterNames = (State.hitterLineup || []).map(r => r[6]).filter(Boolean);
    const pitcherNames = (State.pitcherLineup || []).map(r => r[6]).filter(Boolean);
    const allNames = [...new Set([...hitterNames, ...pitcherNames])];
    const captainVal = basic.captain || '';
    const pitchCapVal = basic.pitchCaptain || '';
    const lockerLabels = ['파워','정확','선구','인내','변화','구위'];

    // 주장 영역
    const captainEl = document.getElementById('team-captain-area');
    if (captainEl) {
      captainEl.innerHTML = `
        <select class="kv-edit" id="basic-captain" style="width:100%;font-size:11px;margin-bottom:6px;" onchange="TeamTab._onCaptainChange()">
          <option value="">— 미선택 —</option>
          ${allNames.map(n => `<option value="${n}" ${captainVal===n?'selected':''}>${n}</option>`).join('')}
        </select>
        <button class="bs" style="font-size:12px;padding:2px 6px;width:100%;margin-bottom:6px;" onclick="TeamTab.refreshCaptainDropdown()">라인업 새로고침</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${lockerLabels.map((lbl, i) => {
            const disabled = i >= 4 && captainVal && !this._isCaptainPitcher(captainVal)
              ? '' : i < 4 && this._isCaptainPitcher(captainVal) ? 'disabled' : '';
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
              <span style="font-size:9px;color:var(--text-tertiary);">${lbl}</span>
              <input class="kv-edit" id="captain-${i}" type="number" min="0" max="9" value="${basic.captainStats?.[i]||0}" style="width:100%;text-align:center;font-size:11px;" ${disabled}>
            </div>`;
          }).join('')}
        </div>`;
    }

    // 투수조장 영역
    const pitchCapEl = document.getElementById('team-pitchcap-area');
    if (pitchCapEl) {
      pitchCapEl.innerHTML = `
        <select class="kv-edit" id="basic-pitchCaptain" style="width:100%;font-size:11px;margin-bottom:6px;">
          <option value="">— 미선택 —</option>
          ${pitcherNames.map(n => `<option value="${n}" ${pitchCapVal===n?'selected':''}>${n}</option>`).join('')}
        </select>
        <button class="bs" style="font-size:12px;padding:2px 6px;width:100%;margin-bottom:6px;" onclick="TeamTab.refreshPitchCaptainDropdown()">라인업 새로고침</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
            <span style="font-size:9px;color:var(--text-tertiary);">변화</span>
            <input class="kv-edit" id="pitchcap-0" type="number" min="0" max="9" value="${basic.pitchCaptainStats?.[0]||0}" style="width:100%;text-align:center;font-size:11px;">
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
            <span style="font-size:9px;color:var(--text-tertiary);">구위</span>
            <input class="kv-edit" id="pitchcap-1" type="number" min="0" max="9" value="${basic.pitchCaptainStats?.[1]||0}" style="width:100%;text-align:center;font-size:11px;">
          </div>
        </div>`;
    }
  },

  _onCaptainChange() {
    const sel = document.getElementById('basic-captain');
    if (!sel) return;
    const captainVal = sel.value;
    const isPitcher = captainVal ? this._isCaptainPitcher(captainVal) : null;

    if (isPitcher === true) {
      // 투수 주장: 타자 능력치(파워·정확·선구·인내) 0 리셋 후 잠금
      [0,1,2,3].forEach(i => {
        const inp = document.getElementById('captain-' + i);
        if (inp) { inp.value = 0; inp.disabled = true; }
      });
      [4,5].forEach(i => {
        const inp = document.getElementById('captain-' + i);
        if (inp) inp.disabled = false;
      });
    } else if (isPitcher === false) {
      // 타자 주장: 투수 능력치(변화·구위) 0 리셋 후 잠금
      [4,5].forEach(i => {
        const inp = document.getElementById('captain-' + i);
        if (inp) { inp.value = 0; inp.disabled = true; }
      });
      [0,1,2,3].forEach(i => {
        const inp = document.getElementById('captain-' + i);
        if (inp) inp.disabled = false;
      });
    } else {
      // 미선택: 전체 0 리셋 후 잠금
      [0,1,2,3,4,5].forEach(i => {
        const inp = document.getElementById('captain-' + i);
        if (inp) { inp.value = 0; inp.disabled = true; }
      });
    }
  },

  _isCaptainPitcher(captainName) {
    const pitcherLineup = State.pitcherLineup || [];
    return pitcherLineup.some(row => row[6] === captainName);
  },

  saveBasic() {
    if (!this.data) return;
    const basic = {};
    BASIC_FIELDS.forEach(f => {
      const el = document.getElementById('basic-' + f.key);
      if (el) basic[f.key] = el.value;
    });
    // captain / pitchCaptain
    const captainEl = document.getElementById('basic-captain');
    const pitchCapEl = document.getElementById('basic-pitchCaptain');
    if (captainEl) basic.captain = captainEl.value;
    if (pitchCapEl) basic.pitchCaptain = pitchCapEl.value;

    basic.lockerStats = Array.from({length:6}, (_,i) => parseInt(document.getElementById('locker-'+i)?.value)||0);
    basic.captainStats = Array.from({length:6}, (_,i) => parseInt(document.getElementById('captain-'+i)?.value)||0);
    basic.pitchCaptainStats = [
      parseInt(document.getElementById('pitchcap-0')?.value)||0,
      parseInt(document.getElementById('pitchcap-1')?.value)||0,
    ];

    return new Promise((resolve, reject) => {
      showLoading('저장 중...');
      Api.call('saveTeamBasic', [State.clubId, basic]).then(() => { hideLoading(); App.refreshLineups(); resolve(); }).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); reject(e); });
    });
  },

  saveAll() {
    this.saveBasic();
    this.saveHitterSkills();
    this.savePitcherSkills();
  },

  renderSetdeck() {
    const list = document.getElementById('setdeck-list');
    if (!list || !this.data) return;
    const sd = this.data.setdeck || {};

    const raolBtn = document.getElementById('deck-raol');
    if (raolBtn) {
      const isOn = sd.raol == 6 || sd.raol === true;
      raolBtn.textContent = isOn ? 'ON' : 'OFF';
      raolBtn.classList.toggle('on', isOn);
    }

    list.innerHTML = SETDECK_ITEMS.map(item => {
      const val = sd[item.key] || '';
      return `<div class="deck-row" style="justify-content:space-between;">
        <button class="deck-btn ${val==='좌'?'on':''}" onclick="TeamTab.setDeck('${item.key}','좌',this)">좌</button>
        <span class="deck-desc" style="flex:1;text-align:center;">${item.desc}</span>
        <button class="deck-btn ${val==='우'?'on':''}" onclick="TeamTab.setDeck('${item.key}','우',this)">우</button>
      </div>`;
    }).join('');
  },

  setDeck(key, val, btn) {
    if (!this.data) return;
    const row = btn.closest('.deck-row');
    row.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    if (!this.data.setdeck) this.data.setdeck = {};
    this.data.setdeck[key] = val;
    Api.call('saveSetdeck', [State.clubId, {[key]: val}]).then(() => loadShortcutData()).catch(e => alert('저장 실패: ' + e.message));
  },

  toggleRaol(btn) {
    const isOn = btn.classList.toggle('on');
    btn.textContent = isOn ? 'ON' : 'OFF';
    const val = isOn ? 6 : 0;
    if (this.data) { if (!this.data.setdeck) this.data.setdeck = {}; this.data.setdeck.raol = val; }
    Api.call('saveSetdeck', [State.clubId, {raol: val}]).then(() => loadShortcutData()).catch(e => alert('저장 실패: ' + e.message));
  },

  saveSynergy() {
    const synergy = {
      live:      document.getElementById('syn-live')?.checked  || false,
      impact:    document.getElementById('syn-impact')?.checked || false,
      signature: document.getElementById('syn-sig')?.checked   || false,
    };
    Api.call('saveSynergy', [State.clubId, synergy]).then(() => App.refreshLineups()).catch(e => alert('저장 실패: ' + e.message));
  },

  renderPostrain() {
    this.renderHitterPostrain();
    this.renderPitcherPostrain();

    if (this.data?.synergy) {
      const s = this.data.synergy;
      const live   = document.getElementById('syn-live');
      const impact = document.getElementById('syn-impact');
      const sig    = document.getElementById('syn-sig');
      if (live)   live.checked   = !!s.live;
      if (impact) impact.checked = !!s.impact;
      if (sig)    sig.checked    = !!s.signature;
    }
  },

  renderHitterPostrain() {
    const tbody = document.getElementById('hitter-postrain-body');
    if (!tbody || !this.data) return;
    const rows = this.data.hitterPostrain || [];

    tbody.innerHTML = HITTER_POSITIONS.map((pos, i) => {
      const row = rows[i] || [];
      const lv = row[0] || 0;
      const pw = row[1] || 0;
      const ac = row[2] || 0;
      const sl = row[3] || 0;
      const pt = row[4] || 0;
      const majorSkill = row[5]  || '';
      const basicSkill = row[10] || '';

      return `<tr onclick="TeamTab.openPostrainModal('hitter',${i})">
        <td class="postrain-pos">${pos}</td>
        <td>${lv}</td><td>${pw}</td><td>${ac}</td><td>${sl}</td><td>${pt}</td>
        <td class="postrain-break"></td>
        <td><input class="skill-input" value="${majorSkill}" placeholder="메이저" onclick="event.stopPropagation()" data-type="hitter" data-idx="${i}" data-field="major"></td>
        <td><input class="skill-input" value="${basicSkill}" placeholder="기본" onclick="event.stopPropagation()" data-type="hitter" data-idx="${i}" data-field="basic"></td>
      </tr>`;
    }).join('');
  },

  renderPitcherPostrain() {
    const tbody = document.getElementById('pitcher-postrain-body');
    if (!tbody || !this.data) return;
    const rows = this.data.pitcherPostrain || [];

    tbody.innerHTML = PITCHER_POSITIONS.map((pos, i) => {
      const row = rows[i] || [];
      const lv = row[0] || 0;
      const ch = row[1] || 0;
      const gw = row[2] || 0;
      const majorSkill = row[5]  || '';
      const basicSkill = row[10] || '';

      return `<tr onclick="TeamTab.openPostrainModal('pitcher',${i})">
        <td class="postrain-pos">${pos}</td>
        <td>${lv}</td><td>${ch}</td><td>${gw}</td>
        <td></td><td></td>
        <td class="postrain-break"></td>
        <td><input class="skill-input" value="${majorSkill}" placeholder="메이저" onclick="event.stopPropagation()" data-type="pitcher" data-idx="${i}" data-field="major"></td>
        <td><input class="skill-input" value="${basicSkill}" placeholder="기본" onclick="event.stopPropagation()" data-type="pitcher" data-idx="${i}" data-field="basic"></td>
      </tr>`;
    }).join('');
  },

  openPostrainModal(type, idx) {
    this.postrainType = type;
    this.postrainIdx  = idx;
    const rows = type === 'hitter' ? this.data?.hitterPostrain : this.data?.pitcherPostrain;
    const row = rows?.[idx] || [];
    const posLabel = type === 'hitter' ? HITTER_POSITIONS[idx] : PITCHER_POSITIONS[idx];

    document.getElementById('postrain-modal-title').textContent = `${posLabel} 포지션 특훈`;

    const isHitter = type === 'hitter';
    const lv = row[0] || 0;
    const s1 = row[1] || 0;
    const s2 = row[2] || 0;
    const s3 = isHitter ? (row[3] || 0) : null;
    const s4 = isHitter ? (row[4] || 0) : null;

    let html = `<div class="form-grid">
      <div class="form-group"><label class="form-label">레벨 (0~20)</label><input class="form-input" id="pt-lv" type="number" min="0" max="20" value="${lv}"></div>
      <div class="form-group"><label class="form-label">${isHitter?'파워':'변화'} (0~6)</label><input class="form-input" id="pt-s1" type="number" min="0" max="6" value="${s1}"></div>
      <div class="form-group"><label class="form-label">${isHitter?'정확':'구위'} (0~6)</label><input class="form-input" id="pt-s2" type="number" min="0" max="6" value="${s2}"></div>`;
    if (isHitter) {
      html += `<div class="form-group"><label class="form-label">선구 (0~6)</label><input class="form-input" id="pt-s3" type="number" min="0" max="6" value="${s3}"></div>
        <div class="form-group"><label class="form-label">인내 (0~6)</label><input class="form-input" id="pt-s4" type="number" min="0" max="6" value="${s4}"></div>`;
    }
    html += `</div>`;

    document.getElementById('postrain-modal-body').innerHTML = html;
    document.getElementById('postrain-modal').style.display = 'block';
  },

  closePostrainModal() {
    document.getElementById('postrain-modal').style.display = 'none';
  },

  savePostrainModal() {
    const type = this.postrainType;
    const idx  = this.postrainIdx;
    const isHitter = type === 'hitter';
    const values = {
      level: parseInt(document.getElementById('pt-lv')?.value) || 0,
      stat1: parseInt(document.getElementById('pt-s1')?.value) || 0,
      stat2: parseInt(document.getElementById('pt-s2')?.value) || 0,
    };
    if (isHitter) {
      values.stat3 = parseInt(document.getElementById('pt-s3')?.value) || 0;
      values.stat4 = parseInt(document.getElementById('pt-s4')?.value) || 0;
    }

    showLoading('저장 중...');
    Api.call('savePostrain', [State.clubId, type, idx, values]).then(() => {
        hideLoading();
        this.closePostrainModal();
        this.load();
        App.refreshLineups();
      }).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); });
  },

  saveHitterSkills() {
    const rows = document.querySelectorAll('#hitter-postrain-body tr');
    let saved = 0;
    const total = rows.length;
    if (!total) return;
    showLoading('스킬 저장 중...');

    rows.forEach((tr, i) => {
      const major = tr.querySelector('[data-field="major"]')?.value || '';
      const basic = tr.querySelector('[data-field="basic"]')?.value || '';
      Api.call('savePostrainSkill', [State.clubId, 'hitter', i, major, basic]).then(() => { if (++saved >= total) { hideLoading(); this.load(); loadShortcutData(); } }).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); });
    });
  },

  savePitcherSkills() {
    const rows = document.querySelectorAll('#pitcher-postrain-body tr');
    let saved = 0;
    const total = rows.length;
    if (!total) return;
    showLoading('스킬 저장 중...');

    rows.forEach((tr, i) => {
      const major = tr.querySelector('[data-field="major"]')?.value || '';
      const basic = tr.querySelector('[data-field="basic"]')?.value || '';
      Api.call('savePostrainSkill', [State.clubId, 'pitcher', i, major, basic]).then(() => { if (++saved >= total) { hideLoading(); this.load(); loadShortcutData(); } }).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); });
    });
  },

  refreshCaptainDropdown() {
    const hitterNames  = (State.hitterLineup  || []).map(r => r[6]).filter(Boolean);
    const pitcherNames = (State.pitcherLineup || []).map(r => r[6]).filter(Boolean);
    const allNames = [...new Set([...hitterNames, ...pitcherNames])];
    const sel = document.getElementById('basic-captain');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— 미선택 —</option>' +
      allNames.map(n => `<option value="${n}" ${currentVal===n?'selected':''}>${n}</option>`).join('');
  },

  refreshPitchCaptainDropdown() {
    const pitcherNames = (State.pitcherLineup || []).map(r => r[6]).filter(Boolean);
    const sel = document.getElementById('basic-pitchCaptain');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— 미선택 —</option>' +
      pitcherNames.map(n => `<option value="${n}" ${currentVal===n?'selected':''}>${n}</option>`).join('');
  },
};

// ================================================================
// JS_Constants.html — 공통 상수, State, 컬럼 인덱스, fmt2
// ================================================================

const TYPE_MAP = {
  '골글':'골든글러브','시그':'시그니처','시그(F)':'시그니처(FA)',
  '임팩':'임팩트','임팩(F)':'임팩트(FA)','국대':'국가대표','라올':'라이브/올스타'
};
const TYPE_COLOR = {
  '골글':'golden','시그':'sig','시그(F)':'sig',
  '임팩':'impact','임팩(F)':'impact','국대':'national','라올':'live'
};
const CARD_BG = { golden:'#8B6914', sig:'#993556', impact:'#2D6B1A', national:'#1A6FAA', live:'#0C447C' };
const CARD_BD = { golden:'#C9A227', sig:'#ED93B1', impact:'#97C459', national:'#85B7EB', live:'#378ADD' };

const IS_IMPACT = t => t === '임팩' || t === '임팩(F)';

const SILHOUETTE_SVG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">' +
  '<ellipse cx="50" cy="27" rx="17" ry="19" fill="black" fill-opacity="0.28"/>' +
  '<path d="M38 45 Q50 50 62 45 L63 51 Q50 56 37 51 Z" fill="black" fill-opacity="0.24"/>' +
  '<path d="M8 63 C8 52 26 49 38 52 L50 56 L62 52 C74 49 92 52 92 63 L90 136 L10 136 Z" fill="black" fill-opacity="0.28"/>' +
  '</svg>'
);

const POT_CLASS = v => {
  if (!v || v === '-') return 'pot-none';
  if (v === 'SR+') return 'pot-sr';
  if (v[0] === 'S') return 'pot-s';
  if (v[0] === 'A' || v[0] === 'B' || v === 'C+') return 'pot-a';
  return 'pot-b';
};

const POT_LEVELS = ['-','E','D','D+','C','C+','B','B+','A','A+','S','S+','SS','SS+','SR','SR+'];
const AWAKEN_LIST = ['10강','1각','2각','3각','4각','5각','6각','7각','8각','9각'];
const TYPE_LIST = ['골글','시그','시그(F)','임팩','임팩(F)','국대','라올'];
const SKILL_LEVELS = ['-','5','6','7','8'];

const RP_ROLES = {
  '1RP':['승리1','승리2','셋업1','셋업2'],
  '2RP':['승리1','승리2','셋업1','셋업2','추격1','추격2','추격3','추격4'],
  '3RP':['승리1','셋업1','셋업2','추격1','추격2','추격3','추격4','롱릴1','롱릴2','롱릴3','롱릴4'],
  '4RP':['추격1','추격2','추격3','추격4','롱릴1','롱릴2','롱릴3','롱릴4'],
  '5RP':['추격1','추격2','추격3','추격4','롱릴1','롱릴2','롱릴3','롱릴4'],
  '6RP':['추격1','추격2','추격3','추격4','롱릴1','롱릴2','롱릴3','롱릴4'],
};

// ================================================================
// 앱 상태
// ================================================================
const TEAM_LOGO_MAP = {
  'KIA': '/assets/logos/png/KIA.png?v=20260504-2',
  'KIA 타이거즈': '/assets/logos/png/KIA.png?v=20260504-2',
  'KT': '/assets/logos/png/kt.png?v=20260504-2',
  'kt': '/assets/logos/png/kt.png?v=20260504-2',
  'KT 위즈': '/assets/logos/png/kt.png?v=20260504-2',
  'LG': '/assets/logos/png/LG.png?v=20260504-2',
  'LG 트윈스': '/assets/logos/png/LG.png?v=20260504-2',
  'NC': '/assets/logos/png/NC.png?v=20260504-2',
  'NC 다이노스': '/assets/logos/png/NC.png?v=20260504-2',
  'SSG': '/assets/logos/png/SSG.png?v=20260504-2',
  'SSG 랜더스': '/assets/logos/png/SSG.png?v=20260504-2',
  '두산': '/assets/logos/png/두산.png?v=20260504-2',
  '두산 베어스': '/assets/logos/png/두산.png?v=20260504-2',
  '롯데': '/assets/logos/png/롯데.png?v=20260504-2',
  '롯데 자이언츠': '/assets/logos/png/롯데.png?v=20260504-2',
  '삼성': '/assets/logos/png/삼성.png?v=20260504-2',
  '삼성 라이온즈': '/assets/logos/png/삼성.png?v=20260504-2',
  '키움': '/assets/logos/png/키움.png?v=20260504-2',
  '키움 히어로즈': '/assets/logos/png/키움.png?v=20260504-2',
  '한화': '/assets/logos/png/한화.png?v=20260504-2',
  '한화 이글스': '/assets/logos/png/한화.png?v=20260504-2',
};

function getTeamLogoSrc(teamName, fallbackUrl) {
  const name = String(teamName || '').trim();
  if (!name) return fallbackUrl || '';
  if (TEAM_LOGO_MAP[name]) return TEAM_LOGO_MAP[name];
  const foundKey = Object.keys(TEAM_LOGO_MAP).find(key => name.includes(key) || key.includes(name));
  return foundKey ? TEAM_LOGO_MAP[foundKey] : (fallbackUrl || '');
}

const State = {
  clubId: null,
  email: null,
  hitters: [],
  pitchers: [],
  hitterLineup: [],
  pitcherLineup: [],
  teamInfo: null, // { tacticStatus, ... }
  hitterSkills: [],
  pitcherSkills: [],
  photoCache: {},
};

// ================================================================
// 타자 DB 열 인덱스 (0-based)
// ================================================================
const HITTER_COL = {
  ID:0, CLUB:1, TS:2,
  NICK:3, POS:4, TYPE:5, AWAKEN:6, YEAR:7, NAME:8,
  POT_FS:9, POT_CL:10, POT_SO:11, POT_AW:12,
  SK1N:13, SK1L:14, SK2N:15, SK2L:16, SK3N:17, SK3L:18,
  POW_B:19, POW_T:20, POW_S:21,
  ACC_B:22, ACC_T:23, ACC_S:24,
  SEL_B:25, SEL_T:26, SEL_S:27,
  PAT_B:28, PAT_T:29, PAT_S:30,
  BAT:31, ANG:32, WHITE:33, CALL:34,
  POTM:35, PHOTO:36, ORDER:37, KEY:38,
  SETPO75:39, SETPO180:40, SETPO185:41,
  // 개인시트 계산값 (getHitters append 순서)
  BOJ:42, S_POW:43, S_ACC:44, S_SEL:45, S_PAT:46,
  SCORE:47, SCORE_PROB:48,
  TRAIN:49, TRAIN_PROB:50, SP:51, SP_PROB:52,
  LINEUP_SCORE:53,
};

// ================================================================
// 투수 DB 열 인덱스 (0-based)
// ================================================================
const PITCHER_COL = {
  ID:0, CLUB:1, TS:2,
  NICK:3, POS:4, TYPE:5, AWAKEN:6, YEAR:7, NAME:8,
  POT_JS:9, POT_CM:10, POT_CG:11, POT_AW:12,
  SK1N:13, SK1L:14, SK2N:15, SK2L:16, SK3N:17, SK3L:18,
  CH_B:19, CH_T:20, CH_S:21,
  GW_B:22, GW_T:23, GW_S:24,
  PITCH:25,
  POTM:26, PHOTO:27, ORDER:28, KEY:29,
  SETPO75:30, SETPO180:31, SETPO190:32,
  // 개인시트 계산값 (getPitchers append 순서)
  BOJ:33, S_CH:34, S_GW:35, S_M:36, S_N:37,
  SCORE:38, SCORE_PROB:39,
  TRAIN:40, TRAIN_PROB:41, SP:42, SP_PROB:43,
  LINEUP_SCORE:44,
};

// ================================================================
// 공통 유틸
// ================================================================

// 소수점 2째자리 반올림
function fmt2(v) {
  if (v === null || v === undefined || v === '' || v === '-') return '-';
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return String(v);
  return String(Math.round(n * 100) / 100);
}
// 소수점 1째자리 고정 표시 (보정스탯, 스킬점수용 — 정수도 423.0 형태)
function fmt1(v) {
  if (v === null || v === undefined || v === '' || v === '-') return '-';
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return String(v);
  return n.toFixed(1);
}
// 확률 % 표기 (소수점 2째자리)
// GAS getValue()는 시트 % 셀을 0~1 소수로 반환 → ×100 후 표시
function fmtPct(v) {
  if (v === null || v === undefined || v === '' || v === '-') return '-';
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return String(v);
  return (Math.round(n * 10000) / 100).toFixed(2) + '%';
}

function showScreen(id) {
  ['login-screen','onboarding-screen','app-screen'].forEach(s => {
    document.getElementById(s).style.display = s === id ? (s === 'app-screen' ? 'block' : 'flex') : 'none';
  });
}

function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || '처리 중...';
  document.getElementById('global-loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('global-loading').style.display = 'none';
}

// 비차단 토스트 — 다른 작업 가능, 우하단 고정
function showRefreshing(msg, options) {
  clearTimeout(showRefreshNotice._timer);
  let el = document.getElementById('refresh-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'refresh-toast';
    document.body.appendChild(el);
  }
  const showSpinner = !options || options.spinner !== false;
  el.innerHTML = `${showSpinner ? '<div class="refresh-spin"></div>' : ''}<span>${msg || '동기화 중...'}</span>`;
  el.style.display = 'flex';
}

function hideRefreshing() {
  const el = document.getElementById('refresh-toast');
  if (el) el.style.display = 'none';
}

function showRefreshNotice(msg, durationMs) {
  showRefreshing(msg, { spinner: false });
  clearTimeout(showRefreshNotice._timer);
  showRefreshNotice._timer = setTimeout(hideRefreshing, durationMs || 2200);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ================================================================
// JS_Card.html — 선수 카드 HTML 생성 헬퍼
// ================================================================

function photoFileId(url) {
  if (!url) return '';
  var s = String(url).trim();
  if (s.indexOf('data:') === 0) return '';
  if (/^[A-Za-z0-9_-]{20,}$/.test(s) && s.indexOf('/') === -1) {
    return s;
  }
  var idx = s.indexOf('id=');
  if (idx === -1) {
    var m = s.match(/\/file\/d\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  var rest = s.slice(idx + 3);
  var fileId = rest.indexOf('&') === -1 ? rest : rest.slice(0, rest.indexOf('&'));
  return fileId ? decodeURIComponent(fileId) : '';
}

function normPhotoUrl(url) {
  if (!url) return '';
  var s = String(url).trim();
  if (s.indexOf('data:') === 0) return s;
  var fileId = photoFileId(s);
  if (fileId) return photoProxyUrl(fileId);
  return s;
}

function photoProxyUrl(fileId) {
  return '/api/photo?id=' + encodeURIComponent(fileId);
}

function _awOpacity(aw) {
  if (!aw || aw.includes('강')) return 0.20;
  const n = parseInt(aw) || 1;
  return Math.min(0.20 + n * 0.07, 0.83);
}

function _cardStrokeVar(bd) {
  return `--card-stroke:${bd || 'rgba(0,0,0,0.9)'};`;
}

function _cardAwBadgeHtml(aw) {
  const text = String(aw || '').trim();
  const awakenMatch = text.match(/^([1-9])각$/);
  if (text === '10강') {
    return `<div class="card-aw-badge card-aw-badge--plus"><span>+10</span></div>`;
  }
  if (awakenMatch) {
    return `<div class="card-aw-badge card-aw-badge--diamond"><span>${awakenMatch[1]}</span></div>`;
  }
  return `<div class="card-aw-badge card-aw-badge--plain"><span>${text}</span></div>`;
}

function _cardChromeHtml(boj, pos, yr, nm, aw, isFa, subStat) {
  const faHtml = isFa ? `<span class="card-fa-tag">(FA)</span>` : '';
  const hasSubStat = subStat != null && subStat !== '';
  const subStatHtml = hasSubStat ? `<span class="card-sub-stat">${subStat}</span>` : '';
  const badgeRowClass = hasSubStat ? 'card-top-badge-row has-sub-stat' : 'card-top-badge-row';
  return `
    <div class="card-top">
      <div class="card-top-main-row">
        <div class="card-big-num">${boj}</div>
        <span class="card-pos">${pos}</span>
      </div>
      <div class="${badgeRowClass}">
        ${subStatHtml}
        ${_cardAwBadgeHtml(aw)}
      </div>
    </div>
    <div class="card-bot">
      <div class="card-meta-row">
        <div class="card-yr-row"><span class="card-yr">${yr}</span>${faHtml}</div>
      </div>
      <div class="card-nm">${nm}</div>
    </div>`;
}

function _cardPhotoHtml(photoUrl) {
  return photoUrl
    ? `<img class="card-photo-img" src="${photoUrl}" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><div class="card-silhouette" style="display:none;"></div>`
    : `<div class="card-silhouette"></div>`;
}

function makeCard(p, w, isHitter, posOverride) {
  const h = Math.round(w * 1.5);
  const type = isHitter ? p[HITTER_COL.TYPE] : p[PITCHER_COL.TYPE];
  const col = TYPE_COLOR[type] || 'sig';
  const bg = CARD_BG[col];
  const bd = CARD_BD[col];
  const boj = fmt1(isHitter ? (p[HITTER_COL.BOJ] || 0) : (p[PITCHER_COL.BOJ] || 0));
  const aw  = isHitter ? p[HITTER_COL.AWAKEN] : p[PITCHER_COL.AWAKEN];
  const pos = posOverride != null ? posOverride : (isHitter ? p[HITTER_COL.POS] : p[PITCHER_COL.POS]);
  const yr  = isHitter ? p[HITTER_COL.YEAR]   : p[PITCHER_COL.YEAR];
  const nm  = isHitter ? p[HITTER_COL.NAME]   : p[PITCHER_COL.NAME];
  const photoUrl = normPhotoUrl(isHitter ? (p[HITTER_COL.PHOTO] || '') : (p[PITCHER_COL.PHOTO] || ''));
  const isFa = type === '시그(F)' || type === '임팩(F)';
  return `<div class="select-card" style="width:${w}px;height:${h}px;background:${bg};border-color:${bd};${_cardStrokeVar(bd)}">
    ${_cardPhotoHtml(photoUrl)}
    ${_cardChromeHtml(boj, pos, yr, nm, aw, isFa)}
  </div>`;
}

function makeEmptyCard(label, w) {
  const h = Math.round(w * 1.5);
  return `<div class="empty-card" style="width:${w}px;height:${h}px;">
    <div style="text-align:center;font-size:10px;color:var(--text-tertiary);">${label}<br><span style="font-size:9px;">미배치</span></div>
  </div>`;
}

// 라인업용 카드: 보정 스탯(bojOverride) 반영
function makeCardLineup(p, w, isHitter, bojOverride, posOverride, subStatOverride) {
  const h = Math.round(w * 1.5);
  const type = isHitter ? p[HITTER_COL.TYPE] : p[PITCHER_COL.TYPE];
  const col = TYPE_COLOR[type] || 'sig';
  const bg = CARD_BG[col];
  const bd = CARD_BD[col];
  const rawBoj = isHitter ? (p[HITTER_COL.BOJ] || 0) : (p[PITCHER_COL.BOJ] || 0);
  const boj = fmt1(bojOverride != null ? bojOverride : rawBoj);
  const aw  = isHitter ? p[HITTER_COL.AWAKEN] : p[PITCHER_COL.AWAKEN];
  const pos = posOverride != null ? posOverride : (isHitter ? p[HITTER_COL.POS] : p[PITCHER_COL.POS]);
  const yr  = isHitter ? p[HITTER_COL.YEAR]   : p[PITCHER_COL.YEAR];
  const nm  = isHitter ? p[HITTER_COL.NAME]   : p[PITCHER_COL.NAME];
  const photoUrl = normPhotoUrl(isHitter ? (p[HITTER_COL.PHOTO] || '') : (p[PITCHER_COL.PHOTO] || ''));
  const isFa = type === '시그(F)' || type === '임팩(F)';
  return `<div class="select-card" style="width:${w}px;height:${h}px;background:${bg};border-color:${bd};${_cardStrokeVar(bd)}">
    ${_cardPhotoHtml(photoUrl)}
    ${_cardChromeHtml(boj, pos, yr, nm, aw, isFa, subStatOverride)}
  </div>`;
}

// ================================================================
// JS_Storage.html — 보관함 공통 렌더러 및 이벤트 핸들러
// ================================================================

function renderStorageTable(containerId, scrollHdId, players, isHitter, filterPos) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';

  const filtered = filterPos === '전체' ? players : players.filter(p =>
    (isHitter ? p[HITTER_COL.POS] : p[PITCHER_COL.POS]) === filterPos
  );

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:12px;">등록된 선수가 없습니다</div>';
    return;
  }

  filtered.forEach(p => {
    const col = TYPE_COLOR[isHitter ? p[HITTER_COL.TYPE] : p[PITCHER_COL.TYPE]] || 'sig';
    const bg = CARD_BG[col];
    const bd = CARD_BD[col];
    const type = isHitter ? p[HITTER_COL.TYPE] : p[PITCHER_COL.TYPE];
    const pos = isHitter ? p[HITTER_COL.POS] : p[PITCHER_COL.POS];
    const nm = isHitter ? p[HITTER_COL.NAME] : p[PITCHER_COL.NAME];
    const nick = isHitter ? p[HITTER_COL.NICK] : p[PITCHER_COL.NICK];
    const aw = isHitter ? p[HITTER_COL.AWAKEN] : p[PITCHER_COL.AWAKEN];
    const yr = isHitter ? p[HITTER_COL.YEAR] : p[PITCHER_COL.YEAR];
    const key = isHitter ? p[HITTER_COL.KEY] : p[PITCHER_COL.KEY];
    const potm = isHitter ? p[HITTER_COL.POTM] : p[PITCHER_COL.POTM];
    const sk1n = isHitter ? p[HITTER_COL.SK1N] : p[PITCHER_COL.SK1N];
    const sk1l = isHitter ? p[HITTER_COL.SK1L] : p[PITCHER_COL.SK1L];
    const sk2n = isHitter ? p[HITTER_COL.SK2N] : p[PITCHER_COL.SK2N];
    const sk2l = isHitter ? p[HITTER_COL.SK2L] : p[PITCHER_COL.SK2L];
    const sk3n = isHitter ? p[HITTER_COL.SK3N] : p[PITCHER_COL.SK3N];
    const sk3l = isHitter ? p[HITTER_COL.SK3L] : p[PITCHER_COL.SK3L];
    const pot1 = isHitter ? p[HITTER_COL.POT_FS] : p[PITCHER_COL.POT_JS];
    const pot2 = isHitter ? p[HITTER_COL.POT_CL] : p[PITCHER_COL.POT_CM];
    const pot3 = isHitter ? p[HITTER_COL.POT_SO] : p[PITCHER_COL.POT_CG];
    const pot4 = isHitter ? p[HITTER_COL.POT_AW] : p[PITCHER_COL.POT_AW];

    // 개인시트 계산값
    const C = isHitter ? HITTER_COL : PITCHER_COL;
    const boj = fmt1(p[C.BOJ]);
    const photoUrl = p[isHitter ? HITTER_COL.PHOTO : PITCHER_COL.PHOTO] || '';
    const stat1 = fmt1(p[isHitter ? HITTER_COL.S_POW : PITCHER_COL.S_CH]);
    const stat2 = fmt1(p[isHitter ? HITTER_COL.S_ACC : PITCHER_COL.S_GW]);
    const stat3 = isHitter ? fmt1(p[HITTER_COL.S_SEL]) : null;
    const stat4 = isHitter ? fmt1(p[HITTER_COL.S_PAT]) : null;
    const score = (p[C.SCORE] != null && p[C.SCORE] !== '') ? String(p[C.SCORE]) : '-';
    const scoreProb = fmtPct(p[C.SCORE_PROB]);
    const trainRedist = (p[C.TRAIN] != null && p[C.TRAIN] !== '') ? String(p[C.TRAIN]) : '-';
    const trainProb   = fmtPct((p[C.TRAIN_PROB] != null && p[C.TRAIN_PROB] !== '') ? p[C.TRAIN_PROB] : '');
    const spRedist    = (p[C.SP] != null && p[C.SP] !== '') ? String(p[C.SP]) : '-';
    const spProb      = fmtPct((p[C.SP_PROB] != null && p[C.SP_PROB] !== '') ? p[C.SP_PROB] : '');
    const toCheck = v => v === true || v === 'TRUE' || v === 'true';
    const setpo75  = toCheck(p[C.SETPO75]);
    const setpo180 = toCheck(p[C.SETPO180]);
    const setpo3   = toCheck(p[isHitter ? HITTER_COL.SETPO185 : PITCHER_COL.SETPO190]);
    const statLabels = isHitter ? ['파워','정확','선구','인내'] : ['변화','구위'];

    const row = document.createElement('div');
    row.className = `player-row type-${col}`;
    row.innerHTML = `
      <div class="fixed-area">
        <div class="cell c-potm">
          <label class="setpo-block" style="display:flex;align-items:center;gap:3px;cursor:pointer;">
            셋포75<input type="checkbox" class="setpo-chk" ${setpo75?'checked':''} data-key="${key}" data-idx="0" data-ishitter="${isHitter}" onchange="onSetpoChange(this)">
          </label>
          <label class="setpo-block" style="display:flex;align-items:center;gap:3px;cursor:pointer;">
            셋포180<input type="checkbox" class="setpo-chk" ${setpo180?'checked':''} data-key="${key}" data-idx="1" data-ishitter="${isHitter}" onchange="onSetpoChange(this)">
          </label>
          <label class="setpo-block" style="display:flex;align-items:center;gap:3px;cursor:pointer;">
            ${isHitter?'셋포185':'셋포190'}<input type="checkbox" class="setpo-chk" ${setpo3?'checked':''} data-key="${key}" data-idx="2" data-ishitter="${isHitter}" onchange="onSetpoChange(this)">
          </label>
        </div>
        <div class="cell c-card" style="align-self:stretch;cursor:pointer;" onclick="onCardClick('${key}',${isHitter})">
          ${makeCard(p, 50, isHitter)}
        </div>
        <div class="cell c-info" style="cursor:pointer;" onclick="onStorageInfoClick('${key}',${isHitter})">
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:2px;">
            <span class="type-badge" style="background:${bd}22;color:${bg};">${pos}</span>
            <span class="type-badge" style="background:${bd}22;color:${bg};font-size:8px;">${TYPE_MAP[type]||type}</span>
          </div>
          <span class="player-nick">${nick}</span>
          <span class="player-name">${yr} ${nm}</span>
          <span class="player-awaken">${aw}${isHitter ? '' : ' · '+(p[PITCHER_COL.PITCH]||'?')}</span>
          <div class="potm-check-wrap" onclick="event.stopPropagation()" style="margin-top:3px;">
            <label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--text-secondary);cursor:pointer;">
              POTM <input type="checkbox" ${potm ? 'checked' : ''} onchange="onPotmChange('${key}',this.checked,${isHitter})">
            </label>
          </div>
        </div>
        <div class="cell c-stat fixed-divider" style="width:68px;flex-direction:column;gap:2px;padding:4px 6px;align-items:flex-start;">
          <span style="font-size:16px;font-weight:600;color:var(--text-primary);line-height:1;">${boj}</span>
          <div class="stat-row"><span class="stat-lbl" style="width:auto;">${statLabels[0]}</span><span class="stat-val">${stat1}</span></div>
          <div class="stat-row"><span class="stat-lbl" style="width:auto;">${statLabels[1]}</span><span class="stat-val">${stat2}</span></div>
          ${isHitter ? `<div class="stat-row"><span class="stat-lbl" style="width:auto;">${statLabels[2]}</span><span class="stat-val">${stat3}</span></div>
          <div class="stat-row"><span class="stat-lbl" style="width:auto;">${statLabels[3]}</span><span class="stat-val">${stat4}</span></div>` : ''}
        </div>
      </div>
      <div class="scroll-wrap">
        <div class="scroll-area">
          <div class="cell c-pot">
            <div class="stat-row"><span class="stat-lbl" style="width:28px;">${isHitter?'풀스윙':'장억'}</span><span class="stat-val ${POT_CLASS(pot1)}" style="flex:1;text-align:center;">${pot1||'-'}</span></div>
            <div class="stat-row"><span class="stat-lbl" style="width:28px;">${isHitter?'클러치':'침착'}</span><span class="stat-val ${POT_CLASS(pot2)}" style="flex:1;text-align:center;">${pot2||'-'}</span></div>
            <div class="stat-row"><span class="stat-lbl" style="width:28px;">${isHitter?'송구':'변화구'}</span><span class="stat-val ${POT_CLASS(pot3)}" style="flex:1;text-align:center;">${pot3||'-'}</span></div>
            <div class="stat-row"><span class="stat-lbl" style="width:28px;">각잠</span><span class="stat-val ${POT_CLASS(pot4)}" style="flex:1;text-align:center;">${pot4||'-'}</span></div>
          </div>
          <div class="skill-score-group">
            <div class="skill-row-top">
              <div class="cell c-skill">
                <span style="font-size:10px;">${sk1n||'-'}</span>
                <span style="font-size:9px;color:var(--text-tertiary);">${sk1l&&sk1l!=='-'?sk1l+'렙':'-'}</span>
              </div>
              <div class="cell c-skill">
                <span style="font-size:10px;">${sk2n||'-'}</span>
                <span style="font-size:9px;color:var(--text-tertiary);">${sk2l&&sk2l!=='-'?sk2l+'렙':'-'}</span>
              </div>
              <div class="cell c-skill" style="border-right:none;">
                <span style="font-size:10px;">${sk3n||'-'}</span>
                <span style="font-size:9px;color:var(--text-tertiary);">${sk3l&&sk3l!=='-'?sk3l+'렙':'-'}</span>
              </div>
            </div>
            <div class="skill-row-bot">
              <div class="stat-row" style="justify-content:center;gap:12px;">
                <span style="font-size:10px;color:var(--text-secondary);">스킬점수 <b>${score}</b></span>
                <span style="font-size:10px;color:var(--text-secondary);">확률 <b>${scoreProb}</b></span>
              </div>
            </div>
          </div>
          <div class="cell c-redist" style="border-right:none;">
            <div class="redist-item">
              <span class="redist-lbl">훈련</span>
              <div class="redist-val-block">
                <span class="redist-num">${trainRedist}</span>
                <span class="redist-prob">${trainProb}</span>
              </div>
            </div>
            <div class="redist-item">
              <span class="redist-lbl">특훈</span>
              <div class="redist-val-block">
                <span class="redist-num">${spRedist}</span>
                <span class="redist-prob">${spProb}</span>
              </div>
            </div>
          </div>
          <div class="cell c-action" style="border-right:none;flex-direction:column;gap:5px;">
            <button class="storage-edit-btn" onclick="EditModal.open('${key}',${isHitter})">수정</button>
            <button class="storage-del-btn" onclick="onDeletePlayer('${key}',${isHitter})">삭제</button>
          </div>
        </div>
      </div>`;
    list.appendChild(row);
  });

  syncStorageScroll(scrollHdId);
}

function syncStorageScroll(scrollHdId) {
  const wraps = document.querySelectorAll('.scroll-wrap');
  const hd = document.getElementById(scrollHdId);
  wraps.forEach(w => {
    w.onscroll = () => {
      if (hd) hd.scrollLeft = w.scrollLeft;
      wraps.forEach(r => { if (r !== w) r.scrollLeft = w.scrollLeft; });
    };
  });
}

// ================================================================
// 이벤트 핸들러 공통
// ================================================================
function onPotmChange(key, checked, isHitter) {
  const fn = isHitter ? 'updateHitterPotm' : 'updatePitcherPotm';
  Api.call(fn, [State.clubId, key, checked]).then(() => App.refreshPlayers(isHitter)).catch(err => alert('저장 실패: ' + err.message));
}

function onSetpoChange(input) {
  const key = input.dataset.key;
  const isHitter = input.dataset.ishitter !== 'false';
  const checkboxes = document.querySelectorAll(`.setpo-chk[data-key="${key}"][data-ishitter="${input.dataset.ishitter}"]`);
  const vals = Array.from(checkboxes).map(c => c.checked);
  Api.call('saveSetpo', [State.clubId, key, vals[0], vals[1], vals[2], isHitter]).then(() => App.refreshPlayers(isHitter)).catch(err => alert('저장 실패: ' + err.message));
}

function onDeletePlayer(key, isHitter) {
  if (!confirm('선수를 삭제하면 보관함에서 제거되고 라인업 슬롯도 비워집니다. 계속하시겠습니까?')) return;
  showLoading('삭제 중...');
  const fn = isHitter ? 'deleteHitter' : 'deletePitcher';
  Api.call(fn, [State.clubId, key]).then(res => {
      hideLoading();
      if (res.success) App.refreshPlayers(isHitter);
      else alert('삭제 실패: ' + res.error);
    }).catch(err => { hideLoading(); alert('삭제 실패: ' + err.message); });
}


function onCardClick(key, isHitter) {
  PhotoModal.open(key, isHitter);
}

function onStorageInfoClick(key, isHitter) {
  if (window.innerWidth < 750 && isHitter) {
    HitterStorageModal.open(key);
  } else if (window.innerWidth < 750 && !isHitter) {
    PitcherStorageModal.open(key);
  } else {
    EditModal.open(key, isHitter);
  }
}

// ================================================================
// 선수 수정 모달
// ================================================================
const EditModal = {
  key: null,
  isHitter: true,

  open(key, isHitter) {
    this.key = key;
    this.isHitter = isHitter;
    const p = isHitter
      ? State.hitters.find(h => h[HITTER_COL.KEY] === key)
      : State.pitchers.find(p => p[PITCHER_COL.KEY] === key);
    if (!p) return;

    let modal = document.getElementById('edit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'edit-modal';
      modal.innerHTML = `
        <div class="modal-bg">
          <div class="modal" style="width:420px;">
            <div class="modal-hd">
              <span class="modal-title" id="edit-modal-title">선수 수정</span>
              <button class="modal-close" onclick="EditModal.close()">✕</button>
            </div>
            <div class="modal-body" id="edit-modal-body"></div>
            <div class="modal-foot">
              <button class="bs" onclick="EditModal.close()">취소</button>
              <button class="bp" onclick="EditModal.submit()">저장</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('edit-modal-title').textContent =
      (isHitter ? p[HITTER_COL.YEAR] : p[PITCHER_COL.YEAR]) + ' ' +
      (isHitter ? p[HITTER_COL.NAME] : p[PITCHER_COL.NAME]) + ' 수정';

    document.getElementById('edit-modal-body').innerHTML = this._buildForm(p, isHitter);
    modal.style.display = 'block';
  },

  _buildForm(p, isHitter) {
    const C = isHitter ? HITTER_COL : PITCHER_COL;
    const ro = (lbl, val) =>
      `<div class="kv-row"><span class="kv-key" style="color:var(--text-tertiary);">${lbl}</span><span class="kv-edit" style="background:none;border:none;color:var(--text-secondary);font-size:12px;">${val||'-'}</span></div>`;
    const ed = (lbl, id, val, type='text', extra='') =>
      `<div class="kv-row"><span class="kv-key">${lbl}</span><input class="kv-edit" id="${id}" type="${type}" value="${val||''}" ${extra}></div>`;
    const sel = (lbl, id, val, opts) =>
      `<div class="kv-row"><span class="kv-key">${lbl}</span><select class="kv-edit" id="${id}">${opts.map(o=>`<option value="${o}" ${val==o?'selected':''}>${o}</option>`).join('')}</select></div>`;
    const skillSel = (lbl, idName, idLv, nm, lv) => {
      const skills = isHitter ? State.hitterSkills : State.pitcherSkills;
      const opts = ['-', ...skills].map(s => `<option value="${s}" ${nm===s?'selected':''}>${s}</option>`).join('');
      return `<div class="kv-row"><span class="kv-key">${lbl}</span>
        <select class="kv-edit" id="${idName}" style="flex:2;">${opts}</select>
        <select class="kv-edit" id="${idLv}" style="width:60px;">${SKILL_LEVELS.map(v=>`<option value="${v}" ${String(lv)===v?'selected':''}>${v==='-'?'-':v+'렙'}</option>`).join('')}</select>
      </div>`;
    };

    const pos = isHitter ? p[C.POS] : p[C.POS];
    const type = isHitter ? p[C.TYPE] : p[C.TYPE];
    const yr = isHitter ? p[C.YEAR] : p[C.YEAR];
    const nm = isHitter ? p[C.NAME] : p[C.NAME];

    let html = '<div style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">회색 항목은 수정 불가</div>';
    html += ro('포지션', pos) + ro('종류', TYPE_MAP[type]||type) + ro('연도', yr) + ro('이름', nm);
    html += ed('별명', 'em-nick', isHitter ? p[C.NICK] : p[C.NICK]);
    html += sel('각성', 'em-aw', isHitter ? p[C.AWAKEN] : p[C.AWAKEN], AWAKEN_LIST);

    if (isHitter) {
      html += sel('풀스윙 잠재력', 'em-pfs', p[C.POT_FS], POT_LEVELS);
      html += sel('클러치 잠재력', 'em-pcl', p[C.POT_CL], POT_LEVELS);
      html += sel('송구 잠재력', 'em-pso', p[C.POT_SO], POT_LEVELS);
      html += sel('각성 잠재력', 'em-paw', p[C.POT_AW], POT_LEVELS);
      html += skillSel('스킬1', 'em-sk1n', 'em-sk1l', p[C.SK1N], p[C.SK1L]);
      html += skillSel('스킬2', 'em-sk2n', 'em-sk2l', p[C.SK2N], p[C.SK2L]);
      html += skillSel('스킬3', 'em-sk3n', 'em-sk3l', p[C.SK3N], p[C.SK3L]);
      html += ro('파워 기본', p[C.POW_B]);
      html += ed('파워 훈련', 'em-powt', p[C.POW_T], 'number', 'min="0"');
      html += ed('파워 특훈', 'em-pows', p[C.POW_S], 'number', 'min="0"');
      html += ro('정확 기본', p[C.ACC_B]);
      html += ed('정확 훈련', 'em-acct', p[C.ACC_T], 'number', 'min="0"');
      html += ed('정확 특훈', 'em-accs', p[C.ACC_S], 'number', 'min="0"');
      html += ro('선구 기본', p[C.SEL_B]);
      html += ed('선구 훈련', 'em-selt', p[C.SEL_T], 'number', 'min="0"');
      html += ed('선구 특훈', 'em-sels', p[C.SEL_S], 'number', 'min="0"');
      html += ro('인내 기본', p[C.PAT_B]);
      html += ed('인내 훈련', 'em-patt', p[C.PAT_T], 'number', 'min="0"');
      html += ed('인내 특훈', 'em-pats', p[C.PAT_S], 'number', 'min="0"');
      ro('타격유형', p[C.BAT]); // 수정 불가
      html += ro('타격유형', p[C.BAT]) + ro('발사각', p[C.ANG]) + ro('흰존', p[C.WHITE]) + ro('콜존', p[C.CALL]);
    } else {
      html += sel('장타억제 잠재력', 'em-pjs', p[C.POT_JS], POT_LEVELS);
      html += sel('침착 잠재력', 'em-pcm', p[C.POT_CM], POT_LEVELS);
      html += sel('변화구 잠재력', 'em-pcg', p[C.POT_CG], POT_LEVELS);
      html += sel('각성 잠재력', 'em-paw', p[C.POT_AW], POT_LEVELS);
      html += skillSel('스킬1', 'em-sk1n', 'em-sk1l', p[C.SK1N], p[C.SK1L]);
      html += skillSel('스킬2', 'em-sk2n', 'em-sk2l', p[C.SK2N], p[C.SK2L]);
      html += skillSel('스킬3', 'em-sk3n', 'em-sk3l', p[C.SK3N], p[C.SK3L]);
      html += ro('변화 기본', p[C.CH_B]);
      html += ed('변화 훈련', 'em-cht', p[C.CH_T], 'number', 'min="0"');
      html += ed('변화 특훈', 'em-chs', p[C.CH_S], 'number', 'min="0"');
      html += ro('구위 기본', p[C.GW_B]);
      html += ed('구위 훈련', 'em-gwt', p[C.GW_T], 'number', 'min="0"');
      html += ed('구위 특훈', 'em-gws', p[C.GW_S], 'number', 'min="0"');
      html += ro('투구유형', p[C.PITCH]);
    }
    return html;
  },

  close() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
  },

  submit() {
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
    const updates = { nickname: v('em-nick') };
    updates.awaken = v('em-aw');

    if (this.isHitter) {
      Object.assign(updates, {
        pot_fs: v('em-pfs'), pot_cl: v('em-pcl'), pot_so: v('em-pso'), pot_aw: v('em-paw'),
        skill1_nm: v('em-sk1n'), skill1_lv: v('em-sk1l'),
        skill2_nm: v('em-sk2n'), skill2_lv: v('em-sk2l'),
        skill3_nm: v('em-sk3n'), skill3_lv: v('em-sk3l'),
        pow_train: parseInt(v('em-powt'))||0, pow_sp: parseInt(v('em-pows'))||0,
        acc_train: parseInt(v('em-acct'))||0, acc_sp: parseInt(v('em-accs'))||0,
        sel_train: parseInt(v('em-selt'))||0, sel_sp: parseInt(v('em-sels'))||0,
        pat_train: parseInt(v('em-patt'))||0, pat_sp: parseInt(v('em-pats'))||0,
      });
    } else {
      Object.assign(updates, {
        pot_js: v('em-pjs'), pot_cm: v('em-pcm'), pot_cg: v('em-pcg'), pot_aw: v('em-paw'),
        skill1_nm: v('em-sk1n'), skill1_lv: v('em-sk1l'),
        skill2_nm: v('em-sk2n'), skill2_lv: v('em-sk2l'),
        skill3_nm: v('em-sk3n'), skill3_lv: v('em-sk3l'),
        ch_train: parseInt(v('em-cht'))||0, ch_sp: parseInt(v('em-chs'))||0,
        gw_train: parseInt(v('em-gwt'))||0, gw_sp: parseInt(v('em-gws'))||0,
      });
    }

    // null 값 제거
    Object.keys(updates).forEach(k => { if (updates[k] === null) delete updates[k]; });

    showLoading('저장 중...');
    const fn = this.isHitter ? 'updateHitter' : 'updatePitcher';
    Api.call(fn, [State.clubId, this.key, updates]).then(res => {
        hideLoading();
        if (res.success) { EditModal.close(); App.refreshPlayers(this.isHitter); }
        else alert('저장 실패: ' + res.error);
      }).catch(err => { hideLoading(); alert('저장 실패: ' + err.message); });
  }
};

// ================================================================
// JS_Modals.html — PhotoModal, AddModal, SwapModal
// ================================================================

// ================================================================
// 사진 관리 모달 (업로드 탭 + 조회 탭)
// ================================================================
const PhotoModal = {
  currentKey: null,
  currentIsHitter: true,
  _playerName: '',
  _img: null,
  _baseW: 0, _baseH: 0,
  _scale: 1, _offsetX: 0, _offsetY: 0,
  _isDragging: false, _dragStartX: 0, _dragStartY: 0,
  _pinchDist: 0, _pinchScale: 1,
  _mmHandler: null, _muHandler: null,
  _cardBg: '', _cardBd: '', _cardPos: '', _cardYr: '', _cardNm: '', _cardAw: '', _cardBoj: '', _cardIsFa: false,
  _selectedGalleryUrl: null,

  open(key, isHitter) {
    this.currentKey = key;
    this.currentIsHitter = isHitter;
    const p = isHitter
      ? State.hitters.find(h => h[HITTER_COL.KEY] === key)
      : State.pitchers.find(p => p[PITCHER_COL.KEY] === key);
    this._playerName = p ? (isHitter ? p[HITTER_COL.NAME] : p[PITCHER_COL.NAME]) : key;

    const type = p ? (isHitter ? p[HITTER_COL.TYPE] : p[PITCHER_COL.TYPE]) : 'sig';
    const col  = TYPE_COLOR[type] || 'sig';
    this._cardBg  = CARD_BG[col];
    this._cardBd  = CARD_BD[col];
    this._cardPos = p ? (isHitter ? p[HITTER_COL.POS]    : p[PITCHER_COL.POS])    : '';
    this._cardYr  = p ? (isHitter ? p[HITTER_COL.YEAR]   : p[PITCHER_COL.YEAR])   : '';
    this._cardNm  = p ? (isHitter ? p[HITTER_COL.NAME]   : p[PITCHER_COL.NAME])   : '';
    this._cardAw  = p ? (isHitter ? p[HITTER_COL.AWAKEN] : p[PITCHER_COL.AWAKEN]) : '';
    this._cardBoj = p ? fmt1(isHitter ? (p[HITTER_COL.BOJ] || 0) : (p[PITCHER_COL.BOJ] || 0)) : '';
    this._cardIsFa = type === '시그(F)' || type === '임팩(F)';

    let modal = document.getElementById('photo-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'photo-modal';
      modal.innerHTML = `
        <div class="modal-bg">
          <div class="modal" style="width:340px;">
            <div class="modal-hd">
              <span class="modal-title" id="photo-modal-title">사진 관리</span>
              <button class="modal-close" onclick="PhotoModal.close()">✕</button>
            </div>
            <div class="modal-tabs">
              <button class="modal-tab on" id="photo-tb-0" onclick="PhotoModal.switchTab(0)">사진 업로드</button>
              <button class="modal-tab" id="photo-tb-1" onclick="PhotoModal.switchTab(1)">선수 사진 조회</button>
            </div>
            <div class="modal-body" style="align-items:center;gap:8px;">
              <div id="photo-tab-0" style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;">
                <div id="photo-wrap" class="select-card" style="position:relative;width:180px;height:270px;overflow:hidden;cursor:grab;user-select:none;touch-action:none;flex-shrink:0;">
                </div>
                <div style="font-size:10px;color:var(--text-tertiary);">스크롤로 줌 · 드래그로 위치 조절</div>
                <input type="file" id="photo-file-input" accept="image/*" style="display:none;" onchange="PhotoModal.onFileChange(this)">
                <button class="bs" style="font-size:12px;" onclick="document.getElementById('photo-file-input').click()">파일 선택</button>
                <div id="photo-err" class="err-msg" style="display:none;"></div>
              </div>
              <div id="photo-tab-1" style="display:none;width:100%;">
                <div id="photo-gallery" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:310px;overflow-y:auto;padding:2px;"></div>
              </div>
            </div>
            <div class="modal-foot">
              <button class="bs" onclick="PhotoModal.close()">취소</button>
              <button class="bp" id="photo-save-btn" style="display:none;" onclick="PhotoModal.save()">저장</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      this._bindWrapEvents();
    }

    document.getElementById('photo-modal-title').textContent = this._playerName + ' 사진 관리';
    this._reset();
    modal.style.display = 'block';

    // close()에서 제거된 document 핸들러를 매번 재등록
    if (!this._mmHandler) {
      this._mmHandler = e => {
        if (!this._isDragging) return;
        this._offsetX = e.clientX - this._dragStartX;
        this._offsetY = e.clientY - this._dragStartY;
        this._applyTransform();
      };
      this._muHandler = () => {
        this._isDragging = false;
        const w = document.getElementById('photo-wrap');
        if (w) w.style.cursor = 'grab';
      };
      document.addEventListener('mousemove', this._mmHandler);
      document.addEventListener('mouseup', this._muHandler);
    }

    this.switchTab(0);
  },

  _reset() {
    this._img = null; this._scale = 1; this._offsetX = 0; this._offsetY = 0;
    this._selectedGalleryUrl = null;
    const wrap = document.getElementById('photo-wrap');
    if (wrap) {
      const img = wrap.querySelector('img');
      if (img) img.remove();
      wrap.style.background = this._cardBg || 'var(--bg-secondary)';
      wrap.style.borderColor = this._cardBd || 'var(--border-light)';
      wrap.style.backgroundImage = `url('${SILHOUETTE_SVG}')`;
      wrap.style.backgroundSize = '75% auto';
      wrap.style.backgroundPosition = 'center 70%';
      wrap.style.backgroundRepeat = 'no-repeat';
      wrap.style.setProperty('--card-stroke', this._cardBd || 'rgba(0,0,0,0.9)');
      // 카드 텍스트 오버레이
      let overlay = wrap.querySelector('.pm-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'pm-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
        wrap.appendChild(overlay);
      }
      overlay.innerHTML = _cardChromeHtml(this._cardBoj || '', this._cardPos, this._cardYr, this._cardNm, this._cardAw, this._cardIsFa);
    }
    const btn = document.getElementById('photo-save-btn');
    if (btn) btn.style.display = 'none';
    const fi = document.getElementById('photo-file-input');
    if (fi) fi.value = '';
    const err = document.getElementById('photo-err');
    if (err) err.style.display = 'none';
  },

  switchTab(idx) {
    [0, 1].forEach(i => {
      const tab = document.getElementById(`photo-tab-${i}`);
      if (tab) tab.style.display = i === idx ? (i === 0 ? 'flex' : 'block') : 'none';
      const btn = document.getElementById(`photo-tb-${i}`);
      if (btn) btn.classList.toggle('on', i === idx);
    });
    const saveBtn = document.getElementById('photo-save-btn');
    if (saveBtn) saveBtn.style.display = (idx === 0 && this._img) ? 'block' : 'none';
    if (idx === 1) this._loadGallery();
  },

  _loadGallery() {
    this._selectedGalleryUrl = null;
    const saveBtn = document.getElementById('photo-save-btn');
    if (saveBtn) saveBtn.style.display = 'none';
    const gallery = document.getElementById('photo-gallery');
    gallery.style.display = 'grid';
    gallery.style.justifyContent = '';
    gallery.innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);grid-column:1/-1;text-align:center;padding:20px;">불러오는 중...</div>';
    Api.call('searchPlayerPhotos', [this._playerName]).then(res => {
        if (!res.success || !res.data || !res.data.length) {
          gallery.innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);grid-column:1/-1;text-align:center;padding:20px;">저장된 사진이 없습니다</div>';
          return;
        }
        gallery.innerHTML = res.data.map(item => {
          const ref = item.id || item.url || '';
          const src = item.id ? photoProxyUrl(item.id) : (item.dataUrl || item.url || '');
          return `<div style="cursor:pointer;border-radius:6px;overflow:hidden;aspect-ratio:2/3;background:var(--bg-secondary);border:1px solid var(--border-light);" onclick='PhotoModal.selectPhoto(${JSON.stringify(ref)},${JSON.stringify(src)})'>
            <img src="${src}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
          </div>`;
        }).join('');
      }).catch(err => {
        gallery.innerHTML = `<div style="font-size:11px;color:red;grid-column:1/-1;padding:8px;">${err.message}</div>`;
      });
  },

  selectPhoto(photoRef, previewSrc) {
    this._selectedGalleryUrl = photoRef;
    this._showGalleryPreview(previewSrc || normPhotoUrl(photoRef));
  },

  _showGalleryPreview(url) {
    const gallery = document.getElementById('photo-gallery');
    gallery.style.display = 'flex';
    gallery.style.justifyContent = 'center';
    gallery.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;padding:4px 0;">
        <div class="select-card" style="width:150px;height:225px;background:${this._cardBg};border-color:${this._cardBd};${_cardStrokeVar(this._cardBd)}background-image:url('${url}');background-size:cover;background-position:top center;">
          ${_cardChromeHtml(this._cardBoj || '', this._cardPos, this._cardYr, this._cardNm, this._cardAw, this._cardIsFa)}
        </div>
        <button class="bs" style="font-size:12px;" onclick="PhotoModal._loadGallery()">← 다른 사진 선택</button>
      </div>`;
    const saveBtn = document.getElementById('photo-save-btn');
    if (saveBtn) saveBtn.style.display = 'block';
  },

  save() {
    if (this._selectedGalleryUrl) {
      this._saveGalleryPhoto();
    } else {
      this.upload();
    }
  },

  _saveGalleryPhoto() {
    showLoading('사진 저장 중...');
    const fn = this.currentIsHitter ? 'updateHitterPhoto' : 'updatePitcherPhoto';
    Api.call(fn, [State.clubId, this.currentKey, this._selectedGalleryUrl]).then(() => { hideLoading(); PhotoModal.close(); App.refreshPlayers(PhotoModal.currentIsHitter); }).catch(err => { hideLoading(); showErr('photo-err', err.message); });
  },

  close() {
    const modal = document.getElementById('photo-modal');
    if (modal) modal.style.display = 'none';
    this._reset();
    if (this._mmHandler) document.removeEventListener('mousemove', this._mmHandler);
    if (this._muHandler) document.removeEventListener('mouseup', this._muHandler);
    this._mmHandler = null; this._muHandler = null;
  },

  onFileChange(input) {
    if (!input.files || !input.files[0]) return;
    this._fileType = input.files[0].type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        this._img = img;
        const WRAP_W = 180, WRAP_H = 270;
        const ar = img.naturalWidth / img.naturalHeight;
        const cardAr = WRAP_W / WRAP_H;
        if (ar > cardAr) { this._baseH = WRAP_H; this._baseW = this._baseH * ar; }
        else { this._baseW = WRAP_W; this._baseH = this._baseW / ar; }
        this._scale = 1; this._offsetX = 0; this._offsetY = 0;

        const wrap = document.getElementById('photo-wrap');
        wrap.style.backgroundImage = '';
        let pi = wrap.querySelector('img');
        if (!pi) {
          pi = document.createElement('img');
          pi.style.cssText = 'position:absolute;top:50%;left:50%;transform-origin:center;pointer-events:none;z-index:1;';
          const overlay = wrap.querySelector('.pm-overlay');
          wrap.insertBefore(pi, overlay || null);
        }
        pi.src = img.src;
        pi.style.width = this._baseW + 'px';
        pi.style.height = this._baseH + 'px';
        this._applyTransform();
        document.getElementById('photo-save-btn').style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  },

  _applyTransform() {
    const wrap = document.getElementById('photo-wrap');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (!img) return;
    img.style.transform = `translate(-50%,-50%) translate(${this._offsetX}px,${this._offsetY}px) scale(${this._scale})`;
  },

  _bindWrapEvents() {
    const wrap = document.getElementById('photo-wrap');
    if (!wrap) return;

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      this._scale = Math.max(0.3, Math.min(10, this._scale * (e.deltaY > 0 ? 0.9 : 1.1)));
      this._applyTransform();
    }, { passive: false });

    wrap.addEventListener('mousedown', e => {
      e.preventDefault();
      this._isDragging = true;
      this._dragStartX = e.clientX - this._offsetX;
      this._dragStartY = e.clientY - this._offsetY;
      wrap.style.cursor = 'grabbing';
    });

    wrap.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 2) {
        this._pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this._pinchScale = this._scale;
      } else {
        this._isDragging = true;
        this._dragStartX = e.touches[0].clientX - this._offsetX;
        this._dragStartY = e.touches[0].clientY - this._offsetY;
      }
    }, { passive: false });

    wrap.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this._scale = Math.max(0.3, Math.min(10, this._pinchScale * d / this._pinchDist));
      } else if (this._isDragging) {
        this._offsetX = e.touches[0].clientX - this._dragStartX;
        this._offsetY = e.touches[0].clientY - this._dragStartY;
      }
      this._applyTransform();
    }, { passive: false });

    wrap.addEventListener('touchend', () => { this._isDragging = false; });
  },

  upload() {
    if (!this._img) return;
    const CARD_W = 200, CARD_H = 300, WRAP_W = 180, WRAP_H = 270;
    const rx = CARD_W / WRAP_W, ry = CARD_H / WRAP_H;
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W; canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    const sw = this._baseW * this._scale * rx;
    const sh = this._baseH * this._scale * ry;
    ctx.drawImage(this._img, CARD_W / 2 + this._offsetX * rx - sw / 2, CARD_H / 2 + this._offsetY * ry - sh / 2, sw, sh);

    showLoading('사진 업로드 중...');
    const isPng = this._fileType === 'image/png';
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    const base64 = isPng
      ? canvas.toDataURL('image/png').split(',')[1]
      : canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const isHitter = this.currentIsHitter;
    const key = this.currentKey;
    Api.call('uploadPhoto', [State.clubId, this._playerName, base64, mimeType]).then(res => {
        hideLoading();
        if (res.success) {
          const fn = isHitter ? 'updateHitterPhoto' : 'updatePitcherPhoto';
          Api.call(fn, [State.clubId, key, res.photoId || res.url]).then(() => { PhotoModal.close(); App.refreshPlayers(isHitter); }).catch(err => showErr('photo-err', '저장 실패: ' + err.message));
        } else {
          showErr('photo-err', res.error || '업로드 실패');
        }
      }).catch(err => { hideLoading(); showErr('photo-err', err.message); });
  }
};

// ================================================================
// 선수 추가 공통 모달
// ================================================================
const AddModal = {
  isHitter: true,

  open(isHitter) {
    this.isHitter = isHitter;
    const modal = document.getElementById('add-modal');
    modal.style.display = 'block';
    document.getElementById('add-modal-title').textContent = isHitter ? '타자 추가' : '투수 추가';

    // 스킬 datalist 채우기
    const skillListId = isHitter ? 'hitter-skill-list' : 'pitcher-skill-list';
    const skills = isHitter ? State.hitterSkills : State.pitcherSkills;
    const dl = document.getElementById(skillListId);
    if (dl) {
      dl.textContent = '';
      ['-', ...skills].forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        dl.appendChild(option);
      });
    }
    document.getElementById('add-tab-0-content').style.display = 'block';
    document.getElementById('add-tab-1-content').style.display = 'none';
    document.getElementById('add-tab-2-content').style.display = 'none';
    document.querySelectorAll('.add-modal-tab').forEach((b,i) => b.classList.toggle('on', i===0));
    document.getElementById('add-hitter-fields').style.display = isHitter ? 'block' : 'none';
    document.getElementById('add-pitcher-fields').style.display = isHitter ? 'none' : 'block';
    document.getElementById('add-hitter-stats').style.display = isHitter ? 'block' : 'none';
    document.getElementById('add-pitcher-stats').style.display = isHitter ? 'none' : 'block';
    document.getElementById('add-hitter-pots').style.display = isHitter ? 'block' : 'none';
    document.getElementById('add-pitcher-pots').style.display = isHitter ? 'none' : 'block';
    document.getElementById('add-err').style.display = 'none';
  },

  close() {
    document.getElementById('add-modal').style.display = 'none';
  },

  switchTab(idx, btn) {
    document.querySelectorAll('.add-modal-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    [0,1,2].forEach(i => {
      document.getElementById(`add-tab-${i}-content`).style.display = i === idx ? 'block' : 'none';
    });
  },

  submit() {
    const err = document.getElementById('add-err');
    const v = id => document.getElementById(id).value.trim();
    const showErr = msg => { err.textContent = msg; err.style.display = 'block'; };

    const validateSkills = (prefix, skillList) => {
      for (let i = 1; i <= 3; i++) {
        const nm = v(`${prefix}-sk${i}n`);
        const lv = v(`${prefix}-sk${i}l`);
        if (!nm) { showErr(`스킬${i} 이름을 입력해주세요.`); return false; }
        if (!skillList.includes(nm)) { showErr(`스킬${i}: 드롭다운 목록에서 스킬을 선택해주세요.`); return false; }
        if (lv === '-') { showErr(`스킬${i} 레벨을 선택해주세요.`); return false; }
      }
      return true;
    };

    if (this.isHitter) {
      const required = [
        ['add-h-pos','포지션'],['add-h-type','종류'],
        ['add-h-aw','각성'],['add-h-year','연도'],['add-h-name','이름'],
        ['add-h-bat','타격유형'],['add-h-ang','발사각'],['add-h-white','흰존'],
        ['add-h-call','콜존'],['add-h-powb','파워 기본값'],['add-h-powt','파워 훈련치'],['add-h-pows','파워 특훈치'],
        ['add-h-accb','정확 기본값'],['add-h-acct','정확 훈련치'],['add-h-accs','정확 특훈치'],
        ['add-h-selb','선구 기본값'],['add-h-selt','선구 훈련치'],['add-h-sels','선구 특훈치'],
        ['add-h-patb','인내 기본값'],['add-h-patt','인내 훈련치'],['add-h-pats','인내 특훈치'],
      ];
      const missing = required.filter(([id]) => !v(id));
      if (missing.length) { showErr('필수 항목: ' + missing.map(r=>r[1]).join(', ')); return; }
      const ang = parseInt(v('add-h-ang'));
      if (!isNaN(ang) && ang > 30) { showErr('발사각은 30 이하여야 합니다.'); return; }

      const potIds = [['add-h-pfs','풀스윙'],['add-h-pcl','클러치'],['add-h-pso','송구'],['add-h-paw','각성']];
      const missingPot = potIds.find(([id]) => v(id) === '-');
      if (missingPot) { showErr(`잠재력 필수: ${missingPot[1]} 잠재를 선택해주세요.`); return; }
      if (!validateSkills('add-h', State.hitterSkills)) return;

      showLoading('선수 추가 중...');
      Api.call('addHitter', [State.clubId, {
          nickname: v('add-h-nick'), position: v('add-h-pos'), type: v('add-h-type'),
          awaken: v('add-h-aw'), year: v('add-h-year'), name: v('add-h-name'),
          pot_fs: v('add-h-pfs'), pot_cl: v('add-h-pcl'), pot_so: v('add-h-pso'), pot_aw: v('add-h-paw'),
          skill1_nm: v('add-h-sk1n'), skill1_lv: v('add-h-sk1l'),
          skill2_nm: v('add-h-sk2n'), skill2_lv: v('add-h-sk2l'),
          skill3_nm: v('add-h-sk3n'), skill3_lv: v('add-h-sk3l'),
          pow_base: parseInt(v('add-h-powb'))||0, pow_train: parseInt(v('add-h-powt'))||0, pow_sp: parseInt(v('add-h-pows'))||0,
          acc_base: parseInt(v('add-h-accb'))||0, acc_train: parseInt(v('add-h-acct'))||0, acc_sp: parseInt(v('add-h-accs'))||0,
          sel_base: parseInt(v('add-h-selb'))||0, sel_train: parseInt(v('add-h-selt'))||0, sel_sp: parseInt(v('add-h-sels'))||0,
          pat_base: parseInt(v('add-h-patb'))||0, pat_train: parseInt(v('add-h-patt'))||0, pat_sp: parseInt(v('add-h-pats'))||0,
          bat_type: v('add-h-bat'), launch_ang: ang, white_zone: parseInt(v('add-h-white'))||0, call_zone: parseInt(v('add-h-call'))||0,
        }]).then(res => {
          hideLoading();
          if (res.success) {
            AddModal.close();
            Api.call('getHitters', [State.clubId]).then(r => { if(r.success) { State.hitters = r.data; HitterTab.renderStorage(); HitterTab.renderLineup(); }});
          } else { showErr(res.error); }
        }).catch(e => { hideLoading(); showErr(e.message); });
    } else {
      const required = [
        ['add-p-pos','포지션'],['add-p-type','종류'],
        ['add-p-aw','각성'],['add-p-year','연도'],['add-p-name','이름'],
        ['add-p-pitch','투구유형'],
        ['add-p-chb','변화 기본값'],['add-p-cht','변화 훈련치'],['add-p-chs','변화 특훈치'],
        ['add-p-gwb','구위 기본값'],['add-p-gwt','구위 훈련치'],['add-p-gws','구위 특훈치'],
      ];
      const missing = required.filter(([id]) => !v(id));
      if (missing.length) { showErr('필수 항목: ' + missing.map(r=>r[1]).join(', ')); return; }

      const potIds = [['add-p-pjs','장타억제력'],['add-p-pcm','침착'],['add-p-pcg','변화구구종'],['add-p-paw','각성']];
      const missingPot = potIds.find(([id]) => v(id) === '-');
      if (missingPot) { showErr(`잠재력 필수: ${missingPot[1]} 잠재를 선택해주세요.`); return; }
      if (!validateSkills('add-p', State.pitcherSkills)) return;

      showLoading('선수 추가 중...');
      Api.call('addPitcher', [State.clubId, {
          nickname: v('add-p-nick'), position: v('add-p-pos'), type: v('add-p-type'),
          awaken: v('add-p-aw'), year: v('add-p-year'), name: v('add-p-name'),
          pot_js: v('add-p-pjs'), pot_cm: v('add-p-pcm'), pot_cg: v('add-p-pcg'), pot_aw: v('add-p-paw'),
          skill1_nm: v('add-p-sk1n'), skill1_lv: v('add-p-sk1l'),
          skill2_nm: v('add-p-sk2n'), skill2_lv: v('add-p-sk2l'),
          skill3_nm: v('add-p-sk3n'), skill3_lv: v('add-p-sk3l'),
          ch_base: parseInt(v('add-p-chb'))||0, ch_train: parseInt(v('add-p-cht'))||0, ch_sp: parseInt(v('add-p-chs'))||0,
          gw_base: parseInt(v('add-p-gwb'))||0, gw_train: parseInt(v('add-p-gwt'))||0, gw_sp: parseInt(v('add-p-gws'))||0,
          pitch_type: v('add-p-pitch'),
        }]).then(res => {
          hideLoading();
          if (res.success) {
            AddModal.close();
            Api.call('getPitchers', [State.clubId]).then(r => { if(r.success) { State.pitchers = r.data; PitcherTab.renderStorage(); PitcherTab.renderLineup(); }});
          } else { showErr(res.error); }
        }).catch(e => { hideLoading(); showErr(e.message); });
    }
  }
};

// ================================================================
// 선수 교체 모달 — redesign
// ================================================================
const SwapModal = {
  isHitter: true,
  selectedSlot: null,
  _selectedKey: null,

  open(isHitter, slotKey) {
    this.isHitter = isHitter;
    this.selectedSlot = slotKey;
    this._selectedKey = null;
    const m = document.getElementById('swap-modal');
    m.style.display = 'flex';
    this._renderHeader();
    this._renderUpper();
    this._renderLower();
    this._renderFooter();
  },

  close() {
    const m = document.getElementById('swap-modal');
    if (m) m.style.display = 'none';
    this._selectedKey = null;
  },

  _getCurrentPlayer() {
    const lineup = this.isHitter ? HitterTab.lineup : PitcherTab.lineup;
    const pid = this.isHitter
      ? lineup.find(s => s.pos === this.selectedSlot)?.pid
      : lineup.find(s => s.slot === this.selectedSlot)?.pid;
    if (!pid) return null;
    return this.isHitter
      ? State.hitters.find(h => h[HITTER_COL.KEY] === pid)
      : State.pitchers.find(p => p[PITCHER_COL.KEY] === pid);
  },

  _getPlayer(key) {
    return this.isHitter
      ? State.hitters.find(h => h[HITTER_COL.KEY] === key)
      : State.pitchers.find(p => p[PITCHER_COL.KEY] === key);
  },

  _renderHeader() {
    let title = '교체 선수 선택';
    if (this._selectedKey) {
      const p = this._getPlayer(this._selectedKey);
      const nm = p ? (this.isHitter ? p[HITTER_COL.NAME] : p[PITCHER_COL.NAME]) : '';
      title = (nm || '') + ' — 교체 확인';
    }
    document.getElementById('sw-hd').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="sw-slot-badge">${this.selectedSlot}</span>
        <span class="sw-title">${title}</span>
      </div>
      <button class="sw-close-btn" onclick="SwapModal.close()">✕</button>`;
  },

  _renderUpper() {
    const currentP = this._getCurrentPlayer();
    const posOvr = this.isHitter && this.selectedSlot === 'DH' ? 'DH' : null;
    const cardHtml = currentP
      ? makeCard(currentP, 88, this.isHitter, posOvr)
      : makeEmptyCard(this.selectedSlot, 88);
    const statsHtml = currentP
      ? this._fullStatsHtml(currentP)
      : `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-tertiary);">미배치 슬롯</div>`;
    document.getElementById('sw-upper').innerHTML = `
      <div class="sw-zone-label">현재 배치 선수</div>
      <div class="sw-player-row">${cardHtml}${statsHtml}</div>`;
  },

  _renderLower() {
    this._selectedKey ? this._renderLowerComparison() : this._renderLowerGrid();
  },

  _renderLowerGrid() {
    const SC = this.isHitter ? HITTER_COL : PITCHER_COL;
    const currentP = this._getCurrentPlayer();
    const currentPid = currentP ? currentP[SC.KEY] : null;
    let players;
    if (this.isHitter) {
      const posFilter = this.selectedSlot === 'DH' ? null : this.selectedSlot;
      players = (posFilter ? State.hitters.filter(h => h[HITTER_COL.POS] === posFilter) : State.hitters)
        .filter(h => h[HITTER_COL.KEY] !== currentPid);
    } else {
      const slotPos = this.selectedSlot.replace(/\d/g, '');
      players = State.pitchers.filter(p => p[PITCHER_COL.POS] === slotPos && p[PITCHER_COL.KEY] !== currentPid);
    }
    const lineup = this.isHitter ? HitterTab.lineup : PitcherTab.lineup;
    const occupiedKeys = lineup.filter(s => s.pid && s.pid !== currentPid).map(s => s.pid);
    players = players.filter(p => !occupiedKeys.includes(p[SC.KEY]));
    const gridHtml = players.length
      ? `<div class="sw-grid">${players.map(p => {
          const key = p[SC.KEY];
          const nick = this.isHitter ? p[HITTER_COL.NICK] : p[PITCHER_COL.NICK];
          return `<div class="sw-grid-item" onclick="SwapModal.onPlayerClick('${key}')">
            ${makeCard(p, 88, this.isHitter)}
            <span class="sw-grid-name">${nick}</span>
          </div>`;
        }).join('')}</div>`
      : `<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-tertiary);">해당 포지션 선수 없음</div>`;
    document.getElementById('sw-lower').innerHTML = `
      <div class="sw-lower-hd">
        <span class="sw-zone-label" style="margin:0;">교체 가능 선수</span>
        <span class="sw-lower-count">${players.length}명</span>
      </div>
      <div class="sw-scroll">${gridHtml}</div>`;
  },

  _renderLowerComparison() {
    const SC = this.isHitter ? HITTER_COL : PITCHER_COL;
    const currentP = this._getCurrentPlayer();
    const newP = this._getPlayer(this._selectedKey);
    if (!newP) return;
    const posOvr = this.isHitter && this.selectedSlot === 'DH' ? 'DH' : null;
    const cBoj = currentP ? (parseFloat(currentP[SC.BOJ]) || 0) : 0;
    const nBoj = parseFloat(newP[SC.BOJ]) || 0;
    const diff = Math.round((nBoj - cBoj) * 100) / 100;
    const diffCls = diff > 0 ? 'up' : diff < 0 ? 'dn' : 'eq';
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff < 0 ? `${diff.toFixed(1)}` : '±0';
    document.getElementById('sw-lower').innerHTML = `
      <div class="sw-lower-hd">
        <span class="sw-zone-label" style="margin:0;">선택한 선수</span>
        <button class="sw-back-link" onclick="SwapModal.backToGrid()">← 다시 선택</button>
      </div>
      <div class="sw-scroll">
        <div class="sw-compare-row">${makeCard(newP, 88, this.isHitter, posOvr)}${this._fullStatsHtml(newP)}</div>
        <div class="sw-diff-bar">
          <div class="sw-diff-label">보정스탯 변화</div>
          <div class="sw-diff-row">
            <div class="sw-diff-block"><div class="sw-diff-bl">현재</div><div class="sw-diff-bv">${currentP ? fmt1(cBoj) : '—'}</div></div>
            <div class="sw-diff-arrow">→</div>
            <div class="sw-diff-block"><div class="sw-diff-bl">교체 후</div><div class="sw-diff-bv">${fmt1(nBoj)}</div></div>
            <div class="sw-diff-change"><div class="sw-diff-bl">변경</div><div class="sw-diff-cv ${diffCls}">${diffStr}</div></div>
          </div>
        </div>
      </div>`;
  },

  _fullStatsHtml(p) {
    const isH = this.isHitter;
    const SC = isH ? HITTER_COL : PITCHER_COL;
    const stats = isH ? [
      ['파워', p[HITTER_COL.S_POW]],
      ['정확', p[HITTER_COL.S_ACC]],
      ['선구', p[HITTER_COL.S_SEL]],
      ['인내', p[HITTER_COL.S_PAT]],
    ] : [
      ['변화', p[PITCHER_COL.S_CH]],
      ['구위', p[PITCHER_COL.S_GW]],
    ];
    const potItems = isH ? [
      ['풀스윙',     p[HITTER_COL.POT_FS]],
      ['클러치',     p[HITTER_COL.POT_CL]],
      ['송구',       p[HITTER_COL.POT_SO]],
      ['각성잠재력', p[HITTER_COL.POT_AW]],
    ] : [
      ['장타억제력', p[PITCHER_COL.POT_JS]],
      ['침착',       p[PITCHER_COL.POT_CM]],
      ['변화구구종', p[PITCHER_COL.POT_CG]],
      ['각성잠재력', p[PITCHER_COL.POT_AW]],
    ];
    const statRow = (lbl, val) =>
      `<div class="sw-stat-row"><span class="sw-stat-lbl">${lbl}</span><div class="sw-stat-val">${fmt2(val) || '-'}</div></div>`;
    const potRow = (lbl, val) =>
      `<div class="sw-stat-row"><span class="sw-stat-lbl">${lbl}</span><div class="sw-stat-val ${POT_CLASS(val)}">${val || '-'}</div></div>`;
    const skills = [
      [p[SC.SK1N], p[SC.SK1L]],
      [p[SC.SK2N], p[SC.SK2L]],
      [p[SC.SK3N], p[SC.SK3L]],
    ].filter(([nm]) => nm && nm !== '-');
    while (skills.length < 3) skills.push(['—', '-']);
    const score = parseFloat(p[SC.LINEUP_SCORE]) || 0;
    const slv = lv => { const n = parseInt(lv); return n >= 7 ? '#C9A227' : n >= 5 ? 'var(--accent)' : 'var(--text-secondary)'; };
    return `
      <div class="sw-full-stats">
        <div class="sw-stat-cols">
          <div>
            <div class="sw-stat-col-label">스탯</div>
            ${stats.map(([l, v]) => statRow(l, v)).join('')}
          </div>
          <div>
            <div class="sw-stat-col-label">잠재력</div>
            ${potItems.map(([l, v]) => potRow(l, v)).join('')}
          </div>
        </div>
        <div class="sw-skills-row">
          ${skills.map(([nm, lv]) => `<div class="sw-skill-chip"><div class="sw-skill-nm">${nm}</div><div class="sw-skill-lv" style="color:${slv(lv)}">Lv.${lv || '-'}</div></div>`).join('')}
          <div class="sw-skill-chip" style="background:rgba(201,162,39,0.08);border-color:rgba(201,162,39,0.25);">
            <div class="sw-skill-nm" style="color:rgba(201,162,39,0.7);">스킬점수</div>
            <div class="sw-skill-lv" style="color:#C9A227;">${fmt2(score)}</div>
          </div>
        </div>
      </div>`;
  },

  _renderFooter() {
    document.getElementById('sw-footer').innerHTML = this._selectedKey
      ? `<button class="sw-btn sw-btn-ghost" onclick="SwapModal.backToGrid()">← 뒤로가기</button>
         <button class="sw-btn sw-btn-primary" onclick="SwapModal.confirmSwap()">선수 교체</button>`
      : `<button class="sw-btn sw-btn-ghost" onclick="SwapModal.close()">취소</button>`;
  },

  onPlayerClick(key) {
    this._selectedKey = key;
    this._renderHeader();
    this._renderLower();
    this._renderFooter();
  },

  backToGrid() {
    this._selectedKey = null;
    this._renderHeader();
    this._renderLower();
    this._renderFooter();
  },

  _refreshAfterSwap(isHitter) {
    let done = 0;
    const finish = () => {
      if (++done < 2) return;
      hideLoading();
      SwapModal.close();
      if (isHitter) {
        HitterTab.renderLineup();
        HitterTab.renderStorage();
      } else {
        PitcherTab.renderLineup();
        PitcherTab.renderStorage();
      }
      loadShortcutData();
      App.loadPhotoCache(() => App.renderPhotoViews());
    };
    if (isHitter) {
      Api.call('getHitters', [State.clubId]).then(res => { if (res.success) State.hitters = res.data; finish(); }).catch(() => finish());
      Api.call('getHitterLineup', [State.clubId]).then(res => { if (res.success) State.hitterLineup = res.data; finish(); }).catch(() => finish());
    } else {
      Api.call('getPitchers', [State.clubId]).then(res => { if (res.success) State.pitchers = res.data; finish(); }).catch(() => finish());
      Api.call('getPitcherLineup', [State.clubId]).then(res => { if (res.success) State.pitcherLineup = res.data; finish(); }).catch(() => finish());
    }
  },

  confirmSwap() {
    const newKey = this._selectedKey;
    const slotKey = this.selectedSlot;
    showLoading('라인업 저장 중...');

    if (this.isHitter) {
      const slot = HitterTab.lineup.find(s => s.pos === slotKey);
      const currentP = this._getCurrentPlayer();
      const currentKey = currentP ? currentP[HITTER_COL.KEY] : null;
      const newP = State.hitters.find(h => h[HITTER_COL.KEY] === newKey);
      if (!slot || !newP) { hideLoading(); return; }
      const needsStorageSwap = currentP && currentP[HITTER_COL.NAME] === newP[HITTER_COL.NAME];
      if (!slot.pid) {
        const usedOrders = HitterTab.lineup.filter(s => s.order).map(s => s.order);
        for (let i = 1; i <= 9; i++) {
          if (!usedOrders.includes(i)) { slot.order = i; break; }
        }
      }
      const slotIndex = ['C','1B','2B','3B','SS','LF','CF','RF','DH'].indexOf(slotKey) + 1;
      const saveLineup = () => {
        slot.pid = newKey;
        Api.call('setHitterLineupSlot', [State.clubId, slotIndex, newP[HITTER_COL.NAME]]).then(() => {
          if (slot.order) {
            Api.call('setHitterOrder', [State.clubId, slotIndex, slot.order]).catch(() => {});
          }
            SwapModal._refreshAfterSwap(true);
          }).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); });
      };
      if (needsStorageSwap && currentKey && currentKey !== newKey) {
        Api.call('swapHitterStorageIdentity', [State.clubId, currentKey, newKey]).then(res => {
            if (res && res.success === false) { hideLoading(); alert(res.error || '보관함 위치 교체에 실패했습니다.'); return; }
            saveLineup();
          }).catch(e => { hideLoading(); alert('보관함 위치 교체 실패: ' + e.message); });
      } else {
        saveLineup();
      }
    } else {
      const slot = PitcherTab.lineup.find(s => s.slot === slotKey);
      const currentP = this._getCurrentPlayer();
      const currentKey = currentP ? currentP[PITCHER_COL.KEY] : null;
      const newP = State.pitchers.find(p => p[PITCHER_COL.KEY] === newKey);
      if (!slot || !newP) { hideLoading(); return; }
      const needsStorageSwap = currentP && currentP[PITCHER_COL.NAME] === newP[PITCHER_COL.NAME];
      const slotIndexMap = {'1SP':1,'2SP':2,'3SP':3,'4SP':4,'5SP':5,'1RP':6,'2RP':7,'3RP':8,'4RP':9,'5RP':10,'6RP':11,'CP':12};
      const saveLineup = () => {
        slot.pid = newKey;
        Api.call('setPitcherLineupSlot', [State.clubId, slotIndexMap[slotKey], newP[PITCHER_COL.NAME]]).then(() => SwapModal._refreshAfterSwap(false)).catch(e => { hideLoading(); alert('저장 실패: ' + e.message); });
      };
      if (needsStorageSwap && currentKey && currentKey !== newKey) {
        Api.call('swapPitcherStorageIdentity', [State.clubId, currentKey, newKey]).then(res => {
            if (res && res.success === false) { hideLoading(); alert(res.error || '보관함 위치 교체에 실패했습니다.'); return; }
            saveLineup();
          }).catch(e => { hideLoading(); alert('보관함 위치 교체 실패: ' + e.message); });
      } else {
        saveLineup();
      }
    }
  }
};

// ================================================================
// 드래그앤드롭 변경 확인 모달
// ================================================================
const DragConfirmModal = {
  _onConfirm: null,

  _ensure() {
    let modal = document.getElementById('drag-confirm-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'drag-confirm-modal';
    modal.className = 'drag-confirm-bg';
    modal.onclick = e => { if (e.target === modal) DragConfirmModal.close(); };
    modal.innerHTML = `
      <div class="drag-confirm-modal" onclick="event.stopPropagation()">
        <div class="drag-confirm-hd">
          <span class="drag-confirm-title">변경 확인</span>
          <button class="modal-close" onclick="DragConfirmModal.close()">✕</button>
        </div>
        <div class="drag-confirm-body" id="drag-confirm-body"></div>
        <div class="drag-confirm-foot">
          <button class="bs" onclick="DragConfirmModal.close()">취소</button>
          <button class="bp" onclick="DragConfirmModal.confirm()">확인</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  },

  _cardHtml(p, isHitter, label, moveText, opts = {}) {
    return `<div class="drag-confirm-card">
      ${p ? makeCardLineup(p, 74, isHitter, opts.bojOverride ?? null, opts.posOverride ?? null, opts.subStatOverride ?? null) : makeEmptyCard(label || '-', 74)}
      <div class="drag-confirm-card-label">${label || '-'}</div>
      <div class="drag-confirm-card-move">${moveText || ''}</div>
    </div>`;
  },

  _displayPitcherSlot(slot) {
    const m = String(slot.slot || '').match(/^(\d)(SP|RP)$/);
    const base = m ? `${m[2]}${m[1]}` : slot.slot;
    return `${base}${slot.role ? `(${slot.role})` : ''}`;
  },

  openHitterOrder(fromPos, toPos) {
    const fromSlot = HitterTab.lineup.find(s => s.pos === fromPos);
    const toSlot   = HitterTab.lineup.find(s => s.pos === toPos);
    if (!fromSlot || !toSlot) return;
    const fromP = fromSlot.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === fromSlot.pid) : null;
    const toP   = toSlot.pid   ? State.hitters.find(h => h[HITTER_COL.KEY] === toSlot.pid)   : null;
    const fromIdx = ['C','1B','2B','3B','SS','LF','CF','RF','DH'].indexOf(fromPos);
    const toIdx = ['C','1B','2B','3B','SS','LF','CF','RF','DH'].indexOf(toPos);
    const fromSr = (State.hitterLineup || [])[fromIdx] || [];
    const toSr = (State.hitterLineup || [])[toIdx] || [];
    const fromBoj = (fromSr[7] !== '' && fromSr[7] != null) ? fromSr[7] : null;
    const toBoj = (toSr[7] !== '' && toSr[7] != null) ? toSr[7] : null;
    const fromLabel = fromSlot.order ? `${fromSlot.order}번타자` : '-';
    const toLabel   = toSlot.order   ? `${toSlot.order}번타자`   : '-';
    this._open({
      title: '타순 변경',
      leftCard: this._cardHtml(fromP, true, fromLabel, `${fromLabel} -> ${toLabel}`, { bojOverride: fromBoj, posOverride: fromPos === 'DH' ? 'DH' : null }),
      rightCard: this._cardHtml(toP, true, toLabel, `${toLabel} -> ${fromLabel}`, { bojOverride: toBoj, posOverride: toPos === 'DH' ? 'DH' : null }),
      onConfirm: () => HitterTab.confirmOrderSwap(fromPos, toPos)
    });
  },

  openPitcherSlot(fromKey, toKey) {
    const fromSlot = PitcherTab.lineup.find(s => s.slot === fromKey);
    const toSlot   = PitcherTab.lineup.find(s => s.slot === toKey);
    if (!fromSlot || !toSlot) return;
    const fromP = fromSlot.pid ? State.pitchers.find(p => p[PITCHER_COL.KEY] === fromSlot.pid) : null;
    const toP   = toSlot.pid   ? State.pitchers.find(p => p[PITCHER_COL.KEY] === toSlot.pid)   : null;
    const fromIdx = SLOT_ORDER_ALL.indexOf(fromKey);
    const toIdx = SLOT_ORDER_ALL.indexOf(toKey);
    const fromSr = (State.pitcherLineup || [])[fromIdx] || [];
    const toSr = (State.pitcherLineup || [])[toIdx] || [];
    const fromBoj = (fromSr[7] !== '' && fromSr[7] != null) ? fromSr[7] : null;
    const toBoj = (toSr[7] !== '' && toSr[7] != null) ? toSr[7] : null;
    const fromLabel = this._displayPitcherSlot(fromSlot);
    const toLabel   = this._displayPitcherSlot(toSlot);
    this._open({
      title: '슬롯 변경',
      leftCard: this._cardHtml(fromP, false, fromLabel, `${fromLabel} -> ${toLabel}`, { bojOverride: fromBoj, posOverride: fromSlot.pos }),
      rightCard: this._cardHtml(toP, false, toLabel, `${toLabel} -> ${fromLabel}`, { bojOverride: toBoj, posOverride: toSlot.pos }),
      onConfirm: () => PitcherTab._swapSlots(fromKey, toKey)
    });
  },

  _open({ title, leftCard, rightCard, onConfirm }) {
    const modal = this._ensure();
    this._onConfirm = onConfirm;
    modal.querySelector('.drag-confirm-title').textContent = title;
    document.getElementById('drag-confirm-body').innerHTML = `
      <div class="drag-confirm-cards">
        ${leftCard}
        <div class="drag-confirm-arrow">⇄</div>
        ${rightCard}
      </div>`;
    modal.style.display = 'flex';
  },

  confirm() {
    const fn = this._onConfirm;
    this.close();
    if (fn) fn();
  },

  close() {
    const modal = document.getElementById('drag-confirm-modal');
    if (modal) modal.style.display = 'none';
    this._onConfirm = null;
  }
};

// ================================================================
// JS_App.html — App 초기화, 탭 전환, 온보딩 파싱, window.onload
// ================================================================

const App = {
  _loginPopup: null,
  _sessionKey: 'compya.login.v1',
  _sessionMaxAgeMs: 30 * 24 * 60 * 60 * 1000,

  init() {
    window.addEventListener('message', e => {
      if (!e.data || (e.data.type !== 'gsi_success' && e.data.type !== 'gsi_error')) return;
      if (App._loginPopup) { try { App._loginPopup.close(); } catch(_) {} App._loginPopup = null; }
      if (e.data.type === 'gsi_error') {
        showErr('login-err', '로그인에 실패했습니다: ' + e.data.error);
        return;
      }
      showLoading('로그인 중...');
      Api.call('loginWithToken', [e.data.token]).then(res => {
          hideLoading();
          if (!res.success) {
            showErr('login-err', res.error || '로그인에 실패했습니다.');
            return;
          }
          State.email = res.email;
          document.getElementById('login-google-sub').innerHTML = '연동된 계정이 본인의 계정과 다른 경우<br>다른 아이디로 로그인하세요';
          document.getElementById('login-google-btn').innerHTML = '다른 계정으로 로그인';
          if (res.isNew) {
            document.getElementById('login-new').style.display = 'block';
            document.getElementById('club-name-input').value = '';
          } else {
            State.clubId = res.clubId;
            App._saveSession();
            document.getElementById('login-club-display').textContent = res.clubId + ' 님';
            document.getElementById('login-existing').style.display = 'block';
          }
        }).catch(err => {
          hideLoading();
          showErr('login-err', err.message);
        });
    });
    if (this._restoreSession()) return;
    document.getElementById('login-google').style.display = 'flex';
  },

  // Convenience-only auto-entry cache. This is not authentication or authorization.
  _saveSession() {
    if (!State.clubId) return;
    try {
      localStorage.setItem(this._sessionKey, JSON.stringify({
        email: State.email || '',
        clubId: State.clubId,
        savedAt: Date.now()
      }));
    } catch (_) {}
  },

  _clearSession() {
    try { localStorage.removeItem(this._sessionKey); } catch (_) {}
  },

  _restoreSession() {
    try {
      const raw = localStorage.getItem(this._sessionKey);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || !saved.clubId || Date.now() - (saved.savedAt || 0) > this._sessionMaxAgeMs) {
        this._clearSession();
        return false;
      }
      State.email = saved.email || null;
      State.clubId = saved.clubId;
      document.getElementById('login-google').style.display = 'none';
      document.getElementById('login-new').style.display = 'none';
      document.getElementById('login-existing').style.display = 'block';
      document.getElementById('login-club-display').textContent = State.clubId + ' 님';
      setTimeout(() => App.enterExisting(), 0);
      return true;
    } catch (_) {
      this._clearSession();
      return false;
    }
  },

  openGoogleLogin() {
    Api.call('getGoogleAuthUrl', []).then(res => {
        if (!res.success) { showErr('login-err', '로그인 URL 생성에 실패했습니다.'); return; }
        App._loginPopup = window.open(res.url, 'google_login', 'width=500,height=600,left=100,top=100');
        if (!App._loginPopup) showErr('login-err', '팝업이 차단됐습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      }).catch(err => showErr('login-err', err.message));
  },

  enterExisting() {
    showLoading('데이터 확인 중...');
    Api.call('checkOnboarding', [State.clubId]).then(res => {
        hideLoading();
        if (res.needsSheet) {
          Api.call('getOrCreateUserSheet', [State.clubId]).then(() => showScreen('onboarding-screen')).catch(err => showErr('login-err', err.message));
        } else if (!res.hasData) {
          showScreen('onboarding-screen');
        } else {
          App.enterApp();
        }
      }).catch(err => { hideLoading(); showErr('login-err', err.message); });
  },

  register() {
    const teamName = document.getElementById('kbo-team-select').value;
    const clubId = document.getElementById('club-name-input').value.trim();
    if (!teamName) { showErr('login-err', 'KBO 팀을 선택해주세요.'); return; }
    if (!clubId) { showErr('login-err', '구단명을 입력해주세요.'); return; }
    showLoading('구단 등록 중...');
    Api.call('registerUser', [State.email, clubId, teamName]).then(res => {
        hideLoading();
        if (res.success) {
          State.clubId = res.clubId;
          State.email = res.email;
          App._saveSession();
          showScreen('onboarding-screen');
        } else {
          showErr('login-err', res.error || '등록에 실패했습니다.');
        }
      }).catch(err => { hideLoading(); showErr('login-err', err.message); });
  },

  skipOnboarding() {
    document.getElementById('paste-json').value = '';
    App.enterApp();
  },

  processOnboarding() {
    const jsonStr = document.getElementById('paste-json').value;
    const raw = document.getElementById('paste-area').value.trim();
    if (!jsonStr && !raw) { App.enterApp(); return; }

    showLoading('데이터 처리 중...');
    document.getElementById('onboarding-loading').style.display = 'block';

    let rows;
    if (jsonStr) { try { rows = JSON.parse(jsonStr); } catch (_) { rows = []; } }
    if (!rows || !rows.length) { rows = raw.split('\n').map(r => r.split('\t')); }

    Api.call('processOnboardingPaste', [State.clubId, rows]).then(res => {
        hideLoading();
        if (res.success) App.enterApp();
        else showErr('onboarding-err', res.error || '처리 중 오류가 발생했습니다.');
      }).catch(err => { hideLoading(); showErr('onboarding-err', err.message); });
  },

  enterApp() {
    App._saveSession();
    showScreen('app-screen');
    document.getElementById('club-badge').textContent = State.clubId;
    // 구단명 메뉴 버튼 텍스트 설정
    const menuClubBtn = document.getElementById('menu-btn-myclub');
    if (menuClubBtn) menuClubBtn.textContent = State.clubId;
    updateStickyHeights();
    // 기본 랜딩: 라운지
    switchMenu('lounge', document.getElementById('menu-btn-lounge'));
    showLoading('데이터 불러오는 중...');

    const onFail = e => { hideLoading(); showErr('login-err', '[????] ' + (e?.message || e)); };
    const load = (method, args, apply) => Api.call(method, args)
      .then(res => { if (res.success) apply(res.data); else throw new Error(res.error || method + ' failed'); })
      .catch(onFail);
    Promise.all([
      load('getHitters', [State.clubId], data => { State.hitters = data; }),
      load('getPitchers', [State.clubId], data => { State.pitchers = data; }),
      load('getHitterSkills', [], data => { State.hitterSkills = data; }),
      load('getPitcherSkills', [], data => { State.pitcherSkills = data; }),
      load('getHitterLineup', [State.clubId], data => { State.hitterLineup = data; }),
      load('getPitcherLineup', [State.clubId], data => { State.pitcherLineup = data; }),
    ]).then(() => {
      hideLoading();
      App.renderAll();
      App.loadPhotoCache(() => App.renderPhotoViews());
    });
  },

  renderAll() {
    const safe = (name, fn) => { try { fn(); } catch(e) { console.error('[renderAll] ' + name + ':', e); } };
    safe('HitterTab.renderLineup',   () => HitterTab.renderLineup());
    safe('HitterTab.renderStorage',  () => HitterTab.renderStorage());
    safe('PitcherTab.renderLineup',  () => PitcherTab.renderLineup());
    safe('PitcherTab.renderStorage', () => PitcherTab.renderStorage());
    safe('TeamTab.load',             () => TeamTab.load());
    loadShortcutData();
    applyLineupScale();
  },

  renderPhotoViews() {
    const safe = (fn) => { try { fn(); } catch (_) {} };
    safe(() => HitterTab.renderLineup());
    safe(() => HitterTab.renderStorage());
    safe(() => PitcherTab.renderLineup());
    safe(() => PitcherTab.renderStorage());
    safe(() => SummaryTab.render());
    applyLineupScale();
  },

  _collectPhotoIds() {
    const ids = new Set();
    (State.hitters || []).forEach(p => {
      const id = photoFileId(p[HITTER_COL.PHOTO]);
      if (id && !State.photoCache[id]) ids.add(id);
    });
    (State.pitchers || []).forEach(p => {
      const id = photoFileId(p[PITCHER_COL.PHOTO]);
      if (id && !State.photoCache[id]) ids.add(id);
    });
    return [...ids];
  },

  loadPhotoCache(callback) {
    const ids = this._collectPhotoIds();
    if (!ids.length) {
      if (callback) callback();
      return;
    }
    const chunks = [];
    for (let i = 0; i < ids.length; i += 2) chunks.push(ids.slice(i, i + 2));
    const loadNext = () => {
      const chunk = chunks.shift();
      if (!chunk) {
        if (callback) callback();
        return;
      }
      Api.call('getPhotoDataUrls', [chunk]).then(res => {
          if (res && res.success && res.data) {
            Object.assign(State.photoCache, res.data);
            App.renderPhotoViews();
          } else if (res && res.error) {
            console.warn('[photo-cache]', res.error);
          }
          loadNext();
        }).catch(err => {
          console.warn('[photo-cache]', err?.message || err);
          loadNext();
        });
    };
    loadNext();
  },

  switchTab(tab, btn) {
    document.querySelectorAll('.app-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('tab-' + tab).style.display = 'block';
    if (tab === 'shortcut') SummaryTab.render();
    applyLineupScale();
    applyTabScale();
  },

  // 팀정보 저장 후: 라인업 데이터만 재조회 → renderLineup
  refreshLineups(callback) {
    showRefreshing('라인업 동기화 중...');
    let done = 0;
    const finish = () => {
      if (++done >= 2) {
        HitterTab.renderLineup();
        PitcherTab.renderLineup();
        hideRefreshing();
        loadShortcutData();
        if (callback) callback();
      }
    };
    Api.call('getHitterLineup', [State.clubId]).then(res => { if (res.success) State.hitterLineup = res.data; finish(); }).catch(() => { finish(); });
    Api.call('getPitcherLineup', [State.clubId]).then(res => { if (res.success) State.pitcherLineup = res.data; finish(); }).catch(() => { finish(); });
  },

  refreshPlayers(isHitter, callback) {
    showRefreshing('선수 데이터 동기화 중...');
    const fn = isHitter ? 'getHitters' : 'getPitchers';
    Api.call(fn, [State.clubId]).then(res => {
        if (res.success) {
          if (isHitter) State.hitters = res.data;
          else State.pitchers = res.data;
        }
        if (isHitter) HitterTab.renderStorage();
        else PitcherTab.renderStorage();
        App.refreshLineups(callback);
        App.loadPhotoCache(() => App.renderPhotoViews());
      }).catch(() => { hideRefreshing(); });
  }
};

// ================================================================
// 숏컷 바 데이터 로드
// ================================================================
function loadShortcutData() {
  const int  = v => (v != null && v !== '') ? Math.round(Number(v)).toLocaleString() : '—';
  const set  = (id, v) => { document.getElementById(id).textContent = v; };
  Api.call('getShortcutData', [State.clubId]).then(function(data) {
      if (data.teamOrg)  set('teamOrg',  data.teamOrg);
      if (data.teamName) set('teamName', data.teamName);
      const logoEl = document.getElementById('teamLogo');
      const logoSrc = getTeamLogoSrc(data.teamName, data.logoUrl);
      if (logoSrc) {
        logoEl.innerHTML = '<img src="' + logoSrc + '" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.parentElement.innerHTML=\'🏟️\'">';
      } else {
        logoEl.textContent = '🏟️';
      }
      set('totalPower',   data.totalPower  != null && data.totalPower  !== '' ? Math.round(Number(data.totalPower)).toLocaleString()  : '—');
      set('batterTotal',  int(data.batterTotal));
      set('bCore',        int(data.bCore));
      set('bUpper',       int(data.bUpper));
      set('bMid',         int(data.bMid));
      set('bLower',       int(data.bLower));
      set('pitcherTotal', int(data.pitcherTotal));
      set('pStarter',     int(data.pStarter));
      set('pReliever',    int(data.pReliever));
      set('pCloser',      int(data.pCloser));
    }).catch(function(err) { console.error('숏컷바 로딩 실패:', err); });
}

// ================================================================
// 역추출 — PDF 다운
// ================================================================
function exportSheetAsPdf() {
  showLoading('PDF 생성 중...');
  Api.call('exportClubSheetAsPdf', [State.clubId]).then(function(res) {
      hideLoading();
      if (!res.success) { alert('PDF 오류: ' + res.error); return; }
      const a = document.createElement('a');
      a.href = 'data:application/pdf;base64,' + res.data;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }).catch(function(e) { hideLoading(); alert('PDF 오류: ' + e.message); });
}

// ================================================================
// 메뉴 전환
// ================================================================
function switchMenu(menuId, btn) {
  document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  document.querySelectorAll('.menu-page').forEach(p => p.style.display = 'none');
  const page = document.getElementById('page-' + menuId);
  if (page) page.style.display = 'block';
  if (menuId === 'myclub') {
    App.switchTab('shortcut', document.getElementById('tab-btn-shortcut'));
    loadShortcutData();
    applyTabScale();
  }
  if (menuId === 'lounge') LoungeRanking.load();
}

// ================================================================
// 요약 탭 — SummaryTab
// ================================================================
const SummaryTab = {
  render() {
    this.renderHitterField();
    this.renderPitcherGrid();
    this.renderOrderGrid();
  },

  renderHitterField() {
    const grid = document.getElementById('sum-hitter-grid');
    if (!grid) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    const cards = FIELD_SLOTS.map(fs => {
      const slot = HitterTab.lineup.find(s => s.pos === fs.pos);
      const p = slot?.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === slot.pid) : null;
      const posIdx = POS_ORDER.indexOf(fs.pos);
      const sr = sheetRows[posIdx] || [];
      const bojOvr = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, true, bojOvr, fs.pos === 'DH' ? 'DH' : null) : makeEmptyCard(fs.pos, 50);
      const cardClick = p ? ` onclick="PlayerInfoModal.open('${p[HITTER_COL.KEY]}',true,'${fs.pos}')"` : '';
      return `<div class="hl-field-slot${p ? '' : ' sum-empty-slot'}"
        style="grid-column:${fs.col};grid-row:${fs.row};">
        <span class="hl-pos-lbl">${fs.pos}</span><div class="hl-field-card-hit"${cardClick}>${card}</div>
      </div>`;
    }).join('');
    const diamond = `<svg class="hl-diamond-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 0 22 Q 50 -8 100 22" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
      <polygon points="50,90 82,65 50,40 18,65" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
      <circle cx="50" cy="65" r="3.5" fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="0.5"/>
    </svg>`;
    grid.innerHTML = cards + diamond;
  },

  renderPitcherGrid() {
    this._pitRow('sum-sp-row', ['1SP','2SP','3SP','4SP','5SP'], false);
    this._pitRow('sum-rp-row', ['1RP','2RP','3RP','4RP','5RP'], true);
    this._pitRow4();
  },

  _pitRow(rowId, slots, isRP) {
    const rowEl = document.getElementById(rowId);
    if (!rowEl) return;
    rowEl.innerHTML = slots.map(slotKey => {
      const slot = PitcherTab.lineup.find(s => s.slot === slotKey);
      const p    = slot?.pid ? State.pitchers.find(pt => pt[PITCHER_COL.KEY] === slot.pid) : null;
      const idx  = SLOT_ORDER_ALL.indexOf(slotKey);
      const sr   = (State.pitcherLineup || [])[idx] || [];
      const bojOvr = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, false, bojOvr) : makeEmptyCard(slotKey, 50);
      const role = isRP && slot?.role ? `<span class="pl-role-badge">${slot.role}</span>` : '';
      const cardClick = p ? ` onclick="PlayerInfoModal.open('${p[PITCHER_COL.KEY]}',false,'${slotKey}')"` : '';
      return `<div class="pl-grid-slot"><div class="pl-grid-card-hit"${cardClick}>${card}</div><span class="pl-slot-lbl">${slotKey}</span>${role}</div>`;
    }).join('');
  },

  _pitRow4() {
    const rowEl = document.getElementById('sum-row4');
    if (!rowEl) return;
    rowEl.innerHTML = ['6RP', null, null, null, 'CP'].map(slotKey => {
      if (!slotKey) return `<div class="pl-grid-slot" style="cursor:default;pointer-events:none;"></div>`;
      const slot = PitcherTab.lineup.find(s => s.slot === slotKey);
      const p    = slot?.pid ? State.pitchers.find(pt => pt[PITCHER_COL.KEY] === slot.pid) : null;
      const idx  = SLOT_ORDER_ALL.indexOf(slotKey);
      const sr   = (State.pitcherLineup || [])[idx] || [];
      const bojOvr = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card = p ? makeCardLineup(p, 50, false, bojOvr) : makeEmptyCard(slotKey, 50);
      const role = slotKey === '6RP' && slot?.role ? `<span class="pl-role-badge">${slot.role}</span>` : '';
      const cardClick = p ? ` onclick="PlayerInfoModal.open('${p[PITCHER_COL.KEY]}',false,'${slotKey}')"` : '';
      return `<div class="pl-grid-slot"><div class="pl-grid-card-hit"${cardClick}>${card}</div><span class="pl-slot-lbl">${slotKey}</span>${role}</div>`;
    }).join('');
  },

  renderOrderGrid() {
    const bar = document.getElementById('sum-order-bar');
    if (!bar) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sheetRows = State.hitterLineup || [];
    bar.innerHTML = '';
    const titleSlot = document.createElement('div');
    titleSlot.className = 'hl-order-title';
    titleSlot.textContent = '타순';
    bar.appendChild(titleSlot);
    for (let n = 1; n <= 9; n++) {
      const slot   = HitterTab.lineup.find(s => s.order === n);
      const p      = slot?.pid ? State.hitters.find(h => h[HITTER_COL.KEY] === slot.pid) : null;
      const posIdx = slot ? POS_ORDER.indexOf(slot.pos) : -1;
      const sr     = posIdx >= 0 ? (sheetRows[posIdx] || []) : [];
      const bojOvr = (sr[7] !== '' && sr[7] != null) ? sr[7] : null;
      const card   = p ? makeCardLineup(p, 48, true, bojOvr, slot?.pos === 'DH' ? 'DH' : null) : makeEmptyCard(n, 48);
      const wrap   = document.createElement('div');
      wrap.className = 'hl-ob-wrap';
      wrap.innerHTML = card + `<span class="hl-ob-num">${n}번타자</span>`;
      if (p) wrap.onclick = () => PlayerInfoModal.open(p[HITTER_COL.KEY], true, slot.pos);
      bar.appendChild(wrap);
    }
    applyOrderBarScaleById('sum-order-bar');
  }
};

// ================================================================
// 선수 정보 확인 모달 — PlayerInfoModal
// ================================================================
const PlayerInfoModal = {
  open(playerKey, isHitter, slotLabel, lineupRowOverride) {
    const p = isHitter
      ? State.hitters.find(h => h[HITTER_COL.KEY] === playerKey)
      : State.pitchers.find(pt => pt[PITCHER_COL.KEY] === playerKey);
    if (!p) return;
    const SC  = isHitter ? HITTER_COL : PITCHER_COL;
    const col = TYPE_COLOR[p[SC.TYPE]] || 'sig';

    document.getElementById('pi-hd').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="sw-slot-badge">${slotLabel}</span>
        <span class="sw-title">${p[SC.YEAR]} ${p[SC.NAME]}</span>
      </div>
      <button class="sw-close-btn" onclick="PlayerInfoModal.close()">✕</button>`;

    const lineupRow = Array.isArray(lineupRowOverride)
      ? lineupRowOverride
      : this._lineupRowFor(isHitter, slotLabel);
    const bojOvr = (lineupRow[7] !== '' && lineupRow[7] != null) ? lineupRow[7] : null;

    const rawBoj = isHitter ? (p[HITTER_COL.BOJ] || 0) : (p[PITCHER_COL.BOJ] || 0);
    const cardPos = isHitter ? slotLabel : null;
    const card = makeCardLineup(p, 88, isHitter, bojOvr, cardPos, fmt1(rawBoj));
    document.getElementById('pi-upper').innerHTML = `
      <div class="sw-player-row">${card}${this._statsHtml(p, isHitter, lineupRow)}</div>`;

    document.getElementById('pi-modal-bg').style.display = 'flex';
  },

  close() { document.getElementById('pi-modal-bg').style.display = 'none'; },

  _lineupRowFor(isHitter, slotLabel) {
    if (isHitter) {
      const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
      const idx = POS_ORDER.indexOf(slotLabel);
      return idx >= 0 ? (State.hitterLineup[idx] || []) : [];
    }
    const idx = SLOT_ORDER_ALL.indexOf(slotLabel);
    return idx >= 0 ? ((State.pitcherLineup || [])[idx] || []) : [];
  },

  _lineupVal(row, idx, fallback, formatter) {
    const v = row && row[idx] !== '' && row[idx] != null ? row[idx] : fallback;
    if (v === null || v === undefined || v === '' || v === '-') return '-';
    return formatter ? formatter(v) : v;
  },

  _intStat(row, idx, fallback) {
    const v = row && row[idx] !== '' && row[idx] != null ? row[idx] : fallback;
    if (v === null || v === undefined || v === '' || v === '-') return '-';
    const n = Number(v);
    return Number.isFinite(n) ? String(Math.round(n)) : String(v);
  },

  _statsHtml(p, isH, lineupRow) {
    const SC = isH ? HITTER_COL : PITCHER_COL;
    const stats = isH
      ? [['파워',this._intStat(lineupRow, 8, p[HITTER_COL.S_POW])],['정확',this._intStat(lineupRow, 9, p[HITTER_COL.S_ACC])],['선구',this._intStat(lineupRow, 10, p[HITTER_COL.S_SEL])],['인내',this._intStat(lineupRow, 11, p[HITTER_COL.S_PAT])]]
      : [['변화',this._intStat(lineupRow, 8, p[PITCHER_COL.S_CH])],['구위',this._intStat(lineupRow, 10, p[PITCHER_COL.S_GW])]];
    const pots = isH
      ? [['풀스윙',this._lineupVal(lineupRow, 13, p[HITTER_COL.POT_FS])],['클러치',this._lineupVal(lineupRow, 14, p[HITTER_COL.POT_CL])],['송구',this._lineupVal(lineupRow, 15, p[HITTER_COL.POT_SO])],['각성잠재력',this._lineupVal(lineupRow, 16, p[HITTER_COL.POT_AW])]]
      : [['장타억제력',this._lineupVal(lineupRow, 13, p[PITCHER_COL.POT_JS])],['침착',this._lineupVal(lineupRow, 14, p[PITCHER_COL.POT_CM])],['변화구구종',this._lineupVal(lineupRow, 15, p[PITCHER_COL.POT_CG])],['각성잠재력',this._lineupVal(lineupRow, 16, p[PITCHER_COL.POT_AW])]];
    const sr  = (lbl,v) => `<div class="sw-stat-row"><span class="sw-stat-lbl">${lbl}</span><div class="sw-stat-val">${v||'-'}</div></div>`;
    const pr  = (lbl,v) => `<div class="sw-stat-row"><span class="sw-stat-lbl">${lbl}</span><div class="sw-stat-val ${POT_CLASS(v)}">${v||'-'}</div></div>`;
    const skills = [
      [this._lineupVal(lineupRow, 18, p[SC.SK1N]), this._lineupVal(lineupRow, 19, p[SC.SK1L])],
      [this._lineupVal(lineupRow, 20, p[SC.SK2N]), this._lineupVal(lineupRow, 21, p[SC.SK2L])],
      [this._lineupVal(lineupRow, 22, p[SC.SK3N]), this._lineupVal(lineupRow, 23, p[SC.SK3L])]
    ].filter(([n])=>n&&n!=='-');
    while (skills.length < 3) skills.push(['—','-']);
    const slv = lv => { const n=parseInt(lv); return n>=7?'#C9A227':n>=5?'var(--accent)':'var(--text-secondary)'; };
    const score = parseFloat(this._lineupVal(lineupRow, 12, p[SC.LINEUP_SCORE])) || 0;
    const trainV = p[SC.TRAIN]??'-';  const trainP = p[SC.TRAIN_PROB]!=null&&p[SC.TRAIN_PROB]!==''?fmtPct(p[SC.TRAIN_PROB]):'-';
    const spV    = p[SC.SP]??'-';    const spP    = p[SC.SP_PROB]!=null&&p[SC.SP_PROB]!==''?fmtPct(p[SC.SP_PROB]):'-';
    return `<div class="sw-full-stats">
      <div class="sw-stat-cols">
        <div><div class="sw-stat-col-label">스탯</div>${stats.map(([l,v])=>sr(l,v)).join('')}</div>
        <div><div class="sw-stat-col-label">잠재력</div>${pots.map(([l,v])=>pr(l,v)).join('')}</div>
      </div>
      <div class="sw-skills-row">
        ${skills.map(([nm,lv])=>`<div class="sw-skill-chip"><div class="sw-skill-nm">${nm}</div><div class="sw-skill-lv" style="color:${slv(lv)}">Lv.${lv||'-'}</div></div>`).join('')}
        <div class="sw-skill-chip" style="background:rgba(201,162,39,0.08);border-color:rgba(201,162,39,0.25);">
          <div class="sw-skill-nm" style="color:rgba(201,162,39,0.7);">스킬점수</div>
          <div class="sw-skill-lv" style="color:#C9A227;">${fmt2(score)}</div>
        </div>
      </div>
      <div class="pi-redist-row">
        <div class="pi-redist-item"><span class="pi-redist-lbl">훈련재분배</span><span class="pi-redist-val">${trainV}</span><span class="pi-redist-prob">${trainP}</span></div>
        <div class="pi-redist-item"><span class="pi-redist-lbl">특훈재분배</span><span class="pi-redist-val">${spV}</span><span class="pi-redist-prob">${spP}</span></div>
      </div>
    </div>`;
  }
};

// ================================================================
// 붙여넣기 HTML 파싱 (병합셀 rowspan/colspan 완전 처리)
// ================================================================
function parseHtmlToGrid(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;

  const trs = Array.from(table.querySelectorAll('tr'));
  if (!trs.length) return null;

  const numRows = trs.length;
  const grid = Array.from({length: numRows}, () => []);

  trs.forEach((tr, ri) => {
    let ci = 0;
    Array.from(tr.querySelectorAll('td,th')).forEach(cell => {
      while (grid[ri][ci] !== undefined) ci++;
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1');

      let value = '';
      const dsv = cell.getAttribute('data-sheets-value');
      if (dsv) {
        try {
          const p = JSON.parse(dsv);
          value = p[3] !== undefined ? p[3] : (p[2] !== undefined ? String(p[2]) : '');
        } catch (_) { value = cell.textContent.trim(); }
      } else {
        value = cell.textContent.trim();
      }

      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          const fr = ri + dr, fc = ci + dc;
          if (fr < numRows) {
            while (grid[fr].length <= fc) grid[fr].push(undefined);
            grid[fr][fc] = (dr === 0 && dc === 0) ? value : '';
          }
        }
      }
      ci += colspan;
    });
  });

  const maxCols = Math.max(...grid.map(r => r.length), 0);
  return grid.map(r => {
    while (r.length < maxCols) r.push('');
    return r.map(v => (v === undefined ? '' : v));
  });
}

// ================================================================
// [라운지 섹션] 덱파워 랭킹 — LoungeRanking
// ================================================================
const LoungeRanking = {
  _loading: false,
  _data: [],
  _page: 0,
  _pageSizes: [7, 7, 8],
  _updatedAt: '',
  _refreshCooldownMs: 10 * 60 * 1000,

  load() {
    this._fetch('getRankings', '랭킹 불러오는 중...');
  },

  refresh() {
    const remainingSeconds = this.getRefreshCooldownRemainingSeconds();
    if (remainingSeconds > 0) {
      const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
      showRefreshNotice(`다음 갱신까지 ${remainingMinutes}분`, 2600);
      return;
    }
    this._fetch('refreshRankings', '랭킹 갱신 중...', { toast: true });
  },

  _fetch(action, message, options) {
    if (this._loading) return;
    this._loading = true;
    this._page = 0;
    const body = document.getElementById('lounge-ranking-body');
    if (!body) {
      this._loading = false;
      return;
    }
    this.updateControls();
    body.innerHTML = `<div class="lounge-sec-loading">${message}</div>`;
    if (options && options.toast) showRefreshing(message);

    Api.call(action, []).then(res => {
        this._loading = false;
        if (options && options.toast) hideRefreshing();
        if (!res.success) {
          body.innerHTML = `<div class="lounge-sec-err">${res.error || '데이터를 불러오지 못했습니다.'}</div>`;
          this.updateControls();
          return;
        }
        this._updatedAt = res.updatedAt || '';
        this.render(res.data);
        if (res.cooldown) {
          const remainingMinutes = Math.max(1, Math.ceil((res.cooldownRemainingSeconds || 0) / 60));
          showRefreshNotice(`다음 갱신까지 ${remainingMinutes}분`, 2600);
        }
      }).catch(e => {
        this._loading = false;
        if (options && options.toast) hideRefreshing();
        body.innerHTML = `<div class="lounge-sec-err">${e.message}</div>`;
        this.updateControls();
      });
  },

  render(data) {
    const body = document.getElementById('lounge-ranking-body');
    if (!body) return;
    this._data = Array.isArray(data) ? data : [];
    this._page = 0;
    this.updateControls();
    this.renderPage();
  },

  getTotalPages() {
    return this._pageSizes.length;
  },

  getPageStart(page) {
    return this._pageSizes.slice(0, page).reduce((sum, size) => sum + size, 0);
  },

  getPageSize(page) {
    return this._pageSizes[page] || this._pageSizes[this._pageSizes.length - 1];
  },

  prevPage() {
    if (this._page <= 0) return;
    this._page--;
    this.renderPage();
  },

  nextPage() {
    if (this._page >= this.getTotalPages() - 1) return;
    this._page++;
    this.renderPage();
  },

  updateControls() {
    const totalPages = this.getTotalPages();
    const label = document.getElementById('rank-page-label');
    const prev = document.getElementById('rank-prev-btn');
    const next = document.getElementById('rank-next-btn');
    const updatedAt = document.getElementById('rank-updated-at');
    if (label) label.textContent = `${this._page + 1} / ${totalPages}`;
    if (prev) prev.disabled = this._loading || this._page <= 0;
    if (next) next.disabled = this._loading || this._page >= totalPages - 1;
    if (updatedAt) updatedAt.textContent = this._updatedAt ? `최종갱신: ${this.formatUpdatedAt(this._updatedAt)}` : '';
  },

  getRefreshCooldownRemainingSeconds() {
    const updatedAtMs = this.parseUpdatedAtMs(this._updatedAt);
    if (!updatedAtMs) return 0;
    const elapsedMs = Date.now() - updatedAtMs;
    if (elapsedMs < 0) return Math.ceil(this._refreshCooldownMs / 1000);
    if (elapsedMs >= this._refreshCooldownMs) return 0;
    return Math.ceil((this._refreshCooldownMs - elapsedMs) / 1000);
  },

  parseUpdatedAtMs(value) {
    const text = String(value || '').trim();
    if (!text) return 0;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] || 0)
      ).getTime();
    }
    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  },

  formatUpdatedAt(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (match) return `${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(parsed).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
      return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
    }
    return text.replace(/^\d{4}-/, '').replace(/-/g, '/').replace(/:\d{2}$/, '');
  },

  renderPage() {
    const body = document.getElementById('lounge-ranking-body');
    if (!body) return;
    const data = this._data;

    const int = v => (v != null && v !== '' && !isNaN(v)) ? Math.round(Number(v)).toLocaleString() : '—';
    const numCls = (i) => i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
    const start = this.getPageStart(this._page);
    const pageSize = this.getPageSize(this._page);
    const pageData = Array.from({ length: pageSize }, (_, i) => data[start + i] || null);
    this.updateControls();

    body.innerHTML = '<div class="rank-list">' + pageData.map((d, i) => {
      const rankIndex = start + i;
      const isFilled = !!d;
      const logoSrc = isFilled ? getTeamLogoSrc(d.teamName, d.logoUrl) : '';
      return `
      <div class="rank-entry${isFilled ? '' : ' rank-entry-empty'}" ${isFilled ? `style="cursor:pointer;" onclick="ClubViewModal.open('${d.clubId}')"` : ''}>
        <div class="rank-top">
          <span class="rank-num ${numCls(rankIndex)}">${rankIndex + 1}</span>
          <div class="rank-club">
            <div class="rank-names">
              ${logoSrc ? `<span class="rank-team-logo" title="${d.teamName || ''}" aria-label="${d.teamName || ''}"><img src="${logoSrc}" alt=""></span>` : `<span class="rank-team-logo rank-team-logo-empty">-</span>`}
              <span class="rank-club-name">${isFilled ? d.clubId : '-'}</span>
            </div>
          </div>
          <span class="rank-total">${isFilled ? int(d.totalPower) : '-'}</span>
        </div>
        <div class="rank-details">
          <div class="rank-detail-row">
            <div class="rank-detail-group"><span class="rank-detail-lbl">타자</span><span class="rank-detail-val hi">${isFilled ? int(d.batterTotal) : '-'}</span></div>
            <div class="rank-vsep"></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">코어</span><span class="rank-detail-val">${isFilled ? int(d.bCore) : '-'}</span></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">상위</span><span class="rank-detail-val">${isFilled ? int(d.bUpper) : '-'}</span></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">중위</span><span class="rank-detail-val">${isFilled ? int(d.bMid) : '-'}</span></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">하위</span><span class="rank-detail-val">${isFilled ? int(d.bLower) : '-'}</span></div>
          </div>
          <div class="rank-detail-row">
            <div class="rank-detail-group"><span class="rank-detail-lbl">투수</span><span class="rank-detail-val hi">${isFilled ? int(d.pitcherTotal) : '-'}</span></div>
            <div class="rank-vsep"></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">선발</span><span class="rank-detail-val">${isFilled ? int(d.pStarter) : '-'}</span></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">중계</span><span class="rank-detail-val">${isFilled ? int(d.pReliever) : '-'}</span></div>
            <div class="rank-detail-group"><span class="rank-detail-lbl">마무리</span><span class="rank-detail-val">${isFilled ? int(d.pCloser) : '-'}</span></div>
          </div>
        </div>
      </div>`;
    }).join('') + '</div>';
  }
};

// ================================================================
// [라운지] 구단 뷰 모달 — ClubViewModal
// ================================================================
const ClubViewModal = {
  _data: null,

  open(clubId) {
    document.getElementById('cv-club-badge').textContent = clubId;
    document.getElementById('cv-club-title').textContent = '구단 요약';
    document.getElementById('cv-body').innerHTML = '<div class="lounge-sec-loading">데이터 불러오는 중...</div>';
    document.getElementById('club-view-modal').style.display = 'flex';

    Api.call('getClubSnapshot', [clubId]).then(res => {
        if (!res.success) { document.getElementById('cv-body').innerHTML = `<div class="lounge-sec-err">${res.error}</div>`; return; }
        this._data = res;
        this._renderBody();
      }).catch(e => { document.getElementById('cv-body').innerHTML = `<div class="lounge-sec-err">${e.message}</div>`; });
  },

  close() { document.getElementById('club-view-modal').style.display = 'none'; this._data = null; },

  _renderBody() {
    document.getElementById('cv-body').innerHTML = `
      <div class="sum-layout">
        <div class="sum-row1">
          <div class="sum-sec">
            <div class="hl-field" style="flex:1;min-height:calc(9 * 58px + 2px);overflow:hidden;">
              <div class="hl-field-grid" id="cv-hitter-grid"></div>
            </div>
          </div>
          <div class="sum-sec">
            <div class="pl-grid-wrap" style="border-left:0.5px solid var(--border-light);flex:1;">
              <div class="pl-row-label">SP 선발</div>
              <div class="pl-grid-row" id="cv-sp-row"></div>
              <div class="pl-row-label">RP 중계</div>
              <div class="pl-grid-row" id="cv-rp-row"></div>
              <div class="pl-grid-row" id="cv-row4"></div>
            </div>
          </div>
        </div>
        <div class="hl-order">
          <div class="hl-order-bar" id="cv-order-bar"></div>
        </div>
      </div>`;
    this._renderHitterGrid();
    this._renderPitcherGrid();
    this._renderOrderBar();
    applyLineupScale();
  },

  _hitterAt(pos) {
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    const sr = (this._data.hitterLineup || [])[POS_ORDER.indexOf(pos)] || [];
    const p  = sr[6] ? this._data.hitters.find(h => h[HITTER_COL.NAME] === sr[6]) : null;
    return { p, bojOvr: (sr[7] !== '' && sr[7] != null) ? sr[7] : null };
  },

  _pitcherAt(slotKey) {
    const sr = (this._data.pitcherLineup || [])[SLOT_ORDER_ALL.indexOf(slotKey)] || [];
    const p  = sr[6] ? this._data.pitchers.find(pt => pt[PITCHER_COL.NAME] === sr[6]) : null;
    return { p, bojOvr: (sr[7] !== '' && sr[7] != null) ? sr[7] : null, role: sr[0] || null };
  },

  _renderHitterGrid() {
    const grid = document.getElementById('cv-hitter-grid');
    if (!grid) return;
    const cards = FIELD_SLOTS.map(fs => {
      const { p, bojOvr } = this._hitterAt(fs.pos);
      const card  = p ? makeCardLineup(p, 50, true, bojOvr, fs.pos === 'DH' ? 'DH' : null) : makeEmptyCard(fs.pos, 50);
      const cardClick = p ? ` onclick="ClubViewModal.onCardClick('${fs.pos}',true)"` : '';
      return `<div class="hl-field-slot${p ? '' : ' sum-empty-slot'}" style="grid-column:${fs.col};grid-row:${fs.row};">
        <span class="hl-pos-lbl">${fs.pos}</span><div class="hl-field-card-hit"${cardClick}>${card}</div></div>`;
    }).join('');
    const diamond = `<svg class="hl-diamond-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 0 22 Q 50 -8 100 22" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
      <polygon points="50,90 82,65 50,40 18,65" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
      <circle cx="50" cy="65" r="3.5" fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="0.5"/>
    </svg>`;
    grid.innerHTML = cards + diamond;
  },

  _pitRow(rowId, slots, isRP) {
    const rowEl = document.getElementById(rowId);
    if (!rowEl) return;
    rowEl.innerHTML = slots.map(slotKey => {
      const { p, bojOvr, role } = this._pitcherAt(slotKey);
      const card  = p ? makeCardLineup(p, 50, false, bojOvr) : makeEmptyCard(slotKey, 50);
      const cardClick = p ? ` onclick="ClubViewModal.onCardClick('${slotKey}',false)"` : '';
      const roleBadge = isRP && role ? `<span class="pl-role-badge">${role}</span>` : '';
      return `<div class="pl-grid-slot"><div class="pl-grid-card-hit"${cardClick}>${card}</div><span class="pl-slot-lbl">${slotKey}</span>${roleBadge}</div>`;
    }).join('');
  },

  _renderPitcherGrid() {
    this._pitRow('cv-sp-row', ['1SP','2SP','3SP','4SP','5SP'], false);
    this._pitRow('cv-rp-row', ['1RP','2RP','3RP','4RP','5RP'], true);
    const rowEl = document.getElementById('cv-row4');
    if (!rowEl) return;
    rowEl.innerHTML = ['6RP', null, null, null, 'CP'].map(slotKey => {
      if (!slotKey) return `<div class="pl-grid-slot" style="cursor:default;pointer-events:none;"></div>`;
      const { p, bojOvr, role } = this._pitcherAt(slotKey);
      const card  = p ? makeCardLineup(p, 50, false, bojOvr) : makeEmptyCard(slotKey, 50);
      const cardClick = p ? ` onclick="ClubViewModal.onCardClick('${slotKey}',false)"` : '';
      const roleBadge = slotKey === '6RP' && role ? `<span class="pl-role-badge">${role}</span>` : '';
      return `<div class="pl-grid-slot"><div class="pl-grid-card-hit"${cardClick}>${card}</div><span class="pl-slot-lbl">${slotKey}</span>${roleBadge}</div>`;
    }).join('');
  },

  _renderOrderBar() {
    const bar = document.getElementById('cv-order-bar');
    if (!bar) return;
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    bar.innerHTML = '';
    const titleSlot = document.createElement('div');
    titleSlot.className = 'hl-order-title';
    titleSlot.textContent = '타순';
    bar.appendChild(titleSlot);
    const lineup = POS_ORDER.map((pos, i) => {
      const sr = (this._data.hitterLineup || [])[i] || [];
      const p  = sr[6] ? this._data.hitters.find(h => h[HITTER_COL.NAME] === sr[6]) : null;
      return { pos, order: sr[1] || null, p, bojOvr: (sr[7] !== '' && sr[7] != null) ? sr[7] : null };
    });
    const sorted = [...lineup.filter(s => s.order != null).sort((a,b) => a.order - b.order),
                    ...lineup.filter(s => s.order == null)];
    sorted.forEach(({ pos, order, p, bojOvr }, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'hl-ob-wrap';
      wrap.innerHTML = (p ? makeCardLineup(p, 48, true, bojOvr, pos === 'DH' ? 'DH' : null) : makeEmptyCard(order || pos, 48)) +
        `<span class="hl-ob-num">${order ? order + '번타자' : '-'}</span>`;
      if (p) wrap.onclick = () => ClubViewModal.onCardClick(pos, true);
      bar.appendChild(wrap);
    });
    applyOrderBarScaleById('cv-order-bar');
  },

  onCardClick(posOrSlot, isHitter) {
    ClubCompareModal.open(posOrSlot, isHitter, this._data);
  }
};

// ================================================================
// [라운지] 포지션 비교 모달 — ClubCompareModal
// ================================================================
const ClubCompareModal = {
  open(posOrSlot, isHitter, otherData) {
    const POS_ORDER = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];
    let otherP = null, myP = null, otherBoj = null, myBoj = null, otherRow = [], myRow = [];

    if (isHitter) {
      const idx   = POS_ORDER.indexOf(posOrSlot);
      const oSr   = (otherData.hitterLineup || [])[idx] || [];
      const mSr   = (State.hitterLineup || [])[idx] || [];
      otherRow = oSr;
      myRow = mSr;
      otherP = oSr[6] ? otherData.hitters.find(h => h[HITTER_COL.NAME] === oSr[6]) : null;
      myP    = mSr[6] ? State.hitters.find(h => h[HITTER_COL.NAME] === mSr[6]) : null;
      otherBoj = (oSr[7] !== '' && oSr[7] != null) ? oSr[7] : null;
      myBoj    = (mSr[7] !== '' && mSr[7] != null) ? mSr[7] : null;
    } else {
      const idx   = SLOT_ORDER_ALL.indexOf(posOrSlot);
      const oSr   = (otherData.pitcherLineup || [])[idx] || [];
      const mSr   = (State.pitcherLineup || [])[idx] || [];
      otherRow = oSr;
      myRow = mSr;
      otherP = oSr[6] ? otherData.pitchers.find(p => p[PITCHER_COL.NAME] === oSr[6]) : null;
      myP    = mSr[6] ? State.pitchers.find(p => p[PITCHER_COL.NAME] === mSr[6]) : null;
      otherBoj = (oSr[7] !== '' && oSr[7] != null) ? oSr[7] : null;
      myBoj    = (mSr[7] !== '' && mSr[7] != null) ? mSr[7] : null;
    }

    document.getElementById('cc-hd').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="sw-slot-badge">${posOrSlot}</span>
        <span class="sw-title">포지션 비교</span>
      </div>
      <button class="sw-close-btn" onclick="ClubCompareModal.close()">✕</button>`;

    const mkCard = (p, boj, isH) => {
      const raw = isH ? (p?.[HITTER_COL.BOJ] || 0) : (p?.[PITCHER_COL.BOJ] || 0);
      const cardPos = isH ? posOrSlot : null;
      return p ? makeCardLineup(p, 88, isH, boj, cardPos, fmt1(raw)) : makeEmptyCard(posOrSlot, 88);
    };
    const empty = `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-tertiary);">미배치</div>`;
    const stats = (p, isH, row) => p ? PlayerInfoModal._statsHtml(p, isH, row) : empty;

    document.getElementById('cc-other').innerHTML = `
      <div class="cc-sec-label">${otherData.clubId}</div>
      <div class="sw-player-row">${mkCard(otherP, otherBoj, isHitter)}${stats(otherP, isHitter, otherRow)}</div>`;

    document.getElementById('cc-divider').textContent = `${State.clubId} — 같은 포지션`;

    document.getElementById('cc-mine').innerHTML = `
      <div class="sw-player-row">${mkCard(myP, myBoj, isHitter)}${stats(myP, isHitter, myRow)}</div>`;

    document.getElementById('club-compare-modal').style.display = 'flex';
  },

  close() { document.getElementById('club-compare-modal').style.display = 'none'; }
};

// ================================================================
// 구단명 변경 모달 — RenameModal
// ================================================================
const RenameModal = {
  open() {
    document.getElementById('rename-current').textContent = State.clubId || '—';
    const input = document.getElementById('rename-input');
    input.value = '';
    document.getElementById('rename-count').textContent = '0 / 8';
    document.getElementById('rename-err').style.display = 'none';
    document.getElementById('rename-modal').style.display = 'flex';
    setTimeout(() => input.focus(), 80);
  },

  close() {
    document.getElementById('rename-modal').style.display = 'none';
  },

  onInput(input) {
    const len = [...input.value].length;
    document.getElementById('rename-count').textContent = `${len} / 8`;
    document.getElementById('rename-err').style.display = 'none';
  },

  _showErr(msg) {
    const el = document.getElementById('rename-err');
    el.textContent = msg;
    el.style.display = 'block';
  },

  submit() {
    const newName = document.getElementById('rename-input').value.trim();
    if (!newName) { this._showErr('구단명을 입력해주세요.'); return; }
    if ([...newName].length > 8) { this._showErr('최대 8글자까지 입력 가능합니다.'); return; }
    if (newName === State.clubId) { this._showErr('현재 구단명과 동일합니다.'); return; }

    const btn = document.getElementById('rename-submit-btn');
    btn.disabled = true;
    showLoading('구단명 변경 중...');

    Api.call('renameClub', [State.clubId, newName]).then(res => {
        hideLoading();
        btn.disabled = false;
        if (!res.success) { this._showErr(res.error || '변경에 실패했습니다.'); return; }
        const old = State.clubId;
        State.clubId = newName;
        App._saveSession();
        // 헤더 배지 + 메뉴 버튼 갱신
        document.getElementById('club-badge').textContent = newName;
        const menuBtn = document.getElementById('menu-btn-myclub');
        if (menuBtn) menuBtn.textContent = newName;
        updateStickyHeights();
        this.close();
        // 전체 데이터 재조회 (STORAGE_KEY 변경됐으므로 State 초기화 필요)
        State.hitters = []; State.pitchers = [];
        State.hitterLineup = []; State.pitcherLineup = [];
        showLoading('데이터 재동기화 중...');
        let done = 0;
        const finish = () => { if (++done >= 6) { hideLoading(); App.renderAll(); } };
        const fail  = e => { hideLoading(); showErr('login-err', '[재로드 오류] ' + (e?.message || e)); finish(); };
        Api.call('getHitters', [newName]).then(r => { if(r.success) State.hitters = r.data; finish(); }).catch(fail);
        Api.call('getPitchers', [newName]).then(r => { if(r.success) State.pitchers = r.data; finish(); }).catch(fail);
        Api.call('getHitterSkills', []).then(r => { if(r.success) State.hitterSkills = r.data; finish(); }).catch(fail);
        Api.call('getPitcherSkills', []).then(r => { if(r.success) State.pitcherSkills = r.data; finish(); }).catch(fail);
        Api.call('getHitterLineup', [newName]).then(r => { if(r.success) State.hitterLineup = r.data; finish(); }).catch(fail);
        Api.call('getPitcherLineup', [newName]).then(r => { if(r.success) State.pitcherLineup = r.data; finish(); }).catch(fail);
      }).catch(e => { hideLoading(); btn.disabled = false; this._showErr(e.message); });
  }
};

// ================================================================
// 탈퇴 모달 — WithdrawModal
// ================================================================
const WITHDRAW_PHRASE = '좌완언더임현준';

const WithdrawModal = {
  open() {
    const input = document.getElementById('withdraw-input');
    input.value = '';
    document.getElementById('withdraw-err').style.display = 'none';
    this._setSubmitEnabled(false);
    document.getElementById('withdraw-modal').style.display = 'flex';
    setTimeout(() => input.focus(), 80);
  },

  close() {
    document.getElementById('withdraw-modal').style.display = 'none';
  },

  onInput(input) {
    this._setSubmitEnabled(input.value === WITHDRAW_PHRASE);
    document.getElementById('withdraw-err').style.display = 'none';
  },

  _setSubmitEnabled(enabled) {
    const btn = document.getElementById('withdraw-submit-btn');
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
    btn.style.cursor  = enabled ? 'pointer' : 'not-allowed';
  },

  _showErr(msg) {
    const el = document.getElementById('withdraw-err');
    el.textContent = msg;
    el.style.display = 'block';
  },

  submit() {
    const val = document.getElementById('withdraw-input').value;
    if (val !== WITHDRAW_PHRASE) { this._showErr('입력한 문구가 다릅니다.'); return; }

    const btn = document.getElementById('withdraw-submit-btn');
    btn.disabled = true;
    showLoading('탈퇴 처리 중...');

    Api.call('deleteAccount', [State.clubId]).then(res => {
        hideLoading();
        btn.disabled = false;
        if (!res.success) { this._showErr(res.error || '탈퇴 처리에 실패했습니다.'); return; }
        this.close();
        // State 초기화 후 로그인 화면으로
        App._clearSession();
        State.clubId = null; State.email = null;
        State.hitters = []; State.pitchers = [];
        State.hitterLineup = []; State.pitcherLineup = [];
        document.getElementById('login-existing').style.display = 'none';
        document.getElementById('login-new').style.display = 'none';
        document.getElementById('login-google').style.display = 'flex';
        showScreen('login-screen');
      }).catch(e => { hideLoading(); btn.disabled = false; this._showErr(e.message); });
  }
};

// ================================================================
// 앱 초기화 실행
// ================================================================
function applyMenuScale() {
  const bar = document.querySelector('.menu-bar');
  if (!bar) return;
  bar.style.zoom = '';
  const naturalW = bar.scrollWidth;
  const availW = bar.parentElement?.clientWidth || window.innerWidth;
  bar.style.zoom = naturalW > availW ? Math.max(0.72, availW / naturalW) : '';
}

function applyHeaderScale() {
  const scalable = document.querySelector('.app-header-scalable');
  if (!scalable) return;
  scalable.style.zoom = '';
  const header = scalable.parentElement;
  if (!header) return;
  const overflow = header.scrollWidth - header.clientWidth;
  if (overflow > 0) {
    const naturalW = scalable.scrollWidth;
    scalable.style.zoom = Math.max(0.65, (naturalW - overflow) / naturalW);
  }
}

function applyTabScale() {
  const tabs = document.querySelector('.app-tabs');
  if (!tabs) return;
  tabs.style.zoom = '';
  const naturalW = tabs.scrollWidth;
  if (!naturalW) return;
  const availW = document.body.clientWidth || window.innerWidth;
  tabs.style.zoom = naturalW > availW ? Math.max(0.72, availW / naturalW) : '';
}

function updateStickyHeights() {
  applyMenuScale();
  applyHeaderScale();
  const h = document.querySelector('.app-sticky')?.offsetHeight || 0;
  if (h > 0) document.documentElement.style.setProperty('--app-sticky-h', h + 'px');
  const sh = document.querySelector('.shortcut-bar')?.offsetHeight || 0;
  if (sh > 0) document.documentElement.style.setProperty('--shortcut-h', sh + 'px');
}

function applyOrderBarScaleById(barId) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const parent = bar.parentElement;
  const w = parent ? (parent.clientWidth || window.innerWidth) : window.innerWidth;
  if (w >= 980) {
    bar.style.width    = '960px';
    bar.style.flexWrap = 'nowrap';
    bar.style.zoom     = Math.min(w, 1200) / 960;
  } else {
    bar.style.width    = '480px';
    bar.style.flexWrap = 'wrap';
    bar.style.zoom     = w >= 480 ? 1 : w / 480;
  }
}
function applyOrderBarScale() { applyOrderBarScaleById('hl-order-bar'); }

function applyFilterBarScale(barId) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  // Always measure the natural one-row width, then scale down to fit.
  bar.style.zoom = '';
  bar.style.width = '';
  bar.style.flexWrap = 'nowrap';

  const btns = Array.from(bar.querySelectorAll('.filter-btn'));
  if (!btns.length || !btns[0].offsetHeight) return; // hidden or not rendered yet

  const style = window.getComputedStyle(bar);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const totalW = btns.reduce((sum, btn) => sum + btn.offsetWidth, 0) + gap * Math.max(0, btns.length - 1);
  const parent = bar.parentElement;
  const availW = parent ? parent.clientWidth : document.documentElement.clientWidth;
  if (totalW <= 0 || availW <= 0) return;

  const scale = Math.min(1, availW / totalW);
  bar.style.width = totalW + 'px';
  bar.style.zoom = scale < 1 ? String(scale) : '';
}

function initOrderBarScale() {
  window.addEventListener('resize', () => {
    updateStickyHeights();
    applyTabScale();
    applyOrderBarScale();
    applyOrderBarScaleById('cv-order-bar');
    applyOrderBarScaleById('sum-order-bar');
    applyFilterBarScale('hitter-filter-bar');
    applyFilterBarScale('pitcher-filter-bar');
  });
}

function applyLineupScale() {
  const BASE = 480;
  const scaleFor = (el) => {
    if (!el) return;
    const parent = el.parentElement;
    const available = parent ? parent.clientWidth : window.innerWidth;
    const z = available > 0 && available < BASE ? available / BASE : 1;
    el.style.zoom = z < 1 ? String(z) : '';
  };

  // 이전 방식 잔재 초기화 (이중 zoom 방지)
  document.querySelectorAll('.hl-upper, .pl-layout, .hl-field, .hl-list, .pl-grid-wrap, .pl-lower-section').forEach(el => {
    el.style.zoom = '';
  });

  // 타자 라인업 탭: hl-upper 통째로 (그리드 + 선수행)
  scaleFor(document.querySelector('.hl-upper'));

  // 투수 라인업 탭: pl-layout 통째로 (그리드 + 선수행)
  scaleFor(document.querySelector('.pl-layout'));

  // 요약탭: hl-upper/pl-layout 없으므로 개별 요소 직접 스케일
  const shortcutTab = document.getElementById('tab-shortcut');
  if (shortcutTab) {
    scaleFor(shortcutTab.querySelector('.hl-field'));
    scaleFor(shortcutTab.querySelector('.pl-grid-wrap'));
  }

  // 구단 뷰 모달 (열려있을 때)
  const cvBody = document.getElementById('cv-body');
  if (cvBody) {
    scaleFor(cvBody.querySelector('.hl-field'));
    scaleFor(cvBody.querySelector('.pl-grid-wrap'));
  }
}

function initLineupScale() {
  window.addEventListener('resize', applyLineupScale);
  new ResizeObserver(applyLineupScale).observe(document.body);
}

window.onload = () => {
  App.init();
  initLineupScale();
  initOrderBarScale();

  const pasteArea = document.getElementById('paste-area');
  if (pasteArea) {
    pasteArea.addEventListener('paste', e => {
      const html = e.clipboardData?.getData('text/html') || '';
      const text = e.clipboardData?.getData('text/plain') || '';

      if (html) {
        const grid = parseHtmlToGrid(html);
        if (grid && grid.length > 0) {
          e.preventDefault();
          document.getElementById('paste-json').value = JSON.stringify(grid);
          pasteArea.value = `✓ 데이터 인식 완료 (${grid.length}행 × ${grid[0].length}열) — 아래 버튼을 눌러 불러오기`;
          return;
        }
      }
      if (text) {
        e.preventDefault();
        document.getElementById('paste-json').value = '';
        pasteArea.value = text;
        return;
      }
      // clipboardData 비어있음(모바일 등) → 브라우저 기본 붙여넣기 허용
    });
  }
};
