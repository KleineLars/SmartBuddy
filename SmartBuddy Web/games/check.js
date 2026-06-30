
        // ═══════════════════════════════════════════════
        //  TOM BIRDS v3 — Improved Physics + All Chars
        // ═══════════════════════════════════════════════
        const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
        function setSize() {
            // Use CSS pixels directly — no DPR tricks
            const W = window.innerWidth;
            const H = window.innerHeight;
            cv.width = W;
            cv.height = H;
            cv.style.width = W + 'px';
            cv.style.height = H + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            if (G) { G.W = W; G.H = H; }
            if (typeof buildBg === 'function') buildBg();
        }
        window.addEventListener('resize', setSize);
        window.addEventListener('orientationchange', () => setTimeout(setSize, 300));
        document.addEventListener('fullscreenchange', () => setTimeout(setSize, 100));
        document.addEventListener('webkitfullscreenchange', () => setTimeout(setSize, 100));

        const W = () => cv.width, H = () => cv.height;
        function GND() {
            // On narrow screens (mobile), use more vertical space
            const ratio = W() / H();
            if (ratio < 1.2) return H() * .72; // portrait-ish mobile
            if (ratio < 1.8) return H() * .80; // landscape mobile  
            return H() * .845; // desktop
        }
        // ── ANGRY BIRDS PHYSICS (refactored for precise gameplay) ──
        const GRAV = 0.018;          // ✅ Much lower gravity — longer, flatter arcs like Angry Birds
        const BOUNCE = 0.35;         // Realistic bounce
        const FRIC = 0.992;          // Air friction
        const GROUND_FRIC = 0.88;    // Ground friction
        const ANGDAMP = 0.92;        // Rotation damping
        let LAUNCH_MUL = 0.18;       // ✅ Lower multiplier — more control, less chaos
        const AIR_DRAG = 0.999;      // Minimal air resistance
        const SPIN_TO_VEL = 0.04;    // Bird spins based on velocity

        // ── CHARACTERS ──
        const BIRDS=[
  {id:'tom',    color:'#e74c3c',power:'poop',   size:28,label:'EGG DROP',desc:'Drops 6 egg bombs!'},
  {id:'pearl',  color:'#f1c40f',power:'ghost',  size:24,label:'GHOST PASS', desc:'Flies through walls!'},
  {id:'charlie',color:'#3498db',power:'split',  size:24,label:'SPLIT', desc:'Splits into 3!'},
  {id:'donald', color:'#e67e22',power:'speed',  size:28,label:'TURBO SMASH',desc:'2x speed burst!'},
  {id:'jeff',   color:'#34495e',power:'bomb',   size:26,label:'EXPLOSION',  desc:'Giant blast radius!'},
  {id:'stewie', color:'#2ecc71',power:'boomer', size:24,label:'BOOMERANG',  desc:'Reverses direction!'},
  {id:'offend', color:'#9b59b6',power:'rage',   size:26,label:'RAGE BURST', desc:'3x dmg + terrifies all pigs!'},
  {id:'aura',   color:'#ff9ff3',power:'aura',   size:30,label:'AURA BLAST', desc:'Mega shockwave — wipes structures!'},
];

        // Preload images with cache busting for mobile Safari
        const BIRDIMGS = {};
        BIRDS.forEach(b => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = '/TomGames/img/' + b.img;
            BIRDIMGS[b.id] = img;
        });
        // Pig image — BIBI!
        const PIGIMG = new Image();
        PIGIMG.crossOrigin = 'anonymous';
        PIGIMG.src = '/TomGames/img/bibi.png';

        // Extra images
        const TOILETIMG = new Image(); TOILETIMG.crossOrigin = 'anonymous'; TOILETIMG.src = '/TomGames/img/toilet.png';
        const TOMFACEIMG = new Image(); TOMFACEIMG.crossOrigin = 'anonymous'; TOMFACEIMG.src = '/GifPhoto/TomPearl.jpg';
        const BUREAUIMG = new Image(); BUREAUIMG.crossOrigin = 'anonymous'; BUREAUIMG.src = '/TomGames/img/tompearlbureau.png';
        const SHITCOCKTAILIMG = new Image(); SHITCOCKTAILIMG.crossOrigin = 'anonymous'; SHITCOCKTAILIMG.src = '/TomGames/img/shitcocktail.png';
        const STEWYIMG = new Image(); STEWYIMG.src = '/TomGames/img/stewy.png';
        const GAGIMG_WIN = new Image(); GAGIMG_WIN.src = '/TomGames/img/gag.png';
        const WHITEHOUSEIMG = new Image(); WHITEHOUSEIMG.crossOrigin = 'anonymous'; WHITEHOUSEIMG.src = '/TomGames/img/whitehouse.png';
        const JEWPANICIMG = new Image(); JEWPANICIMG.crossOrigin = 'anonymous'; JEWPANICIMG.src = '/TomGames/img/jewpanic.png';

        Object.values(BIRDIMGS).forEach(img => { img.onload = () => { }; });
        PIGIMG.onload = () => { };

        // Emoji → image map for burst particles
        const EMOJI_IMG_MAP = {};
        function initEmojiMap() {
            EMOJI_IMG_MAP['🔥'] = BIRDIMGS['charlie'];
            EMOJI_IMG_MAP['👻'] = BIRDIMGS['jeff'];
            EMOJI_IMG_MAP['💀'] = BIRDIMGS['charlie'];
            EMOJI_IMG_MAP['💥'] = BIRDIMGS['offend'];
            EMOJI_IMG_MAP['🏆'] = BIRDIMGS['pearl'];
            EMOJI_IMG_MAP['👑'] = BIRDIMGS['pearl'];
            EMOJI_IMG_MAP['⭐'] = BIRDIMGS['pearl'];
            EMOJI_IMG_MAP['😡'] = BIRDIMGS['offend'];
            EMOJI_IMG_MAP['✨'] = BIRDIMGS['aura'];
            EMOJI_IMG_MAP['💫'] = BIRDIMGS['aura'];
            EMOJI_IMG_MAP['☠️'] = BIRDIMGS['charlie'];
            EMOJI_IMG_MAP['🎯'] = BIRDIMGS['tom'];
            EMOJI_IMG_MAP['💣'] = BIRDIMGS['jeff'];
            EMOJI_IMG_MAP['🍊'] = BIRDIMGS['donald'];
            EMOJI_IMG_MAP['🍺'] = BIRDIMGS['stewie'];
        }
        window.addEventListener('load', initEmojiMap);

        // ── LEVELS (5 total) ──
        const LEVELS = [
            // 1 — Tutorial: simple wood house, far right
            {
                birds: ['tom', 'tom', 'pearl'],
                pigs: [{ x: .78, y: .70 }, { x: .86, y: .70 }],
                blocks: [
                    { x: .74, y: .77, w: .055, h: .15, mat: 'wood' }, { x: .82, y: .77, w: .055, h: .15, mat: 'wood' },
                    { x: .74, y: .62, w: .135, h: .04, mat: 'wood' },
                ]
            },
            // 2 — Stone fortress
            {
                birds: ['tom', 'charlie', 'donald', 'pearl'],
                pigs: [{ x: .73, y: .63 }, { x: .83, y: .63 }, { x: .78, y: .50 }],
                blocks: [
                    { x: .70, y: .77, w: .045, h: .17, mat: 'stone' }, { x: .755, y: .77, w: .045, h: .28, mat: 'stone' },
                    { x: .81, y: .77, w: .045, h: .17, mat: 'stone' }, { x: .70, y: .60, w: .155, h: .04, mat: 'wood' },
                    { x: .70, y: .53, w: .155, h: .04, mat: 'stone' }, { x: .73, y: .51, w: .10, h: .04, mat: 'wood' },
                ]
            },
            // 3 — Ice tower
            {
                birds: ['jeff', 'stewie', 'tom', 'charlie'],
                pigs: [{ x: .68, y: .63 }, { x: .80, y: .50 }, { x: .88, y: .63 }, { x: .78, y: .63, boss: true }],
                blocks: [
                    { x: .65, y: .77, w: .045, h: .17, mat: 'stone' }, { x: .70, y: .77, w: .045, h: .17, mat: 'ice' },
                    { x: .75, y: .77, w: .045, h: .29, mat: 'stone' }, { x: .80, y: .77, w: .045, h: .29, mat: 'stone' },
                    { x: .85, y: .77, w: .045, h: .17, mat: 'ice' }, { x: .65, y: .60, w: .115, h: .04, mat: 'wood' },
                    { x: .75, y: .51, w: .115, h: .04, mat: 'stone' }, { x: .75, y: .47, w: .115, h: .04, mat: 'wood' },
                ]
            },
            // 4 — Castle
            {
                birds: ['donald', 'charlie', 'jeff', 'stewie', 'tom'],
                pigs: [{ x: .66, y: .63 }, { x: .74, y: .63 }, { x: .82, y: .63 }, { x: .90, y: .63 }, { x: .78, y: .48, boss: true }],
                blocks: [
                    { x: .63, y: .77, w: .04, h: .19, mat: 'stone' }, { x: .67, y: .77, w: .04, h: .19, mat: 'stone' },
                    { x: .71, y: .77, w: .04, h: .19, mat: 'stone' }, { x: .75, y: .77, w: .04, h: .30, mat: 'stone' },
                    { x: .79, y: .77, w: .04, h: .19, mat: 'stone' }, { x: .83, y: .77, w: .04, h: .19, mat: 'stone' },
                    { x: .87, y: .77, w: .04, h: .19, mat: 'stone' },
                    { x: .63, y: .58, w: .08, h: .04, mat: 'wood' }, { x: .71, y: .58, w: .08, h: .04, mat: 'stone' },
                    { x: .79, y: .58, w: .08, h: .04, mat: 'wood' }, { x: .75, y: .51, w: .14, h: .04, mat: 'stone' },
                    { x: .75, y: .47, w: .08, h: .04, mat: 'wood' },
                ]
            },
            // 5 — Mega Boss
            {
                birds: ['tom', 'tom', 'jeff', 'donald', 'charlie', 'stewie', 'pearl'],
                pigs: [{ x: .65, y: .61, boss: true }, { x: .77, y: .47, boss: true }, { x: .89, y: .61, boss: true },
                { x: .71, y: .61 }, { x: .83, y: .61 }, { x: .77, y: .61 }],
                blocks: [
                    { x: .62, y: .77, w: .038, h: .21, mat: 'stone' }, { x: .658, y: .77, w: .038, h: .21, mat: 'stone' },
                    { x: .696, y: .77, w: .038, h: .33, mat: 'stone' }, { x: .734, y: .77, w: .038, h: .33, mat: 'stone' },
                    { x: .772, y: .77, w: .038, h: .33, mat: 'stone' }, { x: .810, y: .77, w: .038, h: .33, mat: 'stone' },
                    { x: .848, y: .77, w: .038, h: .21, mat: 'stone' }, { x: .886, y: .77, w: .038, h: .21, mat: 'stone' },
                    { x: .62, y: .56, w: .10, h: .038, mat: 'stone' }, { x: .70, y: .47, w: .14, h: .038, mat: 'stone' },
                    { x: .79, y: .47, w: .14, h: .038, mat: 'stone' }, { x: .88, y: .56, w: .10, h: .038, mat: 'stone' },
                    { x: .70, y: .435, w: .28, h: .038, mat: 'ice' }, { x: .74, y: .40, w: .095, h: .038, mat: 'wood' },
                ]
            },

            // 6 — Piggy Stack
            {
                birds: ['tom', 'donald', 'tom'],
                pigs: [{ x: .75, y: .74 }, { x: .75, y: .61 }, { x: .75, y: .48 }],
                blocks: [
                    { x: .72, y: .77, w: .06, h: .10, mat: 'wood' },
                    { x: .72, y: .67, w: .06, h: .10, mat: 'wood' },
                    { x: .72, y: .57, w: .06, h: .10, mat: 'wood' },
                    { x: .72, y: .47, w: .06, h: .10, mat: 'wood' },
                ]
            },

            // 7 — Glass Palace
            {
                birds: ['charlie', 'charlie', 'stewie'],
                pigs: [{ x: .70, y: .70 }, { x: .80, y: .70 }, { x: .75, y: .57 }, { x: .75, y: .44 }],
                blocks: [
                    { x: .67, y: .77, w: .05, h: .13, mat: 'ice' }, { x: .73, y: .77, w: .05, h: .13, mat: 'ice' },
                    { x: .79, y: .77, w: .05, h: .13, mat: 'ice' }, { x: .85, y: .77, w: .05, h: .13, mat: 'ice' },
                    { x: .67, y: .64, w: .23, h: .04, mat: 'ice' },
                    { x: .70, y: .77, w: .05, h: .13, mat: 'ice' }, { x: .82, y: .77, w: .05, h: .13, mat: 'ice' },
                    { x: .70, y: .60, w: .22, h: .04, mat: 'ice' },
                    { x: .72, y: .56, w: .06, h: .13, mat: 'ice' }, { x: .80, y: .56, w: .06, h: .13, mat: 'ice' },
                    { x: .72, y: .43, w: .14, h: .04, mat: 'ice' },
                ]
            },

            // 8 — The Bunker (with TNT!)
            {
                birds: ['jeff', 'donald', 'jeff'],
                pigs: [{ x: .80, y: .63, boss: true }, { x: .73, y: .74 }, { x: .87, y: .74 }],
                blocks: [
                    { x: .70, y: .77, w: .20, h: .04, mat: 'stone' },
                    { x: .70, y: .73, w: .04, h: .08, mat: 'stone' }, { x: .86, y: .73, w: .04, h: .08, mat: 'stone' },
                    { x: .70, y: .65, w: .20, h: .04, mat: 'stone' },
                    { x: .74, y: .61, w: .05, h: .08, mat: 'tnt' }, { x: .81, y: .61, w: .05, h: .08, mat: 'tnt' },
                    { x: .76, y: .57, w: .08, h: .04, mat: 'stone' },
                ]
            },

            // 9 — Sniper Shot
            {
                birds: ['pearl', 'tom', 'stewie'],
                pigs: [{ x: .88, y: .74 }, { x: .88, y: .62 }, { x: .88, y: .50 }],
                blocks: [
                    { x: .85, y: .77, w: .08, h: .10, mat: 'stone' },
                    { x: .85, y: .67, w: .08, h: .10, mat: 'stone' },
                    { x: .85, y: .57, w: .08, h: .10, mat: 'stone' },
                    { x: .85, y: .47, w: .08, h: .10, mat: 'stone' },
                    { x: .70, y: .77, w: .04, h: .04, mat: 'wood' }, { x: .75, y: .77, w: .04, h: .04, mat: 'wood' },
                    { x: .80, y: .77, w: .04, h: .04, mat: 'wood' },
                ]
            },

            // 10 — Chaos Pyramid
            {
                birds: ['tom', 'charlie', 'donald', 'jeff'],
                pigs: [{ x: .75, y: .74 }, { x: .70, y: .63 }, { x: .80, y: .63 }, { x: .75, y: .52 }, { x: .75, y: .41, boss: true }],
                blocks: [
                    { x: .68, y: .77, w: .14, h: .04, mat: 'wood' },
                    { x: .70, y: .77, w: .04, h: .09, mat: 'stone' }, { x: .80, y: .77, w: .04, h: .09, mat: 'stone' },
                    { x: .70, y: .68, w: .12, h: .04, mat: 'stone' },
                    { x: .72, y: .68, w: .04, h: .09, mat: 'wood' }, { x: .78, y: .68, w: .04, h: .09, mat: 'wood' },
                    { x: .72, y: .59, w: .10, h: .04, mat: 'ice' },
                    { x: .73, y: .59, w: .04, h: .09, mat: 'stone' }, { x: .77, y: .59, w: .04, h: .09, mat: 'stone' },
                    { x: .73, y: .50, w: .08, h: .04, mat: 'wood' },
                    { x: .74, y: .50, w: .04, h: .09, mat: 'stone' },
                    { x: .74, y: .41, w: .06, h: .04, mat: 'ice' },
                ]
            },

            // 11 — Piggy Hotel
            {
                birds: ['stewie', 'tom', 'pearl', 'donald'],
                pigs: [{ x: .71, y: .73 }, { x: .79, y: .73 }, { x: .71, y: .60 }, { x: .79, y: .60 }, { x: .75, y: .47, boss: true }],
                blocks: [
                    { x: .68, y: .77, w: .04, h: .10, mat: 'stone' }, { x: .76, y: .77, w: .04, h: .10, mat: 'stone' },
                    { x: .84, y: .77, w: .04, h: .10, mat: 'stone' },
                    { x: .68, y: .67, w: .20, h: .04, mat: 'wood' },
                    { x: .68, y: .63, w: .04, h: .10, mat: 'ice' }, { x: .76, y: .63, w: .04, h: .10, mat: 'ice' },
                    { x: .84, y: .63, w: .04, h: .10, mat: 'ice' },
                    { x: .68, y: .53, w: .20, h: .04, mat: 'stone' },
                    { x: .71, y: .49, w: .12, h: .04, mat: 'wood' },
                    { x: .73, y: .49, w: .04, h: .08, mat: 'stone' },
                    { x: .73, y: .41, w: .08, h: .04, mat: 'ice' },
                ]
            },

            // 12 — Domino Run
            {
                birds: ['donald', 'tom', 'tom'],
                pigs: [{ x: .72, y: .74 }, { x: .77, y: .74 }, { x: .82, y: .74 }, { x: .87, y: .74 }, { x: .92, y: .74 }],
                blocks: [
                    { x: .71, y: .77, w: .025, h: .08, mat: 'wood' }, { x: .76, y: .77, w: .025, h: .08, mat: 'wood' },
                    { x: .81, y: .77, w: .025, h: .08, mat: 'wood' }, { x: .86, y: .77, w: .025, h: .08, mat: 'wood' },
                    { x: .91, y: .77, w: .025, h: .08, mat: 'wood' },
                    { x: .68, y: .77, w: .05, h: .04, mat: 'stone' },
                ]
            },

            // 13 — Fortress X
            {
                birds: ['jeff', 'charlie', 'stewie', 'tom', 'donald'],
                pigs: [{ x: .74, y: .62, boss: true }, { x: .84, y: .62, boss: true }, { x: .79, y: .49, boss: true }],
                blocks: [
                    { x: .70, y: .77, w: .05, h: .18, mat: 'stone' }, { x: .77, y: .77, w: .05, h: .18, mat: 'stone' },
                    { x: .84, y: .77, w: .05, h: .18, mat: 'stone' }, { x: .91, y: .77, w: .05, h: .18, mat: 'stone' },
                    { x: .70, y: .59, w: .26, h: .04, mat: 'stone' },
                    { x: .73, y: .55, w: .05, h: .10, mat: 'ice' }, { x: .80, y: .55, w: .05, h: .10, mat: 'ice' },
                    { x: .87, y: .55, w: .05, h: .10, mat: 'ice' },
                    { x: .73, y: .45, w: .19, h: .04, mat: 'stone' },
                    { x: .76, y: .41, w: .06, h: .04, mat: 'tnt' }, { x: .84, y: .41, w: .06, h: .04, mat: 'tnt' },
                ]
            },

            // 14 — The Wall
            {
                birds: ['tom', 'jeff', 'donald', 'charlie'],
                pigs: [{ x: .88, y: .74 }, { x: .88, y: .64 }, { x: .88, y: .54 }, { x: .88, y: .44, boss: true }],
                blocks: [
                    { x: .78, y: .77, w: .04, h: .40, mat: 'stone' },
                    { x: .82, y: .77, w: .04, h: .30, mat: 'stone' },
                    { x: .86, y: .77, w: .04, h: .20, mat: 'wood' },
                    { x: .90, y: .77, w: .04, h: .40, mat: 'stone' },
                ]
            },

            // 15 — Piggy Pentagon
            {
                birds: ['charlie', 'stewie', 'tom', 'donald'],
                pigs: [{ x: .75, y: .77 }, { x: .88, y: .70 }, { x: .84, y: .57 }, { x: .66, y: .57 }, { x: .62, y: .70 }, { x: .75, y: .52, boss: true }],
                blocks: [
                    { x: .72, y: .77, w: .06, h: .04, mat: 'wood' }, { x: .84, y: .74, w: .04, h: .07, mat: 'wood' },
                    { x: .80, y: .63, w: .07, h: .04, mat: 'wood' }, { x: .68, y: .63, w: .07, h: .04, mat: 'wood' },
                    { x: .63, y: .74, w: .04, h: .07, mat: 'wood' },
                    { x: .72, y: .73, w: .04, h: .09, mat: 'stone' }, { x: .82, y: .73, w: .04, h: .09, mat: 'stone' },
                    { x: .79, y: .59, w: .04, h: .09, mat: 'stone' }, { x: .65, y: .59, w: .04, h: .09, mat: 'stone' },
                    { x: .65, y: .48, w: .20, h: .04, mat: 'ice' },
                ]
            },

            // 16 — Ice Age
            {
                birds: ['charlie', 'charlie', 'jeff'],
                pigs: [{ x: .72, y: .73 }, { x: .80, y: .73 }, { x: .88, y: .73 }, { x: .80, y: .60, boss: true }],
                blocks: [
                    { x: .69, y: .77, w: .06, h: .10, mat: 'ice' }, { x: .77, y: .77, w: .06, h: .10, mat: 'ice' },
                    { x: .85, y: .77, w: .06, h: .10, mat: 'ice' },
                    { x: .69, y: .67, w: .22, h: .04, mat: 'ice' },
                    { x: .73, y: .63, w: .04, h: .10, mat: 'ice' }, { x: .81, y: .63, w: .04, h: .10, mat: 'ice' },
                    { x: .73, y: .53, w: .12, h: .04, mat: 'ice' },
                    { x: .75, y: .49, w: .08, h: .04, mat: 'ice' },
                ]
            },

            // 17 — Sky High
            {
                birds: ['pearl', 'stewie', 'tom'],
                pigs: [{ x: .78, y: .74 }, { x: .78, y: .60 }, { x: .78, y: .46 }, { x: .78, y: .32, boss: true }],
                blocks: [
                    { x: .75, y: .77, w: .06, h: .10, mat: 'wood' },
                    { x: .75, y: .67, w: .06, h: .10, mat: 'stone' },
                    { x: .75, y: .57, w: .06, h: .10, mat: 'wood' },
                    { x: .75, y: .47, w: .06, h: .10, mat: 'stone' },
                    { x: .75, y: .37, w: .06, h: .10, mat: 'ice' },
                    { x: .71, y: .77, w: .03, h: .04, mat: 'wood' }, { x: .81, y: .77, w: .03, h: .04, mat: 'wood' },
                ]
            },

            // 18 — The Throne
            {
                birds: ['donald', 'jeff', 'charlie', 'stewie', 'tom'],
                pigs: [{ x: .69, y: .73 }, { x: .77, y: .73 }, { x: .85, y: .73 }, { x: .73, y: .60 }, { x: .81, y: .60 }, { x: .77, y: .47, boss: true }],
                blocks: [
                    { x: .66, y: .77, w: .05, h: .10, mat: 'stone' }, { x: .74, y: .77, w: .05, h: .10, mat: 'stone' },
                    { x: .82, y: .77, w: .05, h: .10, mat: 'stone' }, { x: .90, y: .77, w: .05, h: .10, mat: 'stone' },
                    { x: .66, y: .67, w: .28, h: .04, mat: 'wood' },
                    { x: .70, y: .63, w: .05, h: .10, mat: 'stone' }, { x: .78, y: .63, w: .05, h: .10, mat: 'stone' },
                    { x: .86, y: .63, w: .05, h: .10, mat: 'stone' },
                    { x: .70, y: .53, w: .20, h: .04, mat: 'stone' },
                    { x: .73, y: .49, w: .05, h: .10, mat: 'ice' }, { x: .80, y: .49, w: .05, h: .10, mat: 'ice' },
                    { x: .73, y: .39, w: .12, h: .04, mat: 'ice' },
                    { x: .76, y: .35, w: .06, h: .04, mat: 'wood' },
                ]
            },

            // 19 — Poop Maze
            {
                birds: ['tom', 'offend', 'tom', 'charlie'],
                pigs: [{ x: .74, y: .74 }, { x: .84, y: .74 }, { x: .79, y: .60 }, { x: .74, y: .46 }, { x: .84, y: .46 }],
                blocks: [
                    { x: .70, y: .77, w: .18, h: .04, mat: 'wood' },
                    { x: .70, y: .73, w: .04, h: .08, mat: 'wood' }, { x: .88, y: .73, w: .04, h: .08, mat: 'wood' },
                    { x: .70, y: .65, w: .07, h: .04, mat: 'stone' }, { x: .81, y: .65, w: .07, h: .04, mat: 'stone' },
                    { x: .76, y: .65, w: .04, h: .08, mat: 'wood' },
                    { x: .70, y: .57, w: .18, h: .04, mat: 'stone' },
                    { x: .70, y: .53, w: .04, h: .08, mat: 'ice' }, { x: .84, y: .53, w: .04, h: .08, mat: 'ice' },
                    { x: .70, y: .45, w: .18, h: .04, mat: 'wood' },
                ]
            },

            // 20 — Final Judgment (All birds, all bosses)
            {
                birds: ['tom', 'pearl', 'charlie', 'donald', 'jeff', 'stewie', 'offend', 'aura'],
                pigs: [{ x: .65, y: .62, boss: true }, { x: .75, y: .62, boss: true }, { x: .85, y: .62, boss: true },
                { x: .70, y: .48, boss: true }, { x: .80, y: .48, boss: true },
                { x: .67, y: .74 }, { x: .73, y: .74 }, { x: .79, y: .74 }, { x: .85, y: .74 }, { x: .91, y: .74 }],
                blocks: [
                    { x: .63, y: .77, w: .04, h: .18, mat: 'stone' }, { x: .67, y: .77, w: .04, h: .18, mat: 'stone' },
                    { x: .71, y: .77, w: .04, h: .18, mat: 'stone' }, { x: .75, y: .77, w: .04, h: .30, mat: 'stone' },
                    { x: .79, y: .77, w: .04, h: .18, mat: 'stone' }, { x: .83, y: .77, w: .04, h: .18, mat: 'stone' },
                    { x: .87, y: .77, w: .04, h: .18, mat: 'stone' }, { x: .91, y: .77, w: .04, h: .18, mat: 'stone' },
                    { x: .63, y: .59, w: .32, h: .04, mat: 'stone' },
                    { x: .65, y: .55, w: .04, h: .10, mat: 'ice' }, { x: .71, y: .55, w: .04, h: .10, mat: 'ice' },
                    { x: .77, y: .55, w: .04, h: .10, mat: 'ice' }, { x: .83, y: .55, w: .04, h: .10, mat: 'ice' },
                    { x: .89, y: .55, w: .04, h: .10, mat: 'ice' },
                    { x: .65, y: .45, w: .28, h: .04, mat: 'stone' },
                    { x: .68, y: .41, w: .22, h: .04, mat: 'ice' },
                    { x: .71, y: .37, w: .16, h: .04, mat: 'wood' },
                    { x: .74, y: .33, w: .10, h: .04, mat: 'stone' },
                ]
            },

            // 21 — THE WHITE HOUSE 🏛️ (bonus level!)
            {
                birds: ['donald', 'donald', 'jeff', 'charlie', 'tom', 'pearl'],
                theme: 'whitehouse',
                pigs: [
                    { x: .62, y: .72 }, { x: .70, y: .72 }, { x: .78, y: .72 }, { x: .86, y: .72 },
                    { x: .66, y: .58, boss: true }, { x: .82, y: .58, boss: true },
                    { x: .74, y: .44, boss: true },
                ],
                blocks: [
                    // White House columns
                    { x: .60, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .645, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .69, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .735, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .78, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .825, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .87, y: .77, w: .035, h: .28, mat: 'stone' },
                    // Roof
                    { x: .60, y: .49, w: .31, h: .04, mat: 'stone' },
                    { x: .62, y: .45, w: .27, h: .04, mat: 'stone' },
                    { x: .64, y: .41, w: .23, h: .04, mat: 'stone' },
                    // Wings
                    { x: .57, y: .77, w: .04, h: .16, mat: 'stone' }, { x: .90, y: .77, w: .04, h: .16, mat: 'stone' },
                    { x: .53, y: .77, w: .04, h: .10, mat: 'stone' }, { x: .94, y: .77, w: .04, h: .10, mat: 'stone' },
                    { x: .53, y: .67, w: .08, h: .04, mat: 'stone' }, { x: .90, y: .67, w: .08, h: .04, mat: 'stone' },
                    // TNT inside!
                    { x: .68, y: .61, w: .05, h: .05, mat: 'tnt' }, { x: .78, y: .61, w: .05, h: .05, mat: 'tnt' },
                ]
            },
            // ═══════════ NEW BONUS LEVELS ═══════════
            // 22 — TNT Fortress (lots of TNT to chain)
            {
                birds: ['donald', 'jeff', 'tom'],
                pigs: [{ x: .72, y: .62 }, { x: .84, y: .62 }, { x: .78, y: .48, boss: true }],
                blocks: [
                    { x: .68, y: .77, w: .04, h: .18, mat: 'wood' }, { x: .72, y: .77, w: .04, h: .18, mat: 'tnt' },
                    { x: .76, y: .77, w: .04, h: .30, mat: 'tnt' }, { x: .80, y: .77, w: .04, h: .18, mat: 'tnt' },
                    { x: .84, y: .77, w: .04, h: .18, mat: 'wood' },
                    { x: .72, y: .58, w: .16, h: .04, mat: 'stone' },
                    { x: .74, y: .51, w: .10, h: .04, mat: 'wood' },
                    { x: .76, y: .45, w: .06, h: .04, mat: 'tnt' },
                ]
            },
            // 23 — Glass Cannon (everything is fragile but pigs are protected)
            {
                birds: ['stewie', 'stewie', 'tom', 'tom'],
                pigs: [{ x: .65, y: .60, boss: true }, { x: .85, y: .60, boss: true }, { x: .75, y: .40, boss: true }],
                blocks: [
                    { x: .60, y: .77, w: .04, h: .20, mat: 'ice' }, { x: .64, y: .77, w: .04, h: .20, mat: 'ice' },
                    { x: .68, y: .77, w: .04, h: .20, mat: 'ice' }, { x: .72, y: .77, w: .04, h: .32, mat: 'ice' },
                    { x: .76, y: .77, w: .04, h: .32, mat: 'ice' }, { x: .80, y: .77, w: .04, h: .20, mat: 'ice' },
                    { x: .84, y: .77, w: .04, h: .20, mat: 'ice' }, { x: .88, y: .77, w: .04, h: .20, mat: 'ice' },
                    { x: .60, y: .55, w: .32, h: .04, mat: 'ice' },
                    { x: .70, y: .45, w: .16, h: .04, mat: 'ice' },
                ]
            },
            // 24 — The Prison (jeff perfect with bombs)
            {
                birds: ['jeff', 'jeff', 'jeff'],
                pigs: [{ x: .70, y: .55 }, { x: .78, y: .55 }, { x: .86, y: .55 },
                { x: .74, y: .65, boss: true }, { x: .82, y: .65, boss: true }],
                blocks: [
                    { x: .66, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .695, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .73, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .765, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .80, y: .77, w: .035, h: .28, mat: 'stone' }, { x: .835, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .87, y: .77, w: .035, h: .28, mat: 'stone' },
                    { x: .66, y: .49, w: .245, h: .04, mat: 'stone' },
                    { x: .66, y: .71, w: .245, h: .025, mat: 'stone' },
                ]
            },
            // 25 — Domino Effect (one shot can chain)
            {
                birds: ['tom', 'tom'],
                pigs: [{ x: .55, y: .74 }, { x: .62, y: .74 }, { x: .69, y: .74 }, { x: .76, y: .74 }, { x: .83, y: .74 }, { x: .90, y: .74 }],
                blocks: [
                    { x: .55, y: .77, w: .04, h: .20, mat: 'wood' }, { x: .62, y: .77, w: .04, h: .20, mat: 'wood' },
                    { x: .69, y: .77, w: .04, h: .20, mat: 'wood' }, { x: .76, y: .77, w: .04, h: .20, mat: 'wood' },
                    { x: .83, y: .77, w: .04, h: .20, mat: 'wood' }, { x: .90, y: .77, w: .04, h: .20, mat: 'wood' },
                ]
            },
            // 26 — Hidden Threat (pigs protected by deep TNT)
            {
                birds: ['donald', 'donald', 'tom', 'jeff', 'pearl'],
                pigs: [{ x: .78, y: .42, boss: true }, { x: .70, y: .65 }, { x: .86, y: .65 }],
                blocks: [
                    // Outer wall
                    { x: .65, y: .77, w: .04, h: .32, mat: 'stone' }, { x: .91, y: .77, w: .04, h: .32, mat: 'stone' },
                    { x: .65, y: .45, w: .30, h: .04, mat: 'stone' },
                    // Inner protection
                    { x: .74, y: .77, w: .04, h: .18, mat: 'wood' }, { x: .82, y: .77, w: .04, h: .18, mat: 'wood' },
                    { x: .70, y: .59, w: .04, h: .06, mat: 'tnt' }, { x: .86, y: .59, w: .04, h: .06, mat: 'tnt' },
                    { x: .74, y: .59, w: .12, h: .04, mat: 'stone' },
                    { x: .74, y: .50, w: .04, h: .05, mat: 'tnt' }, { x: .82, y: .50, w: .04, h: .05, mat: 'tnt' },
                ]
            },
        ];

        let G = null, LVL = 0, bgImg = null, LIVES = 3, totalScore = 0;

        // ── MENU ──
        function showMenu() { document.getElementById('menu').style.display = 'flex'; }

        // ── LEADERBOARD ──
        function showLeaderboard() {
            document.getElementById('ov').classList.remove('on');
            document.getElementById('lbmodal').style.display = 'block';
            loadLeaderboard();
        }
        function hideLb() { document.getElementById('lbmodal').style.display = 'none'; }

        function loadLeaderboard() {
            const list = document.getElementById('lb-list');
            list.innerHTML = '<p style="color:#888;text-align:center;font-family:sans-serif">Loading...</p>';
            fetch('/TomGames/leaderboard.php')
                .then(r => r.json())
                .then(scores => {
                    if (!scores.length) { list.innerHTML = '<p style="color:#888;text-align:center;font-family:sans-serif">No scores yet — be the first! 💩</p>'; return; }
                    const medals = ['🥇', '🥈', '🥉'];
                    list.innerHTML = scores.map((s, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:rgba(255,255,255,.04);border-radius:10px;margin-bottom:8px;${i === 0 ? 'border:2px solid #ffcc00' : ''}">
          <div style="font-size:22px;min-width:32px;text-align:center">${medals[i] || '#' + (i + 1)}</div>
          <div style="flex:1">
            <div style="color:#fff;font-family:'Bangers',cursive;font-size:18px">${s.name}</div>
            <div style="color:#888;font-size:11px;font-family:sans-serif">Level ${s.level} • ${s.date}</div>
          </div>
          <div style="color:#ffcc00;font-family:'Bangers',cursive;font-size:22px">${s.score.toLocaleString()}</div>
        </div>`).join('');
                })
                .catch(() => { list.innerHTML = '<p style="color:#ff4444;text-align:center;font-family:sans-serif">Could not load scores.</p>'; });
        }

        function submitScore() {
            const name = document.getElementById('lb-name').value.trim() || 'Anonymous';
            const score = G?.score || 0;
            const level = LVL + 1;
            const msg = document.getElementById('lb-msg');

            if (score <= 0) { msg.style.color = '#ff4444'; msg.textContent = 'Play a level first!'; return; }

            msg.style.color = '#ffcc00'; msg.textContent = 'Submitting...';
            fetch('/TomGames/leaderboard.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score, level })
            })
                .then(r => r.json())
                .then(d => {
                    if (d.status === 'ok') {
                        msg.style.color = '#2ecc71';
                        msg.textContent = `✅ Submitted! You are rank #${d.rank} 🏆`;
                        loadLeaderboard();
                    } else {
                        msg.style.color = '#ff4444';
                        msg.textContent = 'Error: ' + (d.error || 'Unknown');
                    }
                })
                .catch(() => { msg.style.color = '#ff4444'; msg.textContent = 'Network error.'; });
        }

        function showLevelSelect() {
            document.getElementById('ov').classList.remove('on');
            const grid = document.getElementById('lvlgrid');
            grid.innerHTML = '';
            LEVELS.forEach((lvl, i) => {
                const hs = parseInt(localStorage.getItem('tb_hs_' + i) || 0);
                const stars = hs > 3000 ? 3 : hs > 1600 ? 2 : hs > 800 ? 1 : 0;
                const starStr = ['', '⭐', '⭐⭐', '⭐⭐⭐'][stars];
                const btn = document.createElement('button');
                btn.style.cssText = 'background:rgba(255,200,0,.1);border:2px solid rgba(255,200,0,.3);border-radius:12px;padding:12px 6px;font-family:Bangers,cursive;color:#ffcc00;cursor:pointer;font-size:18px;transition:.2s;text-align:center';
                btn.innerHTML = `<div style="font-size:24px">${i + 1}</div><div style="font-size:11px;color:#aaa">${starStr || '🔒'}</div>${hs ? `<div style="font-size:9px;color:#888">${hs}pts</div>` : ''}`;
                btn.onmouseover = () => btn.style.background = 'rgba(255,200,0,.25)';
                btn.onmouseout = () => btn.style.background = 'rgba(255,200,0,.1)';
                btn.onclick = () => { hideLevelSelect(); startLevel(i); }
                grid.appendChild(btn);
            });
            document.getElementById('lvlsel').style.display = 'block';
        }

        function hideLevelSelect() {
            document.getElementById('lvlsel').style.display = 'none';
        }
        function hideMenu() {
            document.getElementById('menu').style.display = 'none';
            // Try fullscreen on mobile for best experience
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            startLevel(0);
        }

        // ── LEVEL START ──
        function startLevel(idx) {
            LVL = Math.min(idx, LEVELS.length - 1);
            const lvl = LEVELS[LVL];
            // ── DYNAMIC MAXPULL based on screen size ──
            // Bigger pull range on mobile for better feel + LAUNCH_MUL boost
            MAXPULL = Math.max(120, Math.min(200, W() * 0.22)); // ✅ Tighter pull zone = more precise control
            // LAUNCH_MUL stays constant at 0.32 — proven to work across all screens

            document.getElementById('ov').classList.remove('on');
            document.getElementById('lvn').textContent = LVL + 1;

            const slX = W() * 0.14;
            const slY = GND() - 20;
            // Scale everything by screen size
            const gameScale = Math.min(W() / 900, H() / 500, 1.5);

            const birds = lvl.birds.map(id => ({ ...BIRDS.find(b => b.id === id) }));

            const blocks = lvl.blocks.map(b => ({
                x: b.x * W(), y: b.y * H(),
                w: b.w * W(), h: b.h * H(), mat: b.mat,
                vx: 0, vy: 0, angle: 0, angV: 0,
                hp: { wood: 2, stone: 4, ice: 1, tnt: 1 }[b.mat] || 2, maxHp: { wood: 2, stone: 4, ice: 1, tnt: 1 }[b.mat] || 2,
            }));

            const pigs = lvl.pigs.map(p => ({
                x: p.x * W(), y: p.y * H(),
                r: Math.round((p.boss ? 30 : 22) * Math.min(W() / 900, H() / 500, 1.4)),
                hp: p.boss ? 3 : 1, maxHp: p.boss ? 3 : 1,
                vx: 0, vy: 0, dead: false, boss: !!p.boss, wobble: 0,
            }));

            _timeScale = 1.0; _slowMoUntil = 0;
            G = {
                slX, slY, birds, blocks, pigs,
                curBird: 0, score: 0,
                projs: [], parts: [], explosions: [], debris: [],
                drag: false, dragX: slX, dragY: slY - 30,
                state: 'ready', settleT: 0, powerUsed: false,
                slowmo: false, slowmoT: 0,
                // Camera
                camX: 0, camY: 0, camTargetX: 0, camTargetZ: 1, camZ: 1, shakeT: 0,
            };

            buildBg();
            updateQueue();
            updateHUD();
            updateBirdCard();
            if (musicStarted) updateBgmForLevel(LVL);
            // World intro banner
            const worldNames = ['WORLD 1 — Bibi\'s Lair', 'WORLD 1 — Bibi\'s Lair', 'WORLD 1 — Bibi\'s Lair',
                'WORLD 1 — Bibi\'s Lair', 'WORLD 1 — Bibi\'s Lair', 'WORLD 1 — Bibi\'s Lair', 'WORLD 1 — Bibi\'s Lair',
                '🏜️ WORLD 2 — Exile Desert', '🏜️ WORLD 2 — Exile Desert', '🏜️ WORLD 2 — Exile Desert',
                '🏜️ WORLD 2 — Exile Desert', '🏜️ WORLD 2 — Exile Desert', '🏜️ WORLD 2 — Exile Desert', '🏜️ WORLD 2 — Exile Desert',
                '⚖️ WORLD 3 — Space Tribunal', '⚖️ WORLD 3 — Space Tribunal', '⚖️ WORLD 3 — Space Tribunal',
                '⚖️ WORLD 3 — Space Tribunal', '⚖️ WORLD 3 — Space Tribunal', '⚖️ WORLD 3 — Space Tribunal',
                '🏛️ BONUS — The White House'];
            showWorldBanner(worldNames[LVL] || '⚖️ WORLD 3 — Space Tribunal', LVL + 1);
            if (!window._raf) { window._raf = true; requestAnimationFrame(loop); }
        }

        // ── BG ──
        function getWorldTheme() {
            if (!LVL && LVL !== 0) return 'night';
            if (LEVELS[LVL]?.theme) return LEVELS[LVL].theme;
            if (LVL < 7) return 'night';
            if (LVL < 14) return 'desert';
            return 'space';
        }

        function buildBg() {
            const oc = document.createElement('canvas');
            oc.width = W(); oc.height = H();
            const theme = getWorldTheme();
            const ox = oc.getContext('2d');

            if (theme === 'night') {
                // WORLD 1: Night forest
                const sk = ox.createLinearGradient(0, 0, 0, H());
                sk.addColorStop(0, '#06060f'); sk.addColorStop(.55, '#0e1130');
                sk.addColorStop(.82, '#142010'); sk.addColorStop(1, '#0a1508');
                ox.fillStyle = sk; ox.fillRect(0, 0, W(), H());
                for (let i = 0; i < 180; i++) {
                    ox.fillStyle = `rgba(255,255,255,${.3 + Math.random() * .7})`;
                    const sz = Math.random() < .15 ? 2 : 1;
                    ox.fillRect(Math.random() * W(), Math.random() * H() * .72, sz, sz);
                }
                // Tom Pearl IS the moon
                const moonR = Math.max(38, Math.min(W(), H()) * .075);
                const moonX = W() * .83, moonY = H() * .09;
                
                    ox.fillStyle = 'rgba(255,245,210,.92)'; ox.beginPath(); ox.arc(moonX, moonY, moonR, 0, Math.PI * 2); ox.fill();
                
                ox.fillStyle = '#0c1808';
                ox.beginPath(); ox.moveTo(0, H());
                for (let x = 0; x <= W(); x += 18) { ox.lineTo(x, GND() - 15 + Math.sin(x * .007) * H() * .13 + Math.cos(x * .019) * H() * .05); }
                ox.lineTo(W(), H()); ox.closePath(); ox.fill();
                ox.fillStyle = '#081005';
                for (let tx = W() * .02; tx < W() * .98; tx += W() * .048 + Math.random() * W() * .03) {
                    const th = 30 + Math.random() * 60;
                    ox.beginPath(); ox.moveTo(tx, GND() - th); ox.lineTo(tx - 11, GND()); ox.lineTo(tx + 11, GND()); ox.closePath(); ox.fill();
                }
                const g = ox.createLinearGradient(0, GND(), 0, H());
                g.addColorStop(0, '#2d5a1b'); g.addColorStop(.3, '#1e3e12'); g.addColorStop(1, '#0f1f08');
                ox.fillStyle = g; ox.fillRect(0, GND(), W(), H() - GND());
                ox.strokeStyle = '#3d7a28'; ox.lineWidth = 3;
                ox.beginPath(); ox.moveTo(0, GND()); ox.lineTo(W(), GND()); ox.stroke();
                ox.strokeStyle = '#4a9430'; ox.lineWidth = 2;
                for (let gx = 10; gx < W(); gx += 18 + Math.random() * 12) {
                    ox.beginPath(); ox.moveTo(gx, GND()); ox.lineTo(gx - 3, GND() - 6 - Math.random() * 5); ox.stroke();
                    ox.beginPath(); ox.moveTo(gx + 4, GND()); ox.lineTo(gx + 7, GND() - 5 - Math.random() * 5); ox.stroke();
                }

            } else if (theme === 'desert') {
                // WORLD 2: Desert day
                const sk = ox.createLinearGradient(0, 0, 0, H());
                sk.addColorStop(0, '#1a0a00'); sk.addColorStop(.4, '#c45a00');
                sk.addColorStop(.75, '#e87820'); sk.addColorStop(1, '#3a1800');
                ox.fillStyle = sk; ox.fillRect(0, 0, W(), H());
                // Desert stars (less)
                for (let i = 0; i < 40; i++) {
                    ox.fillStyle = `rgba(255,220,150,${.2 + Math.random() * .4})`;
                    ox.fillRect(Math.random() * W(), Math.random() * H() * .3, 1, 1);
                }
                // Sun
                const sunG = ox.createRadialGradient(W() * .7, H() * .12, 5, W() * .7, H() * .12, 60);
                sunG.addColorStop(0, 'rgba(255,255,200,1)'); sunG.addColorStop(.5, 'rgba(255,180,0,.8)'); sunG.addColorStop(1, 'rgba(255,100,0,0)');
                ox.fillStyle = sunG; ox.beginPath(); ox.arc(W() * .7, H() * .12, 60, 0, Math.PI * 2); ox.fill();
                // Sand dunes
                ox.fillStyle = '#8B4513';
                ox.beginPath(); ox.moveTo(0, H());
                for (let x = 0; x <= W(); x += 15) { ox.lineTo(x, GND() + 5 + Math.sin(x * .004) * H() * .08 + Math.cos(x * .011) * H() * .04); }
                ox.lineTo(W(), H()); ox.closePath(); ox.fill();
                // Cacti
                ox.fillStyle = '#2d5a1b';
                for (let cx = W() * .1; cx < W(); cx += W() * .15 + Math.random() * W() * .1) {
                    const ch = 25 + Math.random() * 35;
                    ox.fillRect(cx - 4, GND() - ch, 8, ch);
                    ox.fillRect(cx - 14, GND() - ch * .6, 10, 6);
                    ox.fillRect(cx + 4, GND() - ch * .5, 10, 6);
                }
                // Tom Pearl bureau in the desert distance
                
                // Sand ground
                const g = ox.createLinearGradient(0, GND(), 0, H());
                g.addColorStop(0, '#c4890a'); g.addColorStop(.3, '#a06008'); g.addColorStop(1, '#603800');
                ox.fillStyle = g; ox.fillRect(0, GND(), W(), H() - GND());
                ox.strokeStyle = '#e8a020'; ox.lineWidth = 2;
                ox.beginPath(); ox.moveTo(0, GND()); ox.lineTo(W(), GND()); ox.stroke();

            } else if (theme === 'whitehouse') {
                // WHITE HOUSE level — daytime American theme 🏛️
                const sk = ox.createLinearGradient(0, 0, 0, H());
                sk.addColorStop(0, '#1a3a6a'); sk.addColorStop(.5, '#3a6aaa');
                sk.addColorStop(.8, '#6aaad0'); sk.addColorStop(1, '#1a3a20');
                ox.fillStyle = sk; ox.fillRect(0, 0, W(), H());
                // American clouds
                ox.fillStyle = 'rgba(255,255,255,.9)';
                [[W() * .2, H() * .15, 60], [W() * .5, H() * .1, 80], [W() * .75, H() * .18, 50]].forEach(([x, y, r]) => {
                    ox.beginPath(); ox.arc(x, y, r, Math.PI, 0); ox.arc(x + r * .6, y - r * .3, r * .5, Math.PI, 0); ox.arc(x - r * .5, y - r * .2, r * .4, Math.PI, 0); ox.fill();
                });
                // Stars and stripes sky hint
                for (let i = 0; i < 5; i++) {
                    ox.fillStyle = `rgba(255,0,0,.${i % 2 === 0 ? '06' : '03'})`;
                    ox.fillRect(0, i * (H() * .15), W(), H() * .08);
                }
                // White house background image
                
                // Green lawn
                const g = ox.createLinearGradient(0, GND(), 0, H());
                g.addColorStop(0, '#3a8a1a'); g.addColorStop(1, '#1a4a08');
                ox.fillStyle = g; ox.fillRect(0, GND(), W(), H() - GND());
                ox.strokeStyle = '#4aaa28'; ox.lineWidth = 3;
                ox.beginPath(); ox.moveTo(0, GND()); ox.lineTo(W(), GND()); ox.stroke();
                // American flag
                const fx = W() * .92, fy = GND() - 80, fw = 40, fh = 25;
                ox.fillStyle = '#ff0000';
                for (let r = 0; r < 5; r++) { if (r % 2 === 0) { ox.fillRect(fx, fy + r * fh / 5, fw, fh / 5); } }
                ox.fillStyle = 'rgba(0,0,100,.8)'; ox.fillRect(fx, fy, fw * .4, fh * .5);
                ox.fillStyle = '#fff'; ox.font = '6px serif'; ox.fillText('🇺🇸', fx, fy + 10);
                ox.strokeStyle = '#888'; ox.lineWidth = 2;
                ox.beginPath(); ox.moveTo(fx, fy); ox.lineTo(fx, GND()); ox.stroke();

            } else {
                // WORLD 3: Space!
                ox.fillStyle = '#000005'; ox.fillRect(0, 0, W(), H());
                // Lots of stars
                for (let i = 0; i < 300; i++) {
                    const brightness = .2 + Math.random() * .8;
                    ox.fillStyle = `rgba(255,255,255,${brightness})`;
                    const sz = Math.random() < .05 ? 3 : Math.random() < .15 ? 2 : 1;
                    ox.beginPath(); ox.arc(Math.random() * W(), Math.random() * H() * .85, sz, 0, Math.PI * 2); ox.fill();
                }
                // Nebula
                const neb = ox.createRadialGradient(W() * .6, H() * .3, 0, W() * .6, H() * .3, W() * .3);
                neb.addColorStop(0, 'rgba(100,0,150,.15)'); neb.addColorStop(.5, 'rgba(0,50,150,.08)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
                ox.fillStyle = neb; ox.fillRect(0, 0, W(), H());
                // Planet
                const pG = ox.createRadialGradient(W() * .15, H() * .15, 5, W() * .15, H() * .15, 55);
                pG.addColorStop(0, '#ff6644'); pG.addColorStop(.6, '#cc3300'); pG.addColorStop(1, '#660000');
                ox.fillStyle = pG; ox.beginPath(); ox.arc(W() * .15, H() * .15, 55, 0, Math.PI * 2); ox.fill();
                // Moon surface
                const mg = ox.createLinearGradient(0, GND(), 0, H());
                mg.addColorStop(0, '#888890'); mg.addColorStop(.3, '#606068'); mg.addColorStop(1, '#303035');
                ox.fillStyle = mg; ox.fillRect(0, GND(), W(), H() - GND());
                // Craters
                for (let i = 0; i < 8; i++) {
                    const cx = Math.random() * W(), cy = GND() + Math.random() * (H() - GND());
                    const cr = 5 + Math.random() * 20;
                    ox.strokeStyle = 'rgba(0,0,0,.4)'; ox.lineWidth = 2;
                    ox.beginPath(); ox.arc(cx, cy, cr, 0, Math.PI * 2); ox.stroke();
                }
                ox.strokeStyle = '#aaaaaa'; ox.lineWidth = 2;
                ox.beginPath(); ox.moveTo(0, GND()); ox.lineTo(W(), GND()); ox.stroke();
            }
            bgImg = oc;
        }

        // ── MAIN LOOP ──
        function loop() {
            requestAnimationFrame(loop);
            if (G && G.state !== 'over') update();
            render();
        }

        // ── PHYSICS UPDATE ──
        function update() {
            updateTimeScale();
            // ── Projectiles ──
            G.projs.forEach(p => {
                if (p.dead) return;
                // Gravity (ghost still gets gravity, just passes through blocks)
                // ── Apply time scale (slow-mo) ──
                const _ts = (typeof _timeScale !== 'undefined') ? _timeScale : 1.0;
                p.vy += GRAV * _ts;
                p.vx *= AIR_DRAG; p.vy *= AIR_DRAG;
                // Velocity scaled by time
                p._effVx = p.vx * _ts;
                p._effVy = p.vy * _ts;
                // Boomerang pull-back
                if (p.boomer && p.powerUsed) {
                    const str = p.boomerStrength || .003;
                    p.vx += (G.slX - p.x) * str;
                    p.vy += (G.slY - 85 - p.y) * str * .5;
                }
                p.x += (p._effVx || p.vx); p.y += (p._effVy || p.vy);
                // ── BIRD ROTATION (Angry Birds style) ──
                if (!p.angV) p.angV = 0;
                const targetAng = Math.atan2(p.vy, p.vx);
                p.ang = (p.ang || 0);
                // Smoothly rotate to face velocity direction
                let angDiff = targetAng - p.ang;
                while (angDiff > Math.PI) angDiff -= 2 * Math.PI;
                while (angDiff < -Math.PI) angDiff += 2 * Math.PI;
                p.ang += angDiff * 0.15;
                p.angle = Math.atan2(p.vy, p.vx);
                // Trail
                p.trail.unshift({ x: p.x, y: p.y });
                if (p.trail.length > 20) p.trail.pop();
                // Ground collision
                const pr2 = p.r || p.size || 20;
                if (p.y + pr2 > GND()) {
                    p.y = GND() - pr2;
                    const speed = Math.hypot(p.vx, p.vy);
                    if (speed > 3) playThud();
                    if (speed < 0.3) {
                        // ── HUMOR: Miss check ──
                        if (typeof maybeTaunt === 'function' && !G._anyKillThisShot) {
                            maybeTaunt('miss');
                        }
                        G._anyKillThisShot = false;
                        killProj(p);
                        return;
                    }
                    p.vy *= -BOUNCE; p.vx *= GROUND_FRIC;
                    scatter(p.x, GND(), p.color, 5);
                    if (p.power === 'bomb') { explodeBomb(p); killProj(p); return; }
                }
                // Out of bounds
                if (p.x < -100 || p.x > W() + 100 || p.y > H() + 100) { killProj(p); return; }
                // Block hits
                if (!p.ghost) checkBlockHits(p);
                // Pig hits
                checkPigHits(p);
            });

            // ── Explosions ──
            G.explosions = G.explosions.filter(e => e.r < e.maxR);
            G.explosions.forEach(e => {
                e.r += e.spd;
                // Damage in expanding ring
                G.blocks.forEach(bl => {
                    if (bl.hp <= 0 || bl._blasted) return;
                    const d = Math.hypot(bl.x + bl.w / 2 - e.ox, bl.y + bl.h / 2 - e.oy);
                    if (d < e.r + 20) { bl._blasted = true; bl.hp -= 2; bl.vx += (bl.x - e.ox) * .06; bl.vy += (bl.y - e.oy) * .06 - 3; addSc(40); scatter(bl.x + bl.w / 2, bl.y + bl.h / 2, matClr(bl.mat), 4); }
                });
                G.pigs.forEach(pg => {
                    if (pg.dead || pg._blasted) return;
                    if (Math.hypot(pg.x - e.ox, pg.y - e.oy) < e.r + 35) { pg._blasted = true; pg.hp -= 4; pg.vy -= 6; pg.vx += (pg.x - e.ox) * .08; pg.wobble = 35; checkPigDead(pg); }
                });
            });

            // ── Block physics ──
            G.blocks.forEach(bl => {
                if (bl.hp <= 0) return;
                bl.vy += GRAV * .65;
                bl.x += bl.vx; bl.y += bl.vy;
                bl.angle += bl.angV;
                bl.angV *= ANGDAMP; bl.vx *= .96; bl.vy *= .99;
                // Ground
                if (bl.y + bl.h / 2 > GND()) {
                    bl.y = GND() - bl.h / 2;
                    if (Math.abs(bl.vy) > 1) scatter(bl.x + bl.w / 2, GND(), matClr(bl.mat), 3);
                    bl.vy *= -BOUNCE * .5; bl.vx *= FRIC; bl.angV *= .4;
                }
                // Block-block collisions (simple AABB settle)
                G.blocks.forEach(b2 => {
                    if (b2 === bl || b2.hp <= 0) return;
                    if (aabbOverlap(bl, b2)) {
                        const overlapY = (bl.y + bl.h / 2) - (b2.y - b2.h / 2);
                        if (overlapY > 0 && overlapY < 20 && bl.vy > 0) {
                            bl.y -= overlapY * .5; b2.y += overlapY * .5;
                            const impact = Math.abs(bl.vy);
                            bl.vy *= -.2; b2.vy += bl.vy * .1;
                            if (impact > 3) { bl.hp -= Math.floor(impact * .2); b2.hp -= Math.floor(impact * .2); }
                        }
                    }
                });
            });

            // ── Pig physics ──
            G.pigs.forEach(pg => {
                if (pg.dead) return;
                pg.vy += GRAV;
                pg.x += pg.vx; pg.y += pg.vy;
                pg.vx *= .92; pg.vy *= .99;
                pg.wobble = Math.max(0, pg.wobble - 1);
                if (pg.y + pg.r > GND()) { pg.y = GND() - pg.r; pg.vy *= -BOUNCE * .4; pg.vx *= FRIC; }
                if (pg.x - pg.r < 0) { pg.x = pg.r; pg.vx *= -.5; }
                if (pg.x + pg.r > W()) { pg.x = W() - pg.r; pg.vx *= -.5; }
            });

            // ── Particles ──
            G.parts = G.parts.filter(p => p.l > 0);
            G.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .09; p.vx *= .97; p.l--; });

            // Debris chunks physics
            G.debris = G.debris.filter(d => d.l > 0);
            G.debris.forEach(d => {
                d.vy += GRAV * .8; d.x += d.vx; d.y += d.vy;
                d.angle += d.angV; d.angV *= .92; d.vx *= .97; d.l--;
                if (d.y + d.h / 2 > GND()) { d.y = GND() - d.h / 2; d.vy *= -.3; d.vx *= .6; d.angV *= .35; }
            });

            // ── Camera update ──
            // Follow the flying bird
            const flyingProj = G.projs.find(p => !p.dead);
            if (flyingProj && G.state === 'flying') {
                // Smoothly pan to follow bird
                G.camTargetX = -(flyingProj.x - W() * 0.35);
                // Zoom out as bird goes higher
                const height = GND() - flyingProj.y;
                G.camTargetZ = Math.max(0.65, 1 - height / H() * 0.5);
            } else {
                // Return to slingshot view
                G.camTargetX = 0;
                G.camTargetZ = 1;
            }
            G.camX += (G.camTargetX - G.camX) * 0.08;
            G.camZ += (G.camTargetZ - G.camZ) * 0.06;
            // Camera shake
            if (G.shakeT > 0) {
                G.camX += (Math.random() - .5) * G.shakeT * 2;
                G.camY = (Math.random() - .5) * G.shakeT * 2;
                G.shakeT = Math.max(0, G.shakeT - 0.8);
            } else { G.camY = 0; }
            G.camX = Math.max(-(W() * 0.6), Math.min(0, G.camX));

            // ── State machine ──
            const anyFlying = G.projs.some(p => !p.dead && (Math.abs(p.vx) > .4 || Math.abs(p.vy) > .4 || p.y + p.r < GND() - .5));
            if (G.state === 'flying' && !anyFlying) { G.state = 'settle'; G.settleT = 50; }
            if (G.state === 'settle') {
                G.settleT--;
                if (G.settleT <= 0) {
                    G.curBird++;
                    showMobilePower(false);
                    if (G.curBird >= G.birds.length) { endLvl(false); }
                    else { G.state = 'ready'; G.powerUsed = false; G.dragX = G.slX; G.dragY = G.slY - 30; updateQueue(); updateBirdCard(); }
                }
            }
            if (G.pigs.every(p => p.dead) && G.state !== 'over') endLvl(true);
            updateHUD();
        }

        function checkBlockHits(p) {
            const pr = p.r || p.size || 20;
            G.blocks.forEach(bl => {
                if (bl.hp <= 0) return;
                const nx = Math.max(bl.x, Math.min(p.x, bl.x + bl.w));
                const ny = Math.max(bl.y, Math.min(p.y, bl.y + bl.h));
                const dist = Math.hypot(p.x - nx, p.y - ny);
                if (dist < pr) {
                    const speed = Math.hypot(p.vx, p.vy);
                    // ACID: destroys stone and ice instantly, double dmg on wood
                    const acidBonus = p.acid && (bl.mat === 'stone' || bl.mat === 'ice') ? 99 : p.acid ? 3 : 0;
                    const dmg = ((p.power === 'speed' ? 6 : p.power === 'poop' ? 1 : 2) + acidBonus) * (p.rageMul || 1);
                    bl.hp -= dmg;
                    // Push block
                    const nx2 = (p.x - nx) / Math.max(dist, .1), ny2 = (p.y - ny) / Math.max(dist, .1);
                    bl.vx += p.vx * .4; bl.vy += p.vy * .3 - 1.2;
                    bl.angV += (p.vx > 0 ? .08 : -.08) * (speed / 10);
                    addSc(30);
                    if (p.acid) { scatter(p.x, p.y, '#00ff88', 10); burst(p.x, p.y, '☢️', 2); playAcid(); }
                    else { scatter(p.x, p.y, matClr(bl.mat), 6); if (Math.random() < 0.15) playSfx('sfx_cheese', 0.12); else playCrunch(); }
                    if (bl.hp <= 0) {
                        scatter(bl.x + bl.w / 2, bl.y + bl.h / 2, matClr(bl.mat), 10);
                        spawnDebrisFragments(bl);
                        if (bl.mat === 'tnt') {
                            // TNT chain explosion!
                            G.explosions.push({ ox: bl.x + bl.w / 2, oy: bl.y + bl.h / 2, r: 10, maxR: 120, spd: 8 });
                            G.blocks.forEach(b => b._blasted = false);
                            G.pigs.forEach(p => p._blasted = false);
                            burst(bl.x + bl.w / 2, bl.y + bl.h / 2, '💥', 12);
                            burst(bl.x + bl.w / 2, bl.y + bl.h / 2, '🔥', 8);
                        }
                    }
                    // Bird reaction
                    if (p.power === 'bomb') { explodeBomb(p); killProj(p); }
                    else if (p.power !== 'speed' || speed < 3) { p.vx *= -.15; p.vy *= -.25; killProj(p); }
                    else { p.vx *= .7; p.vy *= .6; } // speed bird punches through
                }
            });
        }

        function checkPigHits(p) {
            const pr = p.r || p.size || 20;
            G.pigs.forEach(pg => {
                if (pg.dead) return;
                const d = Math.hypot(p.x - pg.x, p.y - pg.y);
                if (d < pr + pg.r) {
                    const dmg = (p.power === 'speed' ? 6 : p.power === 'bomb' ? 0 : p.power === 'poop' ? 2 : p.power === 'boomer' ? 4 : 3) * (p.rageMul || 1);
                    pg.hp -= dmg; pg.vx += p.vx * .4; pg.vy += p.vy * .3 - 2; pg.wobble = 30;
                    checkPigDead(pg);
                    addSc(50);
                    scatter(p.x, p.y, '#2ecc71', 6); playOink();
                    if (p.power === 'bomb') { explodeBomb(p); killProj(p); }
                    else if (p.power !== 'speed') { killProj(p); }
                }
            });
        }

        function checkPigDead(pg) {
            if (pg.hp <= 0 && !pg.dead) {
                pg.dead = true;
                if (G) G._anyKillThisShot = true;
                // ── COMBO SYSTEM ──
                const now = performance.now();
                if (!G.lastKillT || now - G.lastKillT > 1500) G.combo = 1;
                else G.combo = (G.combo || 1) + 1;
                G.lastKillT = now;
                // ── HUMOR: Hit reaction ──
                if (typeof maybeTaunt === 'function' && G.combo >= 2) maybeTaunt('hit');

                const baseScore = pg.boss ? 600 : 200;
                const comboScore = G.combo > 1 ? Math.floor(baseScore * (1 + G.combo * 0.3)) : baseScore;
                addSc(comboScore);
                scatter(pg.x, pg.y, '#2ecc71', 16);
                burst(pg.x, pg.y, '💀', 6);
                if (pg.boss) burst(pg.x, pg.y, '🏆', 4);

                // Show combo text
                if (G.combo >= 2) {
                    G.comboText = { x: pg.x, y: pg.y - 30, text: `${G.combo}x COMBO! +${comboScore}`, t: 50 };
                }
                // ── SLOW-MO on big kills ──
                if (G.combo >= 3 && typeof triggerSlowMo === 'function') triggerSlowMo(400, 0.35);
                if (pg.boss && typeof triggerSlowMo === 'function') triggerSlowMo(500, 0.3);

                if (G.combo >= 5 && typeof unlockAchievement === 'function') {
                    unlockAchievement('combo_5');
                }

                playPigDeath();
                if (G) G.shakeT = 5; // shake on pig death!
            }
        }

        function killProj(p) {
            if (p.dead) return;
            scatter(p.x, p.y, p.color, 8);
            burst(p.x, p.y, '💥', 1);
            p.dead = true;
        }

        function spawnDebrisFragments(bl) {
            // Spawn visual wood/stone/ice chunks
            const n = 6 + Math.floor(Math.random() * 5);
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
                const sz = 8 + Math.random() * 18;
                G.debris.push({
                    x: bl.x + bl.w / 2 + (Math.random() - .5) * bl.w,
                    y: bl.y + bl.h / 2 + (Math.random() - .5) * bl.h,
                    vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
                    angle: Math.random() * Math.PI * 2,
                    angV: (Math.random() - .5) * .25,
                    w: sz, h: sz * (0.4 + Math.random() * .6),
                    mat: bl.mat, l: 60 + Math.random() * 40,
                });
            }
        }

        function explodeBomb(p) {
            G.explosions.push({ ox: p.x, oy: p.y, r: 10, maxR: 90, spd: 7 });
            G.blocks.forEach(bl => bl._blasted = false);
            G.pigs.forEach(pg => pg._blasted = false);
            burst(p.x, p.y, '🔥', 8);
            if (G) G.shakeT = 8; // camera shake on bomb!
        }

        // ── POWERS ──
        function activatePower() {
            if (!G || G.state !== 'flying' || G.powerUsed) return;
            const pr = G.projs.find(p => !p.dead); if (!pr) return;
            G.powerUsed = true; pr.powerUsed = true;
            showMobilePower(false);
            const b = G.birds[G.curBird];
            showPop(b.label, b.id);

            switch (pr.power) {
                case 'poop':
                    // Rain 6 poop bombs from current position
                    for (let i = 0; i < 6; i++) {
                        const off = (i - 2.5) * 22;
                        G.projs.push({
                            ...pr,
                            x: pr.x + off, y: pr.y - 10,
                            vx: pr.vx * .2 + (Math.random() - .5) * 2,
                            vy: -(Math.abs(pr.vy) * .1) - 0.5, // slight upward then falls with gravity
                            trail: [], dead: false, ghost: false, boomer: false,
                            power: 'poop', size: 14, r: 14, _sub: true,
                        });
                    }
                    burst(pr.x, pr.y, '💩', 10);
                    playSfx('sfx_poop', 0.2);
                    break;

                case 'ghost':
                    pr.ghost = true;
                    burst(pr.x, pr.y, '👻', 5);
                    break;

                case 'split':
                    // 5 acid fragments, wider spread, faster
                    [-0.55, -0.25, 0, .25, .55].forEach((da) => {
                        const spd = Math.hypot(pr.vx, pr.vy);
                        const ang = pr.angle + da;
                        G.projs.push({
                            ...pr,
                            vx: Math.cos(ang) * spd * 1.3,
                            vy: Math.sin(ang) * spd * 1.3,
                            trail: [], dead: false, ghost: true, boomer: false,
                            size: 18, r: 18, _sub: true, acid: true,
                            color: '#00ff88',
                            acidDmg: 99, // instant kill stone/ice
                        });
                    });
                    pr.dead = true;
                    burst(pr.x, pr.y, '☠️', 12);
                    // Acid pool on ground
                    scatter(pr.x, pr.y, '#00ff44', 20);
                    break;

                case 'speed':
                    const spd = Math.hypot(pr.vx, pr.vy);
                    pr.vx = (pr.vx / spd) * spd * 2.3;
                    pr.vy = (pr.vy / spd) * spd * 1.6;
                    burst(pr.x, pr.y, '🍊', 6);
                    break;

                case 'bomb':
                    explodeBomb(pr);
                    pr.dead = true;
                    break;

                case 'boomer':
                    // Strong reverse + upward curve for wide arc
                    pr.vx *= -1.2;
                    pr.vy *= -0.6;
                    pr.vy -= 2; // kick upward for arc
                    pr.boomer = true;
                    pr.boomerStrength = 0.008; // stronger pull back
                    pr.ghost = true; // passes through blocks (hits multiple)
                    pr.boomerHits = new Set(); // track unique hits
                    burst(pr.x, pr.y, '🍺', 10);
                    break;

                case 'rage':
                    // 3x damage multiplier + terrify all nearby pigs
                    pr.rageMul = 3;
                    G.pigs.forEach(pg => { if (!pg.dead) { pg.wobble = 80; pg.vx += (Math.random() - .5) * 4; } });
                    burst(pr.x, pr.y, '😡', 12);
                    burst(pr.x, pr.y, '🔥', 8);
                    if (G) G.shakeT = 6;
                    playSfx('sfx_rage', 0.25);
                    break;

                case 'aura':
                    // Mega shockwave — much larger than bomb
                    G.explosions.push({ ox: pr.x, oy: pr.y, r: 10, maxR: 220, spd: 12 });
                    G.blocks.forEach(bl => bl._blasted = false);
                    G.pigs.forEach(pg => pg._blasted = false);
                    burst(pr.x, pr.y, '✨', 18);
                    burst(pr.x, pr.y, '💫', 12);
                    burst(pr.x, pr.y, '💥', 8);
                    pr.dead = true;
                    if (G) G.shakeT = 15;
                    break;
            }
        }

        // ── RENDER ──
        function render() {
            ctx.clearRect(0, 0, W(), H());

            // Draw parallax background (doesn't move with camera)
            if (bgImg) {
                ctx.save();
                // Parallax: bg moves at 30% of camera speed
                ctx.translate(G?.camX * 0.3 || 0, 0);
                ctx.drawImage(bgImg, 0, 0);
                ctx.restore();
            }

            // Animated Tom Pearl moon halo (screen space, no camera transform)
            if (G) {
                const moonR = Math.max(38, Math.min(W(), H()) * .075);
                const moonX = W() * .83, moonY = H() * .09;
                const pulse = Math.sin(Date.now() * .0018) * 0.5 + 0.5;
                // Outer corona
                const corona = ctx.createRadialGradient(moonX, moonY, moonR * .9, moonX, moonY, moonR * 1.6);
                corona.addColorStop(0, `rgba(255,240,180,${.18 + pulse * .14})`);
                corona.addColorStop(.5, `rgba(255,200,80,${.06 + pulse * .06})`);
                corona.addColorStop(1, 'rgba(255,200,80,0)');
                ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.6, 0, Math.PI * 2); ctx.fill();
                // Shimmering ring
                ctx.strokeStyle = `rgba(255,245,180,${.45 + pulse * .4})`;
                ctx.lineWidth = 2 + pulse * 2;
                ctx.beginPath(); ctx.arc(moonX, moonY, moonR + 1, 0, Math.PI * 2); ctx.stroke();
            }

            if (!G) return;

            // Apply camera transform to world
            ctx.save();
            ctx.translate(G.camX, G.camY || 0);

            drawSling();
            if (G.drag) drawAimLine();

            // Toilet seat under Tom Pearl on sling
            if (G.state === 'ready' && G.curBird < G.birds.length && G.birds[G.curBird]?.id === 'tom') {
                const sc4b = Math.min(W() / 900, H() / 450, 1.8);
                const tx = G.drag ? G.dragX : G.slX, ty = G.drag ? G.dragY : G.slY - 85;
                if (TOILETIMG.complete && TOILETIMG.naturalWidth > 0) {
                    const ts = 48 * sc4b;
                    ctx.drawImage(TOILETIMG, tx - ts / 2, ty + 8, ts, ts * .7);
                }
            }
            // Power Sling indicator for Tom
            if (G.state === 'ready' && G.curBird < G.birds.length && G.birds[G.curBird]?.id === 'tom') {
                const sc4 = Math.min(W() / 900, H() / 450, 1.8);
                ctx.save();
                ctx.font = `bold ${14 * sc4}px 'Bangers',cursive`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffcc00';
                ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
                ctx.fillText('⚡ POWER SLING ⚡', G.slX, G.slY - 90 * sc4);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            // Ready bird on sling
            if (G.state === 'ready' && G.curBird < G.birds.length) {
                const b = G.birds[G.curBird];
                const bscale = Math.min(W() / 900, H() / 450, 1.5);
                const sc2 = Math.min(W() / 900, H() / 450, 1.8);
                drawBird(G.drag ? G.dragX : G.slX, G.drag ? G.dragY : G.slY - 85, b, bscale);
            }

            // Projectile trails
            G.projs.forEach(p => {
                for (let i = 1; i < p.trail.length; i++) {
                    const t = p.trail[i];
                    const al = (1 - i / p.trail.length) * .5;
                    ctx.globalAlpha = al;
                    if (p.acid) {
                        // Acid — green dripping trail
                        ctx.fillStyle = `hsl(${140 + i * 3},100%,${50 - i}%)`;
                        ctx.beginPath(); ctx.arc(t.x, t.y + i * .5, Math.max(1, (p.r || 8) * (1 - i / p.trail.length) * .9), 0, Math.PI * 2); ctx.fill();
                    } else {
                        ctx.fillStyle = p.color || '#fff';
                        ctx.beginPath(); ctx.arc(t.x, t.y, (p.r || 10) * (1 - i / p.trail.length) * .75, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.globalAlpha = 1;
                if (!p.dead) {
                    if (p.acid) {
                        ctx.save(); ctx.translate(p.x, p.y);
                        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12;
                        ctx.fillStyle = '#00ff44';
                        ctx.beginPath(); ctx.arc(0, 0, p.r || 8, 0, Math.PI * 2); ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.font = `${(p.r || 8) * 1.4}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('☢️', 0, 1);
                        ctx.restore();
                    } else if (p.power === 'poop' && p._sub) {
                        // Shitcocktail image for poop bombs!
                        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
                        const sr = p.r || 14;
                        if (SHITCOCKTAILIMG.complete && SHITCOCKTAILIMG.naturalWidth > 0) {
                            ctx.drawImage(SHITCOCKTAILIMG, -sr, -sr, sr * 2, sr * 2);
                        } else {
                            ctx.font = `${sr * 1.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText('💩', 0, 0);
                        }
                        ctx.restore();
                    } else {
                        drawBird(p.x, p.y, p, 1, p.ang || p.angle || 0);
                    }
                }
            });

            // Explosions
            G.explosions.forEach(e => {
                const a = Math.max(0, 1 - e.r / e.maxR);
                const rg = ctx.createRadialGradient(e.ox, e.oy, 0, e.ox, e.oy, e.r);
                rg.addColorStop(0, `rgba(255,230,60,${a})`);
                rg.addColorStop(.4, `rgba(255,80,0,${a * .8})`);
                rg.addColorStop(1, 'rgba(200,0,0,0)');
                ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.ox, e.oy, e.r, 0, Math.PI * 2); ctx.fill();
                // Shockwave ring
                ctx.strokeStyle = `rgba(255,200,50,${a * .5})`; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(e.ox, e.oy, e.r, 0, Math.PI * 2); ctx.stroke();
            });

            // Blocks — castle style
            G.blocks.forEach(bl => {
                if (bl.hp <= 0) return;
                const dmg = 1 - bl.hp / bl.maxHp;
                ctx.save(); ctx.translate(bl.x + bl.w / 2, bl.y + bl.h / 2); ctx.rotate(bl.angle);

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-bl.w / 2 + 4, bl.h / 2, bl.w, 6);

                // Base color
                const baseClr = matClr(bl.mat, dmg);
                ctx.fillStyle = baseClr;
                ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);

                // Stone brick texture
                if (bl.mat === 'stone' || bl.mat === 'wood') {
                    const brickH = Math.max(8, bl.h / Math.round(bl.h / 14));
                    const brickW = Math.max(16, bl.w / Math.round(bl.w / 22));
                    ctx.strokeStyle = bl.mat === 'stone' ? 'rgba(0,0,0,.25)' : 'rgba(80,40,0,.3)';
                    ctx.lineWidth = 1;
                    let row = 0;
                    for (let by = -bl.h / 2; by < bl.h / 2; by += brickH) {
                        const offset = (row % 2 === 0) ? 0 : brickW / 2;
                        for (let bx = -bl.w / 2 - offset; bx < bl.w / 2; bx += brickW) {
                            ctx.strokeRect(Math.max(-bl.w / 2, bx), by, Math.min(brickW, bl.w / 2 - Math.max(-bl.w / 2, bx)), brickH);
                        }
                        row++;
                    }
                }

                // Ice sheen
                if (bl.mat === 'ice') {
                    ctx.fillStyle = 'rgba(255,255,255,.18)';
                    ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w * .3, bl.h);
                    ctx.fillStyle = 'rgba(255,255,255,.08)';
                    ctx.fillRect(-bl.w / 2 + bl.w * .5, -bl.h / 2, bl.w * .15, bl.h);
                }

                // Tom Pearl face watermark on blocks
                if (TOMFACEIMG.complete && TOMFACEIMG.naturalWidth > 0 && bl.w > 20 && bl.h > 20) {
                    ctx.save(); ctx.globalAlpha = 0.12;
                    ctx.beginPath(); ctx.rect(-bl.w / 2, -bl.h / 2, bl.w, bl.h); ctx.clip();
                    ctx.drawImage(TOMFACEIMG, -bl.w / 2, -bl.h / 2, bl.w, bl.h);
                    ctx.restore();
                }
                // Top highlight
                ctx.fillStyle = 'rgba(255,255,255,.1)';
                ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, 4);

                // Border
                ctx.strokeStyle = matBrd(bl.mat); ctx.lineWidth = 2;
                ctx.strokeRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);

                // TNT label
                if (bl.mat === 'tnt') {
                    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(bl.w, bl.h) * .4}px monospace`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('TNT', 0, 0);
                    // Fuse spark animation
                    const spark = Math.sin(Date.now() * .02) > .6;
                    if (spark) { ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(-bl.w * .3, -bl.h * .5, 3, 0, Math.PI * 2); ctx.fill(); }
                }
                // Battlements on top of tall stone blocks (castle feel)
                if (bl.mat === 'stone' && bl.h > H() * .1 && !bl.angle) {
                    const merlonW = bl.w / 5;
                    ctx.fillStyle = matClr(bl.mat, dmg);
                    for (let mi = 0; mi < 3; mi++) {
                        const mx = -bl.w / 2 + mi * (bl.w / 3) + bl.w / 12;
                        ctx.fillRect(mx, -bl.h / 2 - merlonW * .8, bl.w / 5, merlonW * .8);
                        ctx.strokeRect(mx, -bl.h / 2 - merlonW * .8, bl.w / 5, merlonW * .8);
                    }
                }

                // Cracks
                if (dmg > .2) {
                    ctx.strokeStyle = `rgba(0,0,0,${dmg * .6})`; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(-bl.w * .25 + dmg * 4, -bl.h * .15); ctx.lineTo(bl.w * .1, bl.h * .35);
                    ctx.moveTo(bl.w * .2, -bl.h * .28); ctx.lineTo(-bl.w * .08 + dmg * 3, bl.h * .18);
                    if (dmg > .5) {
                        ctx.moveTo(-bl.w * .1, -bl.h * .4); ctx.lineTo(bl.w * .25, bl.h * .1);
                        ctx.moveTo(bl.w * .05, bl.h * .05); ctx.lineTo(-bl.w * .3, bl.h * .4);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            });

            // Pigs (BIBI!)
            G.pigs.forEach(pg => {
                if (pg.dead) return;
                const wb = pg.wobble > 0 ? Math.sin(pg.wobble * .55) * (pg.wobble / 22) * 6 : 0;
                const dmg = 1 - pg.hp / pg.maxHp;
                ctx.save(); ctx.translate(pg.x + wb, pg.y);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(2, pg.r * .95, pg.r * .9, pg.r * .28, 0, 0, Math.PI * 2); ctx.fill();
                // Boss glow
                if (pg.boss) { ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20; }
                // Draw BIBI image clipped to circle
                const bibiImg = PIGIMG;
                if (bibiImg && bibiImg.complete && bibiImg.naturalWidth > 0 && bibiImg.naturalHeight > 0) {
                    ctx.save();
                    ctx.beginPath(); ctx.arc(0, 0, pg.r, 0, Math.PI * 2); ctx.clip();
                    // Damage tint
                    if (dmg > .5) { ctx.globalAlpha = .5 + .5 * (1 - dmg); }
                    ctx.drawImage(bibiImg, -pg.r, -pg.r, pg.r * 2, pg.r * 2);
                    ctx.globalAlpha = 1;
                    // Red damage overlay
                    if (dmg > .3) {
                        ctx.fillStyle = `rgba(255,0,0,${dmg * .45})`;
                        ctx.beginPath(); ctx.arc(0, 0, pg.r, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    // Circle border - changes color with damage
                    ctx.strokeStyle = dmg > .5 ? '#ff4444' : dmg > .2 ? '#ff9900' : 'rgba(255,255,255,.4)';
                    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, pg.r, 0, Math.PI * 2); ctx.stroke();
                } else {
                    // fallback green pig
                    ctx.fillStyle = dmg > .5 ? '#884400' : '#22aa55';
                    ctx.beginPath(); ctx.arc(0, 0, pg.r, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#115522'; ctx.lineWidth = 2; ctx.stroke();
                }
                ctx.shadowBlur = 0;
                // Fear reaction when bird approaching
                const nearBird = G.projs.find(p => !p.dead && Math.hypot(p.x - pg.x - wb, p.y - pg.y) < 200);
                if (nearBird && !pg.boss) {
                    const fear = 1 - Math.hypot(nearBird.x - pg.x, nearBird.y - pg.y) / 200;
                    // Show jewpanic image above pig when scared!
                    if (JEWPANICIMG.complete && JEWPANICIMG.naturalWidth > 0) {
                        const ps = 28 * fear;
                        ctx.drawImage(JEWPANICIMG, -ps / 2, -pg.r * 1.8 - ps, ps, ps);
                    } else {
                        ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('😨', 0, -pg.r * 1.5);
                    }
                    if (pg.wobble < fear * 18) pg.wobble = fear * 18;
                }
                // HP bar
                ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-pg.r, -pg.r - 16, pg.r * 2, 8);
                ctx.fillStyle = '#ff3333'; ctx.fillRect(-pg.r, -pg.r - 16, pg.r * 2, 8);
                ctx.fillStyle = dmg > .5 ? '#ff9900' : '#22dd55';
                ctx.fillRect(-pg.r, -pg.r - 16, pg.r * 2 * (pg.hp / pg.maxHp), 8);
                // Boss crown — GoldPearl image
                if (pg.boss) {
                    const crImg = BIRDIMGS['pearl'];
                    if (crImg && crImg.complete && crImg.naturalWidth > 0) {
                        const cs = pg.r * .9;
                        ctx.save(); ctx.beginPath(); ctx.arc(0, -pg.r * 1.35, cs * .5, 0, Math.PI * 2); ctx.clip();
                        ctx.drawImage(crImg, -cs * .5, -pg.r * 1.35 - cs * .5, cs, cs); ctx.restore();
                    } else {
                        ctx.font = `${pg.r * .7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('👑', 0, -pg.r * 1.1);
                    }
                }
                ctx.restore();
            });

            // Debris chunks (wood/stone/ice fragments)
            G.debris.forEach(d => {
                ctx.save();
                ctx.globalAlpha = Math.min(1, d.l / 30);
                ctx.translate(d.x, d.y); ctx.rotate(d.angle);
                ctx.fillStyle = matClr(d.mat, 0.4);
                ctx.strokeStyle = matBrd(d.mat); ctx.lineWidth = 1;
                ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
                ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
                ctx.restore();
            });
            ctx.globalAlpha = 1;

            // Particles
            G.parts.forEach(pt => {
                ctx.globalAlpha = Math.min(1, pt.l / 18);
                if (pt.img && pt.img.complete && pt.img.naturalWidth > 0) {
                    const hs = pt.sz * .55;
                    ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.ang || 0);
                    ctx.beginPath(); ctx.arc(0, 0, hs, 0, Math.PI * 2); ctx.clip();
                    ctx.drawImage(pt.img, -hs, -hs, hs * 2, hs * 2);
                    ctx.restore();
                } else if (pt.em) {
                    ctx.font = pt.sz + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(pt.em, pt.x, pt.y);
                } else {
                    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.sz * .5, 0, Math.PI * 2); ctx.fill();
                }
            });
            ctx.globalAlpha = 1;

            ctx.restore(); // End camera transform

            // Power ring on active bird in flight (in screen space)
            if (G.state === 'flying' && !G.powerUsed) {
                const fl = G.projs.find(p => !p.dead);
                if (fl) {
                    const pulse = 6 + Math.sin(Date.now() * .008) * 4;
                    ctx.strokeStyle = `rgba(255,220,0,.8)`; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
                    ctx.beginPath(); ctx.arc(fl.x + G.camX, fl.y, fl.r + pulse, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // ── DRAW HELPERS ──
        function drawBird(x, y, b, scale, angle) {
            ctx.save(); ctx.translate(x, y);
            if (angle) ctx.rotate(angle);
            ctx.scale(scale, scale);
            const r = b.size || 20;
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, r * .95, r * .85, r * .28, 0, 0, Math.PI * 2); ctx.fill();
            // Glow
            const glows = { bomb: '#ff3333', speed: '#ff9900', ghost: '#6666ff', poop: '#ffcc00', split: '#2ecc71', boomer: '#3ea6ff' };
            if (glows[b.power]) { ctx.shadowColor = glows[b.power]; ctx.shadowBlur = 18; }
            // Image or fallback circle
            const imgEl = BIRDIMGS[b.id];
            if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                // Clip to circle
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(imgEl, -r, -r, r * 2, r * 2);
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
            } else {
                // Fallback: colored circle per character + big emoji
                const rg = ctx.createRadialGradient(-r * .3, -r * .35, 1, 0, 0, r);
                rg.addColorStop(0, lighten(b.color, 50)); rg.addColorStop(1, b.color);
                ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5; ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.font = `${r * 1.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(b.emoji, 0, 2);
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawSling() {
            const x = G.slX, y = G.slY;
            const sc = Math.min(W() / 900, H() / 450, 1.8);
            const h = Math.max(55, 52 * sc), fw = 22 * sc, fh = 85;
            const isTom = G.curBird < G.birds.length && G.birds[G.curBird]?.id === 'tom';

            // Tom Pearl gets GOLD slingshot with glow
            const postClr1 = isTom ? '#5a3a00' : '#3a1e08';
            const postClr2 = isTom ? '#ffcc00' : '#6a3818';
            const forkClr1 = isTom ? '#cc9900' : '#7a4820';
            const forkClr2 = isTom ? '#ffdd44' : '#9a6030';

            if (isTom) {
                // Gold glow on slingshot
                ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 18;
            }

            // Post shadow — extends past GND() into grass so it's clearly planted
            const postExt = (GND() - y) + 55; // always reaches 55px past ground line
            ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 3, y - h, 8 * sc, h + postExt);
            // Post
            const pg = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
            pg.addColorStop(0, postClr1); pg.addColorStop(.5, postClr2); pg.addColorStop(1, postClr1);
            ctx.fillStyle = pg; ctx.fillRect(x - 5 * sc, y - h, 10 * sc, h + postExt);
            // Fork arms
            ctx.strokeStyle = forkClr1; ctx.lineWidth = 10 * sc; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - fw, y - fh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + fw, y - fh); ctx.stroke();
            ctx.strokeStyle = forkClr2; ctx.lineWidth = 6 * sc; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - fw, y - fh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + fw, y - fh); ctx.stroke();
            ctx.shadowBlur = 0;
            // Rubber bands
            if (G.drag) {
                const rbClr = isTom ? 'rgba(180,120,0,.9)' : 'rgba(100,60,15,.9)';
                ctx.strokeStyle = rbClr; ctx.lineWidth = 3.5 * sc; ctx.lineCap = 'butt';
                ctx.beginPath(); ctx.moveTo(x - fw, y - fh); ctx.lineTo(G.dragX, G.dragY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + fw, y - fh); ctx.lineTo(G.dragX, G.dragY); ctx.stroke();
                const tension = Math.min(1, Math.hypot(G.dragX - G.slX, G.dragY - (G.slY - fh)) / (88 * sc));
                const glowClr = isTom
                    ? `rgba(255,200,0,${tension * .8})`
                    : `rgba(255,${~~(200 - tension * 150)},0,${tension * .6})`;
                ctx.strokeStyle = glowClr; ctx.lineWidth = 2 * sc;
                ctx.beginPath(); ctx.moveTo(x - fw, y - fh); ctx.lineTo(G.dragX, G.dragY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + fw, y - fh); ctx.lineTo(G.dragX, G.dragY); ctx.stroke();
            }
        }

        function drawAimLine() {
            if (!G.drag) return;
            const PIVOT_X = G.slX, PIVOT_Y = G.slY - 85;
            // ✅ Use EXACT same launch formula as real physics
            const vx = (PIVOT_X - G.dragX) * LAUNCH_MUL;
            const vy = (PIVOT_Y - G.dragY) * LAUNCH_MUL;
            const br = (G.birds[G.curBird]?.size || 20);

            let ax = G.dragX, ay = G.dragY, avx = vx, avy = vy;
            let hitX = ax, hitY = ay, hitTarget = false;

            for (let i = 0; i < 300; i++) {
                // ✅ GRAV must match real physics exactly
                avy += GRAV;
                avx *= AIR_DRAG;
                avy *= AIR_DRAG;
                ax += avx;
                ay += avy;

                if (!hitTarget) {
                    for (const bl of G.blocks) {
                        if (bl.hp <= 0) continue;
                        const nx = Math.max(bl.x, Math.min(ax, bl.x + bl.w));
                        const ny = Math.max(bl.y, Math.min(ay, bl.y + bl.h));
                        if (Math.hypot(ax - nx, ay - ny) < br) { hitTarget = true; hitX = ax; hitY = ay; break; }
                    }
                    if (!hitTarget) {
                        for (const pg of G.pigs) {
                            if (pg.dead) continue;
                            if (Math.hypot(ax - pg.x, ay - pg.y) < br + pg.r) { hitTarget = true; hitX = ax; hitY = ay; break; }
                        }
                    }
                }

                // ✅ Dots every 3 steps, fading out — like real Angry Birds
                if (!hitTarget && i % 3 === 0) {
                    const t = 1 - i / 300;
                    const sz = Math.max(1.5, 5 * (1 - i / 250));
                    ctx.fillStyle = `rgba(255,255,255,${t * 0.85})`;
                    ctx.beginPath(); ctx.arc(ax, ay, sz, 0, Math.PI * 2); ctx.fill();
                }

                if (hitTarget || ay > GND()) break;
            }

            // Impact marker
            const col = hitTarget ? 'rgba(255,60,0,.95)' : 'rgba(255,255,255,.65)';
            const ix = hitTarget ? hitX : ax;
            const iy = hitTarget ? hitY : ay;
            ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(ix - 12, iy - 12); ctx.lineTo(ix + 12, iy + 12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ix + 12, iy - 12); ctx.lineTo(ix - 12, iy + 12); ctx.stroke();
            const pulse = Math.sin(Date.now() * .012) * 4;
            ctx.strokeStyle = col; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(ix, iy, 14 + pulse, 0, Math.PI * 2); ctx.stroke();
            if (hitTarget) {
                ctx.fillStyle = 'rgba(255,60,0,.9)'; ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center'; ctx.fillText('HIT!', ix, iy - 22);
            }

            // Power meter
            const pullDist = Math.hypot(G.dragX - PIVOT_X, G.dragY - PIVOT_Y);
            const power = Math.min(1, pullDist / MAXPULL);
            const meterX = G.slX, meterY = G.slY - 130;
            const meterW = 80, meterH = 8;
            // BG
            ctx.fillStyle = 'rgba(0,0,0,.6)';
            ctx.fillRect(meterX - meterW / 2, meterY, meterW, meterH);
            // Fill
            const powerColor = power > 0.85 ? '#ff4444' : (power > 0.5 ? '#ffcc00' : '#2ecc71');
            ctx.fillStyle = powerColor;
            ctx.fillRect(meterX - meterW / 2 + 1, meterY + 1, (meterW - 2) * power, meterH - 2);
            // Border
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
            ctx.strokeRect(meterX - meterW / 2, meterY, meterW, meterH);
            // Power text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('POWER ' + Math.round(power * 100) + '%', meterX, meterY - 6);
        }

        // ── UTIL ──
        function matClr(mat, dmg) {
            const d = dmg || 0;
            if (mat === 'wood') return `rgb(${~~(160 - d * 70)},${~~(115 - d * 50)},${~~(58 - d * 25)})`;
            if (mat === 'stone') return `rgb(${~~(120 - d * 50)},${~~(120 - d * 50)},${~~(128 - d * 50)})`;
            if (mat === 'ice') return `rgba(175,220,255,${.88 - d * .35})`;
            if (mat === 'tnt') return `rgb(${~~(220 - d * 30)},${~~(60 - d * 30)},${~~(20 - d * 10)})`;
            return '#aaa';
        }
        function matBrd(mat) {
            if (mat === 'wood') return '#6a4018';
            if (mat === 'stone') return '#555';
            if (mat === 'ice') return 'rgba(145,205,255,.95)';
            if (mat === 'tnt') return '#ff4400';
            return '#888';
        }
        function lighten(hex, amt) {
            let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
        }
        function aabbOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

        function scatter(x, y, color, n) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, s = .5 + Math.random() * 4;
                G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, l: 18 + Math.random() * 14, em: null, color, sz: 2 + Math.random() * 5 });
            }
        }
        function burst(x, y, em, n) {
            const imgRef = EMOJI_IMG_MAP[em] || null;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3.5;
                G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, l: 22 + Math.random() * 18, em, img: imgRef, ang: Math.random() * Math.PI * 2, sz: 16 + Math.random() * 14 });
            }
        }
        function addSc(n) { G.score += n; document.getElementById('sc').textContent = G.score; }

        function showWorldBanner(worldName, lvlNum) {
            const el = document.createElement('div');
            el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:rgba(0,0,0,.85);border:3px solid #ffcc00;border-radius:20px;
    padding:20px 40px;text-align:center;z-index:50;pointer-events:none;
    font-family:'Bangers',cursive;animation:worldIn .4s ease`;
            el.innerHTML = `<div style="font-size:14px;color:#aaa;letter-spacing:3px">LEVEL ${lvlNum}</div>
    <div style="font-size:28px;color:#ffcc00;margin:6px 0">${worldName}</div>
    <div style="font-size:12px;color:#888">GET READY! 💩</div>`;
            document.body.appendChild(el);
            setTimeout(() => { el.style.animation = 'worldOut .4s ease forwards'; setTimeout(() => el.remove(), 400); }, 2000);
        }

        function showPop(txt, id) {
            const el = document.getElementById('popup');
            const colors = { tom: '#ffcc00', pearl: '#aaaaff', charlie: '#2ecc71', donald: '#ff9900', jeff: '#ff4444', stewie: '#3ea6ff' };
            el.textContent = txt; el.style.color = colors[id] || '#ffcc00';
            el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 1100);
        }

        function updateQueue() {
            document.getElementById('queue').innerHTML =
                G.birds.map((b, i) => {
                    const img = BIRDIMGS[b.id];
                    const imgOk = img && img.complete && img.naturalWidth > 0;
                    const cls = i === G.curBird ? 'cur' : i < G.curBird ? 'done' : '';
                    if (imgOk) return ``;
                    return `<span class="qb ${cls}" title="${b.label}">${b.emoji}</span>`;
                }).join('');
        }
        function updateHUD() {
            document.getElementById('pgn').textContent = G.pigs.filter(p => !p.dead).length;
            document.getElementById('livesn').textContent = LIVES;
            // Show remaining birds count
            const rem = G.birds.length - G.curBird - 1;
            const birdsLeft = document.getElementById('birdsleft');
            if (birdsLeft) birdsLeft.textContent = rem > 0 ? `+${rem} birds` : '';
        }
        function updateBirdCard() {
            if (!G || G.curBird >= G.birds.length) return;
            const b = G.birds[G.curBird];
            document.getElementById('bcname').textContent = b.label;
            document.getElementById('bcpow').textContent = b.desc + ' — tap/SPACE in flight!';
        }

        function endLvl(won) {
            G.state = 'over';

            // Slow motion effect on win
            if (won) { G.slowmo = true; setTimeout(() => { G.slowmo = false; }, 800); }

            setTimeout(() => {
                const ov = document.getElementById('ov');
                ov.classList.add('on');
                const bonus = won ? (G.birds.length - Math.max(0, G.curBird) - 1) * 300 : 0;
                const total = G.score + bonus;

                // Stars: 1=cleared, 2=good score, 3=great score
                const starThresholds = [800, 1600, 3000];
                const stars = won ? [total > starThresholds[0], total > starThresholds[1], total > starThresholds[2]].filter(Boolean).length + 1 : 0;
                const starStr = ['', '⭐', '⭐⭐', '⭐⭐⭐'][Math.min(3, stars)] || '';

                // Save highscore
                const key = 'tb_hs_' + LVL;
                const prev = parseInt(localStorage.getItem(key) || 0);
                if (total > prev) localStorage.setItem(key, total);
                const best = Math.max(total, prev);

                document.getElementById('ovt').textContent = won ? '💩 YOU WIN!' : '😢 FAIL...';
                document.getElementById('ovt').style.color = won ? '#ffcc00' : '#ff4444';
                document.getElementById('ovs').textContent = won
                    ? `${starStr} Bonus: +${bonus} pts | Best: ${best}`
                    : 'No birds left! 😭';
                document.getElementById('ovsc').textContent = total;
                if (!won) { LIVES = Math.max(0, LIVES - 1); if (LIVES === 0) { document.getElementById('ovt').textContent = '💀 GAME OVER!'; document.getElementById('ovt').style.color = '#ff4444'; } }
                document.getElementById('btnR').onclick = () => { if (LIVES <= 0) { LIVES = 3; } startLevel(LVL); };
                document.getElementById('btnN').style.display = won && LVL < LEVELS.length - 1 ? '' : 'none';
                document.getElementById('btnN').onclick = () => startLevel(LVL + 1);

                // Confetti on win!
                if (won) {
                    launchConfetti(stars);
                    playSfx('sfx_win', 0.3);
                    // ── HUMOR: Win taunt ──
                    if (typeof maybeTaunt === 'function') setTimeout(() => maybeTaunt('win'), 300);
                    // Sharpshooter: win with 1 bird left
                    const birdsLeft = G.birds.length - G.curBird - 1;
                    if (birdsLeft >= 1 && typeof unlockAchievement === 'function') unlockAchievement('no_birds_left');
                    // ── NEW: Save stars per level + achievements ──
                    if (typeof setLevelStars === 'function') setLevelStars(LVL, stars, total);
                    if (typeof unlockAchievement === 'function') {
                        if (stars >= 1) unlockAchievement('one_star');
                        if (stars >= 3) unlockAchievement('three_star');
                        if (LVL >= 4) unlockAchievement('level_5');
                        if (LVL >= 9) unlockAchievement('level_10');
                        if (LVL >= 20) unlockAchievement('level_21');
                        // Check if all levels have 3 stars
                        let allThree = true;
                        for (let i = 0; i < LEVELS.length; i++) {
                            if (getLevelStars(i) < 3) { allThree = false; break; }
                        }
                        if (allThree) unlockAchievement('all_stars');
                    }
                } else {
                    playSfx('sfx_loss', 0.25);
                    // ── HUMOR: Lose taunt ──
                    if (typeof maybeTaunt === 'function') setTimeout(() => maybeTaunt('lose'), 300);
                }
            }, 600);
        }

        function launchConfetti(stars) {
            const faces = [
                '/TomGames/img/TOM(pacman).png',
                '/TomGames/img/GoldPearl.png',
                '/TomGames/img/shitcocktail.png',
                '/TomGames/img/trump.png',
                '/TomGames/img/FENTGHOST.png',
                '/TomGames/img/bibi.png',
                '/TomGames/img/TOMOFFEND.png',
                '/GifPhoto/TomPearl.jpg',
            ];
            const count = stars * 20 + 20;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const sz = 22 + Math.random() * 22;
                    const el = document.createElement('img');
                    el.src = faces[Math.floor(Math.random() * faces.length)];
                    el.style.cssText = `position:fixed;top:-${sz}px;left:${Math.random() * 100}vw;width:${sz}px;height:${sz}px;border-radius:50%;object-fit:cover;z-index:100;pointer-events:none;animation:fall ${1.5 + Math.random() * 2}s linear forwards`;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 4000);
                }, i * 80);
            }
        }

        // ── INPUT ──
        let MAXPULL = 110; // Will be set dynamically based on canvas size
        let pdn = false, ons = false;

        function getXY(e) { return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }; }

        cv.addEventListener('pointerdown', e => {
            if (!G || G.state === 'over') return;
            const { x, y } = getXY(e);
            if (G.state === 'ready') {
                const PX = G.slX, PY = G.slY - 85;
                // ✅ Bigger grab zone — easier to grab bird on mobile
                const grabR = isMobile ? 320 : 160;
                const mobileGrab = isMobile && x < W() * 0.60;
                if (Math.hypot(x - PX, y - PY) < grabR || mobileGrab) {
                    pdn = true; ons = true; G.drag = true;
                    // Snap drag to pivot area for cleaner start
                    G.dragX = x; G.dragY = y;
                }
            }
            if (G.state === 'flying') activatePower();
            e.preventDefault();
        }, { passive: false });

        cv.addEventListener('pointermove', e => {
            if (!pdn || !ons) return;
            const { x, y } = getXY(e);
            const PIVOT_X = G.slX, PIVOT_Y = G.slY - 85;

            const dx0 = x - PIVOT_X, dy0 = y - PIVOT_Y;
            let radius = Math.hypot(dx0, dy0);
            let angle = Math.atan2(dy0, dx0);

            const SMIN = 5, SMAX = MAXPULL;

            // ✅ Hard clamp — no overshoot, clean and predictable like real Angry Birds
            radius = Math.min(SMAX, Math.max(SMIN, radius));

            // ✅ Only block pulling RIGHT (very tight 10° zone)
            if (dx0 > 0 && Math.abs(angle) < Math.PI * 0.10) radius = SMIN;

            // ✅ Allow steeper downward angles
            if (dy0 > SMAX * 1.2) radius = SMIN;

            // ✅ LERP smoothing — responsive but not jumpy
            const LERP = 0.85;
            const targetX = PIVOT_X + radius * Math.cos(angle);
            const targetY = PIVOT_Y + radius * Math.sin(angle);
            G.dragX = G.dragX + (targetX - G.dragX) * LERP;
            G.dragY = G.dragY + (targetY - G.dragY) * LERP;

            e.preventDefault();
        }, { passive: false });

        cv.addEventListener('pointerup', e => {
            if (ons && G?.drag) {
                G.drag = false;
                const PIVOT_X = G.slX, PIVOT_Y = G.slY - 85;
                const vx = (PIVOT_X - G.dragX) * LAUNCH_MUL, vy = (PIVOT_Y - G.dragY) * LAUNCH_MUL;
                // ── PROPERLY HOOKED: launch event ──
                G._anyKillThisShot = false;
                if (Math.hypot(vx, vy) > 0.8 && typeof maybeTaunt === 'function') maybeTaunt('launch');
                if (Math.hypot(vx, vy) > 0.8) {
                    const b = G.birds[G.curBird];
                    G.projs.push({
                        ...b, x: G.dragX, y: G.dragY, vx, vy,
                        angle: Math.atan2(vy, vx),
                        trail: [], dead: false, ghost: false,
                        boomer: b.power === 'boomer', powerUsed: false,
                        size: b.size || 20, r: b.size || 20,
                    });
                    G.state = 'flying'; G.powerUsed = false;
                    if (AC.state === 'suspended') AC.resume();
                    // Tom gets special launch sound!
                    if (G.birds[G.curBird]?.id === 'tom') playSfx('sfx_tom', 0.2);
                    else playWhoosh();
                    showMobilePower(true);
                }
            }
            pdn = false; ons = false;
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('keydown', e => {
            if (e.code === 'Space') { e.preventDefault(); if (G?.state === 'flying') activatePower(); }
            if (e.code === 'KeyR' && G) startLevel(LVL);
            if (e.code === 'KeyM') showMenu();
        });

        // ── INIT ──
        setSize();
        requestAnimationFrame(loop);
        // Hide mobile browser address bar
        setTimeout(() => window.scrollTo(0, 1), 100);



        // ── MUSIC ──
        const bgm = document.getElementById('bgm');
        bgm.volume = 0.07;
        const allBgms = [bgm, document.getElementById('bgm2'), document.getElementById('bgm3'), document.getElementById('bgmboss')];
        allBgms.forEach(b => b.volume = 0.07);

        function playBgm(id) {
            allBgms.forEach(b => { b.pause(); b.currentTime = 0; });
            const el = document.getElementById(id);
            if (el) { el.volume = bgm.volume; el.play().catch(() => { }); }
        }

        function playSfx(id, vol = 0.15) {
            const mv = window._masterVol !== undefined ? window._masterVol : 0.07;
            vol = vol * (mv / 0.07); // scale with master
            const el = document.getElementById(id);
            if (!el) return;
            el.currentTime = 0; el.volume = vol;
            el.play().catch(() => { });
        }

        function updateBgmForLevel(lvl) {
            const isBoss = LEVELS[lvl]?.pigs?.filter(p => p.boss).length >= 3;
            if (LEVELS[lvl]?.theme === 'whitehouse') playBgm('bgmboss');
            else if (isBoss) playBgm('bgmboss');
            else if (lvl < 7) playBgm('bgm');        // Night: bubblegum
            else if (lvl < 14) playBgm('bgm2');      // Desert: Hava Nagila 😂
            else playBgm('bgm3');                  // Space: We Are Tom Pearl
        }

        // ── SOUND FX (Web Audio API) ──
        const AC = new (window.AudioContext || window.webkitAudioContext)();

        function playWhoosh() {
            const buf = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) {
                const t = i / d.length;
                d[i] = (Math.random() * 2 - 1) * (1 - t) * .6;
            }
            const src = AC.createBufferSource();
            src.buffer = buf;
            const f = AC.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.setValueAtTime(800, AC.currentTime);
            f.frequency.linearRampToValueAtTime(200, AC.currentTime + .35);
            f.Q.value = 0.8;
            const g = AC.createGain();
            g.gain.setValueAtTime(0.05, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + .4);
            src.connect(f); f.connect(g); g.connect(AC.destination);
            src.start();
        }

        function playThud() {
            const dur = 0.3;
            const buf = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) {
                const t = i / d.length;
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * .8;
            }
            const src = AC.createBufferSource();
            src.buffer = buf;
            const f = AC.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 300;
            const g = AC.createGain();
            g.gain.setValueAtTime(0.07, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + dur);
            src.connect(f); f.connect(g); g.connect(AC.destination);
            src.start();
        }

        function playCrunch() {
            const dur = 0.25;
            const buf = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) {
                const t = i / d.length;
                d[i] = (Math.random() * 2 - 1) * (1 - t) * .9;
            }
            const src = AC.createBufferSource();
            src.buffer = buf;
            const f = AC.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 600;
            const g = AC.createGain();
            g.gain.setValueAtTime(0.06, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + dur);
            src.connect(f); f.connect(g); g.connect(AC.destination);
            src.start();
        }

        function playAcid() {
            const o1 = AC.createOscillator(), o2 = AC.createOscillator();
            const g = AC.createGain();
            o1.type = 'sawtooth'; o1.frequency.setValueAtTime(800, AC.currentTime);
            o1.frequency.linearRampToValueAtTime(200, AC.currentTime + .3);
            o2.type = 'square'; o2.frequency.setValueAtTime(1200, AC.currentTime);
            o2.frequency.linearRampToValueAtTime(400, AC.currentTime + .25);
            g.gain.setValueAtTime(0.04, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + .3);
            o1.connect(g); o2.connect(g); g.connect(AC.destination);
            o1.start(); o1.stop(AC.currentTime + .3);
            o2.start(); o2.stop(AC.currentTime + .25);
        }

        function playOink() {
            const o = AC.createOscillator();
            const g = AC.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(350, AC.currentTime);
            o.frequency.linearRampToValueAtTime(200, AC.currentTime + .15);
            o.frequency.linearRampToValueAtTime(300, AC.currentTime + .3);
            g.gain.setValueAtTime(0.05, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + .35);
            o.connect(g); g.connect(AC.destination);
            o.start(); o.stop(AC.currentTime + .35);
        }

        function playPigDeath() {
            // Longer scream for pig death
            const o = AC.createOscillator(), o2 = AC.createOscillator();
            const g = AC.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(400, AC.currentTime);
            o.frequency.linearRampToValueAtTime(100, AC.currentTime + .5);
            o2.type = 'sine'; o2.frequency.setValueAtTime(600, AC.currentTime);
            o2.frequency.linearRampToValueAtTime(150, AC.currentTime + .4);
            g.gain.setValueAtTime(0.08, AC.currentTime);
            g.gain.linearRampToValueAtTime(0, AC.currentTime + .5);
            o.connect(g); o2.connect(g); g.connect(AC.destination);
            o.start(); o.stop(AC.currentTime + .5);
            o2.start(); o2.stop(AC.currentTime + .4);
        }

        // Autoplay on first user interaction (browser policy)
        let musicStarted = false;
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(window.innerWidth, window.innerHeight) < 600;

        function startMusic() {
            if (musicStarted) return;
            musicStarted = true;
            updateBgmForLevel(LVL);
        }
        document.addEventListener('pointerdown', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });

        // Show mobile UI
        if (isMobile) {
            document.getElementById('mobhint').style.display = 'block';
        }

        function usePowerMobile() {
            if (AC.state === 'suspended') AC.resume();
            activatePower();
        }

        function showMobilePower(show) {
            if (!isMobile) return;
            document.getElementById('mobpow').style.display = show ? 'block' : 'none';
        }

        function setVol(v) {
            const vol = v / 100;
            bgm.volume = vol;
            allBgms.forEach(b => { if (b) b.volume = vol; });
            // Store master vol for sfx scaling
            window._masterVol = vol;
            document.getElementById('volnum').textContent = v;
            document.getElementById('mutebtn').textContent = v == 0 ? '🔇' : '🔊';
        }

        function toggleMute() {
            if (bgm.muted) {
                bgm.muted = false;
                document.getElementById('mutebtn').textContent = '🔊';
                document.getElementById('vol').value = Math.round(bgm.volume * 100);
            } else {
                bgm.muted = true;
                document.getElementById('mutebtn').textContent = '🔇';
            }
        }

        // ═══════════════════════════════════════════════════════════
        // LEVEL SELECT + STARS + TUTORIAL + ACHIEVEMENTS (NEW)
        // ═══════════════════════════════════════════════════════════

        // Level names for the menu
        const LEVEL_NAMES = [
            'Bibi Den', 'Fan Club HQ', 'Frozen Exile', 'Bibi Castle', 'The Tribunal',
            'Bibi Tower', 'Crystal Court', 'Snitch Tower', 'Desert Dossier', 'Bridge of Shame',
            'Beacon of Lies', 'Bibi Airlines', 'Lava Tribunal', 'Submarine Bibi', 'Poop Dam',
            'Green Mall', 'Egg Factory', 'Green Stadium', 'Tom\'s Cathedral', 'Peak of Shame',
            'White House', 'TNT Tribunal', 'Glass Justice', 'Tom\'s Revenge', 'Domino of Justice', 'Hidden Enemy'
        ];

        // Load saved per-level stars from localStorage
        function getLevelStars(levelIdx) {
            try {
                const data = JSON.parse(localStorage.getItem('tombirds_progress') || '{}');
                return data[levelIdx]?.stars || 0;
            } catch (e) { return 0; }
        }

        function setLevelStars(levelIdx, stars, score) {
            try {
                const data = JSON.parse(localStorage.getItem('tombirds_progress') || '{}');
                if (!data[levelIdx]) data[levelIdx] = { stars: 0, bestScore: 0 };
                if (stars > data[levelIdx].stars) data[levelIdx].stars = stars;
                if (score > data[levelIdx].bestScore) data[levelIdx].bestScore = score;
                localStorage.setItem('tombirds_progress', JSON.stringify(data));
            } catch (e) { }
        }

        function getMaxUnlockedLevel() {
            // Levels unlock progressively. Level 0 always unlocked.
            // Level N unlocks when level N-1 has >= 1 star
            let max = 0;
            for (let i = 0; i < (typeof LEVELS !== 'undefined' ? LEVELS.length : 21); i++) {
                if (getLevelStars(i) >= 1) max = i + 1;
            }
            return Math.min(max, (typeof LEVELS !== 'undefined' ? LEVELS.length : 21) - 1);
        }

        function openLevelMenu() {
            const grid = document.getElementById('levelGrid');
            const maxUnlocked = getMaxUnlockedLevel();
            const totalLevels = (typeof LEVELS !== 'undefined') ? LEVELS.length : 21;

            let html = '';
            for (let i = 0; i < totalLevels; i++) {
                const stars = getLevelStars(i);
                const locked = i > maxUnlocked;
                const completed = stars >= 1;
                const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
                const name = LEVEL_NAMES[i] || `Level ${i + 1}`;
                const cls = locked ? 'lvl-btn locked' : (completed ? 'lvl-btn completed' : 'lvl-btn');
                const onclick = locked ? '' : `onclick="playLevel(${i})"`;
                const lockIcon = locked ? '<div class="lock">🔒</div>' : '';
                html += `<div class="${cls}" ${onclick}>
      <div class="num">${i + 1}</div>
      <div class="stars">${locked ? '' : starStr}</div>
      <div class="name">${locked ? '???' : name}</div>
      ${lockIcon}
    </div>`;
            }
            grid.innerHTML = html;
            document.getElementById('levelMenu').classList.add('show');
        }

        function closeLevelMenu() {
            document.getElementById('levelMenu').classList.remove('show');
        }

        function playLevel(idx) {
            closeLevelMenu();
            document.getElementById('menu').style.display = 'none';
            startLevel(idx);
        }

        // ── TUTORIAL ──
        const TUTORIAL_STEPS = [
            { ico: '👆', title: 'DRAG TO AIM', text: 'Touch and hold the bird, then drag back to aim your shot. The further back, the more power!' },
            { ico: '🎯', title: 'RELEASE TO FIRE', text: 'Release your finger to launch the bird at the pigs. Aim carefully — you only have a few birds!' },
            { ico: '✨', title: 'SPECIAL POWERS', text: 'While in flight, tap the screen (or press SPACE) to activate the bird\'s special power!' },
            { ico: '⭐', title: 'EARN STARS', text: 'Get 3 stars on every level by being efficient and racking up huge scores. Good luck Tom Pearl warrior! 💩' },
        ];
        let tutStep = 0;

        function startTutorial() {
            tutStep = 0;
            showTutStep();
            document.getElementById('tutOverlay').classList.add('show');
        }

        function showTutStep() {
            if (tutStep >= TUTORIAL_STEPS.length) { endTutorial(); return; }
            const s = TUTORIAL_STEPS[tutStep];
            const isLast = tutStep === TUTORIAL_STEPS.length - 1;
            document.getElementById('tutContent').innerHTML = `
    <div class="tut-step">
      <div class="ico">${s.ico}</div>
      <h2>${s.title}</h2>
      <p>${s.text}</p>
      <button class="tut-btn" onclick="nextTutStep()">${isLast ? 'LET\'S GO! 🚀' : 'NEXT ➡'}</button>
      <div style="color:#666;font-size:12px;margin-top:14px;font-family:sans-serif">${tutStep + 1} / ${TUTORIAL_STEPS.length}</div>
    </div>
  `;
        }

        function nextTutStep() { tutStep++; showTutStep(); }

        function endTutorial() {
            document.getElementById('tutOverlay').classList.remove('show');
            localStorage.setItem('tombirds_tut_done', '1');
        }

        function maybeShowTutorial() {
            if (!localStorage.getItem('tombirds_tut_done')) startTutorial();
        }

        // ── ACHIEVEMENTS ──
        const ACHIEVEMENTS = {
            first_kill: { ico: '🐷', name: 'First Blood', desc: 'Eliminate your first pig' },
            one_star: { ico: '⭐', name: 'Star Collector', desc: 'Earn your first star' },
            three_star: { ico: '⭐⭐⭐', name: 'Triple Star', desc: 'Get 3 stars on a level' },
            combo_5: { ico: '💥', name: 'Combo King', desc: '5+ pigs in one shot' },
            no_birds_left: { ico: '🎯', name: 'Sharpshooter', desc: 'Win with 1 bird remaining' },
            level_5: { ico: '🏆', name: 'Survivor', desc: 'Reach level 5' },
            level_10: { ico: '👑', name: 'SmartBird Warrior', desc: 'Reach level 10' },
            level_21: { ico: '🐐', name: 'GOAT', desc: 'Beat the White House' },
            all_stars: { ico: '💎', name: 'Perfectionist', desc: '3 stars on all levels' },
        };

        function unlockAchievement(id) {
            try {
                const unlocked = JSON.parse(localStorage.getItem('tombirds_achievements') || '[]');
                if (unlocked.includes(id)) return false;
                unlocked.push(id);
                localStorage.setItem('tombirds_achievements', JSON.stringify(unlocked));
                showAchievement(id);
                return true;
            } catch (e) { return false; }
        }

        function showAchievement(id) {
            const a = ACHIEVEMENTS[id];
            if (!a) return;
            const el = document.getElementById('achievement');
            el.querySelector('.ic').textContent = a.ico;
            el.querySelector('.txt').textContent = a.name;
            el.classList.add('show');
            if (typeof playSfx === 'function') playSfx('sfx_win', 0.18);
            setTimeout(() => el.classList.remove('show'), 3500);
        }

        // Hook into game events to unlock achievements
        window.addEventListener('load', () => {
            setTimeout(maybeShowTutorial, 800);
        });


        // ═══════════════════════════════════════════════════════════
        // HUMOR SYSTEM — Tom Pearl taunts + reactions
        // ═══════════════════════════════════════════════════════════

        const TOM_TAUNTS_LAUNCH = ["NICE SHOT!"];

        const TOM_TAUNTS_HIT = ["BOOM!"];

        const TOM_TAUNTS_MISS = ["MISS!"];

        const TOM_TAUNTS_WIN = ["VICTORY!"];

        const TOM_TAUNTS_LOSE = ["YOU LOSE!"];

        function showTaunt(text, color = '#ffcc00', dur = 1500) {
            let el = document.getElementById('tomTaunt');
            if (!el) {
                el = document.createElement('div');
                el.id = 'tomTaunt';
                el.style.cssText = `
      position:fixed;top:20%;left:50%;transform:translateX(-50%) scale(0);
      background:linear-gradient(135deg,#ff4444,#aa1111);
      color:#fff;padding:12px 28px;border-radius:18px;
      font-family:'Bangers',cursive;font-size:clamp(20px,3.5vw,32px);
      letter-spacing:2px;text-shadow:3px 3px 0 #000;
      box-shadow:0 8px 30px rgba(0,0,0,.6),0 0 60px rgba(255,68,68,.5);
      z-index:8000;pointer-events:none;
      transition:transform .4s cubic-bezier(.34,1.56,.64,1);
      max-width:90%;text-align:center;
      border:3px solid #ffcc00;
    `;
                document.body.appendChild(el);
            }
            el.style.background = `linear-gradient(135deg, ${color}, #000)`;
            el.textContent = text;
            el.style.transform = 'translateX(-50%) scale(1) rotate(' + (Math.random() * 4 - 2) + 'deg)';
            clearTimeout(window._tauntTimer);
            window._tauntTimer = setTimeout(() => {
                el.style.transform = 'translateX(-50%) scale(0)';
            }, dur);
        }

        function rndTaunt(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

        // Hook into game events
        window._lastTauntT = 0;
        function maybeTaunt(type) {
            const now = performance.now();
            if (now - window._lastTauntT < 1200) return; // Don't spam
            window._lastTauntT = now;
            let arr, color;
            switch (type) {
                case 'launch': arr = TOM_TAUNTS_LAUNCH; color = '#ff9900'; break;
                case 'hit': arr = TOM_TAUNTS_HIT; color = '#2ecc71'; break;
                case 'miss': arr = TOM_TAUNTS_MISS; color = '#666666'; break;
                case 'win': arr = TOM_TAUNTS_WIN; color = '#ffcc00'; break;
                case 'lose': arr = TOM_TAUNTS_LOSE; color = '#ff4444'; break;
                default: return;
            }
            if (Math.random() > 0.55) showTaunt(rndTaunt(arr), color);
        }


        // ═══════════════════════════════════════════════════════════
        // SLOW-MOTION + RAGDOLL EFFECTS
        // ═══════════════════════════════════════════════════════════

        let _timeScale = 1.0;
        let _slowMoUntil = 0;

        function triggerSlowMo(durationMs = 500, scale = 0.35) {
            _slowMoUntil = performance.now() + durationMs;
            _timeScale = scale;
        }

        function updateTimeScale() {
            if (performance.now() > _slowMoUntil) {
                _timeScale = Math.min(1.0, _timeScale + 0.05); // ramp back up
            }
        }

        // Make game step use timescale (we'll multiply velocities by _timeScale)
        window._timeScale = () => _timeScale;

    