/* Read-only robot map/progress polling; never owns or sends vacuum commands. */
(function(root){
  function create(io){
    var active=false,generation=0,timer=null,telemetryTimer=null;
    function validPercent(entry){
      var raw=entry&&entry.state;
      if(raw===null||raw===undefined||String(raw).trim()===''){return null;}
      var n=Number(raw);return isFinite(n)&&n>=0&&n<=100?Math.round(n):null;
    }
    function poll(expected){
      if(!active||expected!==generation){return;}
      io.fetchProgress(function(error,entry){
        if(active&&expected===generation){io.progress(error?null:validPercent(entry));}
      });
      io.fetchMap(function(error,entry){
        if(!active||expected!==generation){return;}
        if(error||!entry||entry.state==='unavailable'||entry.state==='unknown'){
          io.unavailable('Harita alınamadı');
        }else{io.frame(entry.state);}
      });
      timer=io.setTimeout(function(){poll(expected);},15000);
    }
    function pollTelemetry(expected){
      if(!io.fetchTelemetry||!active||expected!==generation){return;}
      io.fetchTelemetry(function(entries){if(active&&expected===generation){io.telemetry(entries);}});
      telemetryTimer=io.setTimeout(function(){pollTelemetry(expected);},5000);
    }
    return {sync:function(visible,connected){
      var next=!!visible&&!!connected;
      if(next===active){if(visible&&!connected){io.unavailable('Home Assistant bağlantısı yok');}return;}
      active=next;generation++;
      io.clearTimeout(timer);timer=null;io.clearTimeout(telemetryTimer);telemetryTimer=null;
      if(active){poll(generation);pollTelemetry(generation);}else{io.clear();io.progress(null);if(visible){io.unavailable('Home Assistant bağlantısı yok');}}
    },percent:validPercent};
  }
  // Room colors are explicit configuration, verified against the renderer and map.
  // Ambiguous colors, walls and points outside the rotated canvas fail closed.
  function pixelAt(x,y,bounds,width,height){
    if(x<bounds.left||x>=bounds.right||y<bounds.top||y>=bounds.bottom){return null;}
    return {x:Math.min(width-1,Math.floor((bounds.right-x)/bounds.width*width)),y:Math.min(height-1,Math.floor((bounds.bottom-y)/bounds.height*height))};
  }
  function roomAt(pixel,rooms){
    var matches=rooms.filter(function(room){var c=room.color;return c&&Math.abs(c[0]-pixel[0])<=8&&Math.abs(c[1]-pixel[1])<=8&&Math.abs(c[2]-pixel[2])<=8;});
    return matches.length===1?matches[0]:null;
  }
  function createSelection(io){
    var first=null,timer=null,epoch=0;
    function reset(){epoch++;first=null;io.clearTimeout(timer);timer=null;}
    function tap(room,x,y){
      if(!room){reset();return;}
      var now=io.now();
      if(first&&first.room.id===room.id&&now-first.at<=350&&Math.abs(x-first.x)<=32&&Math.abs(y-first.y)<=32){
        var chosen=first,version=epoch;first=null;io.clearTimeout(timer);timer=null;
        io.open(chosen.room,function(done){if(version!==epoch){return;}if(chosen.ready){done(chosen.data);}else{chosen.done=done;}});
        return;
      }
      reset();var version=epoch,ticket={room:room,x:x,y:y,at:now,ready:false,data:null,done:null};first=ticket;
      timer=io.setTimeout(function(){if(first===ticket){first=null;}},350);
      io.fetch(function(data){if(version!==epoch){return;}ticket.ready=true;ticket.data=data;if(ticket.done){ticket.done(data);ticket.done=null;}});
    }
    return {tap:tap,reset:reset};
  }
  function bindTaps(el,tap,cancel,now){
    var down=null,touchAt=-1000;
    function start(ev){
      if(ev.touches){ev.preventDefault();ev.stopPropagation();touchAt=now();if(ev.touches.length!==1){down=null;cancel();return;}}
      else if(now()-touchAt<800||ev.button!==0){return;}
      var p=ev.touches?ev.touches[0]:ev;down={x:p.clientX,y:p.clientY,at:now()};
    }
    function finish(ev,p){
      if(down&&p&&now()-down.at<=450&&Math.abs(p.clientX-down.x)<=12&&Math.abs(p.clientY-down.y)<=12){tap(p.clientX,p.clientY);}else{cancel();}down=null;
    }
    el.addEventListener('touchstart',start,false);
    el.addEventListener('touchmove',function(ev){ev.preventDefault();ev.stopPropagation();var p=ev.touches[0];if(!p||ev.touches.length!==1||down&&(Math.abs(p.clientX-down.x)>12||Math.abs(p.clientY-down.y)>12)){down=null;cancel();}},false);
    el.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();touchAt=now();finish(ev,ev.changedTouches[0]);},false);
    el.addEventListener('touchcancel',function(){down=null;touchAt=now();cancel();},false);
    el.addEventListener('mousedown',start,false);
    el.addEventListener('mouseleave',function(){if(down){down=null;cancel();}},false);
    el.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(now()-touchAt>=800){finish(ev,ev);}},false);
    el.addEventListener('contextmenu',function(ev){ev.preventDefault();},false);
  }
  var api={create:create,createSelection:createSelection,bindTaps:bindTaps,pixelAt:pixelAt,roomAt:roomAt};root.PanelV2RobotMap=api;
  if(typeof module!=='undefined'&&module.exports){module.exports=api;}
})(this);
