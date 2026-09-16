/* assets.js */
const GAME_ASSETS = {
    config: {
        walkSpeed: 4.5,
        totalWorldWidth: 4000,
        parallaxFar: 0.2,
        parallaxMid: 0.5,
        parallaxNear: 1.0
    },
    // Chapters dictate the environment mood and story triggers
    chapters: [
        {
            id: 0,
            startX: 0,
            endX: 1800,
            palette: {
                skyTop: '#FDE8E9', // Soft peach
                skyBottom: '#C1E1C1', // Soft teal
                ground: '#6B8E7B',
                accent: '#FF6B6B', // Red dress color
                fog: 'rgba(255, 255, 255, 0.4)',
                vine: '#4A6B5D',
                light: 'rgba(255, 255, 255, 0.8)'
            },
            paragraphs: [
                { x: 200, text: "I woke up in a world that felt like a half-remembered dream." },
                { x: 700, text: "The air was warm. Giant hands from a forgotten god lay resting in the sky." },
                { x: 1200, text: "I walked, searching for a way out. Or perhaps, a way in." }
            ]
        },
        {
            id: 1,
            startX: 1800,
            endX: 4000,
            palette: {
                skyTop: '#1A1A2E', // Dark blue
                skyBottom: '#16213E',
                ground: '#0F3460',
                accent: '#00F2FE', // Neon cyan
                fog: 'rgba(0, 0, 0, 0.5)',
                vine: '#1A1A2E',
                light: 'rgba(0, 242, 254, 0.8)'
            },
            paragraphs: [
                { x: 1850, text: "Suddenly, the light died. The warmth drained from the air." },
                { x: 2300, text: "A forgotten stage materialized from the void." },
                { x: 2800, text: "The music playing was a memory I didn't know I had." }
            ]
        }
    ]
};
