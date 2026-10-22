/** DOM presentation for the example game. The simulation never depends on it. */
export function mountHUD(host) {
  const css = host.asset('./ui.css');
  host.root.innerHTML = /* HTML */ `<link rel="stylesheet" href="${css}" />
    <section class="lumen-weave" aria-label="Lumen Weave optical garden">
      <canvas
        tabindex="0"
        aria-label="Optical garden. Drag mirrors. Drag their end handles or use Q and E to rotate. Select mirrors with 1, 2, 3; move with arrow keys."
      >
      </canvas>
      <header class="lw-hud">
        <p class="lw-eyebrow">LUMEN WEAVE <span>01</span></p>
        <h1>Make the dark bloom.</h1>
        <p class="lw-objective">Bend light into all three sleeping seeds.</p>
        <div class="lw-progress"></div>
      </header>
      <div class="lw-energy">
        <span>HEARTLIGHT</span>
        <div>
          <i> </i>
        </div>
        <strong> </strong>
      </div>
      <div class="lw-tools">
        <button data-action="mode" title="Switch drag action">↔ Move</button>
        <button data-action="left" aria-label="Rotate selected mirror left">
          ↶
        </button>
        <button data-action="right" aria-label="Rotate selected mirror right">
          ↷
        </button>
        <button data-action="fork" hidden>Fork · F</button>
        <button data-action="prism">Try prism challenge</button>
        <button data-action="flowers" hidden>Flower garden</button>
        <button data-action="undo" title="Undo last manipulation">Undo</button>
        <button data-action="pause">Pause / tinker</button>
        <button data-action="reset">Retry</button>
        <button data-action="sound" aria-label="Toggle sound">Sound off</button>
        <button data-action="help" aria-label="Show game controls">?</button>
        <button data-action="results" hidden>Hide result</button>
      </div>
      <div class="lw-hint">
        <b>Drag a shard. Turn its end handles.</b>
        <span
          >Mouse wheel or Q / E rotates · 1 / 2 / 3 selects · arrows move</span
        >
      </div>
      <div class="lw-result"></div>
      <div class="lw-toast" role="status" aria-live="polite"></div>
    </section>`;
  const root = host.root.querySelector('.lumen-weave');
  const canvas = root.querySelector('canvas');
  let lastResultHTML = null;
  function updateHUD({
    world,
    view,
    paused,
    showHelp,
    resultsOpen,
    undoCount,
    bestRoute
  }) {
    const count = world.bodies.filter(
        (body) => body.type === 'receiver' && body.bloomed
      ).length,
      total = world.bodies.filter((body) => body.type === 'receiver').length;
    const prism = world.prism?.enabled,
      lantern = world.lantern?.enabled;
    root.querySelector('h1').textContent = lantern
      ? 'Wake the lanterns.'
      : 'Make the dark bloom.';
    root.querySelector('[data-action="flowers"]').hidden = !lantern;
    root.querySelector('.lw-objective').textContent = lantern
      ? `Feed all ${total} lanterns at least 20% light together for 2 seconds.`
      : prism
        ? `Hold light on all ${total} flowers together for 2 seconds.`
        : `Bend light into all ${total} sleeping seeds.`;
    root.querySelector('[data-action="prism"]').hidden = Boolean(prism);
    const forkButton = root.querySelector('[data-action="fork"]');
    forkButton.hidden = !prism;
    forkButton.textContent = world.bodies.find(
      (body) => body.id === view.selected
    )?.fork
      ? 'Focus · F'
      : 'Fork · F';
    root.querySelector('.lw-hint b').textContent = lantern
      ? 'Lanterns drink the light. Give each its own branch.'
      : prism
        ? 'Fork a shard: half straight, half reflected.'
        : 'Drag a shard. Turn its end handles.';
    root.querySelector('.lw-hint span').textContent = lantern
      ? 'Each needs 20% source light · F forks a shard · Brightness matters · Pause to plan'
      : prism
        ? 'F toggles fork / focus · Flowers pass light onward · Pause to plan your circuit'
        : 'Mouse wheel or Q / E rotates · 1 / 2 / 3 selects · arrows move';
    root.querySelector('.lw-eyebrow span').textContent =
      `DRIFT ${String(world.round).padStart(2, '0')}`;
    root.querySelector('.lw-progress').innerHTML =
      Array.from(
        { length: total },
        (_, i) =>
          `<i class="${i < (prism ? world.prism.lit : count) ? 'lit' : ''}">✧</i>`
      ).join('') +
      `<span>${prism ? `${world.prism.lit} / ${total} lit · ${(world.prism.chord || 0).toFixed(1)} / 2s chord` : `${count} / ${total} bloomed`}</span>`;
    root.querySelector('.lw-energy i').style.width = `${world.energy}%`;
    root.querySelector('.lw-energy strong').textContent = paused
      ? 'TINKERING'
      : world.status === 'ready'
        ? 'READY'
        : `${Math.ceil(world.energy)}s`;
    root.querySelector('.lw-energy').classList.toggle('low', world.energy < 20);
    root.querySelector('[data-action="pause"]').textContent = paused
      ? 'Resume light'
      : 'Pause / tinker';
    root.querySelector('[data-action="mode"]').textContent =
      view.mode === 'move' ? '↔ Move' : '↻ Rotate';
    root.querySelector('[data-action="undo"]').disabled = !undoCount;
    root.querySelector('.lw-hint').hidden =
      world.status === 'lost' || (world.moves >= 2 && !showHelp);
    root.classList.toggle('lw-won', world.status === 'won');
    const resultButton = root.querySelector('[data-action="results"]');
    resultButton.hidden = world.status !== 'won';
    resultButton.textContent = resultsOpen ? 'Hide result' : 'Show result';
    const result = root.querySelector('.lw-result');
    result.hidden = world.status === 'won' && !resultsOpen;
    let resultHTML = '';
    if (world.status === 'won')
      resultHTML = /* HTML */ `<section>
        <p class="lw-eyebrow">CONSTELLATION ALIVE</p>
        <h2>
          ${lantern ? 'Four lights. One constellation.' : prism ? 'A star chord. Yours.' : 'The dark remembers.'}
        </h2>
        <p>
          ${world.moves} adjustments ·
          ${prism ? 'stable circuit' : `${Math.round(world.elapsed)} active seconds`}<br />Keep
          playing with the light, or drift onward.
        </p>
        <p class="lw-score">
          Personal best for this constellation: ${bestRoute} adjustments
        </p>
        <div>
          <button data-action="next">Next drift</button>
          <button data-action="reset">Try a cleaner route</button
          >${!prism ? '<button data-action="prism">Try prism challenge</button>' : ''}${prism && !lantern ? '<button data-action="lantern">Try the lantern trial</button>' : ''}
        </div>
      </section>`;
    else if (world.status === 'lost')
      resultHTML = /* HTML */ `<section>
        <p class="lw-eyebrow">THE LIGHT RESTS</p>
        <h2>Another way through.</h2>
        <p>${count} seeds bloomed. The mirrors remember what you learned.</p>
        <div>
          <button data-action="reset">Try again ↻</button>
          <button data-action="practice">Tinker without a timer</button>
        </div>
      </section>`;
    if (resultHTML !== lastResultHTML) {
      result.innerHTML = resultHTML;
      lastResultHTML = resultHTML;
    }
  }
  return { root, canvas, updateHUD };
}
