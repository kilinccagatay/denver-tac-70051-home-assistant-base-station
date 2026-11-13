/* Office agenda selection and freshness. Dates and titles are rendered by the view. */
(function (root) {
  function create(core, ha, entityId) {
    var selected = 0;
    var baseDay = null;
    var manual = false;
    var cacheKey = 'panel-v2:office-agenda:' + entityId;
    var cached = null;
    var savedSignature = '';
    try {
      savedSignature = root.localStorage.getItem(cacheKey) || '';
      cached = JSON.parse(savedSignature || 'null');
    } catch (error) { /* Storage can be disabled in a WebView. */ }

    function endOfDay(day) {
      if (Number(day.day_end) > Number(day.day_start)) { return Number(day.day_end); }
      var date = new Date(Number(day.day_start) * 1000);
      date.setDate(date.getDate() + 1);
      return date.getTime() / 1000;
    }

    function retain(attributes, fresh, now) {
      var synchronized = Number(attributes.generated_at) || Number(attributes.valid_until) - 90;
      if (fresh && synchronized > 0 && synchronized <= now + 5) {
        var days = Array.isArray(attributes.days) && attributes.days.length === 3 ? attributes.days : [attributes];
        cached = {
          synchronized: synchronized,
          days: days.filter(function (day) {
            return day && Number(day.day_start) > 0 && endOfDay(day) > now;
          }).map(function (day) {
            return {day_start: day.day_start, day_end: endOfDay(day), events: upcoming(day, now).slice(0, 16).map(function (event) {
              return {title: event.title.slice(0, 160), start: event.start, end: event.end};
            })};
          })
        };
      }
      if (cached && Array.isArray(cached.days) && cached.synchronized <= now + 5) {
        cached.days = cached.days.filter(function (day) { return day && endOfDay(day) > now; });
        if (!cached.days.length) { cached = null; }
      } else { cached = null; }
      var signature = cached ? JSON.stringify(cached) : '';
      if (signature !== savedSignature) {
        savedSignature = signature;
        try {
          if (signature) { root.localStorage.setItem(cacheKey, signature); }
          else { root.localStorage.removeItem(cacheKey); }
        } catch (error) { /* Keep the in-memory copy. */ }
      }
    }

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
      retain(attributes, fresh, now);
      var available = fresh || !!cached;
      if (!fresh && cached) { days = cached.days; }
      var base = Number(days[0] && days[0].day_start);
      if (baseDay !== base) {
        baseDay = base;
        reset();
      }
      if (selected >= days.length) { reset(); }

      var events = [];
      if (available) {
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
        available: available,
        days: days.map(function (day) { return day && day.day_start; }),
        selected: selected,
        events: events.map(function (event) {
          return {title: event.title, start: event.start, end: event.end, current: fresh && Number(event.start) <= now};
        })
      };
    }

    function select(index, now) {
      var state = read(now);
      if (!state.available || index < 0 || index >= state.days.length) { return; }
      selected = index;
      manual = true;
    }

    return {read: read, select: select, reset: reset};
  }
  root.PanelV2Agenda = {create: create};
})(this);
