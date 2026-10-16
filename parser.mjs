const clean = s => String(s ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFE0F\uFEFF]/g, '').replace(/\u00a0/g, ' ').trim();
const compact = s => clean(s).replace(/\s+/g, ' ');
const pair = (line, label) => {
 const m=line.match(new RegExp(label+'\\s*:?\\s*([\\d.,]+)\\s*(?:[·–—-])\\s*([\\d.,]+)','i'));
 return m ? [Number(m[1].replace(',','.')),Number(m[2].replace(',','.'))] : null;
};
function oddsAfter(lines,pattern,count=3){
 const i=lines.findIndex(x=>pattern.test(x));if(i<0)return null;
 let body=lines[i].replace(pattern,'').trim();if(!body)body=lines[i+1]??'';
 const n=(body.match(/\d+(?:[.,]\d+)?/g)??[]).map(x=>Number(x.replace(',','.')));
 return n.length>=count?n.slice(0,count):null;
}
export function parseMinute(value){
 const m=clean(value).match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*['′’]?$/);
 if(!m)return null;const n=Number(m[1])+Number(m[2]??0);return n>=0&&n<=150?n:null;
}
export function fingerprint(text){let h=2166136261;for(const ch of clean(text)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
export function parseAlert(text){
 const raw=String(text??'').trim();const lines=raw.split(/\r?\n/).map(clean).filter(Boolean);
 const result={raw,source:'unknown',sourceLabel:'Formato da completare',home:'',away:'',league:'',score:null,minute:null,target:'',suggestedStrategy:'',stats:{},odds:{},strikeRate:null,warnings:[],fingerprint:fingerprint(raw)};
 if(!raw){result.warnings.push('Incolla il testo di un alert.');return result;}
 if(/MONEYBAG/i.test(raw)){
  result.source='moneybag';result.sourceLabel='Moneybag / InPlayFlux';result.suggestedStrategy='Over 0.5 SH';
  result.league=compact((lines.find(x=>/^🏆/.test(x))??'').replace(/^🏆\s*/,''));
  const fixture=lines.find(x=>/^⚽/.test(x))?.match(/^⚽\s*(.+?)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.+)$/);
  if(fixture){result.home=compact(fixture[1]);result.away=compact(fixture[4]);result.score=[Number(fixture[2]),Number(fixture[3])];}
  const minute=lines.find(x=>/^⏱/.test(x))?.match(/^⏱\s*(\d{1,3}(?:\s*\+\s*\d{1,2})?)\s*['′’]/);if(minute)result.minute=parseMinute(minute[1]);
  result.target=compact((lines.find(x=>/Target:/i.test(x))??'').split(/Target:/i)[1]??'');
  const shotLine=lines.find(x=>/^🎯\s*Shots\b/i.test(x));if(shotLine){result.stats.shotsOnTarget=pair(shotLine,'Shots');const t=shotLine.split('/')[1];if(t)result.stats.shotsTotal=pair(t,'');}
  for(const [key,label] of [['corners','Corners'],['dangerousAttacks','Danger\\.\\s*Att\\.'],['pressure','Pressure']]){const l=lines.find(x=>new RegExp(label,'i').test(x));if(l)result.stats[key]=pair(l,label);}
  const yc=lines.find(x=>/^🃏/.test(x));if(yc)result.stats.yellowCards=pair(yc.replace(/[🃏🟨]/gu,''),'');
  result.odds.opening=oddsAfter(lines,/^🔵\s*Opening\s*/i);result.odds.prematch=oddsAfter(lines,/^🟡\s*Kickoff\s*/i);result.odds.live=oddsAfter(lines,/^🟢\s*Live\s*/i);
  const ou=lines.find(x=>/O\/U/.test(x))?.match(/O\/U\s*([\d.]+)\s*→\s*([\d.]+).*?Over\s*([\d.]+)\s*Under\s*([\d.]+)/i);
  if(ou)result.odds.asian={openingLine:Number(ou[1]),liveLine:Number(ou[2]),over:Number(ou[3]),under:Number(ou[4])};
 }else{
  const fixture=lines.find(x=>!/[🌎🌍🌏🏆]/u.test(x)&&/^.+?\s+(?:vs\.?|v\.?)\s+.+$/i.test(x));
  if(fixture){const m=fixture.match(/^(.+?)\s+(?:vs\.?|v\.?)\s+(.+)$/i);result.home=compact(m[1]);result.away=compact(m[2]);}
  if(/Next\s+goal/i.test(raw)&&fixture){result.source='next-goal';result.sourceLabel='Next goal';result.suggestedStrategy='Next Goal';}
  result.league=compact((lines.find(x=>/^[🌎🌍🌏🏆]/u.test(x))??'').replace(/^[🌎🌍🌏🏆]\s*/u,'').replace(/\s*\(\d+(?:st|nd|rd|th)?\s+vs\s+\d+(?:st|nd|rd|th)?\)\s*$/i,''));
  const goalLine=lines.find(x=>/^Goals\s*:/i.test(x));if(goalLine)result.score=pair(goalLine,'Goals');
  const timer=lines.find(x=>/^Timer\s*:/i.test(x));if(timer)result.minute=parseMinute(timer.replace(/^Timer\s*:/i,''));
  result.target=/Next\s+goal/i.test(raw)?'Next goal':'';
  const labels={xG:'xG',momentum:'Momentum',shotsOnTarget:'Shots On Target',shotsOffTarget:'Shots Off Target',dangerousAttacks:'Dangerous Attacks',redCards:'Red Cards',penalties:'Penalties',possession:'Possession %',goalsScoredAverage:'Goals Scored Avg\\. \\(Last 5\\)'};
  for(const [key,label] of Object.entries(labels)){const l=lines.find(x=>new RegExp('^'+label+'\\s*:','i').test(x));if(l)result.stats[key]=pair(l,label);}
  result.odds.prematch=oddsAfter(lines,/^1X2 Pre-Match Odds:\s*/i);result.odds.live=oddsAfter(lines,/^1X2 Live Odds:\s*/i);
  result.odds.overUnder=[];
  for(let i=0;i<lines.length;i++){const m=lines[i].match(/^Over\/Under\s+([\d.]+)\s+Odds:\s*(.*)$/i);if(m){const p=(m[2]||lines[i+1]||'').match(/\d+(?:\.\d+)?/g);if(p?.length>=2)result.odds.overUnder.push({line:Number(m[1]),over:Number(p[0]),under:Number(p[1])});}}
  result.odds.bothTeamsScore=oddsAfter(lines,/^Both Teams To Score:\s*/i,2);
  const matched=lines.find(x=>/Matched:/i.test(x))?.match(/Matched:\s*([£€$])\s*([\d,\.]+)/);if(matched)result.matched={currency:matched[1],amount:Number(matched[2].replace(/,/g,''))};
 }
 const sr=raw.match(/Strike Rate:\s*(\d+(?:[.,]\d+)?)%\s*(?:\((\d+)\/(\d+)\))?/i);if(sr)result.strikeRate={rate:Number(sr[1].replace(',','.'))/100,wins:sr[2]?Number(sr[2]):null,total:sr[3]?Number(sr[3]):null};
 if(!result.home||!result.away)result.warnings.push('Controlla e completa i nomi delle squadre.');if(!result.league)result.warnings.push('Completa la lega.');if(result.minute===null)result.warnings.push('Minuto del segnale non riconosciuto.');if(!result.score)result.warnings.push('Risultato del segnale non riconosciuto.');
 result.event=result.home&&result.away?result.home+' - '+result.away:'';
 return result;
}

