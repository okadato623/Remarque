const simplemde = new SimpleMDE({
  element: document.getElementById("editor"),
  toolbar: [],
  spellChecker: false,
  status: false,
  indentWithTabs: false,
  tabSize: 2,
})

let contents

chrome.storage.local.get({ storedContents: [], activeTabId: "" }, function (
  items
) {
  contents = items.storedContents
  if (contents.length !== 0) {
    contents.forEach(function (content) {
      loadTabFromStore(content, content.id === items.activeTabId)
    })
  } else {
    createNewTab()
  }
})

window.addEventListener("unload", function () {
  saveActiveTab()
})

$(document).on("keydown", function (e) {
  if (e.metaKey && e.which === 83) {
    saveActiveTab()
    e.preventDefault()
    return false
  }
})

$("#createNewTabBtn").on("click", createNewTab)
$("#deleteActiveTabBtn").on("click", deleteActiveTab)

function createNewTab() {
  if (countTabs() > 5) {
    alert("You can use up to 6 tabs!")
    return
  }
  saveActiveTab()
  deactivateAllTabs()
  createNewTabElem(null, true)
  flushTextarea()
}

function createNewTabElem(content = null, active = false) {
  const newTabElem = document.createElement("div")
  newTabElem.contentEditable = true
  newTabElem.addEventListener("keydown", function (e) {
    if (e.keyCode === 13) {
      e.preventDefault()
      return false
    }
  })
  if (content === null) {
    newTabElem.id = idGenerator()
    newTabElem.innerHTML = "New Tab"
  } else {
    newTabElem.id = content.id
    newTabElem.innerHTML = content.title
  }
  newTabElem.className = active ? "EditableTab ActiveTab" : "EditableTab"
  newTabElem.onclick = function () {
    focusClickedTab(this)
  }
  $("#button-list").append(newTabElem)
}

function loadTabFromStore(content, active = false) {
  createNewTabElem(content, active)
  if (active) {
    const codemirror = $('textarea[id="editor"]').nextAll(".CodeMirror")[0]
      .CodeMirror
    codemirror.getDoc().setValue(content.content)
  }
}

function activateLastTab() {
  const tabs = document.getElementById("button-list").childNodes
  const lastTab = tabs[tabs.length - 1]
  lastTab.className += " ActiveTab"
  const savedTab = contents.find((content) => content.id === lastTab.id)
  const content = savedTab === undefined ? "" : savedTab.content
  const codemirror = $('textarea[id="editor"]').nextAll(".CodeMirror")[0]
    .CodeMirror
  codemirror.getDoc().setValue(content)
  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: lastTab.id,
  })
}

function deactivateAllTabs() {
  const tabs = document.getElementById("button-list").childNodes
  tabs.forEach(function (tab) {
    if (tab.classList !== undefined) {
      tab.classList.remove("ActiveTab")
    }
  })
}

function focusClickedTab(tab) {
  saveActiveTab()
  const tabs = document.getElementById("button-list").childNodes
  tabs.forEach(function (tab) {
    if (tab.classList !== undefined) {
      tab.classList.remove("ActiveTab")
    }
  })
  tab.className += " ActiveTab"
  const savedTab = contents.find((content) => content.id === tab.id)
  const content = savedTab === undefined ? "" : savedTab.content
  const codemirror = $('textarea[id="editor"]').nextAll(".CodeMirror")[0]
    .CodeMirror
  codemirror.getDoc().setValue(content)
  chrome.storage.local.set({ storedContents: contents, activeTabId: tab.id })
}

function saveActiveTab() {
  const active = document.getElementsByClassName("ActiveTab")[0]
  if (active === undefined) return
  const json = {
    id: active.id,
    title: active.innerHTML,
    content: simplemde.value(),
  }
  const idx = contents.findIndex((content) => content.id === json.id)
  idx === -1 ? contents.push(json) : (contents[idx] = json)

  chrome.storage.local.set({ storedContents: contents, activeTabId: active.id })
}

function deleteActiveTab() {
  if (window.confirm("Sure?") === false) return
  const active = document.getElementsByClassName("ActiveTab")[0]
  if (active === undefined) return
  contents = contents.filter((content) => content.id !== active.id)
  active.remove()
  flushTextarea()
  chrome.storage.local.set({ storedContents: contents, activeTabId: active.id })
  activateLastTab()
}

function flushTextarea() {
  const codemirror = $('textarea[id="editor"]').nextAll(".CodeMirror")[0]
    .CodeMirror
  codemirror.getDoc().setValue("")
}

function countTabs() {
  return document.getElementsByClassName("EditableTab").length
}

function idGenerator() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}
