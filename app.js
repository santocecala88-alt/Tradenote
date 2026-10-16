import {parseAlert,calculateTrade,buildExport,STRATEGIES,MARKETS,makeId,localDateTime,campaignKey,numberInput,htmlTable} from './core.mjs';
import {MONEYBAG,NEXT_GOAL} from './samples.mjs';
const $=id=>document.getElementById(id);
const STORAGE='tradenote.v1';
let storageFailed=false,toastTimer,saveTimer,installPrompt=null,duplicate=null;
const read=(key,fallback)=>{try{const s=localStorage.getItem(STORAGE+'.'+key);return s?JSON.parse(s):fallback;}catch{storageFailed=true;return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(STORAGE+'.'+key,JSON.stringify(value));return true;}catch{toast('Salvataggio non riuscito: memoria del browser piena o non disponibile. Esporta un backup.');return false;}};
const defaults={account:'Betfair',commission:'4,5',amount:'40'};
let prefs={...defaults,...read('preferences',{})};
let history=read('history',[]);if(!Array.isArray(history))history=[];
let parsed=parseAlert(''),activeId='',lastCalculation,lastExport;
const fields=['home','away','league','strategy','market','side','outcome','settlement','entryOdds','entryMinute','amount','basis','exitOdds','exitMinute','account','commissionRate','openedAt','closedAt','score','exitReason','resultMode','actualResult','actualCommission','exitStake','plan','notes','screenshot'];
const money=n=>n===null||n===undefined?'—':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(n);
const num=n=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:4}).format(n);
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function option(value,label=value){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function populateMinutes(el,value=''){el.replaceChildren(option('','Scegli…'));for(let n=0;n<=150;n++)el.append(option(String(n),n+'′'));el.value=String(value??'');}
function initLists(){
 $('strategy').append(option('','Scegli…'),...STRATEGIES.map(x=>option(x)));
 $('market').append(option('','Scegli il mercato…'),...MARKETS.map(x=>option(x)));
 document.querySelectorAll('.minute-select').forEach(x=>populateMinutes(x));
 const odds=[1.01,1.05,1.1,1.15,1.2,1.25,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.2,2.5,2.75,3,3.5,4,4.5,5,6,8,10,15,20,50,100];
 $('oddsList').append(...odds.map(n=>option(String(n).replace('.',','))));
 $('amountList').append(...[5,10,15,20,25,30,40,50,75,100,150,200,250,500].map(n=>option(String(n))));
}
function freshForm(){const now=localDateTime();return {id:makeId(),home:'',away:'',league:'',strategy:'',market:'',side:'Back',outcome:'Win',settlement:'pending',entryOdds:'',entryMinute:'',amount:prefs.amount,basis:'stake',multi:false,entries:[],exitOdds:'',exitMinute:'',account:prefs.account,commissionRate:prefs.commission,openedAt:now,closedAt:now,score:'',exitReason:'Manuale',resultMode:'prices',actualResult:'',actualCommission:'',exitStake:'',plan:'Da valutare',notes:'',screenshot:''};}
function readForm(){const f={id:activeId};for(const k of fields)f[k]=$(k).value;f.multi=$('multi').checked;f.entries=[...$('entryRows').children].map(row=>({odds:row.querySelector('[data-entry=odds]').value,amount:row.querySelector('[data-entry=amount]').value,minute:row.querySelector('[data-entry=minute]').value}));return f;}
function fillForm(f){activeId=f.id||makeId();for(const k of fields)$(k).value=f[k]??'';$('multi').checked=Boolean(f.multi);$('entryRows').replaceChildren();for(const e of f.entries??[])addEntry(e,false);if(f.multi&&!f.entries?.length)addEntry({},false);}
function addEntry(data={},renderNow=true){
 if($('entryRows').children.length>=12){toast('Puoi dettagliare fino a 12 ingressi per scheda.');return;}
 const row=document.createElement('div');row.className='entry-row';
 for(const [key,title] of [['odds','Quota'],['amount','Stake €'],['minute','Minuto']]){
  const label=document.createElement('label');label.textContent=title;
  const el=document.createElement(key==='minute'?'select':'input');el.dataset.entry=key;
  if(key==='minute')populateMinutes(el,data[key]);else{el.inputMode='decimal';el.setAttribute('list',key==='odds'?'oddsList':'amountList');el.value=data[key]??'';el.placeholder=key==='odds'?'2,50':'10';}
  label.append(el);row.append(label);
 }
 const remove=document.createElement('button');remove.type='button';remove.className='remove-entry';remove.textContent='×';remove.setAttribute('aria-label','Rimuovi questo ingresso');remove.addEventListener('click',()=>{row.remove();render();scheduleDraft();});row.append(remove);$('entryRows').append(row);if(renderNow){render();scheduleDraft();}
}
function showView(name){for(const n of ['trade','history','settings'])$('view-'+n).hidden=n!==name;for(const t of document.querySelectorAll('[data-view]')){t.classList.toggle('active',t.dataset.view===name);if(t.dataset.view===name)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');}if(name==='history')renderHistory();if(name==='settings'){ $('defaultAccount').value=prefs.account;$('defaultCommission').value=prefs.commission;$('defaultAmount').value=prefs.amount;}window.scrollTo({top:0,behavior:'auto'});}
function reset(){parsed=parseAlert('');$('alertText').value='';fillForm(freshForm());$('advanced').open=false;renderSignal();render();scheduleDraft();}
function consumeAlert(){
 const next=parseAlert($('alertText').value);if(!next.raw){toast('Incolla prima il testo dell’alert.');return;}
 const f=next.fingerprint===parsed.fingerprint?readForm():freshForm();
 parsed=next;Object.assign(f,{home:next.home,away:next.away,league:next.league,score:next.score?next.score.join(' - '):'',strategy:next.suggestedStrategy||f.strategy});
 fillForm(f);renderSignal();render();scheduleDraft();toast(next.source==='unknown'?'Formato parziale: completa i dati mancanti.':'Alert letto. Scegli il mercato e inserisci i dati eseguiti.');
}
function statRow(label,value){const row=document.createElement('div');row.className='stat-row';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=value;row.append(a,b);$('signalDetails').append(row);}
function renderSignal(){
 $('signalCard').hidden=!parsed.raw;$('sourceBadge').textContent=parsed.sourceLabel;
 $('signalEvent').textContent=parsed.event||'Dati da completare';$('signalLeague').textContent=parsed.league||'Lega da completare';
 $('signalMinute').textContent=parsed.minute===null?'—':parsed.minute+'′';$('signalScore').textContent=parsed.score?.join(' - ')||'—';
 $('signalRate').textContent=parsed.strikeRate?num(parsed.strikeRate.rate*100)+'%':'N/D';
 $('parseWarnings').hidden=!parsed.warnings.length;$('parseWarnings').textContent=parsed.warnings.join(' ');
 $('signalDetails').replaceChildren();
 const labels={xG:'xG',momentum:'Momentum',shotsOnTarget:'Tiri in porta',shotsOffTarget:'Tiri fuori',shotsTotal:'Tiri totali',corners:'Corner',dangerousAttacks:'Attacchi pericolosi',pressure:'Pressione',yellowCards:'Gialli',redCards:'Rossi',penalties:'Rigori',possession:'Possesso %',goalsScoredAverage:'Gol medi (ultime 5)'};
 for(const [k,v] of Object.entries(parsed.stats))if(v)statRow(labels[k]||k,v.map(num).join(' · '));
 for(const [k,label] of [['opening','1X2 apertura'],['prematch','1X2 pre-match'],['live','1X2 live']])if(parsed.odds[k])statRow(label,parsed.odds[k].map(num).join(' · '));
 if(parsed.odds.asian)statRow('O/U asiatico '+num(parsed.odds.asian.liveLine),'Over '+num(parsed.odds.asian.over)+' · Under '+num(parsed.odds.asian.under));
 for(const x of parsed.odds.overUnder??[])statRow('O/U '+num(x.line),num(x.over)+' · '+num(x.under));
 if(parsed.odds.bothTeamsScore)statRow('Entrambe a segno',parsed.odds.bothTeamsScore.map(num).join(' · '));
 if(parsed.matched)statRow('Abbinato del segnale',parsed.matched.currency+' '+num(parsed.matched.amount));
 if(!Object.keys(parsed.stats).length)statRow('Dettaglio','Consulta il testo originale');
}
function render(){
 const f=readForm(),c=calculateTrade(f),ex=buildExport(f,parsed,c);
 const unread=$('alertText').value.trim()!==parsed.raw;
 if(unread){ex.valid=false;ex.errors=[...(ex.errors??[]),'Il testo è cambiato: premi Leggi alert prima di copiare.'];ex.tsv='';}
 lastCalculation=c;lastExport=ex;
 $('singleEntry').hidden=f.multi;$('multiEntry').hidden=!f.multi;$('freebetBox').hidden=f.outcome!=='Freebet';$('exitSection').hidden=f.outcome==='Aperto';$('actualResultLabel').hidden=f.resultMode==='prices';
 $('amountLabel').textContent=f.side==='Lay'&&f.basis==='liability'?'Responsabilità ingresso €':'Stake ingresso €';
 $('basis').disabled=f.side!=='Lay';
 $('resultLabel').textContent=c.valid&&c.isOpen?'P/L realizzato':'P/L netto';
 $('netValue').textContent=c.valid?(c.isOpen?'Da regolare':money(c.net)):'—';
 $('netValue').classList.toggle('negative',c.valid&&c.net<0);
 $('grossValue').textContent=c.valid?money(c.gross):'—';$('feeValue').textContent=c.valid?money(c.fees):'—';$('riskValue').textContent=c.valid?money(c.peakRisk):'—';$('residualValue').textContent=c.valid?money(c.isOpen?c.residualRisk:0):'—';
 $('resultCaption').textContent=c.valid?(c.isOpen?c.freebet?'Freebet aperta · nessun profitto ancora contabilizzato':'Posizione aperta':f.resultMode==='prices'?'Calcolato da quote, importi e commissione':'Risultato effettivo indicato'):'Completa i dati eseguiti';
 $('calcDetail').textContent=c.valid?'Stake totale '+money(c.totalStake)+' · quota media '+num(c.averageOdds)+(c.exitStake!==null?' · stake uscita '+money(c.exitStake):'')+(c.freebet?' · potenziale lordo: vince '+money(c.win)+', perde '+money(c.lose):''):'';
 $('validation').hidden=ex.valid;const errors=ex.errors??[];$('validation').replaceChildren();if(errors.length){const ul=document.createElement('ul');for(const e of errors.slice(0,8)){const li=document.createElement('li');li.textContent=e;ul.append(li);}$('validation').append(ul);}
 duplicate=history.find(h=>h.form?.id!==f.id&&campaignKey(h.form)===campaignKey(f)&&f.home&&f.away&&f.market);
 $('duplicateBox').hidden=!duplicate;$('duplicateText').textContent=duplicate?'Esiste già un trade per partita, giorno, mercato e conto. Aggiorna la stessa campagna per evitare un doppio conteggio.':'';
 $('exportText').value=ex.tsv||'';$('copyBtn').disabled=!ex.valid||Boolean(duplicate);$('copyExecutions').disabled=!ex.valid||Boolean(duplicate);
 const existing=history.find(h=>h.form.id===f.id);
 $('draftBadge').textContent=existing?'Scheda '+f.id.slice(-6):'Bozza locale';
 $('pasteHint').textContent=existing?.copiedAt?'ID '+f.id+' · se già incollato, sostituisci la sua riga nel Diario.':'22 colonne · incolla in A della prima riga libera, dalla riga 8';
 $('historyCount').textContent=String(history.length);
}
function scheduleDraft(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>write('draft',{form:readForm(),raw:$('alertText').value,parsedRaw:parsed.raw}),350);}
function commit(copied=false){
 const f=readForm();if(!f.home&&!f.away&&!parsed.raw){toast('Inserisci un alert o i dati della partita.');return false;}
 const i=history.findIndex(h=>h.form.id===f.id);if(i<0&&history.length>=500){toast('Raggiunte 500 schede. Esporta un backup e libera spazio nello storico.');return false;}
 const record={form:f,raw:parsed.raw,updatedAt:new Date().toISOString(),copiedAt:copied?new Date().toISOString():i<0?null:history[i].copiedAt||null};
 const next=[...history];if(i<0)next.unshift(record);else next[i]=record;
 if(!write('history',next))return false;history=next;render();scheduleDraft();return true;
}
async function copy(kind='diary'){
 render();if(!lastExport.valid||duplicate)return;
 const text=kind==='diary'?lastExport.tsv:lastExport.executionTsv;
 let copied=false;
 try{
  if(navigator.clipboard?.write&&globalThis.ClipboardItem){
   const rows=kind==='diary'?[lastExport.row]:lastExport.executionRows;
   await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob([htmlTable(rows)],{type:'text/html'})})]);copied=true;
  }else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}
 }catch{}
 if(!copied){try{const temp=document.createElement('textarea');temp.value=text;temp.style.position='fixed';temp.style.opacity='0';document.body.append(temp);temp.select();copied=document.execCommand('copy');temp.remove();}catch{}}
 if(copied){const saved=commit(kind==='diary');toast((kind==='diary'?'Riga copiata: incolla in Diario, colonna A.':'Esecuzioni copiate: incolla in Esecuzioni, colonna A.')+(saved?'':' Il salvataggio locale non è riuscito.'));}
 else{$('exportText').closest('details').open=true;$('exportText').value=text;$('exportText').focus();$('exportText').select();toast('Copia non consentita dal browser. Tieni premuto il testo selezionato e scegli Copia.');}
}
function loadRecord(record){parsed=parseAlert(record.raw||'');$('alertText').value=record.raw||'';fillForm({...freshForm(),...record.form});renderSignal();render();scheduleDraft();showView('trade');toast('Scheda riaperta. Se aggiorni il foglio, sostituisci la riga con lo stesso ID.');}
function renderHistory(){
 $('historyList').replaceChildren();let complete=0,total=0;
 const sorted=[...history].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 for(const h of sorted){
  const c=calculateTrade(h.form),ex=buildExport(h.form,parseAlert(h.raw||''),c);if(ex.valid&&!c.isOpen){complete++;total+=c.net;}
  const card=document.createElement('article');card.className='card history-item';
  const left=document.createElement('div'),name=document.createElement('p');name.className='fixture';name.textContent=[h.form.home,h.form.away].filter(Boolean).join(' - ')||'Bozza senza partita';
  const meta=document.createElement('p');meta.className='muted';meta.textContent=String(h.form.openedAt||'').replace('T',' · ')+' · '+(h.form.market||'Mercato da scegliere')+' · '+(h.form.side||'');
  const status=document.createElement('span');status.className='pill';status.textContent=ex.valid?c.bookOutcome:'Bozza incompleta';left.append(name,meta,status);
  const right=document.createElement('div');right.className='history-right';const value=document.createElement('div');value.className='amount'+(c.valid&&c.net<0?' negative':'');value.textContent=ex.valid&&!c.isOpen?money(c.net):'—';
  const controls=document.createElement('div');controls.className='history-buttons';const open=document.createElement('button');open.type='button';open.className='text-button';open.textContent='Apri';open.addEventListener('click',()=>loadRecord(h));
  const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Elimina';remove.addEventListener('click',()=>{if(!confirm('Eliminare questa scheda dallo storico locale? Il foglio Excel non viene modificato.'))return;const next=history.filter(x=>x.form.id!==h.form.id);if(write('history',next)){history=next;renderHistory();render();}});
  controls.append(open,remove);right.append(value,controls);card.append(left,right);$('historyList').append(card);
 }
 if(!sorted.length){const empty=document.createElement('div');empty.className='card empty-state';empty.textContent='Qui troverai le schede salvate e le righe preparate per il log.';$('historyList').append(empty);}
 $('historySummary').replaceChildren();for(const text of [history.length+' schede',complete+' complete e chiuse','P/L delle schede chiuse: '+money(total)]){const span=document.createElement('span');span.textContent=text;$('historySummary').append(span);}
}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function validRecord(h){
 if(!h||typeof h!=='object'||!h.form||typeof h.form!=='object'||typeof h.form.id!=='string'||h.form.id.length>100||typeof h.raw!=='string'||h.raw.length>24000)return false;
 if(h.form.entries!==undefined&&(!Array.isArray(h.form.entries)||h.form.entries.length>12||h.form.entries.some(e=>!e||typeof e!=='object')))return false;
 return fields.every(k=>h.form[k]===undefined||['string','number'].includes(typeof h.form[k]))&&Object.values(h.form).every(v=>typeof v!=='string'||v.length<=24000);
}
initLists();const savedDraft=read('draft',null);
if(savedDraft?.form&&validRecord({form:savedDraft.form,raw:savedDraft.raw||''})){parsed=parseAlert(savedDraft.parsedRaw??savedDraft.raw??'');$('alertText').value=savedDraft.raw||'';fillForm({...freshForm(),...savedDraft.form});}else fillForm(freshForm());
history=history.filter(validRecord);
renderSignal();render();
$('parseBtn').addEventListener('click',consumeAlert);
$('sampleMoneybag').addEventListener('click',()=>{$('alertText').value=MONEYBAG;consumeAlert();});
$('sampleNext').addEventListener('click',()=>{$('alertText').value=NEXT_GOAL;consumeAlert();});
$('newBtn').addEventListener('click',()=>{reset();toast('Nuova scheda pronta. Le schede nello storico restano salvate.');});
$('manualBtn').addEventListener('click',()=>{if(!activeId)fillForm(freshForm());$('home').focus();});
$('alertText').addEventListener('input',()=>{render();scheduleDraft();});
$('tradeForm').addEventListener('input',()=>{render();scheduleDraft();});
$('tradeForm').addEventListener('change',e=>{
 if(e.target===$('multi')&&$('multi').checked&&!$('entryRows').children.length)addEntry({odds:$('entryOdds').value,amount:$('amount').value,minute:$('entryMinute').value},false);
 if(e.target===$('strategy')&&['LTD FT','LTD SH','Lay favorita'].includes($('strategy').value))$('side').value='Lay';
 render();scheduleDraft();
});
$('tradeForm').addEventListener('submit',e=>e.preventDefault());
$('addEntry').addEventListener('click',()=>addEntry());
$('saveBtn').addEventListener('click',()=>{if(commit())toast('Scheda salvata nello storico di questo browser.');});
$('copyBtn').addEventListener('click',()=>copy());
$('copyExecutions').addEventListener('click',()=>copy('executions'));
$('loadDuplicate').addEventListener('click',()=>{if(duplicate)loadRecord(duplicate);});
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.view)));
$('settingsForm').addEventListener('submit',e=>{e.preventDefault();const commission=numberInput($('defaultCommission').value),amount=numberInput($('defaultAmount').value);if(!$('defaultAccount').value.trim()||commission===null||commission<0||commission>100||amount===null||amount<=0){toast('Controlla conto, commissione (0–100%) e stake positivo.');return;}const next={account:$('defaultAccount').value.trim(),commission:$('defaultCommission').value,amount:$('defaultAmount').value};if(write('preferences',next)){prefs=next;toast('Preferenze salvate. Saranno proposte nelle nuove schede.');}});
$('backupBtn').addEventListener('click',()=>download('TradeNote_backup_'+localDateTime().slice(0,10)+'.json',JSON.stringify({app:'TradeNote',version:1,exportedAt:new Date().toISOString(),preferences:prefs,records:history,draft:{form:readForm(),raw:$('alertText').value,parsedRaw:parsed.raw}},null,2),'application/json'));
$('exportHistory').addEventListener('click',()=>{
 const valid=history.map(h=>buildExport(h.form,parseAlert(h.raw),calculateTrade(h.form))).filter(e=>e.valid);
 if(!valid.length){toast('Non ci sono schede complete da esportare.');return;}
 download('TradeNote_Diario.tsv','\uFEFF'+valid.map(e=>e.tsv).join('\r\n'),'text/tab-separated-values;charset=utf-8');toast(valid.length+' righe esportate senza intestazione. Controlla gli ID già presenti prima di incollare.');
});
$('restoreFile').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>20*1024*1024)throw Error('File troppo grande.');const data=JSON.parse(await file.text());if(data.app!=='TradeNote'||data.version!==1||!Array.isArray(data.records)||data.records.length>500||!data.records.every(validRecord))throw Error('Backup non compatibile.');
 const ids=new Set();if(data.records.some(h=>ids.has(h.form.id)||!ids.add(h.form.id)))throw Error('Backup con ID duplicati.');
 const map=new Map(history.map(h=>[h.form.id,h]));for(const h of data.records){const old=map.get(h.form.id);if(!old||String(h.updatedAt)>String(old.updatedAt))map.set(h.form.id,h);}
 if(map.size>500)throw Error('Il ripristino supererebbe 500 schede.');const next=[...map.values()];if(write('history',next)){history=next;renderHistory();render();toast('Backup unito allo storico. Gli ID uguali mantengono la scheda più recente.');}
 }catch(err){toast(err.message||'Impossibile leggere il backup.');}finally{e.target.value='';}
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('installBtn').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('installHelp').showModal();});
window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true;toast('TradeNote aggiunta alle tue app.');});
if(window.matchMedia('(display-mode: standalone)').matches)$('installBtn').hidden=true;
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>toast('La modalità offline non è disponibile in questo momento. L’app online resta utilizzabile.'));
if(storageFailed)toast('Il browser non consente il salvataggio locale. Puoi copiare nel log ed esportare il backup.');
