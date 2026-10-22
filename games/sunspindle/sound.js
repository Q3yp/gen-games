// Tiny synthesized material cues. No music, remote files or audio dependencies.
export function sound() {
  let audio;
  return {
    unlock() {
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') audio.resume().catch(() => {});
      } catch { /* Play remains available with audio disabled. */ }
    },
    play(kind) {
      if (!audio || audio.state !== 'running') return;
      const t = audio.currentTime;
      const tones = { throw: [380, 90, .13], recall: [180, 680, .19], hurt: [110, 40, .22], break: [740, 130, .28], hit: [250, 55, .1], block: [1900, 650, .2], reflect: [620, 1500, .32] };
      const [start, end, duration] = tones[kind] || tones.throw;
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = kind === 'hurt' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(end, t + duration);
      gain.gain.setValueAtTime(.055, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(t); osc.stop(t + duration);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    },
    close() { if (audio) audio.close().catch(() => {}); }
  };
}
