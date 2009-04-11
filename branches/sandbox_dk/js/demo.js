$(function(){
    
    // $.fn.itouch.preloadImages(['iui/toolbar.png', 'iui/selection.png']);
    $('#backButton').goback();
    $('ul li a').drilldown();
    
    $('a.flip').click(function(){
        $($(this).attr('href')).flipIn();
        return false;
    })
})