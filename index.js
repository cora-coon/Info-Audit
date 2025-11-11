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
};
const settingsContainer = document.querySelector('#extensions_settings2'); 


//inline drawer toggle functionality
document.querySelectorAll('.inline-drawer-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.parentElement.classList.toggle('openDrawer');
  });
});


//loads settings into the UI
async function loadSettings() {
  //create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  //update settings in the UI
  if (document.querySelector("#example_setting")) {
    $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
  }
}


function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// Called when the example button is clicked
function onButtonClick() {
  // You can do whatever you want here
  // Let's make a popup appear with the checked setting
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}

//loading settings html into settings menu
jQuery(async () => {
  try {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $("#extensions_settings2").append(settingsHtml);

    //attach handlers (only if elements exist)
    $("#my_button").on("click", onButtonClick);
    $("#example_setting").on("input", onExampleInput);

    loadSettings();
  } catch (err) {

    console.warn("Info-Audit: failed to load settings HTML:", err);
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


// create a draggable button, appended to body (wrapper created later)
function createDraggableButton() {
  if (document.getElementById('draggable-icon-btn')) return;

  const button = document.createElement('button');
  button.id = 'draggable-icon-btn';
  button.setAttribute('aria-label', 'Hover to open Info-Audit panel (draggable)');

  // prefer absolute: it will sit relative to wrapper when wrapped
  button.style.position = 'absolute';

  document.body.appendChild(button);

  // restore temporary position in case wrapper isn't created yet
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

  // --- LOCK TOGGLED STATE ---
let isLocked = localStorage.getItem('iconLocked') === 'true';
if (isLocked) button.setAttribute('data-locked', 'true');

//pointerdown starts dragging (only if unlocked)
button.addEventListener('pointerdown', (e) => {
  if (isLocked || !e.isPrimary) return;  //no drag if locked

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
  isLocked = !isLocked;
  button.setAttribute('data-locked', isLocked);
  localStorage.setItem('iconLocked', isLocked);
  console.log(`Icon lock state: ${isLocked ? 'Locked' : 'Unlocked'}`);
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

    //pointerup ends dragging
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDraggableExtension);
} else {
  initDraggableExtension();
}

function initDraggableExtension() {
  createDraggableButton();
  attachHoverPanel();
  positionInfoPanel();
  updatePanelContent();
}

