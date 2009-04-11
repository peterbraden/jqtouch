(function($) {
    
    var jQTouchHandler = {
        
        currentTouch : {},
        
        handle : function(){
            var touches = event.changedTouches,
            first = touches[0] || null,
            type = '';

            switch(event.type)
            {
                case 'touchstart':
                    currentTouch = {
                        startX : first.clientX,
                        startY : first.clientY,
                        startTime : (new Date).getTime()
                    };
                    
                    type = 'mousedown';
                break;

                case 'touchmove':
                    if (currentTouch.startX != first.pageX || currentTouch.startY != first.pageY)
                    {
                        currentTouch.deltaX = first.pageX - currentTouch.startX;
                        currentTouch.deltaY = first.pageY - currentTouch.startY;
                        currentTouch.deltaT = (new Date).getTime() - currentTouch.startTime;
                    }
                    
                    if (currentTouch.deltaX > currentTouch.deltaY && currentTouch.deltaX > 100 && currentTouch.deltaT < 300)
                    {
                        console.log('swipe!');
                    }
                    
                    type = 'mousemove';
                break;

                case 'touchend':
                    if (currentTouch.deltaY || currentTouch.deltaX)
                    {

                    }
                    else
                    {
                        // type = 'click';
                        // event.preventDefault();
                    }
                    
                    

                    delete currentTouch;
                    

                break;

                default:
            }
            if (type != '' && first)
            {

                var simulatedEvent = document.createEvent('MouseEvent');
                simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.pageX, first.pageY, false, false, false, false, 0/*left*/, null);

                first.target.dispatchEvent(simulatedEvent);
                return false;
            }


        }
    }

    $.fn.addTouchHandlers = function()
    {
        return this.each(function(i, el){
            $(el).bind('touchstart touchmove touchend touchcancel', function(){
                jQTouchHandler.handle(event);
            })
        })
    }
})(jQuery);