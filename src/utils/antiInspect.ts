/**
 * Bloqueio de inspeção da página (clique direito, atalhos de DevTools).
 *
 * Ativar/desativar alterando ANTI_INSPECT_ATIVO.
 * Mantido como const simples para poder ser religado rapidamente quando precisar.
 */
const ANTI_INSPECT_ATIVO = true;

function bloquearInspecionar(evento: Event) {
  if (!ANTI_INSPECT_ATIVO) return;
  evento.preventDefault();
  return false;
}

function bloquearAtalhosDevTools(evento: KeyboardEvent) {
  if (!ANTI_INSPECT_ATIVO) return;

  const tecla = evento.key;
  const alvo = evento.target as HTMLElement | null;
  const emCampoEdicao =
    alvo &&
    (alvo.tagName === "INPUT" ||
      alvo.tagName === "TEXTAREA" ||
      alvo.isContentEditable);

  // F12
  if (evento.key === "F12") {
    evento.preventDefault();
    return;
  }

  // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
  if (evento.ctrlKey && evento.shiftKey) {
    const t = tecla.toUpperCase();
    if (t === "I" || t === "J" || t === "C") {
      evento.preventDefault();
      return;
    }
  }

  // Ctrl+U (view-source) — não bloquear dentro de campos de texto
  if (evento.ctrlKey && !evento.shiftKey && tecla.toUpperCase() === "U" && !emCampoEdicao) {
    evento.preventDefault();
    return;
  }

  // Ctrl+S — não bloquear dentro de campos de texto
  if (evento.ctrlKey && !evento.shiftKey && tecla.toUpperCase() === "S" && !emCampoEdicao) {
    evento.preventDefault();
    return;
  }
}

let instalado = false;

export function instalarAntiInspect() {
  if (instalado || !ANTI_INSPECT_ATIVO) return;
  instalado = true;
  document.addEventListener("contextmenu", bloquearInspecionar);
  document.addEventListener("keydown", bloquearAtalhosDevTools);
}
