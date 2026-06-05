
let data,currentClass;

async function init(){
 const res=await fetch('data/classes.json');
 data=await res.json();

 const sel=document.getElementById('classSelect');
 data.classes.forEach(c=>{
   const o=document.createElement('option');
   o.value=c.id;o.textContent=c.name;sel.appendChild(o);
 });

 currentClass=data.classes[0];
 initializeLevels();
 render();
 updateSummary();

 sel.addEventListener('change',e=>{
   currentClass=data.classes.find(c=>c.id===e.target.value);
   initializeLevels();
   render();
   updateSummary();
 });

  // If a build is present in the URL, load it (robust to future talents/classes)
  loadBuildFromURL();
  const shareBtn = document.getElementById('shareBtn');
  if(shareBtn) shareBtn.addEventListener('click', createShareLink);
}

function initializeLevels(){
 currentClass.trees.forEach(tree=>{
   tree.talents.forEach(t=>{
      if(t.level===undefined)t.level=0;
   });
 });
}

function computeStats(){
  const stats = {
    PATK:+document.getElementById('patk').value,
    MATK:+document.getElementById('matk').value,
    PDEF:+document.getElementById('pdef').value,
    MDEF:+document.getElementById('mdef').value,
    HP:+document.getElementById('hp').value,
    HEAL: document.getElementById('heal') ? +document.getElementById('heal').value : 0,
    ATTACKSPEED: document.getElementById('attackSpeed') ? +document.getElementById('attackSpeed').value : 100,
    CASTSPEED: document.getElementById('castSpeed') ? +document.getElementById('castSpeed').value : 100,
    HITPERCENT: document.getElementById('hitPercent') ? +document.getElementById('hitPercent').value : 100
  };

  currentClass.trees.forEach(tree=>{
    tree.talents.forEach(t=>{
      if(!t.level) return;
      const lvl = t.levels && t.levels[String(t.level)];
      if(!lvl) return;
      Object.entries(lvl).forEach(([k,v])=>{
        if(k === 'description' || k === 'bonusHeal') return;
        // skip skill-level damage fields (they start with "dmg"), allow percent buffs like patkPercent
        if(/^dmg/.test(k)) return;
        if(stats[k]===undefined) stats[k]=0;
        stats[k]+=v;
      });
    });
  });

  // merge raw patk/matk/hp/heal/pdef/mdef into normalized uppercase stats if present
  if(stats.patk){ stats.PATK = (stats.PATK || 0) + stats.patk; delete stats.patk; }
  if(stats.matk){ stats.MATK = (stats.MATK || 0) + stats.matk; delete stats.matk; }
  if(stats.hp){ stats.HP = (stats.HP || 0) + stats.hp; delete stats.hp; }
  if(stats.heal){ stats.HEAL = (stats.HEAL || 0) + stats.heal; delete stats.heal; }
  if(stats.pdef){ stats.PDEF = (stats.PDEF || 0) + stats.pdef; delete stats.pdef; }
  if(stats.mdef){ stats.MDEF = (stats.MDEF || 0) + stats.mdef; delete stats.mdef; }

  // derive final PATK: base PATK * (1 + PATKPercent)
  let patk = stats.PATK || 0;
  const rawPatkPercent = (stats.patkPercent || 0) + (stats.PATKPercent || 0);
  if(rawPatkPercent) patk = Math.round(patk * (1 + rawPatkPercent / 100));
  stats.PATK = patk;

  // derive final MATK: base MATK * (1 + MATKPercent)
  let matk = stats.MATK || 0;
  const rawMatkPercent = (stats.matkPercent || 0) + (stats.MATKPercent || 0);
  if(rawMatkPercent) matk = Math.round(matk * (1 + rawMatkPercent / 100));
  stats.MATK = matk;

  // derive final HP: base HP * (1 + hpPercent)
  let hp = stats.HP || 0;
  const rawHpPercent = (stats.hpPercent || 0) + (stats.HPPercent || 0);
  if(rawHpPercent) hp = hp * (1 + rawHpPercent / 100);
  stats.HP = Math.round(hp); // keep one decimal to show small percent changes

  // derive final PDEF: base PDEF * (1 + PDEFPercent)
  let pdef = stats.PDEF || 0;
  const rawPdefPercent = (stats.pdefPercent || 0) + (stats.PDEFPercent || 0);
  if(rawPdefPercent) pdef = Math.round(pdef * (1 + rawPdefPercent / 100));
  stats.PDEF = pdef;

  // derive final MDEF: base MDEF * (1 + MDEFPercent)
  let mdef = stats.MDEF || 0;
  const rawMdefPercent = (stats.mdefPercent || 0) + (stats.MDEFPercent || 0);
  if(rawMdefPercent) mdef = Math.round(mdef * (1 + rawMdefPercent / 100));
  stats.MDEF = mdef;

  // derive final Heal: base HEAL + HealPercent
  let heal = stats.HEAL || 0;
  if(stats.healPercent) heal += stats.healPercent;
  if(stats.HealPercent) heal += stats.HealPercent;
  stats.HEAL = Math.round(heal);

  // derive final ATTACKSPEED: base ATTACKSPEED * (1 + attackSpeedPercent)
  let attackSpeed = stats.ATTACKSPEED || 100;
  const rawAttackSpeedPercent = (stats.attackSpeedPercent || 0) + (stats.AttackSpeedPercent || 0);
  if(rawAttackSpeedPercent) attackSpeed = Math.round(attackSpeed * (1 + rawAttackSpeedPercent / 100));
  stats.ATTACKSPEED = attackSpeed;

  // derive final CASTSPEED: base CASTSPEED * (1 + castSpeedPercent)
  let castSpeed = stats.CASTSPEED || 100;
  const rawCastSpeedPercent = (stats.castSpeedPercent || 0) + (stats.CastSpeedPercent || 0);
  if(rawCastSpeedPercent) castSpeed = Math.round(castSpeed * (1 + rawCastSpeedPercent / 100));
  stats.CASTSPEED = castSpeed;

  return stats;
}

function getAvailableSkillPoints(){
  const lvl = Number(document.getElementById('characterLevel').value)/2;
  return Math.max(0, lvl);
}

function getUsedSkillPoints(){
  let used = 0;
  currentClass.trees.forEach(tree=>{
    tree.talents.forEach(t=>{
      used += t.level || 0;
    });
  });
  return used;
}

function updateSkillPointsInfo(){
  const available = getAvailableSkillPoints();
  const used = getUsedSkillPoints();
  const info = document.getElementById('skillPointsInfo');
  if(info){
    info.textContent = `Skill Points: ${used}/${available}`;
  }
}

function findTalent(id){
 for(const tree of currentClass.trees){
   const found=tree.talents.find(t=>t.id===id);
   if(found) return found;
 }
 return null;
}

function canUpgradeTalent(talent, tree){
 const lvl=Number(document.getElementById('characterLevel').value);
 if(lvl < talent.minLevel) return false;

 if(talent.row > 1){
   const prev=tree.talents.find(t=>t.column===talent.column && t.row===talent.row-1);
   if(prev && prev.level < 1) return false;
 }

 if(talent.exclusiveWith){
   for(const ex of talent.exclusiveWith){
      const other=findTalent(ex);
      if(other && other.level>0) return false;
   }
 }

 return true;
}

function changeLevel(id, amount){
 let talent=null, tree=null;

 for(const tr of currentClass.trees){
   const t=tr.talents.find(x=>x.id===id);
   if(t){ talent=t; tree=tr; break; }
 }
 if(amount>0 && !canUpgradeTalent(talent,tree)) return;

 const available = getAvailableSkillPoints();
 const used = getUsedSkillPoints();
 if(amount>0 && used + amount > available) return;

 const next=talent.level+amount;
 if(next<0 || next>talent.maxLevel) return;

 talent.level=next;
 render();
 updateSummary();
}

window.changeLevel=changeLevel;

function render(){
 const container=document.getElementById('treeContainer');
 container.innerHTML='';

 currentClass.trees.forEach(tree=>{
   const wrapper=document.createElement('div');
   wrapper.className='tree-wrapper';

   const title=document.createElement('h2');
   title.className='tree-title';
   title.textContent=tree.name;

   const grid=document.createElement('div');
   grid.className='tree';
   const maxColumn = Math.max(...tree.talents.map(t=>t.column||1));
   grid.style.gridTemplateColumns = `repeat(${Math.max(maxColumn,1)}, 160px)`;

   const available = getAvailableSkillPoints();
   const used = getUsedSkillPoints();
   const outOfPoints = used >= available;
   tree.talents.forEach(t=>{
      const card=document.createElement('div');
      card.className='skill-card';
      card.style.gridColumn=t.column;
      card.style.gridRow=t.row;

      if(!canUpgradeTalent(t,tree) && t.level===0){
        card.classList.add('locked');
      }

      // build card content including current level description and damage calc
      const lvlObj = t.levels && t.levels[String(t.level)];
      let descHtml = '';
      if(lvlObj && lvlObj.description){
        descHtml = `<div class="skill-desc">${lvlObj.description}</div>`;
      }

      // if this level defines a damage percent, compute estimated damage
      let dmgHtml = '';
      let healHtml = '';
      if(lvlObj){
        const stats = computeStats();
        const percentPATK = lvlObj.dmgPATKPercent !== undefined ? Number(lvlObj.dmgPATKPercent) : null;
        const percentMATK = lvlObj.dmgMATKPercent !== undefined ? Number(lvlObj.dmgMATKPercent) : null;
        const percentHP = lvlObj.dmgHPPercent !== undefined ? Number(lvlObj.dmgHPPercent) : null;

        const patkBonus = Number(lvlObj.PATKBonus || lvlObj.PatkBonus || 0);
        const matkBonus = Number(lvlObj.MATKBonus || lvlObj.matkBonus || 0);
        const hpBonus = Number(lvlObj.HPBonus || lvlObj.hpBonus || 0);

        let dmgTotal = 0;
        let healTotal = 0;
        if(percentPATK !== null){
          const patk = (stats.PATK || 0) + patkBonus;
          dmgTotal += (patk) * (percentPATK / 100);
        }
        if(percentMATK !== null){
          const matk = (stats.MATK || 0) + matkBonus;
          dmgTotal += (matk) * (percentMATK / 100);
        }
        if(percentHP !== null){
          const hpv = Number(stats.HP || 0) + hpBonus;
          dmgTotal += (hpv) * (percentHP / 100);
        }

        // dmgHealPercent is damage calculated from the Heal stat
        const percentHealDmg = lvlObj.dmgHealPercent !== undefined ? Number(lvlObj.dmgHealPercent) : null;
        if(percentHealDmg !== null){
          const healStat = (stats.HEAL || 0);
          dmgTotal += healStat * (percentHealDmg / 100);
        }

        // Healing output calculations: support `healPercent` and `bonusHeal`
        const percentHealDirect = lvlObj.healPercent !== undefined ? Number(lvlObj.healPercent) : null;
        const bonusHeal = Number(lvlObj.bonusHeal || lvlObj.BonusHeal || 0);

        if(percentHealDirect !== null){
          const baseHeal = (stats.HEAL || 0) + bonusHeal;
          healTotal += baseHeal * (percentHealDirect / 100);
        }

        if(dmgTotal > 0){
          const dmg = Math.round(dmgTotal * 10) / 10;
          dmgHtml = `<div class="skill-dmg">Est. Damage: ${dmg}</div>`;
        }
        if(healTotal > 0){
          const hv = Math.round(healTotal * 10) / 10;
          healHtml = `<div class="skill-dmg">Est. Heal: ${hv}</div>`;
        }
      }

      const plusDisabled = outOfPoints && t.level < t.maxLevel ? 'disabled' : '';
      const minusDisabled = t.level <= 0 ? 'disabled' : '';
      card.innerHTML=`
        <img src="${t.image}" onerror="this.style.display='none'">
        <div"><strong>${t.name}</strong></div>
        <div class="button-row">
          <button class="skill-btn skill-btn-decr" onclick="changeLevel('${t.id}',-1)" ${minusDisabled}>-</button>
          <button class="skill-btn skill-btn-incr" onclick="changeLevel('${t.id}',1)" ${plusDisabled}>+</button>
        </div>
        <div>Lv ${t.minLevel}</div>
        ${descHtml}
        ${dmgHtml}
        ${healHtml}
        <div class="skill-level">${t.level}/${t.maxLevel}</div>
      `;

      grid.appendChild(card);
   });

   wrapper.appendChild(title);
   wrapper.appendChild(grid);
   container.appendChild(wrapper);
 });
}

// Build serialization: collect currentClass id, inputs, and talent levels (only non-zero)
function getCurrentBuildObject(){
  const obj = { classId: currentClass.id, characterLevel: Number(document.getElementById('characterLevel').value), inputs: {}, talents: {} };
  ['patk','matk','pdef','mdef','hp','heal','attackSpeed','castSpeed','hitPercent'].forEach(k=>{
    const el = document.getElementById(k);
    if(el) obj.inputs[k] = Number(el.value) || 0;
  });
  currentClass.trees.forEach(tree=>{
    tree.talents.forEach(t=>{
      if(t.level && t.level > 0) obj.talents[t.id] = t.level;
    });
  });
  return obj;
}

function encodeBuild(obj){
  try{
    const json = JSON.stringify(obj);
    // URL-safe Base64 (UTF-8 safe)
    const b64 = base64UrlEncode(json);
    return b64;
  }catch(e){
    return '';
  }
}

function decodeBuild(str){
  if(!str) return null;
  // Backwards-compatible: first try URL-decoded JSON (old format), then base64-url
  try{
    const maybeJson = decodeURIComponent(str);
    return JSON.parse(maybeJson);
  }catch(e){
    try{
      const decoded = base64UrlDecode(str);
      return JSON.parse(decoded);
    }catch(e2){
      return null;
    }
  }
}

function base64UrlEncode(str){
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i=0; i<data.length; i+=chunk) {
    binary += String.fromCharCode.apply(null, data.subarray(i, i+chunk));
  }
  let b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(b64u){
  b64u = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64u.length % 4) b64u += '=';
  const bin = atob(b64u);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function createShareLink(){
  const obj = getCurrentBuildObject();
  const encoded = encodeBuild(obj);
  if(!encoded) return alert('Could not encode build');
  const link = location.origin + location.pathname + '?build=' + encoded;
  const input = document.getElementById('shareLink');
  if(input) input.value = link;
  // copy to clipboard when possible
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(()=>{
      alert('Link copied to clipboard');
    }).catch(()=>{
      try{ input.select(); document.execCommand('copy'); alert('Link copied'); }catch(e){ alert(link); }
    });
  }else{
    try{ input.select(); document.execCommand('copy'); alert('Link copied'); }catch(e){ alert(link); }
  }
}

function applyBuildObject(obj){
  if(!obj || !obj.classId) return;
  const cls = data.classes.find(c=>c.id===obj.classId);
  if(!cls) return;
  currentClass = cls;
  const sel = document.getElementById('classSelect');
  if(sel) sel.value = currentClass.id;
  // set inputs
  if(obj.characterLevel !== undefined) document.getElementById('characterLevel').value = obj.characterLevel;
  if(obj.inputs){
    Object.entries(obj.inputs).forEach(([k,v])=>{ const el = document.getElementById(k); if(el) el.value = v; });
  }
  // initialize then set talent levels (clamped to maxLevel)
  initializeLevels();
  if(obj.talents){
    Object.entries(obj.talents).forEach(([tid, lvl])=>{
      for(const tree of currentClass.trees){
        const t = tree.talents.find(x=>x.id===tid);
        if(t){ t.level = Math.max(0, Math.min(t.maxLevel, Number(lvl)||0)); break; }
      }
    });
  }
  render(); updateSummary();
}

function loadBuildFromURL(){
  const params = new URLSearchParams(location.search);
  const b = params.get('build');
  if(!b) return;
  const obj = decodeBuild(b);
  if(!obj) return;
  applyBuildObject(obj);
}

function updateSummary(){
 const stats = computeStats();
 const s=document.getElementById('summary');
 s.innerHTML='';
  Object.entries(stats).forEach(([k,v])=>{
   // hide bonus and dmg-specific entries; show MDMGPercent and PDMGPercent as calculated
   if(k.includes('Bonus') || k.includes('bonus') || k.startsWith('dmg') || (k.endsWith('Percent') && k !== 'MDMGPercent' && k !== 'PDMGPercent') || k === 'healPercent') return;
   const d=document.createElement('div');
   d.innerHTML=`<b>${k}</b>: ${v}`;
   s.appendChild(d);
 });
 updateSkillPointsInfo();
}

document.addEventListener('input',()=>{render();updateSummary();});
init();
