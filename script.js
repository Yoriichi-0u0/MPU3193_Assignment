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
  if(!toggle || !nav) return;

  const setState = (open)=>{
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.open = open ? 'true' : 'false';
    document.body.classList.toggle('nav-open', open);
  };

  setState(false);

  toggle.addEventListener('click', ()=>{
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    setState(!isOpen);
  });

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
  const btn = document.querySelector('.theme-toggle');
  if(!btn) return;

  const root = document.documentElement;
  const apply = (theme)=>{
    if(theme === 'light'){
      root.setAttribute('data-theme','light');
      btn.setAttribute('aria-pressed','true');
    }else{
      root.removeAttribute('data-theme');
      btn.setAttribute('aria-pressed','false');
    }
  };

  // Initial theme: localStorage -> system preference -> default (dark)
  let stored = localStorage.getItem('theme');
  if(!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches){
    stored = 'light';
  }
  apply(stored);

  btn.addEventListener('click', ()=>{
    const isLight = root.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    apply(next);
    if(next === 'light') localStorage.setItem('theme','light');
    else localStorage.removeItem('theme');
  });
})();

// Hide header on scroll down, show on scroll up
(()=>{
  const header = document.querySelector('header.site');
  if(!header) return;
  let lastY = window.scrollY || 0;
  let ticking = false;
  const threshold = 10; // ignore tiny scroll jitter
  const minShowTop = 100; // start hiding only after this offset

  const navIsOpen = () => document.body.classList.contains('nav-open');

  const onScroll = () => {
    const y = window.scrollY || 0;
    const down = y > lastY + threshold;
    const up = y < lastY - threshold;
    const nearTop = y < 60;

    if(navIsOpen()){
      header.classList.remove('nav-hidden');
      lastY = y;
      return;
    }

    if(down && y > minShowTop){
      header.classList.add('nav-hidden');
    }else if(up || nearTop){
      header.classList.remove('nav-hidden');
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

// Auto-scrolling team strip: moves left→right, pause on hover, click → About Us
(()=>{
  const strip = document.querySelector('.team-strip');
  if(!strip) return;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build a track and duplicate avatars for seamless loop
  const avatars = Array.from(strip.querySelectorAll('img.avatar'));
  if(avatars.length === 0) return;
  const track = document.createElement('div');
  track.className = 'team-track';
  avatars.forEach(a => track.appendChild(a));
  avatars.forEach(a => track.appendChild(a.cloneNode(true)));
  strip.appendChild(track);

  // All avatars navigate to About Us
  track.addEventListener('click', (e)=>{
    const t = e.target;
    if(t && t.classList && t.classList.contains('avatar')){
      window.location.href = 'about.html';
    }
  });

  let paused = false;
  let offset = 0;       // translateX offset (px)
  let halfWidth = 0;    // width of one set of avatars
  let speed = -0.35;    // px per frame, right→left

  const measure = () => {
    halfWidth = track.scrollWidth / 2;
    // Keep offset within [-halfWidth, 0] so looping is smooth
    if(offset < -halfWidth) offset = -halfWidth;
    if(offset > 0) offset = 0;
  };
  measure();
  window.addEventListener('resize', measure);

  strip.addEventListener('mouseenter', ()=> paused = true);
  strip.addEventListener('mouseleave', ()=> paused = false);

  const tick = () => {
    if(!paused){
      offset += speed;
      if(offset <= -halfWidth) offset = 0;
      track.style.transform = `translateX(${offset}px)`;
    }
    if(!prefersReduced) requestAnimationFrame(tick);
  };
  if(!prefersReduced) requestAnimationFrame(tick);
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


