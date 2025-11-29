// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\ui.js

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;
const CELL_SIZE = 40;

const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const checkIndicator = document.getElementById('check-indicator');
const gameOverMessage = document.getElementById('game-over-message');
const annotationLayer = document.getElementById('annotation-layer');


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
            cell.addEventListener('click', (e) => {
                // The actual click logic is now handled by the board wrapper's listeners in main.js
                // This is to differentiate between click and drag
            });
            gameBoard.appendChild(cell);
        }
    }
}


/**
 * Renders the entire game board based on the state.
 * @param {object} gameState The game state object (can be local or from server).
 * @param {string} playerTeam The team of the current player ('초' or '한') for board orientation.
 */
export function renderBoard(gameState, playerTeam) {
    // --- DEBUGGING ---
    console.log("Received new gameState to render:", gameState);
    // ---

    if (!gameState || !gameState.board_state) {
        console.warn("Render called with invalid gameState.");
        return;
    }
    
    gameBoard.dataset.playerTeam = playerTeam;
    const isFlipped = playerTeam === '한';

    // Clear all previous dynamic elements
    const dynamicElements = gameBoard.querySelectorAll('.piece, .valid-move-dot, .selected, .check-highlight, .last-move-marker');
    dynamicElements.forEach(el => el.remove());
    annotationLayer.innerHTML = ''; // Clear SVG annotations

    // Draw pieces
    gameState.board_state.forEach((row) => {
        row.forEach((piece) => {
            if (piece) {
                const pieceEl = createPieceElement(piece, isFlipped);
                gameBoard.appendChild(pieceEl);
            }
        });
    });

    // Highlight selected piece
    if (gameState.selected_pos) {
        highlightElement(gameState.selected_pos, 'selected', isFlipped);
    }

    // Show valid moves
    if (gameState.valid_moves) {
        showValidMoves(gameState.valid_moves, isFlipped, gameState.board_state);
    }
    
    // Highlight king in check
    if (gameState.in_check_team && gameState.checked_su_pos) {
        highlightElement(gameState.checked_su_pos, 'check-highlight', isFlipped);
    }

    // --- Features for Local Play Only ---
    if (gameState.lastMove) {
        drawLastMoveIndicator(gameState.lastMove, isFlipped);
    }
    if (gameState.drawnArrows || gameState.drawnCircles) {
        drawAnnotations(gameState);
    }
    // --- End of Local Play Features ---


    updateInfoPanel(gameState);
}

function highlightElement(pos, cssClass, isFlipped) {
    const [logicalY, logicalX] = pos;
    const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
    const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;
    
    const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
    if(cell) {
         const highlight = document.createElement('div');
         highlight.className = cssClass;
         cell.appendChild(highlight);
    }
}


function createPieceElement(piece, isFlipped) {
    const pieceEl = document.createElement('div');
    pieceEl.classList.add('piece');
    
    // Use the is_deactivated flag directly from the piece data sent by the server.
    const imageName = piece.is_deactivated
        ? `비활성${piece.team}_${piece.korean_name}` 
        : `${piece.team}_${piece.korean_name}`;

    const [logicalY, logicalX] = piece.position;

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

function showValidMoves(validMoves, isFlipped, boardState) {
    validMoves.forEach(move => {
        const [logicalY, logicalX] = move;

        const visualY = isFlipped ? (BOARD_HEIGHT_CELLS - 1 - logicalY) : logicalY;
        const visualX = isFlipped ? (BOARD_WIDTH_CELLS - 1 - logicalX) : logicalX;

        const cell = gameBoard.querySelector(`.cell[data-y='${visualY}'][data-x='${visualX}']`);
        if (cell) {
            const dot = document.createElement('div');
            dot.classList.add('valid-move-dot');
            // Add class if the move is a capture
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

function drawLastMoveIndicator(lastMove, isFlipped) {
    const { from_pos, to_pos } = lastMove;
    [from_pos, to_pos].forEach(pos => {
        highlightElement(pos, 'last-move-marker', isFlipped);
    });
}

function drawAnnotations(gameState) {
    // Define arrowhead markers for different colors
    const defs = `<defs>
        <marker id="arrowhead-green" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#20C20E" />
        </marker>
        <marker id="arrowhead-red" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#FF4136" />
        </marker>
        <marker id="arrowhead-yellow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#FFDC00" />
        </marker>
    </defs>`;
    annotationLayer.innerHTML = defs;

    // Draw circles
    (gameState.drawnCircles || []).forEach(pos => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', CELL_SIZE * 0.45);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#20C20E'); // Default green for circles
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('opacity', '0.7');
        annotationLayer.appendChild(circle);
    });

    // Draw arrows
    (gameState.drawnArrows || []).forEach(arrow => {
        const { startPos, endPos, color } = arrow;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x1 = startPos.x * CELL_SIZE + CELL_SIZE / 2;
        const y1 = startPos.y * CELL_SIZE + CELL_SIZE / 2;
        const x2 = endPos.x * CELL_SIZE + CELL_SIZE / 2;
        const y2 = endPos.y * CELL_SIZE + CELL_SIZE / 2;
        
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
