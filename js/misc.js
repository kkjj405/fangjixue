/* 方剂学 · 首页 / 收藏 / 搜索 / 方剂鉴别 / 组成对比 / 打赏 / 我的 / 关于 */
(function () {
  'use strict';
  var Z = window.FJ, UI = window.ZY_UI;
  var esc = Z.esc, icon = UI.icon;
  var VER = window.FJX_VERSION || { app: '1.0.0', web: '1.0.0' };

  var ANNOUNCE = [
    '本程序内容完全基于中国中医药出版社十五五教材《方剂学》。本程序仅供学习使用，不提供临床用药指导。',
    '如果觉得这个程序有用的话，可以分享给身边的同学、朋友。',
    '如果觉得这个程序有帮到你的话，可以赞赏一下作者嘛，多少都是可以的，赞赏功能在「我的 → 赞赏支持」。'
  ];

  /* ---------------- 输入框弹窗 ---------------- */
  function promptText(title, value, placeholder, multiline) {
    return new Promise(function (resolve) {
      var el = document.getElementById('dialog');
      el.innerHTML = '<div class="dlg"><h3>' + esc(title) + '</h3>' +
        '<div class="field"><textarea class="input" id="pr-i" style="min-height:' + (multiline ? 150 : 44) + 'px" placeholder="' +
        esc(placeholder || '') + '">' + esc(value || '') + '</textarea></div>' +
        '<div class="dact"><button class="btn" data-p="0">取消</button>' +
        '<button class="btn primary" data-p="1">确定</button></div></div>';
      el.classList.add('on');
      var ta = el.querySelector('#pr-i');
      ta.focus();
      if (!multiline) ta.setSelectionRange(ta.value.length, ta.value.length);
      el.querySelectorAll('[data-p]').forEach(function (b) {
        b.onclick = function () {
          var v = b.getAttribute('data-p') === '1' ? ta.value : null;
          el.classList.remove('on'); el.innerHTML = '';
          resolve(v);
        };
      });
    });
  }

  /* =================================================================
   *  首页
   * ================================================================= */
  function renderHome(main) {
    UI.header({
      title: '方剂学',
      sub: '方剂提要',
      actions: [{ icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } }]
    });
    var last = Z.byId[Z.store.pos.lastFormula];
    var st = Z.D.stats || {};
    var h = [];
    h.push('<div class="hero"><h1>方剂学 · 方剂提要</h1>' +
      '<p>中国中医药出版社《方剂学》第六版 · 背诵卡片 + 练习</p>' +
      '<div class="mini"><div><b>' + (st.main || 236) + '</b>正方</div>' +
      '<div><b>' + (st.attach || 223) + '</b>附方</div>' +
      '<div><b>' + (st.differentials || 90) + '</b>鉴别</div></div></div>');
    h.push('<div class="notice"><div class="nt">' + icon('list') + '公告</div>' +
      '<div class="nb">' + ANNOUNCE.map(function (t) { return '<div style="margin-bottom:4px">' + esc(t) + '</div>'; }).join('') + '</div></div>');
    if (last) {
      h.push('<div class="card" style="padding:12px 14px"><div class="row between">' +
        '<div><div class="tiny dim">上次看到</div><div class="b">' + esc(last.name) + '</div></div>' +
        '<button class="btn sm primary" id="go-last">继续背诵</button></div></div>');
    }
    h.push('<div class="grid2" style="margin-bottom:12px">' +
      '<div class="tile" data-go="#/practice/setup?mode=mo"><div class="tt">默写练习</div><div class="ts">看方名默写，对照答案</div><div class="ti">✎</div></div>' +
      '<div class="tile" data-go="#/practice/setup?mode=tc"><div class="tt">选择题练习</div><div class="ts">含君臣佐使四小题</div><div class="ti">☑</div></div>' +
      '<div class="tile" data-go="#/catalog"><div class="tt">方剂目录</div><div class="ts">21 章 · 236 正方</div><div class="ti">☰</div></div>' +
      '<div class="tile" data-go="#/diff"><div class="tt">方剂鉴别</div><div class="ts">90 条易混方剂对比</div><div class="ti">⚖</div></div>' +
      '<div class="tile" data-go="#/compare"><div class="tt">组成对比</div><div class="ts">两方共同药与独有药</div><div class="ti">⇄</div></div>' +
      '<div class="tile" data-go="#/search"><div class="tt">搜索方剂</div><div class="ts">按方名直达卡片</div><div class="ti">⌕</div></div>' +
      '</div>');
    h.push('<div class="stat-row"><div class="stat"><b>' + Z.favList().length + '</b><span>收藏</span></div>' +
      '<div class="stat"><b>' + Z.noteCount() + '</b><span>笔记</span></div>' +
      '<div class="stat"><b>' + Z.hiddenCount() + '</b><span>已隐藏</span></div>' +
      '<div class="stat"><b>' + (Z.differentials || []).length + '</b><span>鉴别</span></div></div>');
    h.push('<div class="card flat"><div class="row between"><span class="small muted">内容来源</span>' +
      '<span class="small">' + esc(Z.D.book || '') + '</span></div>' +
      '<div class="hr"></div><div class="tiny dim">所有内容来自你提供的教材整理稿，未引入任何外部资料；本机离线可用。</div></div>');
    main.innerHTML = h.join('');
    UI.bind(main, '[data-go]', function (el) { UI.go(el.getAttribute('data-go')); });
    var gl = main.querySelector('#go-last');
    if (gl) gl.onclick = function () { UI.go('#/card/' + last.id); };
  }

  /* =================================================================
   *  收藏
   * ================================================================= */
  var favState = { group: '' };
  function renderFav(main) {
    UI.header({
      title: '我的收藏',
      sub: Z.favList().length + ' 首',
      actions: [
        { text: '管理', label: '管理分组', onClick: function () { manageGroups(main); } },
        { icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } }
      ]
    });
    var groups = Z.store.fav.groups, all = Z.favList();
    var h = [];
    h.push('<div class="tag-row mb10"><button class="chip' + (!favState.group ? ' on' : '') + '" data-g="">全部 ' + all.length + '</button>' +
      groups.map(function (g) {
        return '<button class="chip' + (favState.group === g.id ? ' on' : '') + '" data-g="' + g.id + '">' +
          esc(g.name) + ' ' + Z.favList(g.id).length + '</button>';
      }).join('') + '</div>');
    var list = Z.favList(favState.group || null);
    if (!list.length) {
      h.push(UI.emptyBox('还没有收藏的方剂', '在方剂卡片页点「收藏」即可加入；收藏页可以建分组来归类'));
    } else {
      h.push('<div class="list">' + list.map(function (id) {
        var f = Z.byId[id];
        var g = groups.filter(function (x) { return x.id === Z.favGroup(id); })[0];
        return '<div class="li"><div class="li-t" data-open="' + id + '"><div class="t serif">' + esc(f.name) + '</div>' +
          '<div class="s">' + esc(f.chapterNo + ' ' + f.chapterName) + (g && g.name !== '默认分组' ? ' · ' + esc(g.name) : '') + '</div></div>' +
          '<button class="btn xs" data-move="' + id + '">移组</button>' +
          '<button class="btn xs danger" data-del="' + id + '">移除</button></div>';
      }).join('') + '</div>');
      h.push('<div class="small dim center mt10">点方名进入卡片；「移组」可把收藏挪到别的分组</div>');
    }
    main.innerHTML = h.join('');
    UI.bind(main, '[data-g]', function (el) { favState.group = el.getAttribute('data-g'); renderFav(main); });
    UI.bind(main, '[data-open]', function (el) { UI.go('#/card/' + el.getAttribute('data-open')); });
    UI.bind(main, '[data-del]', function (el) {
      var id = el.getAttribute('data-del');
      Z.toggleFav(id); UI.toast('已取消收藏 ' + Z.byId[id].name); renderFav(main);
    });
    UI.bind(main, '[data-move]', function (el) {
      var id = el.getAttribute('data-move');
      dialogGroups('移动到分组', Z.favGroup(id), function (gid) {
        Z.store.fav.items[id] = gid; Z.save(true); UI.toast('已移动'); renderFav(main);
      });
    });
  }
  function dialogGroups(title, current, cb) {
    var groups = Z.store.fav.groups;
    UI.dialog({
      title: title,
      html: '<div class="tag-row">' + groups.map(function (g) {
        return '<button class="chip' + (current === g.id ? ' on' : '') + '" data-dg="' + g.id + '">' + esc(g.name) + '</button>';
      }).join('') + '</div>',
      buttons: [{ text: '取消', value: null }]
    });
    document.querySelectorAll('[data-dg]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-dg');
        UI.closeDialog(gid); cb(gid);
      };
    });
  }
  function manageGroups(main) {
    var groups = Z.store.fav.groups;
    UI.dialog({
      title: '收藏分组管理',
      html: '<div class="small muted mb10">默认分组不可删除；删除分组时，里面的方剂会回到默认分组。</div>' +
        '<div class="list">' + groups.map(function (g) {
          return '<div class="li"><div class="li-t"><div class="t">' + esc(g.name) + '</div>' +
            '<div class="s">' + Z.favList(g.id).length + ' 首</div></div>' +
            (g.id !== 'g0' ? '<button class="btn xs" data-rg="' + g.id + '">重命名</button>' +
              '<button class="btn xs danger" data-dg2="' + g.id + '">删除</button>' : '') + '</div>';
        }).join('') + '</div>',
      buttons: [{ text: '新建分组', value: 'new', primary: true }, { text: '关闭', value: null }]
    }).then(function (v) {
      if (v === 'new') {
        promptText('新建分组', '', '例如：解表剂、易混方').then(function (name) {
          if (!name || !name.trim()) return;
          Z.store.fav.groups.push({ id: 'g' + Date.now(), name: name.trim() });
          Z.save(true); renderFav(main); UI.toast('已新建分组');
        });
      }
    });
    document.querySelectorAll('[data-rg]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-rg');
        var g = Z.store.fav.groups.filter(function (x) { return x.id === gid; })[0];
        UI.closeDialog(null);
        promptText('重命名分组', g.name, '新的分组名').then(function (name) {
          if (!name || !name.trim()) return;
          g.name = name.trim(); Z.save(true); renderFav(main); UI.toast('已重命名');
        });
      };
    });
    document.querySelectorAll('[data-dg2]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-dg2');
        UI.closeDialog(null);
        UI.confirmDialog('删除分组', '分组内的收藏会回到默认分组，确定删除？', '删除', '取消').then(function (ok) {
          if (!ok) return;
          Object.keys(Z.store.fav.items).forEach(function (id) { if (Z.store.fav.items[id] === gid) Z.store.fav.items[id] = 'g0'; });
          Z.store.fav.groups = Z.store.fav.groups.filter(function (x) { return x.id !== gid; });
          if (favState.group === gid) favState.group = '';
          Z.save(true); renderFav(main); UI.toast('已删除分组');
        });
      };
    });
  }

  /* =================================================================
   *  搜索
   * ================================================================= */
  function renderSearch(main, p, q) {
    UI.header({ title: '搜索方剂', sub: '按方名', back: true });
    var kw = q.kw || '';
    main.innerHTML = '<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="s-kw" placeholder="输入方名，如：麻黄汤 / 桂枝汤" value="' + esc(kw) + '"></div>' +
      '<div id="s-res"></div>';
    var input = main.querySelector('#s-kw'), res = main.querySelector('#s-res');
    function paint() {
      var k = input.value.trim();
      if (!k) {
        res.innerHTML = '<div class="card flat"><div class="sec-label">试试这些</div><div class="tag-row">' +
          ['麻黄汤', '桂枝汤', '小柴胡汤', '四君子汤', '六味地黄丸', '血府逐瘀汤'].map(function (n) {
            return '<button class="chip" data-quick="' + n + '">' + n + '</button>';
          }).join('') + '</div></div>';
        UI.bind(res, '[data-quick]', function (el) { input.value = el.getAttribute('data-quick'); paint(); });
        return;
      }
      var list = Z.searchFormulas(k);
      if (!list.length) { res.innerHTML = UI.emptyBox('没有找到「' + k + '」', '只支持按方名搜索；可以只输入一个字或两个字'); return; }
      res.innerHTML = '<div class="small dim mb6">共 ' + list.length + ' 条结果</div><div class="list">' +
        list.map(function (f) {
          return '<div class="li" data-open="' + f.id + '"><div class="li-t"><div class="t serif">' +
            highlight(f.name, k) + (f.kind === 'attach' ? ' <span class="chip gray tiny" style="height:19px;padding:0 6px">附方</span>' : '') +
            '</div><div class="s">' + esc(f.chapterNo + ' ' + f.chapterName) + '</div></div>' +
            '<span class="arrow">›</span></div>';
        }).join('') + '</div>';
      UI.bind(res, '[data-open]', function (el) { UI.go('#/card/' + el.getAttribute('data-open')); });
    }
    function highlight(name, k) {
      var i = name.indexOf(k);
      if (i < 0) return esc(name);
      return esc(name.slice(0, i)) + '<b style="color:#9e3d2f">' + esc(name.slice(i, i + k.length)) + '</b>' + esc(name.slice(i + k.length));
    }
    var t = null;
    input.oninput = function () { clearTimeout(t); t = setTimeout(paint, 120); };
    paint();
    setTimeout(function () { input.focus(); }, 60);
  }

  /* =================================================================
   *  方剂鉴别（方剂间鉴别）
   * ================================================================= */
  var diffState = { kw: '', open: {} };
  function renderDiff(main, p, q) {
    UI.header({
      title: '方剂鉴别',
      sub: (Z.differentials || []).length + ' 条',
      back: true,
      actions: [
        { icon: 'search', label: '搜索方剂', onClick: function () { UI.go('#/search'); } },
        { text: '对比', label: '组成对比', onClick: function () { UI.go('#/compare'); } }
      ]
    });
    if (q.ref) diffState.kw = q.ref;
    var list = Z.differentials || [];
    var h = [];
    h.push('<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="d-kw" placeholder="搜索方名或鉴别要点，如：麻黄 / 桂枝" value="' + esc(diffState.kw) + '"></div>');
    h.push('<div class="tiny dim mb10">这里只放「不同方剂之间」的鉴别；母方与其附方的鉴别已放在各自卡片里。</div>');
    h.push('<div id="d-list"></div>');
    main.innerHTML = h.join('');
    var input = main.querySelector('#d-kw'), box = main.querySelector('#d-list');

    function formulaIdByName(name) {
      var cand = Z.formulas.filter(function (f) { return f.name === name; });
      if (!cand.length) return null;
      var mainOne = cand.filter(function (f) { return f.kind === 'main'; })[0];
      return (mainOne || cand[0]).id;
    }
    function paint() {
      var k = input.value.trim();
      var filtered = list.filter(function (x) {
        if (!k) return true;
        return x.title.indexOf(k) >= 0 || x.body.indexOf(k) >= 0 || x.ref.indexOf(k) >= 0 || (x.chapterName || '').indexOf(k) >= 0;
      });
      if (!filtered.length) { box.innerHTML = UI.emptyBox('没有匹配的鉴别条目'); return; }
      var byCh = [];
      filtered.forEach(function (x) {
        var key = x.chapterNo + '|' + x.chapterName;
        var g = byCh.filter(function (y) { return y.key === key; })[0];
        if (!g) { g = { key: key, no: x.chapterNo, name: x.chapterName, items: [] }; byCh.push(g); }
        g.items.push(x);
      });
      box.innerHTML = byCh.map(function (g, gi) {
        var open = k ? true : !!diffState.open[g.key];
        return '<div class="acc' + (open ? ' open' : '') + '" data-acc="' + gi + '">' +
          '<div class="acc-hd">' + esc(g.no) + '　' + esc(g.name) + '<span class="grow"></span>' +
          '<span class="chip gray tiny">' + g.items.length + '</span></div>' +
          '<div class="acc-bd">' + g.items.map(function (x) {
            var rid = x.ref ? formulaIdByName(x.ref) : null;
            return '<div class="fx-diffbox"><div class="fx-difftt">' + esc(x.title) + '</div>' +
              '<div class="fx-difftx">' + esc(x.body) + '</div>' +
              (rid ? '<div class="tiny" style="margin-top:5px"><a href="#/card/' + rid + '">→ 查看「' + esc(x.ref) + '」卡片</a></div>' : '') +
              '</div>';
          }).join('') + '</div></div>';
      }).join('');
      box.querySelectorAll('[data-acc]').forEach(function (el) {
        var gi = +el.getAttribute('data-acc');
        el.querySelector('.acc-hd').onclick = function () {
          var g = byCh[gi];
          diffState.open[g.key] = !el.classList.contains('open');
          el.classList.toggle('open');
        };
      });
    }
    var t = null;
    input.oninput = function () { clearTimeout(t); t = setTimeout(paint, 120); };
    paint();
  }

  /* =================================================================
   *  组成对比
   * ================================================================= */
  var CMP = { a: '', b: '' };
  function optionHTML(sel) {
    var out = [];
    Z.order.forEach(function (id) {
      var f = Z.byId[id];
      if (!f) return;
      out.push('<option value="' + f.id + '"' + (sel === f.id ? ' selected' : '') + '>' +
        esc((f.kind === 'attach' ? '附：' : '') + f.name) + '（' + esc(f.chapterNo) + '）</option>');
    });
    return out.join('');
  }
  function renderCompare(main, p, q) {
    UI.header({
      title: '方剂组成对比',
      sub: '共同药 / 独有药',
      back: true,
      actions: [{ icon: 'search', label: '鉴别', onClick: function () { UI.go('#/diff'); } }]
    });
    if (q.a) CMP.a = q.a;
    if (q.b) CMP.b = q.b;
    if (!CMP.a) CMP.a = Z.order[0] || '';
    if (!CMP.b) CMP.b = Z.order[1] || '';
    main.innerHTML = '<div class="card"><div class="sec-label">选择两首方剂</div>' +
      '<div class="cmp-slot"><div class="cs-t">方剂 A</div><select class="cmp-sel" id="cmp-a">' + optionHTML(CMP.a) + '</select></div>' +
      '<div class="cmp-slot"><div class="cs-t">方剂 B</div><select class="cmp-sel" id="cmp-b">' + optionHTML(CMP.b) + '</select></div>' +
      '<div class="tiny dim">只比较「组成」里的药名（不含剂量）；附方也可参与对比。</div></div>' +
      '<div id="cmp-out"></div>';
    function paint() {
      var r = Z.compareFormulas(CMP.a, CMP.b);
      var out = main.querySelector('#cmp-out');
      if (!r) { out.innerHTML = UI.emptyBox('请选择两首方剂'); return; }
      function chips(arr, cls) {
        return arr.length ? '<div class="tag-row">' + arr.map(function (x) {
          return '<span class="chip ' + cls + '">' + esc(x) + '</span>';
        }).join('') + '</div>' : '<div class="small dim">（无）</div>';
      }
      out.innerHTML = '<div class="card"><div class="row between"><div class="b">对比结果</div>' +
        '<div class="tiny dim">' + esc(r.a.name) + ' ⇄ ' + esc(r.b.name) + '</div></div>' +
        '<div class="cmp-res">' +
        '<div class="cmp-sec"><div class="cmp-lab">共同含有的药（' + r.common.length + '）</div>' + chips(r.common, 'solid') + '</div>' +
        '<div class="cmp-sec"><div class="cmp-lab">只有「' + esc(r.a.name) + '」有（' + r.onlyA.length + '）</div>' + chips(r.onlyA, 'gray') + '</div>' +
        '<div class="cmp-sec"><div class="cmp-lab">只有「' + esc(r.b.name) + '」有（' + r.onlyB.length + '）</div>' + chips(r.onlyB, 'gray') + '</div>' +
        '</div></div>';
    }
    main.querySelector('#cmp-a').onchange = function (e) { CMP.a = e.target.value; paint(); };
    main.querySelector('#cmp-b').onchange = function (e) { CMP.b = e.target.value; paint(); };
    paint();
  }

  /* =================================================================
   *  打赏
   * ================================================================= */
  function renderTip(main) {
    UI.header({ title: '赞赏支持', back: true });
    main.innerHTML = '<div class="card" style="padding:0;border:0;box-shadow:none;background:transparent">' +
      '<div class="tip-text">制作不易，如果觉得有用的话，可以给作者一点赞赏嘛，多少都是可以的，一块钱也是爱，当然没有打赏也是可以的，支持免费使用，大家都是医学生，不必为难。</div>' +
      '<div class="qr-wrap"><img src="qr.jpg" alt="微信收款码" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div class=&quot;empty&quot;>收款码图片缺失（www/qr.jpg）</div>\'">' +
      '<div class="small dim mt10">微信扫码赞赏 · 金额随意</div></div>' +
      '<div class="small dim center mt18">感谢每一位认真背方的同学。</div></div>';
  }

  /* =================================================================
   *  我的
   * ================================================================= */
  function renderMe(main) {
    UI.header({ title: '我的', sub: 'v' + VER.app });
    var h = [];
    h.push('<div class="card"><div class="row between"><div><div class="b">方剂学</div>' +
      '<div class="tiny dim mt6">App v' + esc(VER.app) + ' · 网页 v' + esc(VER.web) + ' · ' + esc(VER.build || '') + '</div></div>' +
      '<button class="btn sm" id="btn-update">' + icon('refresh') + ' 检查更新</button></div>' +
      '<div class="tiny dim mt10" id="upd-msg"></div></div>');
    h.push('<div class="card" style="padding:0"><div class="list">' +
      item('search', '搜索方剂', '按方名直达卡片', '#/search') +
      item('diff', '方剂鉴别', (Z.differentials || []).length + ' 条易混方剂', '#/diff') +
      item('diff', '组成对比', '两方共同药与独有药', '#/compare') +
      item('tip', '赞赏支持', '如果觉得有用', '#/tip') +
      item('list', '关于本程序', '内容来源与使用说明', '#/about') +
      '</div></div>');
    h.push('<div class="card"><div class="sec-label">学习数据（只存本机）</div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn xs" id="btn-export">导出备份</button>' +
      '<button class="btn xs" id="btn-import">导入备份</button>' +
      '<button class="btn xs danger" id="btn-clear">清空数据</button></div>' +
      '<div class="tiny dim mt10">备份包含：笔记、收藏与分组、内容修改、隐藏列表、练习进度。换手机可以迁移。</div></div>');
    h.push('<div class="card flat"><div class="sec-label">本机统计</div>' +
      '<div class="row wrap small muted" style="gap:14px">' +
      '<span>收藏 ' + Z.favList().length + '</span><span>笔记 ' + Z.noteCount() + '</span>' +
      '<span>隐藏 ' + Z.hiddenCount() + '</span><span>修改 ' + Object.keys(Z.store.edits || {}).length + '</span></div></div>');
    h.push('<div class="card flat"><div class="tiny dim" style="line-height:1.8">' +
      esc(ANNOUNCE[0]) + '<br>内容整理自《方剂学》第六版（李冀、许二平主编），共 ' +
      (Z.D.stats ? Z.D.stats.main : 236) + ' 首正方、' + (Z.D.stats ? Z.D.stats.attach : 223) + ' 首附方、' +
      (Z.differentials || []).length + ' 条方剂间鉴别。全部离线可用。</div></div>');
    main.innerHTML = h.join('');
    UI.bind(main, '[data-href]', function (el) { UI.go(el.getAttribute('data-href')); });
    main.querySelector('#btn-update').onclick = function () { doCheckUpdate(main); };
    main.querySelector('#btn-export').onclick = doExport;
    main.querySelector('#btn-import').onclick = doImport;
    main.querySelector('#btn-clear').onclick = function () {
      UI.confirmDialog('清空所有数据', '将删除本机的笔记、收藏、修改、隐藏与练习进度，且无法恢复。确定吗？', '清空', '取消')
        .then(function (ok) {
          if (!ok) return;
          try { localStorage.removeItem('fjx.data.v1'); } catch (e) { }
          location.reload();
        });
    };
  }
  function item(ic, t, s, href) {
    return '<div class="li" data-href="' + href + '"><span style="width:22px;color:#9e3d2f">' + icon(ic) + '</span>' +
      '<div class="li-t"><div class="t">' + t + '</div><div class="s">' + esc(s) + '</div></div>' +
      '<span class="arrow">›</span></div>';
  }

  /* ---------------- 检查更新 ---------------- */
  function cmpVer(a, b) {
    var pa = String(a || '0').split('.'), pb = String(b || '0').split('.');
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }
  function doCheckUpdate(main) {
    var msg = main.querySelector('#upd-msg');
    function say(t) { if (msg) msg.innerHTML = t; }
    if (window.NativeBridge && window.NativeBridge.checkUpdate) {
      say('正在检查…');
      try { window.NativeBridge.checkUpdate(); } catch (e) { say('检查失败：' + e.message); }
      return;
    }
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var remote = j.web || j.version || '';
        if (cmpVer(remote, VER.web) > 0) {
          say('发现新版本 v' + remote + '，正在更新…');
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.getRegistration().then(function (reg) {
              if (reg) reg.update();
              setTimeout(function () { location.reload(); }, 1200);
            });
          } else setTimeout(function () { location.reload(); }, 800);
        } else { say('已是最新版本（v' + VER.web + '）'); UI.toast('已是最新版本'); }
      })
      .catch(function (e) { say('检查失败：' + (e.message || '网络不可用') + '（不影响使用）'); });
  }
  window.__onUpdateResult = function (json) {
    var o = {};
    try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    var msg = document.querySelector('#upd-msg');
    var t = o.msg || (o.ok ? '已是最新版本' : '检查失败');
    if (msg) msg.textContent = t;
    UI.toast(t);
    if (o.updated) setTimeout(function () { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } }, 900);
  };
  window.__onAutoUpdate = function (json) {
    var o = {};
    try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    if (o.updated) {
      UI.dialog({
        title: '更新完成', text: '新版本资源已下载完成，重启后生效。',
        buttons: [{ text: '稍后', value: false }, { text: '立即重启', value: true, primary: true }]
      }).then(function (ok) { if (ok) { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } } });
    }
  };

  /* ---------------- 备份 ---------------- */
  function backupObj() {
    return {
      app: 'fjx', version: VER.app, ts: Date.now(),
      notes: Z.store.notes, fav: Z.store.fav, hidden: Z.store.hidden,
      edits: Z.store.edits, drafts: Z.store.drafts, settings: Z.store.settings
    };
  }
  function doExport() {
    var txt = JSON.stringify(backupObj());
    promptText('导出备份（复制这段文本保存）', txt, '', true).then(function (v) { if (v != null) UI.toast('已复制到剪贴板'); });
    try {
      var blob = new Blob([txt], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '方剂学备份-' + Z.nowText().replace(/[: ]/g, '-') + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { }
  }
  function doImport() {
    promptText('导入备份', '', '把之前导出的 JSON 全文粘贴到这里', true).then(function (v) {
      if (!v || !v.trim()) return;
      var o;
      try { o = JSON.parse(v); } catch (e) { UI.toast('JSON 格式不正确'); return; }
      if (!o || o.app !== 'fjx') { UI.toast('这不是本程序的备份文件'); return; }
      UI.confirmDialog('导入备份', '导入会覆盖当前本机的笔记/收藏/修改/隐藏/练习进度，确定？', '导入', '取消').then(function (ok) {
        if (!ok) return;
        ['notes', 'fav', 'hidden', 'edits', 'drafts', 'settings'].forEach(function (k) { if (o[k] != null) Z.store[k] = o[k]; });
        Z.save(true); UI.toast('导入完成'); location.reload();
      });
    });
  }

  /* =================================================================
   *  关于
   * ================================================================= */
  function renderAbout(main) {
    UI.header({ title: '关于本程序', back: true });
    main.innerHTML =
      '<div class="card"><div class="sec-label">内容来源</div>' +
      '<div class="small" style="line-height:1.9">本程序全部内容来自你提供的教材整理稿（据李冀、许二平主编《方剂学》第六版，中国中医药出版社整理），未引入任何外部资料。共 ' +
      (Z.D.stats ? Z.D.stats.main : 236) + ' 首正方、' + (Z.D.stats ? Z.D.stats.attach : 223) + ' 首附方、' +
      (Z.differentials || []).length + ' 条【方剂间鉴别】。</div></div>' +
      '<div class="card"><div class="sec-label">功能</div><div class="small" style="line-height:1.9">' +
      '① 背诵卡片：组成、方歌、功用、主治、运用、方解（君臣佐使），按章浏览、翻页、笔记、收藏、编辑、批量隐藏<br>' +
      '② 默写练习：看方名默写组成/功用/主治/君臣佐使（四方框）；无君臣佐使的方可跳过<br>' +
      '③ 选择题练习：选项按比例生成、干扰项随机；君臣佐使为四小题同页作答<br>' +
      '④ 收藏分组、按方名搜索、方剂鉴别检索、两方组成对比</div></div>' +
      '<div class="card"><div class="sec-label">使用说明</div><div class="small" style="line-height:1.9">' +
      '· 所有数据只保存在本机（localStorage），不上传、不联网；<br>' +
      '· 卸载或清空数据会丢失笔记与进度，建议在「我的」里导出备份；<br>' +
      '· 安卓版可通过「检查更新」热更新网页资源，无需重装；<br>' +
      '· iPhone：Safari 打开网址 → 分享 → 添加到主屏幕即可当 App 用。</div></div>' +
      '<div class="card flat"><div class="sec-label">免责声明</div>' +
      '<div class="small muted" style="line-height:1.9">' + esc(ANNOUNCE[0]) + '</div></div>' +
      '<div class="small dim center" style="margin:18px 0">方剂学 v' + esc(VER.app) + ' · ' + esc(VER.build || '') + '</div>';
  }

  UI.VIEWS.home = renderHome;
  UI.VIEWS.fav = renderFav;
  UI.VIEWS.search = renderSearch;
  UI.VIEWS.diff = renderDiff;
  UI.VIEWS.compare = renderCompare;
  UI.VIEWS.tip = renderTip;
  UI.VIEWS.me = renderMe;
  UI.VIEWS.about = renderAbout;
})();
