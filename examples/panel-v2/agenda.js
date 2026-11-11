/* Office agenda selection and freshness. Dates and titles are rendered by the view. */
(function (root) {
  function create(core, ha, entityId) {
    var selected = 0;
    var baseDay = null;
    var manual = false;

    function reset() {
      selected = 0;
      manual = false;
    }

    function upcoming(day, now) {
      var events = day && Array.isArray(day.events) ? day.events : [];
      return events.filter(function (event) {
        return event && typeof event.title === 'string' && isFinite(event.start) &&
          isFinite(event.end) && Number(event.end) > now && Number(event.start) < Number(event.end);
      }).sort(function (left, right) { return Number(left.start) - Number(right.start); });
    }

    function read(now) {
      var entry = ha.get(entityId);
      var attributes = entry.attributes || {};
      var expiry = Number(attributes.valid_until);
      var fresh = ha.connected() && core.available(entry) && expiry > now && expiry <= now + 100;
      var days = Array.isArray(attributes.days) && attributes.days.length === 3 ? attributes.days :
        [{day_start: attributes.day_start, events: attributes.events}];
      var base = Number(attributes.day_start);
      if (baseDay !== base) {
        baseDay = base;
        reset();
      }
      if (selected >= days.length) { reset(); }

      var events = [];
      if (fresh) {
        if (manual) {
          events = upcoming(days[selected], now);
        } else {
          selected = 0;
          for (var i = 0; i < days.length; i++) {
            events = upcoming(days[i], now);
            if (events.length) { selected = i; break; }
          }
        }
      }
      return {
        fresh: fresh,
        days: days.map(function (day) { return day && day.day_start; }),
        selected: selected,
        events: events.map(function (event) {
          return {title: event.title, start: event.start, end: event.end, current: Number(event.start) <= now};
        })
      };
    }

    function select(index, now) {
      var state = read(now);
      if (!state.fresh || index < 0 || index >= state.days.length) { return; }
      selected = index;
      manual = true;
    }

    return {read: read, select: select, reset: reset};
  }
  root.PanelV2Agenda = {create: create};
})(this);
