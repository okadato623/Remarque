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

  const active = document.getElementsByClassName("ActiveTab")[0]
  const idx = Array.prototype.indexOf.call(active.parentNode.children, active)

  if (e.metaKey && e.which === 37) {
    if (idx === 2) return
    focusTab(active.parentNode.children[idx - 1])
    e.preventDefault()
    return false
  }

  if (e.metaKey && e.which === 39) {
    if (active.parentNode.children.length - 1 === idx) return
    focusTab(active.parentNode.children[idx + 1])
    e.preventDefault()
    return false
  }
})

const waitAndExecute = (stack, callback) => {
  stack.forEach(e => {
    clearTimeout(e)
    stack.shift()
  })

  const eventId = setTimeout(callback, 1000)
  stack.push(eventId)
}

const stack = []
$(document).keydown(_ => {
  waitAndExecute(stack, () => {
    saveActiveTab()
    $(".cm-link").on("click", e => window.open(e.target.innerHTML))
  })
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
  editor.renew()
  createNewTabElem(null, true)
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
    focusTab(this)
  }
  $("#button-list").append(newTabElem)
}

function loadTabFromStore(content, active = false) {
  createNewTabElem(content, active)
  if (active) {
    loadTextarea(content.content)
  }
}

function activateLastTab() {
  const tabs = document.getElementById("button-list").childNodes
  const lastTab = tabs[tabs.length - 1]
  lastTab.className += " ActiveTab"
  const savedTab = contents.find((content) => content.id === lastTab.id)
  const content = savedTab === undefined ? "" : savedTab.content
  loadTextarea(content)
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

function focusTab(tab) {
  saveActiveTab()
  deactivateAllTabs()
  tab.className += " ActiveTab"
  const savedTab = contents.find((content) => content.id === tab.id)
  const content = savedTab === undefined ? "" : savedTab.content
  loadTextarea(content)
  chrome.storage.local.set({ storedContents: contents, activeTabId: tab.id })
}

function saveActiveTab() {
  const active = document.getElementsByClassName("ActiveTab")[0]
  if (active === undefined) return
  const json = {
    id: active.id,
    title: active.innerHTML,
    content: editor.value(),
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
  chrome.storage.local.set({ storedContents: contents, activeTabId: active.id })
  activateLastTab()
}

function loadTextarea(content) {
  editor.renew(content)

  $(".cm-link").on("click", function (e) {
    window.open(e.target.innerHTML)
  })
}

function countTabs() {
  return document.getElementsByClassName("EditableTab").length
}

function idGenerator() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(32).substring(1)
}
