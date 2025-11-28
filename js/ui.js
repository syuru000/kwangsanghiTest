// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\ui.js

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;
const CELL_SIZE = 40; // Assuming a fixed cell size for now

const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const checkIndicator = document.getElementById('check-indicator');
const gameOverMessage = document.getElementById('game-over-message');

let onCellClickCallback = null;

// UI Initialization
export function initializeUI(cellClickHandler) {
    onCellClickCallback = cellClickHandler;
    gameBoard.innerHTML = '';

    for (let y = 0; y < BOARD_HEIGHT_CELLS; y++) {
        for (let x = 0; x < BOARD_WIDTH_CELLS; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.y = y;
            cell.dataset.x = x;
            cell.addEventListener('click', (e) => {
                const boardRect = gameBoard.getBoundingClientRect();
                // We need to determine the logical cell coordinates based on player's view
                const playerTeam = e.target.closest('#game-board').dataset.playerTeam || '초';
                let logicalY = y;
                let logicalX = x;

                if (playerTeam === '한') {
                    logicalY = BOARD_HEIGHT_CELLS - 1 - y;
                    logicalX = BOARD_WIDTH_CELLS - 1 - x;
                }
                
                onCellClickCallback?.({ y: logicalY, x: logicalX });
            });
            gameBoard.appendChild(cell);
        }
    }
}

/**
 * Renders the entire game board based on the state received from the server.
 * @param {object} gameState The game state object from the server.
 * @param {object|null} selectedPos The locally selected position {y, x}.
 * @param {string|null} playerTeam The team of the current player ('초' or '한').
 */
export function renderBoard(gameState, selectedPos, playerTeam) {
    if (!gameState || !gameState.board_state) {
        console.warn("Render called with invalid gameState.");
        return;
    }
    
    // Set player team on the board element for coordinate calculation
    gameBoard.dataset.playerTeam = playerTeam;
    const isFlipped = playerTeam === '한';

    // Clear previous dynamic elements
    gameBoard.querySelectorAll('.piece, .valid-move-dot, .selected, .check-highlight, .last-move-marker').forEach(el => el.remove());

    // Draw pieces
    gameState.board_state.forEach((row, y) => {
        row.forEach((piece, x) => {
            if (piece) {
                const pieceEl = createPieceElement(piece, isFlipped);
                gameBoard.appendChild(pieceEl);
            }
        });
    });

    // Highlight selected piece
    if (selectedPos) {
        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - selectedPos.y) : selectedPos.y;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - selectedPos.x) : selectedPos.x;
        const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
        if(cell) {
             const highlight = document.createElement('div');
             highlight.className = 'selected';
             cell.appendChild(highlight);
        }
    }

    // Show valid moves
    if (gameState.valid_moves) {
        showValidMoves(gameState.valid_moves, isFlipped);
    }
    
    // Highlight king in check
    if (gameState.in_check_team && gameState.checked_su_pos) {
        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - gameState.checked_su_pos[0]) : gameState.checked_su_pos[0];
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - gameState.checked_su_pos[1]) : gameState.checked_su_pos[1];
        const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
         if(cell) {
             const checkHighlight = document.createElement('div');
             checkHighlight.className = 'check-highlight';
             cell.appendChild(checkHighlight);
        }
    }

    updateInfoPanel(gameState);
}

function createPieceElement(piece, isFlipped) {
    const pieceEl = document.createElement('div');
    pieceEl.classList.add('piece');
    
    let imageName = piece.is_deactivated 
        ? `비활성${piece.team}_${piece.korean_name}` 
        : `${piece.team}_${piece.korean_name}`;

    const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - piece.position[0]) : piece.position[0];
    const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - piece.position[1]) : piece.position[1];

    pieceEl.style.backgroundImage = `url('images/${imageName}.png')`;
    pieceEl.style.left = `${visualX * CELL_SIZE}px`;
    pieceEl.style.top = `${visualY * CELL_SIZE}px`;
    pieceEl.style.width = `${CELL_SIZE}px`;
    pieceEl.style.height = `${CELL_SIZE}px`;
    
    // Add data attributes for debugging/styling if needed
    pieceEl.dataset.team = piece.team;
    pieceEl.dataset.name = piece.name;

    return pieceEl;
}

function showValidMoves(validMoves, isFlipped) {
    validMoves.forEach(move => {
        const logicalY = move[0];
        const logicalX = move[1];

        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;

        const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
        if (cell) {
            const dot = document.createElement('div');
            dot.classList.add('valid-move-dot');
            cell.appendChild(dot);
        }
    });
}

function updateInfoPanel(gameState) {
    turnIndicator.textContent = `${gameState.current_turn}나라 턴`;
    
    if (gameState.in_check_team) {
        checkIndicator.textContent = `${gameState.in_check_team} 장군!`;
    } else {
        checkIndicator.textContent = '';
    }

    if (gameState.game_over) {
        gameOverMessage.textContent = `게임 종료! ${gameState.winner}의 승리!`;
        turnIndicator.textContent = '게임 종료';
    } else {
        gameOverMessage.textContent = '';
    }
}