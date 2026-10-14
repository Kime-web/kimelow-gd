(()=>{
'use strict';
const KEY='kimelow-gd-hub-data-v2';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return {...d,levels:Array.isArray(d.levels)?d.levels:[]}}catch{return {levels:[]}}};
const today=()=>new Date().toISOString().slice(0,10);
let data=get();
const params=new URLSearchParams(location.search);
const levelSelect=$('#runsLevel');
function refresh(){
 data=get();const current=levelSelect.value||params.get('level')||'';
 levelSelect.innerHTML=data.levels.length?data.levels.map(l=>`<option value="${esc(l.id)}">${esc(l.name||'Без названия')}</option>`).join(''):'<option value="">Сначала добавь уровень</option>';
 if(data.levels.some(l=>String(l.id)===current))levelSelect.value=current;
 levelSelect.disabled=!data.levels.length;$('#runsForm button').disabled=!data.levels.length;
 render();
}
function render(){const l=data.levels.find(x=>String(x.id)===levelSelect.value);
 if(!l){$('#runsSummary').innerHTML='';$('#runsList').innerHTML='<div class="empty-card">Добавь уровень в Death Tracker, чтобы записывать забеги.</div>';return;}
 const runs=Array.isArray(l.zeroRuns)?l.zeroRuns:[];
 const total=runs.reduce((a,r)=>a+(Number(r.count)||1),0);
 $('#runsSummary').innerHTML=`<div class="stat-card"><span>Записей</span><b>${runs.length}</b></div><div class="stat-card"><span>Смертей с нуля</span><b>${total}</b></div><div class="stat-card"><span>Лучший забег в истории</span><b>${Math.max(0,...runs.map(r=>Number(r.end)||0))}%</b></div>`;
 $('#runsList').innerHTML=runs.length?runs.map((r,i)=>({r,i})).reverse().map(({r,i})=>`<article class="run-row"><div><span class="run-mark">0–${Number(r.end)}${Number(r.count)>1?' ×'+Number(r.count):''}</span><small>${esc(r.date||'')}</small></div><button type="button" class="mini-btn danger" data-delete="${i}">Удалить</button></article>`).join(''):'<div class="empty-card">Записей пока нет. Добавь забеги выше — например, 0-45x2.</div>';
}
function save(){localStorage.setItem(KEY,JSON.stringify(data));window.kimelowSaveRemote?.();render();}
$('#runsForm').addEventListener('submit',e=>{e.preventDefault();const l=data.levels.find(x=>String(x.id)===levelSelect.value);if(!l)return;
 const rows=$('#runsInput').value.split(/\r?\n|[,;]/).map(s=>s.trim()).filter(Boolean),parsed=[];
 for(const row of rows){const m=row.match(/^0\s*[-–—]\s*(\d{1,3})\s*%?\s*(?:[xх×*]\s*(\d{1,5}))?$/i);if(!m||Number(m[1])<1||Number(m[1])>100||Number(m[2]||1)<1||Number(m[2]||1)>10000){$('#runsMessage').textContent='Ошибка в строке «'+row+'». Формат: 0-45x2; процент 1–100, повторения 1–10000.';return;}parsed.push({end:Number(m[1]),count:Number(m[2]||1),date:today()});}
 if(!parsed.length)return;
 l.zeroRuns ||= [];l.zeroRuns.push(...parsed);save();$('#runsInput').value='';$('#runsMessage').textContent=`Добавлено записей: ${parsed.length}.`;
});
$('#runsList').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(!b)return;const l=data.levels.find(x=>String(x.id)===levelSelect.value);const i=Number(b.dataset.delete);if(!l||!Array.isArray(l.zeroRuns)||!Number.isInteger(i)||i<0||i>=l.zeroRuns.length)return;if(!confirm('Удалить эту запись забега?'))return;l.zeroRuns.splice(i,1);save();});
levelSelect.addEventListener('change',()=>{history.replaceState(null,'','runs.html?level='+encodeURIComponent(levelSelect.value));render();});
window.addEventListener('storage',e=>{if(e.key===KEY)refresh();});
refresh();
})();
