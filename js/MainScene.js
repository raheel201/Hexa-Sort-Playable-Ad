import Phaser from 'phaser';
import { ThreeEngine } from './ThreeEngine.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.moves = 0;
        this.merges = 0;
        this.showingTutorial = true;
    }

    create() {
        this.threeEngine = new ThreeEngine();
        
        this.threeEngine.loadAssets(() => {
            this.threeEngine.buildTower();
            this.showTutorial();
        });

        // Input handling
        this.input.on('pointerdown', (pointer) => {
            this.threeEngine.handleInput(pointer.x, pointer.y, false, 'down');
            if (this.showingTutorial) {
                this.hideTutorial();
            }
        });

        this.input.on('pointermove', (pointer) => {
            this.threeEngine.handleInput(pointer.x, pointer.y, pointer.isDown, 'move');
        });

        this.input.on('pointerup', (pointer) => {
            this.threeEngine.handleInput(pointer.x, pointer.y, false, 'up');
        });

        // Game events
        window.addEventListener('scoreUpdate', (e) => {
            this.score = e.detail;
            this.updateScore();
            this.showFeedback('MATCH! +10', '#FFD700');
            
            if (this.score >= 50) {
                setTimeout(() => {
                    document.getElementById('cta-overlay').style.display = 'flex';
                }, 1000);
            }
        });

        // UI - Score only (removed moves count)
        this.scoreDisplay = this.add.text(20, 20, 'Score: 0', {
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold'
        });
        
        this.score = 0;
    }

    showTutorial() {
        this.tutorialHand = this.add.text(this.scale.width * 0.7, this.scale.height * 0.6, '👆', {
            fontSize: '48px'
        }).setOrigin(0.5);

        this.tutorialText = this.add.text(this.scale.width/2, this.scale.height - 80, 'Swipe rows to rotate, drop columns to center', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#8B4513',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.tutorialHand,
            y: this.tutorialHand.y - 20,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });
    }

    hideTutorial() {
        if (this.tutorialHand) {
            this.tutorialHand.destroy();
            this.tutorialText.destroy();
            this.showingTutorial = false;
        }
    }

    showFeedback(text, color = '#FFD700') {
        const feedback = this.add.text(this.scale.width/2, this.scale.height/2, text, {
            fontSize: '56px',
            fontFamily: 'Arial, sans-serif',
            color: color,
            stroke: '#000000',
            strokeThickness: 8,
            fontStyle: 'bold',
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 6,
                fill: true
            }
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: feedback,
            y: feedback.y - 150,
            alpha: 0,
            scale: 1.3,
            duration: 1200,
            ease: 'Power2.easeOut',
            onComplete: () => feedback.destroy()
        });
    }

    updateScore() {
        this.scoreDisplay.setText('Score: ' + this.score);
    }

    update() {
        if (this.threeEngine) {
            this.threeEngine.update();
        }
    }
}