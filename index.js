//importsanddependencies
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { updatePanelContent } from './update-panel.js';

  //extensionsettingslogic
  const extensionName = "Info-Audit";
  const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
  const extensionSettings = extension_settings[extensionName];

  const defaultSettings = {someSetting: 'default value', lockIconPosition: false, example_setting: false};
  const settingsContainer = document.querySelector('#extensions_settings2'); 


  //inlinedrawertoggle
  document.querySelectorAll('.inline-drawer-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>toggle.parentElement.classList.toggle('openDrawer'));
  });

  //getsavedlockstate
  function getSavedLockState(){
    try{
      if(extension_settings && extension_settings[extensionName] && typeof extension_settings[extensionName].lockIconPosition!=='undefined'){
        return Boolean(extension_settings[extensionName].lockIconPosition);
      }
    }catch(err){}
    try{ return localStorage.getItem('iconLocked')==='true'; }catch(err){ return false; }
  }

  //setlockstate
  function setLockState(isLocked){
    const prev = Boolean(window.isLocked);
    const next = Boolean(isLocked);
    if(prev===next){
      window.isLocked=next;
      const btn=document.getElementById('draggable-icon-btn');
      if(btn){ if(next) btn.setAttribute('data-locked','true'); else btn.removeAttribute('data-locked'); }
      extension_settings[extensionName]=extension_settings[extensionName]||{};
      extension_settings[extensionName].lockIconPosition=next;
      try{saveSettingsDebounced();}catch(err){}
      try{localStorage.setItem('iconLocked',next);}catch(err){}
      updateLockLabel(next);
      const checkbox=document.getElementById('lock-toggle-icon-position');
      if(checkbox) checkbox.checked=next;
      return false;
    }
    window.isLocked=next;
    const btn=document.getElementById('draggable-icon-btn');
    if(btn){ if(next) btn.setAttribute('data-locked','true'); else btn.removeAttribute('data-locked'); }
    extension_settings[extensionName]=extension_settings[extensionName]||{};
    extension_settings[extensionName].lockIconPosition=next;
    try{saveSettingsDebounced();}catch(err){}
    try{localStorage.setItem('iconLocked',next);}catch(err){}
    updateLockLabel(next);
    const checkbox=document.getElementById('lock-toggle-icon-position');
    if(checkbox) checkbox.checked=next;
    return true;
  }

  //loadsettingsintoui
  async function loadSettings(){
    extension_settings[extensionName]=extension_settings[extensionName]||{};
    if(Object.keys(extension_settings[extensionName]).length===0){
      Object.assign(extension_settings[extensionName],defaultSettings);
    }
    // Ensure example_setting property exists in settings
    if (typeof extension_settings[extensionName].example_setting === 'undefined') {
      extension_settings[extensionName].example_setting = defaultSettings.example_setting;
    }
    const exampleSettingElement = document.querySelector("#example_setting");
    if(exampleSettingElement){
      $(exampleSettingElement).prop("checked",extension_settings[extensionName].example_setting).trigger("input");
    }
    const lockToggleElement = document.querySelector("#lock-toggle-icon-position");
    if(lockToggleElement){
      const isLocked=extension_settings[extensionName].lockIconPosition;
      $(lockToggleElement).prop("checked",isLocked).trigger("input");
      updateLockLabel(isLocked);
    }
    setLockState(extension_settings[extensionName].lockIconPosition||false);
  }

  //updatelocklabel
  function updateLockLabel(isLocked){
    const label=document.querySelector("label[for='lock-toggle-icon-position']");
    if(label) label.textContent=isLocked?"Icon Position Locked":"Icon Position Unlocked";
  }

  //locktogglehandler
  function onLockToggleInput(event){ const isLocked=Boolean($(event.target).prop("checked")); setLockState(isLocked); }

  //exampleinputhandler
  function onExampleInput(event){ const value=Boolean($(event.target).prop("checked")); extension_settings[extensionName].example_setting=value; saveSettingsDebounced(); }

  //buttonclickhandler
  function onButtonClick(){
    if (typeof toastr !== 'undefined') {
      toastr.info(`The checkbox is ${extension_settings[extensionName].example_setting?"checked":"not checked"}`,"A popup appeared because you clicked the button!");
    } else {
      console.log(`The checkbox is ${extension_settings[extensionName].example_setting?"checked":"not checked"}`);
    }
  }

  //load html and attach handlers
  if (typeof $ !== 'undefined' && typeof jQuery !== 'undefined') {
    jQuery(async()=>{
      try{
        const settingsHtml=await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        $("#my_button").on("click",onButtonClick);
        $("#example_setting").on("input",onExampleInput);
        $("#lock-toggle-icon-position").on("input",onLockToggleInput);
        $("#reset-icon-position-btn").on("click", resetDraggableButtonPosition);
        loadSettings();
      }catch(err){ console.warn("info-audit: failed to load settings html:",err); }
    });
  } else {
    console.warn("info-audit: jQuery not available, settings may not load properly");
    // Fallback: try to load settings without jQuery
    fetch(`${extensionFolderPath}/settings.html`)
      .then(response => response.text())
      .then(html => {
        const container = document.getElementById('extensions_settings2');
        if (container) {
          container.innerHTML += html;
          // Manually attach event handlers if needed
          const resetBtn = document.getElementById('reset-icon-position-btn');
          if (resetBtn) resetBtn.addEventListener('click', resetDraggableButtonPosition);
        }
      })
      .catch(err => console.warn("info-audit: failed to load settings html:", err));
  }

  //draggable button logic
  //optimizeddraggable+panellogic

//dragstate
const _dragState = { isDragging: false, offsetX: 0, offsetY: 0, pointerId: null, listenersAttached: false };

//resetbuttonposition
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

//createdraggablebutton
function createDraggableButton() {
  if (document.getElementById('draggable-icon-btn')) return;
  const button = document.createElement('button');
  button.id = 'draggable-icon-btn';
  button.setAttribute('aria-label', 'Hover to open Info-Audit panel (draggable)');
  button.setAttribute('data-count', '0'); // Initialize badge counter
  button.style.position = 'absolute';
  document.body.appendChild(button);
  
  // Create counter element as a child of the button
  const counter = document.createElement('span');
  counter.id = 'draggable-icon-counter';
  counter.textContent = '0';
  button.appendChild(counter);
  
  if (window.isLocked) button.setAttribute('data-locked', 'true');

//restoresavedposition
  try {
    const saved = localStorage.getItem('draggableButtonPosition');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.top != null && parsed?.left != null) {
        button.style.top = parsed.top;
        button.style.left = parsed.left;
      }
    }
  } catch (err) { console.warn('Info-Audit: invalid saved position', err); }

//pointerdownfordragging
  button.addEventListener('pointerdown', (e) => {
    if (window.isLocked || !e.isPrimary) return;
    const mover = document.getElementById('info-panel-wrapper') || button;
    const rect = mover.getBoundingClientRect();
    _dragState.isDragging = true;
    _dragState.pointerId = e.pointerId;
    _dragState.offsetX = e.clientX - rect.left;
    _dragState.offsetY = e.clientY - rect.top;
    button.classList.add('is-dragging');
    button.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    try { button.setPointerCapture?.(e.pointerId); } catch {}
  });

//contextmenutoggleslock
  button.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    setLockState(!window.isLocked);
    const checkbox = document.getElementById("lock-toggle-icon-position");
    if (checkbox) checkbox.checked = window.isLocked;
    console.log(`[Info Audit] Icon lock state: ${window.isLocked ? 'Locked' : 'Unlocked'}`);
  });

//attachglobaldraglistenersonce
  if (!_dragState.listenersAttached) {
    document.addEventListener('pointermove', (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;
      const mover = document.getElementById('info-panel-wrapper') || document.getElementById('draggable-icon-btn');
      if (!mover) return;
      mover.style.left = `${Math.round(e.clientX - _dragState.offsetX)}px`;
      mover.style.top = `${Math.round(e.clientY - _dragState.offsetY)}px`;
      positionInfoPanel(); // panel moves, no need to redraw content each frame
    });

    const finishPointer = (e) => {
      if (!_dragState.isDragging || e.pointerId !== _dragState.pointerId) return;
      _dragState.isDragging = false;
      _dragState.pointerId = null;
      const mover = document.getElementById('info-panel-wrapper') || document.getElementById('draggable-icon-btn');
      if (mover) {
        try {
          localStorage.setItem('draggableButtonPosition', JSON.stringify({ top: mover.style.top, left: mover.style.left }));
        } catch {}
      }
      const btn = document.getElementById('draggable-icon-btn');
      if (btn) {
        btn.classList.remove('is-dragging');
        btn.style.cursor = 'grab';
        try { btn.releasePointerCapture?.(e.pointerId); } catch {}
      }
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointerup', finishPointer);
    document.addEventListener('pointercancel', finishPointer);
    _dragState.listenersAttached = true;
  }
}

//attachfloatingpanel
function attachHoverPanel() {
  const icon = document.getElementById('draggable-icon-btn');
  if (!icon || document.getElementById('info-panel-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'info-panel-wrapper';
  wrapper.className = 'info-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.zIndex = '1000';
  wrapper.style.display = 'inline-block';
  icon.parentNode.insertBefore(wrapper, icon);
  wrapper.appendChild(icon);
  icon.style.position = 'relative';
  icon.style.top = '0';
  icon.style.left = '0';

  const panel = document.createElement('div');
  panel.id = 'info-panel';
  panel.className = 'info-panel';
  wrapper.appendChild(panel);

//restorewrapperposition
  try {
    const saved = localStorage.getItem('draggableButtonPosition');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.top != null && parsed?.left != null) {
        wrapper.style.top = parsed.top;
        wrapper.style.left = parsed.left;
      } else {
        wrapper.style.top = icon.style.top || '20px';
        wrapper.style.left = icon.style.left || '20px';
      }
    } else {
      wrapper.style.top = icon.style.top || '20px';
      wrapper.style.left = icon.style.left || '20px';
    }
  } catch { wrapper.style.top = icon.style.top || '20px'; wrapper.style.left = icon.style.left || '20px'; }

  positionInfoPanel();
  updatePanelContent(); // initial population

  let hideTimeout = null;
  const HIDE_DELAY = 180;
  const openPanel = () => { wrapper.classList.add('open'); if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; } };
  const closePanelDelayed = () => { if (hideTimeout) clearTimeout(hideTimeout); hideTimeout = setTimeout(() => { wrapper.classList.remove('open'); hideTimeout = null; }, HIDE_DELAY); };

  wrapper.addEventListener('mouseenter', openPanel);
  wrapper.addEventListener('mouseleave', closePanelDelayed);
  wrapper.addEventListener('focusin', openPanel);
  wrapper.addEventListener('focusout', closePanelDelayed);
}


//windowresizescroll
window.addEventListener('resize', positionInfoPanel);
window.addEventListener('scroll', positionInfoPanel);

//messagedrivenpanelupdateoptimized
if (typeof SillyTavern !== 'undefined' && SillyTavern.onMessageGenerated) {
  SillyTavern.onMessageGenerated(updatePanelContent);
} else {
  // Fallback to direct event listener if SillyTavern.onMessageGenerated is not available
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'WORLD_INFO_ACTIVATED') {
      updatePanelContent();
    }
  });
}

//init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDraggableExtension);
} else {
    initDraggableExtension();
}

//positionpanelrelativetowrapper
function positionInfoPanel() {
  const wrapper = document.getElementById('info-panel-wrapper');
  const panel = document.getElementById('info-panel');
  if (!panel) return;
  panel.style.zIndex = '9999';
  if (!wrapper) {
    const icon = document.getElementById('draggable-icon-btn');
    if (!icon) return;
    const rect = icon.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${rect.top + rect.height + 6}px`;
    panel.style.left = `${rect.left}px`;
  }
}

function initDraggableExtension() {
  try {
    window.isLocked = getSavedLockState();
    updateLockLabel(window.isLocked);
    createDraggableButton();
    attachHoverPanel();
    positionInfoPanel();
    // Initial update of panel content with empty state to ensure it's ready
    setTimeout(() => {
      updatePanelContent(); // initial population
    }, 100);
  } catch (err) { 
    console.error('[Info-Audit] failed to initialize extension:', err); 
  }
}
