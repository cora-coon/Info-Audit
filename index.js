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

// This function is called when the extension settings are changed in the UI
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// This function is called when the button is clicked
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



//function to reset the button's position
function resetDraggableButtonPosition() {
  const button = document.getElementById('draggable-icon-btn');
  if (!button) return; // Do nothing if the button doesn't exist

  //reset position to default (top-left corner)
  const defaultTop = '20px';
  const defaultLeft = '20px';
  button.style.top = defaultTop;
  button.style.left = defaultLeft;

  //remove saved position from localStorage
  localStorage.removeItem('draggableButtonPosition');

  console.log('Draggable button position has been reset.');
}


//create a draggable button
function createDraggableButton() {
  if (document.getElementById('draggable-icon-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'draggable-icon-btn';
  button.setAttribute('aria-label', 'Hover to open Info-Audit panel (draggable)'); //accessibility label
  document.body.appendChild(button);

  const savedPosition = localStorage.getItem('draggableButtonPosition');
  if (savedPosition) {
    const { top, left } = JSON.parse(savedPosition);
    button.style.top = top;
    button.style.left = left;
  } else {
    //default if no saved position
    button.style.top = '20px';
    button.style.left = '20px';
  }

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  button.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - button.getBoundingClientRect().left;
    offsetY = e.clientY - button.getBoundingClientRect().top;
    button.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;
    button.style.left = `${newX}px`;
    button.style.top = `${newY}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    button.style.cursor = 'grab';
    const finalPosition = { top: button.style.top, left: button.style.left };
    localStorage.setItem('draggableButtonPosition', JSON.stringify(finalPosition));
  });
}

// --- NEW: Event Listener for the Settings Button ---
// This listens for clicks anywhere on the page.
document.addEventListener('click', (event) => {
  // Check if the clicked element is our reset button
  if (event.target.id === 'reset-icon-position-btn') {
    resetDraggableButtonPosition();
  }
});


//run the function to create the draggable button
createDraggableButton();
