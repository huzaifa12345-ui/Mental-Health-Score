const $ = s => document.querySelector(s);
const form = $('#form'), out = $('#out'), apiUrl = $('#apiUrl');
apiUrl.value = localStorage.getItem('mh_api') || apiUrl.value;

const rules = {
  age:{t:'int',min:10,max:100,m:'Enter a whole number from 10 to 100.'},
  country:{t:'str',m:'Enter a country.'},
  gender:{t:'radio',m:'Select a gender.'},
  academic_level:{t:'str',m:'Select an academic level.'},
  most_used_platform:{t:'str',m:'Select a platform.'},
  purpose_of_use:{t:'str',m:'Select a purpose.'},
  avg_daily_usage_hours:{t:'num',min:0,max:24,m:'Enter hours from 0 to 24.'},
  daily_unlocks:{t:'int',min:0,m:'Enter 0 or more unlocks.'},
  study_hours:{t:'num',min:0,max:24,m:'Enter hours from 0 to 24.'},
  physical_activity_hours:{t:'num',min:0,max:4,m:'Enter hours from 0 to 4.'},
  sleep_hours_per_night:{t:'num',min:0,max:24,m:'Enter hours from 0 to 24.'},
  stress_level:{t:'radio',m:'Select a stress level.'}
};

function read(k){
  const r = rules[k];
  if (r.t === 'radio'){ const c = form.querySelector(`input[name="${k}"]:checked`); return c ? c.value : ''; }
  return document.getElementById(k).value.trim();
}

function validate(){
  const data = {}; let ok = true;
  for (const k in rules){
    const r = rules[k], v = read(k);
    let good = v !== '';
    if (good && (r.t === 'int' || r.t === 'num')){
      const n = Number(v);
      good = Number.isFinite(n) && (r.t === 'num' || Number.isInteger(n)) && n >= r.min && (r.max === undefined || n <= r.max);
      if (good) data[k] = n;
    } else if (good) data[k] = v;
    const f = form.querySelector(`[data-f="${k}"]`);
    f.classList.toggle('invalid', !good);
    f.querySelector('.err').textContent = good ? '' : r.m;
    if (!good) ok = false;
  }
  return ok ? data : null;
}

function band(s){
  if (s >= 7.5) return {name:'Good', tone:'var(--good)', text:'This profile points to healthy mental well-being.',
    tips:['Keep sleep and activity routines steady.','Keep social media use balanced with offline time.']};
  if (s >= 6) return {name:'Moderate', tone:'var(--mid)', text:'This profile shows some pressure. A few habit changes could help.',
    tips:['Aim for 7 to 9 hours of sleep each night.','Cut daily screen time where you can.','Add short, regular physical activity.']};
  return {name:'Needs attention', tone:'var(--low)', text:'This profile suggests a higher risk to well-being.',
    tips:['Consider talking with a counselor or trusted adult.','Reduce late-night phone use to protect sleep.','Build in daily movement and breaks from social media.']};
}

function render(score){
  const b = band(score), pct = Math.max(0, Math.min(score / 10, 1));
  out.innerHTML = `
    <div class="result" style="--tone:${b.tone}">
      <h2>Predicted mental health score</h2>
      <div class="gauge">
        <svg viewBox="0 0 180 180" aria-hidden="true"><circle class="track" cx="90" cy="90" r="80"/><circle class="bar" cx="90" cy="90" r="80"/></svg>
        <div class="num"><strong>${score.toFixed(2)}</strong><span>out of 10</span></div>
      </div>
      <span class="badge">${b.name}</span>
      <p>${b.text}</p>
      <ul class="tips">${b.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="note">Estimate from a machine learning model, not a diagnosis. Bands assume a 0 to 10 scale.</p>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    out.querySelector('.bar').style.strokeDashoffset = 502 * (1 - pct);
  }));
}

function showError(msg){ out.innerHTML = `<div class="alert"><b>Prediction failed.</b><br>${msg}</div>`; }

async function ping(){
  const dot = $('#dot');
  try { const r = await fetch(apiUrl.value.replace(/\/$/,'') + '/'); dot.className = 'dot ' + (r.ok ? 'ok' : 'no'); }
  catch { dot.className = 'dot no'; }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = validate();
  if (!data){ const f = form.querySelector('.invalid'); if (f) f.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  const btn = $('#submit'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Predicting';
  try {
    const base = apiUrl.value.trim().replace(/\/$/,'');
    localStorage.setItem('mh_api', base);
    const res = await fetch(base + '/predict', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok){
      const d = json.detail;
      throw new Error(Array.isArray(d) ? d.map(x => `${(x.loc||[]).slice(-1)[0]}: ${x.msg}`).join('<br>') : (d || `Server returned ${res.status}.`));
    }
    render(json.predicted_mental_health_score);
    $('#dot').className = 'dot ok';
    if (window.matchMedia('(max-width:860px)').matches) out.scrollIntoView({behavior:'smooth'});
  } catch (err) {
    const net = err instanceof TypeError;
    showError(net ? `Could not reach the API at ${apiUrl.value}. Check that uvicorn is running and the URL is correct.` : err.message);
    $('#dot').className = 'dot no';
  } finally { btn.disabled = false; btn.textContent = 'Predict score'; }
});

$('#sample').addEventListener('click', () => {
  const s = {age:20,country:'India',academic_level:'Undergraduate',most_used_platform:'Instagram',purpose_of_use:'Entertainment',
    avg_daily_usage_hours:5.2,daily_unlocks:70,study_hours:3,physical_activity_hours:1,sleep_hours_per_night:6.5};
  for (const k in s) document.getElementById(k).value = s[k];
  form.querySelector('#g2').checked = true; form.querySelector('#s3').checked = true;
  form.querySelectorAll('.invalid').forEach(f => f.classList.remove('invalid'));
});
form.addEventListener('reset', () => {
  form.querySelectorAll('.invalid').forEach(f => f.classList.remove('invalid'));
  out.innerHTML = '<div class="empty"><b>No prediction yet</b>Fill in the form and select Predict score. The result appears here.</div>';
});
apiUrl.addEventListener('change', ping);
ping();
