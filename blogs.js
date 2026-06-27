/* ════════════ SHARED DEV.TO BLOG LOADER ════════════
   Used by index.html (top 3 per section) and blog.html (all posts).
   Source: dev.to RSS (list + tags) enriched per-article (cover, read time, reactions).
*/
(function(){
  const USERNAME = 'anubhav_verma_c15696e7d7b';

  // Tags that route a post into "Off the Clock" (personal)
  const PERSONAL_TAGS = ['life','personal','writing','thoughts','musings','poetry','love','she','beauty','story','relationships','nontech','offtopic','philosophy','mentalhealth','creativewriting','watercooler','discuss','motivation'];

  const esc = s => (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtDate = iso => { try { return new Date(iso.replace(' ','T')).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase(); } catch(e){ return ''; } };
  const slugOf = u => { try { return u.split('?')[0].replace(/\/$/,'').split('/').pop(); } catch(e){ return u; } };
  const readTime = html => { const t=(html||'').replace(/<[^>]+>/g,' ').trim(); const w=t?t.split(/\s+/).length:0; return Math.max(1,Math.round(w/200)); };

  const revObs = new IntersectionObserver(e => e.forEach(x => { if(x.isIntersecting) x.target.classList.add('vis'); }), {threshold:.1});

  function card(p, i){
    const cover = p.cover
      ? `<div class="post-thumb"><img src="${p.cover}" alt="" loading="lazy"/></div>`
      : `<div class="post-thumb"><span class="ph">${esc(p.title).slice(0,1)}</span></div>`;
    const meta = `${p.read ? p.read+' MIN READ · ' : ''}${fmtDate(p.date)}`;
    const a = document.createElement('a');
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; a.className = 'post';
    a.setAttribute('data-r',''); if(i) a.setAttribute('data-d', Math.min(i,4));
    a.innerHTML = `${cover}<div class="post-body"><div class="post-meta">${meta}</div><h3>${esc(p.title)}</h3><p>${esc(p.desc).slice(0,140)}</p><span class="post-read">Read post →</span></div>`;
    revObs.observe(a);
    return a;
  }
  function emptyCard(label){
    const d = document.createElement('div');
    d.className = 'post-empty';
    d.innerHTML = `<h3>Coming soon</h3><p>${label} posts appear here automatically the moment they go live on dev.to.</p>`;
    return d;
  }

  /* opts: { techGrid, personalGrid, limit (number|null), moreBtn } */
  window.loadBlogs = function(opts){
    const { techGrid, personalGrid, limit = null, moreBtn } = opts;
    if(!techGrid || !personalGrid) return;

    const fail = () => {
      techGrid.innerHTML = ''; techGrid.appendChild(emptyCard('Tech & AI'));
      personalGrid.innerHTML = ''; personalGrid.appendChild(emptyCard('Personal'));
    };

    const rssUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(`https://dev.to/feed/${USERNAME}`);
    const apiList = `https://dev.to/api/articles?username=${USERNAME}&per_page=30`;

    fetch(rssUrl).then(r => r.json()).then(rss => {
      let posts;
      if(rss && rss.status === 'ok' && Array.isArray(rss.items) && rss.items.length){
        posts = rss.items.map(it => ({
          title: it.title, url: it.link, date: it.pubDate,
          desc: (it.description || it.content || '').replace(/<[^>]+>/g,'').trim(),
          tags: (it.categories || []).map(t => t.toLowerCase()),
          slug: slugOf(it.link), cover:'', read: readTime(it.content || it.description), likes: 0
        }));
        return enrich(posts);
      }
      return fetch(apiList).then(r => r.json()).then(api => {
        if(!Array.isArray(api) || !api.length){ fail(); return null; }
        return api.map(a => ({
          title:a.title, url:a.url, date:a.published_at||a.published_timestamp,
          desc:a.description||'', tags:(a.tag_list||[]).map(t=>t.toLowerCase()),
          cover:a.cover_image||'', read:a.reading_time_minutes, likes:a.public_reactions_count||0
        }));
      });
    }).then(posts => { if(posts) render(posts); }).catch(fail);

    // enrich each post with cover + read time + reaction count (per-article API is fresh)
    function enrich(posts){
      return Promise.all(posts.map(p =>
        fetch(`https://dev.to/api/articles/${USERNAME}/${p.slug}`)
          .then(r => r.ok ? r.json() : null)
          .then(a => { if(a){ p.cover = a.cover_image||''; p.read = a.reading_time_minutes||p.read; p.likes = a.public_reactions_count||0; } return p; })
          .catch(() => p)
      ));
    }

    function render(posts){
      const tech = [], personal = [];
      posts.forEach(p => { (p.tags.some(t => PERSONAL_TAGS.includes(t)) ? personal : tech).push(p); });
      // sort by likes (top liked first), tiebreak newest
      const byLikes = (a,b) => (b.likes - a.likes) || (new Date(b.date) - new Date(a.date));
      tech.sort(byLikes); personal.sort(byLikes);

      const techShown = limit ? tech.slice(0, limit) : tech;
      const personalShown = limit ? personal.slice(0, limit) : personal;

      techGrid.innerHTML = '';
      personalGrid.innerHTML = '';
      techShown.length ? techShown.forEach((p,i) => techGrid.appendChild(card(p,i))) : techGrid.appendChild(emptyCard('Tech & AI'));
      personalShown.length ? personalShown.forEach((p,i) => personalGrid.appendChild(card(p,i))) : personalGrid.appendChild(emptyCard('Personal'));

      // show "view more" only if something is hidden
      if(moreBtn){
        const hidden = (tech.length > techShown.length) || (personal.length > personalShown.length);
        moreBtn.style.display = (limit && hidden) ? 'flex' : 'none';
      }
    }
  };
})();
