const gameWorld = document.getElementById("game-world");
const platformsLayer = document.getElementById("platforms");
const coinsLayer = document.getElementById("coins-layer");
const enemiesLayer = document.getElementById("enemies-layer");
const playerEl = document.getElementById("player");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const coinsEl = document.getElementById("coins");
const restartButton = document.getElementById("restartButton");
const catMarioButton = document.getElementById("catMarioButton");
const resetCatMarioButton = document.getElementById("resetCatMarioButton");
const level2Button = document.getElementById("level2Button");
const backLevel1Button = document.getElementById("backLevel1Button");
const pauseButton = document.getElementById("pauseButton");
const hintButton = document.getElementById("hintButton");
const goalEl = document.getElementById("goal");

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 520;
const GRAVITY = 0.92;
const PLAYER_SPEED = 4.6;
const JUMP_FORCE = -16;
const PLAYER_WIDTH = 54;
const PLAYER_HEIGHT = 54;

const keys = {
    left: false,
    right: false,
    jump: false
};

const levels = {
    1: {
        id: 1,
        name: "Level 1",
        goalX: 2870,
        platforms: [
            { x: 0, y: 440, width: 3000, height: 80, type: "ground" },
            { x: 260, y: 360, width: 140, height: 24, type: "brick" },
            { x: 500, y: 310, width: 160, height: 24, type: "brick" },
            { x: 760, y: 270, width: 150, height: 24, type: "brick" },
            { x: 1040, y: 332, width: 220, height: 24, type: "brick" },
            { x: 1360, y: 285, width: 160, height: 24, type: "brick" },
            { x: 1600, y: 240, width: 150, height: 24, type: "brick" },
            { x: 1850, y: 300, width: 180, height: 24, type: "brick" },
            { x: 2120, y: 350, width: 170, height: 24, type: "brick" },
            { x: 2380, y: 300, width: 190, height: 24, type: "brick" },
            { x: 2650, y: 250, width: 140, height: 24, type: "brick" }
        ],
        coins: [
            { x: 300, y: 320 },
            { x: 560, y: 270 },
            { x: 820, y: 230 },
            { x: 1130, y: 292 },
            { x: 1420, y: 245 },
            { x: 1670, y: 200 },
            { x: 2190, y: 310 },
            { x: 2430, y: 260 }
        ],
        enemies: [
            { x: 640, y: 406, minX: 520, maxX: 760, speed: 1.3 },
            { x: 1260, y: 298, minX: 1060, maxX: 1410, speed: 1.25 },
            { x: 2050, y: 406, minX: 1910, maxX: 2180, speed: 1.35 },
            { x: 2520, y: 256, minX: 2395, maxX: 2660, speed: 1.2 }
        ]
    },
    2: {
        id: 2,
        name: "Level 2",
        goalX: 2900,
        platforms: [
            { x: 0, y: 440, width: 3000, height: 80, type: "ground" },
            { x: 220, y: 380, width: 130, height: 24, type: "brick" },
            { x: 460, y: 330, width: 130, height: 24, type: "brick" },
            { x: 690, y: 280, width: 140, height: 24, type: "brick" },
            { x: 930, y: 235, width: 130, height: 24, type: "brick" },
            { x: 1180, y: 285, width: 160, height: 24, type: "brick" },
            { x: 1450, y: 340, width: 150, height: 24, type: "brick" },
            { x: 1710, y: 300, width: 170, height: 24, type: "brick" },
            { x: 1980, y: 260, width: 150, height: 24, type: "brick" },
            { x: 2220, y: 220, width: 140, height: 24, type: "brick" },
            { x: 2480, y: 300, width: 190, height: 24, type: "brick" },
            { x: 2740, y: 260, width: 150, height: 24, type: "brick" }
        ],
        coins: [
            { x: 260, y: 340 },
            { x: 500, y: 290 },
            { x: 740, y: 240 },
            { x: 980, y: 195 },
            { x: 1260, y: 245 },
            { x: 1760, y: 260 },
            { x: 2260, y: 180 },
            { x: 2785, y: 220 }
        ],
        enemies: [
            { x: 620, y: 406, minX: 520, maxX: 760, speed: 1.45 },
            { x: 1290, y: 251, minX: 1190, maxX: 1340, speed: 1.5 },
            { x: 2050, y: 226, minX: 1990, maxX: 2130, speed: 1.4 },
            { x: 2520, y: 256, minX: 2490, maxX: 2660, speed: 1.5 }
        ]
    }
};

const state = {
    player: {
        x: 40,
        y: 300,
        vx: 0,
        vy: 0,
        onGround: false,
        invincibleTimer: 0,
        facing: "right"
    },
    coins: [],
    enemies: [],
    score: 0,
    lives: 3,
    collectedCoins: 0,
    level1Completed: false,
    currentLevelId: 1,
    useCatMario: false,
    paused: false,
    gameOver: false,
    won: false
};

function getCurrentLevel() {
    return levels[state.currentLevelId];
}

function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function getPlayerRect() {
    return {
        x: state.player.x,
        y: state.player.y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT
    };
}

function getGoalRect() {
    const currentLevel = getCurrentLevel();
    return {
        x: parseFloat(goalEl.style.left) || currentLevel.goalX,
        y: 80,
        width: 36,
        height: 230
    };
}

function isHorizontalMovementKey(code) {
    return code === "ArrowLeft" || code === "KeyA" || code === "ArrowRight" || code === "KeyD";
}

function isJumpKey(code) {
    return code === "ArrowUp" || code === "KeyW" || code === "Space";
}

function applyHorizontalInput(player) {
    player.vx = 0;
    if (keys.left) {
        player.vx = -PLAYER_SPEED;
        player.facing = "left";
    }
    if (keys.right) {
        player.vx = PLAYER_SPEED;
        player.facing = "right";
    }
}

function applyJumpInput(player) {
    if (keys.jump && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
    }
}

function updatePlayerInvincibility() {
    if (state.player.invincibleTimer <= 0) {
        return;
    }

    state.player.invincibleTimer -= 1;
    if (state.player.invincibleTimer === 0) {
        playerEl.classList.remove("hurt");
    }
}

function isPlayerWalking() {
    return Math.abs(state.player.vx) > 0.1 && state.player.onGround;
}

function setPlayerSprite() {
    if (state.useCatMario) {
        playerEl.src = "MarioCat.png";
        return;
    }

    playerEl.src = isPlayerWalking() ? "MarioWalk.png" : "Mario.png";
}

function setButtonEnabled(buttonEl, enabled) {
    buttonEl.disabled = !enabled;
}

function setButtonText(buttonEl, text) {
    buttonEl.textContent = text;
}

function setButtonActiveState(buttonEl, isActive) {
    buttonEl.classList.toggle("ui-active", isActive);
}

function updateCatMarioInterface() {
    setButtonEnabled(catMarioButton, !state.useCatMario);
    setButtonEnabled(resetCatMarioButton, state.useCatMario);
    setButtonActiveState(catMarioButton, state.useCatMario);
    setButtonActiveState(resetCatMarioButton, !state.useCatMario);
    setButtonText(catMarioButton, state.useCatMario ? "Cat Mario ON" : "Cat Mario");
}

function updateLevelInterface() {
    const isOnLevelTwo = state.currentLevelId === 2;
    setButtonEnabled(level2Button, state.level1Completed && !isOnLevelTwo);
    level2Button.title = state.level1Completed ? "Play Level 2" : "Finish Level 1 first";
    backLevel1Button.hidden = !isOnLevelTwo;
}

function updatePauseInterface() {
    setButtonText(pauseButton, state.paused ? "Resume" : "Pause");
    setButtonActiveState(pauseButton, state.paused);
}

function pulseHudElement(element) {
    element.classList.remove("hud-pulse");
    void element.offsetWidth;
    element.classList.add("hud-pulse");
}

function pulseScoreHud() {
    pulseHudElement(scoreEl.parentElement);
}

function pulseLivesHud() {
    pulseHudElement(livesEl.parentElement);
}

function bindInterfaceEvents() {
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    restartButton.addEventListener("click", initLevel);
    catMarioButton.addEventListener("click", activateCatMario);
    resetCatMarioButton.addEventListener("click", resetCatMario);
    level2Button.addEventListener("click", startLevelTwo);
    backLevel1Button.addEventListener("click", backToLevelOne);
    pauseButton.addEventListener("click", togglePause);
    hintButton.addEventListener("click", showHint);
}

function togglePause() {
    if (state.gameOver || state.won) {
        return;
    }

    state.paused = !state.paused;
    updatePauseInterface();
    setMessage(state.paused ? "Game paused." : "Game resumed.");
}

function showHint() {
    const currentLevel = getCurrentLevel();
    const remainingCoins = currentLevel.coins.length - state.collectedCoins;
    const distanceToGoal = Math.max(0, Math.round(currentLevel.goalX - state.player.x));

    setMessage(`Hint: ${remainingCoins} coin(s) left. Goal is about ${distanceToGoal}px ahead.`);
}

function startLevelTwo() {
    if (!state.level1Completed) {
        setMessage("Finish Level 1 first to unlock Level 2.");
        return;
    }

    state.currentLevelId = 2;
    initLevel();
    setMessage("Level 2 loaded. Collect all coins and reach the flag!");
}

function backToLevelOne() {
    state.currentLevelId = 1;
    initLevel();
    setMessage("Back to Level 1.");
}

function activateCatMario() {
    state.useCatMario = true;
    setPlayerSprite();
    setMessage("Cat Mario activated!");
    updateCatMarioInterface();
}

function resetCatMario() {
    state.useCatMario = false;
    setPlayerSprite();
    setMessage("Cat Mario reset.");
    updateCatMarioInterface();
}

function resetPlayerPosition() {
    state.player.x = 40;
    state.player.y = 300;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
}

function updateHud() {
    scoreEl.textContent = String(state.score);
    livesEl.textContent = String(state.lives);
    coinsEl.textContent = String(state.collectedCoins);
}

function setMessage(text) {
    messageEl.textContent = text;
}

function createPlatformElements() {
    const currentLevel = getCurrentLevel();
    platformsLayer.innerHTML = "";
    currentLevel.platforms.forEach((platform) => {
        const el = document.createElement("div");
        el.className = `platform ${platform.type === "ground" ? "ground" : ""}`;
        el.style.left = `${platform.x}px`;
        el.style.top = `${platform.y}px`;
        el.style.width = `${platform.width}px`;
        el.style.height = `${platform.height}px`;
        platformsLayer.appendChild(el);
    });
}

function createCoinElements() {
    const currentLevel = getCurrentLevel();
    coinsLayer.innerHTML = "";
    state.coins = currentLevel.coins.map((coin, index) => {
        const el = document.createElement("div");
        el.className = "coin";
        el.style.left = `${coin.x}px`;
        el.style.top = `${coin.y}px`;
        el.dataset.index = String(index);
        coinsLayer.appendChild(el);

        return {
            x: coin.x,
            y: coin.y,
            width: 26,
            height: 26,
            collected: false,
            el
        };
    });
}

function createEnemyElements() {
    const currentLevel = getCurrentLevel();
    enemiesLayer.innerHTML = "";
    state.enemies = currentLevel.enemies.map((enemy, index) => {
        const el = document.createElement("div");
        el.className = "enemy";
        el.dataset.index = String(index);
        enemiesLayer.appendChild(el);

        return {
            x: enemy.x,
            y: enemy.y,
            width: 44,
            height: 34,
            minX: enemy.minX,
            maxX: enemy.maxX,
            speed: enemy.speed,
            dir: Math.random() > 0.5 ? 1 : -1,
            defeated: false,
            el
        };
    });
}

function initLevel() {
    const currentLevel = getCurrentLevel();
    createPlatformElements();
    createCoinElements();
    createEnemyElements();
    resetPlayerPosition();
    state.score = 0;
    state.lives = 3;
    state.collectedCoins = 0;
    state.paused = false;
    state.gameOver = false;
    state.won = false;
    updateHud();
    setMessage("Use Arrow Keys or A/D to move, Space/W/ArrowUp to jump.");
    gameWorld.style.transform = "translateX(0px)";
    goalEl.style.left = `${currentLevel.goalX}px`;
    playerEl.classList.remove("hurt");
    updateCatMarioInterface();
    updateLevelInterface();
    updatePauseInterface();
}

function handlePlayerPhysics() {
    const currentLevel = getCurrentLevel();
    const player = state.player;

    applyHorizontalInput(player);
    applyJumpInput(player);

    player.vy += GRAVITY;

    player.x += player.vx;
    player.x = clamp(player.x, 0, WORLD_WIDTH - PLAYER_WIDTH);

    player.y += player.vy;
    player.onGround = false;

    const playerRect = getPlayerRect();

    currentLevel.platforms.forEach((platform) => {
        const platformRect = {
            x: platform.x,
            y: platform.y,
            width: platform.width,
            height: platform.height
        };

        if (!intersects(playerRect, platformRect)) {
            return;
        }

        const prevBottom = player.y + PLAYER_HEIGHT - player.vy;
        const prevTop = player.y - player.vy;

        if (prevBottom <= platform.y + 3 && player.vy >= 0) {
            player.y = platform.y - PLAYER_HEIGHT;
            player.vy = 0;
            player.onGround = true;
            playerRect.y = player.y;
            return;
        }

        if (prevTop >= platform.y + platform.height - 3 && player.vy < 0) {
            player.y = platform.y + platform.height;
            player.vy = 0;
            playerRect.y = player.y;
            return;
        }

        if (player.x + PLAYER_WIDTH / 2 < platform.x + platform.width / 2) {
            player.x = platform.x - PLAYER_WIDTH;
        } else {
            player.x = platform.x + platform.width;
        }
        playerRect.x = player.x;
    });

    if (player.y > WORLD_HEIGHT + 60) {
        loseLife("You fell! Try again.");
    }
}

function updateEnemies() {
    state.enemies.forEach((enemy) => {
        if (enemy.defeated) {
            return;
        }

        enemy.x += enemy.speed * enemy.dir;
        if (enemy.x < enemy.minX || enemy.x + enemy.width > enemy.maxX) {
            enemy.dir *= -1;
            enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.width));
        }

        enemy.el.style.left = `${enemy.x}px`;
        enemy.el.style.top = `${enemy.y}px`;
    });
}

function collectCoins() {
    const currentLevel = getCurrentLevel();
    const playerRect = getPlayerRect();

    state.coins.forEach((coin) => {
        if (coin.collected) {
            return;
        }

        if (intersects(playerRect, coin)) {
            coin.collected = true;
            coin.el.style.display = "none";
            state.score += 100;
            state.collectedCoins += 1;
            updateHud();
            pulseScoreHud();

            if (state.collectedCoins === currentLevel.coins.length) {
                setMessage("All coins collected! Reach the flag to win.");
            }
        }
    });
}

function enemyCollisions() {
    if (state.player.invincibleTimer > 0) {
        return;
    }

    const playerRect = getPlayerRect();

    for (const enemy of state.enemies) {
        if (enemy.defeated) {
            continue;
        }

        const hit = intersects(playerRect, enemy);
        if (!hit) {
            continue;
        }

        const isStomp = state.player.vy > 0 && state.player.y + PLAYER_HEIGHT - enemy.y < 14;

        if (isStomp) {
            state.score += 250;
            state.player.vy = -10;
            enemy.defeated = true;
            enemy.el.style.display = "none";
            updateHud();
            pulseScoreHud();
            continue;
        }

        loseLife("Ouch! Enemy hit.");
        break;
    }
}

function loseLife(text) {
    if (state.gameOver || state.won) {
        return;
    }

    state.lives -= 1;
    updateHud();
    pulseLivesHud();
    setMessage(text);

    if (state.lives <= 0) {
        state.gameOver = true;
        setMessage("Game Over. Press Restart to play again.");
        return;
    }

    state.player.invincibleTimer = 80;
    playerEl.classList.add("hurt");
    resetPlayerPosition();
}

function updateGoalCheck() {
    const currentLevel = getCurrentLevel();
    if (state.gameOver || state.won) {
        return;
    }

    const goalRect = getGoalRect();
    const playerRect = getPlayerRect();

    if (intersects(playerRect, goalRect)) {
        if (state.collectedCoins === currentLevel.coins.length) {
            state.won = true;
            state.score += 1000;
            if (state.currentLevelId === 1) {
                state.level1Completed = true;
            }
            updateHud();
            pulseScoreHud();
            updateLevelInterface();
            setMessage("You Win! Press Restart to play again.");
        } else {
            setMessage("Collect all coins before finishing!");
        }
    }
}

function updateCameraAndPlayerDraw() {
    const viewportWidth = gameWorld.parentElement.clientWidth;
    const targetX = state.player.x - viewportWidth * 0.35;
    const maxScroll = WORLD_WIDTH - viewportWidth;
    const cameraX = clamp(targetX, 0, maxScroll);
    gameWorld.style.transform = `translateX(${-cameraX}px)`;

    setPlayerSprite();

    playerEl.style.left = `${state.player.x}px`;
    playerEl.style.top = `${state.player.y}px`;
    playerEl.style.transform = state.player.facing === "left" ? "scaleX(-1)" : "scaleX(1)";
}

function frame() {
    if (!state.gameOver && !state.won && !state.paused) {
        handlePlayerPhysics();
        updateEnemies();
        collectCoins();
        enemyCollisions();
        updateGoalCheck();

        updatePlayerInvincibility();
    }

    updateCameraAndPlayerDraw();
    requestAnimationFrame(frame);
}

function keyDown(event) {
    if (isHorizontalMovementKey(event.code)) {
        if (event.code === "ArrowLeft" || event.code === "KeyA") {
            keys.left = true;
        }
        if (event.code === "ArrowRight" || event.code === "KeyD") {
            keys.right = true;
        }
    }
    if (isJumpKey(event.code)) {
        keys.jump = true;
    }
}

function keyUp(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        keys.left = false;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
        keys.right = false;
    }
    if (isJumpKey(event.code)) {
        keys.jump = false;
    }
}

bindInterfaceEvents();
initLevel();
requestAnimationFrame(frame);
