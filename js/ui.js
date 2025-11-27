// C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb\js\ui.js

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;

const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const checkIndicator = document.getElementById('check-indicator');
const gameOverMessage = document.getElementById('game-over-message');
const moveHistory = document.getElementById('move-history');
const annotationLayer = document.getElementById('annotation-layer');


let onCellClickCallback = null;
let onHistoryClickCallback = null;
let onBoardMouseDownCallback = null;
let onBoardMouseUpCallback = null;

export function initializeUI(cellClickHandler, historyClickHandler, boardMouseDownHandler, boardMouseUpHandler) {
    const boardWrapper = document.getElementById('board-wrapper');
    gameBoard.innerHTML = '';
    onCellClickCallback = cellClickHandler;
    onHistoryClickCallback = historyClickHandler;
    onBoardMouseDownCallback = boardMouseDownHandler;
    onBoardMouseUpCallback = boardMouseUpHandler;

    // Prevent default right-click menu on the board
    boardWrapper.addEventListener('contextmenu', e => e.preventDefault());
    boardWrapper.addEventListener('mousedown', e => onBoardMouseDownCallback?.(e));
    boardWrapper.addEventListener('mouseup', e => onBoardMouseUpCallback?.(e));

    for (let y = 0; y < BOARD_HEIGHT_CELLS; y++) {
        for (let x = 0; x < BOARD_WIDTH_CELLS; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.y = y;
            cell.dataset.x = x;
            // The main 'click' event is for left-clicks to select/move pieces
            cell.addEventListener('click', () => {
                if (onCellClickCallback) {
                    onCellClickCallback({ y, x });
                }
            });
            gameBoard.appendChild(cell);
        }
    }
    
    // Add reset button event listener
    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
        // This will be handled in main.js
    });
}

export function renderBoard(gameState, isAnimating = false) {
    // Clear all existing valid moves, selections, and annotations
    gameBoard.querySelectorAll('.valid-move-dot').forEach(el => el.remove());
    gameBoard.querySelectorAll('.piece.selected').forEach(el => el.classList.remove('selected'));
    
    // Clear pieces only if not animating to avoid flicker
    if (!isAnimating) {
        gameBoard.querySelectorAll('.piece').forEach(el => el.remove());
    }

    // Draw pieces
    for (let y = 0; y < BOARD_HEIGHT_CELLS; y++) {
        for (let x = 0; x < BOARD_WIDTH_CELLS; x++) {
            const piece = gameState.boardState[y][x];
            
            // If not animating, create and append every piece from scratch
            if (!isAnimating && piece) {
                 const pieceEl = createPieceElement(piece, gameState);
                 gameBoard.appendChild(pieceEl);
            }
        }
    }

    // Highlight selected piece (only if not moving)
    if (gameState.selectedPiece && gameState.history_view_index === gameState.moveHistory.length) {
        const { y, x } = gameState.selectedPiece.position;
        const pieceEl = gameBoard.querySelector(`.piece[data-y='${y}'][data-x='${x}']`);
        if (pieceEl) {
            pieceEl.classList.add('selected');
        }
    }
    
    // Show valid moves (only if not moving)
    if (gameState.history_view_index === gameState.moveHistory.length) {
        showValidMoves(gameState);
    }
    
    // Update all UI panels and indicators
    updateInfoPanel(gameState);
    updateMoveHistory(gameState.moveHistory, gameState.history_view_index);
    drawLastMoveIndicator(gameState);
    drawAnnotations(gameState); // Draw user annotations
}

function createPieceElement(piece, gameState) {
    const pieceEl = document.createElement('div');
    pieceEl.classList.add('piece');
    
    const teamName = piece.team;
    const koreanName = piece.koreanName;
    
    let imageName = `${teamName}_${koreanName}`;
    
    const groupKey = `${piece.team}_${piece.generalGroup}`;
    if (piece.generalGroup !== '중앙' && piece.name !== 'Su' && gameState.deactivatedGroups[groupKey]) {
       imageName = `비활성${imageName}`;
    }

    pieceEl.style.backgroundImage = `url('images/${imageName}.png')`;
    pieceEl.dataset.y = piece.position.y;
    pieceEl.dataset.x = piece.position.x;
    pieceEl.style.left = `${piece.position.x * 40}px`;
    pieceEl.style.top = `${piece.position.y * 40}px`;
    pieceEl.style.width = '40px';
    pieceEl.style.height = '40px';
    
    return pieceEl;
}

export function animateAndRender(gameState, onCompleteCallback) {
    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    const { fromPos, toPos, capturedPieceName } = lastMove;

    const movingPieceEl = gameBoard.querySelector(`.piece[data-y='${fromPos.y}'][data-x='${fromPos.x}']`);
    const capturedPieceEl = gameBoard.querySelector(`.piece[data-y='${toPos.y}'][data-x='${toPos.x}']`);

    // Hide valid move dots and selection during animation
    gameBoard.querySelectorAll('.valid-move-dot').forEach(el => el.remove());
    if (movingPieceEl) movingPieceEl.classList.remove('selected');


    if (capturedPieceEl) {
        capturedPieceEl.style.opacity = '0';
        capturedPieceEl.style.transform = 'scale(0.5)';
    }

    if (movingPieceEl) {
        movingPieceEl.style.left = `${toPos.x * 40}px`;
        movingPieceEl.style.top = `${toPos.y * 40}px`;
        movingPieceEl.dataset.y = toPos.y;
        movingPieceEl.dataset.x = toPos.x;
    }
    
    // After animation, do a full re-render and execute callback
    setTimeout(() => {
        renderBoard(gameState, false);
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    }, 300); // Should match CSS transition time
}

function showValidMoves(gameState) {
    gameState.validMoves.forEach(move => {
        const { y, x } = move;
        const dot = document.createElement('div');
        dot.classList.add('valid-move-dot');
        
        const targetPiece = gameState.boardState[y][x];
        dot.classList.add(targetPiece ? 'capture' : 'move');

        // Position dot at the grid intersection
        dot.style.left = `${(x * 40) + 20}px`;
        dot.style.top = `${(y * 40) + 20}px`;
        
        gameBoard.appendChild(dot);
    });
}


export function updateInfoPanel(gameState) {
    const isLive = gameState.history_view_index === gameState.moveHistory.length;
    turnIndicator.textContent = isLive ? `${gameState.currentTurn}나라 턴` : `기보 보는 중...`;
    
    if (gameState.inCheckTeam) {
        checkIndicator.textContent = `${gameState.inCheckTeam} 장군!`;
    } else {
        checkIndicator.textContent = '';
    }

    if (gameState.gameOver && isLive) {
        gameOverMessage.textContent = `게임 종료! ${gameState.winner}의 승리!`;
        turnIndicator.textContent = '';
    } else {
        gameOverMessage.textContent = '';
    }

    // Update record controls state
    const viewIndex = gameState.history_view_index;
    const historyLength = gameState.moveHistory.length;
    document.getElementById('btn-to-start').disabled = (viewIndex === 0);
    document.getElementById('btn-prev').disabled = (viewIndex === 0);
    document.getElementById('btn-next').disabled = (viewIndex === historyLength);
    document.getElementById('btn-to-end').disabled = (viewIndex === historyLength);
}

export function updateMoveHistory(history, viewIndex) {
    moveHistory.innerHTML = '';
    
    const initialStateEntry = document.createElement('div');
    initialStateEntry.classList.add('move-entry');
    initialStateEntry.textContent = "시작 상태";
    initialStateEntry.dataset.index = 0;
    if (viewIndex === 0) {
        initialStateEntry.classList.add('highlighted');
    }
    initialStateEntry.addEventListener('click', () => onHistoryClickCallback?.(0));
    moveHistory.appendChild(initialStateEntry);

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = (i / 2) + 1;
        const choMove = history[i];
        const hanMove = (i + 1 < history.length) ? history[i + 1] : null;

        const lineText = `${moveNumber}. ${choMove.notation} ${hanMove ? hanMove.notation : ''}`;

        const entry = document.createElement('div');
        entry.classList.add('move-entry');
        entry.textContent = lineText;

        const clickIndex = hanMove ? i + 2 : i + 1;
        entry.dataset.index = clickIndex;

        if (viewIndex === i + 1 || viewIndex === i + 2) {
            entry.classList.add('highlighted');
        }

        entry.addEventListener('click', () => onHistoryClickCallback?.(clickIndex));
        moveHistory.appendChild(entry);
    }
    
    const highlightedEntry = moveHistory.querySelector('.highlighted');
    if (highlightedEntry) {
        highlightedEntry.scrollIntoView({ block: 'nearest' });
    }
}

function drawLastMoveIndicator(gameState) {
    // Clear previous indicators
    gameBoard.querySelectorAll('.last-move-marker').forEach(el => el.remove());

    const viewIndex = gameState.history_view_index;
    if (viewIndex > 0) {
        const lastMove = gameState.moveHistory[viewIndex - 1];
        const { fromPos, toPos } = lastMove;

        [fromPos, toPos].forEach(pos => {
            const marker = document.createElement('div');
            marker.classList.add('last-move-marker');
            marker.style.left = `${(pos.x * 40) + 20}px`;
            marker.style.top = `${(pos.y * 40) + 20}px`;
            gameBoard.appendChild(marker);
        });
    }
}

function drawAnnotations(gameState) {
    annotationLayer.innerHTML = ''; // Clear previous annotations

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

    const CELL_SIZE = 40;

    // Draw circles
    gameState.drawnCircles.forEach(pos => {
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
    gameState.drawnArrows.forEach(arrow => {
        const { startPos, endPos, color } = arrow;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x1 = startPos.x * CELL_SIZE + CELL_SIZE / 2;
        const y1 = startPos.y * CELL_SIZE + CELL_SIZE / 2;
        const x2 = endPos.x * CELL_SIZE + CELL_SIZE / 2;
        const y2 = endPos.y * CELL_SIZE + CELL_SIZE / 2;
        
        // A simple way to map colors to marker IDs
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
