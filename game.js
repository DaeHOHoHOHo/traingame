(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const ui={modal:$('modal'),content:$('modalContent'),toast:$('toast'),haul:$('haulMessage'),day:$('dayStat'),timer:$('timerStat'),wallet:$('walletStat'),name:$('contractName'),target:$('targetStat'),progress:$('quotaProgress'),hint:$('contractHint'),depth:$('depthStat'),cargo:$('cargoStat'),cargoProgress:$('cargoProgress'),cargoValue:$('cargoValue'),zone:$('zoneLabel'),control:$('controlHint'),sound:$('audioBtn'),pause:$('pauseBtn')};
const KEY='deep_salvage_contract_v1';
const CONFIG={round:95,baseCosts:{speed:85,capacity:115,luck:140,magnet:165,oxygen:170,sale:195},cap:12};
const upgrades={speed:{name:'강력한 모터',effect:'하강과 인양 속도 +18%',symbol:'⚙'},capacity:{name:'대형 인양망',effect:'화물 적재량 +1.8t',symbol:'▣'},luck:{name:'심해 탐지기',effect:'고급 보물 등장 빈도 증가',symbol:'✦'},magnet:{name:'전자석 집게',effect:'화물 수집 반경 +7',symbol:'◎'},oxygen:{name:'산소 압축기',effect:'계약 제한 시간 +7초',symbol:'◉'},sale:{name:'고가 매각',effect:'인양 매출 +12%',symbol:'◆'}};
const PERKS=[
{id:'gold',icon:'◆',name:'황금 인양',description:'모든 판매 수익 +40%',rarity:'SPECIAL'},
{id:'radius',icon:'◎',name:'초강력 자력',description:'집게 수집 반경 +16',rarity:'SPECIAL'},
{id:'speed',icon:'⇧',name:'심해 급행',description:'줄 내리기·끌어올리기 +35%',rarity:'RARE'},
{id:'mass',icon:'▣',name:'무한 적재',description:'적재 용량 +3.5t',rarity:'RARE'},
{id:'chain',icon:'✧',name:'다중 인양',description:'한 번에 2개 이상 건지면 보너스 배율 상승',rarity:'RARE'},
{id:'pearl',icon:'◈',name:'진주 감정사',description:'진주·유물 수익 +100%',rarity:'SPECIAL'},
{id:'depth',icon:'↓',name:'심해 프리미엄',description:'깊은 곳의 화물 매각가 +50%',rarity:'RARE'},
{id:'time',icon:'◴',name:'산소 비축',description:'다음 계약부터 남은 시간 +18초',rarity:'COMMON'},
{id:'sonar',icon:'⌁',name:'황금 소나',description:'모든 신규 화물의 고급 등장 확률 증가',rarity:'RARE'},
{id:'lucky',icon:'✪',name:'행운의 밧줄',description:'화물 판매 시 20% 확률로 수익 2배',rarity:'SPECIAL'},
{id:'shield',icon:'◇',name:'내충격 케이블',description:'위험물 충돌로 잃는 시간 감소',rarity:'COMMON'},
{id:'regrowth',icon:'⁂',name:'보물 군집',description:'인양 구역에서 발견하는 화물 수 +25%',rarity:'RARE'}
];
const TYPES={
 scrap:{name:'고철',weight:1,value:28,r:12,color:'#97bac6',kind:'scrap'},
 coral:{name:'산호석',weight:1.5,value:57,r:15,color:'#f598a3',kind:'coral'},
 crate:{name:'보급 상자',weight:2.2,value:115,r:17,color:'#e1b378',kind:'crate'},
 pearl:{name:'심해 진주',weight:1,value:190,r:13,color:'#c1f3f3',kind:'pearl'},
 relic:{name:'고대 유물',weight:2.5,value:350,r:17,color:'#d7b0fd',kind:'relic'},
 mine:{name:'폐기 기뢰',weight:0,value:0,r:17,color:'#f57477',kind:'mine'}
};
const names=['가라앉은 부두','난파선 항로','잊힌 화물선','칠흑의 협곡','침몰한 황금도시','끝없는 해구','심연의 낙원'];
const rand=(a=0,b=1)=>a+Math.random()*(b-a),rint=(a,b)=>Math.floor(rand(a,b+1)),clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),fmt=n=>Math.floor(n).toLocaleString('ko-KR');
const emptyLevels=()=>Object.fromEntries(Object.keys(upgrades).map(k=>[k,0]));
let meta={credits:0,best:0,record:0,up:emptyLevels(),lifetime:0,dives:0,wins:0},sound=true,ctxAudio=null;
try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data&&typeof data==='object'){
 meta.credits=clamp(Number(data.credits)||0,0,1e14);meta.best=clamp(Number(data.best)||0,0,1e8);meta.record=clamp(Number(data.record)||0,0,1e14);meta.lifetime=clamp(Number(data.lifetime)||0,0,1e16);meta.dives=Number(data.dives)||0;meta.wins=Number(data.wins)||0;
 for(const k of Object.keys(upgrades))meta.up[k]=clamp(Math.floor(Number(data.up?.[k])||0),0,CONFIG.cap);
}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(meta))}catch(e){}}
const S={mode:'home',stage:1,time:95,quota:940,earned:0,perks:{},perksOptions:[],hookX:.5,aimX:.5,hookDepth:0,phase:'idle',cargo:[],weight:0,camera:0,camTarget:0,objects:[],particles:[],bubbles:[],floaters:[],waves:[],frame:0,sway:0,shake:0,last:0,lastHud:0,haulCount:0,runCoins:0,spawns:0,missionMessage:'',done:false,hold:false,hideMessage:0,toastTime:0,postPerk:false};
let W=800,H=580,dpr=1,accumulator=0;
function resize(){const box=canvas.getBoundingClientRect();W=Math.max(260,Math.round(box.width));H=Math.max(230,Math.round(box.height));dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);resize();
function costOf(key){const lv=meta.up[key]||0;return Math.round(CONFIG.baseCosts[key]*Math.pow(1.64,lv))}
function valueOf(key){return meta.up[key]||0}
function perk(key){return S.perks[key]||0}
function maxLoad(){return 6+valueOf('capacity')*1.8+perk('mass')*3.5}
function magnetRadius(){return 22+valueOf('magnet')*7+perk('radius')*16}
function speedDown(){return (143+valueOf('speed')*23)*(1+perk('speed')*.35)}
function speedUp(){return (185+valueOf('speed')*31)*(1+perk('speed')*.35)}
function deadline(){return CONFIG.round+valueOf('oxygen')*7+perk('time')*18}
function quotaFor(stage){return Math.round(940*Math.pow(2.05,stage-1)/10)*10}
function maxDepth(){return 280+Math.min(800,(S.stage-1)*92)}
function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');S.toastTime=2.15}
function bigText(t){ui.haul.textContent=t;ui.haul.classList.add('show');S.hideMessage=1.65}
function soundNote(freq=650,duration=.06,gain=.034,type='sine'){
 if(!sound)return;try{ctxAudio=ctxAudio||new(window.AudioContext||window.webkitAudioContext)();if(ctxAudio.state==='suspended')ctxAudio.resume();const osc=ctxAudio.createOscillator(),amp=ctxAudio.createGain();osc.type=type;osc.frequency.value=freq;amp.gain.setValueAtTime(gain,ctxAudio.currentTime);amp.gain.exponentialRampToValueAtTime(.0001,ctxAudio.currentTime+duration);osc.connect(amp);amp.connect(ctxAudio.destination);osc.start();osc.stop(ctxAudio.currentTime+duration)}catch(e){}
}
function hideModal(){ui.modal.classList.remove('open');ui.content.innerHTML=''}
function showModal(html){ui.content.innerHTML=html;ui.modal.classList.add('open');S.hold=false;S.phase=S.phase==='down'?'up':S.phase}
function announceStage(){ui.name.textContent=names[Math.min(S.stage-1,names.length-1)]||'심연 인양 계약';ui.day.textContent=String(S.stage).padStart(2,'0')+' / '+Math.max(5,S.stage).toString().padStart(2,'0');ui.hint.textContent=S.stage>=3?'깊은 수역에는 값비싼 보물이 있습니다':'화물을 선상으로 끌어올려 매각하세요'}
function initial(){S.mode='home';S.stage=1;S.earned=0;S.quota=quotaFor(1);S.time=deadline();S.perks={};S.postPerk=false;S.hookDepth=0;S.phase='idle';S.hookX=.5;S.aimX=.5;S.cargo=[];S.weight=0;S.camera=0;S.runCoins=0;S.particles=[];S.floaters=[];S.objects=[];prepareField();announceStage();openHome();updateHud()}
function openHome(){S.mode='home';showModal(`<div class="modal-kicker">SMALL ACTION · BIG PAYOUT</div><h1 class="modal-title">심해 <em>인양 계약</em></h1><p class="modal-copy">바다에 잠든 보물을 크레인으로 낚아 올리세요.<br>손을 떼면 화물이 올라오고, 판매 수익으로 장비를 강화할 수 있습니다. 시간 안에 계약 금액을 채우면 특별한 능력 3개 중 하나를 고를 수 있습니다.</p><div class="result-row"><span class="pill">최고 계약 <b>${meta.best}</b>단계</span><span class="pill">누적 인양 <b>${fmt(meta.lifetime)}</b></span><span class="pill">보유 <b>${fmt(meta.credits)}C</b></span></div><button class="modal-primary" data-action="start">인양 작업 시작 →</button><button class="modal-muted" data-action="dock-home">장비 업그레이드 / 정비소</button><p class="tiny">조작: 화면을 누르고 있으면 하강, 손을 떼면 인양. PC는 스페이스바도 사용 가능.</p>`)}
function startContract(){S.mode='playing';S.done=false;S.time=deadline();S.quota=quotaFor(S.stage);S.earned=0;S.hookDepth=0;S.phase='idle';S.hookX=.5;S.aimX=.5;S.hold=false;S.weight=0;S.cargo=[];S.camera=0;S.camTarget=0;S.haulCount=0;S.particles=[];S.floaters=[];S.objects=[];S.spawns=0;prepareField();hideModal();announceStage();showToast(`계약 ${S.stage} · 목표 ${fmt(S.quota)}C`);updateHud()}
function prepareField(){const total=Math.round((34+Math.min(26,S.stage*6))*Math.pow(W/900,.58))+perk('regrowth')*10;for(let i=0;i<total;i++)spawnObject(true)}
function pickType(){const luck=valueOf('luck')*.065+perk('sonar')*.09;const n=Math.random();if(S.stage>=3&&n<.045)return'mine';if(n<.035+luck*.35)return'relic';if(n<.095+luck*.7)return'pearl';if(n<.31+luck)return'crate';if(n<.59+luck*.7)return'coral';return'scrap'}
function spawnObject(initial=false){const kind=pickType(),cfg=TYPES[kind];let depth=rand(87,maxDepth()-13);const id=S.spawns++;
 const x=rand(.07,.93);
 S.objects.push({id,kind,x,depth,r:cfg.r*rand(.89,1.12),weight:cfg.weight,value:Math.round(cfg.value*(1+.35*(S.stage-1))*(1+(depth/maxDepth())*.65)),phase:rand(0,6.28),vx:rand(-.003,.003),t:rand(0,6.28),taken:false,delay:initial?0:2.2});
}
function buyUpgrade(id){if(!(id in upgrades)||meta.up[id]>=CONFIG.cap)return;const cost=costOf(id);if(meta.credits<cost){showToast('크레딧이 부족합니다');soundNote(170,.13,.025,'sawtooth');return}meta.credits-=cost;meta.up[id]++;save();soundNote(730,.08);setTimeout(()=>soundNote(975,.12),70);const existing=id==='capacity'? '적재 한도 증가':id==='speed'?'크레인 속도 증가':id==='luck'?'희귀 보물 탐지 개선':'영구 강화 완료';showToast(existing);if(S.mode==='dock')openDock();if(S.mode==='homeDock')openDock('home');updateHud()}
function cashFor(item){let p=item.value*(1+valueOf('sale')*.12+perk('gold')*.4);if((item.kind==='pearl'||item.kind==='relic')&&perk('pearl'))p*=1+perk('pearl');if(perk('depth'))p*=1+(item.depth/maxDepth())*.5*perk('depth');return Math.round(p)}
function grab(o){if(o.kind==='mine'){
 o.taken=true;let loss=Math.max(1.3,5.5-perk('shield')*3);S.time=Math.max(0,S.time-loss);S.shake=12;burst(S.hookX*W,hookY(),'#f87881',24,120);soundNote(110,.18,.11,'sawtooth');showToast(`위험물 충돌! -${loss.toFixed(0)}초`);return;
}if(S.weight+o.weight>maxLoad()+.01)return;
o.taken=true;S.cargo.push(o);S.weight+=o.weight;burst(o.x*W,screenY(o.depth),TYPES[o.kind].color,13,80);floatText(o.x*W,screenY(o.depth)-14,'+'+fmt(cashFor(o)),TYPES[o.kind].color);soundNote(500+S.cargo.length*95,.062,.032);
if(o.kind==='relic'||o.kind==='pearl'){S.shake=3;showToast(o.kind==='relic'?'고대 유물 발견!':'심해 진주 발견!')}
if(maxLoad()-S.weight<.95&&S.phase==='down'){S.phase='up';S.hold=false;showToast('화물 가득 참 · 자동 인양')}
}
function haul(){S.phase='idle';S.hookDepth=0;meta.dives++;if(S.cargo.length){
 let subtotal=S.cargo.reduce((n,o)=>n+cashFor(o),0),combo=1+Math.max(0,S.cargo.length-1)*(.15+.13*perk('chain'));let earn=Math.round(subtotal*combo);
 if(perk('lucky')&&Math.random()<.2*perk('lucky')){earn*=2;bigText('LUCKY ×2!')}
 else if(S.cargo.length>=4)bigText('MEGA HAUL!');else if(S.cargo.length>=2)bigText(`COMBO ×${combo.toFixed(1)}`);else bigText(`+${fmt(earn)}C`);
 meta.credits+=earn;meta.lifetime+=earn;S.runCoins+=earn;S.earned+=earn;S.haulCount++;
 for(let i=0;i<34;i++)burst(rand(W*.32,W*.68),rand(70,140),'#ffd67a',1,rand(70,160));
 S.shake=5;soundNote(640,.1,.07);setTimeout(()=>soundNote(870,.14,.065),75);save();
}
S.cargo=[];S.weight=0;
if(S.earned>=S.quota){winContract();return}
if(S.time<=0){failContract();return}
}
function choosePerks(){const shuffled=[...PERKS].sort(()=>Math.random()-.5);return shuffled.filter(p=>(S.perks[p.id]||0)<2).slice(0,3)}
function winContract(){S.mode='perk';S.done=true;meta.best=Math.max(meta.best,S.stage);save();const bonus=Math.round(100*S.stage*Math.pow(1.3,S.stage-1));meta.credits+=bonus;meta.lifetime+=bonus;save();if(S.stage===5){victory();return}S.perksOptions=choosePerks();soundNote(700,.25,.07);setTimeout(()=>soundNote(1040,.25,.06),130);openPerk(bonus)}
function openPerk(bonus){showModal(`<div class="modal-kicker">CONTRACT COMPLETED · ${String(S.stage).padStart(2,'0')}</div><h2 class="modal-title">인양 계약 <em>성공!</em></h2><p class="modal-copy">목표 ${fmt(S.quota)}C 달성 · 성과 보너스 <b style="color:#ffe0a0">+${fmt(bonus)}C</b><br>다음 계약까지 유지할 특수 능력 하나를 선택하세요.</p><div class="perk-grid">${S.perksOptions.map((p,i)=>`<button class="perk" data-perk="${i}"><span class="perk-ic">${p.icon}</span><b>${p.name}</b><small>${p.description}</small><span class="perk-tag">${p.rarity}</span></button>`).join('')}</div><div class="mini-log">강화를 선택하면 다음 계약 준비 화면으로 이동합니다.</div>`)}
function selectPerk(i){if(S.mode!=='perk')return;const item=S.perksOptions[i];if(!item)return;S.perks[item.id]=(S.perks[item.id]||0)+1;S.stage++;S.postPerk=true;S.mode='dock';showToast(`${item.name} 획득!`);openDock();save()}
function openDock(origin){S.mode=origin==='home'?'homeDock':'dock';const tiles=Object.entries(upgrades).map(([key,u])=>{
 let lv=meta.up[key],c=costOf(key),max=lv>=CONFIG.cap;
 return `<button class="dock-tile" data-buy="${key}" ${max||meta.credits<c?'disabled':''}><span><b>${u.symbol} ${u.name} · Lv.${lv}</b><small>${u.effect}</small></span><strong>${max?'MAX':fmt(c)+'C'}</strong></button>`
 }).join('');
 const intro=origin==='home'?'인양 준비':'다음 계약 준비 완료';
 showModal(`<div class="modal-kicker">DOCK · EQUIPMENT WORKSHOP</div><h2 class="modal-title">${intro.split(' ')[0]} <em>${intro.split(' ').slice(1).join(' ')}</em></h2><p class="modal-copy">보유 <b style="color:#ffdd91">${fmt(meta.credits)}C</b> · 장비 강화는 다음 계약에서도 영구 유지됩니다. 깊은 바다를 탐험하기 전에 필요한 장비를 보강하세요.</p><div class="dock-grid">${tiles}</div><button class="modal-primary" data-action="${origin==='home'?'start':'next'}">${origin==='home'?'첫 계약 시작':'계약 '+S.stage+' 시작'} →</button><button class="modal-muted" data-action="${origin==='home'?'back-home':'end-run'}">${origin==='home'?'처음 화면으로':'여기서 탐사 종료 / 기록 저장'}</button>`)}
function failContract(){S.mode='failure';S.done=true;save();showModal(`<div class="modal-kicker">CONTRACT EXPIRED</div><h2 class="modal-title">이번 계약은 <em>실패</em></h2><p class="modal-copy">제한 시간 내에 목표 금액을 모으지 못했습니다. 하지만 인양한 크레딧과 영구 업그레이드는 사라지지 않습니다.</p><div class="result-row"><span class="pill">도전 단계 <b>${S.stage}</b></span><span class="pill">이번 수익 <b>${fmt(S.earned)}C</b></span><span class="pill">목표 <b>${fmt(S.quota)}C</b></span></div><button class="modal-primary" data-action="retry">같은 계약 다시 도전</button><button class="modal-muted" data-action="return">처음부터 새 탐사 (특수 강화 초기화)</button>`)}
function victory(){S.mode='victory';meta.wins++;save();showModal(`<div class="modal-kicker">EXPEDITION COMPLETE · GOLDEN DEPTH</div><h2 class="modal-title">심해 정복 <em>완료!</em></h2><p class="modal-copy">5개의 계약을 모두 완수했습니다. 장비와 크레딧은 영구 보관되며, 더 깊은 계약을 계속 진행할 수 있습니다.</p><div class="result-row"><span class="pill">탐사 수익 <b>${fmt(S.runCoins)}C</b></span><span class="pill">최고 기록 <b>${meta.best}단계</b></span></div><button class="modal-primary" data-action="continue">무한 심해 도전 →</button><button class="modal-muted" data-action="return">새 탐사 시작 (특수 강화 초기화)</button>`)}
function resetRun(){S.stage=1;S.perks={};S.runCoins=0;startContract()}
function endRun(){initial()}
function updateHud(){ui.wallet.textContent=fmt(meta.credits);ui.timer.textContent=S.time<=0?'0:00':`${Math.floor(S.time/60)}:${String(Math.ceil(S.time%60)).padStart(2,'0')}`;ui.target.textContent=fmt(S.earned)+' / '+fmt(S.quota);ui.progress.style.width=clamp(100*S.earned/S.quota,0,100)+'%';ui.cargo.textContent=`${S.weight.toFixed(1)} / ${maxLoad().toFixed(1)}t`;ui.cargoProgress.style.width=clamp(100*S.weight/maxLoad(),0,100)+'%';ui.cargoValue.textContent='예상 수익 +'+fmt(S.cargo.reduce((s,o)=>s+cashFor(o),0));ui.depth.textContent='깊이 '+Math.round(S.hookDepth)+'m';ui.zone.textContent=S.hookDepth>440?'심연 수역':S.hookDepth>220?'저광층':'연안 수역';ui.pause.textContent=S.mode==='paused'?'▶':'Ⅱ';const limit=meta.up;
for(const k of ['speed','capacity','luck']){const button=document.querySelector(`[data-upgrade="${k}"]`);const cost=costOf(k),lv=limit[k];button.disabled=lv>=CONFIG.cap||meta.credits<cost;$(k+'Lv').textContent='Lv.'+lv;$(k+'Cost').textContent=lv>=CONFIG.cap?'MAX':fmt(cost)}
}
function pointerAim(e){const bounds=canvas.getBoundingClientRect();S.aimX=clamp((e.clientX-bounds.left)/bounds.width,.045,.955)}
canvas.addEventListener('pointerdown',e=>{if(S.mode!=='playing')return;pointerAim(e);S.hookX=S.aimX;if(S.phase==='idle'){S.phase='down';S.hold=true;S.haulCount===0&&showToast('손을 떼면 화물이 올라옵니다');soundNote(260,.04,.022)}else if(S.phase==='down')S.hold=true;try{canvas.setPointerCapture(e.pointerId)}catch(err){}});
canvas.addEventListener('pointermove',e=>{if(S.mode==='playing')pointerAim(e)});
function release(){if(S.mode==='playing'&&S.phase==='down'){S.hold=false;S.phase='up'}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);window.addEventListener('blur',()=>{release();if(S.mode==='playing')pauseGame()});
let keyboard=false;window.addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight','KeyP'].includes(e.code))e.preventDefault();if(e.code==='KeyP'){togglePause();return}if(S.mode!=='playing')return;if(e.code==='ArrowLeft')S.aimX=clamp(S.aimX-.045,.05,.95);if(e.code==='ArrowRight')S.aimX=clamp(S.aimX+.045,.05,.95);if(e.code==='Space'&&!keyboard&&S.phase==='idle'){keyboard=true;S.phase='down';S.hold=true}});window.addEventListener('keyup',e=>{if(e.code==='Space'){keyboard=false;release()}});
ui.sound.addEventListener('click',()=>{sound=!sound;ui.sound.textContent=sound?'♪':'×';ui.sound.setAttribute('aria-label',sound?'사운드 끄기':'사운드 켜기');if(sound)soundNote(690,.07)});
ui.pause.addEventListener('click',togglePause);
function pauseGame(){if(S.mode!=='playing')return;S.mode='paused';showModal(`<div class="modal-kicker">PAUSED</div><h2 class="modal-title">잠시 <em>정지</em></h2><p class="modal-copy">계약 시간은 멈춘 상태입니다. 언제든 이어서 인양하세요.</p><button class="modal-primary" data-action="resume">계속 플레이</button><button class="modal-muted" data-action="exit">탐사 종료 / 정비소로</button>`)}
function togglePause(){if(S.mode==='playing')pauseGame();else if(S.mode==='paused'){S.mode='playing';hideModal()}}
document.querySelectorAll('[data-upgrade]').forEach(btn=>btn.addEventListener('click',()=>buyUpgrade(btn.dataset.upgrade)));
ui.content.addEventListener('click',e=>{const perkBtn=e.target.closest('[data-perk]');if(perkBtn){selectPerk(Number(perkBtn.dataset.perk));return}const upgradeBtn=e.target.closest('[data-buy]');if(upgradeBtn){buyUpgrade(upgradeBtn.dataset.buy);return}const btn=e.target.closest('[data-action]');if(!btn)return;switch(btn.dataset.action){case'start':resetRun();break;case'next':startContract();break;case'retry':startContract();break;case'return':endRun();break;case'resume':S.mode='playing';hideModal();break;case'exit':endRun();break;case'continue':S.stage++;startContract();break;case'back-home':openHome();break;case'dock-home':openDock('home');break;case'end-run':endRun();break}});
function screenY(depth){return 132+depth-S.camera}
function hookY(){return screenY(S.hookDepth)}
function burst(x,y,color,count=14,power=80){for(let i=0;i<count;i++)S.particles.push({x,y,vx:rand(-1,1)*power,vy:rand(-1,1)*power,life:rand(.35,.9),max:.9,r:rand(1,3.8),color});if(S.particles.length>300)S.particles.splice(0,80)}
function floatText(x,y,text,color){S.floaters.push({x,y,text,color,life:1.2})}
function update(dt){S.frame+=dt;S.sway+=dt;
if(S.toastTime>0){S.toastTime-=dt;if(S.toastTime<=0)ui.toast.classList.remove('show')}
if(S.hideMessage>0){S.hideMessage-=dt;if(S.hideMessage<=0)ui.haul.classList.remove('show')}
if(S.shake>0)S.shake=Math.max(0,S.shake-dt*38);
for(let i=S.particles.length-1;i>=0;i--){const p=S.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=20*dt;p.vx*=1-dt;p.life-=dt;if(p.life<=0)S.particles.splice(i,1)}
for(let i=S.floaters.length-1;i>=0;i--){const f=S.floaters[i];f.y-=28*dt;f.life-=dt;if(f.life<=0)S.floaters.splice(i,1)}
if(S.mode!=='playing')return;
S.time=Math.max(0,S.time-dt);
if(S.time<=0&&S.phase==='idle'){failContract();return}
if(S.time<=0&&S.phase==='down'){S.phase='up';S.hold=false}
if(S.phase==='idle')S.hookX+=(S.aimX-S.hookX)*Math.min(1,dt*12);
else if(S.phase==='down'){S.hookX+=clamp(S.aimX-S.hookX,-dt*.25,dt*.25);S.hookDepth+=speedDown()*dt;S.hookDepth=Math.min(S.hookDepth,maxDepth());if(S.hookDepth>=maxDepth()-1){S.phase='up';S.hold=false}}
else if(S.phase==='up'){S.hookDepth-=speedUp()*dt;if(S.hookDepth<=0){haul();if(S.mode!=='playing')return}}
S.camTarget=Math.max(0,S.hookDepth-H*.55+140);S.camera+=(S.camTarget-S.camera)*Math.min(1,dt*3.4);
if(S.phase==='down'){
 const px=S.hookX*W,py=hookY(),r=magnetRadius();for(const obj of S.objects){if(obj.taken||obj.delay>0)continue;const ox=obj.x*W,oy=screenY(obj.depth);if(Math.abs(py-oy)<r+obj.r&&Math.hypot(px-ox,py-oy)<r+obj.r*.65)grab(obj)}
}
for(let i=S.objects.length-1;i>=0;i--){const o=S.objects[i];if(o.taken){S.objects.splice(i,1);continue}if(o.delay>0)o.delay-=dt;o.t+=dt;o.x+=Math.sin(o.t*.5+o.phase)*.000018;o.x=clamp(o.x,.06,.94)}
if(S.objects.length<Math.min(85,Math.round((34+Math.min(26,S.stage*6))*Math.pow(W/900,.58))))for(let i=0;i<5;i++)spawnObject();
if(S.frame-S.lastHud>.12){updateHud();S.lastHud=S.frame}
}
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);const depth=S.camera/maxDepth();g.addColorStop(0,depth>.6?'#071929':'#092b40');g.addColorStop(.45,depth>.6?'#071827':'#09314b');g.addColorStop(1,'#040d1b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
// illuminated columns of light
for(let i=0;i<5;i++){const x=W*(i+.3)/5+Math.sin(S.sway*.16+i)*20;const grad=ctx.createLinearGradient(x-65,0,x+90,H);grad.addColorStop(0,'#4ae6ed00');grad.addColorStop(.47,'#75dfd207');grad.addColorStop(1,'#55cee000');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(x-30,0);ctx.lineTo(x+36,0);ctx.lineTo(x+105,H);ctx.lineTo(x-110,H);ctx.closePath();ctx.fill()}
for(let i=0;i<28;i++){const z=(i*83+S.frame*(7+i%4*4))%(H+50);const x=(i*139+39)%W;ctx.globalAlpha=.13+(i%4)*.07;ctx.fillStyle='#a3fff0';ctx.beginPath();ctx.arc(x,z,1.1+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
// underwater altitude guide
for(let d=100;d<=maxDepth();d+=100){const y=screenY(d);if(y<-10||y>H+20)continue;ctx.strokeStyle='#72bbd31d';ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#78a3b3a6';ctx.font='10px system-ui';ctx.fillText(d+'m',Math.max(8,W-48),y-6)}
const surf=screenY(0);if(surf>=-45&&surf<H+50){const water=ctx.createLinearGradient(0,surf-18,0,surf+45);water.addColorStop(0,'#42c7c88a');water.addColorStop(1,'#58d8dc00');ctx.fillStyle=water;ctx.fillRect(0,surf-8,W,53);ctx.strokeStyle='#80dddb';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=W;x+=5){let y=surf+Math.sin(x*.028+S.sway*2.1)*3+Math.sin(x*.065-S.sway)*1.2;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}
// far cliffs decorative
ctx.fillStyle='#04141f80';ctx.beginPath();ctx.moveTo(0,H);for(let i=0;i<=18;i++){const x=i/18*W;ctx.lineTo(x,H-26-(Math.sin(i*1.86+S.camera*.003)+1)*17)}ctx.lineTo(W,H);ctx.fill();
}
function drawBoat(){const yy=screenY(0)-27;if(yy<-120||yy>H+90)return;const x=S.hookX*W;ctx.save();ctx.translate(x,yy+Math.sin(S.sway*1.6)*2);ctx.fillStyle='#f0c77c';ctx.strokeStyle='#382b2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-66,0);ctx.lineTo(68,0);ctx.lineTo(50,21);ctx.lineTo(-50,21);ctx.closePath();ctx.fill();ctx.stroke();roundRect(-34,-25,56,25,4,'#1f5062','#72b1b6');roundRect(-20,-39,20,18,2,'#c2dfdf','#609bb5');ctx.fillStyle='#faf1cc';ctx.fillRect(21,-10,5,6);ctx.strokeStyle='#f6bd75';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-17,-25);ctx.lineTo(-17,-49);ctx.lineTo(18,-54);ctx.lineTo(18,-34);ctx.stroke();ctx.strokeStyle='#273b43';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,-54);ctx.lineTo(9,-35);ctx.stroke();ctx.restore()}
function drawObject(obj){const x=obj.x*W,y=screenY(obj.depth);if(y<-40||y>H+40)return;const typ=TYPES[obj.kind];ctx.save();ctx.translate(x,y);let r=obj.r;const wobble=Math.sin(S.sway*1.7+obj.phase)*2;ctx.translate(0,wobble);if(obj.kind==='scrap'){
ctx.rotate(.32);ctx.fillStyle='#88aebc';ctx.strokeStyle='#415e70';ctx.lineWidth=3;ctx.fillRect(-r*.77,-r*.66,r*1.5,r*1.32);ctx.strokeRect(-r*.77,-r*.66,r*1.5,r*1.32);ctx.fillStyle='#adcbd2';ctx.fillRect(-r*.42,-r*.3,r*.55,r*.36);ctx.fillStyle='#486d79';ctx.fillRect(r*.22,-r*.16,r*.24,r*.82);
}else if(obj.kind==='coral'){
ctx.shadowColor='#ec668e';ctx.shadowBlur=9;ctx.strokeStyle='#fa95a7';ctx.lineWidth=Math.max(4,r*.34);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,r*.75);ctx.lineTo(0,-r*.63);ctx.moveTo(0,0);ctx.lineTo(-r*.64,-r*.65);ctx.moveTo(0,r*.15);ctx.lineTo(r*.65,-r*.47);ctx.stroke();
}else if(obj.kind==='crate'){
ctx.fillStyle='#b9854b';ctx.strokeStyle='#694b34';ctx.lineWidth=3;ctx.fillRect(-r,-r*.72,r*2,r*1.45);ctx.strokeRect(-r,-r*.72,r*2,r*1.45);ctx.strokeStyle='#e9c082';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.75,-r*.7);ctx.lineTo(r*.7,r*.7);ctx.moveTo(-r*.7,r*.7);ctx.lineTo(r*.7,-r*.7);ctx.stroke();
}else if(obj.kind==='pearl'){
ctx.shadowColor='#a4fdff';ctx.shadowBlur=15;const g=ctx.createRadialGradient(-4,-5,2,0,0,r);g.addColorStop(0,'#fff');g.addColorStop(.65,'#b4fdf5');g.addColorStop(1,'#65b9d4');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
}else if(obj.kind==='relic'){
ctx.shadowColor='#b68aff';ctx.shadowBlur=16;ctx.rotate(.15);ctx.fillStyle='#ae8feb';ctx.strokeStyle='#f1dbff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.9,0);ctx.lineTo(0,r);ctx.lineTo(-r*.9,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#fff5d4';ctx.beginPath();ctx.arc(0,0,r*.26,0,6.29);ctx.fill();
}else{
ctx.shadowColor='#ed6877';ctx.shadowBlur=9;ctx.fillStyle='#b3505b';ctx.beginPath();ctx.arc(0,0,r*.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ef8790';ctx.lineWidth=3;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(Math.cos(i*.785)*r*.58,Math.sin(i*.785)*r*.58);ctx.lineTo(Math.cos(i*.785)*r,Math.sin(i*.785)*r);ctx.stroke()}ctx.fillStyle='#edbbbb';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('!',0,4)
}ctx.restore()}
function drawHook(){const x=S.hookX*W,y=hookY(),surf=screenY(0)-55;ctx.strokeStyle='#c9dfe5';ctx.lineWidth=2.8;ctx.shadowColor='#9bd9ee';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(x,surf);ctx.lineTo(x+Math.sin(S.sway*1.7)*2,y-4);ctx.stroke();ctx.shadowBlur=0;
if(S.phase==='down'){ctx.strokeStyle='#a6e7d125';ctx.setLineDash([7,12]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,Math.min(H,y+80));ctx.stroke();ctx.setLineDash([])}
ctx.fillStyle='#ffda93';ctx.strokeStyle='#70543b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#a4e1df';ctx.lineCap='round';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-7,y-2);ctx.lineTo(x-10,y+15);ctx.lineTo(x,y+21);ctx.lineTo(x+10,y+15);ctx.lineTo(x+7,y-2);ctx.stroke();ctx.strokeStyle='#72e5d443';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y+11,magnetRadius(),0,Math.PI*2);ctx.stroke();
for(let i=0;i<S.cargo.length;i++){const cfg=TYPES[S.cargo[i].kind],angle=(i/(S.cargo.length||1))*Math.PI*2+S.sway*.7;const ox=x+Math.cos(angle)*(21+Math.floor(i/5)*13),oy=y+24+Math.sin(angle)*12;ctx.fillStyle=cfg.color;ctx.shadowColor=cfg.color;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(ox,oy,5+(i%2)*2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
}
function drawParticles(){for(const p of S.particles){ctx.globalAlpha=clamp(p.life*1.5,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;for(const f of S.floaters){ctx.globalAlpha=clamp(f.life,0,1);ctx.font='900 16px system-ui';ctx.textAlign='center';ctx.fillStyle='#001625';ctx.fillText(f.text,f.x+1,f.y+2);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y)}ctx.globalAlpha=1}
function draw(){ctx.save();if(S.shake>0)ctx.translate(rand(-S.shake,S.shake)*.45,rand(-S.shake,S.shake)*.45);drawBackground();for(const obj of S.objects)drawObject(obj);drawBoat();drawHook();drawParticles();ctx.restore()}
function loop(t){const dt=Math.min(.06,(t-(S.last||t))/1000);S.last=t;update(dt);draw();requestAnimationFrame(loop)}
function testExpose(){if(!new URLSearchParams(location.search).has('dev'))return;window.__salvageTest={get:()=>({mode:S.mode,stage:S.stage,time:S.time,earned:S.earned,credits:meta.credits,cargo:S.cargo.length,phase:S.phase,up:{...meta.up},perks:{...S.perks},objects:S.objects.length,w:document.body.scrollWidth,h:document.body.scrollHeight,screenW:innerWidth,screenH:innerHeight}),win:()=>{if(S.mode==='playing'){S.earned=S.quota;winContract()}},fail:()=>{if(S.mode==='playing')failContract()},cash:n=>{meta.credits+=n;save();updateHud()},spawnAtHook:()=>{S.objects.push({id:++S.spawns,kind:'relic',x:S.hookX,depth:Math.max(100,S.hookDepth+30),r:17,weight:2.5,value:700,t:0,phase:0,delay:0,taken:false})},fast:(n=10)=>{for(let i=0;i<n*20;i++)update(.05)},simDive:(x=.5,n=45)=>{S.aimX=x;S.hookX=x;S.phase='down';for(let i=0;i<n&&S.mode==='playing';i++)update(.05);if(S.mode==='playing')S.phase='up';for(let i=0;i<220&&S.phase==='up'&&S.mode==='playing';i++)update(.05);return {earned:S.earned,mode:S.mode,credits:meta.credits,hauls:S.haulCount}}}
}
initial();testExpose();requestAnimationFrame(loop);
})();