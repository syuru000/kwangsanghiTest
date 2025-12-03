// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\main.js

import { initializeUI, renderBoard, resizeBoard } from './ui.js';
import { uiState, updateCellSize } from './ui_state.js';

// --- This will be initialized on window load ---
let gameMode = null;
let localGameState = null;
let onlineGameClient = null;
let resizeTimer;

// --- Main setup on window load ---
window.addEventListener('load', () => {
    
    const modeSelectionDiv = document.getElementById('mode-selection');
    const gameContainerDiv = document.getElementById('game-container');
    const onlineControlsDiv = document.getElementById('online-controls');
    const resetButton = document.getElementById('reset-button');
    const boardWrapper = document.getElementById('board-wrapper');
    const annotationLayer = document.getElementById('annotation-layer');
    const gameBoard = document.getElementById('game-board');

    let isDrawing = false;
    let drawingStartPos = null;
    let tempArrow = null;
    let mouseDownTime = 0;
    const CLICK_THRESHOLD = 200;

    function getCellCoordsFromEvent(e) {
        if (!gameBoard) return null;
        const rect = gameBoard.getBoundingClientRect();
        if (uiState.cellSize === 0) return null; // Prevent division by zero
        const x = Math.floor((e.clientX - rect.left) / uiState.cellSize);
        const y = Math.floor((e.clientY - rect.top) / uiState.cellSize);
        if (y < 0 || y >= 14 || x < 0 || x >= 15) return null;
        return { y, x };
    }
    
    function resizeAndRender() {
        updateCellSize();
        resizeBoard();
        if (gameMode === 'local' && localGameState) {
            renderBoard(localGameState, '초');
        } else if (gameMode === 'online' && onlineGameClient && onlineGameClient.gameState) {
             renderBoard(onlineGameClient.gameState, onlineGameClient.playerTeam);
        }
    }

    // --- Local Game Handlers ---
    function handleBoardMouseDown(e) {
        if (gameMode !== 'local') return;
        mouseDownTime = Date.now();
        drawingStartPos = getCellCoordsFromEvent(e);
        
        if (e.button === 2) { // Right-click
            isDrawing = true;
        }
    }

    function handleBoardMouseMove(e) {
        if (gameMode !== 'local' || !isDrawing || !drawingStartPos) return;

        if (tempArrow) {
            tempArrow.remove();
        }
        const currentPos = getCellCoordsFromEvent(e);
        if (!currentPos) return;

        const color = e.shiftKey ? "#FFDC00" : "#20C20E";
        const markerId = e.shiftKey ? "yellow" : "green";
        const x1 = drawingStartPos.x * uiState.cellSize + (uiState.cellSize / 2);
        const y1 = drawingStartPos.y * uiState.cellSize + (uiState.cellSize / 2);
        const x2 = currentPos.x * uiState.cellSize + (uiState.cellSize / 2);
        const y2 = currentPos.y * uiState.cellSize + (uiState.cellSize / 2);

        if (!annotationLayer.querySelector('defs')) {
             annotationLayer.innerHTML = `<defs>
                <marker id="arrowhead-green" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#20C20E" /></marker>
                <marker id="arrowhead-red" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FF4136" /></marker>
                <marker id="arrowhead-yellow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#FFDC00" /></marker>
            </defs>`;
        }
        
        tempArrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempArrow.setAttribute('x1', x1); tempArrow.setAttribute('y1', y1);
        tempArrow.setAttribute('x2', x2); tempArrow.setAttribute('y2', y2);
        tempArrow.setAttribute('stroke', color);
        tempArrow.setAttribute('stroke-width', '4');
        tempArrow.setAttribute('opacity', '0.7');
        tempArrow.setAttribute('marker-end', `url(#arrowhead-${markerId})`);
        annotationLayer.appendChild(tempArrow);
    }

    function handleBoardMouseUp(e) {
        if (gameMode !== 'local') return;
        
        const clickDuration = Date.now() - mouseDownTime;
        const endPos = getCellCoordsFromEvent(e);

        if (e.button === 0 && clickDuration < CLICK_THRESHOLD && endPos) {
            localGameState.handle_click([endPos.y, endPos.x]);
        } else if (e.button === 2) {
            const wasDragged = isDrawing && drawingStartPos && endPos && (drawingStartPos.x !== endPos.x || drawingStartPos.y !== endPos.y);
            if (wasDragged) {
                const color = e.shiftKey ? "#FFDC00" : "#20C20E";
                localGameState.drawnArrows.push({ startPos: drawingStartPos, endPos, color });
            } else {
                localGameState.drawnArrows = [];
                localGameState.drawnCircles = [];
            }
        }

        if (tempArrow) tempArrow.remove();
        isDrawing = false;
        drawingStartPos = null;
        tempArrow = null;

        renderBoard(localGameState, '초');
    }

    // --- Game Mode Setup ---
    function startLocalGame() {
        gameMode = 'local';
        localGameState = new GameState();

        modeSelectionDiv.style.display = 'none';
        onlineControlsDiv.style.display = 'none';
        gameContainerDiv.style.display = 'flex';
        
        initializeUI();
        resizeAndRender(); // Initial size calculation
        
        boardWrapper.addEventListener('mousedown', handleBoardMouseDown);
        boardWrapper.addEventListener('mouseup', handleBoardMouseUp);
        boardWrapper.addEventListener('mousemove', handleBoardMouseMove);
        boardWrapper.addEventListener('contextmenu', e => e.preventDefault());

        resetButton.onclick = () => {
            if (confirm('현재 게임을 리셋하고 새 게임을 시작하시겠습니까?')) {
                localGameState.reset();
                renderBoard(localGameState, '초');
            }
        };
    }

    function startOnlineGame() {
        gameMode = 'online';

        const surrenderButton = document.getElementById('surrender-button');
        const homeButton = document.getElementById('home-button');
        const resetButton = document.getElementById('reset-button');

        modeSelectionDiv.style.display = 'none';
        onlineControlsDiv.style.display = 'block';
        gameContainerDiv.style.display = 'flex';
        resetButton.style.display = 'none';
        surrenderButton.style.display = 'inline-block';
        homeButton.style.display = 'inline-block';
        
        onlineGameClient = new GameClient();
        onlineGameClient.setupMultiplayerUI(onlineControlsDiv);
        
        initializeUI();
        resizeAndRender(); // Initial size calculation
        
        boardWrapper.addEventListener('mouseup', (e) => {
             if (gameMode !== 'online' || e.button !== 0) return;
             const pos = getCellCoordsFromEvent(e);
             if(pos && onlineGameClient) onlineGameClient.handleCellClick(pos);
        });

        homeButton.addEventListener('click', () => {
            if (confirm('게임을 중단하고 홈 화면으로 돌아가시겠습니까?')) {
                location.reload();
            }
        });

        surrenderButton.addEventListener('click', () => {
            if (confirm('정말로 기권하시겠습니까? 상대방이 승리하게 됩니다.')) {
                onlineGameClient.surrender();
            }
        });
    }

    const playLocalBtn = document.getElementById('play-local-btn');
    const playOnlineBtn = document.getElementById('play-online-btn');

    playLocalBtn.addEventListener('click', startLocalGame);
    playOnlineBtn.addEventListener('click', startOnlineGame);

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeAndRender, 150); // Debounce resize event
    });
});


// --- Online Game Client Class ---
class GameClient {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerTeam = null;
        this.gameState = {};
    }

    setupMultiplayerUI(container) {
        container.innerHTML = '';
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
            // Team is now assigned by 'game_joined' event
            document.getElementById('game-id-display').textContent = `게임 ID: ${this.gameId}. 복사해서 친구에게 전달하세요.`;
        });
        
        this.socket.on('game_joined', (data) => {
            this.gameId = data.game_id;
            this.playerTeam = data.team; // Server is the source of truth
            console.log(`Successfully joined game ${this.gameId} as team ${this.playerTeam}`);
            document.getElementById('game-id-display').textContent = `게임 참가 완료! 당신은 ${this.playerTeam}나라입니다.`;
        });

        this.socket.on('game_started', (data) => {
             // Team is already set, just update the message
             document.getElementById('game-id-display').textContent = `게임 시작! 당신은 ${this.playerTeam}나라입니다.`;
        });

        this.socket.on('update_state', (serverState) => {
            this.gameState = serverState;
            renderBoard(this.gameState, this.playerTeam);
        });

        this.socket.on('player_disconnected', (data) => alert(data.message));
        
        this.socket.on('game_over', (data) => {
            const reason = data.reason ? ` (사유: ${data.reason})` : '';
            alert(`게임 종료! ${data.winner}의 승리!${reason}`);
        });

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

    surrender() {
        if (!this.socket || !this.gameId) {
            alert('게임에 연결되어 있지 않아 기권할 수 없습니다.');
            return;
        }
        this.socket.emit('surrender', { game_id: this.gameId });
    }
}