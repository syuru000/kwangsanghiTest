// js/ui_state.js

/**
 * A central place to hold UI-related state, particularly dynamic sizing.
 */
export const uiState = {
    cellSize: 40, // Default value, will be updated dynamically
};

/**
 * Calculates and updates the cell size based on the container's width.
 */
export function updateCellSize() {
    const boardWrapper = document.getElementById('board-wrapper');
    if (!boardWrapper) {
        console.error("Board wrapper not found for sizing!");
        return;
    }

    // On mobile, right-panel is below, so board-wrapper can be 100% of screen width.
    // On desktop, it's next to the panel. We take the smaller of the two dimensions.
    const containerWidth = boardWrapper.clientWidth;
    const containerHeight = window.innerHeight * 0.8; // Use 80% of viewport height as a constraint

    // Calculate cell size based on both width and height to fit the board
    const sizeFromWidth = containerWidth / 15; // 15 cells wide
    const sizeFromHeight = containerHeight / 14; // 14 cells high

    // Use the smaller of the two to ensure the whole board is visible
    uiState.cellSize = Math.floor(Math.min(sizeFromWidth, sizeFromHeight));
    
    console.log(`New Cell Size: ${uiState.cellSize}px`);
}
