// @flow

function setup():void {

  // these may end up as const in final version
  // they are variables now so we can test different settings
  let CLUSTERSIZE = 5;  // how many words to drop at once
  let INTERVAL = 760;   // duration of word animation
  let SHOTSPEED = 20;   // how fast to update shot pos
  let DELTA = 25;       // how many pixels moved by each css animation
  let INCREMENT = SHOTSPEED * DELTA / INTERVAL;
  // increment is how many pixels in y word has moved by css animation
  // this number is not reflected in w.poy
  // so we update it in moveshot

  let divMain = document.getElementById("main");
  let divTextMeasure = document.getElementById("textmeasure");
  let divMask = document.getElementById("mask");
  let divFire  = document.getElementById("firebutton");
  let divConfig  = document.getElementById("config");
  let divMessages  = document.getElementById("messages");
  let divGun:Object =  document.getElementById("gun");

  let inpMoveGun =  document.getElementById("movegun");

  // these two must be Object as we append extra props
  let divBarrel:Object = document.getElementById("barrel");
  let divRound:Object = document.getElementById("round");
  
  let klasses = {};

  klasses["grønnsak"] = "gulerot,brokkoli,kål,salat,neper".split(',');
  klasses["sopp"] = "kantarell,morkel,trøffel".split(',');
  klasses["bær"] = "rips,multe,solbær,bringebær".split(',');
  klasses["frukt"] = "eple,pærer,appelsin".split(',');
  klasses["nøtter"] = "mandler,pistasj,hasselnøtt".split(',');


  for (let k:string in klasses) {
    for (let o:string of klasses[k]) {
      let spanO:Object = document.createElement("span");
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

  let spnWords:Array<Object> = Array.from(document.querySelectorAll("#main > span")); 
  let dropping:Array<Object> = [];   // words that are on stage and dropping

  spnWords.forEach(w => { 
    w.alive = false; 
    w.pox = 0; 
    w.poy = 0; 
    w.h = 20;         // width is set in loop above, calculated from word width
    w.prevpos = 0;    // updated at end of css animation     
  });
  // add extra props to each node - needed for animation

  // kategory names - we pretend they are ammo boxes
  // user must click correct box for where gun is pointing
  // we will stash gold coins beneath each box for words that are correct
  // thus we need to keep reference to span 
  // we must also count coins in each stash
  let goldCount = {};
  let kategorySpan = {};
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

  restart();

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
      restart();
    }
  }


  function restart():void {
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

 function overlap(a:Object, b:Object):boolean {
   return (
      a.pox > b.pox - a.w &&
      a.pox < b.pox + b.w &&
      a.poy > b.poy - a.h &&
      a.poy < b.poy + b.h
   );
 }

 function range(lo,hi) {
   let a = new Array(hi-lo);
   a.fill(1);
   return a.map( (e,i) => lo + i);
 }
