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
      createNewTab()
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

  const eventId = setTimeout(callback, 1000)
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

$("#createNewTabBtn").on("click",() => {
  if (countTabs() > 5) {
    alert("You can use up to 6 tabs!")
    return
  }
  const activeTab = document.getElementsByClassName("ActiveTab")[0]
  saveTabContent(activeTab)
  deactivateActiveTab()
  editor.renew()

  createNewTab()
})
$("#deleteActiveTabBtn").on("click", deleteActiveTabAndActivateLastTab)
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
        createNewTab()
      }
    }
  )
}

function createNewTab() {
  const newContent = {
    id: idGenerator(),
    title: "New Tab",
    content: "",
  }
  createNewTabElem(newContent, true)
  contents.push(newContent)

  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: newContent.id,
    changeWindowId: window.id,
  })
}

function createNewTabElem(content, active) {
  const newTabElem = document.createElement("div")
  newTabElem.contentEditable = true
  newTabElem.addEventListener("keydown", function (e) {
    if (e.keyCode === 13) {
      e.preventDefault()
      return false
    }
  })
  newTabElem.id = content.id
  newTabElem.innerHTML = content.title
  newTabElem.className = active ? "EditableTab ActiveTab" : "EditableTab"
  newTabElem.onclick = function () {
    const activeTab = document.getElementsByClassName("ActiveTab")[0]
    saveTabContent(activeTab)
    changeActiveTab(this)
  }
  $("#tab-list").append(newTabElem)
}

function loadTabFromStore(content, active) {
  createNewTabElem(content, active)
  if (active) {
    loadTextarea(content.content)
  }
}

function deactivateActiveTab() {
  const active = document.getElementsByClassName("ActiveTab")[0]
  active.classList.remove("ActiveTab")
}

function changeActiveTab(tab) {
  deactivateActiveTab()

  tab.className += " ActiveTab"
  const activeTabContent = contents.find((content) => content.id === tab.id)
  loadTextarea(activeTabContent.content)

  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: tab.id,
    changeWindowId: window.id,
  })
}

function saveTabContent(tab) {
  const idx = contents.findIndex((content) => content.id === tab.id)
  contents[idx].title = tab.innerHTML
  contents[idx].content = editor.value()
}

function saveActiveTab() {
  const activeTab = document.getElementsByClassName("ActiveTab")[0]
  saveTabContent(activeTab)

  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: activeTab.id,
    changeWindowId: window.id,
  })
}

function deleteActiveTabAndActivateLastTab() {
  if (window.confirm("Sure?") === false) return
  
  // view
  const activeTabElem = document.getElementsByClassName("ActiveTab")[0]
  activeTabElem.remove()

  // contetnts
  contents = contents.filter((content) => content.id !== activeTabElem.id)
  
  // view
  const tabs = document.getElementById("tab-list").childNodes
  const lastTab = tabs[tabs.length - 1]
  lastTab.className += " ActiveTab"

  // editor view
  const lastTabContent = contents.find((content) => content.id === lastTab.id)
  loadTextarea(lastTabContent.content)

  // storage
  chrome.storage.local.set({
    storedContents: contents,
    activeTabId: lastTab.id,
    changeWindowId: window.id,
  })
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
