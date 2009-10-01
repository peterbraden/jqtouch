/*

            _/    _/_/    _/_/_/_/_/                              _/       
               _/    _/      _/      _/_/    _/    _/    _/_/_/  _/_/_/    
          _/  _/  _/_/      _/    _/    _/  _/    _/  _/        _/    _/   
         _/  _/    _/      _/    _/    _/  _/    _/  _/        _/    _/    
        _/    _/_/  _/    _/      _/_/      _/_/_/    _/_/_/  _/    _/     
       _/                                                                  
    _/

    Created by David Kaneda <http://www.davidkaneda.com>
    Documentation and issue tracking on Google Code <http://code.google.com/p/jqtouch/>
    
    Special thanks to Jonathan Stark <http://jonathanstark.com/>
    and pinch/zoom <http://www.pinchzoom.com/>
    
    (c) 2009 by jQTouch project members.
    See LICENSE.txt for license.

*/

(function($) {
    $.jQTouch = function(options) {
        
        // Set support values
        $.support.WebKitCSSMatrix = (typeof WebKitCSSMatrix == "object");
        $.support.touch = (typeof Touch == "object");
        $.support.WebKitAnimationEvent = (typeof WebKitTransitionEvent == "object");
        
        // Initialize variables
        var $body, $head=$('head'), hist=[], newPageCount=0, jQTSettings={}, dumbLoop, currentPage, orientation, isMobileWebKit = RegExp(" Mobile/").test(navigator.userAgent), tapReady=true,publicObj={}, extensions=$.jQTouch.prototype.extensions, defaultAnimations=['slide','flip','slideup','swap','cube','pop','dissolve','fade','back'], animations=[], hairextensions='', tapEvent=($.support.touch ? 'tap' : 'click');

        // Get the party started
        init(options);

        function init(options) {
            
            var defaults = {
                addGlossToIcon: true,
                backSelector: '.back, .cancel, .goback',
                cacheGetRequests: true,
                cubeSelector: '.cube',
                dissolveSelector: '.dissolve',
                fadeSelector: '.fade',
                fixedViewport: true,
                flipSelector: '.flip',
                formSelector: 'form',
                fullScreen: true,
                fullScreenClass: 'fullscreen',
                icon: null,
                touchSelector: 'a, .touch',
                popSelector: '.pop',
                preloadImages: false,
                slideSelector: 'body > * > ul li a',
                slideupSelector: '.slideup',
                startupScreen: null,
                statusBar: 'default', // other options: black-translucent, black
                submitSelector: '.submit',
                swapSelector: '.swap',
                useAnimations: true
            };
            jQTSettings = $.extend({}, defaults, options);
            
            // Preload images
            if (jQTSettings.preloadImages) {
                for (var i = jQTSettings.preloadImages.length - 1; i >= 0; i--){
                    (new Image()).src = jQTSettings.preloadImages[i];
                };
            }
            // Set icon
            if (jQTSettings.icon) {
                var precomposed = (jQTSettings.addGlossToIcon) ? '' : '-precomposed';
                hairextensions += '<link rel="apple-touch-icon' + precomposed + '" href="' + jQTSettings.icon + '" />';
            }
            // Set startup screen
            if (jQTSettings.startupScreen) {
                hairextensions += '<link rel="apple-touch-startup-image" href="' + jQTSettings.startupScreen + '" />';
            }
            // Set viewport
            if (jQTSettings.fixedViewport) {
                hairextensions += '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0;"/>';
            }
            // Set full-screen
            if (jQTSettings.fullScreen) {
                hairextensions += '<meta name="apple-mobile-web-app-capable" content="yes" />';
                if (jQTSettings.statusBar) {
                    hairextensions += '<meta name="apple-mobile-web-app-status-bar-style" content="' + jQTSettings.statusBar + '" />';
                }
            }
            if (hairextensions) $head.append(hairextensions);


            for (var i in defaultAnimations)
            {
                var name = defaultAnimations[i];
                var selector = jQTSettings[name + 'Selector'];
                if (typeof(selector) == 'string') {
                    addAnimation({name:name, selector:selector});
                }
            }

            // Initialize on document load:
            $(document).ready(function(){
                
                // Add extensions
                for (var i in extensions)
                {
                    var fn = extensions[i];
                    if ($.isFunction(fn))
                    {
                        $.extend(publicObj, fn(publicObj));
                    }
                }
                
                $body = $('body').data('jQTouch', publicObj);
                $body.bind('orientationchange', updateOrientation).trigger('orientationchange');
                if (jQTSettings.fullScreenClass && window.navigator.standalone == true) {
                    $body.addClass(jQTSettings.fullScreenClass + ' ' + jQTSettings.statusBar);
                }

                if (jQTSettings.touchSelector) $(jQTSettings.touchSelector).addTouchHandlers();

                $body.submit(submitForm);
                
                if (jQTSettings.submitSelector)
                    $(jQTSettings.submitSelector).live(tapEvent, submitParentForm);

                // Make sure exactly one child of body has "current" class
                if ($('body > .current').length == 0) {
                    currentPage = $('body > *:first');
                } else {
                    currentPage = $('body > .current:first');
                    $('body > .current').removeClass('current');
                }
                
                // Go to the top of the "current" page
                $(currentPage).addClass('current');
                location.hash = $(currentPage).attr('id');
                addPageToHistory(currentPage);
                window.scrollTo(0, 0);
                dumbLoopStart();
            });
        }
        
        // PUBLIC FUNCTIONS
        function goBack(to) {
            // Init the param
            if (hist.length > 1) {
                var numberOfPages = Math.min(parseInt(to || 1, 10), hist.length-1);

                // Search through the history for an ID
                if( isNaN(numberOfPages) && typeof(to) === "string" && to != '#' ) {
                    for( var i=1, length=hist.length; i < length; i++ ) {
                        if( '#' + hist[i].id === to ) {
                            numberOfPages = i;
                            break;
                        }
                    }
                }

                // If still nothing, assume one
                if( isNaN(numberOfPages) || numberOfPages < 1 ) {
                    numberOfPages = 1;
                };

                // Grab the current page for the "from" info
                var animation = hist[0].animation;
                var fromPage = hist[0].page;

                // Remove all pages in front of the target page
                hist.splice(0, numberOfPages);

                // Grab the target page
                var toPage = hist[0].page;

                // Make the animations
                animatePages(fromPage, toPage, animation, true);
                
                return publicObj;
            } else {
                console.error('No pages in history.');
                return false;
            }
        }
        function goTo(toPage, animation) {
            var fromPage = hist[0].page;
            if (typeof(animation) === 'string') {
                for (var i = animations.length - 1; i >= 0; i--){
                    if (animations[i].name === animation)
                    {
                        animation = animations[i];
                        break;
                    }
                }
            }
            if (animatePages(fromPage, toPage, animation)) {
                addPageToHistory(toPage, animation);
                return publicObj;
            }
            else
            {
                console.error('Could not animate pages.')
                return false;
            }
        }
        function getOrientation() {
            return orientation;
        }

        // PRIVATE FUNCTIONS
        function liveClick(e){

            if (tapReady == false) {
                return false;
            }

            // Grab the clicked element
            var $el = $(this), target = $el.attr('target'), hash = $el.attr('hash'), animation;

            for (var i in animations) {
                if ($el.is(animations[i].selector)) {
                    animation = animations[i];
                }
            }

            // User clicked an external link
            if (target == '_blank' || $el.attr('rel') == 'external') {
                return true;
            }
            // User clicked an internal link, fullscreen mode
            else if (target == '_webapp') {
                window.location = $el.attr('href');
                return false;
            }
            // User clicked a back button
            else if ($el.is(jQTSettings.backSelector)) {
                goBack(hash);
                return false;
            }
            // Branch on internal or external href
            else if (hash && hash!='#') {
                $el.addClass('active');
                goTo($(hash).data('referrer', $el), animation);
            } else if (target != '_blank') {
                $el.addClass('loading active');

                showPageByHref($el.attr('href'), {
                    animation: animation,
                    callback: function(){ 
                        $el.removeClass('loading'); setTimeout($.fn.unselect, 250, $el);
                    },
                    $referrer: $el
                });
            }
            return false;
        }
        function addPageToHistory(page, animation) {
            // Grab some info
            var pageId = page.attr('id');

            // Prepend info to page history
            hist.unshift({
                page: page, 
                animation: animation, 
                id: pageId
            });
        }
        function animatePages(fromPage, toPage, animation, backwards) {

            // Error check for target page
            if(toPage.length == 0){
                $.fn.unselect();
                console.error('Target element is missing.');
                return false;
            }

            // Make sure we are scrolled up to hide location bar
            window.scrollTo(0, 0);
            
            // Define callback to run after animation completes
            var callback = function(event){
                currentPage = toPage;
                if (animation)
                {
                    fromPage.removeClass('current out reverse ' + animation.name);
                    toPage.removeClass('in reverse ' + animation.name);
                }
                else
                {
                    fromPage.removeClass('current');
                }

                toPage.trigger('pageAnimationEnd', { direction: 'in' });
    	        fromPage.trigger('pageAnimationEnd', { direction: 'out' });
                location.hash = currentPage.attr('id');
                var $originallink = toPage.data('referrer');
                if ($originallink) {
                    $originallink.unselect();
                }
                tapReady = true;
    	        dumbLoopStart();
            }

            fromPage.trigger('pageAnimationStart', { direction: 'out' });
            toPage.trigger('pageAnimationStart', { direction: 'in' });

            if ($.support.WebKitAnimationEvent && animation && jQTSettings.useAnimations) {
                toPage.one('webkitAnimationEnd', callback);
                toPage.addClass(animation.name + ' in current ' + (backwards ? ' reverse' : ''));
                fromPage.addClass(animation.name + ' out' + (backwards ? ' reverse' : ''));
                tapReady = false;
            } else {
                toPage.addClass('current');
                callback();
            }

            return true;
        }
        function dumbLoopStart() {
            dumbLoop = setInterval(function(){
                var curid = currentPage.attr('id');
                if (location.hash == '') {
                    location.hash = curid;
                }
                if(location.hash != '#' + curid) {
                    try {
                        for (var i=1; i < hist.length; i++) {
                            if(location.hash == '#' + hist[i].id) {
                                clearInterval(dumbLoop);
                                goBack(i);
                            }
                        }
                    } catch(e) {
                        console.error('Unknown hash change.');
                    }
                }
            }, 250);
        }
        function enableTaps() {
            tapReady = true;
        }
        function insertPages(nodes, animation) {
            var targetPage = null;
            $(nodes).each(function(index, node){
                $node = $(this);
                if (!$node.attr('id')) {
                    $node.attr('id', 'page-' + (++newPageCount));
                }
                $node.appendTo($body);
                if ($node.hasClass('current') || !targetPage ) {
                    targetPage = $node;
                }
            });
            if (targetPage !== null) {
                goTo(targetPage, animation);
                return targetPage;
            }
            else
            {
                return false;
            }
        }
        function showPageByHref(href, options) {
            var defaults = {
                data: null,
                method: 'GET',
                animation: null,
                callback: null,
                $referrer: null
            };
            
            var settings = $.extend({}, defaults, options);

            if (href != '#')
            {
                $.ajax({
                    url: href,
                    data: settings.data,
                    type: settings.method,
                    success: function (data, textStatus) {
                        var firstPage = insertPages(data, settings.animation);
                        if (firstPage)
                        {
                            if (settings.method == 'GET' && jQTSettings.cacheGetRequests && settings.$referrer)
                            {
                                settings.$referrer.attr('href', '#' + firstPage.attr('id'));
                            }
                            if (settings.callback) {
                                settings.callback(true);
                            }
                        }
                    },
                    error: function (data) {
                        if (settings.$referrer) settings.$referrer.unselect();

                        if (settings.callback) {
                            settings.callback(false);
                        }
                    }
                });
            }
            else if ($referrer)
            {
                $referrer.unselect();
            }
        }
        function submitForm(e){
            var $form = $(e.target);

            if ($form.is(jQTSettings.formSelector)) {
                $('input:focus').blur();
                showPageByHref($form.attr('action'), {
                    data: $form.serialize(),
                    method: $form.attr('method') || "POST",
                    animation: animations[0] || null
                });
                return false;
            }
            return true;
        }
        function submitParentForm(e){
            var $form = $(this).closest('form');
            if ($form.length)
            {
                evt = jQuery.Event("submit");
                evt.preventDefault();
                $form.trigger(evt);
                return false;
            }
            return true;
        }
        function addAnimation(animation) {
            if (typeof(animation.selector) == 'string' && typeof(animation.name) == 'string') {
                animations.push(animation);
                $(animation.selector).live(tapEvent, liveClick);
            }
        }
        function updateOrientation() {
            orientation = window.innerWidth < window.innerHeight ? 'profile' : 'landscape';
            $body.removeClass('profile landscape').addClass(orientation).trigger('turn', {orientation: orientation});
            scrollTo(0, 0);
        }

        $.fn.unselect = function(obj) {
            if (obj) {
                obj.removeClass('active');
            } else {
                $('.active').removeClass('active');
            }
        }
        
        publicObj = {
            getOrientation: getOrientation,
            goBack: goBack,
            goTo: goTo,
            addAnimation: addAnimation
        }

        return publicObj;
    }
    
    $.jQTouch.prototype.extensions = [];
    
    $.jQTouch.addExtension = function(extension){
        $.jQTouch.prototype.extensions.push(extension);
    }

})(jQuery);

// jQTouch Events handler

(function($) {
    
    var jQTouchHandler = {
        
        currentTouch : {},
        hoverTimeout : null,

        handleStart : function(e){

            jQTouchHandler.currentTouch = {
                startX : event.changedTouches[0].clientX,
                startY : event.changedTouches[0].clientY,
                startTime : (new Date).getTime(),
                deltaX : 0,
                deltaY : 0,
                deltaT : 0,
                el : $(this)
            };

            jQTouchHandler.currentTouch.el.bind('touchmove touchend', jQTouchHandler.handle);
            
            jQTouchHandler.hoverTimeout = setTimeout(jQTouchHandler.makeActive, 100, jQTouchHandler.currentTouch.el);
            return true;
        },
        
        makeActive : function($el){
            $el.addClass('active');
        },
        
        handle : function(e){
            var touches = event.changedTouches,
            first = touches[0] || null,
            type = '';

            switch(event.type)
            {
                case 'touchmove':
                    jQTouchHandler.currentTouch.deltaX = first.pageX - jQTouchHandler.currentTouch.startX;
                    jQTouchHandler.currentTouch.deltaY = first.pageY - jQTouchHandler.currentTouch.startY;
                    jQTouchHandler.currentTouch.deltaT = (new Date).getTime() - jQTouchHandler.currentTouch.startTime;
                    
                    // Check for Swipe
                    if (Math.abs(jQTouchHandler.currentTouch.deltaX) > Math.abs(jQTouchHandler.currentTouch.deltaY) && (jQTouchHandler.currentTouch.deltaX > 35 || jQTouchHandler.currentTouch.deltaX < -35) && jQTouchHandler.currentTouch.deltaT < 1000)
                    {
                        jQTouchHandler.currentTouch.el.trigger('swipe', {direction: (jQTouchHandler.currentTouch.deltaX < 0) ? 'left' : 'right'}).unbind('touchmove touchend');
                    }
                    
                    if (Math.abs(jQTouchHandler.currentTouch.deltaY) > 1)
                    {
                        jQTouchHandler.currentTouch.el.removeClass('active');
                    }
                    
                    type = 'mousemove';
                    
                    clearTimeout(jQTouchHandler.hoverTimeout);
                break;

                case 'touchend':                    
                    jQTouchHandler.currentTouch.deltaT = (new Date).getTime() - jQTouchHandler.currentTouch.startTime;
                
                    if (jQTouchHandler.currentTouch.deltaY === 0 && jQTouchHandler.currentTouch.deltaX === 0)
                    {
                        jQTouchHandler.makeActive(jQTouchHandler.currentTouch.el);
                        // console.log(jQTouchHandler.currentTouch.deltaT);
                        jQTouchHandler.currentTouch.el.trigger('tap');
                    }
                    else
                    {
                        jQTouchHandler.currentTouch.el.removeClass('active');
                    }
                    jQTouchHandler.currentTouch.el.unbind('touchmove touchend');
                    clearTimeout(jQTouchHandler.hoverTimeout);
                    delete currentTouch;
                break;
                
                case 'touchcancel':
                    console.log('Cancelled touch. Does this ever happen?');
                    break;
            }
            if (type != '' && first)
            {
                jQTouchHandler.currentTouch.el.trigger(type);
            }
        }
    }

    $.fn.addTouchHandlers = function() {
        return this.each(function(){
            if (!$(this).data('touchEnabled'))
            {
                $(this).bind('touchstart', jQTouchHandler.handleStart).data('touchEnabled', true);
            }
        });
    }
    
    $.fn.swipe = function(fn) {
        if ($.isFunction(fn))
        {
            return this.each(function(i, el){
                $(el).addTouchHandlers().bind('swipe', fn);  
            });
        }
    }

})(jQuery);