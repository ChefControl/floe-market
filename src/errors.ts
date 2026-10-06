// Imported first by main.ts so it catches errors thrown while other modules build the scene.
const errBox = document.getElementById('err')!;

export function showErr(m: string) {
  errBox.style.display = 'block';
  errBox.textContent = m;
}

window.addEventListener('error', e => showErr('Something broke: ' + (e.message || e)));
