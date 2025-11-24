import Phaser from 'phaser';
import { MainScene } from './MainScene.js';

const config = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true, // Crucial for Three.js visibility
    scene: [MainScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);