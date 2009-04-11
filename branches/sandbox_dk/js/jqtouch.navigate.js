// David Kaneda, jQuery iTouch extensions

(function($) {
    
    var currentPage = null;
    var currentDialog = null;
    var currentHash = location.hash;
    var hashPrefix = "#";
    var currentWidth = 0;
    var pageHistory = [];
    var newPageCount = 0;
    var checkTimer;
    
    $.fn.ianimate = function(css, speed, fn) {
      if(speed === 0) { // differentiate 0 from null
        this.css(css)
        window.setTimeout(fn, 0)
      } else {
        if($.browser.safari) {
          var s = []
          for(var i in css) 
              s.push(i)
        
          this.css({ webkitTransitionProperty: s.join(", "),
                    webkitTransitionDuration: speed+ "ms" });
        
          window.setTimeout(function(x,y) {
            x.css(y)
          },0, this, css)
          window.setTimeout(fn, speed)
        } else {
          this.animate(css, speed, fn)
        }
      }
    }

    $.fn.itouch = function(settings)
    {
        $.fn.itouch.init();
    }

    $.fn.itouch.init = function()
    {
        $(document).ready(function(evt)
        {
            var page = $.fn.itouch.getSelectedPage();
            if (page) $.fn.itouch.showPage(page);
            
            setTimeout($.fn.itouch.preloadImages, 0);
            setTimeout($.fn.itouch.checkOrientandLocation, 0);
            
            checkTimer = setInterval($.fn.itouch.checkOrientAndLocation, 300);
        });
    }

    $.fn.itouch.checkOrientAndLocation = function()
    {
    
        
        if (window.innerWidth != currentWidth)
        {   
            currentWidth = window.innerWidth;
            var orient = currentWidth == 320 ? "profile" : "landscape";
            document.body.setAttribute("orient", orient);
            setTimeout(scrollTo, 100, 0, 1);
        }
        
        if (location.hash != currentHash)
            $.fn.itouch.showPageById(location.hash);
    }

    $.fn.itouch.preloadImages = function()
    {
        $('body').append('<div id="itouch_preloader"></div>');
    }

    $.fn.itouch.getSelectedPage = function()
    {
        return $('[selected!=false]');
    }
    
    $.fn.itouch.showPage = function( page, backwards )
    {
        if (page)
        {
            
            if (currentDialog)
            {
                currentDialog.attr('selected', null);
                currentDialog = null;
            }
            
            if (page.hasClass('dialog')) showDialog(page);
            else
            {
                
                var fromPage = currentPage;
                currentPage = page;

                if (fromPage)
                    $.fn.itouch.slidePages(fromPage, page, backwards);
                else
                    $.fn.itouch.updatePage(page, fromPage);
            }
        }
    }

    $.fn.itouch.showPageById = function( id )
    {
        var page = $(id);
        
        if (page)
        {
            var index = pageHistory.indexOf(id);
            var backwards = index != -1;
            if (backwards) pageHistory.splice(index, pageHistory.length);
            
            $.fn.itouch.showPage(page, backwards);
        }
    }
    
    $.fn.itouch.insertPages = function( nodes )
    {
        var targetPage;

        nodes.each(function(index, node){
            if (!$(this).attr('id'))
                $(this).attr('id', (++newPageCount));
                
            $(this).appendTo($('body'));
            
            if ($(this).attr('selected') == 'true' || ( !targetPage && !$(this).hasClass('btn')))
                targetPage = $(this);
        });
        
        if (targetPage) $.fn.itouch.showPage(targetPage);
        
    }

    $.fn.itouch.showPageByHref = function(href, data, method, replace, cb)
    {
        $.ajax({
            url: href,
            data: data,
            type: method || "GET",
            success: function (data, textStatus)
            {
                if (replace) $(replace).replaceWith(data);
                else
                {                    
                    $.fn.itouch.insertPages( $(data) );
                }
                
                if (cb) cb(true);
            },
            error: function (data)
            {
                if (cb) cb(false);
            }
        });

    }
    
    $.fn.itouch.submitForm = function()
    {
        
        $.fn.itouch.showPageByHref($(this).attr('action') || "POST", $(this).serialize(), $(this).attr('method'));
        return false;
    }
    
    $.fn.showForm = function ()
    {
        return this.each(function(){
            $(this).submit($.fn.itouch.submitForm);
            
            // From iUI:
            // form.onclick = function(event)
            // {
            //     if (event.target == form && hasClass(form, "dialog"))
            //         cancelDialog(form);
            // };
        });
    }
    
    $.fn.itouch.slidePages = function(fromPage, toPage, backwards)
    {
        clearInterval(checkTimer);
        
        toPage.attr("selected", "true").css({'-webkit-transition-property' : 'none'});
        
        if (!backwards) toPage.css({
            '-webkit-transform': 'translateX(' + currentWidth + 'px)'
        });

        
        var toSign = (backwards) ? '' : '-';
        toPage.ianimate({'-webkit-transform': 'translateX(0)'}, 350);
        fromPage.ianimate({'-webkit-transform': 'translateX(' + toSign + currentWidth + 'px)'}, 350);
        setTimeout(function(){
            fromPage.attr("selected", 'false');
            $.fn.itouch.updatePage(toPage, fromPage);
            $.fn.itouch.startCheck();
        }, 350);
    }
    
    $.fn.itouch.startCheck = function()
    {
        checkTimer = setInterval($.fn.itouch.checkOrientAndLocation, 300);
    }
    
    $.fn.itouch.updatePage = function(page, fromPage)
    {
        if (page)
        {
            if (!page.attr('id'))
                page.attr('id', (++newPageCount));

            location.replace(hashPrefix + page.attr('id'));
            currentHash = location.hash;
            pageHistory.push(currentHash);
            
            var pageTitle = $('#pageTitle');

            if (page.attr('title')) pageTitle.html(page.attr('title'));

            if (page.attr('localName') == "form" && !page.attr('target'))
            {
                page.showForm();
            }

            var backButton = $('#backButton');

            if (backButton)
            {                
                var prevPage = pageHistory[pageHistory.length-2];

                if (prevPage && !page.attr("hideBackButton"))
                {
                    backButton.css('display', 'inline')
                    backButton.html( prevPage.title ? prevPage.title : "Back" );
                }
                else
                {
                    backButton.css('display', 'none');
                }
            }
        }
    }

    $.fn.flipOut = function() {        
        return this.each(function(){
            $(this).css({
                '-webkit-backface-visibility': 'hidden',
                '-webkit-transition-property':'none'
            }).ianimate({'-webkit-transform': 'rotateY(180deg)'}, 700);
        });
    }
    
    $.fn.flipIn = function() {        
        return this.each(function(){
            $(this)
                .attr('selected', true)
                .css({
                    '-webkit-transform':'rotateY(180deg)', 
                    '-webkit-backface-visibility':'hidden',
                    'display':'block'
                })  
                .ianimate({'-webkit-transform': 'rotateY(0)'}, 700);
            currentPage.flipOut();
        });
    }
    
    $.fn.unselect = function(obj)
    {
        obj.attr('selected', false);
    }
    
    $.fn.drilldown = function()
    {
            
            $(this).live('click',function(){
                
                var jelem = $(this);
                var elem = jelem.get(0);
                var hash = elem.hash;

                if ( hash && hash != '#')
                {
                    jelem.attr('selected', 'true');
                    $.fn.itouch.showPage($(hash));
                    setTimeout($.fn.unselect, 350, $(this));
                }
                else if ( jelem.attr('href') != '#' )
                {
                    jelem.attr('selected', 'true');
                    
                    try {
                        $.fn.itouch.showPageByHref($(this).attr('href'), null, null, null, function(){ setTimeout($.fn.unselect, 350, jelem);
                         });
                    }
                    catch(err)
                    {
                        console.log(err);
                        
                    }

                }
                return false;
                
            });
    }
    
    $.fn.goback = function()
    {
        this.each(function(){
            $(this).click(function(){
                history.back();
                return false;
            });
        });
    }
    
    $.fn.itouch.preloadImages = function( imgs )
    {
        
        // for (var i = imgs.length - 1; i >= 0; i--){
        //     (new Image()).src = imgs[i];
        // }
    }

    function debug($obj) {
      if (window.console && window.console.log)
        window.console.log('hilight selection count: ' + $obj.size());
    };

    $(document).itouch();
    
})(jQuery);
