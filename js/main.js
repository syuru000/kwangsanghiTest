// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\main.js

import { initializeUI, renderBoard } from './ui.js';

class GameClient {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerTeam = null; // '초' or '한'
        this.gameState = {}; // Server will be the source of truth

        this.setupMultiplayerUI();
        initializeUI(this.handleCellClick.bind(this));
    }

    setupMultiplayerUI() {
        const container = document.getElementById('multiplayer-controls');
        
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
            if (!this.socket) {
                this.setupSocketConnections();
            }
            this.socket.emit('create_game');
        });

        joinButton.addEventListener('click', () => {
            const gameIdToJoin = gameIdInput.value.trim();
            if (gameIdToJoin) {
                if (!this.socket) {
                    this.setupSocketConnections();
                }
                // FIX: Store the game ID on the client instance when joining.
                this.gameId = gameIdToJoin;
                this.socket.emit('join_game', { game_id: gameIdToJoin });
            } else {
                alert('참가할 게임의 ID를 입력하세요.');
            }
        });
    }

    setupSocketConnections() {
        const backendUrl = 'http://127.0.0.1:5000'; // 로컬 테스트용. 배포 시 Replit URL로 변경!
        
        this.socket = io(backendUrl, {
            transports: ['websocket'] 
        });

        this.socket.on('connect', () => {
            console.log('서버에 연결되었습니다. ID:', this.socket.id);
        });

        this.socket.on('game_created', (data) => {
            this.gameId = data.game_id;
            this.playerTeam = '초';
            document.getElementById('game-id-display').textContent = `게임 ID: ${this.gameId}. 상대방을 기다리세요...`;
        });

        this.socket.on('game_started', (data) => {
             if (!this.playerTeam) {
                this.playerTeam = '한';
             }
             document.getElementById('game-id-display').textContent = `게임 시작! 당신은 ${this.playerTeam}나라입니다.`;
        });

        this.socket.on('update_state', (serverState) => {
            console.log('State update received:', serverState);
            this.gameState = serverState;
            renderBoard(this.gameState, this.playerTeam);
        });

        this.socket.on('player_disconnected', (data) => {
            alert(data.message);
            document.getElementById('game-id-display').textContent = '상대방의 연결이 끊겼습니다.';
        });
        
        this.socket.on('game_over', (data) => {
            alert(`게임 종료! ${data.winner}의 승리!`);
        });

        this.socket.on('error', (data) => {
            console.error('Server error:', data.message);
            alert(`오류: ${data.message}`);
        });
    }

    handleCellClick(pos) {
        if (!this.socket || !this.gameId) {
            alert('먼저 게임을 생성하거나 참가해야 합니다.');
            return;
        }

        console.log(`Cell clicked:`, pos);
        this.socket.emit('handle_click', {
            game_id: this.gameId,
            pos: [pos.y, pos.x]
        });
    }
}

// --- Start the game ---
window.addEventListener('load', () => {
    new GameClient();
});