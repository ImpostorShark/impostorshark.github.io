
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
    HEAL: document.getElementById('heal') ? +document.getElementById('heal').value : 0
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
