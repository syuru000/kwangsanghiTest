// C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb\js\main.js

import { GameState } from './game.js';
import { initializeUI, renderBoard, updateInfoPanel, updateMoveHistory, animateAndRender } from './ui.js';

class GameController {
    constructor() {
        this.gameState = new GameState();
        this.isAnimating = false;
        initializeUI(
            this.handleCellClick.bind(this), 
            this.handleHistoryClick.bind(this),
            this.handleBoardMouseDown.bind(this),
            this.handleBoardMouseUp.bind(this)
        );
        this.addEventListeners();
        this.startGame();
    }

    startGame() {
        this.isAnimating = false;
        this.gameState.reset();
        renderBoard(this.gameState);
        console.log("New game started.");
    }
    
    handleCellClick(pos) {
        if (this.isAnimating) return;

        // Clear annotations on any move attempt
        this.gameState.drawnArrows = [];
        this.gameState.drawnCircles = [];

        if (this.gameState.history_view_index !== this.gameState.moveHistory.length) {
            this.gameState.goToHistoryState(this.gameState.moveHistory.length);
            renderBoard(this.gameState);
            return;
        }

        const moved = this.gameState.selectPiece(pos);
        
        if (moved) {
            this.isAnimating = true;
            animateAndRender(this.gameState, () => {
                this.isAnimating = false;
            });
        } else {
            renderBoard(this.gameState);
        }
    }

    handleHistoryClick(index) {
        if (this.isAnimating) return;
        this.gameState.goToHistoryState(index);
        renderBoard(this.gameState);
    }

    getGridPosFromEvent(event) {
        const boardWrapper = document.getElementById('board-wrapper');
        const rect = boardWrapper.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const CELL_SIZE = 40;
        const gridX = Math.floor(x / CELL_SIZE);
        const gridY = Math.floor(y / CELL_SIZE);

        if (gridX < 0 || gridX >= 15 || gridY < 0 || gridY >= 14) {
            return null;
        }
        return { y: gridY, x: gridX };
    }

    handleBoardMouseDown(event) {
        if (event.button === 2) { // Right-click
            const pos = this.getGridPosFromEvent(event);
            if (pos) {
                this.gameState.drawingArrowStart = pos;
            }
        }
    }

    handleBoardMouseUp(event) {
        if (event.button === 2) { // Right-click
            if (!this.gameState.drawingArrowStart) return;

            const endPos = this.getGridPosFromEvent(event);
            if (endPos) {
                const startPos = this.gameState.drawingArrowStart;
                
                // Toggle circle
                if (startPos.x === endPos.x && startPos.y === endPos.y) {
                    const circleIndex = this.gameState.drawnCircles.findIndex(c => c.x === startPos.x && c.y === startPos.y);
                    if (circleIndex > -1) {
                        this.gameState.drawnCircles.splice(circleIndex, 1);
                    } else {
                        this.gameState.drawnCircles.push(startPos);
                    }
                } 
                // Toggle arrow
                else {
                    let color = '#20C20E'; // Green
                    if (event.ctrlKey) color = '#FFDC00'; // Yellow
                    if (event.shiftKey) color = '#FF4136'; // Red

                    const arrow = { startPos, endPos, color };
                    const arrowIndex = this.gameState.drawnArrows.findIndex(a => 
                        a.startPos.x === arrow.startPos.x && a.startPos.y === arrow.startPos.y &&
                        a.endPos.x === arrow.endPos.x && a.endPos.y === arrow.endPos.y
                    );

                    if (arrowIndex > -1) {
                        this.gameState.drawnArrows.splice(arrowIndex, 1);
                    } else {
                        this.gameState.drawnArrows.push(arrow);
                    }
                }
            }
            this.gameState.drawingArrowStart = null;
            renderBoard(this.gameState);
        }
    }

    addEventListeners() {
        const resetButton = document.getElementById('reset-button');
        resetButton.addEventListener('click', () => {
            console.log("Reset button clicked.");
            this.startGame();
        });

        const btnToStart = document.getElementById('btn-to-start');
        btnToStart.addEventListener('click', () => {
            if (this.isAnimating) return;
            this.gameState.goToHistoryState(0);
            renderBoard(this.gameState);
        });

        const btnPrev = document.getElementById('btn-prev');
        btnPrev.addEventListener('click', () => {
            if (this.isAnimating) return;
            const newIndex = this.gameState.history_view_index - 1;
            this.gameState.goToHistoryState(newIndex);
            renderBoard(this.gameState);
        });

        const btnNext = document.getElementById('btn-next');
        btnNext.addEventListener('click', () => {
            if (this.isAnimating) return;
            const newIndex = this.gameState.history_view_index + 1;
            this.gameState.goToHistoryState(newIndex);
            renderBoard(this.gameState);
        });

        const btnToEnd = document.getElementById('btn-to-end');
        btnToEnd.addEventListener('click', () => {
            if (this.isAnimating) return;
            this.gameState.goToHistoryState(this.gameState.moveHistory.length);
            renderBoard(this.gameState);
        });
    }
}

// --- Start the game ---
window.addEventListener('load', () => {
    new GameController();
});
