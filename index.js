//imports and dependencies
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";


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


// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
    //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // Updating settings in the UI
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

// Called when the extension settings are changed in the UI
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
  const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
  $("#extensions_settings2").append(settingsHtml);

  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);

  loadSettings();
});

// --- DRAGGABLE BUTTON LOGIC ---
// State object for drag
const _dragState = {
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
  pointerId: null,
  listenersAttached: false,
};

//function to reset the button's position
function resetDraggableButtonPosition() {
  const button = document.getElementById('draggable-icon-btn');
  if (!button) return; //do nothing if the button doesn't exist

  button.style.top = '20px';
  button.style.left = '20px';
  //remove saved position from localStorage
  localStorage.removeItem('draggableButtonPosition');

  //update panel if present
  positionInfoPanel();
  updatePanelContent();

  console.log('Draggable button position has been reset.');
}


//create a draggable button
function createDraggableButton() {
  // avoid creating duplicate button
  if (document.getElementById('draggable-icon-btn')) return;

  const button = document.createElement('button');
  button.id = 'draggable-icon-btn';
  button.setAttribute('aria-label', 'Hover to open Info-Audit panel (draggable)'); //accessibility label

  //ensure basic position style
  button.style.position = button.style.position || 'fixed';
  button.style.top = button.style.top || '20px';
  button.style.left = button.style.left || '20px';

  document.body.appendChild(button);

  //restore saved position if available
  try {
    const savedPosition = localStorage.getItem('draggableButtonPosition');
    if (savedPosition) {
      const parsed = JSON.parse(savedPosition);
      
      if (parsed && parsed.top != null && parsed.left != null) {
        button.style.top = parsed.top;
        button.style.left = parsed.left;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved draggable position:', err);
  }

  //attach pointerdown handler to start drag
  button.addEventListener('pointerdown', (e) => {
    //only handle primary pointer
    if (e.isPrimary === false) return;

    _dragState.isDragging = true;
    _dragState.pointerId = e.pointerId;

    const rect = button.getBoundingClientRect();
    _dragState.offsetX = e.clientX - rect.left;
    _dragState.offsetY = e.clientY - rect.top;

    //pointer grabbing to show dragging state
    button.classList.add('is-dragging');
    button.style.cursor = 'grabbing';

    //prevent the page from selecting text while dragging
    document.body.style.userSelect = 'none';

    // capture the pointer so we continue to get events (on the button)
    try {
      button.setPointerCapture && button.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore if not supported
    }
  });

  // Ensure global pointer handlers are attached exactly once
  if (!_dragState.listenersAttached) {
    //pointermove - update position
    document.addEventListener('pointermove', (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;

      const btn = document.getElementById('draggable-icon-btn');
      if (!btn) return;

      //calculate new position
      const newX = e.clientX - _dragState.offsetX;
      const newY = e.clientY - _dragState.offsetY;

      //set style; keep units as px
      btn.style.left = `${Math.round(newX)}px`;
      btn.style.top = `${Math.round(newY)}px`;

      //keep the info panel following the icon and update its content
      positionInfoPanel();
      updatePanelContent();
    });

    // pointerup / pointercancel - finish drag and persist
    const finishPointer = (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;

      _dragState.isDragging = false;
      _dragState.pointerId = null;

      const btn = document.getElementById('draggable-icon-btn');
      if (btn) {
        btn.classList.remove('is-dragging');
        btn.style.cursor = 'grab';

        //save final position to localStorage
        const finalPosition = { top: btn.style.top || `${btn.getBoundingClientRect().top}px`, left: btn.style.left || `${btn.getBoundingClientRect().left}px` };
        try {
          localStorage.setItem('draggableButtonPosition', JSON.stringify(finalPosition));
        } catch (err) {
          console.warn('Failed to save draggable position:', err);
        }
      }

      //restore user-select behavior
      document.body.style.userSelect = '';
    };

    document.addEventListener('pointerup', finishPointer);
    document.addEventListener('pointercancel', finishPointer);

    _dragState.listenersAttached = true;
  }
}

//create the floating info panel
function attachHoverPanel() {
  const icon = document.getElementById('draggable-icon-btn');
  if (!icon || document.getElementById('info-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'info-panel';
  panel.className = 'info-panel';
  icon.insertAdjacentElement('afterend', panel);
  updatePanelContent();
  positionInfoPanel();
}

//position the info panel relative to the button
function positionInfoPanel() {
  const icon = document.getElementById('draggable-icon-btn');
  const panel = document.getElementById('info-panel');
  if (!icon || !panel) return;

  const rect = icon.getBoundingClientRect();
  //place panel below the icon
  const top = rect.top + rect.height + 6;
  const left = rect.left;

  panel.style.position = 'fixed';
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
}

//show coordinates in the panel (temporary content)
function updatePanelContent() {
  const icon = document.getElementById('draggable-icon-btn');
  const panel = document.getElementById('info-panel');
  if (!icon || !panel) return;

  const rect = icon.getBoundingClientRect();
  panel.innerHTML = `
    <strong>Position:</strong><br>
    Top: ${Math.round(rect.top)}px<br>
    Left: ${Math.round(rect.left)}px
  `;
}

// Listen for "reset position" button clicks anywhere
document.addEventListener('click', (event) => {
  // Check if the clicked element is our reset button
  if (event.target.id === 'reset-icon-position-btn') {
    resetDraggableButtonPosition();
  }
});

//reposition the panel on resize/scroll so it stays attached to the icon
window.addEventListener('resize', () => {
  positionInfoPanel();
  updatePanelContent();
});
window.addEventListener('scroll', () => {
  positionInfoPanel();
  updatePanelContent();
});

//initialize the draggable button and panel on DOMContentLoaded
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
