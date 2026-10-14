const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORE_KEY = "kimelow-gd-hub-data-v2";
const OLD_KEY = "kimelow-gd-hub-data-v1";
const toast = $("#toast");
let filter = "all";
let entries = loadData();
let activeDeathLevel = null;
let audioCtx = null;

function loadData(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){ const d=JSON.parse(raw); return {levels:d.levels||[],created:d.created||[],goal:d.goal||{text:"",target:3,unit:"levels"}}; }
    const old=JSON.parse(localStorage.getItem(OLD_KEY)||'{"completed":[],"created":[],"progress":[]}');
    const levels=[];
    (old.completed||[]).forEach(e=>levels.push({id:e.id||uid(),name:e.name||"Без названия",category:"completed",difficulty:e.difficulty||"—",levelId:e.levelId||"",link:e.link||"",video:"",percent:100,goalPercent:100,attempts:Number(e.attempts)||0,date:e.date||"",notes:e.notes||"",deaths:[],records:[{percent:100,date:e.date||today(),attempts:Number(e.attempts)||0}],sessions:[]}));
    (old.progress||[]).forEach(e=>levels.push({id:e.id||uid(),name:e.name||"Без названия",category:e.status==="Планируется"?"planned":"attempting",difficulty:"—",levelId:"",link:"",video:"",percent:0,goalPercent:100,attempts:0,date:"",notes:e.notes||"",deaths:[],records:[],sessions:[]}));
    return {levels,created:(old.created||[]).map(e=>({...e,id:e.id||uid()})),goal:{text:"",target:3,unit:"levels"}};
  } catch { return {levels:[],created:[],goal:{text:"",target:3,unit:"levels"}}; }
}
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(entries));window.kimelowSaveRemote?.();}catch{showToast("Не удалось сохранить данные в браузере.");}}
function uid(){return (crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()));}
function today(){return new Date().toISOString().slice(0,10);}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showToast(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2300);}
function tone(kind="click"){
  try {
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") audioCtx.resume();
    const now=audioCtx.currentTime;
    const notes=kind==="win"?[523.25,659.25,783.99,1046.5]:kind==="record"?[660,880]:[kind==="delete"?180:420];
    notes.forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type="sine";osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,now+i*.075);gain.gain.exponentialRampToValueAtTime(kind==="win"?.12:.045,now+i*.075+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.075+.16);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now+i*.075);osc.stop(now+i*.075+.18);});
  }catch{}
}
document.addEventListener("click",e=>{if(e.target.closest("button")) tone(e.target.closest("[data-win]")?"win":"click");});
function dateLabel(d){if(!d)return "без даты";const x=new Date(d+"T12:00:00");return isNaN(x)?esc(d):x.toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"});}
function categoryName(c){return c==="attempting"?"Прохожу":c==="planned"?"Планирую":"Завершил";}
function validLink(url){return /^https?:\/\//i.test(url||"");}
function openEntry(type="tracker"){
  $("#entryForm").reset();$("#entryType").value=type;$("#entryDate").value=today();
  $("#modalTitle").textContent=type==="created"?"Добавить свой уровень":"Добавить уровень в трекер";
  $("#entryCategory").value=type==="created"?"planned":"attempting";
  $("#entryCategory").disabled=type==="created";
  $("#entryCategory").closest("label")?.classList.toggle("hidden",false);
  $("#entryAttempts").value="0";$("#entryPercent").value="0";$("#entryGoalPercent").value="100";
  $("#modalBackdrop").hidden=false;document.body.style.overflow="hidden";$("#entryName").focus();
}
function closeEntry(){$("#modalBackdrop").hidden=true;document.body.style.overflow="";}
$$("[data-open]").forEach(b=>b.addEventListener("click",()=>openEntry(b.dataset.open)));
$("#closeModal").addEventListener("click",closeEntry);$("#cancelModal").addEventListener("click",closeEntry);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeEntry();});
$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$$(".nav-link").forEach(a=>a.addEventListener("click",()=>{$$(".nav-link").forEach(n=>n.classList.remove("active"));a.classList.add("active");$("#sidebar").classList.remove("open");}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeEntry();closeDeath();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus();}});
$("#entryForm").addEventListener("submit",e=>{
  e.preventDefault();const type=$("#entryType").value;
  const entry={id:uid(),name:$("#entryName").value.trim(),category:$("#entryCategory").value,difficulty:$("#entryDifficulty").value,levelId:$("#entryId").value.trim(),link:$("#entryLink").value.trim(),video:$("#entryVideo").value.trim(),percent:Math.max(0,Math.min(100,Number($("#entryPercent").value)||0)),goalPercent:Math.max(1,Math.min(100,Number($("#entryGoalPercent").value)||100)),attempts:Math.max(0,Number($("#entryAttempts").value)||0),date:$("#entryDate").value,notes:$("#entryNotes").value.trim(),deaths:[],records:[],sessions:[]};
  if(!entry.name)return;
  if(entry.percent>0)entry.records.push({percent:entry.percent,date:entry.date||today(),attempts:entry.attempts});
  if(entry.category==="completed"){entry.percent=100;entry.records.push({percent:100,date:entry.date||today(),attempts:entry.attempts});}
  if(type==="created"){entries.created.unshift({id:entry.id,name:entry.name,levelId:entry.levelId,link:entry.link,video:entry.video,notes:entry.notes,status:"В работе"});showToast("Свой уровень добавлен.");}
  else {entries.levels.unshift(entry);showToast("Уровень добавлен в Death Tracker.");}
  persist();renderAll();
closeEntry();
});
function updateLevel(id,fn){const l=entries.levels.find(x=>x.id===id);if(!l)return;fn(l);persist();renderAll();}
function deleteLevel(id){entries.levels=entries.levels.filter(x=>x.id!==id);persist();renderAll();showToast("Уровень удалён.");tone("delete");}
function recordPercent(id){
  const l=entries.levels.find(x=>x.id===id);if(!l)return;
  const val=prompt(`Новый рекорд для ${l.name} (0–100):`,String(l.percent||0));if(val===null)return;
  const p=Number(val);if(!Number.isInteger(p)||p<0||p>100){showToast("Введи целое число от 0 до 100.");return;}
  const previous=Number(l.percent)||0;l.percent=Math.max(previous,p);l.date=today();l.records=l.records||[];
  if(p>previous||!l.records.some(r=>r.percent===p&&r.date===today()))l.records.push({percent:p,date:today(),attempts:l.attempts||0});
  if(p>previous){tone("record");showToast(`Новый рекорд: ${p}% — ${l.name}!`);}else showToast("Запись добавлена в историю.");
  if(p===100){markComplete(id);}
  persist();renderAll();
}
function addAttempt(id, amount=1){
  if(!Number.isSafeInteger(amount)||amount<1||amount>1000000){showToast("Укажи от 1 до 1 000 000 попыток.");return;}
  updateLevel(id,l=>{l.attempts=(Number(l.attempts)||0)+amount;l.sessions=l.sessions||[];const last=l.sessions[l.sessions.length-1];if(last&&last.date===today())last.attempts=(Number(last.attempts)||0)+amount;else l.sessions.push({date:today(),attempts:amount});});
  showToast(`Добавлено ${amount} попыток.`);
}
function setTotalAttempts(id){
 const level=entries.levels.find(l=>l.id===id);if(!level)return;
 const raw=prompt("Установить общее число попыток (не число добавляемых):",String(level.attempts||0));if(raw===null)return;
 const total=Number(raw.trim());if(!Number.isSafeInteger(total)||total<0||total>100000000){showToast("Нужно целое число от 0 до 100 000 000.");return;}
 updateLevel(id,l=>{l.attempts=total;l.sessions=l.sessions||[];l.sessions.push({date:today(),attempts:0,note:"Общее число попыток исправлено: "+total});});
 showToast("Общее количество попыток исправлено.");
}
function openDeath(id){activeDeathLevel=id;$("#deathForm").reset();$("#deathLevelId").value=id;$("#deathBackdrop").hidden=false;document.body.style.overflow="hidden";$("#deathPercent").focus();}
function closeDeath(){$("#deathBackdrop").hidden=true;if($("#modalBackdrop").hidden)document.body.style.overflow="";}
$("#closeDeath").addEventListener("click",closeDeath);$("#cancelDeath").addEventListener("click",closeDeath);
$("#deathBackdrop").addEventListener("click",e=>{if(e.target===$("#deathBackdrop"))closeDeath();});
$("#deathForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#deathLevelId").value,p=Number($("#deathPercent").value),note=$("#deathNote").value.trim();if(!Number.isInteger(p)||p<0||p>100){showToast("Процент должен быть от 0 до 100.");return;}updateLevel(id,l=>{l.deaths=l.deaths||[];l.deaths.push({percent:p,note,date:today()});});closeDeath();showToast(`Смерть на ${p}% записана.`);});
function addStartPos(id){
  const level=entries.levels.find(x=>x.id===id);if(!level)return;
  const raw=prompt(`Start Pos для ${level.name}: введи диапазон (например, 67-100)`,"67-100");
  if(raw===null)return;
  const match=raw.trim().match(/^(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*%?$/);
  if(!match){showToast("Формат: 67-100");return;}
  const start=Number(match[1]),end=Number(match[2]);
  if(start<0||end>100||start>=end){showToast("Начало должно быть меньше конца, в диапазоне 0–100.");return;}
  updateLevel(id,l=>{l.startPosRuns=l.startPosRuns||[];l.startPosRuns.push({start,end,date:today()});});
  showToast(`Start Pos ${start}–${end}% сохранён.`);
}
function markComplete(id){
  const l=entries.levels.find(x=>x.id===id);if(!l)return;
  if(l.category!=="completed"){l.category="completed";l.percent=100;l.date=today();l.records=l.records||[];if(!l.records.some(r=>r.percent===100))l.records.push({percent:100,date:today(),attempts:l.attempts||0});persist();renderAll();tone("win");showToast(`GG! ${l.name} пройден! +100%`);}
}
function deathCounts(l){const counts={};(l.deaths||[]).forEach(d=>counts[d.percent]=(counts[d.percent]||0)+1);return Object.entries(counts).sort((a,b)=>Number(b[0])-Number(a[0]));}
function renderTracker(){
  let levels=entries.levels.filter(l=>filter==="all"||l.category===filter);
  const q=$("#searchInput").value.trim().toLowerCase();if(q)levels=levels.filter(l=>(l.name+" "+l.levelId+" "+l.difficulty+" "+l.notes).toLowerCase().includes(q));
  $("#trackerCount").textContent=`${levels.length} ${levels.length===1?"уровень":"уровней"}`;
  const grid=$("#trackerGrid");
  if(!levels.length){grid.innerHTML=`<div class="empty-card"><div class="empty-glyph">◈</div><b>${q?"Ничего не найдено":"Трекер пока пуст"}</b><p>${q?"Попробуй другой запрос.":"Добавь уровень, который хочешь пройти, и фиксируй каждый новый рекорд."}</p>${q?"":'<button class="btn subtle" data-open="tracker">＋ Первый уровень</button>'}</div>`;grid.querySelector("[data-open]")?.addEventListener("click",()=>openEntry("tracker"));return;}
  grid.innerHTML=levels.map(l=>{
    const deaths=deathCounts(l),startPos=(l.startPosRuns||[]).map((r,i)=>({...r,originalIndex:i})).slice(-5).reverse(),recent=(l.records||[]).slice(-3).reverse(),sessions=(l.sessions||[]).slice(-2).reverse();
    const link=validLink(l.link)?`<a class="mini-btn" href="${esc(l.link)}" target="_blank" rel="noopener noreferrer">Уровень ↗</a>`:"";
    const video=validLink(l.video)?`<a class="mini-btn" href="${esc(l.video)}" target="_blank" rel="noopener noreferrer">Видео ↗</a>`:"";
    return `<article class="tracker-card" data-level="${esc(l.id)}"><div class="tracker-top"><span class="level-icon">◈</span><div class="tracker-name"><h3>${esc(l.name)}</h3><p>${l.levelId?"ID "+esc(l.levelId)+" · ":""}${esc(l.difficulty||"—")}</p></div><span class="category-pill ${esc(l.category)}">${categoryName(l.category)}</span></div>
    <div class="percent-row"><div><div class="record-label">ЛУЧШИЙ ПРОЦЕНТ</div><div class="percent-big">${Number(l.percent)||0}<small>%</small></div></div><div class="record-label">ЦЕЛЬ: ${Number(l.goalPercent)||100}%</div></div><div class="bar"><span style="width:${Math.max(0,Math.min(100,Number(l.percent)||0))}%"></span></div>
    <div class="metric-grid"><div class="metric"><b>${(Number(l.attempts)||0).toLocaleString("ru-RU")}</b><small>попыток всего</small></div><div class="metric"><b>${(l.sessions||[]).length}</b><small>сессий</small></div><div class="metric"><b>${(l.deaths||[]).length}</b><small>смертей в журнале</small></div></div>
    ${deaths.length?`<div class="death-summary"><h4>ГДЕ ЧАЩЕ УМИРАЮ</h4><div class="death-pills">${deaths.slice(0,6).map(([p,n])=>`<span class="death-pill"><b>${p}%</b> ×${n}</span>`).join("")}</div></div>`:""}
    ${startPos.length?`<div class="startpos-panel"><div class="startpos-title">⚑ START POS <span>${(l.startPosRuns||[]).length} записей</span></div><div class="startpos-runs">${startPos.map(r=>`<span class="startpos-entry"><span class="startpos-chip" title="${dateLabel(r.date)}">${Number(r.start)}–${Number(r.end)}%</span><button class="startpos-remove" data-action="remove-startpos" data-id="${esc(l.id)}" data-index="${r.originalIndex}" title="Удалить Start Pos">×</button></span>`).join("")}</div></div>`:""}
    ${recent.length?`<div class="history-list">${recent.map(r=>`<div class="history-line"><span>Рекорд <b>${r.percent}%</b></span><span>${dateLabel(r.date)}</span></div>`).join("")}</div>`:""}
    ${sessions.length?`<div class="history-list">${sessions.map(s=>`<div class="history-line"><span>Сессия · ${dateLabel(s.date)}</span><span>${s.attempts} попыток</span></div>`).join("")}</div>`:""}
    ${l.notes?`<p class="notes">${esc(l.notes)}</p>`:""}
    <div class="tracker-actions"><button class="mini-btn" data-action="attempt" data-id="${esc(l.id)}">+1</button><button class="mini-btn" data-action="attempt10" data-id="${esc(l.id)}">+10</button><button class="mini-btn" data-action="attempt50" data-id="${esc(l.id)}">+50</button><button class="mini-btn" data-action="attempt100" data-id="${esc(l.id)}">+100</button><button class="mini-btn" data-action="attemptCustom" data-id="${esc(l.id)}">+ Сколько угодно</button><button class="mini-btn" data-action="attemptEdit" data-id="${esc(l.id)}">✎ Исправить</button><button class="mini-btn" data-action="record" data-id="${esc(l.id)}">↗ Рекорд %</button><button class="mini-btn startpos-button" data-action="startpos" data-id="${esc(l.id)}">⚑ Start Pos</button><a class="mini-btn" href="runs.html?level=${encodeURIComponent(l.id)}">▤ Забеги 0–X</a><button class="mini-btn" data-action="death" data-id="${esc(l.id)}">× Записать смерть</button>${link}${video}<button class="mini-btn good" data-action="win" data-id="${esc(l.id)}" data-win>✓ Я прошёл!</button><button class="mini-btn danger" data-action="delete" data-id="${esc(l.id)}">Удалить</button></div></article>`;
  }).join("");
}
function renderCompleted(){
  const done=entries.levels.filter(l=>l.category==="completed");
  $("#completedGrid").innerHTML=done.length?done.map(l=>`<article class="completed-card"><div class="card-row"><b>${esc(l.name)}</b><span class="category-pill completed">100%</span></div><p>${esc(l.difficulty||"—")} · ${Number(l.attempts)||0} попыток · ${dateLabel(l.date)}</p>${l.link&&validLink(l.link)?`<a href="${esc(l.link)}" target="_blank" rel="noopener noreferrer">Открыть уровень ↗</a>`:""}<button class="delete" data-delete-completed="${esc(l.id)}">Убрать из списка</button></article>`).join(""):`<div class="empty-card compact"><b>Пока нет завершённых уровней</b><p>Когда пройдёшь уровень в трекере, он появится здесь.</p></div>`;
}
function renderCreated(){
  $("#createdGrid").innerHTML=entries.created.length?entries.created.map(l=>`<article class="created-card"><div class="card-row"><span class="category-pill">${esc(l.status||"В работе")}</span><button class="delete" data-delete-created="${esc(l.id)}">Удалить</button></div><h3>${esc(l.name)}</h3><p>${l.levelId?"ID "+esc(l.levelId)+" · ":""}${esc(l.notes||"Описание не добавлено.")}</p>${validLink(l.link)?`<a href="${esc(l.link)}" target="_blank" rel="noopener noreferrer">Открыть уровень ↗</a>`:""}${validLink(l.video)?`<br><a href="${esc(l.video)}" target="_blank" rel="noopener noreferrer">Видео ↗</a>`:""}</article>`).join(""):`<div class="empty-card"><div class="empty-glyph">▦</div><b>Твои уровни появятся здесь</b><p>Добавляй собственные работы, ID и ссылки.</p><button class="btn subtle" data-open="created">＋ Добавить свой уровень</button></div>`;
  $("#createdGrid").querySelector("[data-open]")?.addEventListener("click",()=>openEntry("created"));
}
function renderStats(){
  const done=entries.levels.filter(l=>l.category==="completed");
  const active=entries.levels.filter(l=>l.category!=="completed");
  const attempts=entries.levels.reduce((n,l)=>n+(Number(l.attempts)||0),0);
  const best=entries.levels.reduce((n,l)=>Math.max(n,Number(l.percent)||0),0);
  $("#statCompleted").textContent=done.length;$("#statTracking").textContent=active.length;$("#statAttempts").textContent=attempts.toLocaleString("ru-RU");$("#statBest").textContent=entries.levels.length?best+"%":"—";
}
function renderGoal(){
  const g=entries.goal||{text:"",target:3,unit:"levels"};$("#goalText").value=g.text||"";$("#goalTarget").value=g.target||3;$("#goalUnit").value=g.unit||"levels";
  if(!g.text){$("#goalDisplay").innerHTML='<span class="muted">Цель ещё не задана.</span>';return;}
  const done=entries.levels.filter(l=>l.category==="completed"&&(g.unit!=="demons"||String(l.difficulty).toLowerCase().includes("demon"))).length;
  const pct=Math.min(100,Math.round(done/(Number(g.target)||1)*100));
  $("#goalDisplay").innerHTML=`<b>${esc(g.text)}</b><div class="goal-progress"><span style="width:${pct}%"></span></div><span class="muted">${done} из ${Number(g.target)||1} · ${pct}%</span>`;
}
function renderHistory(){
  const records=[];entries.levels.forEach(l=>(l.records||[]).forEach(r=>records.push({...r,name:l.name})));
  records.sort((a,b)=>String(a.date).localeCompare(String(b.date)));const last=records.slice(-12);
  if(!last.length){$("#recordChart").innerHTML='<p class="muted">Добавь рекорд — здесь появится график.</p>';$("#recordHistory").innerHTML="";return;}
  $("#recordChart").innerHTML=last.map(r=>`<div class="chart-column" title="${esc(r.name)}: ${r.percent}%"><span style="height:${Math.max(3,Number(r.percent)||0)}%"></span><small>${Number(r.percent)||0}%</small></div>`).join("");
  $("#recordHistory").innerHTML=last.slice().reverse().slice(0,5).map(r=>`<div><span>${esc(r.name)} · ${dateLabel(r.date)}</span><b>${r.percent}%</b></div>`).join("");
}
function renderAll(){renderTracker();renderCompleted();renderCreated();renderStats();renderGoal();renderHistory();}
$("#trackerGrid").addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(!b)return;const id=b.dataset.id;
  if(b.dataset.action==="attempt")addAttempt(id);
  if(b.dataset.action==="attempt10")addAttempt(id,10);
  if(b.dataset.action==="attempt50")addAttempt(id,50);
  if(b.dataset.action==="attempt100")addAttempt(id,100);
  if(b.dataset.action==="attemptCustom"){
    const raw=prompt("Сколько попыток ДОБАВИТЬ? (1–1 000 000)","25");
    if(raw!==null) addAttempt(id,Number(raw.trim()));
  }
  if(b.dataset.action==="attemptEdit")setTotalAttempts(id);
  if(b.dataset.action==="record")recordPercent(id);
  if(b.dataset.action==="death")openDeath(id);
  if(b.dataset.action==="startpos")addStartPos(id);
  if(b.dataset.action==="remove-startpos"){const i=Number(b.dataset.index),level=entries.levels.find(x=>String(x.id)===String(id));if(level&&Array.isArray(level.startPosRuns)&&Number.isInteger(i)&&i>=0&&i<level.startPosRuns.length&&confirm("Удалить этот Start Pos?"))updateLevel(id,l=>l.startPosRuns.splice(i,1));}
  if(b.dataset.action==="win")markComplete(id);
  if(b.dataset.action==="delete"&&confirm("Удалить этот уровень и его историю?"))deleteLevel(id);
});
$("#completedGrid").addEventListener("click",e=>{const b=e.target.closest("[data-delete-completed]");if(!b)return;if(confirm("Убрать уровень из списка завершённых? Он вернётся в категорию «Прохожу». ")){updateLevel(b.dataset.deleteCompleted,l=>l.category="attempting");showToast("Уровень возвращён в прохождение.");}});
$("#createdGrid").addEventListener("click",e=>{const b=e.target.closest("[data-delete-created]");if(!b)return;if(confirm("Удалить свой уровень?")){entries.created=entries.created.filter(l=>l.id!==b.dataset.deleteCreated);persist();renderAll();showToast("Свой уровень удалён.");}});
$("#categoryFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("selected",x===b));renderTracker();});
$("#searchInput").addEventListener("input",renderTracker);
$("#goalForm").addEventListener("submit",e=>{e.preventDefault();entries.goal={text:$("#goalText").value.trim(),target:Math.max(1,Number($("#goalTarget").value)||1),unit:$("#goalUnit").value};persist();renderGoal();showToast("Цель сохранена.");});
// Единственная маленькая пасхалка: пять кликов по логотипу.
let logoClicks = 0;
let logoClickTimer;
$(".brand-mark").addEventListener("click", e => {
  e.preventDefault();
  logoClicks++;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => { logoClicks = 0; }, 1800);
  if (logoClicks >= 5) {
    logoClicks = 0;
    showToast("Zoink бы сказал: ещё одну попытку 👀");
    tone("record");
  }
});
renderAll();


// Demon List integration: Pointercrate Top 150 + GDBrowser difficulty search.
let demonTab = "top";
let pointercrateDemons = [];
let demonSearchTimer = null;
let demonRequestVersion = 0;
const demonDifficulty = { extreme: 10, insane: 9, hard: 8 };

function safeExternal(url) {
  try { const u = new URL(url, location.href); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; }
  catch { return ""; }
}
function demonText(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.name || v.username || v.display_name || "";
  return "";
}
function pointercrateItem(d) {
  return {
    name: d.name || "Без названия",
    rank: Number(d.position) || null,
    levelId: String(d.level_id || ""),
    verifier: demonText(d.verifier),
    publisher: demonText(d.publisher),
    video: safeExternal(d.video || ""),
    thumbnail: safeExternal(d.thumbnail || ""),
    source: "Pointercrate",
    difficulty: "Extreme Demon"
  };
}
function renderDemonRows(items, kind) {
  const container = $("#demonResults");
  $("#demonCount").textContent = `${items.length} ${items.length === 1 ? "уровень" : "уровней"}`;
  if (!items.length) {
    container.innerHTML = `<div class="demon-empty">Ничего не найдено. Попробуй другое название или открой GDBrowser.</div>`;
    return;
  }
  container.innerHTML = items.map((d, i) => {
    const rank = d.rank ? `#${d.rank}` : (i + 1);
    const rankClass = d.rank === 1 ? "top-one" : "";
    const sub = [d.difficulty || "Demon", d.levelId ? `ID ${d.levelId}` : "", d.verifier ? `Verifier: ${d.verifier}` : "", d.publisher ? `By ${d.publisher}` : ""].filter(Boolean).join(" · ");
    const gdb = d.levelId ? `https://gdbrowser.com/${encodeURIComponent(d.levelId)}` : `https://gdbrowser.com/search`;
    const video = d.video ? `<a class="mini-btn" href="${esc(d.video)}" target="_blank" rel="noopener noreferrer">Видео ↗</a>` : "";
    const searchUrl = `https://gdbrowser.com/search`;
    return `<article class="demon-row">
      <div class="demon-rank ${rankClass}">${esc(rank)}</div>
      <div class="demon-info"><h3>${esc(d.name)}</h3><p>${esc(sub || d.source || "")}</p></div>
      <div class="demon-actions"><span class="demon-badge">${esc(d.difficulty || "Extreme Demon")}</span><button class="mini-btn good" type="button" data-demon-add="${esc(d.name)}" data-demon-id="${esc(d.levelId)}" data-demon-difficulty="${esc(d.difficulty || "Extreme Demon")}" data-demon-link="${esc(gdb)}">＋ В трекер</button><a class="mini-btn" href="${esc(d.levelId ? gdb : searchUrl)}" target="_blank" rel="noopener noreferrer">Открыть ↗</a>${video}</div>
    </article>`;
  }).join("");
}
function renderPointercrate() {
  const q = $("#demonSearch").value.trim().toLowerCase();
  const filtered = pointercrateDemons.filter(d => `${d.name} ${d.verifier} ${d.publisher} ${d.levelId} ${d.rank}`.toLowerCase().includes(q));
  renderDemonRows(filtered, "top");
}
async function loadPointercrate() {
  const version = ++demonRequestVersion;
  $("#demonStatus").textContent = "Подключаем Pointercrate…";
  $("#demonResults").innerHTML = `<div class="empty-card compact"><b>Загружаем Top Demon List…</b><p>Подключение к внешнему источнику.</p></div>`;
  try {
    const urls = [
      "https://pointercrate.com/api/v2/demons/listed/?limit=100",
      "https://pointercrate.com/api/v2/demons/listed/?after=100&limit=50"
    ];
    const responses = await Promise.all(urls.map(url => fetch(url, {headers: {"Accept":"application/json"}})));
    if (version !== demonRequestVersion) return;
    const payloads = await Promise.all(responses.map(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }));
    const unpack = x => Array.isArray(x) ? x : (Array.isArray(x.results) ? x.results : (Array.isArray(x.data) ? x.data : []));
    const combined = [...unpack(payloads[0]), ...unpack(payloads[1])];
    const unique = new Map();
    combined.forEach(d => { const item = pointercrateItem(d); unique.set(item.rank || item.name, item); });
    pointercrateDemons = [...unique.values()].sort((a,b) => (a.rank || 99999) - (b.rank || 99999));
    if (!pointercrateDemons.length) throw new Error("Пустой ответ API");
    $("#demonStatus").textContent = `Источник: Pointercrate · обновлено ${new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}`;
    renderPointercrate();
  } catch (err) {
    if (version !== demonRequestVersion) return;
    $("#demonStatus").textContent = "Не удалось получить актуальный список";
    $("#demonCount").textContent = "";
    $("#demonResults").innerHTML = `<div class="demon-error"><b>Не получилось подключиться к Pointercrate из этого браузера.</b><br>Возможны временная ошибка API, ограничения сети или CORS. Я не буду показывать выдуманный рейтинг. Попробуй обновить или открой <a href="https://pointercrate.com/demonlist/" target="_blank" rel="noopener noreferrer">официальный Top Demon List ↗</a>.</div>`;
  }
}
async function searchGDBrowser(tab, query) {
  const version = ++demonRequestVersion;
  const difficulty = demonDifficulty[tab];
  const url = `https://gdbrowser.com/api/search/${encodeURIComponent(query)}?diff=${difficulty}&type=0`;
  $("#demonStatus").textContent = `Ищем ${tab === "hard" ? "Hard Demon" : tab === "insane" ? "Insane Demon" : "Extreme Demon"} через GDBrowser…`;
  $("#demonResults").innerHTML = `<div class="empty-card compact"><b>Ищем уровни…</b><p>Это поиск по названию, а не глобальный рейтинг.</p></div>`;
  try {
    const response = await fetch(url, {headers: {"Accept":"application/json"}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (version !== demonRequestVersion) return;
    const list = Array.isArray(data) ? data : (Array.isArray(data.levels) ? data.levels : []);
    const items = list.map(d => ({
      name: d.name || "Без названия",
      rank: null,
      levelId: String(d.id || d.levelID || d.level_id || ""),
      verifier: d.author || d.creator || "",
      publisher: "",
      video: "",
      source: "GDBrowser",
      difficulty: tab === "hard" ? "Hard Demon" : tab === "insane" ? "Insane Demon" : "Extreme Demon"
    }));
    $("#demonStatus").textContent = `Источник: GDBrowser · результаты поиска по названию`;
    renderDemonRows(items, tab);
  } catch (err) {
    if (version !== demonRequestVersion) return;
    $("#demonStatus").textContent = "Поиск не удался";
    $("#demonCount").textContent = "";
    $("#demonResults").innerHTML = `<div class="demon-error">Не удалось получить результаты GDBrowser. Проверь подключение и попробуй снова. Можно открыть <a href="https://gdbrowser.com/search" target="_blank" rel="noopener noreferrer">поиск GDBrowser ↗</a> вручную.</div>`;
  }
}
function updateDemonTab(tab) {
  demonTab = tab;
  $$("[data-demon-tab]").forEach(b => b.classList.toggle("selected", b.dataset.demonTab === tab));
  const q = $("#demonSearch").value.trim();
  if (tab === "top") {
    if (pointercrateDemons.length) { $("#demonStatus").textContent = "Источник: Pointercrate"; renderPointercrate(); }
    else loadPointercrate();
  } else if (q.length >= 2) {
    searchGDBrowser(tab, q);
  } else {
    $("#demonStatus").textContent = "Введи минимум 2 символа для поиска по названию";
    $("#demonCount").textContent = "";
    $("#demonResults").innerHTML = `<div class="demon-empty">Hard Demon и Insane Demon не входят в Pointercrate Top 150. Введи название уровня, чтобы найти его через GDBrowser.</div>`;
  }
}
$("#demonTabs").addEventListener("click", e => {
  const b = e.target.closest("[data-demon-tab]");
  if (b) updateDemonTab(b.dataset.demonTab);
});
$("#demonSearch").addEventListener("input", () => {
  clearTimeout(demonSearchTimer);
  demonSearchTimer = setTimeout(() => {
    if (demonTab === "top") renderPointercrate();
    else if ($("#demonSearch").value.trim().length >= 2) searchGDBrowser(demonTab, $("#demonSearch").value.trim());
    else {
      $("#demonStatus").textContent = "Введи минимум 2 символа для поиска по названию";
      $("#demonCount").textContent = "";
      $("#demonResults").innerHTML = `<div class="demon-empty">Введи название уровня для поиска в выбранной сложности.</div>`;
    }
  }, 250);
});
$("#refreshDemonList").addEventListener("click", () => {
  if (demonTab === "top") loadPointercrate();
  else if ($("#demonSearch").value.trim().length >= 2) searchGDBrowser(demonTab, $("#demonSearch").value.trim());
  else updateDemonTab(demonTab);
});
$("#demonResults").addEventListener("click", e => {
  const b = e.target.closest("[data-demon-add]");
  if (!b) return;
  const name = b.dataset.demonAdd;
  const levelId = b.dataset.demonId || "";
  const difficulty = b.dataset.demonDifficulty || "Extreme Demon";
  const link = b.dataset.demonLink || (levelId ? `https://gdbrowser.com/${encodeURIComponent(levelId)}` : "");
  if (entries.levels.some(l => l.levelId && levelId && String(l.levelId) === String(levelId))) {
    showToast("Этот уровень уже есть в твоём трекере.");
    return;
  }
  entries.levels.unshift({id:uid(),name,category:"planned",difficulty,levelId,link,video:"",percent:0,goalPercent:100,attempts:0,date:"",notes:"Добавлен из Demon List",deaths:[],records:[],sessions:[]});
  persist(); renderAll(); showToast(`${name} добавлен в Death Tracker.`);
});
// Initial load happens after the rest of the page has initialized.

loadPointercrate();
