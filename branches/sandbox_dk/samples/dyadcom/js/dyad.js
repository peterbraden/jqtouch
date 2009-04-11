$(function(){
    
    // $.fn.itouch.preloadImages(['iui/toolbar.png', 'iui/selection.png']);
    $('#backButton').goback();
    $('ul li a').drilldown();
    $('.toolbar h1 a').click(function(){
        $('.toolbar').ianimate({
            height: '460px'
        }, 1000);
        return false;
    })
    $('a.flip').click(function(){
        $($(this).attr('href')).flipIn();
        return false;
    })
})