/**
 * LoadingScreen manages the initial preloader overlay, progress interpolation,
 * and smooth fade-out curtain transition.
 */
export class LoadingScreen {
  constructor() {
    this.element = document.getElementById('loading-screen');
    this.fillBar = document.getElementById('loading-bar-fill');
    this.percentText = document.getElementById('loading-percent');

    this.currentProgress = 0;
    this.targetProgress = 0;
    this.isDone = false;
    this._rafId = null;

    this._startProgressLoop();
  }

  /**
   * Sets the target loading progress percentage (0 - 100).
   * Monotonically non-decreasing to ensure smooth visual progression.
   * @param {number} value
   */
  setProgress(value) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    if (clamped > this.targetProgress) {
      this.targetProgress = clamped;
    }
  }

  /**
   * Internal requestAnimationFrame loop for fluid percentage and bar interpolation.
   * @private
   */
  _startProgressLoop() {
    const update = () => {
      if (this.currentProgress < this.targetProgress) {
        const delta = Math.max(0.5, (this.targetProgress - this.currentProgress) * 0.16);
        this.currentProgress = Math.min(this.targetProgress, this.currentProgress + delta);

        const rounded = Math.floor(this.currentProgress);
        if (this.fillBar) {
          this.fillBar.style.width = `${rounded}%`;
        }
        if (this.percentText) {
          this.percentText.textContent = `${rounded}%`;
        }
      }

      if (!this.isDone || this.currentProgress < 100) {
        this._rafId = requestAnimationFrame(update);
      }
    };

    this._rafId = requestAnimationFrame(update);
  }

  /**
   * Marks loading as completed and triggers the smooth fade-out curtain.
   * @returns {Promise<void>} Resolves when the element has finished its fade-out transition
   */
  finish() {
    return new Promise((resolve) => {
      this.targetProgress = 100;
      this.isDone = true;

      // Ensure progress bar fills to 100%
      setTimeout(() => {
        if (this.fillBar) this.fillBar.style.width = '100%';
        if (this.percentText) this.percentText.textContent = '100%';

        // Allow user eye to register 100% completion before revealing the 3D scene
        setTimeout(() => {
          if (this.element) {
            this.element.classList.add('fade-out');

            // Clean up DOM after CSS transition completes
            setTimeout(() => {
              if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
              }
              if (this._rafId) {
                cancelAnimationFrame(this._rafId);
              }
              resolve();
            }, 850);
          } else {
            resolve();
          }
        }, 220);
      }, 120);
    });
  }
}
