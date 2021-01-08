let contents
window.id = idGenerator()

chrome.storage.local.get(
  { storedContents: [], changeWindowId: "" },
  function (items) {
    contents = items.storedContents
    if (contents.length !== 0) {
      contents.forEach(function (content) {
        loadTabFromStore(content)
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
    { storedContents: [], changeWindowId: "" },
    function (items) {
      // 変更を及ぼした window の場合は sync は不要
      if (items.changeWindowId === window.id) return

      // 子要素であるタブを一旦すべて消す
      document.getElementById("tab-list").innerHTML = ""
      contents = items.storedContents
      if (contents.length !== 0) {
        contents.forEach(function (content) {
          loadTabFromStore(content)
        })
      } else {
        initialize()
      }
    }
  )
}

function initialize() {
  editor.renew()
  focusTab(createBlankTab())
}

function createNewTab() {
  if (countTabs() > 5) {
    alert("You can use up to 6 tabs!")
    return
  }
  saveActiveTab()
  editor.renew()
  focusTab(createBlankTab())
}

function createNewTabElem() {
  const newTabElem = document.createElement("div")
  newTabElem.contentEditable = true
  newTabElem.className = "EditableTab"
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
  const tab = createNewTabElem()
  tab.id = idGenerator()
  tab.innerHTML = "New Tab"
  
  $("#tab-list").append(tab)
  return tab
}

function createTabFromStore(content) {
  const tab = createNewTabElem()
  tab.id = content.id
  tab.innerHTML = content.title
  
  $("#tab-list").append(tab)
  return tab
}

function loadTabFromStore(content) {
  const tab = createTabFromStore(content)
  if (content.active) {
    focusTab(tab)
  }
}

function deactivateAllTabs() {
  const tabs = document.getElementById("tab-list").childNodes
  tabs.forEach(function (tab) {
    if (tab.classList !== undefined) {
      tab.classList.remove("ActiveTab")
    }
  })
  contents.forEach(function (content) {
    content.active = false
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
    active: true,
  }
  const idx = contents.findIndex((content) => content.id === json.id)
  idx === -1 ? contents.push(json) : (contents[idx] = json)

  chrome.storage.local.set({
    storedContents: contents,
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
