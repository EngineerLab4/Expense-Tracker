(function(){
  const CATEGORIES = [
    {id:'food', name:'Food & Dining', color:'#D4A54C', icon:'🍽️'},
    {id:'transport', name:'Transport', color:'#45B8A4', icon:'🚕'},
    {id:'shopping', name:'Shopping', color:'#8B7FD1', icon:'🛍️'},
    {id:'bills', name:'Bills & Utilities', color:'#5B93C4', icon:'💡'},
    {id:'entertainment', name:'Entertainment', color:'#DD6B8F', icon:'🎬'},
    {id:'health', name:'Health', color:'#6FBF73', icon:'💊'},
    {id:'groceries', name:'Groceries', color:'#C98A4B', icon:'🛒'},
    {id:'other', name:'Other', color:'#8D96A5', icon:'✦'}
  ];

  const STORAGE_KEY = 'expense_tracker_v1';

  let transactions = [];
  let monthlyBudget = 30000;
  let selectedCat = 'food';
  let theme = 'dark';

  // ---- persistence (saves to this device's browser storage) ----
  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({transactions, monthlyBudget, theme}));
    }catch(e){ /* storage unavailable in this preview — fine once opened on your own device */ }
  }
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const data = JSON.parse(raw);
        transactions = Array.isArray(data.transactions) ? data.transactions : [];
        monthlyBudget = typeof data.monthlyBudget === 'number' ? data.monthlyBudget : 30000;
        theme = data.theme === 'light' ? 'light' : 'dark';
      }
    }catch(e){ /* ignore — start fresh */ }
  }
  loadState();

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0});

  const todayStr = () => new Date().toISOString().slice(0,10);
  document.getElementById('dateInput').value = todayStr();
  document.getElementById('budgetInput').value = monthlyBudget;

  // ---- theme ----
  const root = document.documentElement;
  function setTheme(t){
    theme = t;
    root.setAttribute('data-theme', t);
    document.getElementById('btn-dark').classList.toggle('active', t==='dark');
    document.getElementById('btn-light').classList.toggle('active', t==='light');
    saveState();
  }
  setTheme(theme);
  document.getElementById('btn-dark').onclick = () => setTheme('dark');
  document.getElementById('btn-light').onclick = () => setTheme('light');

  // ---- category picker ----
  const catPicker = document.getElementById('catPicker');
  CATEGORIES.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip' + (c.id===selectedCat ? ' selected' : '');
    chip.dataset.cat = c.id;
    chip.style.background = c.id===selectedCat ? c.color : '';
    chip.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.icon} ${c.name}`;
    chip.onclick = () => {
      selectedCat = c.id;
      [...catPicker.children].forEach(ch => {
        const cc = CATEGORIES.find(x=>x.id===ch.dataset.cat);
        ch.classList.toggle('selected', ch===chip);
        ch.style.background = ch===chip ? cc.color : '';
      });
    };
    catPicker.appendChild(chip);
  });

  // ---- budget input ----
  document.getElementById('budgetInput').addEventListener('input', (e)=>{
    monthlyBudget = Number(e.target.value) || 0;
    saveState();
    render();
  });

  // ---- digit roll animation ----
  function animateNumber(el, from, to, duration=800){
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now-start)/duration);
      const eased = 1 - Math.pow(1-p, 3);
      const val = Math.round(from + (to-from)*eased);
      el.textContent = fmt(val);
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  let lastDialValue = 0;

  function computeStats(){
    const now = new Date();
    const today = todayStr();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-6);
    const monthKey = now.toISOString().slice(0,7);

    let totalToday=0, totalWeek=0, totalMonth=0;
    const catTotals = {};

    transactions.forEach(t => {
      const d = new Date(t.date+'T00:00:00');
      if(t.date === today) totalToday += t.amount;
      if(d >= weekAgo) totalWeek += t.amount;
      if(t.date.slice(0,7) === monthKey){
        totalMonth += t.amount;
        catTotals[t.category] = (catTotals[t.category]||0) + t.amount;
      }
    });

    return {totalToday, totalWeek, totalMonth, catTotals};
  }

  function render(){
    const {totalToday, totalWeek, totalMonth, catTotals} = computeStats();
    const dailyBudget = monthlyBudget / 30;

    // dial
    const pct = dailyBudget > 0 ? Math.min(1, totalToday/dailyBudget) : 0;
    const circumference = 590;
    const dialFg = document.getElementById('dialFg');
    dialFg.style.strokeDashoffset = circumference - (circumference*pct);
    let dialColor = 'var(--gold)';
    if(dailyBudget>0){
      if(totalToday > dailyBudget) dialColor = 'var(--coral)';
      else if(totalToday > dailyBudget*0.7) dialColor = 'var(--gold)';
      else dialColor = 'var(--teal)';
    }
    dialFg.style.stroke = dialColor;

    animateNumber(document.getElementById('dialAmount'), lastDialValue, totalToday);
    lastDialValue = totalToday;
    document.getElementById('dialLabel').textContent = dailyBudget>0 ? `of ${fmt(Math.round(dailyBudget))} budget` : 'no budget set';

    const sub = document.getElementById('dialSub');
    if(dailyBudget<=0){ sub.innerHTML = 'Set a monthly budget below to track your daily pace.'; }
    else if(totalToday > dailyBudget){ sub.innerHTML = `You're <b style="color:var(--coral)">over</b> today's pace by ${fmt(totalToday-dailyBudget)}.`; }
    else { sub.innerHTML = `<b style="color:var(--teal)">${fmt(dailyBudget-totalToday)}</b> left in today's pace.`; }

    document.getElementById('statWeek').textContent = fmt(totalWeek);
    document.getElementById('statMonth').textContent = fmt(totalMonth);

    // category breakdown
    const bd = document.getElementById('categoryBreakdown');
    const entries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    if(entries.length===0){
      bd.innerHTML = '<div class="empty-note">No expenses logged this month yet — add your first one.</div>';
    } else {
      const max = entries[0][1];
      bd.innerHTML = entries.map(([catId, amt]) => {
        const c = CATEGORIES.find(x=>x.id===catId);
        const w = Math.max(4, (amt/max)*100);
        return `<div class="cat-bar-row">
          <div class="cat-bar-top">
            <span class="name"><span class="dot" style="background:${c.color}"></span>${c.icon} ${c.name}</span>
            <span class="amt">${fmt(amt)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${w}%; background:${c.color};"></div></div>
        </div>`;
      }).join('');
    }

    // ledger list
    const list = document.getElementById('ledgerList');
    if(transactions.length===0){
      list.innerHTML = '<div class="empty-note">Your ledger is empty. Every expense you add will appear here, automatically grouped and totalled.</div>';
    } else {
      const byDate = {};
      [...transactions].sort((a,b)=> (b.date+b.id).localeCompare(a.date+a.id)).forEach(t=>{
        (byDate[t.date] = byDate[t.date] || []).push(t);
      });
      const dateKeys = Object.keys(byDate).sort().reverse();
      list.innerHTML = dateKeys.map(date => {
        const dayTotal = byDate[date].reduce((s,t)=>s+t.amount,0);
        const label = formatDayLabel(date) + ' · ' + fmt(dayTotal);
        const rows = byDate[date].map(t => {
          const c = CATEGORIES.find(x=>x.id===t.category);
          return `<div class="txn">
            <div class="cat-dot" style="background:${c.color}22; color:${c.color};">${c.icon}</div>
            <div class="info">
              <div class="cat-name">${c.name}</div>
              ${t.note ? `<div class="note">${escapeHtml(t.note)}</div>` : ''}
            </div>
            <div class="amt">${fmt(t.amount)}</div>
            <button class="del" data-id="${t.id}" title="Delete">✕</button>
          </div>`;
        }).join('');
        return `<div class="day-group"><div class="day-label">${label}</div>${rows}</div>`;
      }).join('');

      list.querySelectorAll('.del').forEach(btn => {
        btn.onclick = () => {
          transactions = transactions.filter(t => t.id !== btn.dataset.id);
          saveState();
          render();
        };
      });
    }
  }

  function formatDayLabel(dateStr){
    const d = new Date(dateStr+'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const yest = new Date(today); yest.setDate(today.getDate()-1);
    if(d.getTime()===today.getTime()) return 'Today';
    if(d.getTime()===yest.getTime()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'});
  }

  function escapeHtml(s){
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  document.getElementById('expenseForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const amount = Number(document.getElementById('amountInput').value);
    const date = document.getElementById('dateInput').value || todayStr();
    const note = document.getElementById('noteInput').value.trim();
    if(!amount || amount<=0) return;

    transactions.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      amount, category: selectedCat, note, date
    });

    document.getElementById('amountInput').value = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('amountInput').focus();
    saveState();
    render();
  });

  render();
})();
