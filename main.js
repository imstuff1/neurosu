// const parser = require("osu-player");
// const { start } = require("repl");

const GAMESTATE = {
  MENU: 0,
  INSTRUCTIONS: 1,
  PLAY: 2,
  FAIL: 3,
  RESULTS: 4,
  ENDGAME: 5,
};

let initState = true;

let font;
let sw = document.documentElement.clientWidth;
let sh = document.documentElement.clientHeight;
let currentState = GAMESTATE.MENU;
const COLORS = {
  darkPink: '#C7416B',
  pink: '#ff8ab6',
  peach: '#F6ACAF',
  whitePink: '#FEECF4',
  peach2: '#F8BEB7',
  purple: '#332B4E',
  clear: '#F8BEB700',
};
const GW = 512;
const GH = 384;
const PADDING = 50;

const INPUT_MODES = {
  THREE_FINGER: 0,
  FOUR_FINGER: 1,
};

let inputMode = INPUT_MODES.THREE_FINGER;

let campaignBeatmaps = [];

let audioElements = {};
let upArrow, downArrow, leftArrow, rightArrow, upArrowOutline, downArrowOutline, leftArrowOutline, rightArrowOutline;
let neuro, neuroMiss;

let animationArray = [];

//Preload assets
async function preload() {
  upArrow = loadImage('./assets/arrows/up.png');
  downArrow = loadImage('./assets/arrows/down.png');
  leftArrow = loadImage('./assets/arrows/left.png');
  rightArrow = loadImage('./assets/arrows/right.png');
  upArrowOutline = loadImage('./assets/arrows/up-outline.png');
  downArrowOutline = loadImage('./assets/arrows/down-outline.png');
  leftArrowOutline = loadImage('./assets/arrows/left-outline.png');
  rightArrowOutline = loadImage('./assets/arrows/right-outline.png');
  neuro = loadImage('./assets/neuro/neuro.png');
  neuroMiss = loadImage('./assets/neuro/neuromiss.png');
  ddr = loadImage('./assets/ddr/ddr.png');
  ddrUp = loadImage('./assets/ddr/ddr-up.png');
  ddrDown = loadImage('./assets/ddr/ddr-down.png');
  ddrLeft = loadImage('./assets/ddr/ddr-left.png');
  ddrRight = loadImage('./assets/ddr/ddr-right.png');

  font = loadFont('./assets/firstcoffee.ttf');

  //Just Pachi's Normal
  await $.getJSON(
    "./beatmaps/712959 Dan Salvato - Your Reality/Dan Salvato - Your Reality (Nozhomi) [Just Pachi's Normal].json",
    function (data) {
      campaignBeatmaps[0] = data;
    }
  );

  await $.getJSON(
    './beatmaps/883669 ODDEEO + Karma Wears White Ties - Chinatown Blues [feat. Megpoid Gumi]/ODDEEO + Karma Wears White Ties - Chinatown Blues [feat. Megpoid Gumi] (Cloudchaser) [normal_diff].json',
    function (data) {
      campaignBeatmaps[1] = data;
    }
  );

  await $.getJSON('./beatmaps/2295850 Neuro-sama - LIFE/Neuro-sama - LIFE (BMR07) [Normal].json', function (data) {
    campaignBeatmaps[2] = data;
  });

  for (let i = 0; i < campaignBeatmaps.length; i++) {
    console.log('Converting beatmap', i, '...');
    campaignBeatmaps[i] = convertTODDR(campaignBeatmaps[i]);
  }
}

const DIRECTION = {
  UP: 0,
  LEFT: 1,
  DOWN: 2,
  RIGHT: 3,
};

function convertTODDR(data) {
  let sinceUp = 0;
  let sinceDown = 0;
  let sinceLeft = 0;
  let sinceRight = 0;
  let direction = -1;
  let setUp = function () {
    direction = DIRECTION.UP;
    sinceUp = 0;
    sinceDown += 1;
    sinceLeft += 1;
    sinceRight += 1;
  };
  let setDown = function () {
    direction = DIRECTION.DOWN;
    sinceDown = 0;
    sinceUp += 1;
    sinceLeft += 1;
    sinceRight += 1;
  };
  let setLeft = function () {
    direction = DIRECTION.LEFT;
    sinceLeft = 0;
    sinceUp += 1;
    sinceDown += 1;
    sinceRight += 1;
  };
  let setRight = function () {
    direction = DIRECTION.RIGHT;
    sinceRight = 0;
    sinceUp += 1;
    sinceDown += 1;
    sinceLeft += 1;
  };
  for (let i = 0; i < data.hitObjects.length; i++) {
    //Alternating pattern if time between previous note is less than 140bpm (428ms)
    if (i > 0 && data.hitObjects[i].startTime - data.hitObjects[i - 1].startTime < 428) {
      // console.log('Alternating pattern');
      let quadrant = 0;
      //Quadrant 1
      if (data.hitObjects[i].position[0] > 256 && data.hitObjects[i].position[1] <= 192) {
        if (sinceUp > sinceRight) {
          setUp();
        } else {
          setRight();
        }
        quadrant = 1;
        //Quadrant 2
      } else if (data.hitObjects[i].position[0] <= 256 && data.hitObjects[i].position[1] <= 192) {
        if (sinceUp > sinceLeft) {
          setUp();
        } else {
          setLeft();
        }
        quadrant = 2;
        //Quadrant 3
      } else if (data.hitObjects[i].position[0] <= 256 && data.hitObjects[i].position[1] > 192) {
        if (sinceDown > sinceLeft) {
          setDown();
        } else {
          setLeft();
        }
        quadrant = 3;
        //Quadrant 4
      } else if (data.hitObjects[i].position[0] > 256 && data.hitObjects[i].position[1] > 192) {
        if (sinceDown > sinceRight) {
          setDown();
        } else {
          setRight();
        }
        quadrant = 4;
      }
    } else {
      //Single tapping pattern
      const ratioSlope = 3 / 4;

      let hx = data.hitObjects[i].position[0];
      let hy = data.hitObjects[i].position[1];
      //Single tap
      //Make more generous for left and right
      if (hy > ratioSlope * hx && hy <= -ratioSlope * hx + GH) {
        console.log('LEFT SET SINGLE TAP');
        setLeft();
      } else if (hy <= ratioSlope * hx && hy > -ratioSlope * hx + GH) {
        console.log('RIGHT SET SINGLE TAP');
        setRight();
      } else if (hy <= ratioSlope * hx && hy <= -ratioSlope * hx + GH) {
        console.log('UP SET SINGLE TAP');
        setUp();
      } else if (hy > ratioSlope * hx && hy > -ratioSlope * hx + GH) {
        console.log('DOWN SET SINGLE TAP');
        setDown();
      }
    }
    console.log('hit object before direction:', JSON.stringify(data.hitObjects[i]));
    Object.assign(data.hitObjects[i], { direction: direction });
    console.log('hit object after direction:', JSON.stringify(data.hitObjects[i]));
  }

  return data;
}

//Init audio and bypass browser restrictions
function mouseClicked() {
  if (currentState === GAMESTATE.MENU) {
    audioElements['miss'] = $('<audio>', {
      controls: false,
      src: './assets/miss.mp3',
      type: 'audio/mp3',
    });
    audioElements['hit'] = $('<audio>', {
      controls: false,
      src: './assets/hit.mp3',
      type: 'audio/mp3',
    });
    audioElements['song1'] = $('<audio>', {
      controls: false,
      src: './beatmaps/712959 Dan Salvato - Your Reality/audio.mp3',
      type: 'audio/mp3',
    });
    audioElements['song2'] = $('<audio>', {
      controls: false,
      src: './beatmaps/883669 ODDEEO + Karma Wears White Ties - Chinatown Blues [feat. Megpoid Gumi]/audio.mp3',
      type: 'audio/mp3',
    });
    audioElements['song3'] = $('<audio>', {
      controls: false,
      src: './beatmaps/2295850 Neuro-sama - LIFE/audio.mp3',
      type: 'audio/mp3',
    });
    for (const i in audioElements) {
      $('body').append(audioElements[i]);
      audioElements[i][0].play();
      audioElements[i][0].pause();
    }
    // setTimeout(function () {
    //   for (let i = 0; i < audioElements.length; i++) {
    //     audioElements[i][0].pause();
    //   }
    // }, 5000);
    switchState(GAMESTATE.INSTRUCTIONS);
  } else if (currentState === GAMESTATE.INSTRUCTIONS) {
    switchState(GAMESTATE.PLAY);
  } else if (currentState === GAMESTATE.RESULTS) {
    levelIndex++;
    initMap = true;
    initState = true;
    if (levelIndex >= campaignBeatmaps.length) {
      switchState(GAMESTATE.ENDGAME);
    } else {
      switchState(GAMESTATE.PLAY);
    }
  } else if (currentState === GAMESTATE.ENDGAME) {
    switchState(GAMESTATE.MENU);
  }

  // Code to run.
}

function setup() {
  //creates a canvas 600 pixels wide
  //and 400 pixels high
  createCanvas(document.documentElement.clientWidth, document.documentElement.clientHeight);
  console.log('SETUP SETUP SETUP');
}
function draw() {
  background(COLORS.purple);
  //sky blue background
  switch (currentState) {
    case GAMESTATE.MENU:
      menu();
      break;
    case GAMESTATE.PLAY:
      play();
      break;
    case GAMESTATE.INSTRUCTIONS:
      instructions();
      break;
    case GAMESTATE.FAIL:
      fail();
      break;
    case GAMESTATE.RESULTS:
      results();
      break;
    case GAMESTATE.ENDGAME:
      endgame();
      break;
  }
  initState = false;
  //sun in top-right corner
  // circle(550, 50, 100);
}

function menu() {
  let parallaxX = -(mouseX - sw / 2 + 500) / (sw / 8);
  let parallaxY = -(mouseY - sh / 2 - 500) / (sh / 8);
  fill(COLORS.pink);
  stroke(COLORS.whitePink);
  circle(sw / 2 + parallaxX, sh / 2 + parallaxY, min((sw * 2) / 3, (sh * 2) / 3));

  strokeWeight(5);
  textFont(font);
  textSize(sw / 15);
  textAlign(CENTER, CENTER);
  fill(COLORS.darkPink);
  stroke(COLORS.clear);
  text('Neurosu!', sw / 2 + parallaxX * 3, sh / 2 + parallaxY * 3);
  fill(COLORS.pink);
  // stroke(COLORS.pink);
  text('Neurosu!', sw / 2 + parallaxX * 2, sh / 2 + parallaxY * 2);
  fill(COLORS.whitePink);
  // stroke(COLORS.whitePink);
  text('Neurosu!', sw / 2 + parallaxX, sh / 2 + parallaxY);

  textAlign(CENTER, TOP);
  fill(COLORS.whitePink);
  stroke(COLORS.darkPink);
  textSize((sw / 20) * (sin(millis() / 300) / 5 + 4) * 0.15);
  text('Click anywhere to start', sw / 2 + parallaxX, 10 + parallaxY);
  levelIndex = 0;
}

function instructions() {
  fill(COLORS.whitePink);
  stroke(COLORS.darkPink);
  strokeWeight(5);
  textFont(font);
  textSize(sw / 15);
  textAlign(CENTER, CENTER);
  text('How to play', sw / 2, sh / 10);
  textSize(sw / 40);
  textAlign(LEFT, CENTER);
  text(
    'Neurosu! is a combination of both Osu! Standard and Osu! Mania.\nPress wasd or the arrow keys or wasd to click the hitcircles in the right direction.\nPress ` to skip the map.',
    20,
    sh / 2
  );
  textAlign(CENTER, TOP);
  textSize(sw / 20);
  text('Click to continue', sw / 2, (sh * 9) / 10);
}

function switchState(newState) {
  currentState = newState;
  initState = true;
  stopAllAudio();
}

let initMap = true;
let startTime = -1;
let currentBeatmap;
let AR = 8;
let fadeIn = 800;
let visibleHitObjects = [];
let hitObjectIndex = 1;
let currentHitObject;
let nextHitObjectIndex = 0;
let preempt = 1200;
let playfieldX;
let playfieldY;
let playfieldHeight;
let playfieldWidth;
let circleSize = 50;
let approachCircleSize = circleSize * 4;
let hits = 0;
let misses = 0;
let neuroMissSprite = false;
initState = true;
let maxMisses = 8;
let missHealth = maxMisses;
let accuracy = 0;
let formattedAccuracy = '0.00%';
let levelIndex = 0;

const bufferTime = 3000;
let campaignOffsets = [-200, 0, 0];
let offsetTimes = [0, 0, 0];

//Map variables
const keyW = 87;
const keyA = 65;
const keyS = 83;
const keyD = 68;
const keyJ = 74;
const keyK = 75;
const keyL = 76;
const keySemicolon = 186;
const keyZ = 90;
const keyX = 88;
const keyEscape = 27;

function isLeft(key) {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyCode === LEFT_ARROW || keyCode === keyA
    : keyCode === keyJ || keyCode === keyA;
}

function isLeftDown() {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyIsDown(LEFT_ARROW) || keyIsDown(keyA)
    : keyIsDown(keyJ) || keyIsDown(keyA);
}

function isDown(key) {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyCode === DOWN_ARROW || keyCode === keyS
    : keyCode === keyK || keyCode === keyS;
}

function isDownDown() {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyIsDown(DOWN_ARROW) || keyIsDown(keyS)
    : keyIsDown(keyK) || keyIsDown(keyS);
}

function isUp(key) {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyCode === UP_ARROW || keyCode === keyW
    : keyCode === keyL || keyCode === keyD;
}

function isUpDown() {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyIsDown(UP_ARROW) || keyIsDown(keyW)
    : keyIsDown(keyL) || keyIsDown(keyD);
}

function isRight(key) {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyCode === RIGHT_ARROW || keyCode === keyD
    : keyCode === keySemicolon || keyCode === keyF;
}

function isRightDown() {
  return inputMode === INPUT_MODES.THREE_FINGER
    ? keyIsDown(RIGHT_ARROW) || keyIsDown(keyD)
    : keyIsDown(keySemicolon) || keyIsDown(keyF);
}

function playAudio(key, vol = 1) {
  audioElements[key][0].volume = vol;
  audioElements[key][0].pause();
  audioElements[key][0].currentTime = 0;
  audioElements[key][0].play();
}

function stopAllAudio() {
  for (const i in audioElements) {
    audioElements[i][0].pause();
  }
}

function triggerHit() {
  hits++;
  console.log('HIT');
  playAudio('hit');
  visibleHitObjects.shift();
  neuroMissSprite = false;
  if (missHealth < maxMisses) {
    missHealth++;
  }
}

function triggerMiss(silent = false) {
  misses++;
  if (!silent) {
    playAudio('miss', 0.05);
  }
  visibleHitObjects.shift();
  neuroMissSprite = true;
  if (missHealth <= 0) {
    // switchState(GAMESTATE.FAIL);
  } else {
    missHealth--;
  }
}

//To-do: implement OD. temporarily setting hit window to 80ms
const hitWindow = 160;
function keyPressed(keyCode) {
  switch (currentState) {
    case GAMESTATE.PLAY:
      console.log('playing');
      if (visibleHitObjects.length > 0) {
        console.log('hit objects greater than 0');
        if (
          Math.abs(currentTime - visibleHitObjects[0].startTime) <= hitWindow &&
          pointInCircle(
            mouseX,
            mouseY,
            ptosX(visibleHitObjects[0].position[0]),
            ptosY(visibleHitObjects[0].position[1]),
            circleSize / 2
          )
        ) {
          console.log('current direction: ' + visibleHitObjects[0].direction);
          switch (visibleHitObjects[0].direction) {
            case DIRECTION.LEFT:
              if (isLeft(keyCode)) {
                console.log('LEFT PRESSED');
                triggerHit();
              } else {
                console.log('Miss:' + visibleHitObjects[0].direction);
                triggerMiss();
              }
              break;
            case DIRECTION.DOWN:
              if (isDown(keyCode)) {
                console.log('DOWN PRESSED');
                triggerHit();
              } else {
                console.log('Miss:' + visibleHitObjects[0].direction);
                triggerMiss();
              }
              break;
            case DIRECTION.UP:
              if (isUp(keyCode)) {
                console.log('UP PRESSED');
                triggerHit();
              } else {
                console.log('Miss:' + visibleHitObjects[0].direction);
                triggerMiss();
              }
              break;
            case DIRECTION.RIGHT:
              if (isRight(keyCode)) {
                console.log('RIGHT PRESSED');
                triggerHit();
              } else {
                console.log('Miss:' + visibleHitObjects[0].direction);
                triggerMiss();
              }
              break;
          }
        } else if (
          visibleHitObjects[0].startTime - currentTime > hitWindow &&
          pointInCircle(
            mouseX,
            mouseY,
            ptosX(visibleHitObjects[0].position[0]),
            ptosY(visibleHitObjects[0].position[1]),
            circleSize / 2
          )
        ) {
          //Too early
          triggerMiss();
        }
      }
      if (key === '`') {
        switchState(GAMESTATE.RESULTS);
      } else {
        console.log(keyCode);
      }
  }
}

function keyReleased(key) {}

function pointInCircle(x, y, circleX, circleY, radius) {
  return Math.sqrt(Math.pow(x - circleX, 2) + Math.pow(y - circleY, 2)) <= radius;
}

function play() {
  if (initState) {
    console.log('INIT STATE');
    currentBeatmap = campaignBeatmaps[levelIndex];
    console.log('beatmap hit object:', JSON.stringify(currentBeatmap.hitObjects[0]));
    initMap = true;
    initState = false;
  }

  if (initMap) {
    currentHitObject = currentBeatmap.hitObjects[0];
    // AR = currentBeatmap.difficulty.AR;
    startTime = millis() + bufferTime + offsetTimes[levelIndex];
    console.log('Start time set: ' + startTime);
    switch (AR) {
      case AR < 5:
        preempt = 1200 + (600 * (5 - AR)) / 5;
        fadeIn = 800 + (400 * (5 - AR)) / 5;
        break;
      case AR === 5:
        preempt = 1200;
        fadeIn = 800;
        break;
      case AR >= 5:
        preempt = 1200 - (750 * (AR - 5)) / 5;
        fadeIn = 800 - (500 * (AR - 5)) / 5;
        break;
    }
    initMap = false;
    missHealth = maxMisses;
    hits = 0;
    misses = 0;
    visibleHitObjects = [];
    setTimeout(function () {
      audioElements['song' + (levelIndex + 1)][0].play();
    }, bufferTime + campaignOffsets[levelIndex]);
  }

  currentTime = millis() - startTime;

  //Calculate judgements first

  // console.log('current hit object:', JSON.stringify(currentHitObject));

  //OSU Playfield
  stroke(COLORS.whitePink);
  strokeWeight(2);
  fill(COLORS.clear);
  playfieldWidth = Math.min(sw * 0.6 - PADDING * 2, ((sh - PADDING * 2) * 4) / 3);
  playfieldHeight = Math.min((playfieldWidth * 3) / 4, sh - PADDING * 2);
  playfieldX = PADDING;
  playfieldY = sh / 2 - (playfieldWidth * 3) / 4 / 2;
  rect(playfieldX, playfieldY, playfieldWidth, playfieldHeight);

  //Draw health bar
  stroke(COLORS.darkPink);
  strokeWeight(3);
  fill(COLORS.clear);
  let healthbarWidth = playfieldWidth / 2;
  let healthbarHeight = playfieldHeight / 20;
  let healthbarX = playfieldX + 20;
  let healthbarY = playfieldY + healthbarHeight / 2;
  rect(healthbarX, healthbarY, healthbarWidth, healthbarHeight, 90);
  strokeWeight(0);
  fill(COLORS.peach);
  if (millis() < startTime) {
    console.log(millis() - startTime);
    // console.log('healthbarwidth multiply', (startTime - millis()) * healthbarWidth);
    rect(healthbarX, healthbarY, healthbarWidth * (1 - (startTime - millis()) / bufferTime), healthbarHeight, 90);
  } else {
    rect(healthbarX, healthbarY, healthbarWidth * (missHealth / maxMisses), healthbarHeight, 90);
  }

  //UI in corner
  //misses
  fill(COLORS.whitePink);
  stroke(COLORS.darkPink);
  strokeWeight(5);
  textSize(sw / 50);
  textAlign(RIGHT, TOP);
  accuracy = (hits / (hits + misses)) * 100;
  formattedAccuracy = accuracy.toFixed(2) + '%';
  text(misses + 'miss ' + (hits + misses > 0 ? accuracy.toFixed(2) : '100.00') + '%', playfieldWidth, playfieldY);

  //DDR Side

  stroke(COLORS.whitePink);
  strokeWeight(2);
  fill(COLORS.clear);
  let ddrWidth = sw - playfieldWidth - PADDING * 4;
  let ddrHeight = playfieldHeight;
  let ddrX = playfieldWidth + PADDING * 3;
  let ddrY = playfieldY;
  rect(ddrX, ddrY, ddrWidth, ddrHeight);

  //Draw arrows

  noSmooth();
  imageMode(CENTER);
  tint(255, 255);
  let arrowSpacing = ddrWidth / 5;
  let arrowSize = ddrWidth / 6;
  const topSpacing = 50;
  const pressOffset = 5;
  image(
    leftArrowOutline,
    ddrX + ddrWidth / 2 - (arrowSpacing * 3) / 2,
    ddrY + topSpacing + (isLeftDown() ? pressOffset : 0),
    arrowSize,
    arrowSize
  );
  image(
    downArrowOutline,
    ddrX + ddrWidth / 2 - (arrowSpacing * 1) / 2,
    ddrY + topSpacing + (isDownDown() ? pressOffset : 0),
    arrowSize,
    arrowSize
  );
  image(
    upArrowOutline,
    ddrX + ddrWidth / 2 + (arrowSpacing * 1) / 2,
    ddrY + topSpacing + (isUpDown() ? pressOffset : 0),
    arrowSize,
    arrowSize
  );
  image(
    rightArrowOutline,
    ddrX + ddrWidth / 2 + (arrowSpacing * 3) / 2,
    ddrY + topSpacing + (isRightDown() ? pressOffset : 0),
    arrowSize,
    arrowSize
  );

  //DDR Board
  let ddrImage = isDownDown() ? ddrDown : isUpDown() ? ddrUp : isLeftDown() ? ddrLeft : isRightDown() ? ddrRight : ddr;
  imageMode(CENTER);

  image(ddrImage, ddrX + ddrWidth / 2, ddrHeight - arrowSpacing / 2, ddrWidth, ddrWidth / 2);
  let neuroSize = ddrWidth / 2 - arrowSpacing;
  let neuroX = isLeftDown()
    ? ddrX + ddrWidth / 2 - (arrowSpacing * 3) / 2
    : isRightDown()
    ? ddrX + ddrWidth / 2 + (arrowSpacing * 3) / 2
    : ddrX + ddrWidth / 2;
  let neuroY = isDownDown()
    ? ddrHeight - arrowSpacing / 2 + ddrWidth / 12 - neuroSize / 2
    : isUpDown()
    ? ddrHeight - arrowSpacing / 2 - ddrWidth / 12 - neuroSize / 2
    : ddrHeight - arrowSpacing / 2 - neuroSize / 2;
  image(neuroMissSprite ? neuroMiss : neuro, neuroX, neuroY, neuroSize, neuroSize);

  //Draw hit circles
  //3000 is arbitrary number for AR
  // console.log("millis diff: " + (millis() - startTime));
  // console.log("millis:" + millis());
  // console.log("startTime:" + startTime);
  // console.log("currentHitObject.startTime" + currentHitObject.startTime);

  if (hitObjectIndex < currentBeatmap.hitObjects.length && currentTime >= currentHitObject.startTime - preempt) {
    //Add current hit object to visible hit objects
    //Only add hit object to visible hit objects if it is not already in the list
    if (!visibleHitObjects.includes(currentHitObject)) {
      visibleHitObjects.push(currentHitObject);
    }

    hitObjectIndex++;
    currentHitObject = currentBeatmap.hitObjects[hitObjectIndex];

    //Show current hit object
  }
  // Trigger miss
  if (visibleHitObjects.length > 0 && currentTime >= visibleHitObjects[0].startTime + hitWindow) {
    //Remove current hit object from visible hit objects
    // console.log("Current hit object start time: " + currentHitObject.startTime);
    triggerMiss(true);
  }

  //Draw each visible hit objects
  for (let i = 0; i < visibleHitObjects.length; i++) {
    pinkAlpha = color(COLORS.pink);
    // console.log('currenttime:' + currentTime);
    // console.log('visible' + visibleHitObjects[i].startTime);

    let alphaValue =
      currentTime >= visibleHitObjects[i].startTime
        ? (1 - (currentTime - visibleHitObjects[i].startTime) / hitWindow) * 255
        : min(255, 255 * (1 - (visibleHitObjects[i].startTime - currentTime) / fadeIn));
    pinkAlpha.setAlpha(alphaValue);

    fill(COLORS.clear);
    stroke(pinkAlpha);

    //add a small window where approach circle is missing be hit before it disappears by making it dissapear when the circle is "smaller" than the width
    approachCircleSize = max(
      ptosW(150 * ((visibleHitObjects[i].startTime - currentTime) / preempt) + 50),
      ptosW(circleSize)
    );

    //Draw approach circle (to-do: implement AR properly)
    // console.log("Approach circle size: " + approachCircleSize);
    // console.log(
    //   "Approach circle position",
    //   visibleHitObjects[i].position[0],
    //   visibleHitObjects[i].position[1]
    // );
    circle(ptosX(visibleHitObjects[i].position[0]), ptosY(visibleHitObjects[i].position[1]), approachCircleSize);

    fill(pinkAlpha);
    stroke(COLORS.clear);

    // console.log(visibleHitObjects[i].position);
    // console.log(visibleHitObjects[i].position.y);
    circle(ptosX(visibleHitObjects[i].position[0]), ptosY(visibleHitObjects[i].position[1]), ptosW(circleSize));

    //Draw arrows

    imageMode(CENTER);
    noSmooth();
    tint(255, alphaValue);
    let arrowOffset = topSpacing + (((visibleHitObjects[i].startTime - currentTime) / preempt) * ddrHeight * 2) / 3;
    switch (visibleHitObjects[i].direction) {
      case DIRECTION.LEFT:
        image(
          leftArrow,
          ptosX(visibleHitObjects[i].position[0]),
          ptosY(visibleHitObjects[i].position[1]),
          ptosW(circleSize / 2),
          ptosW(circleSize / 2)
        );
        // tint(255, 255);
        image(leftArrow, ddrX + ddrWidth / 2 - (arrowSpacing * 3) / 2, ddrY + arrowOffset, arrowSize, arrowSize);
        break;
      case DIRECTION.UP:
        image(
          upArrow,
          ptosX(visibleHitObjects[i].position[0]),
          ptosY(visibleHitObjects[i].position[1]),
          ptosW(circleSize / 2),
          ptosW(circleSize / 2)
        );
        // tint(255, 255);
        image(upArrow, ddrX + ddrWidth / 2 + (arrowSpacing * 1) / 2, ddrY + arrowOffset, arrowSize, arrowSize);
        break;
      case DIRECTION.RIGHT:
        image(
          rightArrow,
          ptosX(visibleHitObjects[i].position[0]),
          ptosY(visibleHitObjects[i].position[1]),
          ptosW(circleSize / 2),
          ptosW(circleSize / 2)
        );
        // tint(255, 255);
        image(rightArrow, ddrX + ddrWidth / 2 + (arrowSpacing * 3) / 2, ddrY + arrowOffset, arrowSize, arrowSize);
        break;
      case DIRECTION.DOWN:
        image(
          downArrow,
          ptosX(visibleHitObjects[i].position[0]),
          ptosY(visibleHitObjects[i].position[1]),
          ptosW(circleSize / 2),
          ptosW(circleSize / 2)
        );
        // tint(255, 255);
        image(downArrow, ddrX + ddrWidth / 2 - (arrowSpacing * 1) / 2, ddrY + arrowOffset, arrowSize, arrowSize);
        break;
      default:
        throw new Error('Invalid direction: ' + visibleHitObjects[i].direction);
    }
  }
  //Show results if beatmap is done
  if (visibleHitObjects.length === 0 && hitObjectIndex >= currentBeatmap.hitObjects.length) {
    switchState(GAMESTATE.RESULTS);
  }
}

function results() {
  fill(COLORS.whitePink);
  stroke(COLORS.darkPink);
  strokeWeight(5);
  textFont(font);
  textSize(sw / 15);
  textAlign(CENTER, CENTER);
  text('Results', sw / 2, sh / 10);
  textAlign(LEFT, CENTER);
  text('Accuracy: ' + formattedAccuracy + '\nHits: ' + hits + '\nMisses:' + misses, sw / 2, sh / 2);
  textAlign(CENTER, TOP);
  textSize(sw / 20);
  text('Click to go to the next map', sw / 2, (sh * 9) / 10);
}

function endgame() {
  textAlign(CENTER, CENTER);
  text('Thanks for playing!', sw / 2, sh / 10);
  text('All the credits are in credits.txt', sw / 2, sh / 2);
  text('Click to go back to the main menu', sw / 2, (sh * 9) / 10);
}

//Playfield to screen functions
function ptosX(x) {
  return (x * playfieldWidth) / GW + playfieldX;
}

function ptosY(y) {
  return (y * playfieldHeight) / GH + playfieldY;
}

function ptosW(w) {
  return (w * playfieldWidth) / GW;
}

function ptosH(h) {
  return (h * playfieldHeight) / GH;
}

//Screen to playfield functions
function stopX(x) {
  return ((x - playfieldX) * GW) / playfieldWidth;
}

function stopY(y) {
  return ((y - playfieldY) * GH) / playfieldHeight;
}

function stopW(w) {
  return (w * GW) / playfieldWidth;
}

function stopH(h) {
  return (h * GH) / playfieldHeight;
}

function fail() {}

function windowResized() {
  sw = document.documentElement.clientWidth;
  sh = document.documentElement.clientHeight;
  resizeCanvas(sw, sh);
  // draw();
}

// $(function () {
//   $(document).click(function (event) {

//     // console.log("X: " + event.pageX + " Y: " + event.pageY);
//   });
// });

// $(function () {
//  $(document).resize(function () {
//      sw = document.documentElement.clientWidth;
//      sh = document.documentElement.clientHeight;
//      resizeCanvas(sw, sh);
//  });
// });
