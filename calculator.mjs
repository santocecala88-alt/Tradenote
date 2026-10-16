export const round2=n=>Math.sign(n)*Math.round((Math.abs(n)+1e-10)*100)/100;
export function numberInput(value){if(typeof value==='number')return Number.isFinite(value)?value:null;const s=String(value??'').trim().replace(/[€\s]/g,'').replace(',','.');return /^[-+]?\d+(?:\.\d+)?$/.test(s)?Number(s):null;}
const validMinute=n=>Number.isInteger(n)&&n>=0&&n<=150;
export function calculateTrade(form){
 const errors=[];const info=[];const side=form.side==='Lay'?'Lay':'Back';const multi=Boolean(form.multi);
 const rawEntries=multi?(form.entries??[]):[{odds:form.entryOdds,amount:form.amount,minute:form.entryMinute}];
 const entries=[];
 if(rawEntries.length<1||rawEntries.length>12)errors.push('Inserisci da 1 a 12 ingressi.');
 rawEntries.forEach((e,i)=>{
  const odds=numberInput(e.odds),amount=numberInput(e.amount),minute=numberInput(e.minute);
  if(odds===null||odds<=1||odds>1000)errors.push('Quota ingresso '+(i+1)+': usa un valore maggiore di 1 e non oltre 1000.');
  if(amount===null||amount<=0)errors.push('Importo ingresso '+(i+1)+': deve essere positivo.');
  if(!validMinute(minute))errors.push('Minuto ingresso '+(i+1)+': scegli un numero da 0 a 150.');
  let stake=amount;
  if(!multi&&form.basis==='liability'&&side==='Lay'&&odds>1)stake=round2(amount/(odds-1));
  if(stake!==null&&stake<0.01)errors.push('Lo stake abbinato deve essere almeno 0,01 €.');
  entries.push({side,odds,stake:round2(stake??0),minute,phase:'Ingresso'});
 });
 if(entries.some((e,i)=>i>0&&e.minute<entries[i-1].minute))errors.push('Gli ingressi multipli devono essere in ordine di minuto.');
 const rate=numberInput(form.commissionRate);if(rate===null||rate<0||rate>100)errors.push('Commissione: inserisci una percentuale da 0 a 100.');
 const outcome=form.outcome??'Win';const manualMode=form.resultMode??'prices';const actual=numberInput(form.actualResult);
 if(!['prices','gross','net'].includes(manualMode))errors.push('Scegli una modalità risultato valida.');
 if(form.side!=='Back'&&form.side!=='Lay')errors.push('Scegli Back o Lay.');
 if(outcome==='Freebet'&&!['pending','wins','loses'].includes(form.settlement??'pending'))errors.push('Scegli lo stato di regolamento della Freebet.');
 const feeInput=form.actualCommission===''||form.actualCommission===undefined||form.actualCommission===null?null:numberInput(form.actualCommission);
 if(form.actualCommission!==''&&form.actualCommission!==undefined&&form.actualCommission!==null&&(feeInput===null||feeInput<0))errors.push('La commissione effettiva deve essere un importo positivo o zero.');
 if(manualMode!=='prices'&&actual===null)errors.push('Inserisci il risultato effettivo.');
 if(manualMode==='net'&&feeInput===null)errors.push('Con il netto effettivo indica anche la commissione, eventualmente zero.');
 const freebet=outcome==='Freebet',pending=freebet&&(form.settlement??'pending')==='pending',isOpen=outcome==='Aperto'||pending;
 if(!['Win','Lose','Freebet','Pareggio','Aperto'].includes(outcome))errors.push('Scegli un esito valido.');
 if(pending&&manualMode!=='prices')errors.push('Una freebet ancora aperta non ha un profitto definitivo: usa il calcolo da quote.');
 let exitOdds=numberInput(form.exitOdds),exitMinute=numberInput(form.exitMinute),exitStake=null;
 const hasExit=form.exitOdds!==''&&form.exitOdds!==undefined&&form.exitOdds!==null;
 const needsExit=freebet||(outcome!=='Aperto'&&manualMode==='prices');
 if(needsExit&&!hasExit)errors.push('Inserisci la quota di uscita.');
 if(hasExit&&(exitOdds===null||exitOdds<=1||exitOdds>1000))errors.push('Quota uscita: usa un valore maggiore di 1 e non oltre 1000.');
 if((needsExit||hasExit)&&(!validMinute(exitMinute)||exitMinute<Math.max(...entries.map(e=>e.minute??0))))errors.push('Il minuto di uscita deve seguire tutti gli ingressi e non superare 150.');
 if(outcome==='Aperto'&&hasExit)errors.push('Per una copertura senza rischio usa Freebet. Le altre uscite parziali vanno dettagliate nel foglio Esecuzioni.');
 if(errors.length)return {valid:false,errors,info};
 const totalStake=entries.reduce((s,e)=>s+e.stake,0),weighted=entries.reduce((s,e)=>s+e.stake*e.odds,0),entryLiability=entries.reduce((s,e)=>s+e.stake*(e.odds-1),0);
 if(hasExit){
  const custom=form.exitStake!==''&&form.exitStake!==undefined&&form.exitStake!==null;
  exitStake=custom?numberInput(form.exitStake):freebet?(side==='Back'?round2(totalStake):Math.ceil((entryLiability/(exitOdds-1)-1e-10)*100)/100):round2(weighted/exitOdds);
  if(exitStake===null||exitStake<=0)errors.push('Lo stake di uscita deve essere positivo.');
 }
 if(errors.length)return {valid:false,errors,info};
 const legs=[...entries];if(hasExit)legs.push({side:side==='Back'?'Lay':'Back',odds:exitOdds,stake:exitStake,minute:exitMinute,phase:'Uscita'});
 let win=0,lose=0,peak=0;for(const l of legs){win+=l.side==='Back'?l.stake*(l.odds-1):-l.stake*(l.odds-1);lose+=l.side==='Back'?-l.stake:l.stake;peak=Math.max(peak,0,-Math.min(win,lose));}
 const residual=Math.max(0,-Math.min(win,lose));
 if(freebet&&(Math.min(win,lose)<-1e-7||Math.max(win,lose)<0.005))errors.push('Queste quote e questi importi non creano una freebet senza rischio residuo.');
 let gross=null,fees=null,net=null;
 if(!isOpen){
  if(manualMode==='net'){net=round2(actual);fees=round2(feeInput);gross=round2(net+fees);}
  else{
   if(manualMode==='gross')gross=round2(actual);
   else if(freebet)gross=round2(form.settlement==='wins'?win:lose);
   else if(Math.abs(win-lose)<=0.02000001)gross=round2((win+lose)/2);
   else errors.push('La chiusura lascia risultati diversi: inserisci il risultato effettivo oppure correggi lo stake di uscita.');
   if(gross!==null){fees=feeInput===null?round2(Math.max(0,gross)*rate/100):round2(feeInput);net=round2(gross-fees);}
  }
  if(net!==null){if(outcome==='Win'&&net<=0)errors.push('Il risultato calcolato non è un Win. Controlla quote/importi o cambia esito.');if(outcome==='Lose'&&net>=0)errors.push('Il risultato calcolato non è un Lose. Controlla quote/importi o cambia esito.');if(outcome==='Pareggio'&&Math.abs(net)>0.005)errors.push('Il risultato calcolato non è un pareggio.');}
 }
 if(manualMode==='prices'&&!isOpen)info.push('P/L calcolato dagli importi indicati. Per la riconciliazione puoi usare il risultato effettivo del rendiconto.');
 return {valid:errors.length===0,errors,info,side,entries,legs,totalStake:round2(totalStake),liability:round2(entryLiability),averageOdds:weighted/totalStake,exitStake,win:round2(win),lose:round2(lose),peakRisk:round2(peak),residualRisk:round2(residual),gross,fees,net,isOpen,freebet,rate,manualMode,bookOutcome:isOpen?freebet?'Freebet':'Aperto':net>0?'Win':net<0?'Lose':'Pareggio'};
}

