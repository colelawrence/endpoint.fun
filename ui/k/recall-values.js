// Recall the values from form
class FormStorage {
  /**
   *
   * @param {string} storageKey
   * @param {Storage} storage
   */
  constructor(storageKey, storage) {
    this.storageKey = storageKey
    this.storage = storage
  }
  /** create 'input' event listener */
  onInput(id) {
    return (evt) => {
      console.log(evt)
      const val = JSON.parse(this.storage.getItem(this.storageKey) || "{}")
      val[id] = evt.target.value
      this.storage.setItem(this.storageKey, JSON.stringify(val))
    }
  }
  getValues() {
    return JSON.parse(this.storage.getItem(this.storageKey) || "{}")
  }
}

const inputsByStorageId = {}
{
  const elts = document.querySelectorAll("input, textarea")
  elts.forEach(elt => {
    const storageId = getElementStorageId(elt)
    inputsByStorageId[storageId] = elt
  })
}

console.log(inputsByStorageId)
const formStorage = new FormStorage(location.pathname, sessionStorage)

// Repopulate values
{
  const isErrorPage = document.querySelector('.error-flash') != null

  if (isErrorPage) {
    const initValues = formStorage.getValues()
    for (const storageId in initValues) {
      const elt = inputsByStorageId[storageId]
      const value = initValues[storageId]
      if (elt && value && storageId) {
        elt.value = value
        console.log({ storageId, value, elt })
      }
    }
  }
}

// Setup listeners
for (const storageId in inputsByStorageId) {
  const elt = inputsByStorageId[storageId]
  elt.addEventListener('input', formStorage.onInput(storageId))
}

/**
 * @param {HTMLElement} elt
 * @returns {HTMLFormElement | null}
 */
function getParentForm(elt) {
  if (elt.parentElement) {
    if (elt.parentElement instanceof HTMLFormElement)
      return elt.parentElement
    else
      return getParentForm(elt.parentElement)
  } else {
    return null
  }
}

/**
 * @param {HTMLElement} elt
 * @returns {string} storage id
 */
function getElementStorageId(elt) {
  const form = getParentForm(elt)
  return (form ? form.action : '<no form>') + '-' + (elt.name || elt.id)
}
