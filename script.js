const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-value');
const highScoreElement = document.getElementById('high-score-value');
const levelElement = document.getElementById('level-value');
const playBtn = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const overlay = document.getElementById('overlay');
const countdownElement = document.getElementById('countdown');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score-value');
const finalHighScoreElement = document.getElementById('final-high-score-value');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
    [[1, 0], [1, 1]]
];

const COLORS = [
    '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF',
    '#FF8E0D', '#FFE138', '#3877FF', '#B538FF',
    '#43C59E'
];

let board = createBoard();
let score = 0;
let highScore = 0;
let level = 1;
let dropCounter = 0;
let lastTime = 0;
let piece;
let gameActive = false;
let gameStartTime;
let currentSpeed = 1000; // Initial speed (1 second)
const SPEED_INCREASE_INTERVAL = 30000; // Increase speed every 30 seconds
const SPEED_INCREASE_AMOUNT = 50; // Decrease drop time by 50ms each time

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(x, y, value);
            }
        });
    });
}

function drawBlock(x, y, colorIndex) {
    ctx.fillStyle = COLORS[colorIndex - 1];
    ctx.fillRect(x, y, 1, 1);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
}

function createPiece() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = Math.floor(Math.random() * COLORS.length) + 1;
    return {
        shape,
        pos: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 },
        color
    };
}

function drawPiece() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(piece.pos.x + x, piece.pos.y + y, piece.color);
            }
        });
    });
}

function merge() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[piece.pos.y + y][piece.pos.x + x] = piece.color;
            }
        });
    });
}

function collision() {
    return piece.shape.some((row, y) => {
        return row.some((value, x) => {
            return (
                value &&
                (board[piece.pos.y + y] &&
                    board[piece.pos.y + y][piece.pos.x + x]) !== 0
            );
        });
    });
}

function rotate() {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    const previousShape = piece.shape;
    piece.shape = rotated;
    if (collision()) {
        piece.shape = previousShape;
    }
}

function moveLeft() {
    piece.pos.x--;
    if (collision()) {
        piece.pos.x++;
    }
}

function moveRight() {
    piece.pos.x++;
    if (collision()) {
        piece.pos.x--;
    }
}

function moveDown() {
    piece.pos.y++;
    if (collision()) {
        piece.pos.y--;
        merge();
        piece = createPiece();
        if (collision()) {
            gameOver();
        }
    }
    dropCounter = 0;
}

function clearLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++;
    }
    if (linesCleared > 0) {
        score += [40, 100, 300, 1200][linesCleared - 1] * level;
        updateScore();
    }
}

function updateScore() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
    }
    levelElement.textContent = level;
}

function updateSpeed(currentTime) {
    const elapsedTime = currentTime - gameStartTime;
    const newLevel = Math.floor(elapsedTime / SPEED_INCREASE_INTERVAL) + 1;
    if (newLevel > level) {
        level = newLevel;
        currentSpeed = Math.max(100, 1000 - (level - 1) * SPEED_INCREASE_AMOUNT);
        updateScore();
    }
}

function gameLoop(time = 0) {
    if (!gameActive) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    updateSpeed(time);

    dropCounter += deltaTime;
    if (dropCounter > currentSpeed) {
        moveDown();
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBoard();
    drawPiece();
    clearLines();

    requestAnimationFrame(gameLoop);
}

function startGame() {
    overlay.style.display = 'flex';
    countdownElement.style.display = 'block';
    playBtn.style.display = 'none';
    gameOverElement.style.display = 'none';

    let countdown = 3;
    countdownElement.textContent = countdown;

    const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;

        if (countdown === 0) {
            clearInterval(countdownInterval);
            overlay.style.display = 'none';
            board = createBoard();
            score = 0;
            level = 1;
            currentSpeed = 1000;
            updateScore();
            piece = createPiece();
            gameActive = true;
            gameStartTime = performance.now();
            gameLoop();
        }
    }, 1000);
}

function gameOver() {
    gameActive = false;
    overlay.style.display = 'flex';
    gameOverElement.style.display = 'block';
    finalScoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
    }
    finalHighScoreElement.textContent = highScore;
    highScoreElement.textContent = highScore;
}

function restartGame() {
    gameOverElement.style.display = 'none';
    startGame();
}

playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

document.addEventListener('keydown', event => {
    if (!gameActive) return;
    if (event.key === 'a' || event.key === 'A') moveLeft();
    if (event.key === 'd' || event.key === 'D') moveRight();
    if (event.key === 's' || event.key === 'S') moveDown();
    if (event.key === 'w' || event.key === 'W') rotate();
    if (event.key === 'ArrowLeft') moveLeft();
    if (event.key === 'ArrowRight') moveRight();
    if (event.key === 'ArrowDown') moveDown();
    if (event.key === 'ArrowUp') rotate();
});

// Mobile controls
document.getElementById('left-btn').addEventListener('click', moveLeft);
document.getElementById('right-btn').addEventListener('click', moveRight);
document.getElementById('down-btn').addEventListener('click', moveDown);
document.getElementById('rotate-btn').addEventListener('click', rotate);

// Initialize high score display
highScoreElement.textContent = highScore;