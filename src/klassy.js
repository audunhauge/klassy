// @flow

function setup():void {

  const INTERVAL = 60;   // duration of animation

  let divMain = document.getElementById("main");
  let divTextMeasure = document.getElementById("textmeasure");
  
  let klasses = {};

  klasses["navn"] = "ole,per,kari".split(',');
  klasses["land"] = "sverige,norge,danmark".split(',');
  klasses["krig"] = "punerkrigen,napoleonskrigen,WWII".split(',');
  klasses["frukt"] = "eple,banan,sitron".split(',');


  for (let k:string in klasses) {
    for (let o:string of klasses[k]) {
      let spanO:Object = document.createElement("span");
      spanO.id = k + "_" + o;
      divMain.appendChild(spanO);
      spanO.innerHTML = o + " ";
      spanO.addEventListener("mousedown", pullWord);

      // measure size of word in pixels
      // spanO has no offsetWidth as it is position:absolute
      let spanM = document.createElement("span");
      divTextMeasure.appendChild(spanM);
      spanM.innerHTML = o + " "
      spanO.w = spanM.offsetWidth + 6;
    }
  };

  let spnWords:Array<Object> = Array.from(document.querySelectorAll("#main span")); 
  let dropping:Array<Object> = [];   // words that are on stage and dropping

  spnWords.forEach(w => { w.alive = false; w.pox = 0; w.poy = 0; w.h = 20; });
  // add extra props to each node - needed for animation

  restart();

  setInterval(animation, INTERVAL );

  function animation(e: Event): void {
    // overriding w:NodeList so we can add pox,poy
    let delta = [roll(-50,50),roll(-50,50),roll(-50,50) ];
    delta.forEach( (d,i) => {
      let w:Object = dropping[i];
      if (w && w.pox + d > 500 - w.w ) {
         delta[i] = -20;
      }
      if (w && w.pox + d < 10) {
        delta[i] = 20;
      } 
    });
    let i = 0;
    for (let w:Object of dropping) {
      if (w.alive) {
        let d = delta[i++];
        if (w.pox )
        w.animate([
          { top: w.poy + "px", left: w.pox + "px", offset: 0 },
          { top: w.poy + 25 + "px", left: w.pox + d + "px", offset: 1 },
        ],
          {
            duration: INTERVAL,
            easing: 'linear',
            fill: 'forwards'
          })
        w.poy += 25;
        w.pox += d
        
        //w.style.left = w.pox + "px";
        if (w.poy > 450) {
           w.alive = false;
           w.poy = -200;
           w.style.display = "none";
        }
      } 
    }
    dropping = dropping.filter( e => e.alive );
    if (dropping.length === 0) {
      restart();
    }
  }


  function restart():void {
    dropping = shuffle(spnWords).slice(0,3);
    let i = 0;
    let free = 500 / 3;
    for (let w:Object of dropping) {
      let txtw = w.textWidth;
      w.pox = free * i + roll(0,free - txtw);
      if (w.pox + txtw > 500 ) {
        console.log("BIGUN",w.pox,txtw,i);
      }
      w.poy = -50 * i + roll(-20,-10);
      w.alive = true;
      w.style.display = "block";
      i ++;
    }
  }

  function pullWord(e:MouseEvent):void {
    let t = e.currentTarget;
    let px = e.clientX;
    let py = e.clientY;
    console.log(t,px,py);    
  }
  
}

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
