/** Original score: a warm triangle bass, plucked arpeggios and a square-wave melody. */
export class Sound {
  muted = false;
  private context?: AudioContext;
  private master?: GainNode;
  private next = 0;
  private step = 0;
  private playing = false;
  private timer?: number;
  get state() {
    return this.context?.state || "unstarted";
  }
  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.16;
        this.master.connect(this.context.destination);
        this.timer = window.setInterval(() => this.schedule(), 75);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Audio is optional; blocked audio never blocks a run. */
    }
  }
  mute(value: boolean) {
    this.muted = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.16,
        this.context.currentTime,
        0.015,
      );
  }
  music(playing: boolean) {
    if (playing && !this.playing && this.context)
      this.next = this.context.currentTime + 0.05;
    this.playing = playing;
  }
  private note(
    freq: number,
    length: number,
    type: OscillatorType = "triangle",
    volume = 0.45,
    when?: number,
    endFreq?: number,
  ) {
    if (
      !this.context ||
      !this.master ||
      this.context.state !== "running" ||
      this.muted
    )
      return;
    const ctx = this.context,
      t = when ?? ctx.currentTime,
      o = ctx.createOscillator(),
      gain = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + length);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(gain);
    gain.connect(this.master);
    o.start(t);
    o.stop(t + length + 0.02);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
  }
  private schedule() {
    if (
      !this.context ||
      !this.playing ||
      this.muted ||
      this.context.state !== "running"
    )
      return;
    const now = this.context.currentTime;
    if (this.next < now) this.next = now + 0.025;
    const melody = [
      74, 0, 77, 79, 81, 79, 77, 74, 72, 0, 74, 77, 79, 77, 74, 72, 69, 0, 72,
      74, 77, 74, 72, 69, 67, 69, 72, 74, 72, 0, 69, 0,
    ];
    const roots = [50, 46, 53, 48],
      arp = [0, 7, 12, 7];
    while (this.next < now + 0.15) {
      const s = this.step,
        root = roots[Math.floor(s / 8) % 4];
      if (s % 2 === 0)
        this.note(
          440 * 2 ** ((root - 69) / 12),
          0.29,
          "triangle",
          0.6,
          this.next,
        );
      this.note(
        440 * 2 ** ((root + 12 + arp[s % 4] - 69) / 12),
        0.14,
        "triangle",
        0.25,
        this.next,
      );
      if (melody[s % 32])
        this.note(
          440 * 2 ** ((melody[s % 32] - 69) / 12),
          0.22,
          "square",
          0.12,
          this.next,
        );
      if (s % 4 === 2) this.note(115, 0.07, "sine", 0.22, this.next, 38);
      this.next += 0.155;
      this.step++;
    }
  }
  effect(type: string) {
    if (type === "jump") this.note(230, 0.14, "square", 0.22, undefined, 520);
    else if (type === "collect") {
      this.note(1100, 0.075, "sine", 0.65);
      this.note(
        1660,
        0.12,
        "triangle",
        0.35,
        (this.context?.currentTime || 0) + 0.06,
      );
    } else if (type === "stomp" || type === "block")
      this.note(170, 0.12, "triangle", 0.7, undefined, 65);
    else if (type === "fire")
      this.note(650, 0.09, "sawtooth", 0.15, undefined, 160);
    else if (type === "break" || type === "slam" || type === "bossHit")
      this.note(90, 0.2, "sawtooth", 0.5, undefined, 32);
    else if (type === "hurt" || type === "death")
      this.note(
        320,
        type === "death" ? 0.5 : 0.22,
        "triangle",
        0.8,
        undefined,
        65,
      );
    else if (
      ["power", "checkpoint", "bonus", "clear", "won", "bossDefeated"].includes(
        type,
      )
    ) {
      [0, 4, 7, 12].forEach((n, i) =>
        this.note(
          440 * 2 ** (n / 12),
          0.25,
          "triangle",
          0.7,
          (this.context?.currentTime || 0) + i * 0.085,
        ),
      );
    }
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    void this.context?.close();
  }
}
