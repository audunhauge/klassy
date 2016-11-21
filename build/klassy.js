function setup() {

  const INTERVAL = 760; // duration of word animation
  const SHOTSPEED = 20; // how fast to update shot pos

  let divMain = document.getElementById("main");
  let divTextMeasure = document.getElementById("textmeasure");
  let divMask = document.getElementById("mask");
  let divFire = document.getElementById("firebutton");
  let divConfig = document.getElementById("config");
  let divMessages = document.getElementById("messages");

  // these two must be Object as we append extra props
  let divGun = document.getElementById("gun");
  let divRound = document.getElementById("round");

  let klasses = {};

  klasses["grønnsak"] = "gulerot,brokkoli,kål,salat,neper".split(',');
  klasses["sopp"] = "kantarell,morkel,trøffel".split(',');
  klasses["bær"] = "rips,multe,solbær,bringebær".split(',');
  klasses["frukt"] = "eple,pærer,appelsin".split(',');
  klasses["nøtter"] = "mandler,pistasj,hasselnøtt".split(',');

  for (let k in klasses) {
    for (let o of klasses[k]) {
      let spanO = document.createElement("span");
      spanO.id = k + "_" + o;
      spanO.klass = k;
      spanO.alive = false;
      divMain.appendChild(spanO);
      spanO.innerHTML = o + " ";

      // measure size of word in pixels
      // spanO has no offsetWidth as it is position:absolute
      let spanM = document.createElement("span");
      divTextMeasure.appendChild(spanM);
      spanM.innerHTML = o + " ";
      spanO.w = spanM.offsetWidth + 6;
    }
  };

  let spnWords = Array.from(document.querySelectorAll("#main > span"));
  let dropping = []; // words that are on stage and dropping

  spnWords.forEach(w => {
    w.alive = false;w.pox = 0;w.poy = 0;w.h = 20;
  });
  // add extra props to each node - needed for animation

  // kategory names - we pretend they are ammo boxes
  // user must click correct box for where gun is pointing
  // we will stash gold coins beneath each box for words that are correct
  // thus we need to keep reference to span 
  // we must also count coins in each stash
  let goldCount = {};
  let kategorySpan = {};
  let klassNames = Object.keys(klasses);
  klassNames.forEach(s => {
    let spanKlas = document.createElement("span");
    spanKlas.innerHTML = s + " ";
    spanKlas.ammotype = s;
    divMask.appendChild(spanKlas);
    spanKlas.addEventListener("mousedown", chooseRound);
    kategorySpan[s] = spanKlas;
    goldCount[s] = 0;
  });

  // set up shot for moving and hit-testing
  divRound.pox = 0;
  divRound.poy = 0;
  divRound.w = 22;
  divRound.h = 22;
  divRound.vx = 0;
  divRound.vy = 0;
  divRound.ammotype = "";

  restart();

  setInterval(animation, INTERVAL);
  setInterval(moveshot, SHOTSPEED);

  divFire.addEventListener("mousedown", fireRound);

  function animation(e) {
    // overriding w:NodeList so we can add pox,poy
    let delta = [roll(-50, 50), roll(-50, 50), roll(-50, 50)];
    delta.forEach((d, i) => {
      let w = dropping[i];
      if (w && w.pox + d > 500 - w.w) {
        delta[i] = -20;
      }
      if (w && w.pox + d < 10) {
        delta[i] = 20;
      }
    });
    let i = 0;
    for (let w of dropping) {
      if (w.alive) {
        w.style.top = w.poy + "px";
        w.style.zIndex = 1;
        let d = delta[i++];
        if (w.pox) w.myanim = w.animate([{ top: w.poy + "px", left: w.pox + "px", offset: 0 }, { top: w.poy + 25 + "px", left: w.pox + d + "px", offset: 1 }], {
          duration: INTERVAL,
          easing: 'linear',
          fill: 'forwards'
        });
        w.poy += 25;
        w.pox += d;

        // if the word has fallen too far
        if (w.poy > 450) {
          w.alive = false;
          w.poy = -400;
          w.style.top = "-400px";
          w.style.display = "none";
          w.style.zIndex = -2;
        }
      }
    }

    dropping = dropping.filter(e => e.alive);
    if (dropping.length === 0) {
      restart();
    }
  }

  function restart() {
    dropping = shuffle(spnWords).slice(0, 3);
    let i = 0;
    let free = 500 / 3;
    for (let w of dropping) {
      let txtw = w.textWidth;
      w.pox = free * i + roll(0, free - txtw);
      w.poy = -150 * i + roll(-20, -10);
      w.alive = true;
      if (w.myanim) w.myanim.cancel();
      w.style.top = "-200px";
      w.style.display = "block";
      i++;
    }
  }

  function chooseRound(e) {
    let t = e.currentTarget;
    divRound.ammotype = t.ammotype;
    let kats = Array.from(document.querySelectorAll("#mask > span"));
    kats.forEach(k => k.classList.remove("active"));
    t.classList.add("active");
  }

  function fireRound(e) {
    let mx = e.clientX;
    let my = e.clientY;
    let dx = 250 - mx;
    let dy = 500 - my;
    let angle = Math.atan2(dy, -dx);
    divGun.angle = angle;
    angle = 90 - 180 * angle / Math.PI;
    divGun.style.transform = "rotate(" + angle + "deg)";
    divRound.pox = 250;
    divRound.poy = 450;
    divRound.vx = 6 * Math.cos(divGun.angle);
    divRound.vy = 6 * Math.sin(divGun.angle);
    divRound.alive = true;
  }

  function moveshot() {
    if (divRound.alive) {
      divRound.pox += divRound.vx;
      divRound.poy -= divRound.vy;
      divRound.style.top = divRound.poy + "px";
      divRound.style.left = divRound.pox + "px";
    }
    for (let w of dropping) {
      if (overlap(w, divRound)) {
        if (w.klass === divRound.ammotype) {
          w.alive = false;
          w.style.display = "none";
          w.done = true;
          w.myanim.cancel(); // stop any animation on word
          // give gold
          let spnGold = document.createElement("div");
          spnGold.className = "gold";
          kategorySpan[w.klass].appendChild(spnGold);
          spnGold.style.top = 40 + goldCount[w.klass] + "px";
          spnGold.style.left = roll(-3, 3) + "px";
          spnGold.style.transform = "rotate(" + roll(-3, 3) + "deg)";
          goldCount[w.klass] += 11 + roll(0, 2);

          divRound.alive = false;
          divRound.poy = -200;
          divRound.style.top = divRound.poy + "px";
          spnWords = spnWords.filter(e => e.done !== true);
          dropping = dropping.filter(e => e.alive);
          if (dropping.length === 0) {
            restart();
          }
          if (spnWords.length === 0) {
            divMessages.innerHTML = "winner";
            divMessages.classList.add("show");
          }
        }
      }
    }
  }
}

/************************************************/

/**
 * generate random number in range [lo,hi]
 *  if both lo and hi are ints returns an int
 *  if called as roll(n) returns range [1,n]
 */
function roll(lo, hi = NaN) {
  if (isNaN(hi)) {
    hi = lo;lo = 1;
  }
  let span = hi - lo;
  let r = lo + Math.random() * span;
  if (Number.isInteger(lo) && Number.isInteger(hi)) r = Math.floor(r);
  return r;
}

// shuffles an array
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.round(Math.random() * i);
    let tmp = arr[i];arr[i] = arr[j];arr[j] = tmp;
  }
  return arr;
}

function overlap(a, b) {
  return a.pox > b.pox - a.w && a.pox < b.pox + b.w && a.poy > b.poy - a.h && a.poy < b.poy + b.h;
}