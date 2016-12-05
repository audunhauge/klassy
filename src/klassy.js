// @flow



type User = { 
  firstname:string, 
  lastname:string, 
  path:Object, 
  completed:Object, 
  justFinished:boolean,    // true when just completed a lesson
  xp:number 
};

class Badge {
  title:string;
  uri: string;
  klass:string;
  time:number;
  par:number;

  constructor(title:string, uri:string, klass:string, time:number, par:number) {
    this.title = title;
    this.uri = uri;
    this.klass = klass;
    this.time = time;
    this.par = par;
  } 
}

declare function startGame(task:any, selected:any):void;

let wordlist:Object;    // global so we can restart without refetching data
let subjects:Object;    // choice of subjects to learn
let cache = {};         // remember file contents
let user:User;               // global

function setup():void {
  const url = "index.json";
  fetch(url).then(r => r.json())
  .then(data => behandle(data))
  .catch(e => {
    failed(e, url);
  });
}

function failed(e, url) {
  console.log(`Failed to load ${url}.`);
  console.log("Using demo.");
  let klasses = {};
  user = { firstname: "test", lastname: "", completed: {}, path: {}, xp: 0, justFinished:false };
  klasses["fruit"] = "apple,pear,orange";
  klasses["nuts"] = "hazelnut,pecan";
  let intro = `Fant ikke filen ${url}, du får frukt og grønt.`;
  startGame( {groups:klasses, random:2, intro, badge:{text: "Frukt",klass:"black",par:42} }, 'Frukt');
}

function behandle(data:Object) {
  subjects = data;
  let userinfo:any = localStorage.getItem("klassy_game");
  if (userinfo !== null) {
    user = JSON.parse(userinfo);
    choosePath();
  } else {
    // no user registered
    createAccount();
  }
}

function choosePath() {
  let active, subscribed;
  if (user.path && user.path.active) {
    active = user.path.active;
    subscribed = user.path.subscribed || [active];
    chooseWordlist(user);
  } else {
    getUserSelection();
  }
}

function chooseWordlist() {
  let active = user.path.active || 'Basis';
  let subject = subjects[active];
  let url = subject.filename || "basis.json";
  if (cache[url]) {
    wordlist = cache[url];
    pickAList();
  } else fetch(url).then(r => r.json())
    .then(data => {
      wordlist = data;
      cache[url] = data;
      pickAList();
    })
    .catch(e => {
      failed(e, url);
    });
}

function pickAList() {
  let tasks = wordlist.tasks;
  let lessons: string[] = shuffle(Object.keys(tasks));
  let todo: string[] = lessons.filter(e => user.completed[e] === undefined);
  let selected: string;
  if (todo.length > 0) {
    selected = todo[0];
    showIntroAndStart(tasks[selected],selected);
    //startGame(tasks[selected], selected);
  } else {
    if (user.justFinished) {
      userCompletedALesson();
    } else {
      // allow user to retake a lesson
      selected = lessons[0];
      showIntroAndStart(tasks[selected],selected);
      //startGame(tasks[selected], selected);
    }
  }
}


function showIntroAndStart(task, selected) {
  dget("#badgebox").innerHTML = '';               // wipe away all badges
  if (task.intro) {
    dget("#info").innerHTML = task.intro;
    dget("#btn").innerHTML = '<button id="start" type="button">Start</button>';
    let btnStart = dget("#start");
    dget("#messages").classList.add("show");
    btnStart.addEventListener("click", continueGame);
    function continueGame(e: Event) {
      dget("#messages").classList.remove("show");
      startGame(task, selected);
    }
  } else {
    startGame(task, selected);
  }
}


function showBadges(divB:Object) {
  divB.innerHTML = '';       // wipe out existing badges
  for (let badgeUri in user.completed) {
    let badge = user.completed[badgeUri];
    let timing = 0;
    if (badge.time < badge.par) {
      timing = badge.time;
    }
    divB.appendChild(makeBadge(badge, { extra: "", timing: timing }));
  }
}

function makeBadge(badge: Object, frills: Object = { extra: "", timing: "", checked: false }): HTMLElement {
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


function userCompletedALesson() {
  let divMessages =  dget("#messages");
  let divBadgebox  =  dget("#badgebox");
  let divInfo =  dget("#info");
  user.justFinished = false;
  let form = `<form>
    Well done ${user.firstname} ${user.lastname}!
    <p>
    You have now completed the lesson ${user.path.active}
  </form>`;
  divInfo.innerHTML = form;
  dget("#btn").innerHTML = '<button id="continue" type="button">Continue</button>';
  let btnContinue =  dget("#continue");
  showBadges(divBadgebox);
  divMessages.classList.add("show");
  btnContinue.addEventListener("click", continueGame);
  function continueGame(e:Event) {
    getUserSelection();
  }
}

function getUserSelection() {
  dget("#badgebox").innerHTML = '';               // wipe away all badges
  let divMessages  =  dget("#messages");
  let divInfo  =  dget("#info");
  let subjectOptions = Object.keys(subjects).map(e => `<option value="${e}">`).join('');
  let form = `<form>
    <h4>Hello ${user.firstname} ${user.lastname}</h4>
    <div id="msg"></div>
    <br>Choose a lesson <input id="active" list="lessons">
    <datalist id="lessons">
      ${subjectOptions}
    </datalist>
  </form>`;  
  divInfo.innerHTML = form;
  dget("#btn").innerHTML = '<button id="save" type="button">Take test</button>';
  divMessages.classList.add("show");
  let btnSave =  dget("#save");
  btnSave.addEventListener("click", saveUser);
  function saveUser() {
    let active:string = ( dget("#active"):any).value;
    let subscribed = [active];
    if (subjects[active] == undefined) {
      dget("#msg").innerHTML = "Not valid";
      setTimeout( e => {
            dget("#msg").innerHTML = "";
        }, 1000);
      return;
    }
    user.path = { active,subscribed};
    localStorage.setItem("klassy_game",JSON.stringify(user));
    divMessages.classList.remove("show");
    chooseWordlist();
  }
}


function createAccount():void {
  // create and show a GUI for registration
  let divMessages  =  dget("#messages");
  let divInfo  =  dget("#info");
  let form = `<form>
    <br>Firstname <input id="first" type="text">
    <br>Lastname <input id="last" type="text">
  </form>`;  
  divInfo.innerHTML = form;
  dget("#btn").innerHTML =  '<button id="save" type="button">Save</button>';
  divMessages.classList.add("show");
  let btnSave =  dget("#save");
  btnSave.addEventListener("click", saveUser);
  function saveUser() {
    let first:string = ( dget("#first"):any).value;
    let last:string = ( dget("#last"):any).value;
    user = {firstname:first, lastname:last, path:{}, completed:{}, xp:0, justFinished:false };
    localStorage.setItem("klassy_game",JSON.stringify(user));
    divMessages.classList.remove("show");
    choosePath( );
  }
}



function registerWinner(badge, startTime,deltaXP,selected): void {
    let divMessages =  dget("#messages");
    let divBadgebox =  dget("#badgebox");
    let divInfo =  dget("#info");
    user.xp += Math.max(0, deltaXP);
    user.justFinished = true;
    let timeUsed = Math.floor(((new Date()).getTime() - startTime) / 1000);
    let earnedBadge: Badge = new Badge(badge.text, selected, badge.klass, timeUsed, badge.par);
    user.completed[selected] = earnedBadge;
    localStorage.setItem("klassy_game", JSON.stringify(user));
    let s = `<h1>Winner ${user.firstname}</h1>`
        + `Du brukte ${timeUsed.toFixed(0)} sekunder. `
        + `Du har tjent ${deltaXP} `
        + `og har nå ${user.xp} XP`
        + '<h2>Dine medaljer</h2>';
    divInfo.innerHTML = s;
    showBadges(divBadgebox);
    divMessages.classList.add("show");
    dget("#btn").innerHTML =  '<button id="restart" type="button">Nytt spill</button>';
    dget("#restart").addEventListener("click", restartGame);
}

function restartGame(e: Event) {
    let divMask =  dget("#mask");
    let divFire  =  dget("#firebutton");
    let divTextMeasure =  dget("#textmeasure");
    let divDropzone =  dget("#dropzone");
    let divMessages =  dget("#messages");
    let divBadgebox =  dget("#badgebox");
    let divInfo =  dget("#info");
    divMessages.classList.remove("show");
    divDropzone.innerHTML = '<div id="firebutton"></div>';
    divTextMeasure.innerHTML = '';
    divMask.innerHTML = '';
    divBadgebox.innerHTML = '';
    choosePath();
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
function shuffle(arr:Array<any>):Array<any> {
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

 // just a shortening
 function dget(selector:string):HTMLElement {
   return document.querySelector(selector);
 }
