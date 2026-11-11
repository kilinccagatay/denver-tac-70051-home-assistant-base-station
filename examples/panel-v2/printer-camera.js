/* Owns the camera lifecycle; the view supplies image loading and status rendering. */
(function (root) {
  function create(io) {
    var enabled = true;
    var active = false;
    var timer;
    var generation = 0;

    function request(expected) {
      if (!active || generation !== expected) { return; }
      io.load(function (success) {
        if (!active || generation !== expected) { return; }
        io.display(success ? 'frame' : 'retry', false);
        timer = io.setTimeout(function () { request(expected); }, success ? 2000 : 10000);
      });
    }

    function sync(visible, printer) {
      if (!visible || !enabled || !printer.cameraReady) {
        if (active) {
          active = false;
          generation++;
          io.clearTimeout(timer);
          io.clear();
        }
        var status = !enabled ? 'paused' : printer.cameraStatus;
        io.display(status, visible && enabled && printer.cameraWaiting);
        return;
      }
      if (active) { return; }
      active = true;
      io.display('loading', true);
      request(++generation);
    }

    return {
      sync: sync,
      toggle: function () { enabled = !enabled; return enabled; }
    };
  }
  root.PanelV2PrinterCamera = {create: create};
})(this);
