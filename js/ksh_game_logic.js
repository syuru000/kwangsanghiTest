// --- Constants ---
const BOARD_WIDTH_CELLS = 15;
const BOARD_HEIGHT_CELLS = 14;
const FEN = "3M3B3M3/RAE1REA1AER1EAR/1Q1L3K3L1Q1/N1C2NC1CN2C1N/3U3F3U3/PPP1GGG1PPP1GGG/15/15/ggg1ppp1ggg1ppp/3u3f3u/n1c2nc1cn2c1n/1q1l3k3l1q1/rae1rea1aer1ear/3m3b3m3";

// --- Piece Classes ---

class Piece {
    constructor(team, position) {
        this.team = team;
        this.position = position; // [y, x] array
        this.name = this.constructor.name;
        this.has_moved = false;
        this.forward_dir = team === '초' ? -1 : 1;
        this.general_group = '중앙';
        this.captured_general_group = null;
    }

    get_valid_moves(board_state, game_state) {
        throw new Error("NotImplementedError");
    }

    _is_valid_target(pos, board_state, game_state) {
        const [y, x] = pos;
        if (!(y >= 0 && y < game_state.BOARD_HEIGHT_CELLS && x >= 0 && x < game_state.BOARD_WIDTH_CELLS)) {
            return false;
        }
        const target_piece = board_state[y][x];
        if (target_piece && target_piece.team === this.team) {
            return false;
        }
        return true;
    }
}


class Su extends Piece {
    get korean_name() { return '수'; }

    _get_base_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        for (const dy of [-1, 0, 1]) {
            for (const dx of [-1, 0, 1]) {
                if (dy === 0 && dx === 0) continue;
                const ny = y + dy;
                const nx = x + dx;
                const move = [ny, nx];
                if (!(ny >= 0 && ny < game_state.BOARD_HEIGHT_CELLS && nx >= 0 && nx < game_state.BOARD_WIDTH_CELLS)) continue;
                if (!game_state.is_in_palace(move, this.team)) continue;

                const is_diagonal_move = Math.abs(dy) === 1 && Math.abs(dx) === 1;
                if (is_diagonal_move && !game_state.is_valid_palace_diagonal_move(y, x, ny, nx, this.team)) continue;

                if (this._is_valid_target(move, board_state, game_state)) {
                    moves.push(move);
                }
            }
        }
        return moves;
    }

    get_valid_moves(board_state, game_state) {
        const base_moves = this._get_base_moves(board_state, game_state);
        const safe_moves = [];
        const opponent_team = this.team === '초' ? '한' : '초';
        for (const move of base_moves) {
            if (!game_state.is_square_under_attack(move, opponent_team, board_state)) {
                safe_moves.push(move);
            }
        }
        return safe_moves;
    }
}

class Jang extends Piece {
    get korean_name() { return '장'; }
    get_valid_moves(board_state, game_state) {
        return Su.prototype.get_valid_moves.call(this, board_state, game_state);
    }
    _get_base_moves(board_state, game_state) {
        return Su.prototype._get_base_moves.call(this, board_state, game_state);
    }
}

class Cha extends Piece {
    get korean_name() { return '차'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dy, dx] of directions) {
            let ny = y + dy;
            let nx = x + dx;
            while (ny >= 0 && ny < game_state.BOARD_HEIGHT_CELLS && nx >= 0 && nx < game_state.BOARD_WIDTH_CELLS) {
                const target = board_state[ny][nx];
                if (target === null) {
                    moves.push([ny, nx]);
                } else {
                    if (target.team !== this.team) {
                        moves.push([ny, nx]);
                    }
                    break;
                }
                ny += dy;
                nx += dx;
            }
        }

        const palace_keys_to_check = ['초', '초_좌', '초_우', '한', '한_좌', '한_우'];
        for (const key of palace_keys_to_check) {
            const [y1_palace, x1_palace, y2_palace, x2_palace] = game_state.palaces[key];
            // Check if the piece is inside this specific palace
            if (!(y >= y1_palace && y <= y2_palace && x >= x1_palace && x <= x2_palace)) {
                continue;
            }
            
            const [y1, x1, y2, x2] = game_state.palaces[key];
            const cy = Math.floor((y1 + y2) / 2);
            const cx = Math.floor((x1 + x2) / 2);
            const diagonal_paths = [ [[y1, x1], [cy, cx], [y2, x2]], [[y1, x2], [cy, cx], [y2, x1]] ];

            for (const path of diagonal_paths) {
                 const pos_in_path = path.some(p => p[0] === this.position[0] && p[1] === this.position[1]);
                 if (!pos_in_path) continue;

                const current_idx = path.findIndex(p => p[0] === this.position[0] && p[1] === this.position[1]);

                for (let i = current_idx + 1; i < path.length; i++) {
                    const target_pos = path[i];
                    let is_blocked = false;
                    for(let j = current_idx + 1; j < i; j++){
                        if(board_state[path[j][0]][path[j][1]] !== null){
                            is_blocked = true;
                            break;
                        }
                    }
                    if (is_blocked) break;
                    if (this._is_valid_target(target_pos, board_state, game_state)) {
                        moves.push(target_pos);
                    }
                    if (board_state[target_pos[0]][target_pos[1]] !== null) break;
                }

                for (let i = current_idx - 1; i >= 0; i--) {
                    const target_pos = path[i];
                     let is_blocked = false;
                    for(let j = current_idx - 1; j > i; j--){
                        if(board_state[path[j][0]][path[j][1]] !== null){
                            is_blocked = true;
                            break;
                        }
                    }
                    if (is_blocked) break;
                    if (this._is_valid_target(target_pos, board_state, game_state)) {
                        moves.push(target_pos);
                    }
                    if (board_state[target_pos[0]][target_pos[1]] !== null) break;
                }
            }
        }
        return moves;
    }
}

class Po extends Piece {
    get korean_name() { return '포'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dy, dx] of directions) {
            let jumped = false;
            let ny = y + dy;
            let nx = x + dx;
            while (ny >= 0 && ny < game_state.BOARD_HEIGHT_CELLS && nx >= 0 && nx < game_state.BOARD_WIDTH_CELLS) {
                const target = board_state[ny][nx];
                if (!jumped) {
                    if (target !== null) {
                        if (target.name === 'Po') break;
                        jumped = true;
                    }
                } else {
                    if (target === null) {
                        if (this._is_valid_target([ny, nx], board_state, game_state)) moves.push([ny, nx]);
                    } else {
                        if (target.name !== 'Po' && target.team !== this.team) {
                            if (this._is_valid_target([ny, nx], board_state, game_state)) moves.push([ny, nx]);
                        }
                        break;
                    }
                }
                ny += dy;
                nx += dx;
            }
        }
        
        const palace_keys_to_check = this.team === '초' ? ['초', '초_좌', '초_우'] : ['한', '한_좌', '한_우'];
        for (const key of palace_keys_to_check) {
            if (!game_state.is_in_palace(this.position, this.team, { check_palace_key: key })) continue;
            
            const [y1, x1, y2, x2] = game_state.palaces[key];
            const cy = Math.floor((y1 + y2) / 2);
            const cx = Math.floor((x1 + x2) / 2);
            const is_corner = [[y1, x1], [y1, x2], [y2, x1], [y2, x2]].some(p => p[0] === this.position[0] && p[1] === this.position[1]);

            if (is_corner) {
                const jump_over_piece = board_state[cy][cx];
                if (jump_over_piece && jump_over_piece.name !== 'Po') {
                    let ty = 0, tx = 0;
                    if (this.position[0] === y1 && this.position[1] === x1) { ty = y2; tx = x2; }
                    else if (this.position[0] === y1 && this.position[1] === x2) { ty = y2; tx = x1; }
                    else if (this.position[0] === y2 && this.position[1] === x1) { ty = y1; tx = x2; }
                    else if (this.position[0] === y2 && this.position[1] === x2) { ty = y1; tx = x1; }
                    
                    const target_pos = [ty, tx];
                    const target_piece = board_state[ty][tx];
                    if (!target_piece || (target_piece.team !== this.team && target_piece.name !== 'Po')) {
                        if (this._is_valid_target(target_pos, board_state, game_state)) moves.push(target_pos);
                    }
                }
            }
        }
        return moves;
    }
}

class Ma extends Piece {
    get korean_name() { return '마'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const potential_moves = [
            [y - 2, x - 1, y - 1, x], [y - 2, x + 1, y - 1, x],
            [y + 2, x - 1, y + 1, x], [y + 2, x + 1, y + 1, x],
            [y - 1, x - 2, y, x - 1], [y - 1, x + 2, y, x + 1],
            [y + 1, x - 2, y, x - 1], [y + 1, x + 2, y, x + 1],
        ];

        for (const [dest_y, dest_x, myeok_y, myeok_x] of potential_moves) {
            const destination = [dest_y, dest_x];
            if (!(myeok_y >= 0 && myeok_y < game_state.BOARD_HEIGHT_CELLS && myeok_x >= 0 && myeok_x < game_state.BOARD_WIDTH_CELLS)) continue;
            if (board_state[myeok_y][myeok_x] !== null) continue;
            if (this._is_valid_target(destination, board_state, game_state)) {
                moves.push(destination);
            }
        }
        return moves;
    }
}

class Sang extends Piece {
    get korean_name() { return '상'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const potential_moves = [
            [y - 3, x - 2, y - 1, x, y - 2, x - 1], [y - 3, x + 2, y - 1, x, y - 2, x + 1],
            [y + 3, x - 2, y + 1, x, y + 2, x - 1], [y + 3, x + 2, y + 1, x, y + 2, x + 1],
            [y - 2, x - 3, y, x - 1, y - 1, x - 2], [y - 2, x + 3, y, x + 1, y - 1, x + 2],
            [y + 2, x - 3, y, x - 1, y + 1, x - 2], [y + 2, x + 3, y, x + 1, y + 1, x + 2],
        ];

        for (const [dest_y, dest_x, my1, mx1, my2, mx2] of potential_moves) {
            const m1_valid = (my1 >= 0 && my1 < 14 && mx1 >= 0 && mx1 < 15);
            const m2_valid = (my2 >= 0 && my2 < 14 && mx2 >= 0 && mx2 < 15);
            if (!m1_valid || !m2_valid) continue;

            const m1_blocked = board_state[my1][mx1] !== null;
            const m2_blocked = board_state[my2][mx2] !== null;
            if (m1_blocked || m2_blocked) continue;

            if (this._is_valid_target([dest_y, dest_x], board_state, game_state)) {
                moves.push([dest_y, dest_x]);
            }
        }
        return moves;
    }
}

class Sa extends Piece {
    get korean_name() { return '사'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        for (const dy of [-1, 0, 1]) {
            for (const dx of [-1, 0, 1]) {
                if (dy === 0 && dx === 0) continue;
                const ny = y + dy;
                const nx = x + dx;
                if (!(ny >= 0 && ny < game_state.BOARD_HEIGHT_CELLS && nx >= 0 && nx < game_state.BOARD_WIDTH_CELLS)) continue;
                if (!game_state.is_in_palace([ny, nx], this.team)) continue;

                const is_diagonal_move = Math.abs(dy) === 1 && Math.abs(dx) === 1;
                if (is_diagonal_move && !game_state.is_valid_palace_diagonal_move(y, x, ny, nx, this.team)) continue;
                
                if (this._is_valid_target([ny, nx], board_state, game_state)) {
                    moves.push([ny, nx]);
                }
            }
        }
        return moves;
    }
}

class Bo extends Piece {
    get korean_name() { return '보'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        
        const forward_y = y + this.forward_dir;
        if (this._is_valid_target([forward_y, x], board_state, game_state)) moves.push([forward_y, x]);
        if (this._is_valid_target([y, x - 1], board_state, game_state)) moves.push([y, x - 1]);
        if (this._is_valid_target([y, x + 1], board_state, game_state)) moves.push([y, x + 1]);

        // Palace diagonal moves for 'Bo'
        for (const dy of [-1, 1]) {
            for (const dx of [-1, 1]) {
                const ny = y + dy;
                const nx = x + dx;
                if(game_state.is_in_palace([y,x], '초') || game_state.is_in_palace([y,x], '한')){
                     if (game_state.is_valid_palace_diagonal_move(y, x, ny, nx, this.team)) {
                        if (this._is_valid_target([ny, nx], board_state, game_state)) {
                            moves.push([ny, nx]);
                        }
                    }
                }
            }
        }
        return moves;
    }
}

class Gi extends Piece {
    get korean_name() { return '기'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const forward_y = y + this.forward_dir;
        
        if (this._is_valid_target([forward_y, x - 1], board_state, game_state)) moves.push([forward_y, x - 1]);
        if (this._is_valid_target([forward_y, x + 1], board_state, game_state)) moves.push([forward_y, x + 1]);
        if (this._is_valid_target([y, x - 1], board_state, game_state)) moves.push([y, x - 1]);
        if (this._is_valid_target([y, x + 1], board_state, game_state)) moves.push([y, x + 1]);
        
        return moves;
    }
}

class Bok extends Piece {
    get korean_name() { return '복'; }
    _get_attack_range(board_state) {
        const [y, x] = this.position;
        const attack_range = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dy, dx] of directions) {
            const path1 = [y + dy, x + dx];
            const path2 = [y + dy * 2, x + dx * 2];
            const [path1_y, path1_x] = path1;
            const [path2_y, path2_x] = path2;

            if (!(path1_y >= 0 && path1_y < 14 && path1_x >= 0 && path1_x < 15 && path2_y >= 0 && path2_y < 14 && path2_x >= 0 && path2_x < 15)) continue;
            
            if (board_state[path1_y][path1_x] === null && board_state[path2_y][path2_x] === null) {
                let targets = [];
                if (dy !== 0) { // Moving vertically
                    targets = [[path2_y + dy, path2_x - 1], [path2_y + dy, path2_x + 1]];
                } else { // Moving horizontally
                    targets = [[path2_y - 1, path2_x + dx], [path2_y + 1, path2_x + dx]];
                }
                for (const [ty, tx] of targets) {
                    if (ty >= 0 && ty < 14 && tx >= 0 && tx < 15) {
                        attack_range.push([ty, tx]);
                    }
                }
            }
        }
        return attack_range;
    }

    get_valid_moves(board_state, game_state) {
        const moves = [];
        const attack_range = this._get_attack_range(board_state);
        for (const pos of attack_range) {
            const target = board_state[pos[0]][pos[1]];
            if (target && target.team !== this.team) {
                moves.push(pos);
            }
        }
        return moves;
    }
}

class Yu extends Piece {
    get korean_name() { return '유'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const potential_moves = [
            [y - 2, x - 2, y - 1, x - 1], [y - 2, x + 2, y - 1, x + 1],
            [y + 2, x - 2, y + 1, x - 1], [y + 2, x + 2, y + 1, x + 1],
        ];

        for (const [dest_y, dest_x, my, mx] of potential_moves) {
            const m_valid = (my >= 0 && my < 14 && mx >= 0 && mx < 15);
            if (!m_valid || board_state[my][mx] !== null) continue;

            if (this._is_valid_target([dest_y, dest_x], board_state, game_state)) {
                moves.push([dest_y, dest_x]);
            }
        }
        return moves;
    }
}

class Gi_L extends Piece {
    get korean_name() { return '기L'; }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dy, dx] of directions) {
            for (let i = 1; i < 3; i++) {
                const ny = y + dy * i;
                const nx = x + dx * i;
                if (!(ny >= 0 && ny < 14 && nx >= 0 && nx < 15)) break;

                const target = board_state[ny][nx];
                if (target === null) {
                    moves.push([ny, nx]);
                } else {
                    if (target.team !== this.team) moves.push([ny, nx]);
                    break;
                }
            }
        }
        return moves;
    }
}

class Jeon extends Piece {
    get korean_name() { return '전'; }
    _is_restricted_area(pos, game_state) {
        if (game_state.is_in_inner_area(pos, '초') || game_state.is_in_inner_area(pos, '한')) return true;
        if (game_state.is_in_palace(pos, '초', { check_main_palace_only: true }) || game_state.is_in_palace(pos, '한', { check_main_palace_only: true })) return true;
        return false;
    }
    get_valid_moves(board_state, game_state) {
        const moves = [];
        const [y, x] = this.position;
        
        const can_capture_target = (target_pos) => {
            const target_piece = board_state[target_pos[0]][target_pos[1]];
            return !(target_piece && target_piece.name === 'Jeon');
        };

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dy, dx] of directions) {
            let ny = y + dy;
            let nx = x + dx;
            while (ny >= 0 && ny < game_state.BOARD_HEIGHT_CELLS && nx >= 0 && nx < game_state.BOARD_WIDTH_CELLS) {
                const potential_move = [ny, nx];
                if (this._is_restricted_area(potential_move, game_state)) break;

                const target_piece = board_state[ny][nx];
                if (target_piece === null) {
                    moves.push(potential_move);
                } else {
                    if (target_piece.team !== this.team && target_piece.name !== 'Jeon') moves.push(potential_move);
                    break;
                }
                ny += dy;
                nx += dx;
            }
        }
        
        const palace_keys_to_check = ['초_좌', '초_우', '한_좌', '한_우'];
        for (const key of palace_keys_to_check) {
            if (!game_state.is_in_palace(this.position, this.team, { check_palace_key: key })) continue;
            
            const [y1, x1, y2, x2] = game_state.palaces[key];
            const cy = Math.floor((y1 + y2) / 2);
            const cx = Math.floor((x1 + x2) / 2);
            const diagonal_paths = [ [[y1, x1], [cy, cx], [y2, x2]], [[y1, x2], [cy, cx], [y2, x1]] ];

            for (const path of diagonal_paths) {
                const pos_in_path = path.some(p => p[0] === this.position[0] && p[1] === this.position[1]);
                if (!pos_in_path) continue;
                
                const current_idx = path.findIndex(p => p[0] === this.position[0] && p[1] === this.position[1]);

                for (let i = current_idx + 1; i < path.length; i++) {
                    const target_pos = path[i];
                    let is_blocked = false;
                    for(let j = current_idx + 1; j < i; j++){
                        if(board_state[path[j][0]][path[j][1]]){
                            is_blocked = true;
                            break;
                        }
                    }
                    if(is_blocked) break;

                    if (this._is_valid_target(target_pos, board_state, game_state) && !this._is_restricted_area(target_pos, game_state) && can_capture_target(target_pos)) {
                        moves.push(target_pos);
                    }
                    if (board_state[target_pos[0]][target_pos[1]] !== null) break;
                }
                 for (let i = current_idx - 1; i >= 0; i--) {
                    const target_pos = path[i];
                    let is_blocked = false;
                    for(let j = current_idx - 1; j > i; j--){
                        if(board_state[path[j][0]][path[j][1]]){
                            is_blocked = true;
                            break;
                        }
                    }
                    if(is_blocked) break;
                    
                    if (this._is_valid_target(target_pos, board_state, game_state) && !this._is_restricted_area(target_pos, game_state) && can_capture_target(target_pos)) {
                        moves.push(target_pos);
                    }
                    if (board_state[target_pos[0]][target_pos[1]] !== null) break;
                }
            }
        }
        return moves;
    }
}

class Hu extends Piece {
    get korean_name() { return '후'; }
    get_valid_moves(board_state, game_state) {
        // 1. Get all potential moves as if it were a Cha.
        const potential_moves = Cha.prototype.get_valid_moves.call(this, board_state, game_state);
        
        let moves = [];
        const opponent_team = this.team === '초' ? '한' : '초';

        // Hu cannot move if it starts in the "outer-outer" area.
        if (game_state.is_in_outer_outer_area(this.position, this.team)) {
            return [];
        }

        // 2. Filter the potential moves based on Hu's specific restrictions.
        for (const move of potential_moves) {
            // Restricted areas Hu cannot enter:
            // 1. Its own "outer-outer" area.
            const is_outside_allowed_zone = game_state.is_in_outer_outer_area(move, this.team);
            // 2. The opponent's main palace. (Now correctly evaluated with the simplified is_in_palace)
            const is_opponent_main_palace = game_state.is_in_palace(move, opponent_team, { check_main_palace_only: true });
            // 3. The opponent's inner area.
            const is_opponent_inner_area = game_state.is_in_inner_area(move, opponent_team);

            // If the move is not into any of the restricted zones, it's valid.
            if (!(is_outside_allowed_zone || is_opponent_main_palace || is_opponent_inner_area)) {
                moves.push(move);
            }
        }
        
        // Remove duplicates using Set
        return Array.from(new Set(moves.map(JSON.stringify)), JSON.parse);
    }
}


const PIECE_CLASS_MAP = {
    'k': Su, 'q': Jang, 'r': Cha, 'c': Po, 'n': Ma, 'e': Sang, 'a': Sa, 'p': Bo, 'g': Gi, 'm': Bok, 'u': Yu, 'l': Gi_L, 'f': Jeon, 'b': Hu
};

const PIECE_FEN_MAP = {
    'Su': 'k', 'Jang': 'q', 'Cha': 'r', 'Po': 'c', 'Ma': 'n', 'Sang': 'e', 'Sa': 'a', 'Bo': 'p', 'Gi': 'g', 'Bok': 'm', 'Yu': 'u', 'Gi_L': 'l', 'Jeon': 'f', 'Hu': 'b'
};

// --- GameState Class ---

class GameState {
    constructor(initial_fen = FEN) {
        this.BOARD_WIDTH_CELLS = BOARD_WIDTH_CELLS;
        this.BOARD_HEIGHT_CELLS = BOARD_HEIGHT_CELLS;
        this._initialize_board_constants();
        this._initialize_game_variables(initial_fen);
    }

    _initialize_board_constants() {
        this.palaces = {
            '한': [1, 6, 3, 8], '초': [10, 6, 12, 8],
            '한_좌': [1, 0, 3, 2], '한_우': [1, 12, 3, 14],
            '초_좌': [10, 0, 12, 2], '초_우': [10, 12, 12, 14],
        };
        this.palace_diagonal_paths = {
            '한': [[[1,6],[2,7]],[[2,7],[3,8]],[[2,7],[1,6]],[[3,8],[2,7]],[[1,8],[2,7]],[[2,7],[3,6]],[[2,7],[1,8]],[[3,6],[2,7]]],
            '초': [[[10,6],[11,7]],[[11,7],[12,8]],[[11,7],[10,6]],[[12,8],[11,7]],[[10,8],[11,7]],[[11,7],[12,6]],[[11,7],[10,8]],[[12,6],[11,7]]],
            '한_좌': [[[1,0],[2,1]],[[2,1],[3,2]],[[2,1],[1,0]],[[3,2],[2,1]],[[1,2],[2,1]],[[2,1],[3,0]],[[2,1],[1,2]],[[3,0],[2,1]]],
            '한_우': [[[1,12],[2,13]],[[2,13],[3,14]],[[2,13],[1,12]],[[3,14],[2,13]],[[1,14],[2,13]],[[2,13],[3,12]],[[2,13],[1,14]],[[3,12],[2,13]]],
            '초_좌': [[[10,0],[11,1]],[[11,1],[12,2]],[[11,1],[10,0]],[[12,2],[11,1]],[[10,2],[11,1]],[[11,1],[12,0]],[[11,1],[10,2]],[[12,0],[11,1]]],
            '초_우': [[[10,12],[11,13]],[[11,13],[12,14]],[[11,13],[10,12]],[[12,14],[11,13]],[[10,14],[11,13]],[[11,13],[12,12]],[[11,13],[10,14]],[[12,12],[11,13]]],
        };
        this.inner_area = {'한': [1, 4, 3, 10], '초': [10, 4, 12, 10]};
        this.outer_area_bounds = {'한': [0, 3, 4, 11], '초': [9, 3, 13, 11]};
    }

    _initialize_game_variables(fen) {
        this.board_state = this.parse_fen(fen);
        this.current_turn = '초';
        this.selected_pos = null; // [y, x]
        this.valid_moves = [];
        this.game_over = false;
        this.winner = null;
        this.deactivated_groups = {'초_좌': false, '초_우': false, '한_좌': false, '한_우': false};
        this.move_history = [];
        this.in_check_team = null;
        this.checked_su_pos = null;
        // For local play UI features
        this.lastMove = null;
        this.drawnArrows = [];
        this.drawnCircles = [];
    }
    
    reset() {
        this._initialize_game_variables(FEN);
    }

    parse_fen(fen_string) {
        const board = Array(this.BOARD_HEIGHT_CELLS).fill(null).map(() => Array(this.BOARD_WIDTH_CELLS).fill(null));
        const [piece_fen, moved_fen, group_fen] = fen_string.split('|');
        const rows = piece_fen.split('/');
        
        rows.forEach((row_str, y) => {
            if (y >= this.BOARD_HEIGHT_CELLS) return;
            let x = 0;
            let i = 0;
            while (i < row_str.length) {
                if (x >= this.BOARD_WIDTH_CELLS) break;
                const char = row_str[i];
                if (!isNaN(parseInt(char))) {
                    let num_str = "";
                    let j = i;
                    while (j < row_str.length && !isNaN(parseInt(row_str[j]))) {
                        num_str += row_str[j];
                        j++;
                    }
                    x += parseInt(num_str);
                    i = j;
                } else {
                    const team = (char === char.toUpperCase()) ? '한' : '초';
                    const piece_class = PIECE_CLASS_MAP[char.toLowerCase()];
                    if (piece_class) {
                        const piece = new piece_class(team, [y, x]);
                         if (!group_fen) {
                            if (x < 4) piece.general_group = '좌';
                            else if (x > 10) piece.general_group = '우';
                            else piece.general_group = '중앙';
                        }
                        board[y][x] = piece;
                    }
                    x++;
                    i++;
                }
            }
        });

        if (moved_fen) {
            moved_fen.split('/').forEach((row_str, y) => {
                if (y >= this.BOARD_HEIGHT_CELLS) return;
                let x = 0;
                let i = 0;
                 while (i < row_str.length) {
                    if (x >= this.BOARD_WIDTH_CELLS) break;
                     const char = row_str[i];
                    if (!isNaN(parseInt(char))) {
                        let num_str = "";
                        let j = i;
                        while (j < row_str.length && !isNaN(parseInt(row_str[j]))) {
                            num_str += row_str[j];
                            j++;
                        }
                        x += parseInt(num_str);
                        i = j;
                    } else {
                        if (board[y][x]) board[y][x].has_moved = (char === 'm');
                        x++;
                        i++;
                    }
                }
            });
        }
        
        if (group_fen) {
            group_fen.split('/').forEach((row_str, y) => {
                 if (y >= this.BOARD_HEIGHT_CELLS) return;
                let x = 0;
                let i = 0;
                while (i < row_str.length) {
                    if (x >= this.BOARD_WIDTH_CELLS) break;
                    const char = row_str[i];
                     if (!isNaN(parseInt(char))) {
                        let num_str = "";
                        let j = i;
                        while (j < row_str.length && !isNaN(parseInt(row_str[j]))) {
                            num_str += row_str[j];
                            j++;
                        }
                        x += parseInt(num_str);
                        i = j;
                    } else {
                        if (board[y][x]) {
                            if (char === 'L') board[y][x].general_group = '좌';
                            else if (char === 'R') board[y][x].general_group = '우';
                            else if (char === 'C') board[y][x].general_group = '중앙';
                        }
                        x++;
                        i++;
                    }
                }
            });
        }
        return board;
    }
        
    generate_fen() {
        let piece_rows = [], moved_rows = [], group_rows = [];
        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            let empty_piece = 0, empty_moved = 0, empty_group = 0;
            let row_piece = "", row_moved = "", row_group = "";
            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = this.board_state[r][c];
                if (piece === null) {
                    empty_piece++; empty_moved++; empty_group++;
                } else {
                    if (empty_piece > 0) { row_piece += empty_piece; empty_piece = 0; }
                    let fen_char = PIECE_FEN_MAP[piece.name];
                    row_piece += (piece.team === '한') ? fen_char.toUpperCase() : fen_char.toLowerCase();
                    
                    if (empty_moved > 0) { row_moved += empty_moved; empty_moved = 0; }
                    row_moved += piece.has_moved ? 'm' : '-';

                    if (empty_group > 0) { row_group += empty_group; empty_group = 0; }
                    if (piece.general_group === '좌') row_group += 'L';
                    else if (piece.general_group === '우') row_group += 'R';
                    else row_group += 'C';
                }
            }
            if (empty_piece > 0) row_piece += empty_piece;
            if (empty_moved > 0) row_moved += empty_moved;
            if (empty_group > 0) row_group += empty_group;
            piece_rows.push(row_piece);
            moved_rows.push(row_moved);
            group_rows.push(row_group);
        }
        return `${piece_rows.join('/')}|${moved_rows.join('/')}|${group_rows.join('/')}`;
    }

    handle_click(pos) {
        if (this.game_over) return;
        const [y, x] = pos;

        if (this.selected_pos && this.valid_moves.some(m => m[0] === y && m[1] === x)) {
            this.move_piece(this.selected_pos, [y, x]);
            return;
        }

        const target_piece = this.board_state[y][x];

        if ((this.selected_pos && this.selected_pos[0] === y && this.selected_pos[1] === x) || !target_piece || (target_piece.team !== this.current_turn)) {
            this.selected_pos = null;
            this.valid_moves = [];
            return;
        }

        const group_key = `${target_piece.team}_${target_piece.general_group}`;
        if (target_piece.general_group !== '중앙' && target_piece.name !== 'Su' && this.deactivated_groups[group_key]) {
            this.selected_pos = null;
            this.valid_moves = [];
            return;
        }

        this.selected_pos = [y,x];
        const piece_to_check = this.board_state[y][x];
        
        const potential_moves = piece_to_check.get_valid_moves(this.board_state, this);
        
        const truly_valid_moves = [];
        for (const move of potential_moves) {
            // Deep copy board state to simulate the move
            const temp_board_state = JSON.parse(JSON.stringify(this.board_state));
            
            // Re-instantiate pieces for the temp board
            for(let r=0; r < this.BOARD_HEIGHT_CELLS; r++){
                for(let c=0; c < this.BOARD_WIDTH_CELLS; c++){
                    const p = temp_board_state[r][c];
                    if(p){
                        const piece_class = PIECE_CLASS_MAP[PIECE_FEN_MAP[p.name].toLowerCase()];
                        const new_piece = new piece_class(p.team, p.position);
                        Object.assign(new_piece, p);
                        temp_board_state[r][c] = new_piece;
                    }
                }
            }
            
            const from_pos_temp = this.selected_pos;
            const piece = temp_board_state[from_pos_temp[0]][from_pos_temp[1]];
            temp_board_state[move[0]][move[1]] = piece;
            if(piece) piece.position = [move[0], move[1]];
            temp_board_state[from_pos_temp[0]][from_pos_temp[1]] = null;

            const [in_check, ] = this.is_su_in_check(this.current_turn, temp_board_state);
            if (!in_check) {
                truly_valid_moves.push(move);
            }
        }
        
        this.valid_moves = truly_valid_moves;
    }
    
    is_in_inner_area(pos, team) {
        const [y, x] = pos;
        const [y1, x1, y2, x2] = this.inner_area[team];
        return y1 <= y && y <= y2 && x1 <= x && x <= x2;
    }

    is_in_outer_area(pos, team) {
        const [y, x] = pos;
        if (!(y >= 0 && y < this.BOARD_HEIGHT_CELLS && x >= 0 && x < this.BOARD_WIDTH_CELLS)) return false;
        const [y1_outer, x1_outer, y2_outer, x2_outer] = this.outer_area_bounds[team];
        if (!(y1_outer <= y && y <= y2_outer && x1_outer <= x && x <= x2_outer)) return false;
        return !this.is_in_inner_area(pos, team);
    }
    
    is_in_outer_outer_area(pos, team) {
        const [y, x] = pos;
        if (!(y >= 0 && y < this.BOARD_HEIGHT_CELLS && x >= 0 && x < this.BOARD_WIDTH_CELLS)) return false;
        if (!this.is_in_inner_area(pos, team) && !this.is_in_outer_area(pos, team)) {
            if (this.is_in_palace(pos, team, { check_main_palace_only: true })) return false;
            return true;
        }
        return false;
    }

    is_in_palace(pos, team, { check_main_palace_only = false, check_palace_key = null } = {}) {
        const [y, x] = pos;
        let palace_keys_to_check = [];
        if (check_palace_key) {
            palace_keys_to_check.push(check_palace_key);
        } else {
            palace_keys_to_check.push(team);
            if (!check_main_palace_only) {
                palace_keys_to_check.push(`${team}_좌`, `${team}_우`);
            }
        }

        for (const key of palace_keys_to_check) {
            if (!this.palaces[key]) continue;
            const [y1, x1, y2, x2] = this.palaces[key];
            if (y1 <= y && y <= y2 && x1 <= x && x <= x2) return true;
        }
        return false;
    }

    is_valid_palace_diagonal_move(r1, c1, r2, c2, team) {
        const current_pos = [r1, c1];
        const new_pos = [r2, c2];
        const all_palace_keys = ['초', '한', '초_좌', '초_우', '한_좌', '한_우'];

        for (const key of all_palace_keys) {
            const [y1, x1, y2, x2] = this.palaces[key];
            const current_in = y1 <= current_pos[0] && current_pos[0] <= y2 && x1 <= current_pos[1] && current_pos[1] <= x2;
            const new_in = y1 <= new_pos[0] && new_pos[0] <= y2 && x1 <= new_pos[1] && new_pos[1] <= x2;

            if (!(current_in && new_in)) {
                continue;
            }

            const valid_segments = this.palace_diagonal_paths[key];
            for(const segment of valid_segments){
                if((segment[0][0] === r1 && segment[0][1] === c1 && segment[1][0] === r2 && segment[1][1] === c2) ||
                   (segment[1][0] === r1 && segment[1][1] === c1 && segment[0][0] === r2 && segment[0][1] === c2)){
                    return true;
                }
            }
        }
        return false;
    }

    is_square_under_attack(square, attacking_team, board_state) {
        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = board_state[r][c];
                if (piece && piece.team === attacking_team) {
                    const original_selected_pos = this.selected_pos;
                    this.selected_pos = [r, c]; // Set context for the move calculation
                    
                    let attack_moves = [];
                    if (piece.name === 'Su' || piece.name === 'Jang') {
                        attack_moves = piece._get_base_moves(board_state, this);
                    } else if (piece.name === 'Bok') {
                        attack_moves = piece._get_attack_range(board_state);
                    } else {
                        attack_moves = piece.get_valid_moves(board_state, this);
                    }
                    
                    this.selected_pos = original_selected_pos; // Restore

                    if (attack_moves.some(m => m[0] === square[0] && m[1] === square[1])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    find_su_position(team, board_state) {
        for (let r = 0; r < this.BOARD_HEIGHT_CELLS; r++) {
            for (let c = 0; c < this.BOARD_WIDTH_CELLS; c++) {
                const piece = board_state[r][c];
                if (piece && piece.name === 'Su' && piece.team === team) return [r, c];
            }
        }
        return null;
    }

    is_su_in_check(team, board_state) {
        const su_pos = this.find_su_position(team, board_state);
        if (!su_pos) return [false, null];
        const attacking_team = team === '초' ? '한' : '초';
        if (this.is_square_under_attack(su_pos, attacking_team, board_state)) return [true, su_pos];
        return [false, null];
    }
    
    move_piece(from_pos, to_pos) {
        const [from_y, from_x] = from_pos;
        const [to_y, to_x] = to_pos;
        const fen_before = this.generate_fen();
        
        const piece_to_move = this.board_state[from_y][from_x];
        const captured_piece = this.board_state[to_y][to_x];

        // Update last move info *before* the board state changes
        this.lastMove = { from_pos, to_pos };

        // If the captured piece had previously captured a Jang, reactivate the group it deactivated.
        if (captured_piece && captured_piece.captured_general_group) {
            this.deactivated_groups[captured_piece.captured_general_group] = false;
        }

        if (captured_piece && captured_piece.name === 'Su') {
            this.game_over = true;
            this.winner = piece_to_move.team;
        }
        if (captured_piece && captured_piece.name === 'Jang') {
            const group_key = `${captured_piece.team}_${captured_piece.general_group}`;
            this.deactivated_groups[group_key] = true;
            piece_to_move.captured_general_group = group_key;
        }


        this.board_state[to_y][to_x] = piece_to_move;
        this.board_state[from_y][from_x] = null;
        piece_to_move.position = to_pos;
        piece_to_move.has_moved = true;
        
        const fen_after = this.generate_fen();
        const deactivated_groups_after = { ...this.deactivated_groups };
        const from_alg = `${String.fromCharCode(97 + from_x)}${this.BOARD_HEIGHT_CELLS - from_y}`;
        const to_alg = `${String.fromCharCode(97 + to_x)}${this.BOARD_HEIGHT_CELLS - to_y}`;
        const notation = `${from_alg}${to_alg}`;

        this.move_history.push({
            team: piece_to_move.team, piece_korean_name: piece_to_move.korean_name,
            from_pos, to_pos, notation, fen_before, fen_after,
            captured_piece_name: captured_piece ? captured_piece.korean_name : null,
            deactivated_groups_after
        });
        
        this.selected_pos = null;
        this.valid_moves = [];
        this.in_check_team = null;
        this.checked_su_pos = null;

        if (!this.game_over) {
            this.current_turn = this.current_turn === '초' ? '한' : '초';
            const [in_check, checked_su_pos] = this.is_su_in_check(this.current_turn, this.board_state);
            if (in_check) {
                this.in_check_team = this.current_turn;
                this.checked_su_pos = checked_su_pos;
            }
        }
    }
}
