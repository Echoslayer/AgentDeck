/* 臨時分享：靜態預覽 → 每頁一張圖片 → PDF / PPTX；不執行 mount 或 record。 */
'use strict';
(() => {
  const base = new URL('../../vendor/', document.currentScript.src);
  const loaded = new Map();
  function load(file) {
    if (!loaded.has(file)) loaded.set(file, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(file, base).href;
      const timer = setTimeout(() => script.onerror(), 15000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); loaded.delete(file); reject(new Error('匯出套件尚未備妥，請製作者執行 agentdeck vendor，再重新開啟簡報。')); };
      document.head.append(script);
    }));
    return loaded.get(file);
  }
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'reader-export-toggle', textContent: '匯出' });
  button.setAttribute('aria-haspopup', 'dialog');
  document.querySelector('body>header').append(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'reader-export';
  dialog.setAttribute('aria-labelledby', 'reader-export-title');
  dialog.innerHTML = `<h2 id="reader-export-title">匯出分享檔</h2>
    <p>將整份簡報轉成靜態圖片，保留文字與版面。互動使用預覽畫面，講稿與註解不會匯出。</p>
    <div class="reader-export-formats"><button type="button" data-format="pdf">下載 PDF</button><button type="button" data-format="pptx">下載 PowerPoint (.pptx)</button></div>
    <p role="status" aria-live="polite"></p><button type="button" data-close>關閉</button>`;
  document.body.append(dialog);
  const status = dialog.querySelector('[role=status]');
  const close = dialog.querySelector('[data-close]');
  let busy = false, cancelled = false, controller;
  button.onclick = () => { status.textContent = ''; dialog.showModal(); };
  close.onclick = () => { if (busy) { cancelled = true; controller.abort(); status.textContent = '正在取消…'; } else dialog.close(); };
  dialog.addEventListener('cancel', e => { if (busy) { e.preventDefault(); close.click(); } });
  // 原生對話框仍處理 Tab / Escape，背景閱讀、編輯與播放快捷鍵不接收按鍵。
  document.addEventListener('keydown', e => { if (dialog.open) e.stopImmediatePropagation(); }, true);
  const checkCancelled = () => { if (cancelled) throw new Error('已取消匯出。'); };
  // 套件對載入失敗的背景圖會靜默留白；先內嵌資源，失敗就停止整份匯出。
  async function embedImages(root, cache) {
    const data = url => {
      if (!cache.has(url)) cache.set(url, (async () => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('有圖片無法讀取，請確認圖片網址與跨來源權限後再試。');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result); reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })());
      return cache.get(url);
    };
    for (const el of [root, ...root.querySelectorAll('*')]) {
      checkCancelled();
      // html-to-image 1.11.13 深複製 SVG 後跳過其子節點，外部 CSS 不會跟進圖片。
      // 把 SVG 後代的計算樣式寫到匯出副本，保留填色、線條與文字。
      if (el instanceof SVGElement) {
        const css = getComputedStyle(el);
        const values = [...css].map(name => [name, css.getPropertyValue(name)]);
        for (const [name, value] of values) el.style.setProperty(name, value);
      }
      if (el instanceof HTMLImageElement) {
        const src = el.currentSrc || el.src;
        el.removeAttribute('srcset'); el.removeAttribute('loading');
        if (src) el.src = await data(src);
        await el.decode();
      }
      if (el instanceof SVGImageElement) {
        const href = el.href.baseVal;
        if (href) el.setAttribute('href', await data(new URL(href, document.baseURI).href));
      }
      for (const property of ['background-image', 'mask-image', 'border-image-source']) {
        let value = getComputedStyle(el).getPropertyValue(property);
        for (const match of value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          value = value.replace(match[0], `url("${await data(match[1])}")`);
        }
        if (value.includes('url(')) el.style.setProperty(property, value);
      }
    }
  }

  for (const action of dialog.querySelectorAll('[data-format]')) action.onclick = async () => {
    if (busy) return;
    if (location.protocol === 'file:') {
      status.textContent = '請透過網站或本機 HTTP 預覽開啟後匯出。本機可在簡報資料夾執行 python3 -m http.server 8000，再開啟 http://localhost:8000。';
      return;
    }
    busy = true; cancelled = false;
    controller = new AbortController();
    close.textContent = '取消匯出';
    dialog.setAttribute('aria-busy', 'true');
    for (const b of dialog.querySelectorAll('[data-format]')) b.disabled = true;
    let host;
    try {
      status.textContent = '準備匯出…';
      const format = action.dataset.format;
      await load('html-to-image/html-to-image.js');
      await load(format === 'pdf' ? 'jspdf/jspdf.umd.min.js' : 'pptxgenjs/pptxgen.bundle.js');
      checkCancelled();
      const snapshot = window.storyReader.snapshot();
      const name = (snapshot.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || '簡報').slice(0, 100);
      const output = format === 'pdf'
        ? new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: [960, 540], compress: true })
        : new window.PptxGenJS();
      if (format === 'pptx') { output.layout = 'LAYOUT_WIDE'; output.title = snapshot.title; }
      host = Object.assign(document.createElement('div'), { className: 'reader-export-host' });
      host.setAttribute('aria-hidden', 'true');
      host.inert = true;
      document.body.append(host);
      const root = Object.assign(document.createElement('main'), { className: 'mini-page reader-export-page' });
      host.append(root);
      const images = new Map();
      for (const [i, page] of snapshot.pages.entries()) {
        checkCancelled();
        status.textContent = `正在處理 ${i + 1} / ${snapshot.pages.length} 頁…`;
        root.innerHTML = page.html;
        root.querySelectorAll('script,iframe,object,embed,video,audio').forEach(el => el.remove());
        await document.fonts.ready;
        await embedImages(root, images);
        const image = await window.htmlToImage.toJpeg(root, {
          pixelRatio: 1.5, quality: 0.92, backgroundColor: getComputedStyle(document.body).backgroundColor,
          includeQueryParams: true,
        });
        checkCancelled();
        const w = root.offsetWidth, h = root.offsetHeight;
        const W = format === 'pdf' ? 960 : 13.333333, H = format === 'pdf' ? 540 : 7.5;
        const scale = Math.min(W / w, H / h);
        const x = (W - w * scale) / 2, y = (H - h * scale) / 2;
        if (format === 'pdf') {
          if (i) output.addPage();
          output.addImage(image, 'JPEG', x, y, w * scale, h * scale);
        } else output.addSlide().addImage({ data: image, x, y, w: w * scale, h: h * scale });
      }
      checkCancelled();
      status.textContent = '正在產生檔案…';
      const blob = format === 'pdf' ? output.output('blob') : await output.write({ outputType: 'blob' });
      checkCancelled();
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: `${name}.${format}` });
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = `已產生 ${snapshot.pages.length} 頁 ${format.toUpperCase()}。`;
    } catch (error) {
      status.textContent = cancelled ? '已取消匯出。' : error.message || '無法匯出，請確認圖片與字型可讀取後再試。';
    } finally {
      host?.remove(); busy = false;
      close.textContent = '關閉';
      dialog.removeAttribute('aria-busy');
      for (const b of dialog.querySelectorAll('[data-format]')) b.disabled = false;
    }
  };
})();
