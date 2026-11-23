(function () {
  'use strict';

  var input = document.getElementById('q');
  var clearBtn = document.getElementById('qClear');
  var panel = document.getElementById('qPanel');
  var state = document.getElementById('qState');
  var list = document.getElementById('qList');
  if (!input || !panel || !list) return;

  var INDEX_URL = (window.location.origin || '') + '/search.json';
  var data = null;
  var loading = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch(INDEX_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('索引读取失败');
        return r.json();
      })
      .then(function (json) {
        data = json;
        return data;
      })
      .catch(function (e) {
        loading = null;
        throw e;
      });
    return loading;
  }

  function open() {
    panel.hidden = false;
    clearBtn.hidden = !input.value;
  }

  function close() {
    panel.hidden = true;
  }

  // 多关键字：空格分隔，全部命中才算
  function match(item, terms) {
    var hay = (item.t + ' ' + item.c + ' ' + item.x).toLowerCase();
    for (var i = 0; i < terms.length; i++) {
      if (hay.indexOf(terms[i]) === -1) return -1;
    }
    // 标题命中排前面
    var titleHit = 0;
    for (var j = 0; j < terms.length; j++) {
      if (item.t.toLowerCase().indexOf(terms[j]) > -1) titleHit += 10;
    }
    return titleHit;
  }

  function snippet(item, terms) {
    var text = item.x || '';
    var lower = text.toLowerCase();
    var at = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = lower.indexOf(terms[i]);
      if (p > -1) { at = p; break; }
    }
    if (at < 0) return esc(text.slice(0, 90));
    var start = Math.max(0, at - 26);
    var piece = text.slice(start, start + 110);
    return (start > 0 ? '…' : '') + esc(piece) + (start + 110 < text.length ? '…' : '');
  }

  function render(terms) {
    if (!terms.length) {
      list.innerHTML = '';
      state.textContent = '输入关键字开始搜索';
      return;
    }

    var hits = [];
    for (var i = 0; i < data.length; i++) {
      var score = match(data[i], terms);
      if (score > -1) hits.push({ item: data[i], score: score });
    }

    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.d < b.item.d ? 1 : -1;
    });

    if (!hits.length) {
      list.innerHTML = '';
      state.textContent = '没有找到「' + terms.join(' ') + '」';
      return;
    }

    state.textContent = '找到 ' + hits.length + ' 篇';
    var html = '';
    for (var k = 0; k < hits.length && k < 40; k++) {
      var it = hits[k].item;
      html += '<li class="search-hit">' +
        '<a href="' + it.p + '">' +
          '<span class="hit-d">' + esc(it.d) + '</span>' +
          '<span class="hit-t">' + esc(it.t) + '</span>' +
          '<span class="hit-x">' + snippet(it, terms) + '</span>' +
        '</a>' +
      '</li>';
    }
    list.innerHTML = html;
  }

  function run() {
    var q = input.value.trim();
    clearBtn.hidden = !q;
    if (!q) {
      list.innerHTML = '';
      state.textContent = '';
      close();
      return;
    }
    open();

    var terms = q.toLowerCase().split(/\s+/).filter(function (t) { return t; });

    if (data) {
      render(terms);
      return;
    }

    state.textContent = '载入索引…';
    load().then(function () {
      render(terms);
    }).catch(function () {
      state.textContent = '索引载入失败，检查网络后重试';
    });
  }

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });

  input.addEventListener('focus', function () {
    if (input.value.trim()) open();
  });

  clearBtn.addEventListener('click', function () {
    input.value = '';
    run();
    input.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      close();
      input.blur();
    }
    // Ctrl/Cmd + K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== input) {
      close();
    }
  });
})();
