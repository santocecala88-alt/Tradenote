import {round2} from './calculator.mjs';
export const STRATEGIES=['Split Over','LTD FT','LTD SH','Over 0.5 HT','Over 0.5 SH','HT drop asiatico','Lay favorita','Altro','Next Goal'];
export const MARKETS=['Over 0.5 HT','Over 0.5 SH','Over 0.5 FT','Over 1.5 FT','Over 2.5 FT','Over 3.5 FT','Pareggio FT','Pareggio 2T','Prossimo gol','Altro / asiatico'];
export const DIARY_HEADERS=['ID campagna','Data/ora apertura','Data/ora chiusura','Evento','Lega','Strategia','Mercato / selezione','Conto / exchange','Modalità risultato','Stato','Minuto ingresso','Score ingresso','Minuto uscita','Motivo uscita','Rischio manuale €','Risultato manuale €','Commissione effettiva €','Aliquota specifica','Esito selezione','Piano rispettato','Note / errori','Link screenshot'];
export const safeText=v=>{let s=String(v??'').replace(/[\t\r\n]+/g,' ').replace(/\s+/g,' ').trim();return /^[=+@-]/.test(s)?"'"+s:s;};
export const decimal=v=>v===null||v===undefined?'':String(round2(Number(v))).replace('.',',');
export function localDateTime(date=new Date()){const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;}
export function excelDate(value){
 const m=String(value??'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);if(!m)return '';
 const d=new Date(value);if(!Number.isFinite(d.getTime())||d.getFullYear()!==Number(m[1])||d.getMonth()+1!==Number(m[2])||d.getDate()!==Number(m[3])||d.getHours()!==Number(m[4])||d.getMinutes()!==Number(m[5]))return '';
 // Numeric date formula: no translated functions, locale separators or date parsing.
 const days=Math.round(Date.parse(m[1]+'-'+m[2]+'-'+m[3]+'T00:00:00Z')/86400000)+25569;
 const minutes=Number(m[4])*60+Number(m[5]);
 return '='+days+'+'+minutes+'/1440';
}
export function makeId(now=new Date()){const str=localDateTime(now).replace(/[-:T]/g,'');const random=globalThis.crypto?.randomUUID?.().slice(0,6)??Math.random().toString(36).slice(2,8);return 'T'+str+'-'+random.toUpperCase();}
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function campaignKey(form){return [String(form.openedAt??'').slice(0,10),norm(form.home),norm(form.away),norm(form.league),norm(form.market),norm(form.account)].join('|');}
export function buildExport(form,parsed,calc){
 const errors=[...(calc.errors??[])];
 for(const [field,label] of [['home','squadra di casa'],['away','squadra ospite'],['league','lega'],['strategy','strategia'],['market','mercato'],['account','conto / exchange']])if(!String(form[field]??'').trim())errors.push('Completa '+label+'.');
 if(!STRATEGIES.includes(form.strategy))errors.push('Scegli una strategia dell’elenco.');
 if(!excelDate(form.openedAt))errors.push('Controlla la data/ora di ingresso.');
 if((!calc.isOpen||calc.exitStake!==null&&calc.exitStake!==undefined)&&(!excelDate(form.closedAt)||new Date(form.closedAt)<new Date(form.openedAt)))errors.push('La chiusura / copertura deve avere data/ora uguale o successiva all’apertura.');
 if(form.market==='Altro / asiatico'&&form.resultMode==='prices')errors.push('Per un mercato asiatico o particolare inserisci il risultato effettivo.');
 if(!calc.valid||errors.length)return {valid:false,errors:[...new Set(errors)],row:[],tsv:'',executionRows:[]};
 const notes=[];
 if(calc.freebet&&calc.isOpen)notes.push('FREEBET: rischio residuo 0; posizione ancora da regolare.');
 else if(calc.freebet)notes.push('Freebet regolata: selezione '+(form.settlement==='wins'?'vince':'perde')+'.');
 notes.push('Alert: '+(parsed.sourceLabel??'manuale')+(parsed.minute===null?'':` al ${parsed.minute}°`)+'.');
 notes.push(`Ingresso ${calc.side}: stake ${decimal(calc.totalStake)} €, quota media ${Number(calc.averageOdds.toFixed(4))}; `+(calc.exitStake===null?'posizione aperta.':`uscita ${calc.side==='Back'?'Lay':'Back'} ${decimal(calc.exitStake)} € a ${form.exitOdds}.`));
 notes.push(`P/L selezione vince ${decimal(calc.win)} € / perde ${decimal(calc.lose)} €.`);
 if(form.resultMode==='prices'&&!calc.isOpen)notes.push('P/L calcolato da quote e importi.');
 if(parsed.strikeRate)notes.push(`SR segnale ${(parsed.strikeRate.rate*100).toFixed(1)}% (dato del canale).`);
 if(form.notes)notes.push(form.notes);
 if(parsed.raw)notes.push('ALERT ORIGINALE: '+parsed.raw);
 const row=[safeText(form.id),excelDate(form.openedAt),calc.isOpen?'':excelDate(form.closedAt),safeText(`${form.home} - ${form.away}`),safeText(form.league),safeText(form.strategy),safeText(form.market),safeText(form.account),form.resultMode==='net'?'Netto manuale':'Lordo manuale',calc.isOpen?'Aperto':'Chiuso',Math.min(...calc.entries.map(e=>e.minute)),safeText(form.score),calc.exitStake===null?'':Number(form.exitMinute),safeText(form.exitReason||'Manuale'),decimal(calc.peakRisk),calc.isOpen?'':decimal(form.resultMode==='net'?calc.net:calc.gross),calc.isOpen?'':decimal(calc.fees),String(calc.rate).replace('.',',')+'%','',form.plan||'Da valutare',safeText(notes.join(' ')),safeText(form.screenshot||'')];
 const executionRows=calc.legs.map((l,i)=>[safeText(form.id),i+1,excelDate(l.phase==='Uscita'?form.closedAt:form.openedAt),l.phase,l.side,String(l.odds).replace('.',','),decimal(l.stake),l.minute,safeText(form.score),'',safeText('Alert '+(parsed.sourceLabel??'manuale')+'; date/ora indicate nella scheda.')]);
 return {valid:true,errors:[],row,tsv:row.join('\t'),executionRows,executionTsv:executionRows.map(r=>r.join('\t')).join('\n'),notes:notes.join(' ')};
}
export function htmlTable(rows){const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<table>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')+'</table>';}

