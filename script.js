document.addEventListener('DOMContentLoaded', () => {
  const TOTAL_TARGET = 5;
  let capturedPokemons = [];

  // ----------------------------------------------------
  // 0. SINTETIZADOR DE VOZ (ESTILO POKÉDEX DE ASH)
  // ----------------------------------------------------
  function speakText(textToSpeak, onEndCallback) {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    if (onEndCallback) {
      utterance.onend = onEndCallback;
      utterance.onerror = onEndCallback;
    }

    window.speechSynthesis.speak(utterance);
  }

  // ----------------------------------------------------
  // 1. SINTETIZADOR DE SONIDOS RETRO 8-BIT
  // ----------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    switch (type) {
      case 'intro-theme': {
        const notes = [
          { f: 392.00, d: 0.15 }, { f: 523.25, d: 0.15 },
          { f: 659.25, d: 0.15 }, { f: 783.99, d: 0.30 },
          { f: 659.25, d: 0.15 }, { f: 783.99, d: 0.50 }
        ];
        let t = now;
        notes.forEach(n => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(n.f, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + n.d);
          t += n.d;
        });
        break;
      }
      case 'start': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'throw': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'catch': {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const st = now + i * 0.08;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.12, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(st);
          osc.stop(st + 0.12);
        });
        break;
      }
      case 'victory': {
        const tune = [
          { f: 523.25, d: 0.15 }, { f: 659.25, d: 0.15 }, { f: 783.99, d: 0.15 },
          { f: 1046.50, d: 0.3 }, { f: 880, d: 0.15 }, { f: 1046.50, d: 0.5 }
        ];
        let offset = 0;
        tune.forEach(note => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const st = now + offset;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, st);
          gain.gain.setValueAtTime(0.15, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + note.d);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(st);
          osc.stop(st + note.d);
          offset += note.d;
        });
        break;
      }
    }
  }

  // ----------------------------------------------------
  // 2. REFERENCIAS DOM
  // ----------------------------------------------------
  const splashScreen = document.getElementById('splash-screen');
  const audioUnlockBox = document.getElementById('audio-unlock-box');
  const btnUnlockAudio = document.getElementById('btn-unlock-audio');
  const introBox = document.getElementById('intro-animation-box');
  const splashCard = document.getElementById('splash-card');
  const btnStart = document.getElementById('btn-start');
  const qrInput = document.getElementById('qr-input');
  const btnTriggerCamera = document.getElementById('btn-trigger-camera');
  const previewImg = document.getElementById('preview-img');
  const viewerPlaceholder = document.getElementById('viewer-placeholder');
  const ledStatus = document.getElementById('led-status');
  const mainLed = document.getElementById('main-led');
  const progressCounter = document.getElementById('progress-counter');
  const slotsContainer = document.getElementById('slots-container');
  const victoryCard = document.getElementById('victory-card');
  const whatsappShareBtn = document.getElementById('whatsapp-share-btn');
  const trainerNameInput = document.getElementById('trainer-name');

  // CAPTURA OVERLAY DOM
  const captureOverlay = document.getElementById('capture-overlay');
  const flashEffect = document.getElementById('flash-effect');
  const captureStatusText = document.getElementById('capture-status-text');
  const captureSpriteBox = document.getElementById('capture-sprite-box');
  const captureSprite = document.getElementById('capture-sprite');
  const pokeballAnim = document.getElementById('pokeball-anim');
  const capturePokemonName = document.getElementById('capture-pokemon-name');
  const capturePokemonTypes = document.getElementById('capture-pokemon-types');
  const capturePokemonAbilities = document.getElementById('capture-pokemon-abilities');
  const capturePokemonEvo = document.getElementById('capture-pokemon-evo');
  const btnCloseCapture = document.getElementById('btn-close-capture');

  // MODAL VICTORIA Y CANVAS DOM
  const victoryModal = document.getElementById('victory-modal');
  const victoryCanvas = document.getElementById('victory-canvas');
  const btnDownloadCard = document.getElementById('btn-download-card');
  const btnCloseVictory = document.getElementById('btn-close-victory');
  const btnReopenVictory = document.getElementById('btn-reopen-victory');

  const html5QrCode = new Html5Qrcode("photo-viewer");

  initSlots();

  // ----------------------------------------------------
  // 3. FLUJO DE INTRO Y BOTONES INICIALES
  // ----------------------------------------------------
  btnUnlockAudio.addEventListener('click', () => {
    initAudio();
    audioUnlockBox.classList.add('hidden');
    introBox.classList.remove('hidden');
    playSound('intro-theme');

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    setTimeout(() => {
      introBox.classList.add('hidden');
      splashCard.classList.remove('hidden');
    }, 2400);
  });

  const handleStart = (e) => {
    if (e) e.preventDefault();
    playSound('start');
    splashScreen.style.display = 'none';
  };
  btnStart.addEventListener('click', handleStart);

  btnTriggerCamera.addEventListener('click', () => {
    playSound('start');
    qrInput.click();
  });

  // ----------------------------------------------------
  // 4. LECTURA DE QR Y PROCESAMIENTO
  // ----------------------------------------------------
  qrInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUri = URL.createObjectURL(file);
    previewImg.src = imageUri;
    previewImg.classList.remove('hidden');
    viewerPlaceholder.classList.add('hidden');

    setLedStatus('ANALIZANDO...', 'status-analyzing');

    try {
      const qrCodeMessage = await html5QrCode.scanFile(file, true);
      const pokemonName = extractPokemonName(qrCodeMessage);

      if (!pokemonName) {
        alert("El código QR no contiene un nombre de Pokémon válido.");
        resetQrScannerView();
        return;
      }

      if (capturedPokemons.some(p => p.name.toLowerCase() === pokemonName.toLowerCase())) {
        alert(`¡El Pokémon ${pokemonName.toUpperCase()} ya fue registrado previamente!`);
        resetQrScannerView();
        return;
      }

      await processPokemon(pokemonName.toLowerCase());

    } catch (err) {
      console.error("Error al leer QR:", err);
      alert("No se detectó ningún código QR válido en la imagen. Inténtalo de nuevo.");
      resetQrScannerView();
    } finally {
      qrInput.value = '';
    }
  });

  function resetQrScannerView() {
    previewImg.src = '';
    previewImg.classList.add('hidden');
    viewerPlaceholder.classList.remove('hidden');
    setLedStatus('LISTO PARA FOTO', 'status-ready');
  }

  function extractPokemonName(qrText) {
    let text = qrText.trim();
    if (text.includes('/')) {
      const parts = text.split('/').filter(Boolean);
      text = parts[parts.length - 1];
    }
    return text.toLowerCase();
  }

  async function processPokemon(pokemonName) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
      if (!res.ok) throw new Error('Pokémon no encontrado');
      const data = await res.json();

      // Consultar la especie para obtener la descripción en español y la cadena de evolución
      const speciesRes = await fetch(data.species.url);
      const speciesData = await speciesRes.json();

      let flavorText = "Pokémon registrado con éxito.";
      const spanishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');
      if (spanishEntry) {
        flavorText = spanishEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
      }

      let spanishName = data.name;
      const spanishNameObj = speciesData.names.find(n => n.language.name === 'es');
      if (spanishNameObj) {
        spanishName = spanishNameObj.name;
      }

      const types = data.types.map(t => t.type.name).join(', ');
      const abilities = data.abilities.map(a => a.ability.name).slice(0, 2).join(', ');
      const evolutionChain = await fetchEvolutionChain(speciesData.evolution_chain.url);
      const spriteUrl = data.sprites.front_default || data.sprites.other['official-artwork'].front_default;

      showPokeballCaptureSequence({
        name: spanishName,
        flavorText: flavorText,
        types: types,
        abilities: abilities,
        evolutions: evolutionChain,
        sprite: spriteUrl
      });

    } catch (error) {
      console.error("Error al obtener datos:", error);
      alert(`No se pudo obtener información para: ${pokemonName}`);
      resetQrScannerView();
    }
  }

  function resetCaptureOverlay() {
    captureStatusText.innerText = "¡UN POKÉMON SILVESTRE APARECIÓ!";
    capturePokemonName.innerText = "???";
    capturePokemonTypes.innerText = "Tipo: ---";
    capturePokemonAbilities.innerText = "Habilidades: ---";
    capturePokemonEvo.innerText = "Evolución: ---";
    
    captureSprite.src = "";
    captureSprite.className = "capture-sprite hidden";
    
    pokeballAnim.className = "pokeball hidden";
    captureSpriteBox.classList.remove('captured-glow');
    btnCloseCapture.classList.add('hidden');
  }

  function showPokeballCaptureSequence(pokemonData) {
    resetCaptureOverlay();

    captureSprite.src = pokemonData.sprite;
    captureSprite.className = 'capture-sprite sprite-silhouette';
    captureSprite.classList.remove('hidden');

    captureOverlay.classList.remove('hidden');

    flashEffect.classList.add('flash-active');
    setTimeout(() => flashEffect.classList.remove('flash-active'), 600);

    setTimeout(() => {
      playSound('throw');
      captureStatusText.innerText = "¡POKÉBOLA, VE!";
      captureSprite.classList.add('sprite-suck-in');

      setTimeout(() => {
        captureSprite.classList.add('hidden');
        pokeballAnim.classList.remove('hidden');
        pokeballAnim.classList.add('pokeball-catch-anim');

        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      }, 400);

    }, 1200);

    setTimeout(() => {
      playSound('catch');
      pokeballAnim.classList.add('hidden');
      captureSprite.className = 'capture-sprite';
      captureSprite.classList.remove('hidden');
      captureSpriteBox.classList.add('captured-glow');

      captureStatusText.innerText = `¡${pokemonData.name.toUpperCase()} HA SIDO CAPTURADO!`;
      capturePokemonName.innerText = pokemonData.name;
      capturePokemonTypes.innerText = `Tipo: ${pokemonData.types}`;
      capturePokemonAbilities.innerText = `Habilidades: ${pokemonData.abilities}`;
      capturePokemonEvo.innerText = `Evolución: ${pokemonData.evolutions}`;

      btnCloseCapture.classList.remove('hidden');

      // 🔊 REPRODUCIR VOZ DE LA POKÉDEX (Estilo Ash Ketchum)
      const speechMessage = `${pokemonData.name}. ${pokemonData.flavorText}. Sus poderes y habilidades principales son: ${pokemonData.abilities}.`;
      speakText(speechMessage);

    }, 3200);

    const handleConfirm = () => {
      playSound('start');
      window.speechSynthesis.cancel();
      btnCloseCapture.removeEventListener('click', handleConfirm);
      
      captureOverlay.classList.add('hidden');
      resetCaptureOverlay();
      
      resetQrScannerView();

      capturedPokemons.push({
        name: pokemonData.name,
        sprite: pokemonData.sprite
      });

      updateSlot(capturedPokemons.length - 1, {
        name: pokemonData.name,
        sprite: pokemonData.sprite,
        abilities: pokemonData.abilities,
        evolutions: pokemonData.evolutions
      });

      setLedStatus('¡CAPTURADO!', 'status-captured');
      updateProgress();
      flashMainLed();

      if (capturedPokemons.length >= TOTAL_TARGET) {
        triggerVictorySequence();
      }
    };

    btnCloseCapture.onclick = handleConfirm;
  }

  // ----------------------------------------------------
  // 5. EVENTOS DEL DIPLOMA Y ACTUALIZACIÓN EN TIEMPO REAL
  // ----------------------------------------------------
  trainerNameInput.addEventListener('input', () => {
    renderVictoryDiplomaCanvas();
    updateWhatsappShareLink();
  });

  function triggerVictorySequence() {
    victoryCard.classList.remove('hidden');
    playSound('victory');

    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }

    renderVictoryDiplomaCanvas();
    updateWhatsappShareLink();
    victoryModal.classList.remove('hidden');

    speakText("¡Felicitaciones! Has registrado los cinco Pokémon exitosamente. Misión cumplida.");
  }

  function updateWhatsappShareLink() {
    const trainerName = trainerNameInput.value.trim().toUpperCase() || 'ENTRENADOR';
    const listNames = capturedPokemons.map((p, i) => `  #0${i+1} 🔴 *${p.name.toUpperCase()}*`).join('\n');
    
    const rawMessage = `🔥 *¡¡MISIÓN CUMPLIDA EN LA FIESTA DE MATEO!!* 🔥\n\n` +
      `⚡ ¡Soy *${trainerName}* y me convertí en Maestro Pokémon en la *Mateo Pokédex Quest*! 🏆🎉\n\n` +
      `🎮 *Mis 5 Pokémon Capturados:*\n${listNames}\n\n` +
      `📸 *(Diploma Oficial adjunto emitido el ${getFormattedDate()})* 👇✨`;

    whatsappShareBtn.href = `https://wa.me/?text=${encodeURIComponent(rawMessage)}`;
  }

  function getFormattedDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('es-ES', options);
  }

  // ----------------------------------------------------
  // 6. RENDERIZADO COMPLETO DEL DIPLOMA CANVAS
  // ----------------------------------------------------
  function renderVictoryDiplomaCanvas() {
    const ctx = victoryCanvas.getContext('2d');
    const nameText = trainerNameInput.value.trim().toUpperCase() || 'INVITADO ESPECIAL';

    const gradient = ctx.createLinearGradient(0, 0, 600, 420);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e1b4b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 420);

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 580, 400);

    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 564, 384);

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('FIESTA DE CUMPLEAÑOS DE MATEO', 300, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('DIPLOMA DE MAESTRO POKÉMON', 300, 60);

    ctx.fillStyle = '#00ffcc';
    ctx.font = '11px Courier New';
    ctx.fillText('CERTIFICA OFICIALMENTE AL ENTRENADOR:', 300, 80);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 22px "Press Start 2P", Courier New, monospace';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.fillText(nameText, 300, 108);
    ctx.shadowBlur = 0;

    const slotWidth = 90;
    const startX = 35;
    const yPos = 125;

    capturedPokemons.forEach((p, idx) => {
      const x = startX + idx * 105;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, yPos, slotWidth, 120);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, yPos, slotWidth, 120);

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = p.sprite;
      img.onload = () => {
        ctx.drawImage(img, x + 5, yPos + 8, 80, 80);

        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(p.name.toUpperCase(), x + 45, yPos + 105);
      };
    });

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText(`FECHA DE EMISIÓN: ${getFormattedDate().toUpperCase()}`, 300, 275);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(35, 345);
    ctx.lineTo(185, 345);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 13px "Georgia", serif';
    ctx.fillText('Ash Ketchum', 110, 337);
    ctx.font = '9px Courier New';
    ctx.fillStyle = '#aaa';
    ctx.fillText('CAMPEÓN MUNDIAL POKÉMON', 110, 358);

    ctx.beginPath();
    ctx.moveTo(215, 345);
    ctx.lineTo(385, 345);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 13px "Georgia", serif';
    ctx.fillText('Mateo Álvarez Jabonero', 300, 337);
    ctx.font = 'bold 8px Courier New';
    ctx.fillStyle = '#aaa';
    ctx.fillText('ENTRENADOR LEYENDA ANFITRIÓN', 300, 358);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(415, 345);
    ctx.lineTo(565, 345);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 13px "Georgia", serif';
    ctx.fillText('Prof. Samuel Oak', 490, 337);
    ctx.font = '9px Courier New';
    ctx.fillStyle = '#aaa';
    ctx.fillText('LABORATORIO PUEBLO PALETA', 490, 358);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText('¡CERTIFICADO VALIDADOR DE LA POKÉDEX QUEST!', 300, 395);
  }

  btnDownloadCard.addEventListener('click', () => {
    playSound('start');
    const imageURI = victoryCanvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `Diploma_Pokedex_${trainerNameInput.value || 'Entrenador'}.png`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnCloseVictory.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
  });

  btnReopenVictory.addEventListener('click', () => {
    victoryModal.classList.remove('hidden');
  });

  // ----------------------------------------------------
  // 7. FUNCIONES AUXILIARES POKÉDEX
  // ----------------------------------------------------
  async function fetchEvolutionChain(speciesUrl) {
    try {
      const evoRes = await fetch(speciesUrl);
      const evoData = await evoRes.json();

      let chain = [];
      let current = evoData.chain;

      while (current) {
        chain.push(current.species.name);
        current = current.evolves_to[0];
      }

      return chain.join(' ➔ ');
    } catch (e) {
      return 'No disponible';
    }
  }

  function initSlots() {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < TOTAL_TARGET; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'slot-item slot-empty';
      slotEl.id = `slot-${i}`;
      slotEl.innerText = `#0${i + 1} Slot Vacío`;
      slotsContainer.appendChild(slotEl);
    }
  }

  function updateSlot(index, info) {
    const slotEl = document.getElementById(`slot-${index}`);
    slotEl.className = 'slot-item slot-filled';
    slotEl.innerHTML = `
      <img class="slot-sprite" src="${info.sprite}" alt="${info.name}">
      <div class="slot-info">
        <span class="slot-name">#0${index + 1} ${info.name}</span>
        <span class="slot-details"><strong>Poderes:</strong> ${info.abilities}</span>
        <span class="slot-details"><strong>Evolución:</strong> ${info.evolutions}</span>
      </div>
    `;
  }

  function updateProgress() {
    progressCounter.innerText = `MISIÓN: ${capturedPokemons.length}/${TOTAL_TARGET}`;
  }

  function setLedStatus(text, className) {
    ledStatus.innerText = text;
    ledStatus.className = `status-indicator ${className}`;
  }

  function flashMainLed() {
    mainLed.style.background = 'radial-gradient(circle at 30% 30%, #50ff50, #008000)';
    setTimeout(() => {
      mainLed.style.background = 'radial-gradient(circle at 30% 30%, #00d2ff, #004080)';
    }, 1500);
  }
});