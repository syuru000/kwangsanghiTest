// C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb\js\pieces.js

/**
 * 모든 기물의 부모 클래스
 */
class Piece {
    constructor(team, position) {
        this.team = team; // '초' or '한'
        this.position = position; // { y, x }
        this.name = this.constructor.name;
        this.hasMoved = false;
        // 한(漢)의 진행방향을 반대로 (초와 동일하게 y감소 방향으로) -> JS에서는 y좌표가 위에서 아래로 증가하므로, 초가 y 증가, 한이 y 감소
        this.forwardDir = team === '초' ? -1 : 1;
        this.generalGroup = '중앙'; // '좌', '우', '중앙'
        this.capturedGeneralGroup = null; // 이 기물이 잡은 장(Jang)의 그룹
    }

    /**
     * 이 기물이 현재 상태에서 이동할 수 있는 모든 유효한 좌표 리스트를 반환합니다.
     * @param {Array<Array<Piece>>} boardState - 현재 보드 상태
     * @param {GameState} gameState - 현재 게임 상태
     * @returns {Array<{y: number, x: number}>} - 이동 가능한 좌표의 배열
     */
    getValidMoves(boardState, gameState) {
        throw new Error("getValidMoves() must be implemented by subclasses");
    }

    /**
     * 주어진 위치가 유효한 타겟인지 확인합니다.
     * 1. 보드 범위 내에 있어야 합니다.
     * 2. 해당 위치에 같은 팀의 기물이 없어야 합니다.
     */
    _isValidTarget(pos, boardState, gameState) {
        const { y, x } = pos;
        if (y < 0 || y >= gameState.BOARD_HEIGHT_CELLS || x < 0 || x >= gameState.BOARD_WIDTH_CELLS) {
            return false;
        }
        const targetPiece = boardState[y][x];
        if (targetPiece && targetPiece.team === this.team) {
            return false;
        }
        return true;
    }
}

// --- 각 기물 클래스 정의 ---

class Su extends Piece { // 수(帥, K)
    get koreanName() { return '수'; }

    _getBaseMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 && dx === 0) continue;

                const newPos = { y: y + dy, x: x + dx };

                if (!gameState.isPosInBoard(newPos)) continue;
                if (!gameState.isInPalace(newPos, this.team)) continue;

                const isDiagonalMove = Math.abs(dy) === 1 && Math.abs(dx) === 1;
                if (isDiagonalMove) {
                    if (!gameState.isValidPalaceDiagonalMove(this.position, newPos, this.team)) {
                        continue;
                    }
                }

                if (this._isValidTarget(newPos, boardState, gameState)) {
                    moves.push(newPos);
                }
            }
        }
        return moves;
    }

    getValidMoves(boardState, gameState) {
        const baseMoves = this._getBaseMoves(boardState, gameState);
        const safeMoves = [];
        const opponentTeam = this.team === '초' ? '한' : '초';

        for (const move of baseMoves) {
            if (!gameState.isSquareUnderAttack(move, opponentTeam, boardState)) {
                safeMoves.push(move);
            }
        }
        return safeMoves;
    }
}

class Jang extends Piece { // 장(將, Q)
    get koreanName() { return '장'; }
    // 수와 행마법이 동일
    _getBaseMoves(boardState, gameState) {
        return Su.prototype._getBaseMoves.call(this, boardState, gameState);
    }
    getValidMoves(boardState, gameState) {
        return Su.prototype.getValidMoves.call(this, boardState, gameState);
    }
}

class Cha extends Piece { // 차(車, R)
    get koreanName() { return '차'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;

        // 1. 수직/수평 이동
        const directions = [{ y: -1, x: 0 }, { y: 1, x: 0 }, { y: 0, x: -1 }, { y: 0, x: 1 }];
        for (const dir of directions) {
            let ny = y + dir.y;
            let nx = x + dir.x;
            while (gameState.isPosInBoard({ y: ny, x: nx })) {
                const target = boardState[ny][nx];
                if (target === null) {
                    moves.push({ y: ny, x: nx });
                } else {
                    if (target.team !== this.team) {
                        moves.push({ y: ny, x: nx });
                    }
                    break;
                }
                ny += dir.y;
                nx += dir.x;
            }
        }

        // 2. 궁성 내 대각선 이동
        const palaceKeys = ['초', '초_좌', '초_우', '한', '한_좌', '한_우'];
        for (const key of palaceKeys) {
            if (!gameState.isInPalace(this.position, this.team, key)) continue;

            const diagonalPaths = gameState.getPalaceDiagonalPaths(key);
            for (const path of diagonalPaths) {
                if (path.some(p => p.y === y && p.x === x)) {
                    const currentIdx = path.findIndex(p => p.y === y && p.x === x);
                    
                    // 정방향
                    for (let i = currentIdx + 1; i < path.length; i++) {
                        const targetPos = path[i];
                        let isBlocked = false;
                        for (let j = currentIdx + 1; j < i; j++) {
                            if (boardState[path[j].y][path[j].x] !== null) {
                                isBlocked = true;
                                break;
                            }
                        }
                        if (isBlocked) break;

                        if (this._isValidTarget(targetPos, boardState, gameState)) {
                            moves.push(targetPos);
                        }
                        if (boardState[targetPos.y][targetPos.x] !== null) break;
                    }
                    // 역방향
                    for (let i = currentIdx - 1; i >= 0; i--) {
                        const targetPos = path[i];
                        let isBlocked = false;
                        for (let j = currentIdx - 1; j > i; j--) {
                             if (boardState[path[j].y][path[j].x] !== null) {
                                isBlocked = true;
                                break;
                            }
                        }
                        if (isBlocked) break;

                        if (this._isValidTarget(targetPos, boardState, gameState)) {
                            moves.push(targetPos);
                        }
                        if (boardState[targetPos.y][targetPos.x] !== null) break;
                    }
                }
            }
        }
        return moves;
    }
}

class Po extends Piece { // 포(包, C)
    get koreanName() { return '포'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;

        // 1. 수직/수평 점프 이동
        const directions = [{ y: -1, x: 0 }, { y: 1, x: 0 }, { y: 0, x: -1 }, { y: 0, x: 1 }];
        for (const dir of directions) {
            let jumped = false;
            let ny = y + dir.y;
            let nx = x + dir.x;
            while (gameState.isPosInBoard({ y: ny, x: nx })) {
                const target = boardState[ny][nx];
                if (!jumped) {
                    if (target !== null) {
                        if (target.name === 'Po') break;
                        jumped = true;
                    }
                } else {
                    if (target === null) {
                        if (this._isValidTarget({ y: ny, x: nx }, boardState, gameState)) {
                            moves.push({ y: ny, x: nx });
                        }
                    } else {
                        if (target.name !== 'Po' && target.team !== this.team) {
                            if (this._isValidTarget({ y: ny, x: nx }, boardState, gameState)) {
                                moves.push({ y: ny, x: nx });
                            }
                        }
                        break;
                    }
                }
                ny += dir.y;
                nx += dir.x;
            }
        }

        // 2. 궁성 내 대각선 점프 이동
        const palaceKeys = this.team === '초' ? ['초', '초_좌', '초_우'] : ['한', '한_좌', '한_우'];
        for (const key of palaceKeys) {
            if (!gameState.isInPalace(this.position, this.team, key)) continue;

            const { y1, x1, y2, x2 } = gameState.getPalaceBounds(key);
            const isCorner = (y === y1 && x === x1) || (y === y1 && x === x2) || (y === y2 && x === x1) || (y === y2 && x === x2);

            if (isCorner) {
                const cy = Math.floor((y1 + y2) / 2);
                const cx = Math.floor((x1 + x2) / 2);
                const jumpOverPiece = boardState[cy][cx];

                if (jumpOverPiece && jumpOverPiece.name !== 'Po') {
                    let ty, tx;
                    if (y === y1 && x === x1) { ty = y2; tx = x2; }
                    else if (y === y1 && x === x2) { ty = y2; tx = x1; }
                    else if (y === y2 && x === x1) { ty = y1; tx = x2; }
                    else if (y === y2 && x === x2) { ty = y1; tx = x1; }

                    const targetPos = { y: ty, x: tx };
                    const targetPiece = boardState[ty][tx];

                    if (targetPiece === null || (targetPiece.team !== this.team && targetPiece.name !== 'Po')) {
                        if (this._isValidTarget(targetPos, boardState, gameState)) {
                            moves.push(targetPos);
                        }
                    }
                }
            }
        }
        return moves;
    }
}

class Ma extends Piece { // 마(馬, N)
    get koreanName() { return '마'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        const potentialMoves = [
            { y: y - 2, x: x - 1, my: y - 1, mx: x }, { y: y - 2, x: x + 1, my: y - 1, mx: x },
            { y: y + 2, x: x - 1, my: y + 1, mx: x }, { y: y + 2, x: x + 1, my: y + 1, mx: x },
            { y: y - 1, x: x - 2, my: y, mx: x - 1 }, { y: y - 1, x: x + 2, my: y, mx: x + 1 },
            { y: y + 1, x: x - 2, my: y, mx: x - 1 }, { y: y + 1, x: x + 2, my: y, mx: x + 1 },
        ];
        for (const move of potentialMoves) {
            const myeokPos = { y: move.my, x: move.mx };
            const destPos = { y: move.y, x: move.x };
            if (gameState.isPosInBoard(myeokPos) && boardState[myeokPos.y][myeokPos.x] === null) {
                if (this._isValidTarget(destPos, boardState, gameState)) {
                    moves.push(destPos);
                }
            }
        }
        return moves;
    }
}

class Sang extends Piece { // 상(象, E)
    get koreanName() { return '상'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        const potentialMoves = [
            { y: y - 3, x: x - 2, my1: y - 1, mx1: x, my2: y - 2, mx2: x - 1 },
            { y: y - 3, x: x + 2, my1: y - 1, mx1: x, my2: y - 2, mx2: x + 1 },
            { y: y + 3, x: x - 2, my1: y + 1, mx1: x, my2: y + 2, mx2: x - 1 },
            { y: y + 3, x: x + 2, my1: y + 1, mx1: x, my2: y + 2, mx2: x + 1 },
            { y: y - 2, x: x - 3, my1: y, mx1: x - 1, my2: y - 1, mx2: x - 2 },
            { y: y - 2, x: x + 3, my1: y, mx1: x + 1, my2: y - 1, mx2: x + 2 },
            { y: y + 2, x: x - 3, my1: y, mx1: x - 1, my2: y + 1, mx2: x - 2 },
            { y: y + 2, x: x + 3, my1: y, mx1: x + 1, my2: y + 1, mx2: x + 2 },
        ];

        for (const move of potentialMoves) {
            const myeok1Pos = { y: move.my1, x: move.mx1 };
            const myeok2Pos = { y: move.my2, x: move.mx2 };
            const destPos = { y: move.y, x: move.x };

            if (gameState.isPosInBoard(myeok1Pos) && gameState.isPosInBoard(myeok2Pos) &&
                boardState[myeok1Pos.y][myeok1Pos.x] === null && boardState[myeok2Pos.y][myeok2Pos.x] === null) {
                if (this._isValidTarget(destPos, boardState, gameState)) {
                    moves.push(destPos);
                }
            }
        }
        return moves;
    }
}

class Sa extends Piece { // 사(士, A)
    get koreanName() { return '사'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 && dx === 0) continue;
                const newPos = { y: y + dy, x: x + dx };
                if (!gameState.isPosInBoard(newPos)) continue;
                if (!gameState.isInPalace(newPos, this.team)) continue;

                const isDiagonalMove = Math.abs(dy) === 1 && Math.abs(dx) === 1;
                if (isDiagonalMove) {
                    if (!gameState.isValidPalaceDiagonalMove({ y, x }, newPos, this.team)) {
                        continue;
                    }
                }

                if (this._isValidTarget(newPos, boardState, gameState)) {
                    moves.push(newPos);
                }
            }
        }
        return moves;
    }
}

class Bo extends Piece { // 보(步, P)
    get koreanName() { return '보'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;

        // 전진 (forwardDir은 초: 1, 한: -1)
        const forwardY = y + this.forwardDir;
        if (this._isValidTarget({ y: forwardY, x: x }, boardState, gameState)) {
            moves.push({ y: forwardY, x: x });
        }

        // 좌우
        if (this._isValidTarget({ y: y, x: x - 1 }, boardState, gameState)) {
            moves.push({ y: y, x: x - 1 });
        }
        if (this._isValidTarget({ y: y, x: x + 1 }, boardState, gameState)) {
            moves.push({ y: y, x: x + 1 });
        }
        
        // 궁성 내 대각선 이동
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 || dx === 0) continue; // 대각선만

                const newPos = { y: y + dy, x: x + dx };
                if (!gameState.isPosInBoard(newPos)) continue;

                // '초' 또는 '한'의 궁성 대각선 경로에 해당하는지 확인
                if (gameState.isValidPalaceDiagonalMove({y, x}, newPos, '초') || gameState.isValidPalaceDiagonalMove({y, x}, newPos, '한')) {
                    if (this._isValidTarget(newPos, boardState, gameState)) {
                        moves.push(newPos);
                    }
                }
            }
        }
        return moves;
    }
}

class Gi extends Piece { // 기(騎, G)
    get koreanName() { return '기'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        const forwardY = y + this.forwardDir;

        // 전방 대각선
        if (this._isValidTarget({ y: forwardY, x: x - 1 }, boardState, gameState)) {
            moves.push({ y: forwardY, x: x - 1 });
        }
        if (this._isValidTarget({ y: forwardY, x: x + 1 }, boardState, gameState)) {
            moves.push({ y: forwardY, x: x + 1 });
        }

        // 옆으로
        if (this._isValidTarget({ y: y, x: x - 1 }, boardState, gameState)) {
            moves.push({ y: y, x: x - 1 });
        }
        if (this._isValidTarget({ y: y, x: x + 1 }, boardState, gameState)) {
            moves.push({ y: y, x: x + 1 });
        }

        return moves;
    }
}

class Bok extends Piece { // 복(伏, M)
    get koreanName() { return '복'; }
    _getAttackRange(boardState, gameState) {
        const attackRange = [];
        const { y, x } = this.position;
        const directions = [{ y: -1, x: 0 }, { y: 1, x: 0 }, { y: 0, x: -1 }, { y: 0, x: 1 }];

        for (const dir of directions) {
            const path1 = { y: y + dir.y, x: x + dir.x };
            const path2 = { y: y + dir.y * 2, x: x + dir.x * 2 };

            if (!gameState.isPosInBoard(path1) || !gameState.isPosInBoard(path2)) continue;
            if (boardState[path1.y][path1.x] === null && boardState[path2.y][path2.x] === null) {
                let targets = [];
                if (dir.y !== 0) { // 상, 하
                    targets.push({ y: path2.y + dir.y, x: path2.x - 1 });
                    targets.push({ y: path2.y + dir.y, x: path2.x + 1 });
                } else { // 좌, 우
                    targets.push({ y: path2.y - 1, x: path2.x + dir.x });
                    targets.push({ y: path2.y + 1, x: path2.x + dir.x });
                }

                for (const targetPos of targets) {
                    if (gameState.isPosInBoard(targetPos)) {
                        attackRange.push(targetPos);
                    }
                }
            }
        }
        return attackRange;
    }

    getValidMoves(boardState, gameState) {
        const moves = [];
        const attackRange = this._getAttackRange(boardState, gameState);
        for (const pos of attackRange) {
            const target = boardState[pos.y][pos.x];
            if (target && target.team !== this.team) {
                moves.push(pos);
            }
        }
        return moves;
    }
}

class Yu extends Piece { // 유(遊, U)
    get koreanName() { return '유'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        const potentialMoves = [
            { y: y - 2, x: x - 2, my: y - 1, mx: x - 1 }, { y: y - 2, x: x + 2, my: y - 1, mx: x + 1 },
            { y: y + 2, x: x - 2, my: y + 1, mx: x - 1 }, { y: y + 2, x: x + 2, my: y + 1, mx: x + 1 },
        ];
        for (const move of potentialMoves) {
            const myeokPos = { y: move.my, x: move.mx };
            const destPos = { y: move.y, x: move.x };
            if (gameState.isPosInBoard(myeokPos) && boardState[myeokPos.y][myeokPos.x] === null) {
                if (this._isValidTarget(destPos, boardState, gameState)) {
                    moves.push(destPos);
                }
            }
        }
        return moves;
    }
}

class Gi_L extends Piece { // 기(奇, L)
    get koreanName() { return '기L'; }
    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;
        const directions = [{ y: -1, x: 0 }, { y: 1, x: 0 }, { y: 0, x: -1 }, { y: 0, x: 1 }];

        for (const dir of directions) {
            for (let i = 1; i <= 2; i++) {
                const ny = y + dir.y * i;
                const nx = x + dir.x * i;
                const newPos = { y: ny, x: nx };

                if (!gameState.isPosInBoard(newPos)) break;
                
                const target = boardState[ny][nx];
                if (target === null) {
                    moves.push(newPos);
                } else {
                    if (target.team !== this.team) {
                        moves.push(newPos);
                    }
                    break;
                }
            }
        }
        return moves;
    }
}

class Jeon extends Piece { // 전(前, F)
    get koreanName() { return '전'; }

    _isRestrictedArea(pos, gameState) {
        if (gameState.isInInnerArea(pos, '초') || gameState.isInInnerArea(pos, '한')) {
            return true;
        }
        if (gameState.isInPalace(pos, '초', null, true) || gameState.isInPalace(pos, '한', null, true)) {
            return true;
        }
        return false;
    }

    getValidMoves(boardState, gameState) {
        const moves = [];
        const { y, x } = this.position;

        const canCaptureTarget = (targetPos) => {
            const targetPiece = boardState[targetPos.y][targetPos.x];
            return !(targetPiece && targetPiece.name === 'Jeon');
        };

        // 차(Cha)와 유사한 로직 사용
        const chaMoves = Cha.prototype.getValidMoves.call(this, boardState, gameState);
        for (const move of chaMoves) {
            if (!this._isRestrictedArea(move, gameState) && canCaptureTarget(move)) {
                moves.push(move);
            }
        }
        return moves;
    }
}

class Hu extends Piece { // 후(後, B)
    get koreanName() { return '후'; }

    getValidMoves(boardState, gameState) {
        // 시작점이 외영 바깥이면 이동 불가
        if (gameState.isInOuterOuterArea(this.position, this.team)) {
            return [];
        }

        const moves = [];
        // 차(Cha)와 동일한 이동 기반
        const potentialMoves = Cha.prototype.getValidMoves.call(this, boardState, gameState);

        for (const move of potentialMoves) {
            // 도착점이 외영 바깥이 아니어야 함
            if (!gameState.isInOuterOuterArea(move, this.team)) {
                moves.push(move);
            }
        }
        return moves;
    }
}

// FEN 문자와 클래스 매핑
const PIECE_CLASS_MAP = {
    'k': Su, 'q': Jang, 'r': Cha, 'c': Po, 'n': Ma, 'e': Sang, 'a': Sa,
    'p': Bo, 'g': Gi, 'm': Bok, 'u': Yu, 'l': Gi_L, 'f': Jeon, 'b': Hu
};

// 기물 이름과 FEN 문자 매핑
const PIECE_FEN_MAP = {
    'Su': 'k', 'Jang': 'q', 'Cha': 'r', 'Po': 'c', 'Ma': 'n', 'Sang': 'e', 'Sa': 'a',
    'Bo': 'p', 'Gi': 'g', 'Bok': 'm', 'Yu': 'u', 'Gi_L': 'l', 'Jeon': 'f', 'Hu': 'b'
};

// 기물 이름과 한글 이름 매핑
const PIECE_KOREAN_NAME_MAP = {
    'Su': '수', 'Jang': '장', 'Cha': '차', 'Po': '포', 'Ma': '마', 'Sang': '상', 'Sa': '사',
    'Bo': '보', 'Gi': '기', 'Bok': '복', 'Yu': '유', 'Gi_L': '기L', 'Jeon': '전', 'Hu': '후'
}

export { Piece, Su, Jang, Cha, Po, Ma, Sang, Sa, Bo, Gi, Bok, Yu, Gi_L, Jeon, Hu, PIECE_CLASS_MAP, PIECE_FEN_MAP, PIECE_KOREAN_NAME_MAP };
