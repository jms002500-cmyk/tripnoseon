// 확인서 글자를 이 폰 안에서 꺼내기 (2026-11-09): PDF는 pdf.js, 사진은 tesseract.js(영문 글자 인식).
//   도구는 처음 쓸 때 한 번 받음(PDF 약 1.7MB, 사진 약 7MB, 그 뒤엔 브라우저에 남음). 확인서 파일은 어디에도 보내지 않음.
//   꺼낸 글은 docparse.js parseDocText가 칸으로 바꿈
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

// PDF → 글 (같은 줄(y)끼리 묶어 왼쪽부터, 앞 6쪽까지)
export async function pdfText(file){
  const pdfjs = await import(PDFJS + 'pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data:new Uint8Array(await file.arrayBuffer()), isEvalSupported:false }).promise;
  const out = [];
  try{
    for(let p = 1; p <= Math.min(doc.numPages, 6); p++){
      const tc = await (await doc.getPage(p)).getTextContent(); const rows = [];
      tc.items.forEach(it => { if(!it.str || !it.str.trim()) return; const y = it.transform[5]; let r = rows.find(q => Math.abs(q.y - y) <= 3); if(!r){ r = { y, xs:[] }; rows.push(r); } r.xs.push({ x:it.transform[4], s:it.str }); });
      rows.sort((a, b) => b.y - a.y).forEach(r => out.push(r.xs.sort((a, b) => a.x - b.x).map(x => x.s).join(' ')));
    }
  } finally { doc.destroy(); }
  return out.join('\n');
}

// 사진 → 글 (영문·숫자: 편명·공항·날짜·예약번호 위주). onProgress(0~1)
let tessLoad = null;
const OCR_LANG = 'kor+eng';   // 한글 확인서 캡처의 날짜(12월 19일)·이름표(예약번호)까지 (처음 한 번 한글 글자 자료를 더 받음)
export async function imageText(file, onProgress, lang){
  if(!window.Tesseract){
    tessLoad = tessLoad || new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = TESS; sc.onload = ok; sc.onerror = () => { tessLoad = null; sc.remove(); no(new Error('load')); }; document.head.appendChild(sc); });
    await tessLoad;
  }
  const w = await window.Tesseract.createWorker(lang || OCR_LANG, 1, { logger:m => { if(onProgress && m && m.status === 'recognizing text') onProgress(m.progress || 0); } });
  try{ const { data } = await w.recognize(file); return (data && data.text) || ''; } finally { await w.terminate(); }
}
