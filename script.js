window.onload = function () {
  // Get DOM elements
  const menuDiv = document.getElementById("menuDiv");
  const gameDiv = document.getElementById("gameDiv");
  const helpDiv = document.getElementById("helpDiv");
  const shopDiv = document.getElementById("shopDiv");
  const eventShopDiv = document.getElementById("eventShopDiv"); // NEW Event Shop screen

  const startButton = document.getElementById("startButton");
  const helpButton = document.getElementById("helpButton");
  const shopButton = document.getElementById("shopButton");
  const eventShopButton = document.getElementById("eventShopButton"); // NEW Event Shop button
  const backFromHelpButton = document.getElementById("backFromHelpButton");
  const backFromShopButton = document.getElementById("backFromShopButton");
  const backFromEventShopButton = document.getElementById("backFromEventShopButton"); // NEW Back button for event shop
  const backToMenuButton = document.getElementById("backToMenuButton");
  const launchButton = document.getElementById("launchButton");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // Make the canvas fill the window.
  let groundY = 0; // Will be set by resizeCanvas
  const ballRadius = 28,
        coinRadius = 17, // Coins are drawn as white circles
        gravity = 1000; // pixels per second²
  let coinImage = new Image();
  coinImage.src = "ball.png";
  let groundTexture = new Image();
  groundTexture.src = "ground_texture.jpeg"; // use your file name
  let groundPattern = null;
  // When the image is loaded, create the pattern.
  groundTexture.onload = function () {
    groundPattern = ctx.createPattern(groundTexture, "repeat");
  };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - 50; // Ground starts 50 pixels from the bottom
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Game state variables
  let currentState = "menu"; // "menu", "game", "help", "shop", "eventShop"
  let ball, coins, score, lastTime = 0, gameRunning = false;
  let highScore = parseFloat(localStorage.getItem("highScoreFootballz")) || 0;
  let coinCount = parseInt(localStorage.getItem("coinsFootballz")) || 0;
  let gameStartTime = 0; // Will hold the timestamp when the game starts

  let velocityUpgrade = parseInt(localStorage.getItem("velocityUpgradeFootballz")) || 0;
  let bounceUpgrade = parseInt(localStorage.getItem("bounceUpgradeFootballz")) || 0;
  let purchasedEventSkins = JSON.parse(localStorage.getItem("purchasedEventSkins")) || {};

  const skinOptions = {
    default: { name: "Default", color: "grey", cost: 0 },
    mumbaiCity: { name: "Mumbai City FC", cost: 75, image: "mumbai.png" },
    monaco: { name: "AS Monaco", cost: 75, image: "monaco.png" },
    marseille: { name: "Marseille", cost: 80, image: "marseille.png" },
    dortmund: { name: "Dortmund", cost: 85, image: "dortmund.png" },
    leverkusen: { name: "Bayer Leverkusen", cost: 85, image: "leverkusen.png" },
    atletico: { name: "Atletico Madrid", cost: 95, image: "atletico.png" },
    psg: { name: "Paris SG", cost: 100, image: "psg.png" },
    bayernMunich: { name: "Bayern Munich", cost: 100, image: "bayern.png" },
    realMadrid: { name: "Real Madrid", cost: 100, image: "real_madrid.png" },
    fcBarcelona: { name: "Barcelona", cost: 125, image: "barca.png" }
  };

  // Event skins – these will have the same layout as normal skins.
  // "Release Day Blue" is enabled and will function as a normal skin.
  const eventSkinOptions = {
    rare: { name: "Release Day Blue", color: "light blue", cost: 15, enabled: true },
    soon: { name: "coming soon", color: "black", cost: 99999, enabled: false }
    // Add more event skins as needed.
  };
  
  // Retrieve purchased skins or default if none
  let purchasedSkins = JSON.parse(localStorage.getItem("skinsFootballz")) || { default: true };
  let selectedSkinId = localStorage.getItem("selectedSkinFootballz") || "default";
  let selectedSkin = skinOptions[selectedSkinId];

  // Cache for loaded skin images so they're only loaded once
  let skinImageCache = {};

  // Local storage update helpers
  function updateCoinStorage() {
    localStorage.setItem("coinsFootballz", coinCount);
  }
  function updateHighScoreStorage() {
    localStorage.setItem("highScoreFootballz", highScore);
  }
  function updateSkinsStorage() {
    localStorage.setItem("skinsFootballz", JSON.stringify(purchasedSkins));
  }
  function updateUpgradesStorage() {
    localStorage.setItem("velocityUpgradeFootballz", velocityUpgrade);
    localStorage.setItem("bounceUpgradeFootballz", bounceUpgrade);
  }

  // --- Screen management functions ---
  function showMenu() {
    currentState = "menu";
    menuDiv.style.display = "flex";
    gameDiv.style.display = "none";
    helpDiv.style.display = "none";
    shopDiv.style.display = "none";
    eventShopDiv.style.display = "none";
  }
  function showGame() {
    currentState = "game";
    menuDiv.style.display = "none";
    gameDiv.style.display = "block";
    helpDiv.style.display = "none";
    shopDiv.style.display = "none";
    eventShopDiv.style.display = "none";
    startGame();
  }
  function showHelp() {
    currentState = "help";
    menuDiv.style.display = "none";
    gameDiv.style.display = "none";
    helpDiv.style.display = "flex";
    shopDiv.style.display = "none";
    eventShopDiv.style.display = "none";
  }
  function showShop() {
    currentState = "shop";
    menuDiv.style.display = "none";
    gameDiv.style.display = "none";
    helpDiv.style.display = "none";
    shopDiv.style.display = "flex";
    eventShopDiv.style.display = "none";
    populateShop();
  }
  function showEventShop() {
    currentState = "eventShop";
    menuDiv.style.display = "none";
    gameDiv.style.display = "none";
    helpDiv.style.display = "none";
    shopDiv.style.display = "none";
    eventShopDiv.style.display = "flex";
    populateEventShop();
  }
  
  // Navigation event listeners.
  startButton.addEventListener("click", showGame);
  helpButton.addEventListener("click", showHelp);
  shopButton.addEventListener("click", showShop);
  eventShopButton.addEventListener("click", showEventShop);
  backFromHelpButton.addEventListener("click", showMenu);
  backFromShopButton.addEventListener("click", showMenu);
  backFromEventShopButton.addEventListener("click", showMenu);
  backToMenuButton.addEventListener("click", () => {
    gameRunning = false;
    showMenu();
  });
  
  // --- Game logic functions ---
  function startGame() {
    score = 0;
    lastTime = performance.now();
    gameStartTime = lastTime; // Record start time for gradual damping
    gameRunning = true;
    groundY = canvas.height - 50;
    ball = {
      x: 50,
      y: groundY - ballRadius,
      radius: ballRadius,
      vx: 0,
      vy: 0,
      launched: false,
    };
    coins = [];
    spawnCoins();
    launchButton.innerText = "Launch";
    requestAnimationFrame(gameLoop);
  }
  function spawnCoins() {
    let threshold = ball.x + canvas.width;
    let maxCoinX = coins.length > 0 ? Math.max(...coins.map(c => c.x)) : ball.x + 200;
    while (maxCoinX < threshold) {
      let spacing = 200 + Math.random() * 150; // Spacing between 200 and 350 pixels.
      let newX = maxCoinX + spacing;
      let randomYOffset = Math.random() * 210 - 200; // Random vertical offset between -10 and +10 pixels.
      coins.push({
        x: newX,
        y: groundY - coinRadius + randomYOffset,
        radius: coinRadius,
        collected: false,
      });
      maxCoinX = newX;
    }
  }
  function gameLoop(timestamp) {
    if (!gameRunning) return;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    let elapsedTime = (timestamp - gameStartTime) / 1000;
    if (ball.launched) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vy += gravity * dt;
      if (elapsedTime > 672) { // 120 seconds = 2 minutes
        const extraDampingFactor = 0.99;
        ball.vx *= extraDampingFactor;
        ball.vy *= extraDampingFactor;
      }
      if (ball.y + ball.radius >= groundY) {
        ball.y = groundY - ball.radius;
        if (Math.abs(ball.vy) > 200) {
          ball.vy = -ball.vy * (0.7 + bounceUpgrade * 0.037);
          ball.vx *= 0.95;
        } else {
          ball.vy = 0;
          let frictionAcc = 300;
          if (ball.vx > 0)
            ball.vx = Math.max(ball.vx - frictionAcc * dt, 0);
          else if (ball.vx < 0)
            ball.vx = Math.min(ball.vx + frictionAcc * dt, 0);
          if (Math.abs(ball.vx) < 10) {
            ball.vx = 0;
            ball.launched = false;
            endGame();
          }
        }
      }
      coins.forEach((coin) => {
        if (!coin.collected) {
          let dx = ball.x - coin.x;
          let dy = ball.y - coin.y;
          if (dx * dx + dy * dy < Math.pow(ball.radius + coin.radius, 2)) {
            coin.collected = true;
            coinCount++;
            updateCoinStorage();
          }
        }
      });
    }
    score = Math.max(score, ball.x - 50);
    if (score > highScore) {
      highScore = score;
      updateHighScoreStorage();
    }
    spawnCoins();
    coins = coins.filter((coin) => coin.x > ball.x - 500);
    let offset = Math.max(0, ball.x - canvas.width / 3);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-offset, 0);
    if (groundPattern) {
      ctx.fillStyle = groundPattern;
    } else {
      ctx.fillStyle = "green";
    }
    ctx.fillRect(offset, groundY, canvas.width, canvas.height - groundY);
    coins.forEach((coin) => {
      if (!coin.collected) {
        ctx.drawImage(
          coinImage,
          coin.x - coin.radius,
          coin.y - coin.radius,
          coin.radius * 2,
          coin.radius * 2
        );
      }
    });
    if (selectedSkin.image) {
      if (!skinImageCache[selectedSkinId]) {
        let img = new Image();
        img.src = selectedSkin.image;
        skinImageCache[selectedSkinId] = img;
      }
      ctx.drawImage(
        skinImageCache[selectedSkinId],
        ball.x - ball.radius,
        ball.y - ball.radius,
        ball.radius * 2,
        ball.radius * 2
      );
    } else {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedSkin.color;
      ctx.fill();
    }
    ctx.restore();
    document.getElementById("scoreDisplay").innerText = "Score: " + Math.floor(score);
    document.getElementById("highScoreDisplay").innerText = "High: " + Math.floor(highScore);
    requestAnimationFrame(gameLoop);
  }
  function endGame() {
    gameRunning = false;
    launchButton.innerText = "Restart";
  }
  launchButton.addEventListener("click", () => {
    if (!ball.launched && ball.x > 50) {
      startGame();
      return;
    }
    if (!ball.launched) {
      let angle = (Math.random() * (60 - 30) + 30) * (Math.PI / 180);
      let speed = Math.random() * (600 - 400) + 400;
      speed *= 1 + velocityUpgrade * 0.1;
      ball.vx = speed * Math.cos(angle);
      ball.vy = -speed * Math.sin(angle);
      ball.launched = true;
    }
  });
  // --- Shop logic (skins & upgrades) ---
  function populateShop() {
    document.getElementById("coinCountDisplay").innerText = coinCount;
    const skinsContainer = document.getElementById("skinsContainer");
    skinsContainer.innerHTML = "";
    for (let key in skinOptions) {
      let skin = skinOptions[key];
      let itemDiv = document.createElement("div");
      itemDiv.className = "skinItem";
      let previewDiv = document.createElement("div");
      previewDiv.className = "skinPreview";
      if (skin.image) {
        previewDiv.style.backgroundImage = `url(${skin.image})`;
        previewDiv.style.backgroundSize = "cover";
      } else {
        previewDiv.style.backgroundColor = skin.color;
      }
      itemDiv.appendChild(previewDiv);
      let nameP = document.createElement("p");
      nameP.innerText = skin.name;
      itemDiv.appendChild(nameP);
      let costP = document.createElement("p");
      costP.innerText = skin.cost > 0 ? "Cost: " + skin.cost : "Free";
      itemDiv.appendChild(costP);
      let actionButton = document.createElement("button");
      actionButton.className = "button-64";
      if (purchasedSkins[key]) {
        if (selectedSkinId === key) {
          actionButton.innerText = "Selected";
          actionButton.disabled = true;
        } else {
          actionButton.innerText = "Select";
          actionButton.addEventListener("click", () => {
            selectedSkinId = key;
            selectedSkin = skinOptions[key];
            localStorage.setItem("selectedSkinFootballz", key);
            populateShop();
          });
        }
      } else {
        actionButton.innerText = "Buy";
        actionButton.addEventListener("click", () => {
          if (coinCount >= skin.cost) {
            coinCount -= skin.cost;
            purchasedSkins[key] = true;
            selectedSkinId = key;
            selectedSkin = skinOptions[key];
            updateCoinStorage();
            updateSkinsStorage();
            localStorage.setItem("selectedSkinFootballz", key);
            populateShop();
          } else {
            alert("Not enough balls!");
          }
        });
      }
      itemDiv.appendChild(actionButton);
      skinsContainer.appendChild(itemDiv);
    }
    // --- Upgrades ---
    let upgradesDiv = document.createElement("div");
    upgradesDiv.id = "upgradesContainer";
    let upgradesHeader = document.createElement("h2");
    upgradesHeader.innerText = "Upgrades";
    upgradesDiv.appendChild(upgradesHeader);
    let upgrades = [
      {
        title: `Velocity Boost (Level ${velocityUpgrade})`,
        level: velocityUpgrade,
        maxLevel: Infinity,
        cost: 10 * (velocityUpgrade + 1),
        onBuy: () => velocityUpgrade++
      },
      {
        title: `Bounciness Boost (Level ${bounceUpgrade})`,
        level: bounceUpgrade,
        maxLevel: 4,
        cost: 10 * (bounceUpgrade + 1),
        onBuy: () => bounceUpgrade++
      }
    ];
    let upgradesRow = document.createElement("div");
    upgradesRow.className = "upgradesRow";
    upgradesDiv.appendChild(upgradesRow);
    upgrades.forEach(upgrade => {
      let itemDiv = document.createElement("div");
      itemDiv.className = "skinItem";
      let title = document.createElement("p");
      title.innerText = upgrade.title;
      itemDiv.appendChild(title);
      let costP = document.createElement("p");
      costP.innerText = "Cost: " + upgrade.cost;
      itemDiv.appendChild(costP);
      let actionButton = document.createElement("button");
      actionButton.className = "button-64";
      if (upgrade.level >= upgrade.maxLevel) {
        actionButton.innerText = "Max Level";
        actionButton.disabled = true;
      } else {
        actionButton.innerText = "Buy Upgrade";
        actionButton.addEventListener("click", () => {
          if (coinCount >= upgrade.cost) {
            coinCount -= upgrade.cost;
            upgrade.onBuy();
            updateCoinStorage();
            updateUpgradesStorage();
            populateShop();
          } else {
            alert("Not enough balls!");
          }
        });
      }
      itemDiv.appendChild(actionButton);
      upgradesRow.appendChild(itemDiv);
    });
    const existingUpgrades = document.getElementById("upgradesContainer");
    if (existingUpgrades) {
      existingUpgrades.remove();
    }
    shopDiv.appendChild(upgradesDiv);
    const backButton = document.getElementById("backFromShopButton");
    shopDiv.appendChild(backButton);
  }
  
  // --- Event Shop logic (same layout as normal shop) ---
  function populateEventShop() {
    const container = document.getElementById("eventSkinsContainer");
    container.innerHTML = "";
    for (let key in eventSkinOptions) {
      let skin = eventSkinOptions[key];
      let itemDiv = document.createElement("div");
      itemDiv.className = "skinItem";
      let previewDiv = document.createElement("div");
      previewDiv.className = "skinPreview";
      if (skin.image) {
        previewDiv.style.backgroundImage = `url(${skin.image})`;
        previewDiv.style.backgroundSize = "cover";
      } else if (skin.color) {
        previewDiv.style.backgroundColor = skin.color;
      }
      itemDiv.appendChild(previewDiv);
      let nameP = document.createElement("p");
      nameP.innerText = skin.name;
      itemDiv.appendChild(nameP);
      let costP = document.createElement("p");
      costP.innerText = skin.cost > 0 ? "Cost: " + skin.cost : "Free";
      itemDiv.appendChild(costP);
      let actionButton = document.createElement("button");
      actionButton.className = "button-64";
      // If already purchased, allow selection (same as normal shop)
      if (purchasedEventSkins[key]) {
        if (selectedSkinId === key) {
          actionButton.innerText = "Selected";
          actionButton.disabled = true;
        } else {
          actionButton.innerText = "Select";
          actionButton.addEventListener("click", () => {
            selectedSkinId = key;
            // Merge event skin into our skin options for selection
            selectedSkin = eventSkinOptions[key];
            // Also add to purchasedSkins so it shows up in the normal shop later if needed
            purchasedSkins[key] = true;
            localStorage.setItem("selectedSkinFootballz", key);
            populateEventShop();
          });
        }
      } else {
        if (!skin.enabled) {
          actionButton.innerText = "Disabled";
          actionButton.disabled = true;
        } else {
          actionButton.innerText = "Buy";
          actionButton.addEventListener("click", () => {
            if (coinCount >= skin.cost) {
              coinCount -= skin.cost;
              purchasedEventSkins[key] = true;
              purchasedSkins[key] = true; // Add to purchased skins so it appears in the normal shop too.
              updateCoinStorage();
              localStorage.setItem("purchasedEventSkins", JSON.stringify(purchasedEventSkins));
              populateEventShop();
            } else {
              alert("Not enough coins!");
            }
          });
        }
      }
      itemDiv.appendChild(actionButton);
      container.appendChild(itemDiv);
    }
    // Removed the skin counter element.
  }
  
  showMenu();
};
