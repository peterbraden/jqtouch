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

    var currentHeight=0, currentWidth=0;

    $.jQTouch = function(options) {

        var $body, $head=$('head'),
        var browser= {
            type: navigator.userAgent,
            safari: (/AppleWebKit\/([^\s]+)/.exec(navigator.userAgent) || [,false])[1],
            webkit: (/Safari\/(.+)/.exec(navigator.userAgent) || [,false])[1]
        },

        var hist=[], newPageCount=0, jQTSettings={};

        init(options);
        
        function init(options) {
            var defaults = {
                addGlossToIcon: true,
                backSelector: '.back',
                fixedViewport: true,
                flipSelector: '.flip',
                formSelector: 'form',
                fullScreen: true,
                fullScreenClass: 'fullscreen',
                icon: null,
                initializeTouch: 'a', 
                slideInSelector: 'ul li a',
                slideRightSelector: '',
                slideUpSelector: '.slideup',
                startupScreen: null,
                statusBar: 'default', // other options: black-translucent, black
                titleSelector: '.toolbar h1'
            };    
            jQTSettings = $.extend({}, defaults, options)

            var hairextensions;

            // Preload images
            if (jQTSettings.preloadImages) {
                for (var i = jQTSettings.preloadImages.length - 1; i >= 0; i--){
                    (new Image()).src = jQTSettings.preloadImages[i];
                };
            }

            // Set back buttons
            if (jQTSettings.backSelector) {
                $(jQTSettings.backSelector).live('click', function(){
                    goBack();
                    return false;
                } );
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
            // TODO: DRY
            var liveSelectors = [];
            if (jQTSettings.slideInSelector) liveSelectors.push(jQTSettings.slideInSelector);
            if (jQTSettings.slideRightSelector) liveSelectors.push(jQTSettings.slideRightSelector);
            if (jQTSettings.flipSelector) liveSelectors.push(jQTSettings.flipSelector);
            if (jQTSettings.slideUpSelector) liveSelectors.push(jQTSettings.slideUpSelector);
            if (liveSelectors.length > 0) {
                $(liveSelectors.join(', ')).live('click',function liveClick(){

                    // Cache some stuff
                    var $el = $(this);
                    var hash = $el.attr('hash');

                    // Set transition
                    var transition = 'slideInOut';
                    if ($el.is(jQTSettings.flipSelector)) transition = 'flip';
                    if ($el.is(jQTSettings.slideRightSelector)) transition = 'slideRight';
                    if ($el.is(jQTSettings.slideUpSelector)) transition = 'slideUp';

                    // Branch on internal or external href
                    if (hash && hash != '#') {
                        if ($(hash).length > 0) {
                            $el.attr('selected', 'true');
                            showPage($(hash), transition);
                            setTimeout($.fn.unselect, 250, $el);
                        } else {
                            console.warn('There is no panel with that ID.');
                            $el.unselect();
                            return false;
                        }
                    } else if ($el.attr('target') != '_blank') {
                        $el.attr('selected', 'progress');
                        showPageByHref($(this).attr('href'), null, null, null, transition, function(){ setTimeout($.fn.unselect, 250, $el) });
                        return false;
                    }
                });
            }
            // Initialize on document load:
            $(document).ready(function(){
                // TODO: Find best way to customize and make event live...
                $body = $('body');
                $body.bind('orientationchange', updateOrientation).trigger('orientationchange');
                if (jQTSettings.fullScreenClass && window.navigator.standalone == true) $body.addClass(jQTSettings.fullScreenClass);
                if (jQTSettings.initializeTouch) $(jQTSettings.initializeTouch).addTouchHandlers();
                $(jQTSettings.formSelector).submit(submitForm);

                var page = $('body > *[selected="true"]:first') || $('body > *:first');
                if (page) {
                    addPageToHistory(page);
                } else {
                    console.warn('Looks like your body has no elements.');
                }
            });
        }
        
        function addPageToHistory(page, transition) {

            // Grab some info
            var pageId = page.attr('id');
            console.log(pageId);
            var title = page.find(jQTSettings.titleSelector).html();


            // Prepend info to page history
            hist.unshift({
                page: page, 
                transition: transition, 
                id: pageId, 
                title: title
            });

            // Update the browser location
            location.hash = pageId;
        }
        
        function animatePages(fromPage, toPage, transition, backwards) {

            // Define callback to run after animation completes
            var callback = function(event){
                fromPage.attr('selected', 'false');
                toPage.trigger('pageTransitionEnd', { direction: 'in' });
    	        fromPage.trigger('pageTransitionEnd', { direction: 'out' });
            }

            // Branch on type transition
            if (transition == 'flip'){
                toPage.flip({backwards: backwards});
                fromPage.flip({backwards: backwards, callback: callback});
            } else if (transition == 'slideUp') {
                if (backwards) {
                    toPage.attr('selected', true);
                    fromPage.slideUpDown({backwards: backwards, callback: callback});
                } else {
                    toPage.slideUpDown({backwards: backwards, callback: callback});
                }
            } else if (transition == 'slideRightSelector') {

            } else {
                toPage.slideInOut({backwards: backwards, callback: callback});
                fromPage.slideInOut({backwards: backwards});
            }
        }

        function goBack(numberOfPages) {

            // Init the param
            var numberOfPages = numberOfPages || 1;

            // Grab the current page for the "from" info
            var transition = hist[0].transition;
            var fromPage = hist[0].page;

            // Remove all pages in front of the target page 
            hist.splice(0, numberOfPages);

            // Grab the target page
            var toPage = hist[0].page;

            // Update the location bar
            history.back();

            // Make the transition
            animatePages(fromPage, toPage, transition, true);
        }

        function insertPages(nodes, transition) {
            var targetPage;
            nodes.each(function(index, node){
                if (!$(this).attr('id')) {
                    $(this).attr('id', (++newPageCount));
                }
                $(this).appendTo($body);
                if ($(this).attr('selected') == 'true' || (!targetPage && !$(this).hasClass('btn'))) {
                    targetPage = $(this);
                }
            });
            if (targetPage) {
                showPage(targetPage, transition);
            }
        }
        
        function showPage(page, transition) {
            var fromPage = hist[0].page;
            addPageToHistory(page, transition);
            animatePages(fromPage, page, transition);
        }
        
        function showPageByHref(href, data, method, replace, transition, cb) {
            $.ajax({
                url: href,
                data: data,
                type: method || "GET",
                success: function (data, textStatus) {
                    $('a[selected="progress"]').attr('selected', 'true');
                    if (replace) {
                        $(replace).replaceWith(data);
                    } else {
                        insertPages($(data), transition);
                    }
                    if (cb) {
                        cb(true);
                    }
                },
                error: function (data) {
                    if (cb) {
                        cb(false);
                    }
                }
            });
        }

        function showPageById(id) {
            if (id) {
                var page = $(id);
                if (page){
                    var offset = -1;
                    for (var i=0; i < hist.length; i++) {
                        if(hist[i].id == id) {
                            offset = i;
                            break;
                        }
                    }
                    if (offset == -1) {
                        showPage(page);
                    } else {
                        goBack(offset);
                    }
                }
            }
        }
        
        function submitForm() {
            showPageByHref($(this).attr('action') || "POST", $(this).serialize(), $(this).attr('method'));
            return false;
        }
        
        function updateOrientation() {
            var newOrientation = window.innerWidth < window.innerHeight ? 'profile' : 'landscape';
            $body.removeClass('profile landscape').addClass(newOrientation);
            scrollTo(0, 0);
        }
    }

    $.fn.flip = function(options) {
        return this.each(function(){
            var defaults = {
                direction : 'toggle',
                backwards: false,
                callback: null
            };

            var settings = $.extend({}, defaults, options);

            var dir = ((settings.direction == 'toggle' && $(this).attr('selected') == 'true') || settings.direction == 'out') ? 1 : -1;
            
            if (dir == -1) $(this).attr('selected', 'true');
            
            $(this).parent().css({webkitPerspective: '1000', webkitTransformStyle: 'preserve-3d'});
            
            $(this).css({
                '-webkit-backface-visibility': 'hidden',
                '-webkit-transform': 'rotateY(' + ((dir == 1) ? '0' : (!settings.backwards ? '-' : '') + '180') + 'deg)'
            }).transition({'-webkit-transform': 'rotateY(' + ((dir == 1) ? (settings.backwards ? '-' : '') + '180' : '0') + 'deg)'}, {callback: settings.callback});
        })
    }
    $.fn.slideInOut = function(options) {
        var defaults = {
            direction : 'toggle',
            backwards: false,
            callback: null
        };
        var settings = $.extend({}, defaults, options);
        return this.each(function(){
            var dir = ((settings.direction == 'toggle' && $(this).attr('selected') == 'true') || settings.direction == 'out') ? 1 : -1;                
            if (dir == -1){
                $(this).attr('selected', 'true')
                    .find('h1, .button')
                        .css('opacity', 0)
                        .transition({'opacity': 1})
                        .end()
                    .css({'-webkit-transform': 'translateX(' + (settings.backwards ? -1 : 1) * window.innerWidth + 'px)'})
                    .transition({'-webkit-transform': 'translateX(0px)'}, {callback: settings.callback})
            } else {
                $(this)
                    .find('h1, .button')
                        .transition( {'opacity': 0} )
                        .end()
                    .transition(
                        {'-webkit-transform': 'translateX(' + ((settings.backwards ? 1 : -1) * dir * window.innerWidth) + 'px)'}, { callback: settings.callback});
            }
        })
    }
    $.fn.slideUpDown = function(options) {
        var defaults = {
            direction : 'toggle',
            backwards: false,
            callback: null
        };

        var settings = $.extend({}, defaults, options);
        
        return this.each(function(){

            var dir = ((settings.direction == 'toggle' && $(this).attr('selected') == 'true') || settings.direction == 'out') ? 1 : -1;                

            if (dir == -1){
                $(this).attr('selected', 'true')
                    .css({'-webkit-transform': 'translateY(' + (settings.backwards ? -1 : 1) * window.innerHeight + 'px)'})
                    .transition({'-webkit-transform': 'translateY(0px)'}, {callback: settings.callback})
                        .find('h1, .button')
                        .css('opacity', 0)
                        .transition({'opacity': 1});
            } else {
                $(this)
                    .transition(
                        {'-webkit-transform': 'translateY(' + window.innerHeight + 'px)'}, {callback: settings.callback})
                    .find('h1, .button')
                        .transition( {'opacity': 0});
            }

        })
    }
    $.fn.transition = function(css, options) {
        var $el = $(this);
        var defaults = {
            speed : '300ms',
            callback: null,
            ease: 'ease-in-out',
        };
        var settings = $.extend({}, defaults, options);
        if(settings.speed === 0) { // differentiate 0 from null
            $el.css(css);
            window.setTimeout(callback, 0);
        } else {
            var s = [];
            for(var i in css) {
                s.push(i);
            }
            $el.css({
                webkitTransitionProperty: s.join(", "), 
                webkitTransitionDuration: settings.speed, 
                webkitTransitionTimingFunction: settings.ease
            });
            if (settings.callback) {
                $el.one('webkitTransitionEnd', settings.callback);
            }
            setTimeout(function(el){ el.css(css) }, 0, $el);
            return this;
        }
    }
    $.fn.unselect = function(obj) {
        obj = obj || $(this);
        obj.attr('selected', false);
    }

})(jQuery);