// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\ui.js

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;
const CELL_SIZE = 40;

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
                const boardElement = e.target.closest('#game-board');
                if (!boardElement) return;

                const playerTeam = boardElement.dataset.playerTeam || '초';
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
 * @param {string|null} playerTeam The team of the current player ('초' or '한').
 */
export function renderBoard(gameState, playerTeam) {
    if (!gameState || !gameState.board_state) {
        console.warn("Render called with invalid gameState.");
        return;
    }
    
    gameBoard.dataset.playerTeam = playerTeam;
    const isFlipped = playerTeam === '한';

    // Clear all previous dynamic elements (pieces, dots, highlights)
    const dynamicElements = gameBoard.querySelectorAll('.piece, .valid-move-dot, .selected, .check-highlight');
    dynamicElements.forEach(el => el.remove());

    // Draw pieces
    gameState.board_state.forEach((row) => {
        row.forEach((piece) => {
            if (piece) {
                const pieceEl = createPieceElement(piece, isFlipped);
                gameBoard.appendChild(pieceEl);
            }
        });
    });

    // Highlight selected piece based on server state
    if (gameState.selected_pos) {
        const selectedY = gameState.selected_pos[0];
        const selectedX = gameState.selected_pos[1];
        
        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - selectedY) : selectedY;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - selectedX) : selectedX;
        
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
        const checkY = gameState.checked_su_pos[0];
        const checkX = gameState.checked_su_pos[1];

        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - checkY) : checkY;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - checkX) : checkX;

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
    
    const imageName = piece.is_deactivated 
        ? `비활성${piece.team}_${piece.korean_name}` 
        : `${piece.team}_${piece.korean_name}`;

    const logicalY = piece.position[0];
    const logicalX = piece.position[1];

    const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
    const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;

    pieceEl.style.backgroundImage = `url('images/${imageName}.png')`;
    pieceEl.style.left = `${visualX * CELL_SIZE}px`;
    pieceEl.style.top = `${visualY * CELL_SIZE}px`;
    pieceEl.style.width = `${CELL_SIZE}px`;
    pieceEl.style.height = `${CELL_SIZE}px`;
    
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
