/* Stateless setup helpers. Timelines remain authored in each composition. */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const txt = (value, max = 50) => {
    const s = String(value ?? "");
    if (Array.from(s).length > max)
      throw new Error(
        `Text exceeds ${max} characters. Shorten the variable value before rendering.`,
      );
    return s;
  };
  const safeImage = (s) =>
    !!s && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|svg)$/i.test(s);
  const art = (variant = 0, image = "") => {
    if (image && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|svg)$/i.test(image))
      return `<img class="ic-art" alt="사용자 제공 시각 자료" src="${esc(image)}">`;
    // 2026-10-03: variants 4–7 are distinct subjects (city, portrait, product, plant) so single-image pieces stop sharing
    // one picture; 0–3 stay the arch (pieces that show several takes of one subject keep using them).
    const open = (label) =>
      `<svg class="ic-art" data-layout-allow-overflow="true" data-layout-overflow-reason="Intentional image crop via preserveAspectRatio slice" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">`;
    if (variant === 4)
      return `${open("코드로 그린 해 질 녘 도시 설명용 일러스트")}<rect width="800" height="560" fill="#d9d6c9"/><circle class="art-sun" cx="560" cy="300" r="90" fill="#f4f3ee"/><path d="M0 330H90V250H150V300H210V190H290V330H330V230H420V330H470V160H540V330H600V260H690V330H800V560H0Z" fill="#8c8a80"/><path d="M0 400H120V320H180V380H260V290H330V400H400V340H480V400H560V300H650V400H800V560H0Z" fill="#55554e"/><g class="art-object" fill="#d4f527"><rect x="235" y="215" width="12" height="16"/><rect x="495" y="190" width="12" height="16"/><rect x="505" y="240" width="12" height="16"/></g><rect y="470" width="800" height="90" fill="#353632"/></svg>`;
    if (variant === 5)
      return `${open("코드로 그린 인물 실루엣 설명용 일러스트")}<rect width="800" height="560" fill="#e5e2d5"/><circle cx="560" cy="150" r="70" fill="#f8f7ef"/><g class="art-object"><path d="M400 120c58 0 96 44 96 104 0 52-28 92-64 104v24c86 16 150 64 170 208H198c20-144 84-192 170-208v-24c-36-12-64-52-64-104 0-60 38-104 96-104Z" fill="#353632"/><path d="M330 228h140" stroke="#d4f527" stroke-width="14" stroke-linecap="round"/></g></svg>`;
    if (variant === 6)
      return `${open("코드로 그린 제품 병 설명용 일러스트")}<rect width="800" height="560" fill="#ccc9bd"/><ellipse cx="400" cy="470" rx="210" ry="34" fill="#9f9d94"/><rect x="250" y="440" width="300" height="40" rx="8" fill="#b7b5aa"/><g class="art-object"><rect x="372" y="120" width="56" height="60" rx="8" fill="#353632"/><path d="M340 200c0-14 12-24 26-24h68c14 0 26 10 26 24v228c0 12-10 22-22 22H362c-12 0-22-10-22-22Z" fill="#f4f3ee"/><rect x="340" y="290" width="120" height="70" fill="#d4f527"/></g></svg>`;
    if (variant === 7)
      return `${open("코드로 그린 화분 식물 설명용 일러스트")}<rect width="800" height="560" fill="#e5e2d5"/><rect y="430" width="800" height="130" fill="#b7b5aa"/><g class="art-object"><path d="M330 330h140l-18 140H348Z" fill="#77776e"/><path d="M400 330C400 250 360 200 300 180c40 50 60 90 100 150Z" fill="#55554e"/><path d="M400 330c0-90 40-150 110-170-40 60-60 110-110 170Z" fill="#353632"/><path d="M400 330c-6-70 6-150 40-210-6 80-20 140-40 210Z" fill="#d4f527"/></g></svg>`;
    const sunX = [640, 180, 510, 320][variant % 4];
    const ground = ["#b7b5aa", "#ccc9bd", "#9f9d94", "#d9d6c9"][variant % 4];
    return `<svg class="ic-art" data-layout-allow-overflow="true" data-layout-overflow-reason="Intentional image crop via preserveAspectRatio slice" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="코드로 그린 산과 원형 건축물 설명용 일러스트"><rect width="800" height="560" fill="#e5e2d5"/><circle class="art-sun" cx="${sunX}" cy="125" r="58" fill="#f8f7ef"/><path d="M0 370 150 200 330 352 515 185 800 370V560H0Z" fill="${ground}"/><path d="M0 485 230 365 420 450 650 328 800 425V560H0Z" fill="#77776e"/><ellipse cx="430" cy="510" rx="142" ry="22" fill="#353632" opacity=".3"/><g class="art-object"><path d="M350 456V266A80 80 0 0 1 510 266V456H473V266A43 43 0 0 0 387 266V456Z" fill="#f4f3ee"/><path d="M350 456 380 477H540L510 456Z" fill="#ccc9bd"/><path d="M510 266 540 284V477L510 456Z" fill="#d3d0c3"/></g></svg>`;
  };
  const cursor = () =>
    '<svg class="ic-cursor" id="ic-cursor" viewBox="0 0 32 42"><path d="M3 2V33L11 26L17 39L23 36L17 24H29Z" fill="#f4f3ee" stroke="#0a0a0a" stroke-width="2"/></svg>';
  const setText = (id, value) => {
    document.getElementById(id).textContent = txt(value);
  };
  window.IC = { esc, txt, art, cursor, setText, safeImage };
})();
