//imports and dependencies
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";


//--- EXTENSION SETTINGS LOGIC ---

//extension location and settings
const extensionName = "Info-Audit";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];

//default settings for the extension
const defaultSettings = {
  someSetting: 'default value',
  lockIconPosition: false,
};
const settingsContainer = document.querySelector('#extensions_settings2'); 


//inline drawer toggle functionality
document.querySelectorAll('.inline-drawer-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.parentElement.classList.toggle('openDrawer');
  });
});


// Lock helpers (sync between settings, localStorage, checkbox and UI)
function getSavedLockState() {
  //prefer extension settings if available, otherwise fall back to localStorage for compatibility
  try {
    if (extension_settings && extension_settings[extensionName] && typeof extension_settings[extensionName].lockIconPosition !== 'undefined') {
      return Boolean(extension_settings[extensionName].lockIconPosition);
    }
  } catch (err) {
    //ignore and fall through
  }
  try {
    return localStorage.getItem('iconLocked') === 'true';
  } catch (err) {
    return false;
  }
}

// --- lock helpers (sync settings, localStorage, checkbox and UI) ---
//set global flag used by drag logic
function setLockState(isLocked) {
  const prev = Boolean(window.isLocked);
  const next = Boolean(isLocked);

  //if nothing changed, sync UI quietly
  if (prev === next) {
    window.isLocked = next;

    //update button UI if present
    const btn = document.getElementById('draggable-icon-btn');
    if (btn) {
      if (next) btn.setAttribute('data-locked', 'true');
      else btn.removeAttribute('data-locked');
    }

    //update extension settings and save
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    extension_settings[extensionName].lockIconPosition = next;
    try { saveSettingsDebounced(); } catch (err) {}

    //save localStorage copy for backward compatibility
    try { localStorage.setItem('iconLocked', next); } catch (err) {}

    //update label + checkbox
    updateLockLabel(next);
    const checkbox = document.getElementById('lock-toggle-icon-position');
    if (checkbox) checkbox.checked = next;

    return false; //no change
  }

  //actual change
  window.isLocked = next;

  //update button UI
  const btn = document.getElementById('draggable-icon-btn');
  if (btn) {
    if (next) btn.setAttribute('data-locked', 'true');
    else btn.removeAttribute('data-locked');
  }

  //update settings and save
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  extension_settings[extensionName].lockIconPosition = next;
  try { saveSettingsDebounced(); } catch (err) {}

  //save localStorage copy
  try { localStorage.setItem('iconLocked', next); } catch (err) {}

  //update label + checkbox
  updateLockLabel(next);
  const checkbox = document.getElementById('lock-toggle-icon-position');
  if (checkbox) checkbox.checked = next;

  return true; //state changed
}

//loads settings into ui
async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // Example checkbox setting
  if (document.querySelector("#example_setting")) {
    $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
  }

  //update lock toggle checkbox
  if (document.querySelector("#lock-toggle-icon-position")) {
    const isLocked = extension_settings[extensionName].lockIconPosition;
    $("#lock-toggle-icon-position").prop("checked", isLocked).trigger("input");
    updateLockLabel(isLocked);
  }

  //sync global state
  setLockState(extension_settings[extensionName].lockIconPosition || false);
}

//update label text for lock toggle
function updateLockLabel(isLocked) {
  const label = document.querySelector("label[for='lock-toggle-icon-position']");
  if (label) label.textContent = isLocked ? "Icon Position Locked" : "Icon Position Unlocked";
}

//called when lock toggle checkbox changes
function onLockToggleInput(event) {
  const isLocked = Boolean($(event.target).prop("checked"));
  setLockState(isLocked); // no toast
}

// Example checkbox input handler
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// Example button click handler
function onButtonClick() {
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}

//load settings html and attach handlers
jQuery(async () => {
  try {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $("#extensions_settings2").append(settingsHtml);

    //attach handlers
    $("#my_button").on("click", onButtonClick);
    $("#example_setting").on("input", onExampleInput);
    $("#lock-toggle-icon-position").on("input", onLockToggleInput);

    loadSettings();
  } catch (err) {
    console.warn("info-audit: failed to load settings html:", err);
  }
});



// --- DRAGGABLE BUTTON LOGIC ---

const _dragState = {
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
  pointerId: null,
  listenersAttached: false,
};

//function to reset the button's position
function resetDraggableButtonPosition() {
  const wrapper = document.getElementById('info-panel-wrapper');
  const target = wrapper || document.getElementById('draggable-icon-btn');
  if (!target) return;

  target.style.top = '20px';
  target.style.left = '20px';
  localStorage.removeItem('draggableButtonPosition');

  positionInfoPanel();
  updatePanelContent();

  console.log('Draggable button position has been reset.');
}


//create a draggable button, appended to body (wrapper created later)
function createDraggableButton() {
  if (document.getElementById('draggable-icon-btn')) return;

  const button = document.createElement('button');
  button.id = 'draggable-icon-btn';
  button.setAttribute('aria-label', 'Hover to open Info-Audit panel (draggable)');

  //prefer absolute: it will sit relative to wrapper when wrapped
  button.style.position = 'absolute';

  document.body.appendChild(button);

  //reflect lock state on the button UI immediately
  if (window.isLocked) {
    button.setAttribute('data-locked', 'true');
  } else {
    button.removeAttribute('data-locked');
  }

  //restore temporary position in case wrapper isn't created yet
  try {
    const saved = localStorage.getItem('draggableButtonPosition');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.top != null && parsed.left != null) {
        button.style.top = parsed.top;
        button.style.left = parsed.left;
      }
    }
  } catch (err) {
    console.warn('Info-Audit: invalid saved position', err);
  }

  //pointerdown starts dragging (only if unlocked)
  button.addEventListener('pointerdown', (e) => {
    if (window.isLocked || !e.isPrimary) return; //no drag if locked (global variable)

    const wrapper = document.getElementById('info-panel-wrapper');
    const mover = wrapper || button;
    const rect = mover.getBoundingClientRect();

    _dragState.isDragging = true;
    _dragState.pointerId = e.pointerId;
    _dragState.offsetX = e.clientX - rect.left;
    _dragState.offsetY = e.clientY - rect.top;

    button.classList.add('is-dragging');
    button.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    try { button.setPointerCapture && button.setPointerCapture(e.pointerId); } catch (err) {}
  });

  //right-click toggles lock state
  button.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    //toggle and persist via the shared helper
    setLockState(!window.isLocked);

    //ensure settings checkbox (if present) reflects the change
    const checkbox = document.getElementById("lock-toggle-icon-position");
    if (checkbox) checkbox.checked = window.isLocked;

    console.log(`[Info Audit] Icon lock state: ${window.isLocked ? 'Locked' : 'Unlocked'}`);
  });


  //attach global listeners once
  if (!_dragState.listenersAttached) {
    document.addEventListener('pointermove', (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;

      const wrapper = document.getElementById('info-panel-wrapper');
      const mover = wrapper || document.getElementById('draggable-icon-btn');
      if (!mover) return;

      const newX = e.clientX - _dragState.offsetX;
      const newY = e.clientY - _dragState.offsetY;

      mover.style.left = `${Math.round(newX)}px`;
      mover.style.top = `${Math.round(newY)}px`;

      positionInfoPanel();
      updatePanelContent();
    });

    //mouse-click release ends dragging
    const finishPointer = (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;

      _dragState.isDragging = false;
      _dragState.pointerId = null;

      const wrapper = document.getElementById('info-panel-wrapper');
      const mover = wrapper || document.getElementById('draggable-icon-btn');
      if (mover) {
        const finalPosition = {
          top: mover.style.top || `${Math.round(mover.getBoundingClientRect().top)}px`,
          left: mover.style.left || `${Math.round(mover.getBoundingClientRect().left)}px`
        };
        try {
          localStorage.setItem('draggableButtonPosition', JSON.stringify(finalPosition));
        } catch (err) {
          console.warn('Info-Audit: cannot save position', err);
        }
      }
      //reset button styles
      const btn = document.getElementById('draggable-icon-btn');
      if (btn) {
        btn.classList.remove('is-dragging');
        btn.style.cursor = 'grab';
        try { btn.releasePointerCapture && btn.releasePointerCapture(e.pointerId); } catch (err) {}
      }

      document.body.style.userSelect = '';
    };

    document.addEventListener('pointerup', finishPointer);
    document.addEventListener('pointercancel', finishPointer);

    _dragState.listenersAttached = true;
  }
}


//create floating info panel and wrapper
function attachHoverPanel() {
  const icon = document.getElementById('draggable-icon-btn');
  if (!icon) return;
  if (document.getElementById('info-panel-wrapper')) return; // already attached

  //create wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'info-panel-wrapper';
  wrapper.className = 'info-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.zIndex = '1000';
  wrapper.style.display = 'inline-block';

  //insert wrapper where the icon is and move icon inside it
  icon.parentNode.insertBefore(wrapper, icon);
  wrapper.appendChild(icon);

  //reset icon positioning so it sits at wrapper origin
  icon.style.position = 'relative';
  icon.style.top = '0';
  icon.style.left = '0';

  //create panel inside wrapper
  const panel = document.createElement('div');
  panel.id = 'info-panel';
  panel.className = 'info-panel';
  wrapper.appendChild(panel);

  //restore saved wrapper position if present
  try {
    const saved = localStorage.getItem('draggableButtonPosition');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.top != null && parsed.left != null) {
        wrapper.style.top = parsed.top;
        wrapper.style.left = parsed.left;
      } else {
        //default if nothing saved
        wrapper.style.top = icon.style.top || '20px';
        wrapper.style.left = icon.style.left || '20px';
      }
    } else {
      wrapper.style.top = icon.style.top || '20px';
      wrapper.style.left = icon.style.left || '20px';
    }
  } catch (err) {
    wrapper.style.top = icon.style.top || '20px';
    wrapper.style.left = icon.style.left || '20px';
  }

  positionInfoPanel();
  updatePanelContent();

  //hover logic: keep panel open while mouse is inside wrapper or panel
  let hideTimeout = null;
  const HIDE_DELAY = 180; // in ms

  const openPanel = () => {
    wrapper.classList.add('open');
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
  };
  const closePanelDelayed = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => { wrapper.classList.remove('open'); hideTimeout = null; }, HIDE_DELAY);
  };

  wrapper.addEventListener('mouseenter', openPanel);
  wrapper.addEventListener('mouseleave', closePanelDelayed);
  wrapper.addEventListener('focusin', openPanel);
  wrapper.addEventListener('focusout', closePanelDelayed);
}


//position the info panel relative to the wrapper (or button if wrapper gone)
function positionInfoPanel() {
  const wrapper = document.getElementById('info-panel-wrapper');
  const panel = document.getElementById('info-panel');
  if (!panel) return;

  if (wrapper) {
    //panel is positioned absolutely inside wrapper via CSS; ensure z-index
    panel.style.zIndex = '9999';
  } else {
    const icon = document.getElementById('draggable-icon-btn');
    if (!icon) return;
    const rect = icon.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${rect.top + rect.height + 6}px`;
    panel.style.left = `${rect.left}px`;
    panel.style.zIndex = '9999';
  }
}


//update panel content (temporary show coordinates)
function updatePanelContent() {
  const wrapper = document.getElementById('info-panel-wrapper');
  const panel = document.getElementById('info-panel');
  if (!panel) return;

  if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    panel.innerHTML = `
      <strong>Position:</strong><br>
      Top: ${Math.round(rect.top)}px<br>
      Left: ${Math.round(rect.left)}px
    `;
  } else {
    const icon = document.getElementById('draggable-icon-btn');
    if (!icon) return;
    const rect = icon.getBoundingClientRect();
    panel.innerHTML = `
      <strong>Position:</strong><br>
      Top: ${Math.round(rect.top)}px<br>
      Left: ${Math.round(rect.left)}px
    `;
  }
}


// Listen for "reset position" button clicks anywhere
document.addEventListener('click', (event) => {
  if (event.target.id === 'reset-icon-position-btn') {
    resetDraggableButtonPosition();
  }
});


// Reposition the panel on resize/scroll so it stays attached to the icon
window.addEventListener('resize', () => {
  positionInfoPanel();
  updatePanelContent();
});
window.addEventListener('scroll', () => {
  positionInfoPanel();
  updatePanelContent();
});


// Safe initialization: run even if DOMContentLoaded already fired
//ensure lock state is set before button creation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDraggableExtension);
} else {
  initDraggableExtension();
}

function initDraggableExtension() {
  //initialize lock state from settings/localStorage
  window.isLocked = getSavedLockState();
  //reflect label in UI if settings already exist
  updateLockLabel(window.isLocked);

  createDraggableButton();
  attachHoverPanel();
  positionInfoPanel();
  updatePanelContent();
}
