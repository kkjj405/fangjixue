/* 方剂学 · 练习模块（默写 / 选择题；含君臣佐使四小题） */
(function () {
  'use strict';
  var Z = window.FJ, UI = window.ZY_UI;
  var esc = Z.esc, icon = UI.icon;

  var MAX_DRAFTS = 5;

  var FIELD_DEF = [
    { k: 'composition', name: '组成', short: '组成', rows: 3, ph: '默写药名即可，不需要写剂量（用「、」分隔）' },
    { k: 'function', name: '功用', short: '功用', rows: 2, ph: '默写功用，可用「，」分隔' },
    { k: 'indication', name: '主治', short: '主治', rows: 3, ph: '默写主治证候与要点' },
    { k: 'roles', name: '君臣佐使', short: '君臣佐使', rows: 0, ph: '' }
  ];
  var ST_ROLES = ['君', '臣', '佐', '使', '佐使'];

  var st = { mode: 'mo', fields: ['composition', 'function', 'indication', 'roles'], sel: {}, order: 'random', setupOpen: {}, entered: false };
  var run = null;
  var guardInstalled = false;

  /* ---------------- 可用性 ---------------- */
  function fieldHas(v, f) {
    if (f === 'composition') return !!(v.compositionRaw && v.compositionRaw.length);
    if (f === 'function') return !!(v.functionRaw && v.functionRaw.length);
    if (f === 'indication') return !!(v.indicationRaw && v.indicationRaw.length);
    if (f === 'roles') return true;    // 没有君臣佐使也能出题（跳过）
    return false;
  }
  function drugOk(f, fields) {
    return fields.some(function (k) { return fieldHas(Z.view(f), k); });
  }
  function chapterList(c) {
    var out = [];
    (c.sections || []).forEach(function (s) {
      (s.formulas || []).forEach(function (name) {
        var m = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === name; })[0];
        if (m) out.push(m);
      });
    });
    return out;
  }
  function allMain() {
    var out = [];
    Z.chapters.forEach(function (c) { out = out.concat(chapterList(c)); });
    return out;
  }
  function selCount() { return Object.keys(st.sel).length; }
  function practiceIds() {
    return Object.keys(st.sel).map(function (id) { return Z.byId[id]; })
      .filter(function (f) { return f && drugOk(f, st.fields); });
  }

  /* ---------------- 练习首页 ---------------- */
  function renderHome(main) {
    UI.header({
      title: '练习',
      sub: '默写 · 选择题',
      actions: [{ icon: 'list', label: '目录', onClick: function () { UI.go('#/catalog'); } }]
    });
    var drafts = (Z.store.drafts || []).slice().sort(function (a, b) {
      return (b.createdAt || b.ts || 0) - (a.createdAt || a.ts || 0);
    });
    var h = [];
    h.push('<div class="card" style="padding:12px 14px;background:#fbf4e6;border-color:#e6d5b3">' +
      '<div class="small" style="color:#7d2c21;line-height:1.7">练习不记成绩，只帮你把方剂背下来。中途退出会自动保存，可同时保留多份练习记录（最多 ' + MAX_DRAFTS + ' 份）。</div></div>');
    h.push('<div class="grid2">' +
      tile('mo', '默写练习', '看方名，默写组成 / 功用 / 主治 / 君臣佐使') +
      tile('tc', '选择题练习', '按比例生成选项，含君臣佐使四小题') +
      '</div>');
    if (drafts.length) {
      h.push('<div class="card mt10" style="padding:12px 13px 4px"><div class="sec-label">未完成的练习（' + drafts.length + '）</div>');
      drafts.forEach(function (rec) {
        h.push('<div class="li" style="padding:10px 0;border-bottom:1px solid var(--line)">' +
          '<div class="li-t"><div class="t">' + (rec.mode === 'mo' ? '默写练习' : '选择题练习') + '</div>' +
          '<div class="s">已答 ' + Z.practiceDone(rec) + ' / ' + Z.practiceTotal(rec) + ' 题 · ' + Z.nowText(rec.ts || rec.createdAt) + '</div></div>' +
          '<button class="btn xs" data-rdel="' + rec.id + '">丢弃</button>' +
          '<button class="btn xs primary" data-resume="' + rec.id + '">继续</button></div>');
      });
      h.push('</div>');
    }
    h.push('<div class="card mt10"><div class="sec-label">练习范围说明</div>' +
      '<div class="small muted">范围可整章、整节，也可精确到每一首正方（附方只作卡片查看）。内容可选：组成、功用、主治、君臣佐使；默认<b>不预选</b>。</div></div>');
    main.innerHTML = h.join('');
    UI.bind(main, '[data-mode]', function (el) { UI.go('#/practice/setup?mode=' + el.getAttribute('data-mode')); });
    UI.bind(main, '[data-resume]', function (el) {
      var id = el.getAttribute('data-resume');
      var rec = (Z.store.drafts || []).filter(function (x) { return x.id === id; })[0];
      if (!rec) { UI.toast('记录不存在'); return; }
      run = rec; UI.go('#/practice/run?id=' + id);
    });
    UI.bind(main, '[data-rdel]', function (el) {
      var id = el.getAttribute('data-rdel');
      UI.confirmDialog('丢弃练习', '将删除这份未完成的练习记录，确定吗？', '丢弃', '取消').then(function (ok) {
        if (!ok) return;
        Z.store.drafts = (Z.store.drafts || []).filter(function (x) { return x.id !== id; });
        if (run && run.id === id) run = null;
        Z.save(true); UI.toast('已丢弃'); renderHome(main);
      });
    });
  }
  function tile(mode, t, s) {
    return '<div class="tile" data-mode="' + mode + '"><div class="tt">' + t + '</div><div class="ts">' + s +
      '</div><div class="ti">' + (mode === 'mo' ? '✎' : '☑') + '</div></div>';
  }

  /* ---------------- 练习设置 ---------------- */
  function renderSetup(main, p, q) {
    st.mode = (q.mode === 'tc') ? 'tc' : 'mo';
    UI.header({ title: '练习设置', sub: st.mode === 'tc' ? '选择题' : '默写', back: true });
    var h = [];
    h.push('<div class="card"><div class="sec-label">练习形式</div><div class="seg" id="seg-mode">' +
      '<button data-m="mo" class="' + (st.mode === 'mo' ? 'on' : '') + '">默写</button>' +
      '<button data-m="tc" class="' + (st.mode === 'tc' ? 'on' : '') + '">选择题</button></div></div>');
    h.push('<div class="card"><div class="sec-label">练习内容</div><div class="tag-row" id="fld-row">' +
      FIELD_DEF.map(function (f) {
        var on = st.fields.indexOf(f.k) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" data-fld="' + f.k + '" style="height:32px;padding:0 14px;font-size:14px">' +
          (on ? '✓ ' : '') + f.name + '</button>';
      }).join('') + '</div><div class="tiny dim mt6">至少选一项；没有君臣佐使结构的方剂也能出题（会给出跳过按钮）</div></div>');
    h.push('<div class="card"><div class="row between mb6"><div class="sec-label" style="margin:0">方剂范围</div>' +
      '<div class="small dim">已选 <b id="sel-n">' + selCount() + '</b> 首</div></div>' +
      '<div class="row wrap" style="gap:8px;margin-bottom:10px">' +
      '<button class="btn xs" id="sel-all">全部正方</button>' +
      '<button class="btn xs" id="sel-none">清空</button>' +
      '</div></div>');
    var chapHtml = [];
    Z.chapters.forEach(function (c, ci) {
      var list = chapterList(c);
      var n = list.filter(function (f) { return st.sel[f.id]; }).length;
      var open = !!st.setupOpen[ci];
      chapHtml.push('<div class="chap' + (open ? ' open' : '') + '" data-chap="' + ci + '">' +
        '<div class="chap-hd"><label class="ck" style="margin-left:2px"><input type="checkbox" data-chk="' + ci + '"' +
        (n === list.length && list.length ? ' checked' : '') + '></label>' +
        '<span class="cn">' + esc(c.no) + '　' + esc(c.name) + '</span>' +
        '<span class="chip gray tiny">' + n + '/' + list.length + '</span>' +
        '<span class="caret">' + icon('right') + '</span></div>' +
        '<div class="chap-bd">' + (c.sections || []).map(function (s, si) {
          var items = [], list2 = [];
          (s.formulas || []).forEach(function (name) {
            var m = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === name; })[0];
            if (m) { items.push(selRow(m)); list2.push(m); }
          });
          if (!items.length) return '';
          var sn = list2.filter(function (f) { return st.sel[f.id]; }).length;
          var secHead = (s.name || list2.length)
            ? '<div class="sec-t"><label class="ck" style="margin-right:6px"><input type="checkbox" data-sec="' + ci + ':' + si + '"' +
              (sn === list2.length && list2.length ? ' checked' : '') + '></label>' + esc(s.name || '未分节') +
              ' <span class="tiny dim">' + sn + '/' + list2.length + '</span></div>'
            : '';
          return '<div class="sec">' + secHead + items.join('') + '</div>';
        }).join('') + '</div></div>');
    });
    h.push(chapHtml.join(''));
    h.push('<div class="card"><div class="sec-label">出题顺序</div><div class="seg" id="seg-order">' +
      '<button data-o="random" class="' + (st.order === 'random' ? 'on' : '') + '">随机</button>' +
      '<button data-o="seq" class="' + (st.order === 'seq' ? 'on' : '') + '">按目录顺序</button></div></div>');
    main.innerHTML = h.join('');

    var oldBar = document.getElementById('fbar'); if (oldBar) oldBar.remove();
    var bar = document.createElement('div');
    bar.className = 'fbar'; bar.id = 'fbar';
    bar.innerHTML = '<div class="grow small dim" id="start-hint"></div>' +
      '<button class="btn primary" id="btn-start">开始练习</button>';
    document.getElementById('app').appendChild(bar);
    main.className = 'has-bar';

    function refreshCount() {
      document.getElementById('sel-n').textContent = selCount();
      // 首屏同步章级半选状态
      Z.chapters.forEach(function (c, i2) {
        var el2 = main.querySelector('[data-chap="' + i2 + '"]');
        if (!el2) return;
        var list2 = chapterList(c);
        var n2 = list2.filter(function (f) { return st.sel[f.id]; }).length;
        var hc2 = el2.querySelector('.chap-hd input[type=checkbox]');
        if (hc2) { hc2.checked = (n2 === list2.length && n2 > 0); hc2.indeterminate = (n2 > 0 && n2 < list2.length); }
        el2.querySelectorAll('[data-sec]').forEach(function (ck4) {
          var p4 = ck4.getAttribute('data-sec').split(':');
          if (+p4[0] !== i2) return;
          var sec4 = (c.sections || [])[+p4[1]];
          if (!sec4) return;
          var l5 = [];
          (sec4.formulas || []).forEach(function (nm2) {
            var mm2 = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === nm2; })[0];
            if (mm2) l5.push(mm2);
          });
          var on2 = l5.length > 0 && l5.every(function (f) { return st.sel[f.id]; });
          ck4.checked = on2;
          ck4.indeterminate = !on2 && l5.some(function (f) { return st.sel[f.id]; });
        });
      });
      var ids = practiceIds();
      var per = st.mode === 'mo' ? ids.length : ids.length * st.fields.length;
      var hint = document.getElementById('start-hint');
      hint.innerHTML = ids.length ? '本次共 <b>' + per + '</b> 题' : '请先选择方剂范围';
      document.getElementById('btn-start').disabled = !ids.length;
    }
    refreshCount();

    UI.bind(main, '#seg-mode button', function (el) {
      st.mode = el.getAttribute('data-m');
      UI.go('#/practice/setup?mode=' + st.mode);
    });
    UI.bind(main, '#seg-order button', function (el) {
      st.order = el.getAttribute('data-o');
      main.querySelectorAll('#seg-order button').forEach(function (b) { b.classList.toggle('on', b === el); });
    });
    UI.bind(main, '[data-fld]', function (el) {
      var k = el.getAttribute('data-fld');
      var i = st.fields.indexOf(k);
      if (i >= 0) { if (st.fields.length === 1) { UI.toast('至少要保留一项练习内容'); return; } st.fields.splice(i, 1); }
      else st.fields.push(k);
      st.fields.sort(function (a, b) { return ['composition', 'function', 'indication', 'roles'].indexOf(a) - ['composition', 'function', 'indication', 'roles'].indexOf(b); });
      renderSetup(main, [], { mode: st.mode });
    });
    main.querySelector('#sel-all').onclick = function () {
      st.sel = {};
      allMain().forEach(function (f) { st.sel[f.id] = 1; });
      renderSetup(main, [], { mode: st.mode });
    };
    main.querySelector('#sel-none').onclick = function () {
      st.sel = {};
      renderSetup(main, [], { mode: st.mode });
    };
    main.querySelectorAll('[data-chap]').forEach(function (el) {
      var ci = el.getAttribute('data-chap');
      el.querySelector('.chap-hd').onclick = function (e) {
        if (e.target.closest && e.target.closest('.ck')) return;
        st.setupOpen[ci] = !st.setupOpen[ci];
        el.classList.toggle('open', !!st.setupOpen[ci]);
      };
    });
    main.querySelectorAll('[data-sec]').forEach(function (ck2) {
      ck2.onclick = function (e) {
        e.stopPropagation();
        var parts = ck2.getAttribute('data-sec').split(':');
        var c2 = Z.chapters[+parts[0]], sec2 = (c2.sections || [])[+parts[1]];
        if (!sec2) return;
        var l3 = [];
        (sec2.formulas || []).forEach(function (name) {
          var m = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === name; })[0];
          if (m) l3.push(m);
        });
        var allOn = l3.length > 0 && l3.every(function (f) { return st.sel[f.id]; });
        l3.forEach(function (f) { if (allOn) delete st.sel[f.id]; else st.sel[f.id] = 1; });
        renderSetup(main, [], { mode: st.mode });
      };
    });
    main.querySelectorAll('[data-chk]').forEach(function (ck) {
      ck.onclick = function (e) {
        e.stopPropagation();
        var ci = +ck.getAttribute('data-chk');
        var list = chapterList(Z.chapters[ci]);
        var allOn = list.every(function (f) { return st.sel[f.id]; });
        list.forEach(function (f) { if (allOn) delete st.sel[f.id]; else st.sel[f.id] = 1; });
        renderSetup(main, [], { mode: st.mode });
      };
    });
    function setSel(id, on) { if (on) st.sel[id] = 1; else delete st.sel[id]; }
    function syncSelUI(id) {
      var row = main.querySelector('[data-dsel="' + id + '"]');
      if (row) { var ck0 = row.querySelector('input[type=checkbox]'); if (ck0) ck0.checked = !!st.sel[id]; }
      refreshCount();
      Z.chapters.forEach(function (c, i) {
        var el = main.querySelector('[data-chap="' + i + '"]');
        if (!el) return;
        var list = chapterList(c);
        var has = false;
        for (var k = 0; k < list.length; k++) { if (list[k].id === id) { has = true; break; } }
        if (!has) return;
        var n = 0; list.forEach(function (f) { if (st.sel[f.id]) n++; });
        el.querySelectorAll('[data-sec]').forEach(function (ck3) {
          var pr = ck3.getAttribute('data-sec').split(':');
          if (+pr[0] !== i) return;
          var sec3 = (c.sections || [])[+pr[1]];
          if (!sec3) return;
          var l4 = [];
          (sec3.formulas || []).forEach(function (nm) {
            var mm = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === nm; })[0];
            if (mm) l4.push(mm);
          });
          var on = l4.length > 0 && l4.every(function (f) { return st.sel[f.id]; });
          ck3.checked = on;
          ck3.indeterminate = !on && l4.some(function (f) { return st.sel[f.id]; });
        });
        var chip = el.querySelector('.chap-hd .chip');
        if (chip) chip.textContent = n + '/' + list.length;
        var hc = el.querySelector('.chap-hd input[type=checkbox]');
        if (hc) { hc.checked = (n === list.length && n > 0); hc.indeterminate = (n > 0 && n < list.length); }
      });
    }
    main.querySelectorAll('[data-dsel] input[type=checkbox]').forEach(function (ck) {
      ck.onchange = function () {
        var row = ck.closest('[data-dsel]');
        if (!row) return;
        var id = row.getAttribute('data-dsel');
        setSel(id, ck.checked);
        syncSelUI(id);
      };
    });
    main.querySelectorAll('[data-dsel]').forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.closest && e.target.closest('.ck')) return;
        var id = el.getAttribute('data-dsel');
        setSel(id, !st.sel[id]);
        syncSelUI(id);
      };
    });
    document.getElementById('btn-start').onclick = function () {
      var ids = practiceIds();
      if (!ids.length) { UI.toast('没有可练习的方剂'); return; }
      startPractice(st.mode, st.fields.slice(), ids);
    };

    function selRow(f) {
      var on = !!st.sel[f.id];
      return '<div class="dr" data-dsel="' + f.id + '">' +
        '<label class="ck"><input type="checkbox"' + (on ? ' checked' : '') + '></label>' +
        '<span class="nm">' + esc(f.name) + '</span></div>';
    }
  }

  /* ---------------- 开始 / 保存 ---------------- */
  function startPractice(mode, fields, formulas) {
    var ids = formulas.map(function (f) { return f.id; });
    if (st.order === 'random') ids = Z.shuffle(ids);
    var rec = {
      id: 'dr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      mode: mode, fields: fields, order: ids, i: 0,
      ans: {}, submitted: {}, qs: [], ts: Date.now(), createdAt: Date.now()
    };
    if (!Array.isArray(Z.store.drafts)) Z.store.drafts = [];
    Z.store.drafts.unshift(rec);
    if (Z.store.drafts.length > MAX_DRAFTS) Z.store.drafts.length = MAX_DRAFTS;
    Z.save(true);
    run = rec;
    UI.go('#/practice/run?id=' + rec.id);
  }
  function saveRun() {
    if (!run) return;
    run.ts = Date.now();
    if (!Array.isArray(Z.store.drafts)) Z.store.drafts = [];
    var idx = -1;
    Z.store.drafts.forEach(function (x, k) { if (x.id === run.id) idx = k; });
    if (idx >= 0) Z.store.drafts[idx] = run; else Z.store.drafts.unshift(run);
    Z.save(true);
  }
  function totalCount() { return Z.practiceTotal(run); }

  /* ---------------- 运行页 ---------------- */
  function renderRun(main, p, q) {
    var id = q.id || '';
    if (!run || run.id !== id) {
      var list = Z.store.drafts || [];
      var rec = id ? list.filter(function (x) { return x.id === id; })[0] : null;
      if (!rec) { UI.toast('没有进行中的练习'); UI.go('#/practice'); return; }
      run = rec;
    }
    var mode = run.mode;
    UI.header({
      title: mode === 'mo' ? '默写练习' : '选择题练习',
      sub: '自动保存',
      back: true,
      actions: [{ text: '结束', label: '结束练习', onClick: function () { requestExit(); } }]
    });
    var hb = document.getElementById('hd-back');
    if (hb) hb.onclick = function () { requestExit(); };
    if (mode === 'mo') renderMoRun(main); else renderTcRun(main);
    installGuard();
  }
  function progressHTML(done, total) {
    var pct = total ? Math.round(done / total * 100) : 0;
    return '<div class="qhead"><div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<div class="pbar-txt">' + done + ' / ' + total + '</div></div>';
  }

  /* ---------- 默写 ---------- */
  function renderMoRun(main) {
    if (!run) return;
    var total = run.order.length;
    if (run.i >= total) { finishPractice(); return; }
    var fid = run.order[run.i];
    var f = Z.byId[fid];
    if (!f) { run.i++; saveRun(); renderMoRun(main); return; }
    var v = Z.view(f);
    var ans = run.ans[fid] || (run.ans[fid] = { roles: {} });
    var submitted = !!run.submitted[fid];
    var roles = v.analysis.roles || [];
    var roleNames = roles.map(function (r) { return r.role; });

    var h = [progressHTML(Object.keys(run.submitted).length, total)];
    h.push('<div class="qname">' + esc(f.name) + '</div>');
    h.push('<div class="qmeta">第 ' + (run.i + 1) + ' / ' + total + ' 题 · ' +
      (f.kind === 'attach' ? '附方 · ' : '') + esc(f.chapterName) + '</div>');
    h.push('<div class="card">');
    run.fields.forEach(function (fk) {
      if (fk === 'roles') return;
      var fd = FIELD_DEF.filter(function (x) { return x.k === fk; })[0];
      if (!fieldHas(v, fk)) return;
      h.push('<div class="field"><label>' + fd.name + '</label>' +
        '<textarea class="input" data-ans="' + fk + '" rows="' + fd.rows + '" placeholder="' + fd.ph + '"' +
        (submitted ? ' readonly' : '') + '>' + esc(ans[fk] || '') + '</textarea></div>');
    });
    if (run.fields.indexOf('roles') >= 0) {
      if (!roleNames.length) {
        h.push('<div class="fx-note" style="margin-top:6px">教材中没有「' + esc(f.name) + '」的君臣佐使结构，请自行跳过。</div>');
        if (!submitted) h.push('<button class="btn sm mt10" id="btn-skip-roles">跳过这首方（视作完成）</button>');
        else h.push('<div class="tiny dim mt6">已跳过君臣佐使</div>');
      } else {
        h.push('<div class="sec-label" style="margin-top:12px">君臣佐使结构</div>');
        roleNames.forEach(function (r) {
          h.push('<div class="field"><label>' + esc(r) + '药</label>' +
            '<textarea class="input" data-ans="role:' + esc(r) + '" rows="2" placeholder="默写' + esc(r) + '药（药名，可多味）" ' +
            (submitted ? 'readonly' : '') + '>' + esc((ans.roles && ans.roles[r]) || '') + '</textarea></div>');
        });
      }
    }
    h.push('</div>');
    if (!submitted) {
      h.push('<button class="btn primary block mt10" id="btn-submit">提交，对照答案</button>');
    } else {
      h.push('<div class="card" style="background:#f4f8f2;border-color:#bfd8c0">' +
        '<div class="sec-label" style="color:#3f7d4e">正确答案</div>');
      run.fields.forEach(function (fk) {
        if (!fieldHas(v, fk)) return;
        if (fk === 'roles') {
          if (!roleNames.length) {
            h.push('<div style="margin-bottom:10px"><div class="b small" style="color:#3f7d4e">君臣佐使</div>' +
              '<div class="small muted">教材中没有该方的君臣佐使结构（已跳过）</div></div>');
          } else {
            h.push('<div style="margin-bottom:10px"><div class="b small" style="color:#3f7d4e">君臣佐使</div>' +
              roles.map(function (r) {
                return '<div class="fx-line"><b>' + esc(r.role) + '</b>：' + (r.entries || []).map(function (en) {
                  return esc((en.drugs || []).join('、'));
                }).join('、') + '</div>';
              }).join('') + '</div>');
          }
          return;
        }
        h.push('<div style="margin-bottom:10px"><div class="b small" style="color:#3f7d4e">' +
          FIELD_DEF.filter(function (x) { return x.k === fk; })[0].name + '</div>' + answerHTML(v, fk) + '</div>');
      });
      h.push('</div>');
      h.push('<div class="row mt10"><button class="btn" id="btn-prev"' + (run.i <= 0 ? ' disabled' : '') + '>' +
        icon('left') + '上一题</button>' +
        '<button class="btn primary grow" id="btn-next">' + (run.i >= total - 1 ? '完成练习' : '下一题') + '</button></div>');
    }
    main.innerHTML = h.join('');

    if (!submitted) {
      main.querySelectorAll('[data-ans]').forEach(function (ta) {
        ta.oninput = function () {
          var k = ta.getAttribute('data-ans');
          if (k.indexOf('role:') === 0) { ans.roles = ans.roles || {}; ans.roles[k.slice(5)] = ta.value; }
          else ans[k] = ta.value;
          saveRun();
        };
      });
      var skipBtn = main.querySelector('#btn-skip-roles');
      if (skipBtn) skipBtn.onclick = function () {
        run.submitted[fid] = 1;
        ans.rolesSkipped = 1;
        saveRun(); renderMoRun(main); window.scrollTo(0, 0);
      };
      main.querySelector('#btn-submit').onclick = function () {
        main.querySelectorAll('[data-ans]').forEach(function (ta) {
          var k = ta.getAttribute('data-ans');
          if (k.indexOf('role:') === 0) { ans.roles = ans.roles || {}; ans.roles[k.slice(5)] = ta.value; }
          else ans[k] = ta.value;
        });
        run.submitted[fid] = 1; saveRun(); renderMoRun(main); window.scrollTo(0, 0);
      };
    } else {
      main.querySelector('#btn-next').onclick = function () {
        if (run.i >= total - 1) { finishPractice(); return; }
        run.i++; saveRun(); renderMoRun(main); window.scrollTo(0, 0);
      };
      var pv = main.querySelector('#btn-prev');
      if (pv) pv.onclick = function () { if (run.i > 0) { run.i--; saveRun(); renderMoRun(main); window.scrollTo(0, 0); } };
    }
  }

  function answerHTML(v, fk) {
    if (fk === 'composition') {
      var names = v.ingredients || [];
      return '<div class="eff-wrap">' + names.map(function (n) { return '<span class="eff">' + esc(n) + '</span>'; }).join('') + '</div>' +
        '<div class="tiny dim mt6">（按教材组成顺序，剂量略）</div>';
    }
    if (fk === 'function') {
      return '<div class="eff-wrap">' + (v.functions || []).map(function (e) { return '<span class="eff">' + esc(e) + '</span>'; }).join('') + '</div>';
    }
    if (fk === 'indication') {
      return v.indication && v.indication.length
        ? v.indication.map(function (x, i) { return '<div class="fx-ind"><b>' + (i + 1) + '.</b> ' + esc(x) + '</div>'; }).join('')
        : '<div class="fx-ind">' + esc(v.indicationRaw) + '</div>';
    }
    return '';
  }

  /* ---------- 选择题 ---------- */
  function allDrugNames() {
    var out = [];
    Z.formulas.forEach(function (f) { (f.ingredients || []).forEach(function (x) { out.push(x.name); }); });
    return Z.uniqBy(out, function (x) { return x; });
  }
  function allFuncs() {
    var out = [];
    Z.formulas.forEach(function (f) { (f.functions || []).forEach(function (x) { out.push(x); }); });
    return Z.uniqBy(out, function (x) { return x; });
  }
  function indTitle(v) {
    var t = v.indication && v.indication.length ? v.indication[0] : (v.indicationRaw || '');
    return String(t).split('。')[0].slice(0, 24);
  }
  function allIndTitles() {
    var out = [];
    Z.formulas.forEach(function (f) { if (f.kind !== 'main') return; var t = indTitle(Z.view(f)); if (t) out.push(t); });
    return Z.uniqBy(out, function (x) { return x; });
  }
  function poolOf(kind, f) {
    if (kind === 'composition') return allDrugNames();
    if (kind === 'function') return allFuncs();
    if (kind === 'indication') return allIndTitles();
    return allDrugNames();
  }
  function pickDecoys(kind, f, correct, n) {
    var pool = poolOf(kind, f);
    var cs = Object.create(null);
    correct.forEach(function (x) { cs[x] = 1; });
    function related(x) {
      for (var i = 0; i < correct.length; i++) {
        var c = correct[i];
        if (!c || !x) continue;
        if (x.indexOf(c) >= 0 || c.indexOf(x) >= 0) return true;   // 甘草 / 炙甘草 这类互斥
        if (Z.normDrug && Z.normDrug(x) && Z.normDrug(x) === Z.normDrug(c)) return true;  // 白芍/芍药、生地/生地黄 等别名族
      }
      return false;
    }
    var cand = pool.filter(function (x) { return !cs[x] && !related(x); });
    // 组成类干扰项优先取「同章其他方」的组成药，看起来更像考题
    var prefer = [];
    if (kind === 'composition') {
      (Z.chapters[f.chapter] && Z.chapters[f.chapter].sections || []).forEach(function (s) {
        (s.formulas || []).forEach(function (name) {
          var m = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === name; })[0];
          if (m && m.id !== f.id) (m.ingredients || []).forEach(function (x) { prefer.push(x.name); });
        });
      });
      prefer = prefer.filter(function (x) { return !cs[x] && !related(x); });
    }
    var first = Z.uniqBy(Z.shuffle(prefer), function (x) { return x; }).slice(0, n);
    var rest = Z.uniqBy(Z.shuffle(cand), function (x) { return x; }).filter(function (x) { return first.indexOf(x) < 0; });
    return first.concat(rest).slice(0, n);
  }
  function buildQuestion(fid, fk) {
    var f = Z.byId[fid], v = Z.view(f);
    if (fk === 'roles') {
      var roles = v.analysis.roles || [];
      if (!roles.length) return { fid: fid, field: 'roles', skip: true, note: '教材中没有「' + f.name + '」的君臣佐使结构，请自行跳过', subs: [], done: false };
      var subs = roles.map(function (r) {
        var correct = Z.uniqBy([].concat.apply([], (r.entries || []).map(function (en) { return en.drugs || []; })), function (x) { return x; });
        var nDecoy = Math.min(4, Math.max(2, Math.round((correct.length || 1) * 0.9)));
        var decoys = pickDecoys('composition', f, correct, nDecoy);
        var opts = correct.map(function (d) { return { t: d, ok: true }; })
          .concat(decoys.map(function (d) { return { t: d, ok: false }; }));
        return { role: r.role, opts: Z.shuffle(opts), picked: [], done: false };
      });
      return { fid: fid, field: 'roles', subs: subs, done: false };
    }
    var correct = [], single = false;
    if (fk === 'composition') {
      correct = Z.uniqBy(v.ingredients || [], function (x) { return x; }).slice(0, 8);
    } else if (fk === 'function') {
      correct = Z.uniqBy(v.functions || [], function (x) { return x; }).slice(0, 6);
    } else if (fk === 'indication') {
      correct = [indTitle(v)];
      single = true;
    }
    if (!correct.length) return null;
    var nDecoy;
    if (single) nDecoy = 4;
    else nDecoy = Math.min(6, Math.max(2, Math.round(correct.length * (fk === 'composition' ? 0.55 : 0.7))));
    if (correct.length + nDecoy > 12) nDecoy = Math.max(2, 12 - correct.length);
    var decoys2 = pickDecoys(fk, f, correct, nDecoy);
    var opts2 = correct.map(function (t) { return { t: t, ok: true }; })
      .concat(decoys2.map(function (t) { return { t: t, ok: false }; }));
    return { fid: fid, field: fk, opts: Z.shuffle(opts2), picked: [], done: false, single: single };
  }
  function ensureQuestion(idx) {
    if (!run || run.mode !== 'tc') return null;
    while (run.qs.length <= idx) {
      var k = run.qs.length;
      var fid = run.order[Math.floor(k / run.fields.length)];
      var fk = run.fields[k % run.fields.length];
      var q = buildQuestion(fid, fk);
      if (!q) run.qs.push({ fid: fid, field: fk, opts: [], picked: [], done: true, skipped: true });
      else run.qs.push(q);
    }
    return run.qs[idx];
  }

  function renderTcRun(main) {
    if (!run) return;
    var total = totalCount();
    var q = ensureQuestion(run.i);
    while (q && q.skipped) {
      run.i++;
      if (run.i >= total) { finishPractice(); return; }
      q = ensureQuestion(run.i);
    }
    var f = Z.byId[q.fid];
    if (!f) { run.i++; saveRun(); renderTcRun(main); return; }
    var v = Z.view(f);
    var fd = FIELD_DEF.filter(function (x) { return x.k === q.field; })[0];
    var doneCount = run.qs.filter(function (x) { return x.done; }).length;
    var h = [progressHTML(doneCount, total)];
    h.push('<div class="qname">' + esc(f.name) + '</div>');
    if (q.field === 'roles') {
      h.push('<div class="qmeta">第 ' + (run.i + 1) + ' / ' + total + ' 题 · 君臣佐使' +
        (q.skip ? '（教材未载，可跳过）' : '（' + ((q.subs || []).length) + ' 小题）') + '</div>');
    } else {
      h.push('<div class="qmeta">第 ' + (run.i + 1) + ' / ' + total + ' 题 · 请选出它的「' + (fd ? fd.name : q.field) + '」' +
        (q.single ? '' : '正确内容（可多选）') + '</div>');
    }

    if (q.skip) {
      h.push('<div class="card"><div class="fx-note">' + esc(q.note) + '</div></div>');
      if (!q.done) h.push('<button class="btn primary block mt10" id="btn-submit">跳过这首方（视作完成）</button>');
      else {
        h.push('<div class="ansbox ok mt10"><div class="al">已跳过</div>教材中没有该方的君臣佐使结构。</div>');
        h.push('<div class="row mt10"><button class="btn" id="btn-prev"' + (run.i <= 0 ? ' disabled' : '') + '>' + icon('left') + '上一题</button>' +
          '<button class="btn primary grow" id="btn-next">' + (run.i >= total - 1 ? '完成练习' : '下一题') + '</button></div>');
      }
    } else if (q.field === 'roles') {
      h.push('<div class="card" id="roles-wrap">');
      q.subs.forEach(function (sub, si) {
        h.push('<div class="tc-sub"><div class="tc-sub-hd">' + (si + 1) + '. ' + esc(sub.role) + '药 是哪些？（可多选）</div><div class="tag-row">');
        sub.opts.forEach(function (o, oi) {
          var cls = '';
          if (sub.done) {
            if (o.ok) cls = ' right';
            else if (sub.picked.indexOf(oi) >= 0) cls = ' wrong';
            cls += ' lock';
          } else if (sub.picked.indexOf(oi) >= 0) cls = ' sel';
          h.push('<button class="opt-chip' + cls + '" data-sub="' + si + '" data-oi="' + oi + '">' + esc(o.t) + '</button>');
        });
        h.push('</div>');
        if (sub.done) {
          h.push('<div class="tiny mt6" style="color:#3f7d4e">正确：' + sub.opts.filter(function (o) { return o.ok; }).map(function (o) { return esc(o.t); }).join('、') + '</div>');
        }
        h.push('</div>');
      });
      h.push('</div>');
      if (!q.done) h.push('<button class="btn primary block mt10" id="btn-submit">提交答案</button>');
      else h.push('<div class="row mt10"><button class="btn" id="btn-prev"' + (run.i <= 0 ? ' disabled' : '') + '>' + icon('left') + '上一题</button>' +
        '<button class="btn primary grow" id="btn-next">' + (run.i >= total - 1 ? '完成练习' : '下一题') + '</button></div>');
    } else {
      h.push('<div id="opts">');
      var letters = 'ABCDEFGHIJKLMN';
      q.opts.forEach(function (o, i) {
        var cls = '';
        if (q.done) {
          if (o.ok) cls = ' right';
          else if (q.picked.indexOf(i) >= 0) cls = ' wrong';
          cls += ' lock';
        } else if (q.picked.indexOf(i) >= 0) cls = ' sel';
        h.push('<div class="opt' + cls + '" data-oi="' + i + '"><span class="oi">' + letters[i] + '</span>' +
          '<span class="ot">' + esc(o.t) + '</span></div>');
      });
      h.push('</div>');
      if (q.done) {
        h.push('<div class="ansbox ok"><div class="al">正确答案</div><div class="sec-body">' +
          q.opts.filter(function (o) { return o.ok; }).map(function (o) { return esc(o.t); }).join('；') + '</div></div>');
        if (q.field === 'indication') {
          h.push('<div class="tiny dim mt6">完整主治：' + esc(v.indicationRaw) + '</div>');
        }
        h.push('<div class="row mt10"><button class="btn" id="btn-prev"' + (run.i <= 0 ? ' disabled' : '') + '>' + icon('left') + '上一题</button>' +
          '<button class="btn primary grow" id="btn-next">' + (run.i >= total - 1 ? '完成练习' : '下一题') + '</button></div>');
      } else {
        h.push('<button class="btn primary block mt10" id="btn-submit">提交答案</button>');
      }
    }
    main.innerHTML = h.join('');

    if (!q.done) {
      if (q.skip) {
        var skipBtn = main.querySelector('#btn-submit');
        if (skipBtn) skipBtn.onclick = function () {
          q.done = true; saveRun(); renderTcRun(main); window.scrollTo(0, 0);
        };
        return;
      }
      main.querySelectorAll('[data-oi]').forEach(function (el) {
        el.onclick = function () {
          var i = +el.getAttribute('data-oi');
          if (q.field === 'roles') {
            var sub = q.subs[+el.getAttribute('data-sub')];
            var k = sub.picked.indexOf(i);
            if (k >= 0) sub.picked.splice(k, 1); else sub.picked.push(i);
            el.classList.toggle('sel', sub.picked.indexOf(i) >= 0);
          } else {
            if (q.single) q.picked = (q.picked[0] === i) ? [] : [i];
            else {
              var k2 = q.picked.indexOf(i);
              if (k2 >= 0) q.picked.splice(k2, 1); else q.picked.push(i);
            }
            main.querySelectorAll('[data-oi]').forEach(function (e2) {
              e2.classList.toggle('sel', q.picked.indexOf(+e2.getAttribute('data-oi')) >= 0);
            });
          }
          saveRun();
        };
      });
      main.querySelector('#btn-submit').onclick = function () {
        if (q.field === 'roles') {
          var any = false;
          q.subs.forEach(function (s) { if (s.picked.length) any = true; });
          if (!any) { UI.toast('先选几味药'); return; }
          q.subs.forEach(function (s) { s.done = true; });
        } else {
          if (!q.picked.length) { UI.toast('先选一个选项'); return; }
        }
        q.done = true; saveRun(); renderTcRun(main); window.scrollTo(0, 0);
      };
    } else {
      main.querySelector('#btn-next').onclick = function () {
        if (run.i >= total - 1) { finishPractice(); return; }
        run.i++; saveRun(); renderTcRun(main); window.scrollTo(0, 0);
      };
      var pv = main.querySelector('#btn-prev');
      if (pv) pv.onclick = function () { if (run.i > 0) { run.i--; saveRun(); renderTcRun(main); window.scrollTo(0, 0); } };
    }
  }

  /* ---------------- 结束 / 退出 ---------------- */
  function requestExit() {
    if (!run) { UI.go('#/practice'); return; }
    var total = totalCount(), done = Z.practiceDone(run);
    saveRun();
    UI.dialog({
      title: '结束练习？',
      html: '已作答 <b>' + done + '</b> / ' + total + ' 题。<br>退出后会<b>自动保存</b>你已经作答的部分（最多保存 <b>' + MAX_DRAFTS + '</b> 份）。' +
        '<br>保存的练习记录都能在「练习」页面找到，随时继续。',
      buttons: [{ text: '继续练习', value: false }, { text: '结束并保存', value: true, primary: true }]
    }).then(function (ok) {
      if (!ok) return;
      saveRun(); run = null;
      location.replace('#/practice');
    });
  }
  function finishPractice() {
    if (!run) { location.replace('#/practice'); return; }
    var id = run.id;
    Z.store.drafts = (Z.store.drafts || []).filter(function (x) { return x.id !== id; });
    Z.save(true); run = null;
    UI.dialog({
      title: '练习完成',
      text: '本次练习已全部过完。继续保持～',
      buttons: [{ text: '返回练习页', value: true, primary: true }]
    }).then(function () { location.replace('#/practice'); });
  }
  function confirmLeave(after) {
    if (!run) { after && after(); return; }
    saveRun();
    UI.dialog({
      title: '退出练习？',
      html: '退出后会<b>自动保存</b>已回答的内容（最多保存 <b>' + MAX_DRAFTS + '</b> 份）。<br>保存的练习记录都能在「练习」页面找到，随时继续。',
      buttons: [{ text: '继续练习', value: false }, { text: '退出', value: true, primary: true }]
    }).then(function (ok) {
      if (!ok) return;
      saveRun(); run = null; after && after();
    });
  }
  function installGuard() {
    if (guardInstalled) return;
    guardInstalled = true;
    document.addEventListener('click', function (e) {
      if (!run) return;
      var a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.indexOf('#/practice/run') === 0) return;
      e.preventDefault(); e.stopPropagation();
      confirmLeave(function () { location.replace(href); });
    }, true);
    window.addEventListener('beforeunload', function () { saveRun(); });
  }
  function beforeRoute(h) {
    if (!run) return true;
    var m = /^#\/practice\/run\?(.*)$/.exec(h || '');
    if (m) {
      var qs = {};
      m[1].split('&').forEach(function (kv) { var p2 = kv.split('='); qs[decodeURIComponent(p2[0])] = decodeURIComponent(p2[1] || ''); });
      if (qs.id === run.id) return true;
    }
    try { history.replaceState(null, '', '#/practice/run?id=' + run.id); } catch (e) { }
    requestExit();
    return false;
  }
  window.appBack = function () {
    if (UI.dialogOpen()) { UI.closeDialog(false); return true; }
    if (run) { requestExit(); return true; }
    var h = location.hash || '#/home';
    if (h.indexOf('#/card/') === 0) { UI.replace('#/catalog'); return true; }
    var roots = ['#/home', '#/catalog', '#/practice', '#/fav', '#/me', ''];
    if (roots.indexOf(h) >= 0) return false;
    history.back();
    return true;
  };
  window.FJ_PRACTICE = {
    inRun: function () { return !!run; },
    saveRun: saveRun,
    beforeRoute: beforeRoute,
    getRun: function () { return run; }
  };

  UI.VIEWS.practice = function (main, p) {
    var q = UI.parseHash().q;
    if (p[0] === 'setup') {
      if (st.entered !== true) { st.sel = {}; st.entered = true; }
      return renderSetup(main, p, q);
    }
    st.entered = false;
    if (p[0] === 'run') return renderRun(main, p, q);
    return renderHome(main);
  };
})();
