/* 方剂学 · 数据层 / 本地存储 / 工具函数 */
(function () {
  'use strict';

  var D = window.FJ_DATA;
  if (!D) { document.body.innerHTML = '<div class="empty">数据文件加载失败，请重新打开应用</div>'; return; }

  var formulas = D.formulas || [];
  var byId = Object.create(null);
  formulas.forEach(function (f) { byId[f.id] = f; });

  var chapters = D.chapters || [];
  var differentials = D.differentials || [];

  /* ---------------- 本地存储 ---------------- */
  var KEY = 'fjx.data.v1';
  var DEFAULT = {
    notes: {},
    hidden: {},
    edits: {},
    fav: { groups: [{ id: 'g0', name: '默认分组' }], items: {} },
    pos: { lastFormula: '' },
    drafts: [],
    settings: { order: 'random' },
    meta: { firstOpen: 0, lastVersion: '' }
  };
  var store = load();
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var o = JSON.parse(raw);
      Object.keys(DEFAULT).forEach(function (k) {
        if (o[k] === undefined || o[k] === null) o[k] = clone(DEFAULT[k]);
      });
      if (!o.fav || !Array.isArray(o.fav.groups) || !o.fav.groups.length) o.fav = clone(DEFAULT.fav);
      if (!o.fav.items) o.fav.items = {};
      if (!Array.isArray(o.drafts)) o.drafts = [];
      return o;
    } catch (e) { return clone(DEFAULT); }
  }
  var saveTimer = null;
  function save(now) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (now) { persist(); return; }
    saveTimer = setTimeout(persist, 120);
  }
  function persist() {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function splitList(s) {
    return String(s || '').replace(/[。；;]+$/, '')
      .split(/[，,]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /* 方歌排版：一句一行两句（每两句换一行），多段方歌按句号分段 */
  function fmtSong(s) {
    var t = String(s || '').trim();
    if (!t) return '';
    var sentences = [], buf = '', term = '';
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (ch === '。' || ch === '！' || ch === '？' || ch === '.' || ch === '!' || ch === '?') {
        if (buf.trim()) { sentences.push({ text: buf.trim(), term: ch === '.' ? '。' : ch }); }
        buf = '';
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) sentences.push({ text: buf.trim(), term: '' });
    if (!sentences.length) return t;
    var lines = [];
    sentences.forEach(function (sent) {
      var parts = sent.text.split(/[，,；;]/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!parts.length) return;
      var local = [];
      for (var k = 0; k < parts.length; k += 2) local.push(parts.slice(k, k + 2).join('，'));
      if (sent.term && local.length) local[local.length - 1] += sent.term;
      lines = lines.concat(local);
    });
    return lines.join('\n');
  }

  var UNITS = '两钱分斤枚个片条升寸尺把克毫升匕握具对只束段盏杯碗';
  function cleanDrug(tok) {
    var t = String(tok || '').trim().replace(/钱半/g, '半钱');
    // 去括号（含嵌套）
    for (var i = 0; i < 5; i++) {
      var n = t.replace(/（[^（）]*）/g, '').replace(/\([^()]*\)/g, '');
      if (n === t) break;
      t = n;
    }
    t = t.split(/[，,；;]/)[0];
    t = t.split('各')[0];
    var re = new RegExp('[一二三四五六七八九十百千半零〇0-9０-９\\.]+(\\s*[' + UNITS + '])+$');
    for (var k = 0; k < 5; k++) {
      var m = t.replace(re, '').replace(/[0-9０-９\\.]+\s*(g|mg|kg|ml|克|毫克|毫升)?$/, '')
        .replace(/(各等分|等分|适量|少许|等份)$/, '').replace(/\s+$/, '');
      if (m === t) break;
      t = m;
    }
    return t.replace(/^[、，,。；;：:\s]+|[、，,。；;：:\s]+$/g, '');
  }
  function parseComposition(raw) {
    var flat = String(raw || '');
    for (var i = 0; i < 5; i++) {
      var n = flat.replace(/（[^（）]*）/g, '').replace(/\([^()]*\)/g, '');
      if (n === flat) break;
      flat = n;
    }
    return flat.split('、').map(function (p) { return cleanDrug(p); }).filter(Boolean);
  }
  /* ---------------- 药名归一（仅用于对比/干扰项，不改显示原文） ---------------- */
  var DRUG_ALIAS = {
    '生甘草': '甘草', '炙甘草': '甘草', '粉草': '甘草', '国老': '甘草', '甘草梢': '甘草',
    '白芍': '芍药', '白芍药': '芍药',
    '生地': '地黄', '生地黄': '地黄', '干地黄': '地黄', '大生地': '地黄',
    '熟地': '熟地黄', '大熟地': '熟地黄', '大怀熟': '熟地黄', '怀熟地': '熟地黄',
    '元参': '玄参', '黑参': '玄参',
    '干葛': '葛根', '粉葛': '葛根', '粉葛根': '葛根',
    '山栀': '栀子', '山栀子': '栀子', '栀子仁': '栀子', '山枝': '栀子',
    '银花': '金银花', '忍冬花': '金银花',
    '元胡': '延胡索', '玄胡索': '延胡索', '延胡': '延胡索',
    '云苓': '茯苓', '白茯苓': '茯苓', '云茯苓': '茯苓',
    '麦冬': '麦门冬', '寸冬': '麦门冬',
    '天冬': '天门冬',
    '橘红': '陈皮', '橘皮': '陈皮', '广陈皮': '陈皮',
    '锦黄芪': '黄芪', '绵黄芪': '黄芪', '生黄芪': '黄芪', '炙黄芪': '黄芪',
    '归身': '当归', '当归身': '当归', '全当归': '当归',
    '牡丹皮': '丹皮',
    '栝楼实': '瓜蒌', '瓜蒌实': '瓜蒌', '栝楼': '瓜蒌',
    '栝楼根': '天花粉', '瓜蒌根': '天花粉',
    '枣': '大枣', '红枣': '大枣',
    '桂心': '肉桂', '官桂': '肉桂',
    '川军': '大黄', '锦纹': '大黄', '生大黄': '大黄', '酒大黄': '大黄', '熟大黄': '大黄',
    '黑姜': '炮姜', '姜炭': '炮姜',
    '真川连': '黄连', '川连': '黄连', '小川连': '黄连', '川黄连': '黄连',
    '条参': '党参', '潞党参': '党参',
    '蓬砂': '硼砂', '月石': '硼砂',
    '当门子': '麝香', '元寸': '麝香',
    '梅冰': '冰片', '梅片': '冰片', '梅花冰片': '冰片',
    '飞金': '金箔',
    '于术': '白术', '冬术': '白术',
    '抚芎': '川芎',
    '川牛膝': '牛膝', '怀牛膝': '牛膝',
    '法半夏': '半夏', '仙半夏': '半夏', '姜半夏': '半夏', '清半夏': '半夏',
    '生杭芍': '白芍', '杭芍': '白芍', '杭白芍': '白芍',
    '白菊花': '菊花', '甘菊花': '菊花', '黄菊花': '菊花',
    '川楝子': '川楝子', '金铃子': '川楝子',
    '紫苏叶': '紫苏', '苏叶': '紫苏', '苏梗': '紫苏梗'
  };
  var COOK_PREFIX = /^(生|炙|炒|焦|煨|制|炮|酒|盐|醋|蜜|姜|土|麸|米|砂|炭|鲜|干|净|水飞|去皮|去心|去节|去芦|去毛|去核|去油|去刺)/;
  function normDrug(name) {
    var t = String(name || '').replace(/（[^）]*）/g, '').replace(/\([^()]*\)/g, '').trim();
    if (!t) return '';
    var guard = 0;
    while (guard++ < 3 && COOK_PREFIX.test(t) && t.length >= 3) t = t.replace(COOK_PREFIX, '');
    return DRUG_ALIAS[t] || t;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function uniqBy(arr, fn) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) { var k = fn(x); if (!seen[k]) { seen[k] = 1; out.push(x); } });
    return out;
  }
  function nowText(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 练习记录（可多份） ---------------- */
  function practiceTotal(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return rec.order.length;
    return rec.order.length * rec.fields.length;   // 选择题：每首方按内容项各出一题（君臣佐使算 1 题）
  }
  function practiceDone(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return Object.keys(rec.submitted || {}).length;
    return (rec.qs || []).filter(function (q) { return q.done; }).length;
  }

  /* ---------------- 合并用户编辑后的方剂视图 ---------------- */
  function view(f) {
    var e = store.edits[f.id] || {};
    var v = {
      id: f.id, name: f.name, kind: f.kind, parent: f.parent,
      source: f.source || '',
      chapterNo: f.chapterNo, chapterName: f.chapterName, sectionName: f.sectionName,
      attached: (f.attached || []).map(function (id) { return byId[id]; }).filter(Boolean),
      differential: f.differential || [],
      diffs: f.diffs || [],
      edited: Object.keys(e).length > 0
    };
    v.compositionRaw = e.composition != null ? e.composition : (f.compositionRaw || '');
    v.ingredients = e.composition != null ? parseComposition(e.composition) : (f.ingredients || []).map(function (x) { return x.name; });
    v.song = e.song != null ? e.song : (f.song || '');
    v.functionRaw = e.function != null ? e.function : (f.functionRaw || '');
    v.functions = splitList(v.functionRaw);
    v.indicationRaw = e.indication != null ? e.indication : (f.indicationRaw || '');
    v.indication = (function () {
      var t = v.indicationRaw || '';
      if (t.indexOf('\n') >= 0) {
        return t.split('\n').map(function (x) { return x.replace(/^\d+[.、]\s*/, '').trim(); }).filter(Boolean);
      }
      return [];
    })();
    v.application = (function () {
      if (e.application != null) return e.application.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      return (f.application || []).slice();
    })();
    var an = f.analysis || { roles: [], peiwu: [], zongkuo: [], note: '', plain: [] };
    if (e.analysis != null) {
      v.analysis = parseAnalysisText(e.analysis);
    } else {
      v.analysis = {
        roles: an.roles || [], peiwu: an.peiwu || [], zongkuo: an.zongkuo || [],
        note: an.note || '', plain: an.plain || []
      };
    }
    if (f.kind === 'attach') {
      v.parentFormula = byId[f.parent] || null;
    }
    return v;
  }

  /* 编辑框里「方解」的文本格式： 君｜麻黄｜说明 / 臣｜桂枝｜说明 / 配伍｜说明 / 总括｜说明 / 药名｜说明 */
  var ROLE_NAMES = ['君', '臣', '佐', '使', '佐使', '臣佐'];
  function analysisToText(a) {
    var lines = [];
    (a.roles || []).forEach(function (r) {
      (r.entries || []).forEach(function (en) {
        lines.push(r.role + '｜' + (en.drugs || []).join('、') + '｜' + (en.text || ''));
      });
    });
    (a.peiwu || []).forEach(function (t) { lines.push('配伍｜' + t); });
    (a.zongkuo || []).forEach(function (t) { lines.push('总括｜' + t); });
    if (a.note) lines.push('说明｜' + a.note);
    (a.plain || []).forEach(function (en) { lines.push('其他｜' + (en.drugs || []).join('、') + '｜' + (en.text || '')); });
    return lines.join('\n');
  }
  function parseAnalysisText(text) {
    var out = { roles: [], peiwu: [], zongkuo: [], note: '', plain: [] };
    String(text || '').split('\n').forEach(function (line) {
      var s = line.trim();
      if (!s) return;
      var parts = s.split(/[｜|]/);
      var k = parts[0].trim();
      if (ROLE_NAMES.indexOf(k) >= 0) {
        var role = out.roles.filter(function (r) { return r.role === k; })[0];
        if (!role) { role = { role: k, entries: [] }; out.roles.push(role); }
        role.entries.push({ drugs: (parts[1] || '').split(/[、,，]/).filter(Boolean), text: parts.slice(2).join('｜') });
      } else if (k === '配伍') out.peiwu.push(parts.slice(1).join('｜'));
      else if (k === '总括') out.zongkuo.push(parts.slice(1).join('｜'));
      else if (k === '说明') out.note = parts.slice(1).join('｜');
      else if (k === '其他') out.plain.push({ drugs: (parts[1] || '').split(/[、]/).filter(Boolean), text: parts.slice(2).join('｜') });
      else out.plain.push({ drugs: [k], text: parts.slice(1).join('｜') });
    });
    return out;
  }

  function roleEntries(a) {
    var out = [];
    (a.roles || []).forEach(function (r) {
      (r.entries || []).forEach(function (en) { out.push({ role: r.role, drugs: en.drugs || [], text: en.text || '' }); });
    });
    return out;
  }
  function roleNames(a) {
    return (a.roles || []).map(function (r) { return r.role; });
  }
  function hasRoles(a) { return !!(a.roles && a.roles.length); }

  /* ---------- 目录顺序（章→节→正方→其附方） ---------- */
  var order = [];        // 全部方剂 id（目录顺序）
  var mainOrder = [];    // 只有正方，用于卡片上一个/下一个
  var orderIndex = Object.create(null);
  chapters.forEach(function (c) {
    (c.sections || []).forEach(function (sec) {
      (sec.formulas || []).forEach(function (name) {
        var m = formulas.filter(function (f) { return f.kind === 'main' && f.name === name; })[0];
        if (m && orderIndex[m.id] === undefined) {
          order.push(m.id); mainOrder.push(m.id); orderIndex[m.id] = mainOrder.length - 1;
        }
      });
    });
  });
  formulas.forEach(function (f) {
    if (f.kind === 'main' && orderIndex[f.id] === undefined) { order.push(f.id); mainOrder.push(f.id); orderIndex[f.id] = mainOrder.length - 1; }
  });
  var withAttach = [];
  order.forEach(function (id) {
    withAttach.push(id);
    (byId[id].attached || []).forEach(function (aid) {
      if (byId[aid]) { withAttach.push(aid); orderIndex[aid] = withAttach.length - 1; }
    });
  });
  order = withAttach;

  /* ---------- 收藏 ---------- */
  function isFav(id) { return !!store.fav.items[id]; }
  function favGroup(id) { return store.fav.items[id] || null; }
  function toggleFav(id, groupId) {
    if (store.fav.items[id]) delete store.fav.items[id];
    else store.fav.items[id] = groupId || (store.fav.groups[0] && store.fav.groups[0].id) || 'g0';
    save(true);
  }
  function favList(groupId) {
    return Object.keys(store.fav.items)
      .filter(function (id) { return byId[id] && (!groupId || store.fav.items[id] === groupId); })
      .sort(function (a, b) { return (orderIndex[a] || 0) - (orderIndex[b] || 0); });
  }

  /* ---------- 隐藏 ---------- */
  function isHidden(id) { return !!store.hidden[id]; }
  function setHidden(id, v) { if (v) store.hidden[id] = 1; else delete store.hidden[id]; save(true); }
  function hiddenCount() { return Object.keys(store.hidden).length; }

  /* ---------- 笔记 ---------- */
  function note(id) { var n = store.notes[id]; return n ? n.t : ''; }
  function setNote(id, text) {
    if (text && text.trim()) store.notes[id] = { t: text, ts: Date.now() };
    else delete store.notes[id];
    save(true);
  }
  function noteCount() { return Object.keys(store.notes).length; }

  /* ---------- 搜索 ---------- */
  function searchFormulas(kw) {
    kw = String(kw || '').trim().toLowerCase();
    if (!kw) return [];
    var res = [];
    formulas.forEach(function (f) {
      var n = f.name.toLowerCase();
      var score = n === kw ? 0 : (n.indexOf(kw) === 0 ? 1 : (n.indexOf(kw) >= 0 ? 2 : -1));
      if (score >= 0) res.push({ f: f, score: score, idx: orderIndex[f.id] || 0 });
    });
    res.sort(function (a, b) { return a.score - b.score || a.idx - b.idx; });
    return res.map(function (x) { return x.f; });
  }

  /* ---------- 组成对比 ---------- */
  function compareFormulas(idA, idB) {
    var a = byId[idA], b = byId[idB];
    if (!a || !b) return null;
    var va = view(a), vb = view(b);
    var mapA = {}, mapB = {}, orderA = [], orderB = [];
    va.ingredients.forEach(function (n) { var k = normDrug(n); if (k && !mapA[k]) { mapA[k] = n; orderA.push(k); } });
    vb.ingredients.forEach(function (n) { var k = normDrug(n); if (k && !mapB[k]) { mapB[k] = n; orderB.push(k); } });
    var common = [], onlyA = [], onlyB = [];
    orderA.forEach(function (k) {
      if (mapB[k]) common.push(mapA[k]);
      else onlyA.push(mapA[k]);
    });
    orderB.forEach(function (k) { if (!mapA[k]) onlyB.push(mapB[k]); });
    return { a: va, b: vb, common: common, onlyA: onlyA, onlyB: onlyB };
  }

  window.FJ = {
    D: D, formulas: formulas, byId: byId, chapters: chapters, differentials: differentials,
    order: order, mainOrder: mainOrder, orderIndex: orderIndex,
    store: store, save: save, persist: persist,
    esc: esc, splitList: splitList, cleanDrug: cleanDrug, parseComposition: parseComposition,
    shuffle: shuffle, uniqBy: uniqBy, nowText: nowText,
    practiceTotal: practiceTotal, practiceDone: practiceDone,
    view: view, analysisToText: analysisToText, parseAnalysisText: parseAnalysisText,
    roleEntries: roleEntries, roleNames: roleNames, hasRoles: hasRoles, ROLE_NAMES: ROLE_NAMES,
    isFav: isFav, favGroup: favGroup, toggleFav: toggleFav, favList: favList,
    isHidden: isHidden, setHidden: setHidden, hiddenCount: hiddenCount,
    note: note, setNote: setNote, noteCount: noteCount,
    searchFormulas: searchFormulas, compareFormulas: compareFormulas,
    normDrug: normDrug, DRUG_ALIAS: DRUG_ALIAS, fmtSong: fmtSong
  };
})();
