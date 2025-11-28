// C:\Users\rua06\testBot\discord_Py_game\KSH_betaWeb\js\main.js

import { initializeUI, renderBoard } from './ui.js';

class GameClient {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerTeam = null; // '초' or '한'
        this.gameState = {}; // Server will be the source of truth
        this.selectedPos = null;

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
                this.socket.emit('join_game', { game_id: gameIdToJoin });
            } else {
                alert('참가할 게임의 ID를 입력하세요.');
            }
        });
    }

    setupSocketConnections() {
        // !!! 중요 !!!
        // 이 URL을 실제 Replit 백엔드 주소로 변경해야 합니다.
        // 예: 'https://ksh-game-backend.your-username.replit.dev'
        const backendUrl = 'https://9040d67a-de41-4b2f-ba09-6b8bbadc9774-00-21d4400b72co7.sisko.replit.dev'; // 로컬 테스트용 주소
        
        this.socket = io(backendUrl, {
            transports: ['websocket'] 
        });

        this.socket.on('connect', () => {
            console.log('서버에 연결되었습니다. ID:', this.socket.id);
        });

        this.socket.on('game_created', (data) => {
            this.gameId = data.game_id;
            this.playerTeam = '초'; // 게임 생성자가 '초'
            document.getElementById('game-id-display').textContent = `게임이 생성되었습니다. ID: ${this.gameId}. 상대방을 기다리세요...`;
            console.log(`Game created. ID: ${this.gameId}, I am team: ${this.playerTeam}`);
        });

        this.socket.on('game_started', (data) => {
             if (!this.playerTeam) {
                this.playerTeam = '한'; // 참가자가 '한'
             }
             document.getElementById('game-id-display').textContent = `게임 시작! 당신은 ${this.playerTeam}나라입니다.`;
             console.log(`Game started. I am team: ${this.playerTeam}`);
        });

        this.socket.on('update_state', (serverState) => {
            console.log('Received state update from server:', serverState);
            this.gameState = serverState;
            // 로컬 선택 상태 초기화
            this.selectedPos = null; 
            // 새로운 상태로 보드 렌더링
            renderBoard(this.gameState, this.selectedPos, this.playerTeam);
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
        if (!this.socket || !this.gameId || !this.playerTeam) {
            alert('먼저 게임을 생성하거나 참가해야 합니다.');
            return;
        }

        if (this.gameState.current_turn !== this.playerTeam) {
            console.log('상대방의 턴입니다.');
            return;
        }
        
        if (this.gameState.game_over) {
            console.log('게임이 종료되었습니다.');
            return;
        }

        const pieceAtPos = this.gameState.board_state[pos.y][pos.x];

        // 1. 선택한 기물이 없고, 움직일 기물을 선택하려는 경우
        if (!this.selectedPos) {
            if (pieceAtPos && pieceAtPos.team === this.playerTeam) {
                this.selectedPos = pos;
                // UI 업데이트를 위해 보드 다시 렌더링
                renderBoard(this.gameState, this.selectedPos, this.playerTeam);
                console.log(`Selected piece at:`, pos);
            } else {
                console.log('움직일 수 있는 기물이 아니거나 빈 칸입니다.');
            }
        } 
        // 2. 이미 기물을 선택했고, 이제 이동할 위치를 클릭한 경우
        else {
            // 같은 위치를 다시 클릭하면 선택 해제
            if (this.selectedPos.y === pos.y && this.selectedPos.x === pos.x) {
                this.selectedPos = null;
                renderBoard(this.gameState, this.selectedPos, this.playerTeam);
                console.log('Selection cancelled.');
                return;
            }
            
            console.log(`Attempting move from ${JSON.stringify(this.selectedPos)} to ${JSON.stringify(pos)}`);
            
            this.socket.emit('make_move', {
                game_id: this.gameId,
                from_pos: [this.selectedPos.y, this.selectedPos.x],
                to_pos: [pos.y, pos.x]
            });

            // 서버로부터 update_state를 받으면 selectedPos는 자동으로 null이 됨
        }
    }
}

// --- Start the game ---
window.addEventListener('load', () => {
    new GameClient();
});
