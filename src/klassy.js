// @flow

function setup():void {
  let divMain = document.getElementById("main");
  let klasses = {};
  klasses["navn"] = "ole,per,kari".split(',');
  klasses["land"] = "sverige,norge,danmark".split(',');
  klasses["krig"] = "punerkrigen,napoleonskrigen,WWII".split(',');
  klasses["frukt"] = "eple,banan,sitron".split(',');

  for (let k:string in klasses) {
    for (let o of klasses[k]) {
      let oo = document.createElement("span");
      divMain.appendChild(oo);
      oo.innerHTML = o + " ";
      oo.addEventListener("mousedown", pullWord);
    }
  }

  let spnWords = Array.from(document.querySelectorAll("span")); 

  atStart();

  setInterval(animation, 400 );

  function animation(e:Event):void {
    // overriding w:NodeList so we can add pox,poy
    for (let w:Object of spnWords) {
      w.animate([
        { top: w.poy + "px", offset: 0 },
        { top: w.poy + 25 + "px", offset: 1 },
      ],
      {
        duration: 400,
        easing: 'linear',
        fill: 'forwards'
      })
      w.poy += 25;
      w.style.left = w.pox + "px";
      if (w.poy > 450) w.poy = 0;
    }
  }

  function atStart():void {
    let i = 0;
    for (let w:Object of spnWords) {
      w.pox = 35 * i;
      w.poy = 25 * i;
      i++;
    }
  }

  function pullWord(e:MouseEvent) {
    let t = e.currentTarget;
    let px = e.clientX;
    let py = e.clientY;
    console.log(t,px,py);
    
  }
  
}
