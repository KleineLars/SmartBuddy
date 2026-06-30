function toggleLock(element) {
    element.classList.toggle('locked');
}

function showHome(e, targetId = null) {
    if (e) e.preventDefault();
    document.getElementById('privacy-view').classList.remove('active');
    document.getElementById('home-view').classList.add('active');
    
    if (targetId) {
        setTimeout(() => {
            const el = document.querySelector(targetId);
            if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 20;
                window.scrollTo({top: y, behavior: 'smooth'});
            }
        }, 100);
    } else {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
}

function showPrivacy(e) {
    if (e) e.preventDefault();
    document.getElementById('home-view').classList.remove('active');
    document.getElementById('privacy-view').classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#privacy') {
        showPrivacy();
    } else if (window.location.hash === '#setup') {
        showHome(null, '#setup');
    }

    // Attach event listeners to replace inline onclick handlers
    const logo = document.querySelector('a.logo');
    if (logo) logo.addEventListener('click', (e) => showHome(e));

    const navBtns = document.querySelectorAll('a.nav-btn');
    navBtns.forEach(btn => {
        if (btn.textContent.includes('Installatie')) {
            btn.addEventListener('click', (e) => showHome(e, '#setup'));
        } else if (btn.textContent.includes('Privacy')) {
            btn.addEventListener('click', (e) => showPrivacy(e));
        }
    });

    const ctaBtns = document.querySelectorAll('.cta-button');
    ctaBtns.forEach(btn => {
        if (btn.getAttribute('href') === '#setup') {
            btn.addEventListener('click', (e) => showHome(e, '#setup'));
        }
    });

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', function() {
            toggleLock(this);
        });
    });

    const privacyLinks = document.querySelectorAll('footer a');
    privacyLinks.forEach(link => {
        if (link.textContent.includes('Privacybeleid')) {
            link.addEventListener('click', (e) => showPrivacy(e));
        }
    });

    // Init Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
    });
});
