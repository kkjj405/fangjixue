/* 方剂学 · 方剂目录 / 卡片 / 笔记 / 收藏 / 编辑 / 隐藏 */
(function () {
  'use strict';
  var Z = window.FJ, UI = window.ZY_UI;
  var esc = Z.esc, icon = UI.icon;

  /* =================================================================
   *  目录
   * ================================================================= */
  var catState = { manage: false, sel: {}, open: {}, kw: '' };
  (Z.chapters || []).slice(0, 2).forEach(function (c, i) { catState.open[i] = true; });

  function selCount() { return Object.keys(catState.sel).length; }
  function clearSel() { catState.sel = {}; }

  function formulaRow(f, manage) {
    var hid = Z.isHidden(f.id);
    var flags = [];
    if (hid) flags.push('<span class="flag" title="已隐藏">⊘</span>');
    if (Z.isFav(f.id)) flags.push('<span class="flag" style="color:#b8892f">★</span>');
    if (Z.note(f.id)) flags.push('<span class="flag" style="color:#3b6ea5">✎</span>');
    if (Object.keys(Z.store.edits[f.id] || {}).length) flags.push('<span class="flag" title="已修改">✐</span>');
    return '<div class="dr' + (f.kind === 'attach' ? ' attach' : '') + (hid ? ' hid' : '') +
      (catState.sel[f.id] ? ' sel' : '') + '" data-dr="' + f.id + '">' +
      (manage ? '<label class="ck"><input type="checkbox" data-ck="' + f.id + '"' + (catState.sel[f.id] ? ' checked' : '') + '></label>' : '') +
      '<span class="nm">' + esc(f.name) + '</span>' +
      (f.kind === 'attach' ? '<span class="chip gray tiny" style="height:19px;padding:0 6px">附</span>' : '') +
      '<span class="flags">' + flags.join('') + '</span></div>';
  }

  function chapterHTML(c, ci) {
    var rows = [];
    (c.sections || []).forEach(function (sec) {
      var items = [];
      (sec.formulas || []).forEach(function (name) {
        var m = Z.formulas.filter(function (x) { return x.kind === 'main' && x.name === name; })[0];
        if (!m) return;
        if (catState.kw && m.name.indexOf(catState.kw) < 0) {
          var hitChild = (m.attached || []).some(function (aid) {
            return Z.byId[aid] && Z.byId[aid].name.indexOf(catState.kw) >= 0;
          });
          if (!hitChild) return;
        }
        items.push(formulaRow(m, catState.manage));
        (m.attached || []).forEach(function (aid) {
          var ad = Z.byId[aid];
          if (!ad) return;
          if (catState.kw && ad.name.indexOf(catState.kw) < 0 && m.name.indexOf(catState.kw) < 0) return;
          items.push(formulaRow(ad, catState.manage));
        });
      });
      if (items.length) {
        rows.push('<div class="sec">' + (sec.name ? '<div class="sec-t">' + esc(sec.name) + '</div>' : '') +
          items.join('') + '</div>');
      }
    });
    if (!rows.length) return '';
    var count = 0;
    (c.sections || []).forEach(function (s) { count += (s.formulas || []).length; });
    var open = catState.kw ? true : !!catState.open[ci];
    return '<div class="chap' + (open ? ' open' : '') + '" data-chap="' + ci + '">' +
      '<div class="chap-hd"><span class="caret">' + icon('right') + '</span>' +
      '<span class="cn">' + esc(c.no) + '　' + esc(c.name) + '</span>' +
      '<span class="chip gray tiny">' + count + ' 首</span></div>' +
      '<div class="chap-bd">' + rows.join('') + '</div></div>';
  }

  function renderCatalog(main) {
    var mg = catState.manage;
    UI.header({
      title: '方剂目录',
      sub: Z.formulas.length + ' 首',
      actions: [
        { icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } },
        { text: mg ? '完成' : '管理', label: '批量管理', onClick: function () {
          catState.manage = !catState.manage; clearSel(); renderCatalog(main); paintManageBar();
        } }
      ]
    });

    var html = [];
    var hc = Z.hiddenCount();
    if (hc && !mg) {
      html.push('<div class="card" style="padding:10px 12px"><div class="row between"><div class="small muted">已隐藏 ' +
        hc + ' 首方剂（目录中带删除线，卡片切换时跳过）</div>' +
        '<button class="btn xs" id="show-hidden">去取消隐藏</button></div></div>');
    }
    html.push('<div class="searchbox mb10" style="margin-bottom:10px"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="cat-kw" placeholder="在本目录中查找方剂名（如 麻黄汤）" value="' + esc(catState.kw) + '"></div>');
    if (mg) {
      html.push('<div class="card flat" style="padding:9px 11px"><div class="row between"><span class="small muted">勾选要隐藏（或取消隐藏）的方剂</span>' +
        '<span class="chip solid tiny" id="sel-count">已选 ' + selCount() + '</span></div></div>');
    }
    Z.chapters.forEach(function (c, ci) { html.push(chapterHTML(c, ci)); });
    html.push('<div class="small dim center" style="margin:16px 0 6px">— 共 ' + Z.chapters.length + ' 章 · ' +
      Z.formulas.length + ' 首（含附方）—</div>');
    main.innerHTML = html.join('');
    main.className = mg ? 'has-bar' : '';

    main.querySelectorAll('[data-chap]').forEach(function (el) {
      el.querySelector('.chap-hd').onclick = function () {
        var ci = el.getAttribute('data-chap');
        catState.open[ci] = !catState.open[ci];
        el.classList.toggle('open', !!catState.open[ci]);
      };
    });
    main.querySelectorAll('[data-dr]').forEach(function (el) {
      el.onclick = function (e) {
        var id = el.getAttribute('data-dr');
        if (mg) {
          if (e.target.closest && e.target.closest('.ck')) return;
          toggleSel(id);
          el.classList.toggle('sel', !!catState.sel[id]);
          var ck = el.querySelector('input'); if (ck) ck.checked = !!catState.sel[id];
          paintManageBar();
          return;
        }
        UI.go('#/card/' + id);
      };
    });
    main.querySelectorAll('[data-ck]').forEach(function (ck) {
      ck.onclick = function (e) {
        e.stopPropagation();
        var id = ck.getAttribute('data-ck');
        toggleSel(id);
        ck.closest('.dr').classList.toggle('sel', !!catState.sel[id]);
        paintManageBar();
      };
    });
    var kw = main.querySelector('#cat-kw');
    if (kw) {
      var t = null;
      kw.oninput = function () {
        clearTimeout(t);
        t = setTimeout(function () {
          catState.kw = kw.value.trim();
          var pos = kw.selectionStart;
          renderCatalog(main);
          var n = main.querySelector('#cat-kw');
          if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } }
        }, 220);
      };
    }
    var sh = main.querySelector('#show-hidden');
    if (sh) sh.onclick = function () {
      catState.manage = true; catState.sel = {};
      renderCatalog(main); paintManageBar();
      UI.toast('已进入管理，勾选被隐藏的方剂再点「取消隐藏」');
    };
    if (mg) paintManageBar(main); else removeManageBar();
  }

  function toggleSel(id) { if (catState.sel[id]) delete catState.sel[id]; else catState.sel[id] = 1; }
  function removeManageBar() { var b = document.getElementById('fbar'); if (b) b.remove(); }

  function paintManageBar(main) {
    if (!catState.manage) { removeManageBar(); return; }
    var bar = document.getElementById('fbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'fbar'; bar.id = 'fbar';
      document.getElementById('app').appendChild(bar);
    }
    bar.innerHTML =
      '<button class="btn sm" id="mb-all">全选</button>' +
      '<button class="btn sm" id="mb-none">清空</button>' +
      '<button class="btn sm danger" id="mb-hide" disabled>隐藏</button>' +
      '<button class="btn sm" id="mb-unhide" disabled>取消隐藏</button>' +
      '<span class="grow"></span>' +
      '<button class="btn sm primary" id="mb-done">完成</button>';
    var n = selCount();
    var sc = document.getElementById('sel-count');
    if (sc) sc.textContent = '已选 ' + n;
    bar.querySelector('#mb-hide').disabled = !n;
    bar.querySelector('#mb-unhide').disabled = !n;
    bar.querySelector('#mb-all').onclick = function () {
      document.getElementById('main').querySelectorAll('[data-dr]').forEach(function (el) {
        var id = el.getAttribute('data-dr');
        catState.sel[id] = 1;
        el.classList.add('sel');
        var ck = el.querySelector('input'); if (ck) ck.checked = true;
      });
      paintManageBar();
    };
    bar.querySelector('#mb-none').onclick = function () { clearSel(); renderCatalog(document.getElementById('main')); };
    bar.querySelector('#mb-hide').onclick = function () {
      var ids = Object.keys(catState.sel);
      ids.forEach(function (id) { Z.setHidden(id, true); });
      UI.toast('已隐藏 ' + ids.length + ' 首');
      clearSel(); renderCatalog(document.getElementById('main'));
    };
    bar.querySelector('#mb-unhide').onclick = function () {
      var ids = Object.keys(catState.sel);
      ids.forEach(function (id) { Z.setHidden(id, false); });
      UI.toast('已取消隐藏 ' + ids.length + ' 首');
      clearSel(); renderCatalog(document.getElementById('main'));
    };
    bar.querySelector('#mb-done').onclick = function () {
      catState.manage = false; clearSel(); removeManageBar();
      renderCatalog(document.getElementById('main'));
    };
  }

  /* =================================================================
   *  卡片
   * ================================================================= */
  var cardState = { panel: null, panelFormula: null, drug: '', page: 0, continuous: null };

  function visibleOrder() {
    return Z.mainOrder.filter(function (id) { return !Z.isHidden(id) && Z.byId[id]; });
  }

  function sec(label, body) {
    return '<div class="sec-block"><div class="sec-label">' + label + '</div>' + body + '</div>';
  }
  function screenChars() {
    var w = Math.min(window.innerWidth || 390, 760) - 60;
    var cpl = Math.max(13, Math.floor(w / 15.5));
    var lps = Math.max(12, Math.floor(((window.innerHeight || 800) - 170) / 28.7));
    return cpl * lps;
  }
  function roleHTML(a) {
    var h = [];
    (a.roles || []).forEach(function (r) {
      var lines = (r.entries || []).map(function (en) {
        var drugs = (en.drugs || []).join('、');
        return '<div class="fx-line"><b>' + esc(drugs) + '</b>' + (en.text ? '：' + esc(en.text) : '') + '</div>';
      }).join('');
      h.push('<div class="fx-role"><span class="fx-badge fx-' + esc(r.role) + '">' + esc(r.role) + '</span>' +
        '<div class="fx-role-body">' + lines + '</div></div>');
    });
    (a.peiwu || []).forEach(function (t) {
      h.push('<div class="fx-line fx-peiwu"><span class="fx-tag">配伍</span>' + esc(t) + '</div>');
    });
    (a.zongkuo || []).forEach(function (t) {
      h.push('<div class="fx-line fx-zongkuo"><span class="fx-tag">总括</span>' + esc(t) + '</div>');
    });
    if (a.note) h.push('<div class="fx-note">' + esc(a.note) + '</div>');
    if (a.plain && a.plain.length) {
      h.push('<div class="fx-plain">' + a.plain.map(function (en) {
        return '<div class="fx-line"><b>' + esc((en.drugs || []).join('、')) + '</b>' + (en.text ? '：' + esc(en.text) : '') + '</div>';
      }).join('') + '</div>');
    }
    return h.join('');
  }

  function buildContent(v) {
    if (!Z.hasRoles(v.analysis) && v.analysis.plain && v.analysis.plain.length) {
      // 无君臣佐使：正文按「药物解说」平铺
    }
    var blocks = [];
    blocks.push({ k: 'basic', html: sec('组成', '<div class="fx-compo">' + esc(v.compositionRaw) + '</div>') });
    if (v.song) blocks.push({ k: 'basic', html: sec('方歌', '<div class="fx-song">' + esc(v.song) + '</div>') });
    if (v.functionRaw) blocks.push({ k: 'simple', html: sec('功用', '<div class="fx-func">' + esc(v.functionRaw) + '</div>') });
    if (v.indicationRaw) {
      var ind = v.indication && v.indication.length
        ? v.indication.map(function (x, i) { return '<div class="fx-ind"><b>' + (i + 1) + '.</b> ' + esc(x) + '</div>'; }).join('')
        : '<div class="fx-ind">' + esc(v.indicationRaw) + '</div>';
      blocks.push({ k: 'simple', html: sec('主治', ind) });
    }
    if (v.application && v.application.length) {
      blocks.push({
        k: 'simple',
        html: sec('运用', v.application.map(function (t) { return '<div class="fx-apply">· ' + esc(t) + '</div>'; }).join(''))
      });
    }
    var rolesHtml = roleHTML(v.analysis);
    if (rolesHtml) blocks.push({ k: 'roles', html: sec('方解（君臣佐使）', rolesHtml) });
    blocks.forEach(function (b) { b.len = b.html.replace(/<[^>]+>/g, '').length; });
    var full = blocks.map(function (b) { return b.html; }).join('');
    var len = blocks.reduce(function (a, b) { return a + b.len; }, 0);
    var per = screenChars();
    if (per <= 0 || len <= per * 2) return { paged: false, html: full };
    var pageCount = Math.min(4, Math.max(2, Math.ceil(len / (per * 1.45))));
    var target = len / pageCount;
    var pages = [], cur = null;
    blocks.forEach(function (b) {
      if (cur && cur.len > 0 && pages.length < pageCount - 1 && cur.len + b.len > target * 1.15) {
        pages.push(cur); cur = null;
      }
      if (!cur) cur = { html: '', len: 0, labels: [] };
      cur.html += b.html; cur.len += b.len; cur.labels.push(b.k);
    });
    if (cur && cur.html) pages.push(cur);
    if (pages.length < 2) return { paged: false, html: full };
    pages.forEach(function (pg) {
      pg.label = pg.labels.indexOf('roles') >= 0 ? '方解' : (pg.labels[0] === 'basic' ? '组成 · 方歌' : '内容');
    });
    return { paged: true, pages: pages, html: full };
  }

  function cardHTML(v) {
    var h = [];
    var chips = [];
    if (v.kind === 'attach') chips.push('<span class="chip gray">附方</span>');
    if (v.edited) chips.push('<span class="chip gray">已修改</span>');
    if (Z.isFav(v.id)) chips.push('<span class="chip solid">★ 已收藏</span>');
    if (Z.isHidden(v.id)) chips.push('<span class="chip gray">⊘ 已隐藏</span>');
    if (Z.note(v.id)) chips.push('<span class="chip gray">有笔记</span>');
    h.push('<div class="drug-title"><span class="n">' + esc(v.name) + '</span>' +
      '<span class="p">' + esc(v.chapterNo + ' ' + v.chapterName + (v.sectionName ? ' · ' + v.sectionName : '')) + '</span></div>');
    if (v.kind === 'attach' && v.source) h.push('<div class="tiny dim mt6">出处：' + esc(v.source) + '</div>');
    if (chips.length) h.push('<div class="tag-row mt6">' + chips.join('') + '</div>');
    var note = Z.note(v.id);
    if (note) h.push('<div class="note-inline mt10" id="card-note-view"><div class="tiny" style="opacity:.7;margin-bottom:2px">我的笔记</div>' +
      esc(note).replace(/\n/g, '<br>') + '</div>');

    var content = buildContent(v);
    if (content.paged && !cardState.continuous) {
      var pg = content.pages[Math.min(cardState.page, content.pages.length - 1)];
      h.push('<div class="cpager">' +
        '<button class="btn xs" id="cp-prev"' + (cardState.page <= 0 ? ' disabled' : '') + '>' + icon('left') + ' 上一页</button>' +
        '<span class="cpt">第 ' + (cardState.page + 1) + ' / ' + content.pages.length + ' 页 · ' + esc(pg.label || '') + '</span>' +
        '<button class="btn xs" id="cp-next"' + (cardState.page >= content.pages.length - 1 ? ' disabled' : '') + '>下一页 ' + icon('right') + '</button>' +
        '</div>');
      h.push('<div class="card mt10">' + pg.html + '</div>');
    } else {
      h.push('<div class="card mt14">' + content.html + '</div>');
      if (content.paged) {
        h.push('<div class="center mt6">' + (cardState.continuous
          ? '<button class="btn ghost xs" id="cp-off">切回分页阅读</button>'
          : '<button class="btn ghost xs" id="cp-on">分页阅读（每页少一点）</button>') + '</div>');
      }
    }
    if (v.attached && v.attached.length) {
      h.push('<div class="card"><div class="sec-label">附方（' + v.attached.length + '）</div><div class="tag-row">' +
        v.attached.map(function (a) {
          return '<a class="chip" href="#/card/' + a.id + '">' + esc(a.name) + '</a>';
        }).join('') + '</div></div>');
    }
    if (v.parentFormula) {
      h.push('<div class="card"><div class="sec-label">母方</div><a class="chip" href="#/card/' + v.parentFormula.id + '">' +
        esc(v.parentFormula.name) + '</a></div>');
    }
    if (v.differential && v.differential.length) {
      h.push('<div class="card"><div class="sec-label">鉴别（本方与附方）</div>' +
        v.differential.map(function (t) { return '<div class="fx-diff">' + esc(t) + '</div>'; }).join('') + '</div>');
    }
    if (v.diffs && v.diffs.length) {
      h.push('<div class="card"><div class="sec-label">方剂间鉴别（' + v.diffs.length + '）</div>' +
        v.diffs.map(function (d) {
          return '<div class="fx-diffbox" data-diff="' + esc(d.title) + '"><div class="fx-difftt">' + esc(d.title) + '</div>' +
            '<div class="fx-difftx">' + esc(d.body) + '</div></div>';
        }).join('') +
        '<div class="tiny dim mt6">更多鉴别见「方剂鉴别」板块（可搜索）</div></div>');
    }
    return h.join('');
  }

  function renderCard(main, p) {
    var id = p[0];
    var f = Z.byId[id];
    if (!f) {
      UI.header({ title: '方剂', back: true });
      main.innerHTML = UI.emptyBox('没有找到这首方剂');
      return;
    }
    Z.store.pos.lastFormula = id;
    Z.save();
    var v = Z.view(f);
    if (cardState.drug !== id) { cardState.drug = id; cardState.page = 0; cardState.continuous = null; }
    var list = visibleOrder();
    var idx = list.indexOf(id);
    var prevId = null, nextId = null;
    if (idx >= 0) {
      if (idx > 0) prevId = list[idx - 1];
      if (idx < list.length - 1) nextId = list[idx + 1];
    } else {
      var ai = Z.order.indexOf(id);
      for (var k = ai - 1; k >= 0; k--) { if (list.indexOf(Z.order[k]) >= 0) { prevId = Z.order[k]; break; } }
      for (var k2 = ai + 1; k2 < Z.order.length; k2++) { if (list.indexOf(Z.order[k2]) >= 0) { nextId = Z.order[k2]; break; } }
    }

    UI.header({
      title: f.kind === 'attach' ? '附方 · ' + f.name : f.name,
      sub: f.chapterNo,
      back: true,
      actions: [
        { icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } },
        { icon: 'list', label: '目录', onClick: function () { UI.go('#/catalog'); } }
      ]
    });
    var hb = document.getElementById('hd-back');
    if (hb) hb.onclick = function () { UI.replace('#/catalog'); };

    main.innerHTML = cardHTML(v) +
      '<div class="act-row six" id="card-acts">' +
      act('note', '笔记', Z.note(id) ? 'on' : '') +
      act('fav', '收藏', Z.isFav(id) ? 'on' : '') +
      act('edit', '编辑', Object.keys(Z.store.edits[id] || {}).length ? 'on' : '') +
      act(Z.isHidden(id) ? 'unhide' : 'hide', Z.isHidden(id) ? '取消隐藏' : '隐藏', '') +
      act('compare', '组成对比', '') +
      act('diff', '鉴别', (v.diffs && v.diffs.length) ? '' : '') +
      '</div>' +
      '<div id="card-panel"></div>' +
      '<div class="pager">' +
      '<button class="btn" id="p-prev"' + (prevId ? '' : ' disabled') + '>' + icon('left') + ' 上一个</button>' +
      '<div class="pc">' + (idx >= 0 ? (idx + 1) + ' / ' + list.length : (f.kind === 'attach' ? '附方' : '已隐藏')) + '</div>' +
      '<button class="btn" id="p-next"' + (nextId ? '' : ' disabled') + '>下一个 ' + icon('right') + '</button>' +
      '</div>' +
      '<div class="small dim center" style="margin-top:14px">目录顺序 · 已隐藏的方剂会被跳过 · 附方不参与翻页</div>';

    function act(k, label, cls) {
      var ic = { note: 'note', fav: 'star', edit: 'edit', hide: 'hide', unhide: 'eyeoff', diff: 'diff', compare: 'diff' }[k];
      return '<button class="act ' + cls + (k === 'hide' ? ' red' : '') + '" data-act="' + k + '">' +
        icon(ic) + '<span>' + label + '</span></button>';
    }

    var prev = main.querySelector('#p-prev'), next = main.querySelector('#p-next');
    if (prev) prev.onclick = function () { if (prevId) UI.go('#/card/' + prevId); };
    if (next) next.onclick = function () { if (nextId) UI.go('#/card/' + nextId); };

    var cpPrev = main.querySelector('#cp-prev');
    if (cpPrev) cpPrev.onclick = function () {
      if (cardState.page > 0) { cardState.page--; renderCard(main, [id]); window.scrollTo(0, 0); }
    };
    var cpNext = main.querySelector('#cp-next');
    if (cpNext) cpNext.onclick = function () { cardState.page++; renderCard(main, [id]); window.scrollTo(0, 0); };
    var cpOn = main.querySelector('#cp-on');
    if (cpOn) cpOn.onclick = function () { cardState.continuous = true; renderCard(main, [id]); };
    var cpOff = main.querySelector('#cp-off');
    if (cpOff) cpOff.onclick = function () { cardState.continuous = false; cardState.page = 0; renderCard(main, [id]); window.scrollTo(0, 0); };

    UI.bind(main, '#card-acts [data-act]', function (el) {
      var k = el.getAttribute('data-act');
      if (k === 'note') togglePanel(main, id, 'note');
      else if (k === 'fav') togglePanel(main, id, 'fav');
      else if (k === 'edit') togglePanel(main, id, 'edit');
      else if (k === 'hide') { Z.setHidden(id, true); UI.toast('已隐藏，卡片切换将跳过'); renderCard(main, [id]); }
      else if (k === 'unhide') { Z.setHidden(id, false); UI.toast('已取消隐藏'); renderCard(main, [id]); }
      else if (k === 'compare') UI.go('#/compare?a=' + id);
      else if (k === 'diff') {
        if (v.diffs && v.diffs.length) UI.go('#/diff?ref=' + encodeURIComponent(f.name));
        else UI.toast('这首方剂没有方剂间鉴别条目');
      }
    });

    var nv = main.querySelector('#card-note-view');
    if (nv) nv.onclick = function () { togglePanel(main, id, 'note'); };

    document.onkeydown = function (e) {
      if (e.key === 'ArrowLeft' && prevId) UI.go('#/card/' + prevId);
      if (e.key === 'ArrowRight' && nextId) UI.go('#/card/' + nextId);
    };
  }

  /* ---------- 面板：笔记 / 收藏 / 编辑 ---------- */
  function togglePanel(main, id, kind) {
    var box = main.querySelector('#card-panel');
    if (!box) return;
    if (cardState.panel === kind && cardState.panelFormula === id) { cardState.panel = null; box.innerHTML = ''; return; }
    cardState.panel = kind; cardState.panelFormula = id;
    if (kind === 'note') box.innerHTML = notePanelHTML(id);
    else if (kind === 'fav') box.innerHTML = favPanelHTML(id);
    else box.innerHTML = editPanelHTML(id);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    if (kind === 'note') {
      var ta = box.querySelector('#note-ta');
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      box.querySelector('#note-save').onclick = function () {
        Z.setNote(id, ta.value);
        UI.toast(ta.value.trim() ? '笔记已保存' : '笔记已清空');
        cardState.panel = null; renderCard(main, [id]);
      };
      box.querySelector('#note-cancel').onclick = function () { cardState.panel = null; box.innerHTML = ''; };
    } else if (kind === 'fav') {
      UI.bind(box, '[data-g]', function (el) {
        var g = el.getAttribute('data-g');
        if (g === '__off') { if (Z.isFav(id)) Z.toggleFav(id); UI.toast('已取消收藏'); }
        else {
          if (Z.isFav(id) && Z.favGroup(id) !== g) { delete Z.store.fav.items[id]; Z.save(true); }
          Z.toggleFav(id, g);
          var gname = (Z.store.fav.groups.filter(function (x) { return x.id === g; })[0] || {}).name || '';
          UI.toast('已收藏到「' + gname + '」');
        }
        cardState.panel = null; renderCard(main, [id]);
      });
      box.querySelector('#fav-manage').onclick = function () { UI.go('#/fav'); };
    } else if (kind === 'edit') {
      var f = Z.byId[id];
      var e = Z.store.edits[id] || {};
      var v = Z.view(f);
      box.querySelector('#ed-save').onclick = function () {
        var obj = {};
        function val(name) { var el = box.querySelector('[data-f="' + name + '"]'); return el ? el.value : null; }
        obj.composition = val('composition');
        obj.function = val('function');
        obj.indication = val('indication');
        if (f.kind === 'main') {
          obj.song = val('song');
          obj.application = val('application');
          obj.analysis = val('analysis');
        }
        Z.store.edits[id] = obj;
        Z.save(true);
        UI.toast('已保存修改（本机生效）');
        cardState.panel = null; renderCard(main, [id]);
      };
      box.querySelector('#ed-reset').onclick = function () {
        UI.confirmDialog('恢复原文', '将丢弃你对这首方剂的所有修改，恢复为教材原文。', '恢复', '取消').then(function (ok) {
          if (!ok) return;
          delete Z.store.edits[id]; Z.save(true);
          UI.toast('已恢复原文');
          cardState.panel = null; renderCard(main, [id]);
        });
      };
      box.querySelector('#ed-cancel').onclick = function () { cardState.panel = null; box.innerHTML = ''; };
    }
  }

  function notePanelHTML(id) {
    return '<div class="card mt14" style="background:#fffdf3;border-color:#ecdcaf">' +
      '<div class="sec-label">我的笔记（只存本机）</div>' +
      '<textarea class="input" id="note-ta" placeholder="记下这首方的记忆点、易混点、老师强调的地方…" style="min-height:110px">' + esc(Z.note(id)) + '</textarea>' +
      '<div class="row mt10"><button class="btn sm primary" id="note-save">保存笔记</button>' +
      '<button class="btn sm" id="note-cancel">收起</button></div></div>';
  }

  function favPanelHTML(id) {
    var groups = Z.store.fav.groups, cur = Z.favGroup(id), h = [];
    h.push('<div class="card mt14"><div class="sec-label">选择收藏分组</div><div class="tag-row">');
    groups.forEach(function (g) {
      h.push('<button class="chip' + (cur === g.id ? ' on' : '') + '" data-g="' + g.id + '">' + esc(g.name) + '</button>');
    });
    if (cur) h.push('<button class="chip gray" data-g="__off">取消收藏</button>');
    h.push('</div><div class="row mt10"><button class="btn sm" id="fav-manage">管理分组</button></div></div>');
    return h.join('');
  }

  function editPanelHTML(id) {
    var f = Z.byId[id], e = Z.store.edits[id] || {}, v = Z.view(f);
    function vv(k, fallback) { return e[k] != null ? e[k] : fallback; }
    var h = ['<div class="card mt14" style="background:#fbf8f0"><div class="sec-label">编辑内容（只改本机，可随时恢复原文）</div>'];
    h.push('<div class="field"><label>组成</label><textarea class="input" data-f="composition" style="min-height:64px">' +
      esc(vv('composition', f.compositionRaw || '')) + '</textarea></div>');
    if (f.kind === 'main') {
      h.push('<div class="field"><label>方歌</label><textarea class="input" data-f="song" style="min-height:56px">' +
        esc(vv('song', f.song || '')) + '</textarea></div>');
    }
    h.push('<div class="field"><label>功用（用「，」分隔）</label><input class="input" data-f="function" value="' +
      esc(vv('function', f.functionRaw || '')) + '"></div>');
    h.push('<div class="field"><label>主治（多段可分多行，行首不加序号）</label><textarea class="input" data-f="indication" style="min-height:72px">' +
      esc(vv('indication', f.indicationRaw || '')) + '</textarea></div>');
    if (f.kind === 'main') {
      h.push('<div class="field"><label>运用（每行一条）</label><textarea class="input" data-f="application" style="min-height:88px">' +
        esc(vv('application', (f.application || []).join('\n'))) + '</textarea></div>');
      h.push('<div class="field"><label>方解（每行：角色｜药名｜说明；角色可填 君/臣/佐/使/佐使/配伍/总括/说明/其他）</label>' +
        '<textarea class="input" data-f="analysis" style="min-height:150px">' +
        esc(vv('analysis', Z.analysisToText(f.analysis))) + '</textarea></div>');
    }
    h.push('<div class="row"><button class="btn sm primary" id="ed-save">保存</button>' +
      '<button class="btn sm" id="ed-cancel">取消</button>' +
      '<span class="grow"></span><button class="btn sm danger" id="ed-reset">恢复原文</button></div></div>');
    return h.join('');
  }

  UI.VIEWS.catalog = renderCatalog;
  UI.VIEWS.card = renderCard;
  window.FJ_CARDS = { catState: catState, visibleOrder: visibleOrder, removeManageBar: removeManageBar };
})();
