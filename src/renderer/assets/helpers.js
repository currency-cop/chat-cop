// helpers
$.fn.onEnter = function (fnc, mod) {
  return this.each(function () {
    $(this).keypress(function (ev) {
      var keycode = (ev.keyCode ? ev.keyCode : ev.which);
      if ((keycode == '13' || keycode == '10') && (!mod || ev[mod + 'Key'])) {
        fnc.call(this, ev)
      }
    })
  })
}

$.fn.scrollToBottom = function () {
  return this.each(function (i, element) {
    $(element).scrollTop(Number.MAX_SAFE_INTEGER);
  });
};

$.fn.clearFileInput = function () {
  return this.each(function (i, element) {
    let $el = $(this)
    $el.replaceWith($el.val('').clone(true))
  })
}