import Phaser from 'phaser';

/**
 * BootScene — minimal loading screen.
 * Shows the game title for 1 second, then transitions to GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No external assets required for MVP
  }

  create(): void {
    const { width, height } = this.scale;

    // Background already set via Phaser config, just add text
    this.add
      .text(width / 2, height / 2 - 20, '🏗️ Стройка', {
        fontSize: '40px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#f5a623',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 32, 'Загрузка...', {
        fontSize: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#8a8a9a',
      })
      .setOrigin(0.5);

    // Transition after 1 second
    this.time.delayedCall(1000, () => {
      this.scene.start('GameScene');
    });
  }
}
