// @flow

function setup():void {
  const url = "wordlist.json";
  fetch(url).then(r => r.json())
  .then(data => behandle(data))
  .catch(e => {
    console.log("Klarte ikke å laste filen wordlist.json.");
    console.log("Bruker demo matvarer.");
    let klasses = {};
    klasses["grønnsak"] = "gulerot,brokkoli,kål,salat,neper".split(',');
    klasses["sopp"] = "kantarell,morkel,trøffel".split(',');
    klasses["bær"] = "rips,multe,solbær,bringebær".split(',');
    klasses["frukt"] = "eple,pærer,appelsin".split(',');
    klasses["nøtter"] = "mandler,pistasj,hasselnøtt".split(',');
    startGame(klasses);
  });
}

function behandle(data) {
  let lessons = shuffle(Object.keys(data));
  let selected = lessons[0];
  startGame(data[selected]);
}

function startGame(klasses):void {
  // these may end up as const in final version
  // they are variables now so we can test different settings
  let CLUSTERSIZE = 5;  // how many words to drop at once
  let INTERVAL = 760;   // duration of word animation
  let SHOTSPEED = 20;   // how fast to update shot pos
  let DELTA = 25;       // how many pixels moved by each css animation
  let INCREMENT = SHOTSPEED * DELTA / INTERVAL;
  // increment is how many pixels in y word has moved by css animation
  // this number is not reflected into w.poy by css
  // so we update it in moveshot

  let divMain = document.getElementById("main");
  let divTextMeasure = document.getElementById("textmeasure");
  let divMask = document.getElementById("mask");
  let divFire  = document.getElementById("firebutton");
  let divConfig  = document.getElementById("config");
  let divMessages  = document.getElementById("messages");


  let inpMoveGun =  document.getElementById("movegun");

  // these must be Object as we append extra props
  let divBarrel:Object = document.getElementById("barrel");
  let divRound:Object = document.getElementById("round");
  let divGun:Object =  document.getElementById("gun");
  
  

  /**
   * (1) A named function just to make commenting easier
   * Creates a span for each word, calcs width in px
   */
  function createWords() {
    for (let k: string in klasses) {
      for (let o: string of klasses[k].split(',')) {
        let spanO: Object = document.createElement("span");
        spanO.id = k + "_" + o;
        spanO.klass = k;
        spanO.alive = false;
        divMain.appendChild(spanO);
        spanO.innerHTML = o + " ";

        // measure size of word in pixels
        // spanO has no offsetWidth as it is position:absolute
        let spanM = document.createElement("span");
        divTextMeasure.appendChild(spanM);
        spanM.innerHTML = o + " "
        spanO.w = spanM.offsetWidth + 6;
      }
    };
  }

  createWords();

  let spnWords:Array<Object> = Array.from(document.querySelectorAll("#main > span")); 
  // get all words placed on stage ready for dropping, convert NodeList to Array<Object>
  // flow wont allow adding new props to a class like NodeList

  let dropping:Array<Object> = [];   // words that are on stage and dropping

  spnWords.forEach(w => { 
    w.alive = false; 
    w.pox = 0; 
    w.poy = 0; 
    w.h = 20;         // width is set in createWords (1), calculated from word width
    w.prevpos = 0;    // updated at end of css animation     
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
  let kategorySpan = {};  // kategoryName => span
  let klassNames:Array<string> = Object.keys(klasses);
  klassNames.forEach( (s:string) => {
     let spanKlas:Object = document.createElement("span");
     spanKlas.innerHTML = s + " ";
     spanKlas.ammotype = s;
     divMask.appendChild(spanKlas);
     spanKlas.addEventListener("mousedown", chooseRound);
     kategorySpan[s] = spanKlas;
     goldCount[s] = 0;
  })

  // set up shot for moving and hit-testing
  divRound.pox = 0;
  divRound.poy = 0;
  divRound.w = 22;
  divRound.h = 22;
  divRound.vx = 0;
  divRound.vy = 0;
  divRound.ammotype = "";

  restartCluster();

  setInterval(animation, INTERVAL );
  setInterval(moveshot, SHOTSPEED);

  divFire.addEventListener("mousedown", fireRound);

  function animation(e: Event): void {
    // random x-direction  
    let delta = range(0,CLUSTERSIZE);
    delta =  delta.map(e => roll(-50,50));
    delta.forEach( (d,i) => {
      let w:Object = dropping[i];
      if (w && w.pox + d > 500 - w.w ) {
         delta[i] = -20;  // avoid right edge
      }
      if (w && w.pox + d < 10) {
        delta[i] = 20;   // avoid left edge
      } 
    });
    let i = 0;
    for (let w:Object of dropping) {
      if (w.alive) {
        w.style.top = w.poy + "px";
        w.style.zIndex = 1;
        let d = delta[i++];
        if (w.pox )
        w.myanim = w.animate([
          { top: w.poy + "px", left: w.pox + "px", offset: 0 },
          { top: w.poy + 25 + "px", left: w.pox + d + "px", offset: 1 },
        ],
          {
            duration: INTERVAL,
            easing: 'linear',
            fill: 'forwards'
          })
        w.poy = w.prevpos + 25;
        w.prevpos = w.poy;
        w.pox += d
        
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
    
    dropping = dropping.filter( e => e.alive );
    if (dropping.length === 0) {
      restartCluster();
    }
  }


  function restartCluster():void {
    dropping = shuffle(spnWords).slice(0,CLUSTERSIZE);
    let i = 0;
    let free = 500 / CLUSTERSIZE;
    for (let w:Object of dropping) {
      let txtw = w.textWidth;
      w.pox = free * i + roll(0,free - txtw);
      w.poy = -50 * i + roll(-20,-10);
      w.prevpos = w.poy;
      w.alive = true;
      if (w.myanim) w.myanim.cancel();
      w.style.top = "-200px";
      w.style.display = "block";
      i ++;
    }
  }

  function chooseRound(e:Event) {
    let t:Object = e.currentTarget;
    divRound.ammotype = t.ammotype;
    let kats = Array.from(document.querySelectorAll("#mask > span"));
    kats.forEach( k => k.classList.remove("active"));
    t.classList.add("active");
    if (inpMoveGun.checked) {
      let startx = divGun.offsetLeft;
      let finalx = t.offsetLeft + t.offsetWidth/2 - 40;
      divGun.animate([
          { left: startx + "px", offset: 0 },
          { left: finalx + "px", offset: 1 },
        ],
          {
            duration: 90,
            fill: 'forwards'
      });
    }
  }

  function fireRound(e:MouseEvent):void {
    let gunBoundingBox = divGun.getBoundingClientRect();
    let gunx = gunBoundingBox.left + gunBoundingBox.width/2 - 18;
    let guny = gunBoundingBox.bottom;
    let mx = e.clientX;
    let my = e.clientY;
    let dx = gunx - mx;
    let dy = guny - my;
    let angle = Math.atan2(dy,-dx);
    divBarrel.angle = angle;
    angle = 90 - 180 * angle / Math.PI;
    divBarrel.style.transform = "rotate(" + angle +  "deg)";
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
    for (let w:Object of dropping) {
      w.poy += INCREMENT;           // adjustment for css animation movement
      if (overlap(w,divRound)) {
        if (w.klass === divRound.ammotype) {
          w.alive = false;
          w.style.display = "none";
          w.done = true;
          w.myanim.cancel();       // stop any animation on word
          // give gold
          let spnGold = document.createElement("div");
          spnGold.className = "gold";
          kategorySpan[w.klass].appendChild(spnGold);
          spnGold.style.top =  40 + goldCount[w.klass] + "px";
          spnGold.style.left =  roll(-3,3) + "px";
          spnGold.style.transform = "rotate(" + roll(-3,3) + "deg)"
          goldCount[w.klass] += 11 + roll(0,2);

          divRound.alive = false;
          divRound.poy = -200;
          divRound.style.top = divRound.poy + "px";
          spnWords = spnWords.filter( e => e.done !== true );
          dropping = dropping.filter( e => e.alive );
          if (dropping.length === 0) {
            restartCluster();
          }
          if (spnWords.length === 0) {
            let s = '<h1>Winner</h1>'
            + '<h2>Dine medaljer</h2>'
            + '<div id="lego" class="badge ok"><span id="msg">fisk</span></div>';
            divMessages.innerHTML =s;
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
function roll(lo:number, hi:number=NaN):number {
  if (isNaN(hi)) {
    hi = lo; lo = 1;
  }
  let span = hi - lo;
  let r = lo + Math.random() * span;
  if (Number.isInteger(lo) && Number.isInteger(hi)) r = Math.floor(r);
  return r;
}

// shuffles an array
function shuffle(arr:Array<Object>):Array<Object> {
   for (let i=arr.length-1; i>0; i--) {
     let j = Math.round(Math.random()*i);
     let tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
   }
   return arr;
 }

 type Movable = { w:number, h:number, pox:number, poy:number };
 // returns true if a and b overlap
 // a and b  have properties w,h,pox,poy
 function overlap(a:Movable, b:Movable):boolean {
   return (
      a.pox > b.pox - a.w &&
      a.pox < b.pox + b.w &&
      a.poy > b.poy - a.h &&
      a.poy < b.poy + b.h
   );
 }


 // creates an array with hi-lo elements, filled with lo,lo+1,..
 function range(lo:number, hi:number):Array<number> {
   let a = new Array(hi-lo);
   a.fill(1);
   return a.map( (e,i) => lo + i);
 }
