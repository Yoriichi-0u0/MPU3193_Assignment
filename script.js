(()=>{
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // Respect reduced motion

  const revealTargets = document.querySelectorAll('.section, .card, .avatar, .section-title, .lead, .kicker, h1');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      if(entry.isIntersecting){
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.12, rootMargin:'0px 0px -40px 0px'});

  revealTargets.forEach(el=>{
    el.classList.add('reveal');
    observer.observe(el);
  });
})();

(()=>{
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  document.body.appendChild(overlay);
  if(!toggle || !nav) return;

  const setState = (open)=>{
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.open = open ? 'true' : 'false';
    document.body.classList.toggle('nav-open', open);
    overlay.classList.toggle('visible', open);
  };

  setState(false);

  toggle.addEventListener('click', ()=>{
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    setState(!isOpen);
  });

  overlay.addEventListener('click', ()=> setState(false));

  nav.addEventListener('click', (event)=>{
    const target = event.target;
    if(target instanceof HTMLElement && target.tagName === 'A'){
      setState(false);
    }
  });

  const mq = window.matchMedia('(min-width: 820px)');
  const handleChange = (event)=>{
    if(event.matches){
      setState(false);
    }
  };
  if(typeof mq.addEventListener === 'function'){
    mq.addEventListener('change', handleChange);
  }else if(typeof mq.addListener === 'function'){
    mq.addListener(handleChange);
  }
})();

// Theme toggle (light/dark)
(()=>{
  const toggle = document.querySelector('.theme-toggle');
  if(!toggle) return;

  const root = document.documentElement;
  const setLabel = (mode)=>{
    const targetMode = mode === 'light' ? 'dark' : 'light';
    toggle.setAttribute('aria-label', `Switch to ${targetMode} mode`);
  };

  const apply = (mode)=>{
    if(mode === 'light'){
      root.setAttribute('data-theme','light');
    }else{
      root.removeAttribute('data-theme');
    }
    setLabel(mode === 'light' ? 'light' : 'dark');
  };

  let stored = localStorage.getItem('theme');
  if(!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches){
    stored = 'light';
  }
  apply(stored);

  const handleToggle = ()=>{
    const isLight = root.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    apply(next);
    if(next === 'light') localStorage.setItem('theme','light');
    else localStorage.removeItem('theme');
  };

  toggle.addEventListener('click', handleToggle);
  if(toggle.tagName !== 'BUTTON'){
    toggle.addEventListener('keydown', (event)=>{
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        handleToggle();
      }
    });
  }
})();

// Hide header (and case subnav) on scroll down, show on scroll up
(()=>{
  const header = document.querySelector('header.site');
  const subnav = document.querySelector('.case-subnav');
  if(!header && !subnav) return;
  let lastY = window.scrollY || 0;
  let ticking = false;
  const threshold = 10; // ignore tiny scroll jitter
  const minShowTop = 100; // start hiding only after this offset

  const navIsOpen = () => document.body.classList.contains('nav-open');
  const setHidden = (el, hide) => { if(el) el.classList.toggle('nav-hidden', hide); };

  const onScroll = () => {
    const y = window.scrollY || 0;
    const down = y > lastY + threshold;
    const up = y < lastY - threshold;
    const nearTop = y < 60;

    if(navIsOpen()){
      setHidden(header,false); setHidden(subnav,false);
      lastY = y;
      return;
    }

    if(down && y > minShowTop){
      setHidden(header,true); setHidden(subnav,true);
    }else if(up || nearTop){
      setHidden(header,false); setHidden(subnav,false);
    }

    lastY = y;
  };

  window.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(()=>{ onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive:true });
})();

// Back-to-top button: appears after main section and accelerates to top
(()=>{
  const btn = document.getElementById('backToTop');
  if(!btn) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = () => btn.classList.add('visible');
  const hide = () => btn.classList.remove('visible');

  const anchor = document.getElementById('why-sdg4');
  if('IntersectionObserver' in window && anchor){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e => {
        if(e.isIntersecting) show(); else hide();
      });
    }, { threshold: 0.08 });
    obs.observe(anchor);
  }else{
    const check = ()=> (window.scrollY||0) > 300 ? show() : hide();
    check();
    window.addEventListener('scroll', check, { passive:true });
  }

  const easeInQuad = t => t*t; // slow -> fast

  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    if(prefersReduced){ window.scrollTo({top:0, left:0}); return; }
    const startY = window.scrollY || document.documentElement.scrollTop || 0;
    const duration = 650;
    let startTime = null;

    const step = (ts)=>{
      if(!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = easeInQuad(p);
      const nextY = Math.max(startY - (startY * eased), 0);
      window.scrollTo(0, nextY);
      if(p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  if(btn.tabIndex >= 0){
    btn.addEventListener('keydown', (event)=>{
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        btn.click();
      }
    });
  }
})();

// Scroll progress indicator
(()=>{
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.createElement('div');
  bar.id = 'scrollProgress';
  document.body.appendChild(bar);

  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const scrollY = window.scrollY || doc.scrollTop || 0;
    const height = doc.scrollHeight - window.innerHeight;
    const progress = height > 0 ? scrollY / height : 0;
    bar.style.transform = `scaleX(${progress})`;
    ticking = false;
  };

  const requestUpdate = () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  if(prefersReduced){
    bar.style.display = 'none';
    return;
  }

  update();
  window.addEventListener('scroll', requestUpdate, { passive:true });
  window.addEventListener('resize', requestUpdate);
})();

// Respect focus rings for keyboard users by adding a helper class
(()=>{
  const root = document.documentElement;
  const handleFirstTab = (e)=>{
    if(e.key === 'Tab'){
      root.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
      window.addEventListener('mousedown', handleMouseDownOnce);
    }
  };
  const handleMouseDownOnce = ()=>{
    root.classList.remove('user-is-tabbing');
    window.removeEventListener('mousedown', handleMouseDownOnce);
    window.addEventListener('keydown', handleFirstTab);
  };
  window.addEventListener('keydown', handleFirstTab);
})();

// Slow down the Why section video playback
(()=>{
  const v = document.getElementById('whyVideo');
  if(!v) return;
  const setRate = ()=>{ try { v.playbackRate = 0.6; } catch(e){} };
  if(v.readyState >= 1) setRate();
  v.addEventListener('loadedmetadata', setRate);
  v.addEventListener('play', setRate);
})();

// Global: allow Escape to close the mobile menu for accessibility
(()=>{
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      const toggle = document.querySelector('.nav-toggle');
      const nav = document.getElementById('primary-nav');
      if(toggle && nav){
        toggle.setAttribute('aria-expanded','false');
        nav.dataset.open = 'false';
        document.body.classList.remove('nav-open');
      }
    }
  });
})();


// CASES-FILTERS:START
(function () {
  const chips = Array.from(document.querySelectorAll('.chip[data-theme]'));
  const cards = Array.from(document.querySelectorAll('.case-card'));
  const input = document.getElementById('cases-search');

  function activeThemes() {
    return chips.filter(c => c.classList.contains('active')).map(c => c.dataset.theme);
  }

  function matchesThemes(card, themes) {
    if (themes.length === 0) return true;
    const cardThemes = (card.dataset.themes || '').split(',').map(s => s.trim());
    return themes.every(t => cardThemes.includes(t));
  }

  function matchesQuery(card, q) {
    if (!q) return true;
    const hay = ((card.dataset.keywords || '') + ' ' + card.textContent).toLowerCase();
    return hay.includes(q);
  }

  function applyFilters() {
    const themes = activeThemes();
    const q = (input && input.value || '').toLowerCase().trim();
    cards.forEach(card => {
      const ok = matchesThemes(card, themes) && matchesQuery(card, q);
      card.style.display = ok ? '' : 'none';
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
      applyFilters();
    });
  });

  if (input) {
    let t = null;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(applyFilters, 180);
    });
  }

  applyFilters();
})();
// CASES-FILTERS:END
