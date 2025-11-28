// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\main.js

import { initializeUI, renderBoard } from './ui.js';

// --- Global State ---
let gameMode = null; // 'local' or 'online'
let localGameState = null;
let onlineGameClient = null;

// --- DOM Elements ---
const modeSelectionDiv = document.getElementById('mode-selection');
const gameContainerDiv = document.getElementById('game-container');
const onlineControlsDiv = document.getElementById('online-controls');
const resetButton = document.getElementById('reset-button');
const boardWrapper = document.getElementById('board-wrapper');
const annotationLayer = document.getElementById('annotation-layer');

// --- Drawing State (for Local Play) ---
let isDrawing = false;
let drawingStartPos = null;
let tempArrow = null;
let mouseDownTime = 0;
const CLICK_THRESHOLD = 150; // ms

// --- Mode: Local Game ---

function startLocalGame() {
    gameMode = 'local';
    localGameState = new GameState(); // From ksh_game_logic.js

    modeSelectionDiv.style.display = 'none';
    onlineControlsDiv.style.display = 'none';
    gameContainerDiv.style.display = 'flex';
    
    // Pass the actual click handler function to UI
    initializeUI(handleLocalClick);
    
    // Add board interaction listeners only for local mode
    boardWrapper.addEventListener('mousedown', handleBoardMouseDown);
    boardWrapper.addEventListener('mouseup', handleBoardMouseUp);
    boardWrapper.addEventListener('mousemove', handleBoardMouseMove);
    boardWrapper.addEventListener('contextmenu', e => e.preventDefault());

    renderBoard(localGameState, '초'); // Default to '초' perspective

    resetButton.onclick = () => {
        if (confirm('현재 게임을 리셋하고 새 게임을 시작하시겠습니까?')) {
            localGameState.reset();
            renderBoard(localGameState, '초');
        }
    };
}

function getCellCoordsFromEvent(e) {
    const rect = gameBoard.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 40);
    const y = Math.floor((e.clientY - rect.top) / 40);
    if (y < 0 || y >= 14 || x < 0 || x >= 15) return null;
    return { y, x };
}

function handleBoardMouseDown(e) {
    mouseDownTime = Date.now();
    // Drawing is handled by right-click / context menu events
    if (e.button !== 2) return; // Only for right-click

    isDrawing = true;
    drawingStartPos = getCellCoordsFromEvent(e);

    // If right-clicking without dragging, we'll clear annotations on mouseup
}

function handleBoardMouseMove(e) {
    if (!isDrawing || !drawingStartPos) return;

    if (tempArrow) {
        tempArrow.remove();
    }
    const currentPos = getCellCoordsFromEvent(e);
    if (!currentPos) return;

    const color = e.shiftKey ? "#FFDC00" : "#20C20E"; // Yellow for Shift, Green otherwise
    const markerId = e.shiftKey ? "yellow" : "green";

    const x1 = drawingStartPos.x * 40 + 20;
    const y1 = drawingStartPos.y * 40 + 20;
    const x2 = currentPos.x * 40 + 20;
    const y2 = currentPos.y * 40 + 20;

    // Make sure defs for markers are present
    if (!annotationLayer.querySelector('defs')) {
         annotationLayer.innerHTML = `<defs>
            <marker id="arrowhead-green" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#20C20E" /></marker>
            <marker id="arrowhead-red" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FF4136" /></marker>
            <marker id="arrowhead-yellow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FFDC00" /></marker>
        </defs>`;
    }
    
    tempArrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempArrow.setAttribute('x1', x1);
    tempArrow.setAttribute('y1', y1);
    tempArrow.setAttribute('x2', x2);
    tempArrow.setAttribute('y2', y2);
    tempArrow.setAttribute('stroke', color);
    tempArrow.setAttribute('stroke-width', '4');
    tempArrow.setAttribute('opacity', '0.7');
    tempArrow.setAttribute('marker-end', `url(#arrowhead-${markerId})`);
    annotationLayer.appendChild(tempArrow);
}


function handleBoardMouseUp(e) {
    const isRightClick = e.button === 2;
    const endPos = getCellCoordsFromEvent(e);

    if (isDrawing && drawingStartPos && endPos && (drawingStartPos.x !== endPos.x || drawingStartPos.y !== endPos.y)) {
        // Finalize arrow drawing
        const color = e.shiftKey ? "#FFDC00" : "#20C20E";
        localGameState.drawnArrows.push({ startPos: drawingStartPos, endPos, color });
    } else if (isRightClick) {
        // If it was a simple right-click (no drag), clear annotations
        localGameState.drawnArrows = [];
        localGameState.drawnCircles = [];
    }

    // Cleanup drawing state
    if (tempArrow) tempArrow.remove();
    isDrawing = false;
    drawingStartPos = null;
    tempArrow = null;

    // Re-render to show permanent arrows or clear them
    renderBoard(localGameState, '초');
}


function handleLocalClick(pos) {
    if (gameMode !== 'local' || !localGameState) return;

    // Check if the mouseup event is part of a drag (drawing)
    if (Date.now() - mouseDownTime > CLICK_THRESHOLD && isDrawing) {
        return; // It was a drag, not a click for moving a piece
    }
    
    // If it's a quick click, handle piece movement
    localGameState.handle_click([pos.y, pos.x]);

    // Re-render the board with the updated state
    renderBoard(localGameState, '초');
}
// Add the new click handler to the board wrapper
boardWrapper.addEventListener('mousedown', (e) => mouseDownTime = Date.now());
boardWrapper.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return; // Only left clicks for piece moves
    const clickDuration = Date.now() - mouseDownTime;
    if (clickDuration < CLICK_THRESHOLD) {
        const pos = getCellCoordsFromEvent(e);
        if(pos) handleLocalClick(pos);
    }
});


// --- Mode: Online Game ---

function startOnlineGame() {
    gameMode = 'online';

    modeSelectionDiv.style.display = 'none';
    onlineControlsDiv.style.display = 'block';
    gameContainerDiv.style.display = 'flex';
    
    onlineGameClient = new GameClient();
    onlineGameClient.setupMultiplayerUI(onlineControlsDiv);
    
    initializeUI(onlineGameClient.handleCellClick.bind(onlineGameClient));

    resetButton.onclick = () => {
        alert('온라인 게임은 서버에서 리셋해야 합니다.');
    };
}

class GameClient {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerTeam = null; // '초' or '한'
        this.gameState = {}; // Server is the source of truth
    }

    setupMultiplayerUI(container) {
        container.innerHTML = ''; // Clear previous content
        
        const gameIdDisplay = document.createElement('p');
        gameIdDisplay.id = 'game-id-display';
        gameIdDisplay.textContent = '게임에 참여하거나 새로 생성하세요.';

        const gameIdInput = document.createElement('input');
        gameIdInput.id = 'game-id-input';
        gameIdInput.type = 'text';
        gameIdInput.placeholder = '여기에 게임 ID 입력';

        const createButton = document.createElement('button');
        createButton.id = 'create-game-btn';
        createButton.textContent = '새 게임 생성';
        
        const joinButton = document.createElement('button');
        joinButton.id = 'join-game-btn';
        joinButton.textContent = '게임 참가';

        container.append(createButton, gameIdInput, joinButton, gameIdDisplay);

        createButton.addEventListener('click', () => {
            if (!this.socket) this.setupSocketConnections();
            this.socket.emit('create_game');
        });

        joinButton.addEventListener('click', () => {
            const gameIdToJoin = gameIdInput.value.trim();
            if (gameIdToJoin) {
                if (!this.socket) this.setupSocketConnections();
                this.gameId = gameIdToJoin;
                this.socket.emit('join_game', { game_id: gameIdToJoin });
            } else {
                alert('참가할 게임의 ID를 입력하세요.');
            }
        });
    }

    setupSocketConnections() {
        const backendUrl = 'https://9040d67a-de41-4b2f-ba09-6b8bbadc9774-00-21d4400b72co7.sisko.replit.dev';
        
        this.socket = io(backendUrl, { transports: ['websocket'] });

        this.socket.on('connect', () => console.log('서버에 연결되었습니다. ID:', this.socket.id));

        this.socket.on('game_created', (data) => {
            this.gameId = data.game_id;
            this.playerTeam = '초';
            document.getElementById('game-id-display').textContent = `게임 ID: ${this.gameId}. 복사해서 친구에게 전달하세요.`;
        });

        this.socket.on('game_started', (data) => {
             if (!this.playerTeam) this.playerTeam = '한';
             document.getElementById('game-id-display').textContent = `게임 시작! 당신은 ${this.playerTeam}나라입니다.`;
        });

        this.socket.on('update_state', (serverState) => {
            this.gameState = serverState;
            renderBoard(this.gameState, this.playerTeam);
        });

        this.socket.on('player_disconnected', (data) => alert(data.message));
        this.socket.on('game_over', (data) => alert(`게임 종료! ${data.winner}의 승리!`));
        this.socket.on('error', (data) => alert(`오류: ${data.message}`));
    }

    handleCellClick(pos) {
        if (!this.socket || !this.gameId) {
            alert('먼저 게임을 생성하거나 참가해야 합니다.');
            return;
        }
        this.socket.emit('handle_click', {
            game_id: this.gameId,
            pos: [pos.y, pos.x]
        });
    }
}


// --- Initial Setup ---
window.addEventListener('load', () => {
    const playLocalBtn = document.getElementById('play-local-btn');
    const playOnlineBtn = document.getElementById('play-online-btn');

    playLocalBtn.addEventListener('click', startLocalGame);
    playOnlineBtn.addEventListener('click', startOnlineGame);
});