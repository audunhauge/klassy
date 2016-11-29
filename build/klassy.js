

class Badge {

  constructor(title, uri, klass, time, par) {
    this.title = title;
    this.uri = uri;
    this.klass = klass;
    this.time = time;
    this.par = par;
  }

}

function setup() {
  const url = "wordlist.json";
  fetch(url).then(r => r.json()).then(data => behandle(data)).catch(e => {
    console.log("Klarte ikke å laste filen wordlist.json.");
    console.log("Bruker demo matvarer.");
    let klasses = {};
    let user = { firstname: "test", lastname: "", completed: {}, path: {}, xp: 0 };
    klasses["grønnsak"] = "gulerot,brokkoli,kål,salat,neper";
    klasses["sopp"] = "kantarell,morkel,trøffel";
    klasses["bær"] = "rips,multe,solbær,bringebær";
    klasses["frukt"] = "eple,pærer,appelsin";
    klasses["nøtter"] = "mandler,pistasj,hasselnøtt";
    startGame(klasses, 'Fruk', user);
  });
}

function behandle(wordlist) {
  let userinfo = localStorage.getItem("klassy_game");
  let user;
  if (userinfo !== null) {
    user = JSON.parse(userinfo);
    choosePath(wordlist, user);
  } else {
    // no user registered
    createAccount(wordlist);
  }
}

function choosePath(wordlist, user) {
  let path = wordlist.path;
  let tasks = wordlist.tasks;
  let lessons = shuffle(Object.keys(tasks));
  let todo = lessons.filter(e => user.completed[e] === undefined);
  let selected;
  if (todo.length > 0) {
    selected = todo[0];
  } else {
    selected = lessons[0];
  }
  startGame(tasks[selected], selected, user);
}

function createAccount(wordlist) {
  // create and show a GUI for registration
  let divMessages = document.getElementById("messages");
  let divInfo = document.getElementById("info");
  let form = `<form>
    <br>Firstname <input id="first" type="text">
    <br>Lastname <input id="last" type="text">
    <br><button id="save" type="button">Save</button>
  </form>`;
  divInfo.innerHTML = form;
  divMessages.classList.add("show");
  let btnSave = document.getElementById("save");
  btnSave.addEventListener("click", saveUser);
  function saveUser() {
    let first = document.getElementById("first").value;
    let last = document.getElementById("last").value;
    let user = { firstname: first, lastname: last, path: {}, completed: {}, xp: 0 };
    localStorage.setItem("klassy_game", JSON.stringify(user));
    divMessages.classList.remove("show");
    choosePath(wordlist, user);
  }
}

function startGame(task, selected, user) {

  let startTime = new Date().getTime(); // test if we finish under par
  let klasses = task.groups;
  let badge = task.badge;
  let deltaXP = 0; // xp earned this game

  // these may end up as const in final version
  // they are variables now so we can test different settings
  let CLUSTERSIZE = 5; // how many words to drop at once
  let INTERVAL = 760; // duration of word animation
  let SHOTSPEED = 20; // how fast to update shot pos
  let DELTA = 15; // how many pixels moved by each css animation
  let INCREMENT = SHOTSPEED * DELTA / INTERVAL;
  // increment is how many pixels in y word has moved by css animation
  // this number is not reflected into w.poy by css
  // so we update it in moveshot

  let divMain = document.getElementById("main");
  let divTextMeasure = document.getElementById("textmeasure");
  let divMask = document.getElementById("mask");
  let divFire = document.getElementById("firebutton");
  let divConfig = document.getElementById("config");
  let divMessages = document.getElementById("messages");
  let divBadgebox = document.getElementById("badgebox");
  let divInfo = document.getElementById("info");

  let inpMoveGun = document.getElementById("movegun");

  // these must be Object as we append extra props
  let divBarrel = document.getElementById("barrel");
  let divRound = document.getElementById("round");
  let divGun = document.getElementById("gun");

  /**
   * (1) A named function just to make commenting easier
   * Creates a span for each word, calcs width in px
   */
  function createWords() {
    for (let k in klasses) {
      for (let o of klasses[k].split(',')) {
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
  }

  createWords();

  let spnWords = Array.from(document.querySelectorAll("#main > span"));
  // get all words placed on stage ready for dropping, convert NodeList to Array<Object>
  // flow wont allow adding new props to a class like NodeList

  let dropping = []; // words that are on stage and dropping

  spnWords.forEach(w => {
    w.alive = false;
    w.pox = 0;
    w.poy = 0;
    w.h = 20; // width is set in createWords (1), calculated from word width
    w.prevpos = 0; // updated at end of css animation     
    /**
     * prevpos is needed as the movement of words is a combination of
     * css animations (animation API) and simply updating .left .top
     * css animation is very smooth, but requires known start/stop
     * Solution is using short segments of css animation (DELTA px)
     * and then updating pox, poy at end of animation.
     * At end of css-animation: poy = prevpos + DELTA
     * During css animation: poy +=  INCREMENT
     *  this so that the hit-test is more accurate while css animation is running
     *  note that updating poy during css anim has no visual effect
    */
  });
  // add extra props to each node - needed for animation

  // kategory(klass) names - we pretend they are ammo boxes
  // user selects ammo to match dropping word
  // we will stash gold coins beneath each box for words that are shot down
  // thus we need to keep reference to span 
  // we must also count coins in each stash
  let goldCount = {};
  let kategorySpan = {}; // kategoryName => span
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

  restartCluster();

  setInterval(animation, INTERVAL);
  setInterval(moveshot, SHOTSPEED);

  divFire.addEventListener("mousedown", fireRound);

  function animation(e) {
    // random x-direction  
    let delta = range(0, CLUSTERSIZE);
    delta = delta.map(e => roll(-50, 50));
    delta.forEach((d, i) => {
      let w = dropping[i];
      if (w && w.pox + d > 500 - w.w) {
        delta[i] = -20; // avoid right edge
      }
      if (w && w.pox + d < 10) {
        delta[i] = 20; // avoid left edge
      }
    });
    let i = 0;
    for (let w of dropping) {
      if (w.alive) {
        w.style.top = w.poy + "px";
        w.style.zIndex = 1;
        let d = delta[i++];
        if (w.pox) w.myanim = w.animate([{ top: w.poy + "px", left: w.pox + "px", offset: 0 }, { top: w.poy + DELTA + "px", left: w.pox + d + "px", offset: 1 }], {
          duration: INTERVAL,
          easing: 'linear',
          fill: 'forwards'
        });
        w.poy = w.prevpos + DELTA;
        w.prevpos = w.poy;
        w.pox += d;

        // if the word has fallen too far
        if (w.poy > 450) {
          w.alive = false;
          w.poy = -400;
          w.style.top = "-400px";
          w.style.display = "none";
          w.style.zIndex = -2;
          deltaXP -= 1;
        }
      }
    }

    dropping = dropping.filter(e => e.alive);
    if (dropping.length === 0) {
      restartCluster();
    }
  }

  function restartCluster() {
    dropping = shuffle(spnWords).slice(0, CLUSTERSIZE);
    let i = 0;
    let free = 500 / CLUSTERSIZE;
    for (let w of dropping) {
      let txtw = w.textWidth;
      w.pox = free * i + roll(0, free - txtw);
      w.poy = -50 * i + roll(-20, -10);
      w.prevpos = w.poy;
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
    if (inpMoveGun.checked) {
      let startx = divGun.offsetLeft;
      let finalx = t.offsetLeft + t.offsetWidth / 2 - 40;
      divGun.animate([{ left: startx + "px", offset: 0 }, { left: finalx + "px", offset: 1 }], {
        duration: 90,
        fill: 'forwards'
      });
    }
  }

  function fireRound(e) {
    let gunBoundingBox = divGun.getBoundingClientRect();
    let gunx = gunBoundingBox.left + gunBoundingBox.width / 2 - 18;
    let guny = gunBoundingBox.bottom;
    let mx = e.clientX;
    let my = e.clientY;
    let dx = gunx - mx;
    let dy = guny - my;
    let angle = Math.atan2(dy, -dx);
    divBarrel.angle = angle;
    angle = 90 - 180 * angle / Math.PI;
    divBarrel.style.transform = "rotate(" + angle + "deg)";
    divRound.pox = gunx;
    divRound.poy = guny - 24;
    divRound.vx = 6 * Math.cos(divBarrel.angle);
    divRound.vy = 6 * Math.sin(divBarrel.angle);
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
      w.poy += INCREMENT; // adjustment for css animation movement
      if (overlap(w, divRound)) {
        if (w.klass === divRound.ammotype) {
          deltaXP += 2;
          w.alive = false;
          w.style.display = "none";
          w.done = true;
          if (w.myanim) w.myanim.cancel(); // stop any animation on word
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
            restartCluster();
          }
          if (spnWords.length === 0) {
            registerWinner(badge);
          }
        }
      }
    }
  }

  function registerWinner(badge) {
    user.xp += Math.max(0, deltaXP);
    let timeUsed = Math.floor((new Date().getTime() - startTime) / 1000);
    let earnedBadge = new Badge(badge.text, selected, badge.klass, timeUsed, badge.par);
    user.completed[selected] = earnedBadge;
    localStorage.setItem("klassy_game", JSON.stringify(user));
    let s = `<h1>Winner ${ user.firstname }</h1>` + `Du brukte ${ timeUsed.toFixed(0) } sekunder. ` + `Du har tjent ${ deltaXP } ` + `og har nå ${ user.xp } XP` + '<h2>Dine medaljer</h2>';
    divInfo.innerHTML = s;
    for (let badgeUri in user.completed) {
      let badge = user.completed[badgeUri];
      let timing = 0;
      if (badge.time < badge.par) {
        timing = badge.time;
      }
      divBadgebox.appendChild(makeBadge(badge, { extra: "", timing: timing }));
    }
    divMessages.classList.add("show");
  }

  function makeBadge(badge, frills = { extra: "", timing: "", checked: false }) {
    let divBadge = document.createElement('div');
    divBadge.className = 'badge ' + badge.klass;
    let inner = '<span class="info">' + badge.title + '</span>';
    if (frills.timing) {
      // the badge has a time achivement
      inner += '<span class="timing">' + frills.timing + 's</span>';
    }
    if (frills.extra) {
      let extra = frills.extra.split(',');
      divBadge.classList.add(...extra);
    }
    divBadge.innerHTML = inner;
    return divBadge;
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

// returns true if a and b overlap
// a and b  have properties w,h,pox,poy
function overlap(a, b) {
  return a.pox > b.pox - a.w && a.pox < b.pox + b.w && a.poy > b.poy - a.h && a.poy < b.poy + b.h;
}

// creates an array with hi-lo elements, filled with lo,lo+1,..
function range(lo, hi) {
  let a = new Array(hi - lo);
  a.fill(1);
  return a.map((e, i) => lo + i);
}