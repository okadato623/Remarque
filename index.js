let contents
window.id = idGenerator()

chrome.storage.local.get(
  { storedContents: [], activeTabId: "", changeWindowId: "" },
  function (items) {
    contents = items.storedContents
    if (contents.length !== 0) {
      contents.forEach(function (content) {
        loadTabFromStore(content, content.id === items.activeTabId)
      })
    } else {
      initialize()
    }
  }
)

window.addEventListener("unload", function () {
  saveActiveTab()
})

const waitAndExecute = (stack, callback) => {
  stack.forEach((e) => {
    clearTimeout(e)
    stack.shift()
  })

  const eventId = setTimeout(callback, 100)
  stack.push(eventId)
}

const stack = []
$(document).on("keydown", function (e) {
  if (e.metaKey && e.which === 83) {
    saveActiveTab()
    e.preventDefault()
    return false
  }

  const tabs = document.getElementById("tab-list").children
  const active = document.getElementsByClassName("ActiveTab")[0]
  const idx = Array.prototype.indexOf.call(tabs, active)

  if (e.ctrlKey && e.which === 37) {
    if (idx === 0) return
    focusTab(tabs[idx - 1])
    e.preventDefault()
    return false
  }

  if (e.ctrlKey && e.which === 39) {
    if (tabs.length - 1 === idx) return
    focusTab(tabs[idx + 1])
    e.preventDefault()
    return false
  }

  waitAndExecute(stack, () => {
    saveActiveTab()
    $(".cm-link").on("click", (e) => window.open(e.target.innerHTML))
  })
})

$("#createNewTabBtn").on("click", createNewTab)
$("#deleteActiveTabBtn").on("click", deleteActiveTab)
chrome.storage.onChanged.addListener(syncLatestWindow)

function syncLatestWindow() {
  chrome.storage.local.get(
    { storedContents: [], activeTabId: "", changeWindowId: "" },
    function (items) {
      // 変更を及ぼした window の場合は sync は不要
      if (items.changeWindowId === window.id) return

      // 子要素であるタブを一旦すべて消す
      document.getElementById("tab-list").innerHTML = ""
      contents = items.storedContents
      if (contents.length !== 0) {
        contents.forEach(function (content) {
          loadTabFromStore(content, content.id === items.activeTabId)
        })
      } else {
        initialize()
      }
    }
  )
}

function initialize() {
  editor.renew()
  createBlankTab()
}

function createNewTab() {
  if (countTabs() > 5) {
    alert("You can use up to 6 tabs!")
    return
  }
  saveActiveTab()
  deactivateAllTabs()
  editor.renew()
  createBlankTab()
}

function createNewTabElem() {
  const newTabElem = document.createElement("div")
  newTabElem.contentEditable = true
  newTabElem.addEventListener("keydown", function (e) {
    if (e.keyCode === 13) {
      e.preventDefault()
      return false
    }
  })
  newTabElem.onclick = function () {
    focusTab(this)
  }
  
  return newTabElem
}

function createBlankTab() {
  const elem = createNewTabElem()
  elem.id = idGenerator()
  elem.innerHTML = "New Tab"
  elem.className = "EditableTab ActiveTab"
  
  $("#tab-list").append(elem)
}

function createTabFromStore(content, active) {
  const elem = createNewTabElem()
  elem.id = content.id
  elem.innerHTML = content.title
  elem.className = active ? "EditableTab ActiveTab" : "EditableTab"
  
  $("#tab-list").append(elem)
}

function loadTabFromStore(content, active = false) {
  createTabFromStore(content, active)
  if (active) {
    loadTextarea(content.content)
  }
}

function deactivateAllTabs() {
  const tabs = document.getElementById("tab-list").childNodes
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
  const focused = contents.find((content) => content.id === tab.id)
  loadTextarea(focused.content)
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

  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: active.id,
    changeWindowId: window.id,
  })
}

function deleteActiveTab() {
  if (window.confirm("Sure?") === false) return
  const active = document.getElementsByClassName("ActiveTab")[0]
  if (active === undefined) return
  contents = contents.filter((content) => content.id !== active.id)
  active.remove()
  const tabs = document.getElementById("tab-list").childNodes
  focusTab(tabs[tabs.length - 1])
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
