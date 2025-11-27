// C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb\js\game.js

import { PIECE_CLASS_MAP, Piece } from './pieces.js';

const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;
const FEN = "3M3B3M3/RAE1REA1AER1EAR/1Q1L3K3L1Q1/N1C2NC1CN2C1N/3U3F3U3/PPP1GGG1PPP1GGG/15/15/ggg1ppp1ggg1ppp/3u3f3u/n1c2nc1cn2c1n/1q1l3k3l1q1/rae1rea1aer1ear/3m3b3m3";

export class GameState {
    constructor() {
        this.BOARD_WIDTH_CELLS = BOARD_WIDTH_CELLS;
        this.BOARD_HEIGHT_CELLS = BOARD_HEIGHT_CELLS;
        this.palaces = {};
        this.palaceDiagonalPaths = {};
        this.innerArea = {};
        this.outerAreaBounds = {};
        this.boardState = [];
        this.currentTurn = '초';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOVer = false;
        this.winner = null;
        this.deactivatedGroups = {};
        this.moveHistory = [];
        this.inCheckTeam = null;

        this._initializeBoardConstants();
        this.reset();
    }

    reset() {
        this.initialFen = FEN; // 초기 FEN 저장
        this.boardState = this.parseFen(this.initialFen);
        this.currentTurn = '초';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;
        this.winner = null;
        this.deactivatedGroups = { '초_좌': false, '초_우': false, '한_좌': false, '한_우': false };
        this.moveHistory = [];
        this.inCheckTeam = null;
        this.history_view_index = 0; // 현재 보고 있는 기보 인덱스
        
        // Annotation states
        this.drawnArrows = [];
        this.drawnCircles = [];
        this.drawingArrowStart = null;
    }

    goToHistoryState(index) {
        if (index < 0 || index > this.moveHistory.length) return;

        this.history_view_index = index;

        let fenToLoad;
        let groupsToLoad;

        if (index === 0) {
            fenToLoad = this.initialFen;
            // 새 게임 상태를 만들어 기본 비활성 그룹 상태를 가져옵니다.
            const tempState = new GameState();
            groupsToLoad = tempState.deactivatedGroups;
        } else {
            const moveData = this.moveHistory[index - 1];
            fenToLoad = moveData.fenAfter;
            groupsToLoad = moveData.deactivatedGroupsAfter;
        }

        this.boardState = this.parseFen(fenToLoad);
        this.deactivatedGroups = { ...groupsToLoad };
        this.currentTurn = (index % 2 === 0) ? '초' : '한';
        
        // 상태 초기화
        this.selectedPiece = null;
        this.validMoves = [];
        this.inCheckTeam = this.isSuInCheck(this.currentTurn, this.boardState) ? this.currentTurn : null;
        this.gameOver = this.isSuInCheck('초', this.boardState) || this.isSuInCheck('한', this.boardState) ? false : this.gameOver; //간단한 게임오버 로직, 추후 수정 필요

        console.log(`Went to history state ${index}. Turn: ${this.currentTurn}`);
    }
    
    isPosInBoard({ y, x }) {
        return y >= 0 && y < this.BOARD_HEIGHT_CELLS && x >= 0 && x < this.BOARD_WIDTH_CELLS;
    }


    _initializeBoardConstants() {
        this.palaces = {
            '한': { y1: 1, x1: 6, y2: 3, x2: 8 },
            '초': { y1: 10, x1: 6, y2: 12, x2: 8 },
            '한_좌': { y1: 1, x1: 0, y2: 3, x2: 2 },
            '한_우': { y1: 1, x1: 12, y2: 3, x2: 14 },
            '초_좌': { y1: 10, x1: 0, y2: 12, x2: 2 },
            '초_우': { y1: 10, x1: 12, y2: 12, x2: 14 },
        };
        
        // JS에서는 튜플 대신 객체 배열을 사용
        this.palaceDiagonalPaths = {
            '한': [
                [{y:1,x:6}, {y:2,x:7}, {y:3,x:8}], // 좌상 -> 중앙 -> 우하
                [{y:1,x:8}, {y:2,x:7}, {y:3,x:6}]  // 우상 -> 중앙 -> 좌하
            ],
            '초': [
                [{y:10,x:6}, {y:11,x:7}, {y:12,x:8}], // 좌상 -> 중앙 -> 우하
                [{y:10,x:8}, {y:11,x:7}, {y:12,x:6}]  // 우상 -> 중앙 -> 좌하
            ],
            '한_좌': [
                [{y:1,x:0}, {y:2,x:1}, {y:3,x:2}],
                [{y:1,x:2}, {y:2,x:1}, {y:3,x:0}]
            ],
            '한_우': [
                [{y:1,x:12}, {y:2,x:13}, {y:3,x:14}],
                [{y:1,x:14}, {y:2,x:13}, {y:3,x:12}]
            ],
            '초_좌': [
                [{y:10,x:0}, {y:11,x:1}, {y:12,x:2}],
                [{y:10,x:2}, {y:11,x:1}, {y:12,x:0}]
            ],
            '초_우': [
                [{y:10,x:12}, {y:11,x:13}, {y:12,x:14}],
                [{y:10,x:14}, {y:11,x:13}, {y:12,x:12}]
            ]
        };

        this.innerArea = {
            '한': { y1: 1, x1: 4, y2: 3, x2: 10 },
            '초': { y1: 10, x1: 4, y2: 12, x2: 10 }
        };

        this.outerAreaBounds = {
            '한': { y1: 0, x1: 3, y2: 4, x2: 11 },
            '초': { y1: 9, x1: 3, y2: 13, x2: 11 }
        };
    }
    
    getPalaceBounds(key) {
        return this.palaces[key];
    }
    
    getPalaceDiagonalPaths(key) {
        // 경로를 점의 배열로 반환
        const segments = this.palaceDiagonalPaths[key];
        const paths = [];
        // This logic can be simplified in JS. For now, we'll focus on Cha's movement.
        // Simplified version: just return segments for now
        return segments;
    }


    parseFen(fenString) {
        const board = Array(this.BOARD_HEIGHT_CELLS).fill(null).map(() => Array(this.BOARD_WIDTH_CELLS).fill(null));
        const [pieceFen, movedFen, groupFen] = fenString.split('|');

        // 1. 기물 배치
        const rows = pieceFen.split('/');
        for (let y = 0; y < rows.length; y++) {
            const rowStr = rows[y];
            if (y >= this.BOARD_HEIGHT_CELLS) continue;
            let x = 0;
            let i = 0;
            while (i < rowStr.length) {
                if (x >= this.BOARD_WIDTH_CELLS) break;
                const char = rowStr[i];
                if (/\d/.test(char)) {
                    let numStr = "";
                    while (i < rowStr.length && /\d/.test(rowStr[i])) {
                        numStr += rowStr[i];
                        i++;
                    }
                    x += parseInt(numStr, 10);
                } else {
                    const team = (char === char.toUpperCase()) ? '한' : '초';
                    const pieceClass = PIECE_CLASS_MAP[char.toLowerCase()];
                    if (pieceClass) {
                        const piece = new pieceClass(team, { y, x });
                        // FEN에 그룹 정보가 없을 경우를 대비한 기본값 설정
                        if (!groupFen) {
                            if (x < 4) piece.generalGroup = '좌';
                            else if (x > 10) piece.generalGroup = '우';
                            else piece.generalGroup = '중앙';
                        }
                        board[y][x] = piece;
                    }
                    x++;
                    i++;
                }
            }
        }

        // 2. hasMoved 상태 복원
        if (movedFen) {
            const movedRows = movedFen.split('/');
            for (let y = 0; y < movedRows.length; y++) {
                const rowStr = movedRows[y];
                if (y >= this.BOARD_HEIGHT_CELLS) continue;
                let x = 0;
                let i = 0;
                while (i < rowStr.length) {
                    if (x >= this.BOARD_WIDTH_CELLS) break;
                    const char = rowStr[i];
                    if (/\d/.test(char)) {
                        let numStr = "";
                        while (i < rowStr.length && /\d/.test(rowStr[i])) {
                            numStr += rowStr[i];
                            i++;
                        }
                        x += parseInt(numStr, 10);
                    } else {
                        if (board[y][x]) {
                            board[y][x].hasMoved = (char === 'm');
                        }
                        x++;
                        i++;
                    }
                }
            }
        }

        // 3. general_group 상태 복원
        if (groupFen) {
            const groupRows = groupFen.split('/');
            for (let y = 0; y < groupRows.length; y++) {
                const rowStr = groupRows[y];
                if (y >= this.BOARD_HEIGHT_CELLS) continue;
                let x = 0;
                let i = 0;
                while (i < rowStr.length) {
                    if (x >= this.BOARD_WIDTH_CELLS) break;
                    const char = rowStr[i];
                    if (/\d/.test(char)) {
                        let numStr = "";
                        while (i < rowStr.length && /\d/.test(rowStr[i])) {
                            numStr += rowStr[i];
                            i++;
                        }
                        x += parseInt(numStr, 10);
                    } else {
                        if (board[y][x]) {
                            if (char === 'L') board[y][x].generalGroup = '좌';
                            else if (char === 'R') board[y][x].generalGroup = '우';
                            else if (char === 'C') board[y][x].generalGroup = '중앙';
                        }
                        x++;
                        i++;
                    }
                }
            }
        }
        
        return board;
    }

    isInInnerArea(pos, team) {
        const { y, x } = pos;
        const area = this.innerArea[team];
        return y >= area.y1 && y <= area.y2 && x >= area.x1 && x <= area.x2;
    }
    
    isInOuterArea(pos, team) {
        const { y, x } = pos;
        if (!this.isPosInBoard(pos)) return false;
        
        const area = this.outerAreaBounds[team];
        const inOuterBounds = y >= area.y1 && y <= area.y2 && x >= area.x1 && x <= area.x2;
        
        return inOuterBounds && !this.isInInnerArea(pos, team);
    }
    
    isInOuterOuterArea(pos, team) {
         if (!this.isPosInBoard(pos)) return false;
         
         const isInner = this.isInInnerArea(pos, team);
         const isOuter = this.isInOuterArea(pos, team);
         const isMainPalace = this.isInPalace(pos, team, null, true);

         return !isInner && !isOuter && !isMainPalace;
    }

    isInPalace(pos, team, checkPalaceKey = null, checkMainPalaceOnly = false) {
        const { y, x } = pos;
        let keysToCheck = [];
        if (checkPalaceKey) {
            keysToCheck.push(checkPalaceKey);
        } else {
            keysToCheck.push(team); // 초 or 한
            if (!checkMainPalaceOnly) {
                keysToCheck.push(`${team}_좌`, `${team}_우`);
            }
        }

        for (const key of keysToCheck) {
            if (this.palaces[key]) {
                const { y1, x1, y2, x2 } = this.palaces[key];
                if (y >= y1 && y <= y2 && x >= x1 && x <= x2) {
                    return true;
                }
            }
        }
        return false;
    }
    
    isValidPalaceDiagonalMove(pos1, pos2, team) {
        const palaceKeys = [team, `${team}_좌`, `${team}_우`];
        for (const key of palaceKeys) {
            if (!this.palaceDiagonalPaths[key]) continue;

            // Iterate over each full diagonal path (e.g., corner-center-corner)
            for (const path of this.palaceDiagonalPaths[key]) {
                // Check for a valid move segment within the path
                for (let i = 0; i < path.length - 1; i++) {
                    const p1 = path[i];
                    const p2 = path[i+1];
                    // Check both directions of the segment
                    if ((p1.y === pos1.y && p1.x === pos1.x && p2.y === pos2.y && p2.x === pos2.x) ||
                        (p2.y === pos1.y && p2.x === pos1.x && p1.y === pos2.y && p1.x === pos2.x)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isSquareUnderAttack(square, attackingTeam, boardState) {
        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = boardState[r][c];
                if (piece && piece.team === attackingTeam) {
                    let attackMoves = [];
                    if (piece.name === 'Su' || piece.name === 'Jang') {
                         attackMoves = piece._getBaseMoves(boardState, this);
                    } else if (piece.name === 'Bok') {
                        attackMoves = piece._getAttackRange(boardState, this);
                    } else {
                        attackMoves = piece.getValidMoves(boardState, this);
                    }

                    if (attackMoves.some(move => move.y === square.y && move.x === square.x)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    findSuPosition(team, boardState) {
        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = boardState[r][c];
                if (piece && piece.name === 'Su' && piece.team === team) {
                    return { y: r, x: c };
                }
            }
        }
        return null;
    }
    
    isSuInCheck(team, boardState) {
        const suPos = this.findSuPosition(team, boardState);
        if (!suPos) return false;

        const attackingTeam = team === '초' ? '한' : '초';
        return this.isSquareUnderAttack(suPos, attackingTeam, boardState);
    }
    
    selectPiece(pos) {
        if (this.gameOver) return false;

        const { y, x } = pos;
        const targetPiece = this.boardState[y][x];

        // 유효 이동 경로 클릭
        if (this.selectedPiece && this.validMoves.some(move => move.y === y && move.x === x)) {
            this.movePiece(this.selectedPiece.position, { y, x });
            return true; // 이동이 발생했음
        }

        // 선택 해제
        if (this.selectedPiece && this.selectedPiece.position.y === y && this.selectedPiece.position.x === x) {
            this.selectedPiece = null;
            this.validMoves = [];
            return false;
        }

        // 새로운 기물 선택
        if (targetPiece && targetPiece.team === this.currentTurn) {
            const groupKey = `${targetPiece.team}_${targetPiece.generalGroup}`;
            if (targetPiece.generalGroup !== '중앙' && targetPiece.name !== 'Su' && this.deactivatedGroups[groupKey]) {
                console.log(`${groupKey} 그룹 비활성화됨`);
                this.selectedPiece = null;
                this.validMoves = [];
                return false;
            }

            this.selectedPiece = targetPiece;
            const potentialMoves = targetPiece.getValidMoves(this.boardState, this);
            
            // 자살수 필터링
            this.validMoves = potentialMoves.filter(move => {
                // 가상 이동
                // Create a deep copy of the board state for simulation
                const tempBoardState = this.boardState.map(row => row.map(piece => piece ? Object.assign(Object.create(Object.getPrototypeOf(piece)), piece) : null));

                const fromPos = this.selectedPiece.position;
                
                // Simulate the move
                tempBoardState[move.y][move.x] = tempBoardState[fromPos.y][fromPos.x];
                if (tempBoardState[move.y][move.x]) {
                    tempBoardState[move.y][move.x].position = { y: move.y, x: move.x };
                }
                tempBoardState[fromPos.y][fromPos.x] = null;
                
                // 자살수인지 확인
                return !this.isSuInCheck(this.currentTurn, tempBoardState);
            });

        } else {
            this.selectedPiece = null;
            this.validMoves = [];
        }
        return false; // 이동이 발생하지 않았음
    }

    generateFen() {
        let pieceRows = [];
        let movedRows = [];
        let groupRows = [];

        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            let emptyCountPiece = 0;
            let emptyCountMoved = 0;
            let emptyCountGroup = 0;
            let pieceRow = "";
            let movedRow = "";
            let groupRow = "";

            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = this.boardState[r][c];
                if (piece === null) {
                    emptyCountPiece++;
                    emptyCountMoved++;
                    emptyCountGroup++;
                } else {
                    if (emptyCountPiece > 0) {
                        pieceRow += emptyCountPiece;
                        emptyCountPiece = 0;
                    }
                    const fenChar = Object.keys(PIECE_CLASS_MAP).find(key => PIECE_CLASS_MAP[key] === piece.constructor);
                    pieceRow += piece.team === '한' ? fenChar.toUpperCase() : fenChar.toLowerCase();

                    if (emptyCountMoved > 0) {
                        movedRow += emptyCountMoved;
                        emptyCountMoved = 0;
                    }
                    movedRow += piece.hasMoved ? 'm' : '-';

                    if (emptyCountGroup > 0) {
                        groupRow += emptyCountGroup;
                        emptyCountGroup = 0;
                    }
                    if (piece.generalGroup === '좌') groupRow += 'L';
                    else if (piece.generalGroup === '우') groupRow += 'R';
                    else groupRow += 'C';
                }
            }
            if (emptyCountPiece > 0) pieceRow += emptyCountPiece;
            if (emptyCountMoved > 0) movedRow += emptyCountMoved;
            if (emptyCountGroup > 0) groupRow += emptyCountGroup;

            pieceRows.push(pieceRow);
            movedRows.push(movedRow);
            groupRows.push(groupRow);
        }
        return `${pieceRows.join('/')}|${movedRows.join('/')}|${groupRows.join('/')}`;
    }

    movePiece(fromPos, toPos) {
        // 기보 기록 (1): 이동 전 상태 저장
        const fenBefore = this.generateFen();

        const pieceToMove = this.boardState[fromPos.y][fromPos.x];
        const capturedPiece = this.boardState[toPos.y][toPos.x];

        // --- 게임 로직 ---
        if (capturedPiece && capturedPiece.name === 'Su') {
            this.gameOver = true;
            this.winner = pieceToMove.team;
        }

        if (capturedPiece && capturedPiece.name === 'Jang') {
            const groupKey = `${capturedPiece.team}_${capturedPiece.generalGroup}`;
            this.deactivatedGroups[groupKey] = true;
            pieceToMove.capturedGeneralGroup = groupKey;
        }

        if (capturedPiece && capturedPiece.capturedGeneralGroup) {
            this.deactivatedGroups[capturedPiece.capturedGeneralGroup] = false;
        }

        // 보드 상태 업데이트
        this.boardState[toPos.y][toPos.x] = pieceToMove;
        this.boardState[fromPos.y][fromPos.x] = null;
        pieceToMove.position = toPos;
        pieceToMove.hasMoved = true;
        
        // 기보 기록 (2): 이동 후 정보 취합 및 저장
        const fenAfter = this.generateFen();
        const deactivatedGroupsAfter = { ...this.deactivatedGroups };
        
        const moveData = {
            team: pieceToMove.team,
            pieceKoreanName: pieceToMove.koreanName,
            fromPos: fromPos,
            toPos: toPos,
            notation: `${String.fromCharCode(97 + fromPos.x)}${this.BOARD_HEIGHT_CELLS - fromPos.y}${String.fromCharCode(97 + toPos.x)}${this.BOARD_HEIGHT_CELLS - toPos.y}`,
            fenBefore: fenBefore,
            fenAfter: fenAfter,
            capturedPieceName: capturedPiece ? capturedPiece.koreanName : null,
            deactivatedGroupsAfter: deactivatedGroupsAfter
        };
        this.moveHistory.push(moveData);
        this.history_view_index = this.moveHistory.length; // Ensure view index stays at the live position

        // 턴 전환
        this.currentTurn = this.currentTurn === '초' ? '한' : '초';

        // 선택 해제
        this.selectedPiece = null;
        this.validMoves = [];
        
        // 장군 상태 확인
        this.inCheckTeam = this.isSuInCheck(this.currentTurn, this.boardState) ? this.currentTurn : null;

        console.log(`Moved from (${fromPos.y}, ${fromPos.x}) to (${toPos.y}, ${toPos.x})`);
        console.log(`Current turn: ${this.currentTurn}`);
    }
}
