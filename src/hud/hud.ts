export interface HudState {
  score: number;
  multiplier: number;
  streak: number;
  rounds: number;
  capacity: number;
  reloading: boolean;
  health: number;
  maxHealth: number;
  t: number; // rail progress 0..1
}

export class Hud {
  private root: HTMLElement;
  private reticle: HTMLElement;
  private score: HTMLElement;
  private comboEl: HTMLElement;
  private ammo: HTMLElement;
  private healthEl: HTMLElement;
  private progress: HTMLElement;
  private damageFlash: HTMLElement;
  private endScreen: HTMLElement;
  private kickUntil = 0;

  constructor() {
    this.root = document.querySelector<HTMLElement>('#hud')!;
    this.root.innerHTML = `
      <div class="reticle" id="reticle"></div>
      <div class="score" id="score">0</div>
      <div class="combo" id="combo">x1</div>
      <div class="ammo" id="ammo"></div>
      <div class="health" id="health"></div>
      <div class="progress"><div class="progress-fill" id="progress"></div></div>
      <div class="damage-flash" id="damage-flash"></div>
      <div class="end-screen" id="end-screen"></div>
    `;
    this.reticle = document.getElementById('reticle')!;
    this.score = document.getElementById('score')!;
    this.comboEl = document.getElementById('combo')!;
    this.ammo = document.getElementById('ammo')!;
    this.healthEl = document.getElementById('health')!;
    this.progress = document.getElementById('progress')!;
    this.damageFlash = document.getElementById('damage-flash')!;
    this.endScreen = document.getElementById('end-screen')!;

    window.addEventListener('pointermove', (e) => {
      this.reticle.style.left = `${e.clientX}px`;
      this.reticle.style.top = `${e.clientY}px`;
    });
  }

  update(s: HudState): void {
    this.score.textContent = String(s.score).padStart(6, '0');

    this.comboEl.textContent = `x${s.multiplier}`;
    this.comboEl.style.opacity = s.streak > 0 ? '1' : '0.25';
    // Hotter as it climbs: cyan → magenta
    this.comboEl.style.color = s.multiplier >= 4 ? 'var(--magenta)' : 'var(--cyan)';

    this.ammo.textContent = s.reloading
      ? 'RELOADING…'
      : `${'▮'.repeat(s.rounds)}${'▯'.repeat(s.capacity - s.rounds)}`;
    this.ammo.classList.toggle('empty', !s.reloading && s.rounds === 0);

    this.healthEl.textContent =
      '▮'.repeat(s.health) + '▯'.repeat(s.maxHealth - s.health);
    this.healthEl.classList.toggle('low', s.health <= 2);

    this.progress.style.width = `${s.t * 100}%`;

    this.reticle.classList.toggle('empty', s.rounds === 0 && !s.reloading);
    if (performance.now() > this.kickUntil) this.reticle.classList.remove('kick');
  }

  /** Reticle kick — punches outward and recovers. */
  onFire(): void {
    this.reticle.classList.remove('kick');
    void this.reticle.offsetWidth; // restart the CSS animation
    this.reticle.classList.add('kick');
    this.kickUntil = performance.now() + 120;
  }

  /** Combo pulse per hit — scale bump, restarted every hit. */
  onComboHit(): void {
    this.comboEl.classList.remove('pulse', 'shatter');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('pulse');
  }

  /** Violent combo break — blowout + color drain. */
  onComboBreak(): void {
    this.comboEl.classList.remove('pulse', 'shatter');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('shatter');
  }

  /** Red vignette flash on taking damage. */
  onDamage(): void {
    this.damageFlash.classList.remove('on');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('on');
  }

  showEnd(title: string, score: number, accuracy: number): void {
    this.endScreen.innerHTML = `
      <h1>${title}</h1>
      <p>SCORE ${String(score).padStart(6, '0')}</p>
      <p>ACCURACY ${(accuracy * 100).toFixed(0)}%</p>
      <p class="restart">CLICK TO RE-RUN</p>
    `;
    this.endScreen.classList.add('on');
  }
}
