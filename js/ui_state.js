// js/ui_state.js

/**
 * A central place to hold UI-related state, particularly dynamic sizing.
 */
export const uiState = {
    cellSize: 40, // Default value, will be updated dynamically
};

/**
 * Calculates and updates the cell size based on the container's width.
 * This version is more robust as it calculates available space from the top down,
 * avoiding race conditions with element rendering.
 */
export function updateCellSize() {
    const gameContainer = document.getElementById('game-container');
    const rightPanel = document.getElementById('right-panel');
    const h1 = document.querySelector('h1');

    if (!gameContainer) {
        console.error("Game container not found for sizing!");
        return;
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const h1Height = h1 ? h1.offsetHeight : 50;

    let availableWidth;

    // Check if we are in mobile layout (flex-direction: column)
    const isMobileLayout = window.getComputedStyle(gameContainer).flexDirection === 'column';

    if (isMobileLayout) {
        // In mobile layout, the board wrapper takes the full width of the container.
        availableWidth = gameContainer.clientWidth - 20; // Subtract some padding
    } else {
        // In desktop layout, the panel is on the side.
        const panelWidth = rightPanel ? rightPanel.offsetWidth : 0;
        const panelMargin = rightPanel ? parseInt(window.getComputedStyle(rightPanel).marginLeft) || 0 : 0;
        // Calculate available width by subtracting the panel and its margins from the total container width.
        availableWidth = gameContainer.clientWidth - panelWidth - panelMargin - 20; // Extra padding
    }

    // Calculate available height, leaving some space for the title and margins.
    const availableHeight = screenHeight - h1Height - 40; // 40px for vertical margins

    // Calculate cell size based on both width and height to ensure the board fits completely.
    const sizeFromWidth = availableWidth / 15; // 15 cells wide
    const sizeFromHeight = availableHeight / 14; // 14 cells high

    // Use the smaller of the two calculated sizes to ensure the board is always fully visible.
    let newCellSize = Math.floor(Math.min(sizeFromWidth, sizeFromHeight));

    // Enforce a minimum cell size to prevent the board from becoming unusably small.
    uiState.cellSize = Math.max(10, newCellSize);

    console.log(`Layout: ${isMobileLayout ? 'Mobile' : 'Desktop'}, AvailableW: ${availableWidth.toFixed(0)}, AvailableH: ${availableHeight.toFixed(0)}, New Cell Size: ${uiState.cellSize}px`);
}