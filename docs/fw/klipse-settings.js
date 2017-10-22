'use strict'

function acyclicEquals(l, r) {
  if (Object.is(l, r))
    return true
  if (!l || !r ||
      typeof l !== 'object' || typeof r !== 'object' ||
      Object.getPrototypeOf(l) !== Object.getPrototypeOf(r))
    return false
  const kl = Object.keys(l).sort()
  const kr = Object.keys(r).sort()
  if (kl.length !== kr.length)
    return false
  for (let i=0; i<kl.length; ++i)
    if (kl[i] !== kr[i])
      return false
  if (void 0 !== kl.find(k => !acyclicEquals(l[k], r[k])))
    return false
  return true
}

function test(name, actual, expect) {
  if (acyclicEquals(actual, expect))
    console.log(name, 'Ok')
  else
    console.log(name, 'Error', actual)
}

function log() {
  console.log.apply(null, arguments)
}

window.klipse_settings = {
  codemirror_options_in: {
    lineWrapping: false,
    autoCloseBrackets: false,
    cursorBlinkRate: 0
  },
  codemirror_options_out: {
    lineWrapping: true
  },
  eval_idle_msec: 150,
  selector_eval_js: '.lang-js'
}

function accelerate_klipse() {
  const all = Array.prototype.slice.call(document.querySelectorAll('.klipse-container'), 0, -1).map(function (e) {
    const pre = e.parentNode
    const cm1 = pre.children[0]
    const cm2 = pre.children[1]
    return [pre, cm1, cm2]
  })

  function hide(i) {
    const pcc = all[i]
    pcc[0].style.cssText = 'min-height: ' + pcc[0].getBoundingClientRect().height + 'px;'
    pcc[1].style.cssText = ''
    pcc[2].style.cssText = ''
  }
  function show(i) {
    const pcc = all[i]
    pcc[0].style.cssText = ''
    pcc[1].style.cssText = 'display: block;'
    pcc[2].style.cssText = 'display: block;'
    pcc[1].CodeMirror.refresh()
    pcc[2].CodeMirror.refresh()
  }
  function hasBeenShown(i) {
    const pcc = all[i]
    return pcc[0].style.length || pcc[1].style.length
  }

  let oldVisStart = 0
  let oldVisStop = 0

  function visibility(i, height) {
    const pcc = all[i]
    const r = pcc[0].getBoundingClientRect()
    return height <= r.top ? 1 : r.bottom < 0 ? -1 : 0
  }

  function findFirst(i, height) {
    while (0 < i && 0 === visibility(i-1, height))
      --i;
    return i
  }

  function findBinary(begin, count, height) {
    const middle = begin + (count >> 1)
    if (count <= 0)
      return null
    switch (visibility(middle, height)) {
      case 1:
        return findBinary(begin, count >> 1, height)
      case 0:
        return findFirst(middle, height)
      default:
        return findBinary(middle + 1, count - 1 - (count >> 1), height)
    }
  }

  function findVisible(height) {
    const guess = (oldVisStart + oldVisStop) >> 1
    if (0 === visibility(guess, height))
      return findFirst(guess, height)
    else
      return findBinary(0, all.length, height)
  }

  function getPos() {
    return {
      offset: window.pageYOffset,
      width: window.innerWidth,
      height: window.innerHeight
    }
  }

  let updatedAt = undefined
  let scheduled = 0

  function update() {
    if (0 < scheduled)
      --scheduled

    updatedAt = getPos()

    let vis = findVisible(updatedAt.height)
    if (null === vis)
      return

    const newVisStart = vis

    do {
      if (vis < oldVisStart || oldVisStop <= vis)
        show(vis)
      ++vis
    } while (vis < all.length && 0 === visibility(vis, updatedAt.height))

    const newVisStop = vis

    for (let i=oldVisStart; i<oldVisStop; ++i)
      if (i < newVisStart || newVisStop <= i)
        hide(i)

    oldVisStart = newVisStart
    oldVisStop = newVisStop
  }

  function scheduleUpdate() {
    if (0 < scheduled || acyclicEquals(updatedAt, getPos()))
      return
    scheduled = 2
    setTimeout(() => {
      if (0 < scheduled)
        --scheduled
      if (!scheduled)
        scheduleUpdate()
    }, 300)
    window.requestAnimationFrame(update)
  }

  scheduleUpdate()

  window.addEventListener('scroll', scheduleUpdate)
  window.addEventListener('resize', scheduleUpdate)
}
