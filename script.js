class StrategicDefense {
  constructor() {
    this.rows = 8;
    this.cols = 10;
    this.grid = [];
    this.towers = new Set();
    this.enemies = [];
    this.gamePhase = "setup"; // setup, battle, finished
    this.placingTower = false;
    this.pathsAnalyzed = 0;
    this.startPos = { row: 3, col: 0 };
    this.endPos = { row: 4, col: 9 };
    this.bestAIPath = null;
    this.currentPredictions = [];

    this.initGrid();
    this.renderGrid();
    this.updateUI();
  }

  initGrid() {
    this.grid = [];
    for (let row = 0; row < this.rows; row++) {
      this.grid[row] = new Array(this.cols).fill("empty");
    }

    // Set start and end positions
    this.grid[this.startPos.row][this.startPos.col] = "start";
    this.grid[this.endPos.row][this.endPos.col] = "end";
  }

  renderGrid() {
    const battlefield = document.getElementById("battlefield");
    battlefield.innerHTML = "";

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        const cellType = this.grid[row][col];
        if (cellType !== "empty") {
          cell.classList.add(cellType);
        }

        // Add predicted path highlighting
        if (
          this.currentPredictions.some(
            (pred) => pred.row === row && pred.col === col
          )
        ) {
          cell.classList.add("predicted");
        }

        cell.onclick = () => this.cellClicked(row, col);
        battlefield.appendChild(cell);
      }
    }
  }

  cellClicked(row, col) {
    if (this.gamePhase !== "setup") return;

    if (this.placingTower && this.canPlaceTower(row, col)) {
      this.placeTowerAt(row, col);
      this.placingTower = false;
      document.getElementById("towerBtn").textContent = "🏗️ Place Tower";
      this.analyzeDefenses();
    }
  }

  canPlaceTower(row, col) {
    return this.grid[row][col] === "empty";
  }

  placeTowerAt(row, col) {
    this.grid[row][col] = "tower";
    this.towers.add(`${row},${col}`);
    document.getElementById("towersPlaced").textContent = this.towers.size;
    this.renderGrid();
  }

  placeTower() {
    if (this.gamePhase !== "setup") return;

    this.placingTower = !this.placingTower;
    document.getElementById("towerBtn").textContent = this.placingTower
      ? "❌ Cancel"
      : "🏗️ Place Tower";
  }

  async analyzeDefenses() {
    if (this.towers.size === 0) return;

    document.getElementById("thinking").classList.add("active");
    this.pathsAnalyzed = 0;

    // Simulate AI analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = this.findOptimalAttackPath();

    document.getElementById("thinking").classList.remove("active");
    document.getElementById("pathsAnalyzed").textContent = this.pathsAnalyzed;

    if (result.path) {
      this.bestAIPath = result.path;
      this.currentPredictions = result.path;
      document.getElementById(
        "bestPath"
      ).textContent = `${result.path.length} moves`;
      document.getElementById("successRate").textContent = `${Math.max(
        0,
        100 - result.difficulty
      )}%`;

      document.getElementById("aiStrategy").innerHTML = `
                        <div>🎯 <strong>Optimal Route Found!</strong></div>
                        <div>Path length: ${result.path.length} steps</div>
                        <div>Defense rating: ${result.difficulty}/100</div>
                        <div>Strategy: ${this.getStrategyDescription(
                          result
                        )}</div>
                    `;

      this.updatePredictions(result);
    } else {
      document.getElementById("aiStrategy").innerHTML = `
                        <div style="color: #e74c3c;">🛡️ <strong>Perfect Defense!</strong></div>
                        <div>No viable path found</div>
                        <div>All routes blocked</div>
                    `;
      document.getElementById("successRate").textContent = "0%";
    }

    this.renderGrid();
  }

  findOptimalAttackPath() {
    const start = this.startPos;
    const end = this.endPos;

    // Use A* with Minimax evaluation for multiple scenarios
    const paths = [];
    const visited = new Set();
    const queue = [{ pos: start, path: [start], cost: 0 }];

    while (queue.length > 0 && paths.length < 10) {
      this.pathsAnalyzed++;

      queue.sort(
        (a, b) =>
          a.cost +
          this.heuristic(a.pos, end) -
          (b.cost + this.heuristic(b.pos, end))
      );
      const current = queue.shift();

      const key = `${current.pos.row},${current.pos.col}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (current.pos.row === end.row && current.pos.col === end.col) {
        paths.push({
          path: current.path,
          cost: current.cost,
          difficulty: this.evaluatePathDifficulty(current.path),
        });
        continue;
      }

      const neighbors = this.getNeighbors(current.pos);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.row},${neighbor.col}`;
        if (visited.has(neighborKey)) continue;

        const moveCost = this.getMoveCost(neighbor);
        if (moveCost === Infinity) continue; // Blocked by tower

        queue.push({
          pos: neighbor,
          path: [...current.path, neighbor],
          cost: current.cost + moveCost,
        });
      }
    }

    if (paths.length === 0) {
      return { path: null, difficulty: 100 };
    }

    // Use minimax thinking: find path with best worst-case scenario
    paths.sort((a, b) => a.cost - b.cost);
    return paths[0];
  }

  getNeighbors(pos) {
    const neighbors = [];
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 }, // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }, // right
      { row: -1, col: 1 }, // diagonal up-right
      { row: 1, col: 1 }, // diagonal down-right
    ];

    for (const dir of directions) {
      const newRow = pos.row + dir.row;
      const newCol = pos.col + dir.col;

      if (
        newRow >= 0 &&
        newRow < this.rows &&
        newCol >= 0 &&
        newCol < this.cols
      ) {
        neighbors.push({ row: newRow, col: newCol });
      }
    }

    return neighbors;
  }

  getMoveCost(pos) {
    const cellType = this.grid[pos.row][pos.col];
    if (cellType === "tower") return Infinity;
    if (cellType === "end") return 1;

    // Higher cost near towers (tower influence)
    let cost = 1;
    for (const towerKey of this.towers) {
      const [towerRow, towerCol] = towerKey.split(",").map(Number);
      const distance =
        Math.abs(pos.row - towerRow) + Math.abs(pos.col - towerCol);
      if (distance <= 2) {
        cost += Math.max(0, 3 - distance);
      }
    }

    return cost;
  }

  heuristic(pos, target) {
    return Math.abs(pos.row - target.row) + Math.abs(pos.col - target.col);
  }

  evaluatePathDifficulty(path) {
    let difficulty = 0;
    for (const pos of path) {
      for (const towerKey of this.towers) {
        const [towerRow, towerCol] = towerKey.split(",").map(Number);
        const distance =
          Math.abs(pos.row - towerRow) + Math.abs(pos.col - towerCol);
        if (distance <= 3) {
          difficulty += Math.max(0, 10 - distance * 2);
        }
      }
    }
    return Math.min(100, difficulty);
  }

  getStrategyDescription(result) {
    if (result.difficulty > 70) return "Heavy resistance expected";
    if (result.difficulty > 40) return "Moderate defenses detected";
    if (result.difficulty > 20) return "Light opposition predicted";
    return "Clear path identified";
  }

  updatePredictions(result) {
    const predictions = document.getElementById("predictions");
    predictions.innerHTML = "";

    const pathNodes = result.path.map((pos, index) => {
      const div = document.createElement("div");
      div.className = "tree-node";
      div.innerHTML = `Step ${index + 1}: Move to (${pos.row}, ${pos.col})`;

      if (index === 0) div.classList.add("best");
      if (this.isNearTower(pos)) div.classList.add("threat");

      return div;
    });

    pathNodes.forEach((node) => predictions.appendChild(node));
  }

  isNearTower(pos) {
    for (const towerKey of this.towers) {
      const [towerRow, towerCol] = towerKey.split(",").map(Number);
      const distance =
        Math.abs(pos.row - towerRow) + Math.abs(pos.col - towerCol);
      if (distance <= 2) return true;
    }
    return false;
  }

  async startBattle() {
    if (this.gamePhase !== "setup" || this.towers.size === 0) return;

    this.gamePhase = "battle";
    document.getElementById("gamePhase").textContent =
      "⚔️ Battle Phase: AI executing optimal strategy!";
    document.getElementById("battleBtn").disabled = true;
    document.getElementById("towerBtn").disabled = true;

    if (this.bestAIPath) {
      await this.simulateBattle();
    } else {
      document.getElementById("waveInfo").innerHTML =
        "🛡️ <strong>Victory!</strong><br>Perfect defense achieved!";
    }
  }

  async simulateBattle() {
    document.getElementById("waveInfo").textContent = "AI forces advancing...";

    for (let i = 0; i < this.bestAIPath.length; i++) {
      const pos = this.bestAIPath[i];

      // Clear previous enemy positions
      this.enemies.forEach((enemy) => {
        if (this.grid[enemy.row][enemy.col] === "enemy") {
          this.grid[enemy.row][enemy.col] = "empty";
        }
      });

      this.enemies = [pos];
      if (this.grid[pos.row][pos.col] === "empty") {
        this.grid[pos.row][pos.col] = "enemy";
      }

      this.currentPredictions = this.bestAIPath.slice(i + 1);
      this.renderGrid();

      document.getElementById("waveInfo").innerHTML = `
                        <strong>Step ${i + 1}/${
        this.bestAIPath.length
      }</strong><br>
                        Enemy at position (${pos.row}, ${pos.col})
                    `;

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    this.gamePhase = "finished";
    document.getElementById("gamePhase").textContent =
      "💥 Battle Complete: AI reached the goal!";
    document.getElementById("waveInfo").innerHTML =
      "🤖 <strong>AI Victory!</strong><br>Strategic prediction was successful!";
  }

  resetGame() {
    this.towers.clear();
    this.enemies = [];
    this.gamePhase = "setup";
    this.placingTower = false;
    this.bestAIPath = null;
    this.currentPredictions = [];
    this.pathsAnalyzed = 0;

    this.initGrid();
    this.renderGrid();
    this.updateUI();

    document.getElementById("battleBtn").disabled = false;
    document.getElementById("towerBtn").disabled = false;
    document.getElementById("towerBtn").textContent = "🏗️ Place Tower";
    document.getElementById("thinking").classList.remove("active");
  }

  updateUI() {
    document.getElementById("gamePhase").textContent =
      "📍 Setup Phase: Place your towers strategically!";
    document.getElementById("waveInfo").textContent =
      "Preparing battle simulation...";
    document.getElementById("towersPlaced").textContent = "0";
    document.getElementById("pathsAnalyzed").textContent = "0";
    document.getElementById("bestPath").textContent = "-";
    document.getElementById("successRate").textContent = "100%";
    document.getElementById("aiStrategy").textContent =
      "Waiting for tower placement...";
    document.getElementById("predictions").textContent =
      "AI will analyze possible attack routes once you place towers...";
  }
}

// Initialize game
let game = new StrategicDefense();

// Control functions
function placeTower() {
  game.placeTower();
}

function startBattle() {
  game.startBattle();
}

function resetGame() {
  game.resetGame();
}
