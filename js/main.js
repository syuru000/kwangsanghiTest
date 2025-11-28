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


// --- Mode: Local Game ---

function startLocalGame() {
    gameMode = 'local';
    localGameState = new GameState(); // From ksh_game_logic.js

    modeSelectionDiv.style.display = 'none';
    onlineControlsDiv.style.display = 'none';
    gameContainerDiv.style.display = 'flex';
    
    initializeUI(handleLocalClick);
    renderBoard(localGameState, '초'); // Default to '초' perspective

    resetButton.onclick = () => {
        if (confirm('현재 게임을 리셋하고 새 게임을 시작하시겠습니까?')) {
            localGameState.reset();
            renderBoard(localGameState, '초');
        }
    };
}

function handleLocalClick(pos) {
    if (gameMode !== 'local' || !localGameState) return;

    // Call the logic handler from our local game engine
    localGameState.handle_click([pos.y, pos.x]);

    // Re-render the board with the updated state
    renderBoard(localGameState, '초');
}


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