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
        
        var $body, $head=$('head'), hist=[], newPageCount=0, jQTSettings={}, dumbLoop, currentPage, orientation, isMobile = RegExp(" Mobile/").test(navigator.userAgent), tapReady=true;

        init(options);

        function init(options) {   
            
            var defaults = {
                addGlossToIcon: true,
                backSelector: '.back, .cancel, .goback',
                cacheGetRequests: true,
                fixedViewport: true,
                formSelector: 'form',
                fullScreen: true,
                fullScreenClass: 'fullscreen',
                icon: null,
                initializeTouch: 'a, .touch', 
                startupScreen: null,
                statusBar: 'default', // other options: black-translucent, black
                submitSelector: '.submit',
                useTransitions: true,
                transitions: [ // Order matters.
                    { name: 'slide', selector: 'body > * > ul li a' },
                    { name: 'flip', selector: '.flip' },
                    { name: 'slideup', selector: '.slideup' },
                    { name: 'swap', selector: '.swap' },
                    { name: 'cube', selector: '.cube' },
                    { name: 'pop', selector: '.pop' },
                    { name: 'dissolve', selector: '.dissolve' },
                    { name: 'fade', selector: '.fade' }
                ]
            };
            jQTSettings = $.extend({}, defaults, options);

            var hairextensions = '';

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

            // Create an array of the "next page" selectors
            var liveSelectors = [];
            for (var i in jQTSettings.transitions) {
                if (typeof(jQTSettings.transitions[i].selector) == 'string') {
                    liveSelectors.push(jQTSettings.transitions[i].selector);
                }
            }
            if (jQTSettings.backSelector) liveSelectors.push(jQTSettings.backSelector);
            if (liveSelectors.length > 0) {
                $(liveSelectors.join(', ')).live('click',liveClick);
            }

            // Initialize on document load:
            $(document).ready(function(){
                $body = $('body');
                $body.bind('orientationchange', updateOrientation).trigger('orientationchange');
                if (jQTSettings.fullScreenClass && window.navigator.standalone == true) {
                    $body.addClass(jQTSettings.fullScreenClass + ' ' + jQTSettings.statusBar);
                }

                if (jQTSettings.initializeTouch) $(jQTSettings.initializeTouch).addTouchHandlers();

                $body.submit(submitForm);
                
                if (jQTSettings.submitSelector)
                    $(jQTSettings.submitSelector).live('click', submitParentForm);

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
            var transition = hist[0].transition;
            var fromPage = hist[0].page;

            // Remove all pages in front of the target page
            hist.splice(0, numberOfPages);

            // Grab the target page
            var toPage = hist[0].page;
            
            // Make the transition
            animatePages(fromPage, toPage, transition, true);
        }
        function goToPage(toPage, transition) {
            var fromPage = hist[0].page;
            if (animatePages(fromPage, toPage, transition)) addPageToHistory(toPage, transition);
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
            var $el = $(this), target = $el.attr('target'), hash = $el.attr('hash'), transition;

            for (var i in jQTSettings.transitions) {
                if ($el.is(jQTSettings.transitions[i].selector)) {
                    transition = jQTSettings.transitions[i];
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
                goToPage($(hash).data('referrer', $el), transition);
            } else if (target != '_blank') {
                $el.addClass('loading active');

                showPageByHref($el.attr('href'), {
                    transition: transition,
                    callback: function(){ 
                        $el.removeClass('loading'); setTimeout($.fn.unselect, 250, $el);
                    },
                    $referrer: $el
                });
            }
            return false;
        }
        function addPageToHistory(page, transition) {
            // Grab some info
            var pageId = page.attr('id');

            // Prepend info to page history
            hist.unshift({
                page: page, 
                transition: transition, 
                id: pageId
            });
        }
        function animatePages(fromPage, toPage, transition, backwards) {

            // Error check for target page
            if(toPage.length == 0){
                $.fn.unselect();
                console.log('Target element is missing.');
                return false;
            }

            // Make sure we are scrolled up to hide location bar
            window.scrollTo(0, 0);
            
            // Define callback to run after animation completes
            var callback = function(event){
                currentPage = toPage;

                if (transition)
                {
                    fromPage.removeClass('current out reverse ' + transition.name);
                    toPage.removeClass('in reverse ' + transition.name);
                }
                else
                {
                    fromPage.removeClass('current');
                }

                toPage.trigger('pageTransitionEnd', { direction: 'in' });
    	        fromPage.trigger('pageTransitionEnd', { direction: 'out' });
                location.hash = currentPage.attr('id');
                var $originallink = toPage.data('referrer');
                if ($originallink) {
                    $originallink.unselect();
                }
                tapReady = true;
    	        dumbLoopStart();
            }

            fromPage.trigger('pageTransitionStart', { direction: 'out' });
            toPage.trigger('pageTransitionStart', { direction: 'in' });

            if (transition && jQTSettings.useTransitions) {
                toPage.one('webkitAnimationEnd', callback);
                toPage.addClass(transition.name + ' in current ' + (backwards ? ' reverse' : ''));
                fromPage.addClass(transition.name + ' out' + (backwards ? ' reverse' : ''));
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
                        console.log('Unknown hash change.');
                    }
                }
            }, 250);
        }
        function enableTaps() {
            tapReady = true;
        }
        function insertPages(nodes, transition) {
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
                goToPage(targetPage, transition);
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
                transition: null,
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
                        var firstPage = insertPages(data, settings.transition);
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
                    transition: jQTSettings.transitions[0] || null
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
        function addTransition(transition) {
            jQTSettings.transitions.append(transition);
            if (transition.selector)
            {
                $(transition.selector).live(liveClick);
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

        return {
            getOrientation : getOrientation,
            goBack : goBack,
            goToPage : goToPage,
            addTransition: addTransition
        }
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
        return this.each(function(i, el){
            if (!$(el).data('touchEnabled'))
            {
                $(el).bind('touchstart', jQTouchHandler.handleStart).data('touchEnabled', true);
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