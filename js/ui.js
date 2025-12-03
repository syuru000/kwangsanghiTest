// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\ui.js
import { uiState } from './ui_state.js';

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;

const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const checkIndicator = document.getElementById('check-indicator');
const gameOverMessage = document.getElementById('game-over-message');
const annotationLayer = document.getElementById('annotation-layer');
const moveHistoryContainer = document.getElementById('move-history');


let onCellClickCallback = null;

// UI Initialization
export function initializeUI(cellClickHandler) {
    onCellClickCallback = cellClickHandler;
    gameBoard.innerHTML = ''; // Clear previous cells if any

    // Create grid cells
    for (let y = 0; y < BOARD_HEIGHT_CELLS; y++) {
        for (let x = 0; x < BOARD_WIDTH_CELLS; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.y = y;
            cell.dataset.x = x;
            gameBoard.appendChild(cell);
        }
    }
}

export function resizeBoard() {
    if (!gameBoard || !annotationLayer) return;

    const newWidth = uiState.cellSize * BOARD_WIDTH_CELLS;
    const newHeight = uiState.cellSize * BOARD_HEIGHT_CELLS;

    gameBoard.style.width = `${newWidth}px`;
    gameBoard.style.height = `${newHeight}px`;
    
    // Explicitly set the annotation layer's size and position to match the game board.
    // This is more robust than relying on CSS centering which can be tricky.
    annotationLayer.style.width = `${newWidth}px`;
    annotationLayer.style.height = `${newHeight}px`;
    annotationLayer.style.top = `${gameBoard.offsetTop}px`;
    annotationLayer.style.left = `${gameBoard.offsetLeft}px`;
    
    // Also set the SVG's internal coordinate system
    annotationLayer.setAttribute('width', newWidth);
    annotationLayer.setAttribute('height', newHeight);
    annotationLayer.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
}


/**
 * Renders the entire game board based on the state.
 * @param {object} gameState The game state object (can be local or from server).
 * @param {string} playerTeam The team of the current player ('초' or '한') for board orientation.
 */
export function renderBoard(gameState, playerTeam) {
    if (!gameState || !gameState.board_state) {
        console.warn("Render called with invalid gameState.");
        return;
    }

    const processed_board_state = gameState.board_state.map(row => {
        return row.map(piece => {
            if (!piece) return null;
            if (piece.is_deactivated !== undefined) return piece;

            const group_key = `${piece.team}_${piece.general_group}`;
            const is_deactivated = piece.general_group !== '중앙' &&
                                   piece.name !== 'Su' &&
                                   (gameState.deactivated_groups && gameState.deactivated_groups[group_key]);
            return Object.assign(Object.create(Object.getPrototypeOf(piece)), piece, { is_deactivated: !!is_deactivated });
        });
    });

    gameBoard.dataset.playerTeam = playerTeam;
    const isFlipped = playerTeam === '한';

    const dynamicElements = gameBoard.querySelectorAll('.piece, .valid-move-dot, .selected, .check-highlight');
    dynamicElements.forEach(el => el.remove());
    
    annotationLayer.innerHTML = `<defs>
        <marker id="arrowhead-green" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#20C20E" /></marker>
        <marker id="arrowhead-red" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FF4136" /></marker>
        <marker id="arrowhead-yellow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FFDC00" /></marker>
    </defs>`;

    processed_board_state.forEach((row) => {
        row.forEach((piece) => {
            if (piece) {
                const pieceEl = createPieceElement(piece, isFlipped);
                gameBoard.appendChild(pieceEl);
            }
        });
    });

    // Highlight selected piece, but only if it's the current player's turn
    if (gameState.selected_pos && gameState.current_turn === playerTeam) {
        highlightElement(gameState.selected_pos, 'selected', isFlipped);
    }

    if (gameState.valid_moves) {
        showValidMoves(gameState.valid_moves, isFlipped, gameState.board_state);
    }
    
    if (gameState.in_check_team && gameState.checked_su_pos) {
        highlightElement(gameState.checked_su_pos, 'check-highlight', isFlipped);
    }

    if (gameState.lastMove) {
        drawLastMoveIndicator(gameState.lastMove, isFlipped);
    }
    if (gameState.drawnArrows || gameState.drawnCircles) {
        drawAnnotations(gameState, isFlipped);
    }

    updateInfoPanel(gameState);
    renderMoveHistory(gameState.move_history || []);
}

function highlightElement(pos, cssClass, isFlipped) {
    const [logicalY, logicalX] = pos;
    const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
    const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;
    
    const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
    if(cell) {
         const highlight = document.createElement('div');
         highlight.className = cssClass;
         highlight.style.width = `${uiState.cellSize}px`;
         highlight.style.height = `${uiState.cellSize}px`;
         cell.appendChild(highlight);
    }
}

function createPieceElement(piece, isFlipped) {
    const pieceEl = document.createElement('div');
    pieceEl.classList.add('piece');
    
    const imageName = piece.is_deactivated
        ? `비활성${piece.team}_${piece.korean_name}` 
        : `${piece.team}_${piece.korean_name}`;

    const [logicalY, logicalX] = piece.position;

    const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
    const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;

    pieceEl.style.backgroundImage = `url('images/${imageName}.png')`;
    pieceEl.style.left = `${visualX * uiState.cellSize}px`;
    pieceEl.style.top = `${visualY * uiState.cellSize}px`;
    pieceEl.style.width = `${uiState.cellSize}px`;
    pieceEl.style.height = `${uiState.cellSize}px`;
    
    pieceEl.dataset.team = piece.team;
    pieceEl.dataset.name = piece.name;

    return pieceEl;
}

function showValidMoves(validMoves, isFlipped, boardState) {
    validMoves.forEach(move => {
        const [logicalY, logicalX] = move;

        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;

        const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
        if (cell) {
            const dot = document.createElement('div');
            dot.classList.add('valid-move-dot');
            dot.style.width = `${uiState.cellSize * 0.35}px`;
            dot.style.height = `${uiState.cellSize * 0.35}px`;
            if (boardState[logicalY][logicalX]) {
                dot.classList.add('capture');
            }
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

function renderMoveHistory(moveHistory) {
    if (!moveHistoryContainer) return;
    moveHistoryContainer.innerHTML = '';

    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = (i / 2) + 1;
        const choMove = moveHistory[i];
        const hanMove = (i + 1 < moveHistory.length) ? moveHistory[i + 1] : null;

        const movePairDiv = document.createElement('div');
        movePairDiv.classList.add('move-pair');

        const moveNumSpan = document.createElement('span');
        moveNumSpan.classList.add('move-number');
        moveNumSpan.textContent = `${moveNumber}. `;

        const choSpan = document.createElement('span');
        choSpan.classList.add('move-cho');
        choSpan.textContent = choMove.notation;

        movePairDiv.appendChild(moveNumSpan);
        movePairDiv.appendChild(choSpan);

        if (hanMove) {
            const hanSpan = document.createElement('span');
            hanSpan.classList.add('move-han');
            hanSpan.textContent = ` ${hanMove.notation}`;
            movePairDiv.appendChild(hanSpan);
        }

        moveHistoryContainer.appendChild(movePairDiv);
    }
    
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
}


function drawLastMoveIndicator(lastMove, isFlipped) {
    const { from_pos, to_pos } = lastMove;

    const from_y_logic = from_pos[0];
    const from_x_logic = from_pos[1];
    const to_y_logic = to_pos[0];
    const to_x_logic = to_pos[1];

    const from_y_visual = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - from_y_logic) : from_y_logic;
    const from_x_visual = isFlipped ? (BOARD_WIDTH_CELLS - 1 - from_x_logic) : from_x_logic;
    const to_y_visual = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - to_y_logic) : to_y_logic;
    const to_x_visual = isFlipped ? (BOARD_WIDTH_CELLS - 1 - to_x_logic) : to_x_logic;

    const x1 = from_x_visual * uiState.cellSize + uiState.cellSize / 2;
    const y1 = from_y_visual * uiState.cellSize + uiState.cellSize / 2;
    const x2 = to_x_visual * uiState.cellSize + uiState.cellSize / 2;
    const y2 = to_y_visual * uiState.cellSize + uiState.cellSize / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#FFDC00'); // Yellow
    line.setAttribute('stroke-width', '4');
    line.setAttribute('opacity', '0.7');
    line.setAttribute('marker-end', 'url(#arrowhead-yellow)');
    line.classList.add('last-move-arrow');
    annotationLayer.appendChild(line);
}

function drawAnnotations(gameState, isFlipped) {
    (gameState.drawnCircles || []).forEach(pos => {
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - pos.x) : pos.x;
        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - pos.y) : pos.y;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const cx = visualX * uiState.cellSize + uiState.cellSize / 2;
        const cy = visualY * uiState.cellSize + uiState.cellSize / 2;
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', uiState.cellSize * 0.45);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#20C20E');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('opacity', '0.7');
        annotationLayer.appendChild(circle);
    });

    (gameState.drawnArrows || []).forEach(arrow => {
        const { startPos, endPos, color } = arrow;
        const startXVisual = isFlipped ? (BOARD_WIDTH_CELLS - 1 - startPos.x) : startPos.x;
        const startYVisual = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - startPos.y) : startPos.y;
        const endXVisual = isFlipped ? (BOARD_WIDTH_CELLS - 1 - endPos.x) : endPos.x;
        const endYVisual = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - endPos.y) : endPos.y;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x1 = startXVisual * uiState.cellSize + uiState.cellSize / 2;
        const y1 = startYVisual * uiState.cellSize + uiState.cellSize / 2;
        const x2 = endXVisual * uiState.cellSize + uiState.cellSize / 2;
        const y2 = endYVisual * uiState.cellSize + uiState.cellSize / 2;
        
        const markerColorId = color === '#FF4136' ? 'red' : (color === '#FFDC00' ? 'yellow' : 'green');

        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '4');
        line.setAttribute('opacity', '0.7');
        line.setAttribute('marker-end', `url(#arrowhead-${markerColorId})`);
        annotationLayer.appendChild(line);
    });
}