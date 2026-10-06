(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let data, currentSetup = 0, currentStage = 0, category = '全部', opener;
  const stageNames = ['环境', '等待', '触发', '失效'];
  function sourceLinks(target, sources) {
    target.replaceChildren();
    (sources || []).forEach((source, i) => {
      const a = node('a', '', `${source.date || `来源 ${i + 1}`} ↗`);
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', `查看原帖 ${source.date || i + 1}`);
      target.append(a);
    });
  }
  function drawChart(target, type = 'pivot', stage = 2, hero = false) {
    const width = hero ? 640 : 720, height = hero ? 390 : 410;
    const left = 42, right = width - 46, top = 46, floor = 300;
    const seriesByType = {
      pivot: [79,82,85,89,93,99,104,102,99,96,94,91,89,87,86,85,86,85,84,87,92,95,94,98,101,103,102,106,108,107],
      pullback: [79,82,86,89,93,97,103,106,105,102,100,98,97,94,93,91,90,89,88,91,95,97,96,100,103,105,103,108,109,110],
      breakout: [82,86,91,95,99,103,101,97,94,97,99,96,94,96,95,97,96,97,96,98,103,105,104,108,110,111,109,112,114,115]
    };
    const prices = [...(seriesByType[type] || seriesByType.pivot)];
    const support = type === 'breakout' ? 93 : type === 'pullback' ? 87 : 85;
    const trigger = type === 'breakout' ? 101 : type === 'pullback' ? 93 : 89;
    const y = price => top + (118 - price) / 44 * (floor - top);
    const gap = (right - left) / prices.length;
    const x = i => left + gap * (i + .5);
    if (stage === 3 && !hero) {
      prices.splice(21, 9, trigger - 1, trigger - 3, support + 1, support - 2, support - 4, support - 3, support - 5, support - 4, support - 6);
    }
    const shownUntil = hero ? 29 : [7,19,22,29][stage];
    let svg = `<title>${escape(data.account)} ${escape(data.playbooks[currentSetup]?.title || '')}，${hero ? '整体结构' : stageNames[stage]}阶段。假设数据示意。</title>`;
    for (let price = 80; price <= 115; price += 7) {
      svg += `<line x1="${left}" y1="${y(price)}" x2="${right}" y2="${y(price)}" stroke="#294348" stroke-width=".7"/><text x="${right+7}" y="${y(price)+3}" fill="#789895" font-size="8">${price}</text>`;
    }
    [5,12,19,26].forEach(i => { svg += `<line x1="${x(i)}" y1="${top}" x2="${x(i)}" y2="${floor+40}" stroke="#284248" stroke-width=".7"/>`; });
    if (stage >= 1 || hero) {
      svg += `<rect x="${x(11)}" y="${y(support+3)}" width="${right-x(11)}" height="${y(support-1)-y(support+3)}" fill="#b5cfa2" opacity=".09"/><line x1="${x(10)}" y1="${y(support)}" x2="${right}" y2="${y(support)}" stroke="#a5bb89" stroke-dasharray="4 5"/><text x="${x(10)}" y="${y(support)+18}" fill="#b9c99d" font-size="10">${type === 'breakout' ? '整理支撑区域' : '支撑 / 兴趣区域'}</text>`;
    }
    if (stage >= 2 || hero) {
      svg += `<line x1="${x(16)}" y1="${y(trigger)}" x2="${right}" y2="${y(trigger)}" stroke="#e0b77c" stroke-dasharray="3 5"/><text x="${x(16)}" y="${y(trigger)-9}" fill="#ecc699" font-size="10">${type === 'breakout' ? '整理上沿 / 触发区域' : '转强 / 触发区域'}</text>`;
    }
    prices.forEach((close, i) => {
      const open = i ? prices[i-1] + Math.sin(i*2)*.8 : close - 2;
      const high = Math.max(open,close) + 1.2, low = Math.min(open,close) - 1.1;
      const opacity = i <= shownUntil ? 1 : .10;
      const color = close >= open ? '#c2d4a4' : '#d18568';
      const candleWidth = Math.max(5,gap*.52);
      const barHeight = Math.max(1.7,Math.abs(y(open)-y(close)));
      svg += `<g opacity="${opacity}"><line x1="${x(i)}" y1="${y(high)}" x2="${x(i)}" y2="${y(low)}" stroke="${color}" stroke-width="1.2"/><rect x="${x(i)-candleWidth/2}" y="${Math.min(y(open),y(close))}" width="${candleWidth}" height="${barHeight}" fill="${color}"/><rect x="${x(i)-candleWidth/2}" y="${floor+43-(9+Math.abs(close-open)*3+(i%4)*2)}" width="${candleWidth}" height="${9+Math.abs(close-open)*3+(i%4)*2}" fill="${color}" opacity=".22"/></g>`;
    });
    if (type === 'pullback' && stage >= 1) {
      const line = prices.map((p,i) => `${x(i)},${y(i<9 ? p-5 : Math.max(support+1,103-(i-9)*1.5))}`).join(' ');
      svg += `<polyline points="${line}" fill="none" stroke="#7fabbd" stroke-width="1.4" opacity=".65"/><text x="${left}" y="${top-17}" fill="#83aab8" font-size="9">均线参考 · 非固定参数</text>`;
    }
    if (stage >= 2 || hero) {
      const idx = stage === 3 && !hero ? 24 : 20;
      const cy = y(prices[idx]);
      const label = stage === 3 && !hero ? '跌破结构：失效示意' : '突破触发：观察确认';
      const labelX = Math.min(x(idx)-25,width-185);
      svg += `<circle cx="${x(idx)}" cy="${cy}" r="15" fill="none" stroke="${stage===3&&!hero?'#d18568':'#dcc394'}" stroke-width="1"/><path d="M${x(idx)},${cy-16} L${labelX+20},${cy-51}" fill="none" stroke="#8da5a1"/><text x="${labelX-37}" y="${cy-60}" fill="#d2e2d9" font-size="10">${label}</text>`;
    }
    svg += `<text x="${left}" y="${height-16}" fill="#789895" font-size="8">先有强势</text><text x="${x(14)}" y="${height-16}" fill="#789895" font-size="8">等待结构</text><text x="${right-66}" y="${height-16}" fill="#789895" font-size="8">观察确认</text>`;
    target.setAttribute('aria-label',`${data.account} ${data.playbooks[currentSetup]?.title || ''}，${hero ? '整体结构' : stageNames[stage]}阶段。假设数据示意。`);
    target.innerHTML = svg;
  }
  function renderSetup(index, stage = 0) {
    currentSetup = index; currentStage = stage;
    const setup = data.playbooks[index];
    [...$('setup-tabs').children].forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    $('setup-panel').setAttribute('aria-labelledby', `setup-tab-${index}`);
    $('setup-number').textContent = `PLAYBOOK ${String(index+1).padStart(2,'0')}`;
    $('setup-title').textContent = setup.title;
    $('setup-description').textContent = setup.description;
    $('diagram-label').textContent = `${data.account.toUpperCase()} / ${setup.title}`;
    $('stage-name').textContent = `${String(stage+1).padStart(2,'0')} / ${stageNames[stage]}`;
    $('stage-explanation').textContent = setup.stages[stage];
    const dl = $('setup-rules'); dl.replaceChildren();
    [['入场',setup.entry],['失效',setup.stop],['管理',setup.exit],['边界',setup.unknown]].forEach(([label,value]) => {
      if (value) dl.append(node('dt','',label),node('dd','',value));
    });
    [...$('stage-controls').children].forEach((button,i) => button.setAttribute('aria-pressed',String(i === stage)));
    sourceLinks($('setup-sources'), setup.sources);
    drawChart($('lab-chart'), setup.diagram, stage);
  }
  function showCase(item, button) {
    opener = button;
    $('dialog-image').src = item.image;
    $('dialog-image').alt = `${data.account} 原帖图表：${item.title}，${item.date}`;
    $('dialog-meta').textContent = `${item.ticker || data.account} / ${item.date} / ${item.category}`;
    $('dialog-title').textContent = item.title;
    $('dialog-summary').textContent = item.summary;
    $('dialog-lesson').textContent = item.lesson;
    $('dialog-quote').textContent = item.excerpt ? `原帖摘录：“${item.excerpt}”` : '';
    $('dialog-quote').hidden = !item.excerpt;
    $('dialog-source').href = item.url;
    let evidence = $('dialog-evidence');
    if (!evidence) { evidence = node('div','source-links'); evidence.id='dialog-evidence'; $('dialog-source').after(evidence); }
    sourceLinks(evidence,item.sources);
    $('case-dialog').showModal();
    document.body.classList.add('dialog-open');
    $('dialog-close').focus();
  }
  function renderCases() {
    const query = $('case-search').value.trim().toLowerCase();
    const filtered = data.cases.filter(item => (category === '全部' || item.category === category) && (!query || `${item.ticker} ${item.title} ${item.summary} ${item.lesson}`.toLowerCase().includes(query)));
    $('case-count').textContent = `${filtered.length} / ${data.cases.length} 个精选案例`;
    $('empty-cases').hidden = Boolean(filtered.length);
    const grid = $('case-grid'); grid.replaceChildren();
    filtered.forEach(item => {
      const article = node('article','case-card');
      if (item.image) {
        const button = node('button','case-image-button');
        button.type = 'button'; button.setAttribute('aria-label', `放大图表：${item.title}`);
        const img = node('img'); img.src = item.image; img.alt = `${data.account} ${item.ticker || ''} 原始图表，${item.date}`; img.loading = 'lazy'; img.decoding = 'async';
        button.append(img,node('span','image-expand','查看原图 ↗'));
        button.addEventListener('click',()=>showCase(item,button));
        article.append(button);
      } else {
        const cover = node('div','case-no-image'); cover.append(node('strong','',item.ticker || 'FIELD NOTE')); article.append(cover);
      }
      const content = node('div','case-content'), meta = node('div','case-meta');
      meta.append(node('span','',`${item.ticker || '观察'} · ${item.category}`),node('time','',item.date));
      const lesson = node('div','case-lesson'); lesson.append(node('span','','阅读重点'),node('p','',item.lesson));
      const a = node('a','text-link','核对原帖 ↗'); a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      content.append(meta,node('h3','',item.title),node('p','',item.summary),lesson,a); article.append(content); grid.append(article);
    });
  }
  function render() {
    document.title = `${data.account} 策略图解 · Strategy Atlas`;
    document.querySelector('meta[name=description]').content = data.thesis;
    document.documentElement.style.setProperty('--accent',data.account === 'ohiain' ? '#256c5d' : '#ac4823');
    document.documentElement.style.setProperty('--tint',data.account === 'ohiain' ? '#e1ede6' : '#f4e7dc');
    $('brand-name').textContent = data.account;
    $('account-heading').textContent = data.account;
    $('headline').textContent = data.headline;
    $('thesis').textContent = data.thesis;
    $('hero-note').textContent = data.heroNote;
    $('hero-chart-caption').textContent = data.chartCaption;
    [['归档帖文',data.coverage.count.toLocaleString('en-US')],['精选案例',String(data.cases.length).padStart(2,'0')],['资料截至',data.coverage.to.replaceAll('-','.')]].forEach(([label,value])=> {
      const stat = node('div'); stat.append(node('strong','',value),node('span','',label)); $('coverage').append(stat);
    });
    data.strip.forEach((text,i)=> {const item=node('span'); item.append(node('b','',String(i+1).padStart(2,'0')),document.createTextNode(text)); $('strategy-strip').append(item);});
    data.principles.forEach((item,i)=> {
      const card=node('article','principle'),top=node('div','principle-top'),sources=node('div','source-links');
      top.append(node('span','principle-number',String(i+1).padStart(2,'0')),node('span','evidence-badge',item.kind));
      sourceLinks(sources,item.sources); card.append(top,node('h3','',item.title),node('p','',item.body),sources); $('principles').append(card);
    });
    data.playbooks.forEach((setup,i)=> {
      const button=node('button','',setup.title); button.type='button'; button.id=`setup-tab-${i}`; button.setAttribute('role','tab'); button.setAttribute('aria-controls','setup-panel');
      button.addEventListener('click',()=>renderSetup(i));
      button.addEventListener('keydown',event=> {
        if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
          event.preventDefault();
          const next=event.key==='Home'?0:event.key==='End'?data.playbooks.length-1:(i+(event.key==='ArrowRight'?1:-1)+data.playbooks.length)%data.playbooks.length;
          renderSetup(next); $('setup-tabs').children[next].focus();
        }
      }); $('setup-tabs').append(button);
    });
    stageNames.forEach((label,i)=> { const button=node('button','',`${i+1}. ${label}`); button.type='button'; button.addEventListener('click',()=>renderSetup(currentSetup,i)); $('stage-controls').append(button); });
    ['全部',...new Set(data.cases.map(item=>item.category))].forEach(label=> {
      const button=node('button','',label); button.type='button'; button.setAttribute('aria-pressed',String(label===category));
      button.addEventListener('click',()=> {category=label;[...$('case-filters').children].forEach(btn=>btn.setAttribute('aria-pressed',String(btn.textContent===label)));renderCases();}); $('case-filters').append(button);
    });
    $('case-search').addEventListener('input',renderCases);
    $('source-summary').textContent = `资料范围 ${data.coverage.from} — ${data.coverage.to}，共 ${data.coverage.count.toLocaleString('en-US')} 条归档帖文。本站为截至 2026-10-06 的资料快照。`;
    data.unknowns.forEach(text=>$('unknowns').append(node('li','',text)));
    data.glossary.forEach(item=>$('glossary').append(node('dt','',item.term),node('dd','',item.definition)));
    $('profile-link').href=`https://x.com/${data.account}`;
    $('footer-name').textContent=`${data.account} / Strategy Atlas`;
    $('sibling-link').href=`https://lukelwang.github.io/${data.account==='ohiain'?'1chartmaster':'ohiain'}-strategy/`;
    $('sibling-link').textContent=`探索 ${data.account==='ohiain'?'1ChartMaster':'ohiain'} 的策略 ↗`;
    $('repo-link').href=`https://github.com/lukelwang/${data.account.toLowerCase()}-strategy`;
    $('dialog-close').addEventListener('click',()=>$('case-dialog').close());
    $('case-dialog').addEventListener('close',()=>{document.body.classList.remove('dialog-open');opener?.focus();});
    $('case-dialog').addEventListener('click',event=>{if(event.target===$('case-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
    renderSetup(0); renderCases(); drawChart($('hero-chart'),data.playbooks[0].diagram,2,true);
  }
  fetch('data/strategy.json').then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}).then(json=>{data=json;render();}).catch(error=>{
    $('headline').textContent='资料暂时无法加载'; $('thesis').textContent='请刷新页面重试，或通过 GitHub 仓库查看资料。'; $('thesis').classList.add('error-message'); console.error(error);
  });
})();
